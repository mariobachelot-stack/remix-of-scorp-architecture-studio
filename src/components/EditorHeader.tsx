import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDiagram } from '@/contexts/DiagramContext';
import { ExportDialog } from '@/components/ExportDialog';
import { ShareLinkDialog } from '@/components/ShareLinkDialog';
import { SaveAsTemplateDialog } from '@/components/SaveAsTemplateDialog';
import { GTBTemplateImporterDialog } from '@/components/GTBTemplateImporterDialog';
import { TagManager } from '@/components/TagManager';
import { useDiagramTagsForDiagram } from '@/hooks/useDiagramTags';
import {
  ChevronLeft,
  Save,
  Copy,
  Trash2,
  MoreHorizontal,
  PenLine,
  Settings,
  Share2,
  FileDown,
  FileUp,
  Check,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface EditorHeaderProps {
  onBack: () => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const EditorHeader = ({ onBack, canvasRef }: EditorHeaderProps) => {
  const {
    currentDiagram,
    saveDiagram,
    duplicateDiagram,
    deleteDiagram,
    updateDiagramName,
    saveStatus,
  } = useDiagram();

  const { data: diagramTags = [], refetch: refetchTags } = useDiagramTagsForDiagram(currentDiagram?.id);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isGTBImporterOpen, setIsGTBImporterOpen] = useState(false);

  if (!currentDiagram) return null;

  const handleSave = async () => {
    await saveDiagram();
  };

  const handleDuplicate = async () => {
    await duplicateDiagram(currentDiagram.id);
  };

  const handleDelete = () => {
    deleteDiagram(currentDiagram.id);
    onBack();
  };

  const handleRename = () => {
    if (newName.trim()) {
      updateDiagramName(newName.trim());
      setIsRenaming(false);
      toast.success('Nom mis à jour');
    }
  };

  const openRenameDialog = () => {
    setNewName(currentDiagram.name);
    setIsRenaming(true);
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Button>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <h1 className="font-semibold text-foreground">
          {currentDiagram.name}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={openRenameDialog}
        >
          <PenLine className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-green-500" />
              Sauvegardé
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sauvegarde...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1 text-amber-500">
              Modifications non sauvegardées
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Erreur de sauvegarde
            </span>
          )}
        </div>
      </div>

      <div className="ml-4">
        <TagManager
          diagramId={currentDiagram.id}
          selectedTags={diagramTags}
          onTagsChange={() => refetchTags()}
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGTBImporterOpen(true)}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
            >
              <Building2 className="h-4 w-4" />
              Templates GTB
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Importer une architecture GTB SCorp-io pré-configurée
          </TooltipContent>
        </Tooltip>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsShareOpen(true)}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Partager
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExportOpen(true)}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Exporter
        </Button>

        <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
              <FileUp className="h-4 w-4 mr-2" />
              Sauvegarder comme template
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/equipment" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Administration bibliothèque
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le schéma</DialogTitle>
            <DialogDescription>
              Entrez un nouveau nom pour ce schéma d'architecture.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        canvasRef={canvasRef}
      />

      <ShareLinkDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
      />

      <SaveAsTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
      />

      <GTBTemplateImporterDialog
        open={isGTBImporterOpen}
        onOpenChange={setIsGTBImporterOpen}
      />
    </header>
  );
};
