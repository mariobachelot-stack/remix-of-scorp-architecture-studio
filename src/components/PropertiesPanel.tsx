import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useDiagram } from '@/contexts/DiagramContext';
import { EquipmentPropertiesForm } from '@/components/EquipmentPropertiesForm';
import { EquipmentTreeView } from '@/components/EquipmentTreeView';
import { ColorPickerWithPalette } from '@/components/ColorPickerWithPalette';
import { 
  Protocol, 
  PROTOCOL_LABELS,
  PROTOCOL_COLORS,
  getProtocolColor,
  HandleSide,
  CanvasText,
} from '@/types/equipment';
import { X, Trash2, SquareDashed, ArrowRight, ArrowLeft, Lock, MoveHorizontal, ImageIcon, RotateCcw, Type } from 'lucide-react';

export const PropertiesPanel = () => {
  const { 
    selectedEquipment, 
    selectedConnection,
    selectedZone,
    selectedImage,
    selectedText,
    selectEquipment, 
    selectConnection,
    selectZone,
    selectImage,
    selectText,
    updateConnection,
    removeConnection,
    updateZone,
    removeZone,
    updateImage,
    removeImage,
    updateText,
    removeText,
    currentDiagram,
  } = useDiagram();

  if (!selectedEquipment && !selectedConnection && !selectedZone && !selectedImage && !selectedText) {
    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full">
        <EquipmentTreeView />
      </div>
    );
  }

  // Text properties panel
  if (selectedText) {
    const FONT_FAMILIES = [
      { value: 'Roboto', label: 'Roboto' },
      { value: 'Arial', label: 'Arial' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Courier New', label: 'Courier New' },
      { value: 'Inter', label: 'Inter' },
      { value: 'Montserrat', label: 'Montserrat' },
    ];

    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
              <Type className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Texte</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                {selectedText.content}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectText(null)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="text-content">Contenu</Label>
            <Input
              id="text-content"
              value={selectedText.content}
              onChange={(e) => updateText(selectedText.id, { content: e.target.value })}
              placeholder="Texte..."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="text-font">Police</Label>
            <Select
              value={selectedText.fontFamily}
              onValueChange={(value) => updateText(selectedText.id, { fontFamily: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text-size">Taille ({selectedText.fontSize}px)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[selectedText.fontSize]}
                onValueChange={([value]) => updateText(selectedText.id, { fontSize: value })}
                min={8}
                max={200}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={selectedText.fontSize}
                onChange={(e) => {
                  const val = Math.max(8, Math.min(200, parseInt(e.target.value) || 14));
                  updateText(selectedText.id, { fontSize: val });
                }}
                className="w-16"
                min={8}
                max={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <ColorPickerWithPalette
              value={selectedText.color}
              onChange={(color) => updateText(selectedText.id, { color })}
              placeholder="#000000"
              showReset={false}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  value={Math.round(selectedText.x)}
                  onChange={(e) => updateText(selectedText.id, { x: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedText.y)}
                  onChange={(e) => updateText(selectedText.id, { y: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              removeText(selectedText.id);
              selectText(null);
            }}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer le texte
          </Button>
        </div>
      </div>
    );
  }

  // Image properties panel
  if (selectedImage) {
    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Image</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                {selectedImage.name || 'Sans nom'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectImage(null)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="image-name">Nom</Label>
            <Input
              id="image-name"
              value={selectedImage.name || ''}
              onChange={(e) => updateImage(selectedImage.id, { name: e.target.value })}
              placeholder="Nom de l'image"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Dimensions</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Largeur</Label>
                <Input
                  type="number"
                  value={Math.round(selectedImage.width)}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value) || 50;
                    const aspectRatio = selectedImage.width / selectedImage.height;
                    updateImage(selectedImage.id, { 
                      width: newWidth,
                      height: newWidth / aspectRatio,
                    });
                  }}
                  min={50}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hauteur</Label>
                <Input
                  type="number"
                  value={Math.round(selectedImage.height)}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value) || 50;
                    const aspectRatio = selectedImage.width / selectedImage.height;
                    updateImage(selectedImage.id, { 
                      height: newHeight,
                      width: newHeight * aspectRatio,
                    });
                  }}
                  min={50}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  value={Math.round(selectedImage.x)}
                  onChange={(e) => updateImage(selectedImage.id, { x: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedImage.y)}
                  onChange={(e) => updateImage(selectedImage.id, { y: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg overflow-hidden border border-border">
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name || 'Preview'} 
              className="w-full h-32 object-contain bg-muted"
            />
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              removeImage(selectedImage.id);
              selectImage(null);
            }}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer l'image
          </Button>
        </div>
      </div>
    );
  }

  // Zone properties panel
  if (selectedZone) {
    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: selectedZone.backgroundColor || `${selectedZone.color}15`, borderColor: selectedZone.color, borderWidth: 2, borderStyle: 'dashed' }}
            >
              <SquareDashed className="h-5 w-5" style={{ color: selectedZone.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Zone</h3>
              <p className="text-xs text-muted-foreground">{selectedZone.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectZone(null)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="zone-name">Nom de la zone</Label>
            <Input
              id="zone-name"
              value={selectedZone.name}
              onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Couleur de bordure</Label>
            <ColorPickerWithPalette
              value={selectedZone.color}
              onChange={(color) => updateZone(selectedZone.id, { color })}
              placeholder="#3b82f6"
              showReset={false}
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <ColorPickerWithPalette
              value={selectedZone.backgroundColor || `${selectedZone.color}15`}
              onChange={(color) => updateZone(selectedZone.id, { backgroundColor: color })}
              defaultColor={`${selectedZone.color}15`}
              onReset={() => updateZone(selectedZone.id, { backgroundColor: undefined })}
              showReset={!!selectedZone.backgroundColor}
              placeholder="#3b82f620"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez une valeur hexadécimale avec transparence (ex: #3b82f620)
            </p>
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              removeZone(selectedZone.id);
              selectZone(null);
            }}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la zone
          </Button>
        </div>
      </div>
    );
  }

  if (selectedConnection) {
    const source = currentDiagram?.equipment.find(e => e.canvasId === selectedConnection.sourceId);
    const target = currentDiagram?.equipment.find(e => e.canvasId === selectedConnection.targetId);

    return (
      <div className="w-80 bg-card border-l border-border flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Connexion</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectConnection(null)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{source?.label}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{target?.label}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-name">Nom du lien</Label>
            <Input
              id="conn-name"
              value={selectedConnection.name || ''}
              onChange={(e) => updateConnection(selectedConnection.id, { name: e.target.value })}
              placeholder="Ex: Liaison RS485"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-protocol">Protocole</Label>
            <Select
              value={selectedConnection.protocol}
              onValueChange={(value: Protocol) => 
                updateConnection(selectedConnection.id, { protocol: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROTOCOL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Style de ligne</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedConnection.style === 'solid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConnection(selectedConnection.id, { style: 'solid' })}
                className="flex-1"
              >
                <div className="w-8 h-0.5 bg-current" />
                <span className="ml-2">Plein</span>
              </Button>
              <Button
                variant={selectedConnection.style === 'dashed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConnection(selectedConnection.id, { style: 'dashed' })}
                className="flex-1"
              >
                <div className="w-8 h-0.5 border-t-2 border-dashed border-current" />
                <span className="ml-2">Pointillé</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Épaisseur du trait</Label>
            <div className="flex items-center gap-3">
              <MoveHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[selectedConnection.strokeWidth ?? 1.5]}
                min={0.5}
                max={5}
                step={0.5}
                onValueChange={([value]) => updateConnection(selectedConnection.id, { strokeWidth: value })}
                className="flex-1"
              />
              <span className="text-xs font-mono w-10 text-right">
                {selectedConnection.strokeWidth ?? 1.5}px
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Flèches directionnelles</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedConnection.arrowStart ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConnection(selectedConnection.id, { arrowStart: !selectedConnection.arrowStart })}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Début
              </Button>
              <Button
                variant={selectedConnection.arrowEnd ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConnection(selectedConnection.id, { arrowEnd: !selectedConnection.arrowEnd })}
                className="flex-1"
              >
                Fin
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sécurité</Label>
            <Button
              variant={selectedConnection.isSecure ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConnection(selectedConnection.id, { isSecure: !selectedConnection.isSecure })}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {selectedConnection.isSecure ? 'Connexion sécurisée' : 'Marquer comme sécurisé'}
            </Button>
          </div>

          <Separator />

          {/* Handle side selectors */}
          <div className="space-y-2">
            <Label>Point de départ</Label>
            <Select
              value={selectedConnection.sourceFromCommCard ? 'comm-card' : (selectedConnection.sourceHandle || 'auto')}
              onValueChange={(value) => {
                if (value === 'auto') {
                  updateConnection(selectedConnection.id, { sourceHandle: undefined, sourceFromCommCard: undefined });
                } else if (value === 'comm-card') {
                  updateConnection(selectedConnection.id, { sourceFromCommCard: true, sourceHandle: undefined });
                } else {
                  updateConnection(selectedConnection.id, { sourceHandle: value as HandleSide, sourceFromCommCard: undefined });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="top">Haut</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
                <SelectItem value="bottom">Bas</SelectItem>
                <SelectItem value="left">Gauche</SelectItem>
                {source?.hasCommCard && (
                  <SelectItem value="comm-card">Carte de com</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Point d'arrivée</Label>
            <Select
              value={selectedConnection.targetFromCommCard ? 'comm-card' : (selectedConnection.targetHandle || 'auto')}
              onValueChange={(value) => {
                if (value === 'auto') {
                  updateConnection(selectedConnection.id, { targetHandle: undefined, targetFromCommCard: undefined });
                } else if (value === 'comm-card') {
                  updateConnection(selectedConnection.id, { targetFromCommCard: true, targetHandle: undefined });
                } else {
                  updateConnection(selectedConnection.id, { targetHandle: value as HandleSide, targetFromCommCard: undefined });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="top">Haut</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
                <SelectItem value="bottom">Bas</SelectItem>
                <SelectItem value="left">Gauche</SelectItem>
                {target?.hasCommCard && (
                  <SelectItem value="comm-card">Carte de com</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Couleur du lien</Label>
            <ColorPickerWithPalette
              value={selectedConnection.color || getProtocolColor(selectedConnection.protocol, currentDiagram?.settings)}
              onChange={(color) => updateConnection(selectedConnection.id, { color })}
              defaultColor={getProtocolColor(selectedConnection.protocol, currentDiagram?.settings)}
              onReset={() => updateConnection(selectedConnection.id, { color: undefined })}
              showReset={!!selectedConnection.color}
              placeholder="#3b82f6"
            />
            <p className="text-xs text-muted-foreground">
              Par défaut, la couleur est définie par le protocole
            </p>
          </div>

          <Separator />

          {/* Reset label position */}
          {(selectedConnection.labelPosition !== undefined || selectedConnection.labelPerpendicularOffset !== undefined) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateConnection(selectedConnection.id, { labelPosition: undefined, labelPerpendicularOffset: undefined })}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser la position du label
            </Button>
          )}

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            onClick={() => removeConnection(selectedConnection.id)}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EquipmentPropertiesForm 
      equipment={selectedEquipment!} 
      onClose={() => selectEquipment(null)} 
    />
  );
};