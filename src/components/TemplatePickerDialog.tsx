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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramTemplates, DiagramTemplate } from '@/hooks/useDiagramTemplates';
import { Box, FileJson, Trash2, LayoutTemplate } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuthContext } from '@/contexts/AuthContext';
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

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: DiagramTemplate | null) => void;
}

export const TemplatePickerDialog = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplatePickerDialogProps) => {
  const { templates, isLoading, deleteTemplate } = useDiagramTemplates();
  const { isAdmin } = useAuthContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<DiagramTemplate | null>(null);

  const handleConfirm = () => {
    if (selectedId) {
      const template = templates.find((t) => t.id === selectedId);
      onSelectTemplate(template || null);
    } else {
      onSelectTemplate(null);
    }
    onOpenChange(false);
    setSelectedId(null);
  };

  const handleCreateEmpty = () => {
    onSelectTemplate(null);
    onOpenChange(false);
    setSelectedId(null);
  };

  const handleDelete = (template: DiagramTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(template);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete.id);
      if (selectedId === templateToDelete.id) {
        setSelectedId(null);
      }
      setTemplateToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Choisir un template
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un template pour pré-remplir votre nouveau schéma, ou commencez avec un
              canevas vide.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement des templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileJson className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center">
                  Aucun template disponible.
                  <br />
                  Créez un schéma puis sauvegardez-le comme template.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedId === template.id
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedId(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(template, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Box className="h-3.5 w-3.5" />
                          <span>{template.equipment.length} équipements</span>
                        </div>
                        <span>•</span>
                        <span>{template.connections.length} connexions</span>
                        <span>•</span>
                        <span>{template.zones.length} zones</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Créé le {format(template.createdAt, 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCreateEmpty} className="flex-1 sm:flex-none">
              Canevas vide
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="flex-1 sm:flex-none"
            >
              Utiliser ce template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le template "{templateToDelete?.name}" sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
