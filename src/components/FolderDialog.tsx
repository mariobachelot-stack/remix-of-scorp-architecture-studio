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
import { useDiagramFolders, DiagramFolder } from '@/hooks/useDiagramFolders';
import { useAuthContext } from '@/contexts/AuthContext';
import { FolderPlus } from 'lucide-react';

const FOLDER_COLORS = [
  '#6b7280', '#3b82f6', '#22c55e', '#f97316',
  '#8b5cf6', '#ec4899', '#14b8a6', '#eab308',
];

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: DiagramFolder;
  organizationId?: string;
}

export const FolderDialog = ({ open, onOpenChange, folder, organizationId }: FolderDialogProps) => {
  const { user } = useAuthContext();
  const { createFolder, updateFolder, isCreating } = useDiagramFolders();
  const [name, setName] = useState(folder?.name || '');
  const [color, setColor] = useState(folder?.color || FOLDER_COLORS[0]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (folder) {
      await updateFolder({ id: folder.id, name: name.trim(), color });
    } else {
      await createFolder({ name: name.trim(), color, userId: user?.id, organizationId });
    }

    setName('');
    setColor(FOLDER_COLORS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {folder ? 'Modifier le dossier' : 'Nouveau dossier'}
          </DialogTitle>
          <DialogDescription>
            {folder ? 'Modifiez les informations du dossier.' : 'Créez un dossier pour organiser vos schémas.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nom du dossier *</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Projets 2024"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isCreating}>
            {isCreating ? 'En cours...' : folder ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
