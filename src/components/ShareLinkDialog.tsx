import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useDiagram } from '@/contexts/DiagramContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, Loader2, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';

interface ShareLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareLinkDialog = ({ open, onOpenChange }: ShareLinkDialogProps) => {
  const { currentDiagram } = useDiagram();
  const [isPublic, setIsPublic] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && currentDiagram) {
      fetchPublicStatus();
    }
  }, [open, currentDiagram?.id]);

  const fetchPublicStatus = async () => {
    if (!currentDiagram) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('diagrams')
        .select('is_public, public_token')
        .eq('id', currentDiagram.id)
        .single();

      if (error) throw error;
      
      setIsPublic(data.is_public);
      setPublicToken(data.public_token);
    } catch (error) {
      console.error('Error fetching public status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = async (enabled: boolean) => {
    if (!currentDiagram) return;
    setIsSaving(true);

    try {
      const token = enabled ? (publicToken || uuidv4()) : null;
      
      const { error } = await supabase
        .from('diagrams')
        .update({ 
          is_public: enabled,
          public_token: token,
        })
        .eq('id', currentDiagram.id);

      if (error) throw error;

      setIsPublic(enabled);
      setPublicToken(token);
      toast.success(enabled ? 'Lien public activé' : 'Lien public désactivé');
    } catch (error) {
      console.error('Error toggling public status:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!currentDiagram) return;
    setIsSaving(true);

    try {
      const newToken = uuidv4();
      
      const { error } = await supabase
        .from('diagrams')
        .update({ public_token: newToken })
        .eq('id', currentDiagram.id);

      if (error) throw error;

      setPublicToken(newToken);
      toast.success('Nouveau lien généré');
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast.error('Erreur lors de la régénération');
    } finally {
      setIsSaving(false);
    }
  };

  const getPublicUrl = () => {
    if (!publicToken) return '';
    return `${window.location.origin}/view/${publicToken}`;
  };

  const getEmbedCode = () => {
    if (!publicToken) return '';
    const url = getPublicUrl();
    return `<iframe 
  src="${url}" 
  width="100%" 
  height="600" 
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  frameborder="0"
  allowfullscreen>
</iframe>`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    toast.success('Lien copié dans le presse-papier');
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(getEmbedCode());
    toast.success('Code embed copié dans le presse-papier');
  };

  const handleOpenLink = () => {
    window.open(getPublicUrl(), '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager le schéma</DialogTitle>
          <DialogDescription>
            Générez un lien public pour partager ce schéma en lecture seule.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activer le lien public</Label>
                <p className="text-sm text-muted-foreground">
                  Permet à quiconque avec le lien de voir ce schéma
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={isSaving}
              />
            </div>

            {isPublic && publicToken && (
              <>
                <Tabs defaultValue="link" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="link">Lien direct</TabsTrigger>
                    <TabsTrigger value="embed">Code embed</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="link" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label>Lien de partage</Label>
                      <div className="flex gap-2">
                        <Input
                          value={getPublicUrl()}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyLink}
                          title="Copier le lien"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleOpenLink}
                          title="Ouvrir dans un nouvel onglet"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="embed" className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label>Code iframe à intégrer</Label>
                      <Textarea
                        value={getEmbedCode()}
                        readOnly
                        className="font-mono text-xs h-32 resize-none"
                      />
                      <Button
                        variant="outline"
                        onClick={handleCopyEmbed}
                        className="w-full"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        Copier le code embed
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Collez ce code dans Odoo Knowledge, Notion, Confluence ou tout autre outil supportant les iframes.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button
                  variant="outline"
                  onClick={handleRegenerateToken}
                  disabled={isSaving}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Régénérer le lien
                </Button>

                <p className="text-xs text-muted-foreground">
                  ⚠️ Régénérer le lien invalidera l'ancien lien partagé.
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
