import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDiagramTemplates, DiagramTemplate } from '@/hooks/useDiagramTemplates';
import { useGTBTemplates, GTBTemplateDefinition } from '@/hooks/useGTBTemplates';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Building2, Download, CheckCircle2, AlertTriangle,
  Wifi, Server, Cloud, Info, Zap, MapPin, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PROTOCOL_COLORS, PROTOCOL_LABELS } from '@/types/equipment';

interface GTBTemplateImporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProtocolPill = ({ protocol }: { protocol: string }) => {
  const color = PROTOCOL_COLORS[protocol as keyof typeof PROTOCOL_COLORS] ?? '#9ca3af';
  const label = PROTOCOL_LABELS[protocol as keyof typeof PROTOCOL_LABELS] ?? protocol;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
};

const TemplateCard = ({
  template, selected, imported, onSelect,
}: {
  template: GTBTemplateDefinition;
  selected: boolean;
  imported: boolean;
  onSelect: () => void;
}) => {
  const protocols = Array.from(
    new Set(template.connections.map((c) => c.protocol).filter((p) => p !== 'none'))
  );

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg border-2 p-4 transition-all duration-150',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40',
        selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
        imported && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{template.name}</span>
            {imported && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-0.5 inline" />
                Déjà importé
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
        </div>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>{template.equipment.length} équipements</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>{template.connections.length} connexions</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span>{template.zones.length} zones</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {protocols.map((p) => <ProtocolPill key={p} protocol={p} />)}
      </div>

      <div className="flex flex-wrap gap-1">
        {template.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
        ))}
      </div>
    </button>
  );
};

const TechnicalNotes = ({ template }: { template: GTBTemplateDefinition }) => {
  const warnings = template.equipment
    .filter((e) => e.description?.includes('⚠'))
    .map((e) => ({ label: e.label, note: e.description || '' }));

  const scorpioEquipment = template.equipment.filter((e) => e.category === 'scorp-io');

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-foreground mb-1.5 flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-primary" />
          Composants SCorp-io inclus
        </p>
        <ul className="space-y-1">
          {scorpioEquipment.map((e) => (
            <li key={e.canvasId} className="flex items-start gap-1.5 text-muted-foreground">
              <Cloud className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">{e.label}</span>
                {e.description && (
                  <span className="text-xs"> — {e.description.replace(/⚠.*/g, '').trim()}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {warnings.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="font-medium text-amber-600 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Points à vérifier avant offre
            </p>
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">{w.label}</span>
                    {' — '}
                    {w.note.replace(/^⚠\s*/, '')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />
      <div className="flex items-start gap-2 p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
        <Info className="h-3.5 w-3.5 text-purple-600 mt-0.5 shrink-0" />
        <p className="text-xs text-purple-700 dark:text-purple-300">
          <span className="font-semibold">Classe A NF EN ISO 52120-1</span> — Engagement contractuel
          uniquement après audit terrain confirmant le nombre de points pilotés vs. total requis.
        </p>
      </div>
    </div>
  );
};

// ─── Section de gestion des templates existants ─────────────────────
const ExistingTemplatesManager = ({
  templates,
  onDelete,
}: {
  templates: DiagramTemplate[];
  onDelete: (id: string, name: string) => void;
}) => {
  if (templates.length === 0) return null;

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Templates déjà importés — gérer
      </p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-foreground">{t.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(t.id, t.name)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GTBTemplateImporterDialog = ({ open, onOpenChange }: GTBTemplateImporterDialogProps) => {
  const { templates: gtbTemplates } = useGTBTemplates();
  const { templates: existingTemplates, createTemplate, deleteTemplate, isCreating } = useDiagramTemplates();
  const { user } = useAuthContext();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  const selectedTemplate = gtbTemplates.find((t) => t.id === selectedId);

  const isAlreadyImported = (template: GTBTemplateDefinition) =>
    importedIds.has(template.id) ||
    existingTemplates.some((t) => t.name === template.name);

  const handleImport = async () => {
    if (!selectedTemplate) return;
    setIsImporting(true);
    try {
      await createTemplate({
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        equipment: selectedTemplate.equipment,
        connections: selectedTemplate.connections,
        zones: selectedTemplate.zones,
        settings: selectedTemplate.settings,
        userId: user?.id,
      });
      setImportedIds((prev) => new Set([...prev, selectedTemplate.id]));
      toast.success(`Template "${selectedTemplate.name}" importé !`, {
        description: "Disponible lors de la création d'un nouveau schéma.",
        duration: 4000,
      });
    } catch (err) {
      toast.error("Erreur lors de l'import.", {
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportAll = async () => {
    const toImport = gtbTemplates.filter((t) => !isAlreadyImported(t));
    if (toImport.length === 0) { toast.info('Tous les templates sont déjà importés.'); return; }
    setIsImporting(true);
    let count = 0;
    for (const t of toImport) {
      try {
        await createTemplate({
          name: t.name, description: t.description,
          equipment: t.equipment, connections: t.connections,
          zones: t.zones, settings: t.settings, userId: user?.id,
        });
        setImportedIds((prev) => new Set([...prev, t.id]));
        count++;
      } catch { /* continue */ }
    }
    setIsImporting(false);
    toast.success(`${count} template${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''} !`);
  };

  const handleDeleteConfirm = () => {
    if (!templateToDelete) return;
    deleteTemplate(templateToDelete.id);
    setImportedIds((prev) => {
      const next = new Set(prev);
      next.delete(templateToDelete.id);
      return next;
    });
    toast.success(`Template "${templateToDelete.name}" supprimé.`);
    setTemplateToDelete(null);
  };

  const canImport = !!selectedTemplate && !isAlreadyImported(selectedTemplate) && !isImporting;
  const allImported = gtbTemplates.every((t) => isAlreadyImported(t));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Catalogue Templates GTB SCorp-io
            </DialogTitle>
            <DialogDescription>
              Architectures GTB pré-configurées, prêtes à importer dans votre bibliothèque.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            <div className="w-1/2 flex flex-col min-h-0 gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Vacances Bleues · 2 sites pilotes
              </p>
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-2">
                  {gtbTemplates.map((t) => (
                    <TemplateCard
                      key={t.id} template={t}
                      selected={selectedId === t.id}
                      imported={isAlreadyImported(t)}
                      onSelect={() => setSelectedId(t.id === selectedId ? null : t.id)}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Gestion des templates existants */}
              <ExistingTemplatesManager
                templates={existingTemplates}
                onDelete={(id, name) => setTemplateToDelete({ id, name })}
              />
            </div>

            <div className="w-1/2 flex flex-col min-h-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Détail technique
              </p>
              <ScrollArea className="flex-1 border rounded-lg p-4">
                {selectedTemplate ? (
                  <TechnicalNotes template={selectedTemplate} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                    <Wifi className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">Sélectionnez un template</p>
                    <p className="text-xs mt-1">pour voir les détails et les points de vigilance</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleImportAll}
                  disabled={isImporting || allImported} className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 mr-2" />
                  {allImported ? 'Tous importés' : 'Tout importer'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importer tous les templates en une fois</TooltipContent>
            </Tooltip>

            <Button onClick={handleImport} disabled={!canImport || isCreating}
              className="flex-1 sm:flex-none">
              {isImporting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Import en cours…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {selectedTemplate && isAlreadyImported(selectedTemplate)
                    ? 'Déjà importé'
                    : 'Importer ce template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le template <span className="font-medium">"{templateToDelete?.name}"</span> sera
              définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
