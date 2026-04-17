import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDiagram } from '@/contexts/DiagramContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { useDiagramFolders, DiagramFolder } from '@/hooks/useDiagramFolders';
import { useDiagramTags, DiagramTag, useDiagramTagsForDiagram, useAllDiagramTagAssociations } from '@/hooks/useDiagramTags';
import { FolderDialog } from '@/components/FolderDialog';
import { TemplatePickerDialog } from '@/components/TemplatePickerDialog';
import { useDiagramTemplates, DiagramTemplate } from '@/hooks/useDiagramTemplates';
import { Diagram } from '@/types/equipment';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/hooks/useOrganizations';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus, FileJson, Clock, MoreHorizontal, Copy, Trash2, Search,
  Box, Eye, Library, User, Folder, FolderPlus, Tag, X,
  FolderOpen, Link, Building2, ChevronRight, ChevronDown,
  PenLine, FolderInput, LayoutGrid, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub,
  ContextMenuSubTrigger, ContextMenuSubContent,
} from '@/components/ui/context-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { LabelPicker, TagAssignState } from '@/components/LabelPicker';
import { FilterBar, ActiveFilterChips, FilterState, EMPTY_FILTERS, hasActiveFilters, DatePreset } from '@/components/FilterBar';
import { startOfDay, startOfWeek, startOfMonth, subMonths } from 'date-fns';

// ─── Diagram tag chips (inline) ─────────────────────────────────────
const DiagramTagChips = ({ diagramId }: { diagramId: string }) => {
  const { data: tags = [] } = useDiagramTagsForDiagram(diagramId);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-[10px] px-1.5 py-0 leading-4"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
        >
          {tag.name}
        </Badge>
      ))}
      {tags.length > 3 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-4">
          +{tags.length - 3}
        </Badge>
      )}
    </div>
  );
};

// ─── Sorting types ──────────────────────────────────────────────────
export type SortField = 'name' | 'elements' | 'createdBy' | 'updatedAt';
export type SortDir = 'asc' | 'desc';

interface DashboardProps {
  onOpenEditor: () => void;
}

export const Dashboard = ({ onOpenEditor }: DashboardProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { diagrams, createDiagram, openDiagram, duplicateDiagram, deleteDiagram, isLoading } = useDiagram();
  const { canEdit, user, isAdmin, isOwner, hasOrganization, memberships } = useAuthContext();
  const { folders, createFolder, deleteFolder, updateFolder } = useDiagramFolders();
  const { tags, createTag, addTagToDiagram, removeTagFromDiagram } = useDiagramTags();
  const { data: allAssociations = [] } = useAllDiagramTagAssociations();
  const { organizations } = useOrganizations();
  const { templates: allTemplates } = useDiagramTemplates();

  // ─── State ──────────────────────────────────────────────────────────
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DiagramTemplate | null>(null);
  const [importedPayload, setImportedPayload] = useState<import('@/lib/diagramImport').ImportedDiagram | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DiagramFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null | 'root'>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // ─── Sorting ────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sort') as SortField) || 'updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>((searchParams.get('dir') as SortDir) || 'desc');

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      setSearchParams(prev => { prev.set('sort', field); prev.set('dir', newDir); return prev; }, { replace: true });
    } else {
      setSortField(field);
      setSortDir('asc');
      setSearchParams(prev => { prev.set('sort', field); prev.set('dir', 'asc'); return prev; }, { replace: true });
    }
  }, [sortField, sortDir, setSearchParams]);

  // ─── Filters from URL ─────────────────────────────────────────────
  const filters = useMemo((): FilterState => {
    const tagIds = new Set((searchParams.get('tags') || '').split(',').filter(Boolean));
    const createdBy = new Set((searchParams.get('createdBy') || '').split(',').filter(Boolean));
    const datePreset = (searchParams.get('date') as DatePreset) || null;
    const folderIds = new Set((searchParams.get('folders') || '').split(',').filter(Boolean));
    const noFolder = searchParams.get('noFolder') === '1';
    return { tagIds, createdBy, datePreset, folderIds, noFolder };
  }, [searchParams]);

  const setFilters = useCallback((f: FilterState) => {
    setSearchParams(prev => {
      const set = (key: string, val: string) => { if (val) prev.set(key, val); else prev.delete(key); };
      set('tags', Array.from(f.tagIds).join(','));
      set('createdBy', Array.from(f.createdBy).join(','));
      set('date', f.datePreset || '');
      set('folders', Array.from(f.folderIds).join(','));
      if (f.noFolder) prev.set('noFolder', '1'); else prev.delete('noFolder');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const updateSearch = useCallback((val: string) => {
    setSearchTerm(val);
    setSearchParams(prev => { if (val) prev.set('q', val); else prev.delete('q'); return prev; }, { replace: true });
  }, [setSearchParams]);

  const diagramsWithFolders = diagrams as (Diagram & { folderId?: string })[];

  // Get user's org ID
  const userOrgId = useMemo(() => {
    const realMembership = memberships.find(m => !m.isDefaultOrg);
    return realMembership?.organization_id;
  }, [memberships]);

  // ─── Unique creators list ─────────────────────────────────────────
  const creators = useMemo(() => {
    const names = new Set<string>();
    diagramsWithFolders.forEach(d => { if (d.creatorName) names.add(d.creatorName); });
    return Array.from(names).sort();
  }, [diagramsWithFolders]);

  // ─── Tag lookup for filtering ───────────────────────────────────────
  const diagramTagIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAssociations.forEach(a => {
      const set = map.get(a.diagram_id) || new Set();
      set.add(a.tag_id);
      map.set(a.diagram_id, set);
    });
    return map;
  }, [allAssociations]);

  // ─── Tag names lookup for search ──────────────────────────────────
  const diagramTagNames = useMemo(() => {
    const map = new Map<string, string[]>();
    allAssociations.forEach(a => {
      const tag = tags.find(t => t.id === a.tag_id);
      if (tag) {
        const names = map.get(a.diagram_id) || [];
        names.push(tag.name.toLowerCase());
        map.set(a.diagram_id, names);
      }
    });
    return map;
  }, [allAssociations, tags]);

  // ─── Date filter helper ───────────────────────────────────────────
  const getDateThreshold = useCallback((preset: DatePreset): Date | null => {
    if (!preset) return null;
    const now = new Date();
    switch (preset) {
      case 'today': return startOfDay(now);
      case 'week': return startOfWeek(now, { weekStartsOn: 1 });
      case 'month': return startOfMonth(now);
      case 'quarter': return subMonths(startOfMonth(now), 2);
      default: return null;
    }
  }, []);

  // ─── Filtering ────────────────────────────────────────────────────
  const matchesDiagram = useCallback((d: Diagram & { folderId?: string }) => {
    // Search: name, creator, tags
    if (searchTerm) {
      const lq = searchTerm.toLowerCase();
      const nameMatch = d.name.toLowerCase().includes(lq);
      const creatorMatch = d.creatorName?.toLowerCase().includes(lq) || false;
      const tagMatch = (diagramTagNames.get(d.id) || []).some(n => n.includes(lq));
      if (!nameMatch && !creatorMatch && !tagMatch) return false;
    }
    // Tag filter
    if (filters.tagIds.size > 0) {
      const dTags = diagramTagIds.get(d.id);
      if (!dTags || !Array.from(filters.tagIds).every(tid => dTags.has(tid))) return false;
    }
    // Creator filter
    if (filters.createdBy.size > 0 && (!d.creatorName || !filters.createdBy.has(d.creatorName))) return false;
    // Date filter
    const threshold = getDateThreshold(filters.datePreset);
    if (threshold && d.updatedAt < threshold) return false;
    // Folder filter
    if (filters.folderIds.size > 0 || filters.noFolder) {
      const inSelectedFolder = d.folderId && filters.folderIds.has(d.folderId);
      const isRoot = !d.folderId && filters.noFolder;
      if (!inSelectedFolder && !isRoot) return false;
    }
    return true;
  }, [searchTerm, filters, diagramTagIds, diagramTagNames, getDateThreshold]);

  // ─── Sorting helper ───────────────────────────────────────────────
  const sortDiagrams = useCallback((arr: (Diagram & { folderId?: string })[]) => {
    return [...arr].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'elements': cmp = (a.equipment.length + a.connections.length) - (b.equipment.length + b.connections.length); break;
        case 'createdBy': cmp = (a.creatorName || '').localeCompare(b.creatorName || ''); break;
        case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [sortField, sortDir]);

  // Group diagrams by folder
  const rootDiagrams = useMemo(() =>
    sortDiagrams(diagramsWithFolders.filter(d => !d.folderId && matchesDiagram(d))),
    [diagramsWithFolders, matchesDiagram, sortDiagrams]
  );

  const diagramsByFolder = useMemo(() => {
    const map = new Map<string, (Diagram & { folderId?: string })[]>();
    diagramsWithFolders.forEach(d => {
      if (d.folderId) {
        const list = map.get(d.folderId) || [];
        list.push(d);
        map.set(d.folderId, list);
      }
    });
    return map;
  }, [diagramsWithFolders]);

  // Expand folders that match search/filters
  const filteredFolders = useMemo(() => {
    // If folder filter is active, only show selected folders
    if (filters.folderIds.size > 0) {
      return folders.filter(f => filters.folderIds.has(f.id));
    }
    // If noFolder only, hide all folders
    if (filters.noFolder && filters.folderIds.size === 0) return [];
    // Search or other filters
    const anyFilter = searchTerm || hasActiveFilters(filters);
    if (!anyFilter) return folders;
    return folders.filter(f => {
      const folderMatch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const hasMatchingDiagrams = (diagramsByFolder.get(f.id) || []).some(d => matchesDiagram(d));
      return folderMatch || hasMatchingDiagrams;
    });
  }, [folders, searchTerm, filters, diagramsByFolder, matchesDiagram]);

  // ─── Folder expand/collapse ───────────────────────────────────────
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  }, []);

  // ─── Selection ────────────────────────────────────────────────────
  const toggleSelection = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ─── Inline rename ────────────────────────────────────────────────
  const startRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.select(), 50);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    
    // Check if it's a folder or diagram
    const folder = folders.find(f => f.id === renamingId);
    if (folder) {
      await updateFolder({ id: renamingId, name: renameValue.trim() });
    } else {
      // It's a diagram
      const { error } = await supabase
        .from('diagrams')
        .update({ name: renameValue.trim() })
        .eq('id', renamingId);
      if (error) { toast.error('Erreur'); } else {
        queryClient.invalidateQueries({ queryKey: ['diagrams'] });
        toast.success('Nom mis à jour');
      }
    }
    setRenamingId(null);
  }, [renamingId, renameValue, folders, updateFolder, queryClient]);

  // ─── Drag & drop ──────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    if (!canEdit) return;
    e.dataTransfer.setData('diagramId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  }, [canEdit]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  const handleDropOnTarget = useCallback(async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const diagramId = e.dataTransfer.getData('diagramId');
    if (!diagramId || !canEdit) return;
    setDropTargetId(null);
    setDraggedId(null);
    try {
      const { error } = await supabase.from('diagrams').update({ folder_id: folderId }).eq('id', diagramId);
      if (error) throw error;
      toast.success('Schéma déplacé');
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    } catch { toast.error('Erreur lors du déplacement'); }
  }, [canEdit, queryClient]);

  // ─── Change organization (owner only) ─────────────────────────────
  const handleChangeOrganization = useCallback(async (diagramId: string, orgId: string) => {
    const { error } = await supabase.from('diagrams').update({ organization_id: orgId }).eq('id', diagramId);
    if (error) { toast.error('Erreur lors du changement d\'organisation'); return; }
    queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    toast.success('Organisation mise à jour');
  }, [queryClient]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleNewDiagram = () => {
    if (!canEdit) { toast.error('Droits insuffisants'); return; }
    setShowTemplatePicker(true);
  };

  const handleTemplateSelected = (template: DiagramTemplate | null) => {
    setSelectedTemplate(template);
    setImportedPayload(null);
    setNewName(template?.name || '');
    setNewDescription(template?.description || '');
    setIsCreating(true);
  };

  const handleImportJson = (data: import('@/lib/diagramImport').ImportedDiagram) => {
    setImportedPayload(data);
    setSelectedTemplate(null);
    setNewName(data.name || '');
    setNewDescription(data.description || '');
    setIsCreating(true);
  };

  const handleCreate = async () => {
    if (!canEdit || !newName.trim()) return;
    setIsSubmitting(true);
    try {
      const templateLike = importedPayload
        ? ({
            equipment: importedPayload.equipment,
            connections: importedPayload.connections,
            zones: importedPayload.zones,
            settings: importedPayload.settings,
          } as DiagramTemplate)
        : selectedTemplate || undefined;
      await createDiagram(newName.trim(), newDescription.trim() || undefined, user?.id, templateLike);
      setIsCreating(false);
      setNewName('');
      setNewDescription('');
      setSelectedTemplate(null);
      setImportedPayload(null);
      onOpenEditor();
    } finally { setIsSubmitting(false); }
  };

  const handleOpen = (id: string) => {
    openDiagram(id);
    if (canEdit) onOpenEditor();
  };

  const handleDuplicate = async (id: string) => {
    if (!canEdit) return;
    await duplicateDiagram(id);
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    deleteDiagram(id);
  };

  const handleMoveDiagramToFolder = async (diagramId: string, folderId: string | null) => {
    try {
      const { error } = await supabase.from('diagrams').update({ folder_id: folderId }).eq('id', diagramId);
      if (error) throw error;
      toast.success('Schéma déplacé');
      queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    } catch { toast.error('Erreur'); }
  };

  const handleDeleteFolder = (folder: DiagramFolder) => {
    if (confirm(`Supprimer "${folder.name}" ? Les schémas seront déplacés à la racine.`)) {
      deleteFolder(folder.id);
    }
  };

  const handleBulkMove = async (folderId: string | null) => {
    for (const id of selectedIds) {
      await supabase.from('diagrams').update({ folder_id: folderId }).eq('id', id);
    }
    queryClient.invalidateQueries({ queryKey: ['diagrams'] });
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} schéma(s) déplacé(s)`);
  };

  const handleBulkDelete = () => {
    if (!confirm(`Supprimer ${selectedIds.size} schéma(s) ?`)) return;
    selectedIds.forEach(id => deleteDiagram(id));
    setSelectedIds(new Set());
  };

  // Compute bulk tag states for multi-select
  const bulkTagStates = useMemo((): Map<string, TagAssignState> => {
    if (selectedIds.size === 0) return new Map();
    const states = new Map<string, TagAssignState>();
    tags.forEach(tag => {
      let assigned = 0;
      selectedIds.forEach(dId => {
        if (diagramTagIds.get(dId)?.has(tag.id)) assigned++;
      });
      if (assigned === 0) states.set(tag.id, 'none');
      else if (assigned === selectedIds.size) states.set(tag.id, 'all');
      else states.set(tag.id, 'mixed');
    });
    return states;
  }, [selectedIds, tags, diagramTagIds]);

  const handleBulkToggleTag = async (tagId: string) => {
    const state = bulkTagStates.get(tagId) || 'none';
    // If all have it → remove from all; otherwise → add to all missing
    if (state === 'all') {
      for (const dId of selectedIds) {
        await removeTagFromDiagram({ diagramId: dId, tagId });
      }
    } else {
      for (const dId of selectedIds) {
        if (!diagramTagIds.get(dId)?.has(tagId)) {
          await addTagToDiagram({ diagramId: dId, tagId });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['all-diagram-tag-associations'] });
    queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram'] });
  };


  const DiagramContextMenu = ({ diagram, children }: { diagram: Diagram & { folderId?: string }; children: React.ReactNode }) => {
    const org = organizations.find(o => o.id === (diagram as any).organizationId);
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleOpen(diagram.id)}>
            <Eye className="h-4 w-4 mr-2" />
            Ouvrir
          </ContextMenuItem>
          {canEdit && (
            <>
              <ContextMenuItem onClick={() => startRename(diagram.id, diagram.name)}>
                <PenLine className="h-4 w-4 mr-2" />
                Renommer
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleDuplicate(diagram.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </ContextMenuItem>
              {folders.length > 0 && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Déplacer vers
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem onClick={() => handleMoveDiagramToFolder(diagram.id, null)}>
                      <Folder className="h-4 w-4 mr-2" />
                      Racine
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {folders.map(f => (
                      <ContextMenuItem key={f.id} onClick={() => handleMoveDiagramToFolder(diagram.id, f.id)}>
                        <Folder className="h-4 w-4 mr-2" style={{ color: f.color }} />
                        {f.name}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {tags.length > 0 && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Tag className="h-4 w-4 mr-2" />
                    Étiquettes
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {tags.map(tag => {
                      const hasTag = diagramTagIds.get(diagram.id)?.has(tag.id);
                      return (
                        <ContextMenuItem
                          key={tag.id}
                          onClick={async () => {
                            if (hasTag) {
                              await removeTagFromDiagram({ diagramId: diagram.id, tagId: tag.id });
                            } else {
                              await addTagToDiagram({ diagramId: diagram.id, tagId: tag.id });
                            }
                            queryClient.invalidateQueries({ queryKey: ['all-diagram-tag-associations'] });
                            queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram', diagram.id] });
                          }}
                        >
                          <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="flex-1">{tag.name}</span>
                          {hasTag && <span className="text-primary ml-2">✓</span>}
                        </ContextMenuItem>
                      );
                    })}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {isOwner && organizations.filter(o => !o.is_default).length > 0 && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Building2 className="h-4 w-4 mr-2" />
                    Organisation
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {organizations.filter(o => !o.is_default).map(o => (
                      <ContextMenuItem
                        key={o.id}
                        onClick={() => handleChangeOrganization(diagram.id, o.id)}
                        className={cn((diagram as any).organizationId === o.id && "font-semibold")}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        {o.name}
                        {(diagram as any).organizationId === o.id && <span className="ml-auto text-primary">✓</span>}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => handleDelete(diagram.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  // ─── Folder context menu ──────────────────────────────────────────
  const FolderContextMenu = ({ folder, children }: { folder: DiagramFolder; children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => startRename(folder.id, folder.name)}>
          <PenLine className="h-4 w-4 mr-2" />
          Renommer
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { setEditingFolder(folder); setShowFolderDialog(true); }}>
          <Folder className="h-4 w-4 mr-2" />
          Modifier
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleDeleteFolder(folder)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  // ─── Single diagram row ───────────────────────────────────────────
  const DiagramRow = ({ diagram, indent = false }: { diagram: Diagram & { folderId?: string }; indent?: boolean }) => {
    const org = organizations.find(o => o.id === (diagram as any).organizationId);
    const isSelected = selectedIds.has(diagram.id);
    const isRenaming = renamingId === diagram.id;
    const isDragged = draggedId === diagram.id;

    return (
      <DiagramContextMenu diagram={diagram}>
        <div
          className={cn(
            "group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_100px_minmax(0,1fr)_minmax(0,1fr)_80px_40px] gap-2 items-center px-3 py-2 rounded-lg transition-all duration-150 border border-transparent",
            indent && "ml-7",
            isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50",
            isDragged && "opacity-40",
            canEdit && "cursor-grab active:cursor-grabbing",
          )}
          draggable={canEdit}
          onDragStart={(e) => handleDragStart(e, diagram.id)}
          onDragEnd={handleDragEnd}
          onClick={() => !isRenaming && handleOpen(diagram.id)}
          onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) startRename(diagram.id, diagram.name); }}
        >
          {/* Checkbox */}
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelection(diagram.id)}
              className="mr-1"
            />
          </div>

          {/* Name */}
          <div className="flex items-center gap-2 min-w-0">
            <FileJson className="h-4 w-4 text-primary/70 flex-shrink-0" />
            {isRenaming ? (
              <Input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                className="h-7 text-sm"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground group-hover:text-primary truncate block">
                  {diagram.name}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="hidden md:block min-w-0">
            <DiagramTagChips diagramId={diagram.id} />
          </div>

          {/* Elements */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5"><Box className="h-3 w-3" />{diagram.equipment.length}</span>
            <span className="flex items-center gap-0.5"><Link className="h-3 w-3" />{diagram.connections.length}</span>
          </div>

          {/* Creator */}
          <div className="hidden md:flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
            {diagram.creatorName && (
              <>
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{diagram.creatorName}</span>
              </>
            )}
          </div>

          {/* Date */}
          <div className="hidden md:flex items-center text-xs text-muted-foreground">
            {format(diagram.updatedAt, 'dd MMM', { locale: fr })}
          </div>

          {/* Organisation */}
          <div className="hidden md:flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
            {org && (
              <>
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{org.name}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <div className="flex items-center gap-0.5">
                {/* Label picker popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end" side="bottom">
                    <LabelPicker
                      tags={tags}
                      tagStates={new Map(tags.map(t => [t.id, diagramTagIds.get(diagram.id)?.has(t.id) ? 'all' as TagAssignState : 'none' as TagAssignState]))}
                      onToggle={async (tagId) => {
                        const hasTag = diagramTagIds.get(diagram.id)?.has(tagId);
                        if (hasTag) {
                          await removeTagFromDiagram({ diagramId: diagram.id, tagId });
                        } else {
                          await addTagToDiagram({ diagramId: diagram.id, tagId });
                        }
                        queryClient.invalidateQueries({ queryKey: ['all-diagram-tag-associations'] });
                        queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram', diagram.id] });
                      }}
                      onCreate={async (name, color) => {
                        const newTag = await createTag({ name, color, organizationId: userOrgId });
                        await addTagToDiagram({ diagramId: diagram.id, tagId: newTag.id });
                        queryClient.invalidateQueries({ queryKey: ['all-diagram-tag-associations'] });
                        queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram', diagram.id] });
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDuplicate(diagram.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Dupliquer
                    </DropdownMenuItem>
                    {folders.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FolderInput className="h-4 w-4 mr-2" />
                          Déplacer vers
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleMoveDiagramToFolder(diagram.id, null)}>
                            Racine
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {folders.map(f => (
                            <DropdownMenuItem key={f.id} onClick={() => handleMoveDiagramToFolder(diagram.id, f.id)}>
                              <Folder className="h-4 w-4 mr-2" style={{ color: f.color }} />
                              {f.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    {isOwner && organizations.filter(o => !o.is_default).length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Building2 className="h-4 w-4 mr-2" />
                          Organisation
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {organizations.filter(o => !o.is_default).map(o => (
                            <DropdownMenuItem
                              key={o.id}
                              onClick={() => handleChangeOrganization(diagram.id, o.id)}
                              className={cn((diagram as any).organizationId === o.id && "font-semibold")}
                            >
                              <Building2 className="h-4 w-4 mr-2" />
                              {o.name}
                              {(diagram as any).organizationId === o.id && <span className="ml-auto text-primary">✓</span>}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(diagram.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </DiagramContextMenu>
    );
  };

  // ─── Folder row with children ─────────────────────────────────────
  const FolderRow = ({ folder }: { folder: DiagramFolder }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderDiagrams = sortDiagrams((diagramsByFolder.get(folder.id) || []).filter(d => matchesDiagram(d)));
    const isDropTarget = dropTargetId === folder.id;
    const isRenaming = renamingId === folder.id;

    return (
      <div>
        <FolderContextMenu folder={folder}>
          <div
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer border-2 border-transparent",
              isDropTarget ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            )}
            onClick={() => !isRenaming && toggleFolder(folder.id)}
            onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) startRename(folder.id, folder.name); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (draggedId) setDropTargetId(folder.id); }}
            onDragLeave={() => setDropTargetId(null)}
            onDrop={(e) => handleDropOnTarget(e, folder.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
            {isRenaming ? (
              <Input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                className="h-7 text-sm flex-1"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium text-foreground flex-1 truncate">{folder.name}</span>
            )}
            <span className="text-xs text-muted-foreground">{folderDiagrams.length}</span>
            {canEdit && (
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        </FolderContextMenu>

        {isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {folderDiagrams.length === 0 ? (
              <div className="ml-7 px-3 py-3 text-sm text-muted-foreground italic">
                Aucun schéma
              </div>
            ) : (
              folderDiagrams.map(d => <DiagramRow key={d.id} diagram={d} indent />)
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Restricted view (no org) ─────────────────────────────────────
  if (showOnboarding) return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;

  if (!hasOrganization) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Box className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SCorp-io</h1>
                <p className="text-sm text-muted-foreground">Architecture Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Lecture seule</Badge>
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Aucune organisation</h3>
                <p className="text-sm text-muted-foreground">
                  Vous n'appartenez à aucune organisation. Contactez un administrateur ou rejoignez via un lien d'invitation.
                </p>
              </div>
              <Button onClick={() => setShowOnboarding(true)} className="gap-2 flex-shrink-0">
                <Building2 className="h-4 w-4" />
                Créer mon organisation
              </Button>
            </CardContent>
          </Card>
          <div>
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Templates disponibles</h2>
              <Badge variant="secondary" className="ml-2">{allTemplates.length}</Badge>
            </div>
            {allTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileJson className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun template disponible.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {allTemplates.map(t => (
                  <Card key={t.id} className="group transition-all hover:border-primary/40 hover:shadow-lg">
                    <div className="h-32 bg-gradient-to-br from-muted/50 to-muted/80 flex items-center justify-center relative">
                      <FileJson className="h-12 w-12 text-muted-foreground/30" />
                      <Badge variant="outline" className="absolute top-2 right-2 text-xs bg-background/80"><Eye className="h-3 w-3 mr-1" />Lecture seule</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1">{t.name}</h3>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Main dashboard ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Box className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SCorp-io</h1>
              <p className="text-sm text-muted-foreground">Architecture Builder</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!canEdit && <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Lecture seule</Badge>}
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => navigate('/admin/equipment')} className="gap-2">
                  <Library className="h-4 w-4" />
                  Bibliothèque
                </Button>
                <Button onClick={handleNewDiagram} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau schéma
                </Button>
              </>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-3">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={handleNewDiagram} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau schéma
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setEditingFolder(null); setShowFolderDialog(true); }}
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                Nouveau dossier
              </Button>
            </>
          )}
          <div className="flex-1" />
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher schéma, dossier, étiquette..."
              value={searchTerm}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {searchTerm && (
              <button onClick={() => updateSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-2">
          <FilterBar
            tags={tags}
            folders={folders}
            creators={creators}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Active filter chips */}
        {hasActiveFilters(filters) && (
          <div className="mb-3">
            <ActiveFilterChips
              filters={filters}
              tags={tags}
              folders={folders}
              onFiltersChange={setFilters}
            />
          </div>
        )}

        {/* Bulk actions */}
        {selectedIds.size > 0 && canEdit && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">{selectedIds.size} sélectionné(s)</span>
            {/* Bulk label picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Étiquettes
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <LabelPicker
                  tags={tags}
                  tagStates={bulkTagStates}
                  onToggle={handleBulkToggleTag}
                  onCreate={async (name, color) => {
                    const newTag = await createTag({ name, color, organizationId: userOrgId });
                    for (const dId of selectedIds) {
                      await addTagToDiagram({ diagramId: dId, tagId: newTag.id });
                    }
                    queryClient.invalidateQueries({ queryKey: ['all-diagram-tag-associations'] });
                    queryClient.invalidateQueries({ queryKey: ['diagram-tags-for-diagram'] });
                  }}
                />
              </PopoverContent>
            </Popover>
            {folders.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <FolderInput className="h-3.5 w-3.5" />
                    Déplacer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkMove(null)}>Racine</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {folders.map(f => (
                    <DropdownMenuItem key={f.id} onClick={() => handleBulkMove(f.id)}>
                      <Folder className="h-4 w-4 mr-2" style={{ color: f.color }} />{f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Désélectionner
            </button>
          </div>
        )}

        {/* Root drop zone */}
        <div
          className={cn(
            "rounded-xl border transition-colors min-h-[200px]",
            dropTargetId === 'root' ? "border-primary bg-primary/5" : "border-transparent"
          )}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (draggedId) setDropTargetId('root'); }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(e) => handleDropOnTarget(e, null)}
        >
          {/* Column headers — sortable */}
          <div className="hidden md:grid grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_100px_minmax(0,1fr)_minmax(0,1fr)_80px_40px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border select-none">
            <div className="w-5" />
            <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
              Nom
              {sortField === 'name' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <div>Étiquettes</div>
            <button onClick={() => toggleSort('elements')} className="flex items-center gap-1 hover:text-foreground transition-colors justify-center">
              Éléments
              {sortField === 'elements' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <button onClick={() => toggleSort('createdBy')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
              Créé par
              {sortField === 'createdBy' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <div className="text-left">Organisation</div>
            <button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-1 hover:text-foreground transition-colors">
              Modifié
              {sortField === 'updatedAt' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
            <div />
          </div>

          {/* Tree content */}
          <div className="space-y-0.5 py-1">
            {/* Folders */}
            {filteredFolders.map(folder => (
              <FolderRow key={folder.id} folder={folder} />
            ))}

            {/* Root diagrams */}
            {rootDiagrams.map(d => (
              <DiagramRow key={d.id} diagram={d} />
            ))}

            {/* Empty state */}
            {filteredFolders.length === 0 && rootDiagrams.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {(searchTerm || hasActiveFilters(filters)) ? <Search className="h-8 w-8 text-muted-foreground" /> : <FileJson className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {searchTerm ? `Aucun résultat pour « ${searchTerm} »` : hasActiveFilters(filters) ? 'Aucun résultat avec ces filtres' : 'Aucun schéma'}
                </h3>
                <p className="text-muted-foreground mb-4 text-center max-w-sm">
                  {(searchTerm || hasActiveFilters(filters)) ? 'Essayez d\'autres termes ou réinitialisez les filtres' : 'Créez votre premier schéma d\'architecture GTB'}
                </p>
                {(searchTerm || hasActiveFilters(filters)) && (
                  <Button variant="outline" onClick={() => { updateSearch(''); setFilters(EMPTY_FILTERS); }} className="gap-2">
                    <X className="h-4 w-4" />
                    Réinitialiser la recherche
                  </Button>
                )}
                {!searchTerm && !hasActiveFilters(filters) && canEdit && (
                  <Button onClick={handleNewDiagram} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Créer un schéma
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau schéma d'architecture</DialogTitle>
            <DialogDescription>Créez un nouveau schéma pour votre projet GTB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="diagram-name">Nom du schéma *</Label>
              <Input
                id="diagram-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Architecture GTB Bâtiment A"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagram-desc">Description (optionnel)</Label>
              <Textarea
                id="diagram-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Décrivez brièvement le contexte du projet..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer le schéma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplatePickerDialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker} onSelectTemplate={handleTemplateSelected} onImportJson={handleImportJson} />
      <FolderDialog open={showFolderDialog} onOpenChange={setShowFolderDialog} folder={editingFolder || undefined} organizationId={userOrgId} />
    </div>
  );
};
