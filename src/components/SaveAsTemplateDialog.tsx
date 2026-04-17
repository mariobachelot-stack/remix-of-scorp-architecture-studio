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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramTemplates, DiagramTemplate } from '@/hooks/useDiagramTemplates';
import { useDiagram } from '@/contexts/DiagramContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { FileUp, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaveAsTemplateDialog = ({ open, onOpenChange }: SaveAsTemplateDialogProps) => {
  const { currentDiagram } = useDiagram();
  const { user } = useAuthContext();
  const { templates, createTemplate, updateTemplate, isCreating, isUpdating } = useDiagramTemplates();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const isSaving = isCreating || isUpdating;

  const handleSave = async () => {
    if (!currentDiagram) return;

    if (mode === 'existing' && selectedTemplateId) {
      // Update existing template
      await updateTemplate({
        id: selectedTemplateId,
        name: selectedTemplate?.name || '',
        description: selectedTemplate?.description,
        equipment: currentDiagram.equipment,
        connections: currentDiagram.connections,
        zones: currentDiagram.zones,
        settings: currentDiagram.settings,
      });
    } else if (mode === 'new' && name.trim()) {
      // Create new template
      await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        equipment: currentDiagram.equipment,
        connections: currentDiagram.connections,
        zones: currentDiagram.zones,
        settings: currentDiagram.settings,
        userId: user?.id,
      });
    } else {
      return;
    }

    setName('');
    setDescription('');
    setSelectedTemplateId(null);
    setMode('new');
    onOpenChange(false);
  };

  const canSave = mode === 'new' ? name.trim() : selectedTemplateId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Sauvegarder comme template
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau template ou écrasez un template existant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'new' | 'existing')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="mode-new" />
              <Label htmlFor="mode-new" className="flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Créer un nouveau template
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="mode-existing" disabled={templates.length === 0} />
              <Label 
                htmlFor="mode-existing" 
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  templates.length === 0 && "text-muted-foreground cursor-not-allowed"
                )}
              >
                <Save className="h-4 w-4" />
                Écraser un template existant
                {templates.length === 0 && <span className="text-xs">(aucun template)</span>}
              </Label>
            </div>
          </RadioGroup>

          {mode === 'new' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="template-name">Nom du template *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Architecture GTB Standard"
                  onKeyDown={(e) => e.key === 'Enter' && canSave && handleSave()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-desc">Description (optionnel)</Label>
                <Textarea
                  id="template-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez le contenu de ce template..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Sélectionnez un template à écraser</Label>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-md transition-colors",
                        "hover:bg-muted/50",
                        selectedTemplateId === template.id && "bg-primary/10 border border-primary"
                      )}
                    >
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {template.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.equipment.length} équip. • {template.connections.length} conn. • {template.zones.length} zones
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              {selectedTemplate && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Le contenu de « {selectedTemplate.name} » sera remplacé.
                </p>
              )}
            </div>
          )}

          {currentDiagram && (
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
              <p>Ce template contiendra :</p>
              <ul className="mt-1 list-disc list-inside">
                <li>{currentDiagram.equipment.length} équipement(s)</li>
                <li>{currentDiagram.connections.length} connexion(s)</li>
                <li>{currentDiagram.zones.length} zone(s)</li>
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Sauvegarde...' : mode === 'new' ? 'Créer' : 'Écraser'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
