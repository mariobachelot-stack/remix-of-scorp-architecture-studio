import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDiagram } from '@/contexts/DiagramContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useManufacturers } from '@/hooks/useManufacturers';
import { toast } from 'sonner';
import { Download, Loader2, FileImage, FileText, FileCode, Eye, RefreshCw, FileJson } from 'lucide-react';
import { PROTOCOL_COLORS, PROTOCOL_LABELS, DEFAULT_DIAGRAM_SETTINGS, DEFAULT_EXPERT_SETTINGS, getProtocolColor } from '@/types/equipment';
import { getConnectionEndpoints, getPointOnPath, getPerpendicularOffset } from '@/lib/connectionUtils';
import { computeAutoCardHeight } from '@/lib/cardUtils';
import type { CanvasEquipment, Connection, Protocol } from '@/types/equipment';

type ExportFormat = 'pdf' | 'png' | 'svg' | 'json';
type PageFormat = 'a4' | 'a3' | 'a2' | 'a1' | 'custom';
type Orientation = 'landscape' | 'portrait';
type ScaleOption = 'fit' | '100' | '75' | '50';
type Quality = 'standard' | 'high';

// Page sizes in mm
const PAGE_SIZES: Record<Exclude<PageFormat, 'custom'>, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  a2: { width: 420, height: 594 },
  a1: { width: 594, height: 841 },
};

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const ExportDialog = ({ open, onOpenChange, canvasRef }: ExportDialogProps) => {
  const { currentDiagram, expertMode } = useDiagram();
  const { manufacturers } = useManufacturers();
  const { memberships } = useAuthContext();

  // Get current org name from memberships
  const currentOrgName = (() => {
    if (!currentDiagram?.organizationId) return '';
    const membership = memberships.find(m => m.organization_id === currentDiagram.organizationId);
    return membership?.organization_name || '';
  })();
  const [fileName, setFileName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pageFormat, setPageFormat] = useState<PageFormat>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [scaleOption, setScaleOption] = useState<ScaleOption>('fit');
  const [quality, setQuality] = useState<Quality>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Reset preview when format changes
  useEffect(() => {
    setPreviewDataUrl(null);
  }, [format, pageFormat, orientation, scaleOption, quality]);

  // Helper: get card dimensions for a given equipment
  const getCardWidth = (eq: CanvasEquipment): number => {
    const globalWidth = currentDiagram?.settings?.equipmentCardWidth ?? DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth;
    if (expertMode) {
      return eq.customExpertWidth ?? globalWidth;
    }
    return eq.customWidth ?? globalWidth;
  };

  const getCardHeight = (eq: CanvasEquipment): number => {
    const globalHeight = currentDiagram?.settings?.equipmentCardHeight ?? DEFAULT_DIAGRAM_SETTINGS.equipmentCardHeight;
    if (expertMode) {
      if (eq.customExpertHeight !== undefined) return eq.customExpertHeight;
      return computeAutoCardHeight(eq, manufacturers);
    }
    return eq.customHeight ?? globalHeight;
  };

  /** Calculate bounding box of ALL content including connection endpoints */
  const getContentBounds = () => {
    if (!currentDiagram) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Zones
    currentDiagram.zones.forEach(z => {
      minX = Math.min(minX, z.x);
      minY = Math.min(minY, z.y - 16); // zone label above
      maxX = Math.max(maxX, z.x + z.width);
      maxY = Math.max(maxY, z.y + z.height);
    });

    // Equipment cards
    currentDiagram.equipment.forEach(e => {
      const w = getCardWidth(e);
      const h = getCardHeight(e);
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + w);
      maxY = Math.max(maxY, e.y + h);
      // Quantity badge extends left/top
      if (e.quantity && e.quantity > 1) {
        minX = Math.min(minX, e.x - 12);
        minY = Math.min(minY, e.y - 12);
      }
    });

    // Connection control points AND connection endpoints
    currentDiagram.connections.forEach(c => {
      const source = currentDiagram.equipment.find(e => e.canvasId === c.sourceId);
      const target = currentDiagram.equipment.find(e => e.canvasId === c.targetId);
      if (source && target) {
        const { sourceX, sourceY, targetX, targetY } = getConnectionEndpoints(
          source, target,
          getCardWidth(source), getCardHeight(source),
          undefined, undefined,
          getCardWidth(target), getCardHeight(target)
        );
        minX = Math.min(minX, sourceX, targetX);
        minY = Math.min(minY, sourceY, targetY);
        maxX = Math.max(maxX, sourceX, targetX);
        maxY = Math.max(maxY, sourceY, targetY);
      }
      if (c.controlPoints) {
        c.controlPoints.forEach(cp => {
          minX = Math.min(minX, cp.x);
          minY = Math.min(minY, cp.y);
          maxX = Math.max(maxX, cp.x);
          maxY = Math.max(maxY, cp.y);
        });
      }
    });

    // Images
    (currentDiagram.images || []).forEach(img => {
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });

    // Texts
    (currentDiagram.texts || []).forEach(t => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + 200);
      maxY = Math.max(maxY, t.y + 30);
    });

    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    const padding = 40;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  };

  /** Capture the canvas content at 1:1 scale with proper bounding box */
  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const container = canvasRef.current;
    if (!container) return null;

    const innerCanvas = container.querySelector('.canvas-background') as HTMLElement;
    if (!innerCanvas) return null;

    const bounds = getContentBounds();
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    // Save original state
    const origTransform = innerCanvas.style.transform;
    const origTransformOrigin = innerCanvas.style.transformOrigin;
    const origContainerOverflow = container.style.overflow;
    const origContainerWidth = container.style.width;
    const origContainerHeight = container.style.height;
    const origContainerPosition = container.style.position;

    const scaleFactor = quality === 'high' ? 2 : 1.5;
    const scaleMultiplier = scaleOption === '100' ? 1 : scaleOption === '75' ? 0.75 : scaleOption === '50' ? 0.5 : 1;

    // Hide ALL toolbar/UI overlay elements (everything except the canvas itself)
    const overlayRestore: { el: HTMLElement; display: string }[] = [];
    const canvasDiv = container.querySelector('.w-full.h-full') as HTMLElement;
    Array.from(container.children).forEach(child => {
      const el = child as HTMLElement;
      // Keep only the actual canvas div (which contains .canvas-background)
      if (el !== canvasDiv && el.classList.contains('absolute')) {
        overlayRestore.push({ el, display: el.style.display });
        el.style.display = 'none';
      }
    });

    try {
      // Temporarily reposition: translate so content starts at 0,0
      innerCanvas.style.transform = `translate(${-bounds.minX}px, ${-bounds.minY}px) scale(1)`;
      innerCanvas.style.transformOrigin = '0 0';

      // Set container to match content size
      container.style.overflow = 'hidden';
      container.style.width = `${contentWidth}px`;
      container.style.height = `${contentHeight}px`;
      container.style.position = 'relative';

      // Force reflow
      container.offsetHeight;

      // Hide UI-only elements inside the canvas
      const toRestore: { el: HTMLElement; prop: string; value: string }[] = [];

      const hideElements = (selector: string) => {
        container.querySelectorAll(selector).forEach(el => {
          const h = el as HTMLElement;
          toRestore.push({ el: h, prop: 'visibility', value: h.style.visibility });
          h.style.visibility = 'hidden';
        });
      };

      hideElements('[data-connection-handle]');
      hideElements('.equipment-node button');

      // Remove selection rings
      const toRestoreClass: { el: Element; classes: string[] }[] = [];
      container.querySelectorAll('.ring-2').forEach(el => {
        const removed = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-accent'].filter(c => el.classList.contains(c));
        if (removed.length) {
          toRestoreClass.push({ el, classes: removed });
          el.classList.remove(...removed);
        }
      });

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: scaleFactor,
        useCORS: true,
        logging: false,
        width: contentWidth,
        height: contentHeight,
        onclone: (_clonedDoc, clonedEl) => {
          // Hide ALL overlay/toolbar elements in clone
          Array.from(clonedEl.children).forEach(child => {
            const el = child as HTMLElement;
            const clonedCanvasDiv = clonedEl.querySelector('.w-full.h-full');
            if (el !== clonedCanvasDiv && el.classList.contains('absolute')) {
              el.style.display = 'none';
            }
          });

          // === FIX: Disable text truncation on equipment nodes ===
          // Remove all overflow/truncation constraints so labels and badges render fully
          clonedEl.querySelectorAll('.equipment-node').forEach(node => {
            const el = node as HTMLElement;
            // Let the node expand to fit its content
            el.style.overflow = 'visible';
            el.style.minHeight = 'auto';
            el.style.minWidth = 'auto';

            // Fix all child text elements: remove truncation
            el.querySelectorAll('*').forEach(child => {
              const c = child as HTMLElement;
              const cs = c.style;
              const computed = _clonedDoc.defaultView?.getComputedStyle(c);

              // Remove overflow hidden on any child
              if (computed?.overflow === 'hidden') {
                cs.overflow = 'visible';
              }
              // Remove text truncation
              if (computed?.textOverflow === 'ellipsis') {
                cs.textOverflow = 'clip';
              }
              // Allow wrapping so long labels don't clip
              if (computed?.whiteSpace === 'nowrap') {
                cs.whiteSpace = 'normal';
                cs.wordBreak = 'break-word';
              }
              // Enforce minimum font size of 8pt
              const fontSize = parseFloat(computed?.fontSize || '12');
              if (fontSize < 8) {
                cs.fontSize = '8pt';
              }
            });
          });

          // === FIX: Center protocol badges/chips ===
          clonedEl.querySelectorAll('.equipment-node span, .equipment-node .badge, .equipment-node [class*="badge"], .equipment-node [class*="protocol"], .equipment-node [class*="chip"]').forEach(badge => {
            const b = badge as HTMLElement;
            b.style.display = 'inline-flex';
            b.style.alignItems = 'center';
            b.style.justifyContent = 'center';
            b.style.textAlign = 'center';
            b.style.padding = '2px 8px';
            b.style.width = 'fit-content';
            b.style.minWidth = 'auto';
            b.style.overflow = 'visible';
            b.style.lineHeight = '1';
            b.style.boxSizing = 'border-box';
            b.style.verticalAlign = 'middle';
          });

          // Fix zone containers: overflow visible + ensure connections render above
          clonedEl.querySelectorAll('[class*="zone"]').forEach(zone => {
            const el = zone as HTMLElement;
            el.style.overflow = 'visible';
            el.style.clipPath = 'none';
          });
          // Set overflow visible on ALL containers that might clip connections
          clonedEl.querySelectorAll('div').forEach(div => {
            const el = div as HTMLElement;
            const computed = _clonedDoc.defaultView?.getComputedStyle(el);
            if (computed?.overflow === 'hidden' || computed?.overflow === 'clip') {
              el.style.overflow = 'visible';
            }
            if (computed?.clipPath && computed.clipPath !== 'none') {
              el.style.clipPath = 'none';
            }
          });
          // Ensure SVG connection layer renders above zones
          const connectionSvgs = clonedEl.querySelectorAll('svg');
          connectionSvgs.forEach(svg => {
            (svg as unknown as HTMLElement).style.overflow = 'visible';
            (svg as unknown as HTMLElement).style.zIndex = '9999';
            // Ensure no clipPath on SVG paths
            svg.querySelectorAll('path, line, polyline').forEach(p => {
              (p as SVGElement).removeAttribute('clip-path');
              (p as SVGElement).style.clipPath = 'none';
            });
            svg.querySelectorAll('clipPath').forEach(cp => cp.remove());
          });

          // Hide waypoints, toolbars, grips in clone
          const connectionSvg = clonedEl.querySelector('.canvas-background svg');
          if (connectionSvg) {
            connectionSvg.querySelectorAll('circle').forEach(circle => {
              const classes = circle.getAttribute('class') || '';
              if (classes.includes('cursor-move') || classes.includes('fill-primary') || classes.includes('fill-destructive')) {
                (circle as SVGElement).style.display = 'none';
              }
            });
            connectionSvg.querySelectorAll('foreignObject').forEach(fo => {
              (fo as unknown as HTMLElement).style.display = 'none';
            });
            connectionSvg.querySelectorAll('.animate-pulse').forEach(el => {
              (el as SVGElement).style.display = 'none';
            });
          }
          clonedEl.querySelectorAll('.lucide-grip-vertical').forEach(icon => {
            (icon as HTMLElement).style.display = 'none';
          });
          clonedEl.querySelectorAll('[data-connection-handle]').forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
          clonedEl.querySelectorAll('.equipment-node button').forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
          clonedEl.querySelectorAll('.ring-2').forEach(el => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-accent');
          });
          // Remove grid background
          const clonedCanvasWrapper = clonedEl.querySelector('.w-full.h-full') as HTMLElement;
          if (clonedCanvasWrapper) {
            clonedCanvasWrapper.style.backgroundImage = 'none';
          }
        },
      });

      // Restore hidden elements
      toRestore.forEach(({ el, value }) => { el.style.visibility = value; });
      toRestoreClass.forEach(({ el, classes }) => { el.classList.add(...classes); });

      // Apply scale option by resizing the canvas
      if (scaleMultiplier !== 1) {
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = canvas.width * scaleMultiplier;
        scaledCanvas.height = canvas.height * scaleMultiplier;
        const ctx = scaledCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        }
        return scaledCanvas;
      }

      return canvas;
    } finally {
      // Restore original state
      innerCanvas.style.transform = origTransform;
      innerCanvas.style.transformOrigin = origTransformOrigin;
      container.style.overflow = origContainerOverflow;
      container.style.width = origContainerWidth;
      container.style.height = origContainerHeight;
      container.style.position = origContainerPosition;
      // Restore toolbar overlays
      overlayRestore.forEach(({ el, display }) => { el.style.display = display; });
    }
  };

  /** Get page dimensions in mm based on format and orientation */
  const getPageDimensions = () => {
    const size = PAGE_SIZES[pageFormat as keyof typeof PAGE_SIZES] || PAGE_SIZES.a4;
    if (orientation === 'landscape') {
      return { width: Math.max(size.width, size.height), height: Math.min(size.width, size.height) };
    }
    return { width: Math.min(size.width, size.height), height: Math.max(size.width, size.height) };
  };

  /** Get unique protocols used in the diagram for the legend */
  const getUsedProtocols = (): { protocol: Protocol; label: string; color: string }[] => {
    if (!currentDiagram) return [];
    const protocols = new Set<Protocol>();
    currentDiagram.connections.forEach(c => {
      if (c.protocol && c.protocol !== 'none') protocols.add(c.protocol);
    });
    currentDiagram.equipment.forEach(e => {
      if (e.protocol && e.protocol !== 'none') protocols.add(e.protocol);
    });
    return Array.from(protocols).map(p => ({
      protocol: p,
      label: PROTOCOL_LABELS[p] || p,
      color: getProtocolColor(p, currentDiagram.settings),
    }));
  };

  const exportPDF = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;

    const pageDims = getPageDimensions();
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pageDims.width, pageDims.height],
    });

    const pdfWidth = pageDims.width;
    const pdfHeight = pageDims.height;
    const margin = 10;

    let yOffset = margin;

    // --- Header ---
    if (includeHeader) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(projectName || currentDiagram?.name || 'Schéma', margin, yOffset + 5);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      if (clientName) {
        pdf.text(`Client: ${clientName}`, margin, yOffset + 11);
      }

      const date = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      pdf.text(date, pdfWidth - margin, yOffset + 5, { align: 'right' });

      yOffset += 16;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yOffset, pdfWidth - margin, yOffset);
      yOffset += 4;
    }

    // --- Legend ---
    const legendHeight = includeLegend ? 14 : 0;

    // --- Footer area ---
    const footerY = pdfHeight - 8;

    // Available area for diagram
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - yOffset - legendHeight - 14 - margin; // 14 for footer

    // Image dimensions
    const scaleFactor = quality === 'high' ? 2 : 1.5;
    const imgNativeWidth = canvas.width / scaleFactor;
    const imgNativeHeight = canvas.height / scaleFactor;
    const imgRatio = imgNativeWidth / imgNativeHeight;
    const pageRatio = availableWidth / availableHeight;

    let imgWidth: number, imgHeight: number;
    if (imgRatio > pageRatio) {
      imgWidth = availableWidth;
      imgHeight = availableWidth / imgRatio;
    } else {
      imgHeight = availableHeight;
      imgWidth = availableHeight * imgRatio;
    }

    const xPos = margin + (availableWidth - imgWidth) / 2;
    const yPos = yOffset + (availableHeight - imgHeight) / 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

    // --- Legend ---
    if (includeLegend) {
      const protocols = getUsedProtocols();
      if (protocols.length > 0) {
        const legendY = pdfHeight - legendHeight - 12;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, legendY - 2, pdfWidth - margin, legendY - 2);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Légende :', margin, legendY + 4);

        let legendX = margin + 22;
        protocols.forEach(({ label, color }) => {
          // Color square
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          pdf.setFillColor(r, g, b);
          pdf.rect(legendX, legendY + 1, 3, 3, 'F');
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.text(label, legendX + 5, legendY + 4);
          legendX += pdf.getTextWidth(label) + 10;
        });
      }
    }

    // --- Footer ---
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    
    if (currentOrgName) pdf.text(currentOrgName, margin, footerY);
    
    pdf.text(`Page 1/1`, pdfWidth - margin, footerY, { align: 'right' });
    pdf.setTextColor(0, 0, 0);

    const finalFileName = fileName.trim() || currentDiagram?.name || 'schema';
    pdf.save(`${finalFileName}.pdf`);
  };

  const exportPNG = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${fileName.trim() || currentDiagram?.name || 'schema'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getConnectionPath = (sourceX: number, sourceY: number, targetX: number, targetY: number, pathType: string, controlPoints?: { x: number; y: number }[]) => {
    if (pathType === 'custom' && controlPoints && controlPoints.length > 0) {
      const points = [{ x: sourceX, y: sourceY }, ...controlPoints, { x: targetX, y: targetY }];
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    }

    switch (pathType) {
      case 'straight':
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
      case 'orthogonal': {
        const midX = controlPoints && controlPoints.length > 0 
          ? controlPoints[0].x 
          : (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
      }
      case 'curved':
      default: {
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      }
    }
  };

  const exportSVG = async () => {
    if (!currentDiagram) return;

    const bounds = getContentBounds();
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const globalCardWidth = currentDiagram.settings?.equipmentCardWidth ?? DEFAULT_DIAGRAM_SETTINGS.equipmentCardWidth;
    const strokeWidth = currentDiagram.settings?.connectionStrokeWidth ?? DEFAULT_DIAGRAM_SETTINGS.connectionStrokeWidth;

    // Marker definitions for arrows
    const markerDefs = currentDiagram.connections
      .filter(conn => conn.arrowStart || conn.arrowEnd)
      .map(conn => {
        const color = conn.color || getProtocolColor(conn.protocol, currentDiagram.settings);
        let markers = '';
        if (conn.arrowEnd) {
          markers += `
      <marker id="arrow-end-${conn.id}" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M 0 0 L 12 6 L 0 12 z" fill="${color}"/>
      </marker>`;
        }
        if (conn.arrowStart) {
          markers += `
      <marker id="arrow-start-${conn.id}" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="0" refY="6" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M 12 0 L 0 6 L 12 12 z" fill="${color}"/>
      </marker>`;
        }
        return markers;
      })
      .join('');

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}">
  <defs>${markerDefs}
  </defs>
  <style>
    .equipment-box { fill: white; stroke-width: 2; }
    .zone { fill-opacity: 0.15; stroke-dasharray: 8 4; stroke-width: 2; }
    .label { font-family: Inter, system-ui, sans-serif; font-size: 12px; fill: #1f2937; font-weight: 600; }
    .sublabel { font-family: Inter, system-ui, sans-serif; font-size: 10px; fill: #6b7280; }
    .zone-label { font-family: Inter, system-ui, sans-serif; font-size: 12px; font-weight: 600; fill: white; }
    .connection { fill: none; }
    .connection-label { font-family: Inter, system-ui, sans-serif; font-size: 11px; fill: currentColor; }
  </style>
  <rect x="${bounds.minX}" y="${bounds.minY}" width="${width}" height="${height}" fill="white"/>
`;

    // Zones
    currentDiagram.zones.forEach(zone => {
      const bgColor = zone.backgroundColor || `${zone.color}20`;
      svgContent += `  <g>
    <rect class="zone" x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}" rx="8" fill="${bgColor}" stroke="${zone.color}"/>
    <rect x="${zone.x + 8}" y="${zone.y - 12}" width="${zone.name.length * 7 + 16}" height="20" rx="4" fill="${zone.color}"/>
    <text class="zone-label" x="${zone.x + 16}" y="${zone.y + 2}">${escapeXml(zone.name)}</text>
  </g>
`;
    });

    // Connections
    currentDiagram.connections.forEach(conn => {
      const source = currentDiagram.equipment.find(e => e.canvasId === conn.sourceId);
      const target = currentDiagram.equipment.find(e => e.canvasId === conn.targetId);
      if (!source || !target) return;

      const { sourceX, sourceY, targetX, targetY } = getConnectionEndpoints(
        source, target,
        getCardWidth(source), getCardHeight(source),
        undefined, undefined,
        getCardWidth(target), getCardHeight(target)
      );

      const color = conn.color || getProtocolColor(conn.protocol, currentDiagram.settings);
      const dashArray = conn.style === 'dashed' ? ' stroke-dasharray="8 4"' : '';
      const pathType = conn.pathType || 'curved';
      const path = getConnectionPath(sourceX, sourceY, targetX, targetY, pathType, conn.controlPoints);
      const markerStart = conn.arrowStart ? ` marker-start="url(#arrow-start-${conn.id})"` : '';
      const markerEnd = conn.arrowEnd ? ` marker-end="url(#arrow-end-${conn.id})"` : '';

      svgContent += `  <path class="connection" d="${path}" stroke="${color}" stroke-width="${strokeWidth}"${dashArray}${markerStart}${markerEnd}/>
`;

      // Connection label
      if (conn.name) {
        const t = conn.labelPosition ?? 0.5;
        const perpOffset = conn.labelPerpendicularOffset ?? 0;
        const pt = getPointOnPath(path, t);
        const perp = getPerpendicularOffset(pt.dx, pt.dy, perpOffset);
        const labelX = pt.x + perp.x;
        const labelY = pt.y + perp.y;
        svgContent += `  <g>
    <rect x="${labelX - conn.name.length * 3.5 - 8}" y="${labelY - 10}" width="${conn.name.length * 7 + 16}" height="20" rx="4" fill="white" stroke="${color}" stroke-width="1"/>
    <text class="connection-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central" fill="${color}">${escapeXml(conn.name)}</text>
  </g>
`;
      }

      // Secure icon
      if (conn.isSecure) {
        const t2 = conn.labelPosition ?? 0.5;
        const perpOff2 = conn.labelPerpendicularOffset ?? 0;
        const pt2 = getPointOnPath(path, t2);
        const perp2 = getPerpendicularOffset(pt2.dx, pt2.dy, perpOff2);
        const baseLabelX = pt2.x + perp2.x;
        const baseLabelY = pt2.y + perp2.y;
        const iconOffset = conn.secureIconOffset || { x: 45, y: -8 };
        const iconX = baseLabelX + iconOffset.x;
        const iconY = baseLabelY + iconOffset.y;
        svgContent += `  <g transform="translate(${iconX}, ${iconY})">
    <circle cx="0" cy="0" r="10" fill="white" stroke="${color}" stroke-width="1.5"/>
    <g transform="translate(-6, -6) scale(0.5)">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="${color}"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="${color}" stroke-width="2.5" fill="none"/>
    </g>
  </g>
`;
      }
    });

    // Equipment cards
    currentDiagram.equipment.forEach(eq => {
      const defaultBorderColor = eq.type === 'cloud' ? '#7c3aed' :
        eq.type === 'interface' ? '#0d9488' :
        eq.type === 'automate' ? '#1d4ed8' : '#cbd5e1';
      const defaultHeaderColor = eq.type === 'cloud' ? '#a78bfa' :
        eq.type === 'interface' ? '#2dd4bf' :
        eq.type === 'automate' ? '#3b82f6' : '#e2e8f0';

      const borderColor = eq.borderColor || defaultBorderColor;
      const headerColor = eq.headerBackgroundColor || defaultHeaderColor;
      const eqCardWidth = getCardWidth(eq);
      const eqCardHeight = getCardHeight(eq);

      let yOff = eq.y + 12;
      svgContent += `  <g>
    <rect class="equipment-box" x="${eq.x}" y="${eq.y}" width="${eqCardWidth}" height="${eqCardHeight}" rx="12" stroke="${borderColor}"/>
    <rect x="${eq.x + 12}" y="${yOff}" width="32" height="32" rx="8" fill="${headerColor}"/>
    <text class="label" x="${eq.x + 56}" y="${yOff + 20}">${escapeXml(eq.label)}</text>
    <text class="sublabel" x="${eq.x + 56}" y="${yOff + 36}">${escapeXml(eq.name)}</text>`;

      yOff += 48;

      if (eq.manufacturerId) {
        const manufacturer = manufacturers.find(m => m.id === eq.manufacturerId);
        if (manufacturer) {
          svgContent += `
    <text class="sublabel" x="${eq.x + 12}" y="${yOff}">${escapeXml(manufacturer.name)}</text>`;
          yOff += 18;
        }
      }

      if (eq.protocol && eq.protocol !== 'none') {
        const protocolColor = PROTOCOL_COLORS[eq.protocol] || '#6b7280';
        const protocolLabel = PROTOCOL_LABELS[eq.protocol] || eq.protocol;
        svgContent += `
    <rect x="${eq.x + 12}" y="${yOff - 12}" width="${protocolLabel.length * 6 + 12}" height="18" rx="4" fill="${protocolColor}"/>
    <text x="${eq.x + 18}" y="${yOff + 1}" font-family="Inter, system-ui, sans-serif" font-size="10" fill="white">${escapeXml(protocolLabel)}</text>`;
        yOff += 24;
      }

      if (eq.ipAddress) {
        svgContent += `
    <text class="sublabel" x="${eq.x + 12}" y="${yOff}" font-family="monospace" font-size="10">${escapeXml(eq.ipAddress)}</text>`;
      }

      svgContent += `
  </g>
`;

      if (eq.quantity && eq.quantity > 1) {
        svgContent += `  <g>
    <circle cx="${eq.x}" cy="${eq.y}" r="12" fill="${borderColor}"/>
    <text x="${eq.x}" y="${eq.y + 4}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="bold" fill="white">×${eq.quantity}</text>
  </g>
`;
      }
    });

    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${fileName.trim() || currentDiagram?.name || 'schema'}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!currentDiagram) return;
    const data = {
      name: currentDiagram.name,
      description: currentDiagram.description,
      equipment: currentDiagram.equipment,
      connections: currentDiagram.connections,
      zones: currentDiagram.zones,
      images: currentDiagram.images,
      texts: currentDiagram.texts,
      settings: currentDiagram.settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${fileName.trim() || currentDiagram?.name || 'schema'}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const escapeXml = (str: string) => {
    return str.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const handleExport = async () => {
    if (!currentDiagram) {
      toast.error('Impossible d\'exporter le canevas');
      return;
    }
    if (format !== 'svg' && format !== 'json' && !canvasRef.current) {
      toast.error('Impossible d\'exporter le canevas');
      return;
    }

    setIsExporting(true);

    try {
      switch (format) {
        case 'pdf': await exportPDF(); break;
        case 'png': await exportPNG(); break;
        case 'svg': await exportSVG(); break;
        case 'json': exportJSON(); break;
      }
      toast.success(`Export ${format.toUpperCase()} réussi`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      const canvas = await captureCanvas();
      if (canvas) {
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Erreur lors de la génération de la prévisualisation');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Document imprimable avec en-tête' },
    { value: 'png', label: 'PNG', icon: FileImage, description: 'Image haute résolution' },
    { value: 'svg', label: 'SVG', icon: FileCode, description: 'Vectoriel éditable' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'Données brutes réutilisables' },
  ] as const;

  const isPdfOrPng = format === 'pdf' || format === 'png';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setPreviewDataUrl(null);
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exporter le schéma</DialogTitle>
          <DialogDescription>
            Choisissez le format et les options d'export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format d'export</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-4 gap-3"
            >
              {formatOptions.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={opt.value}
                  className={`flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    format === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                  <opt.icon className={`h-5 w-5 ${format === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-xs">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground text-center">
              {formatOptions.find(o => o.value === format)?.description}
            </p>
          </div>

          {/* File name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">Nom du fichier</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={currentDiagram?.name || 'schema'}
            />
          </div>

          {/* PDF-specific options */}
          {format === 'pdf' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-medium">Options PDF</h4>

              <div className="grid grid-cols-2 gap-4">
                {/* Page format */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Format de page</Label>
                  <Select value={pageFormat} onValueChange={(v) => setPageFormat(v as PageFormat)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="a3">A3</SelectItem>
                      <SelectItem value="a2">A2</SelectItem>
                      <SelectItem value="a1">A1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Paysage</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scale */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Échelle</Label>
                  <Select value={scaleOption} onValueChange={(v) => setScaleOption(v as ScaleOption)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Ajuster à la page</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quality */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Qualité</Label>
                  <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="high">Haute résolution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Include options */}
              <div className="space-y-2">
                <Label className="text-xs">Inclure</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeHeader"
                      checked={includeHeader}
                      onCheckedChange={(c) => setIncludeHeader(c as boolean)}
                    />
                    <Label htmlFor="includeHeader" className="text-sm">Titre + date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeLegend"
                      checked={includeLegend}
                      onCheckedChange={(c) => setIncludeLegend(c as boolean)}
                    />
                    <Label htmlFor="includeLegend" className="text-sm">Légende protocoles</Label>
                  </div>
                </div>
              </div>

              {/* Header fields */}
              {includeHeader && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="projectName">Nom du projet</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={currentDiagram?.name || 'Mon projet'}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="clientName">Client (optionnel)</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nom du client"
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PNG options */}
          {format === 'png' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-medium">Options PNG</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Qualité</Label>
                  <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="high">Haute résolution (2x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Échelle</Label>
                  <Select value={scaleOption} onValueChange={(v) => setScaleOption(v as ScaleOption)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Taille originale</SelectItem>
                      <SelectItem value="75">75%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {isPdfOrPng && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Prévisualisation</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePreview}
                  disabled={isGeneratingPreview}
                >
                  {isGeneratingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : previewDataUrl ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualiser
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </div>
              <div className="border rounded-lg bg-muted/30 overflow-hidden">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Prévisualisation de l'export"
                    className="w-full h-auto max-h-64 object-contain bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Eye className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">Cliquez sur "Générer" pour voir l'aperçu</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter en {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
