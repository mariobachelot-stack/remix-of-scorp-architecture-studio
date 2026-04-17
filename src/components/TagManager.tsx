import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDiagramTags, DiagramTag } from '@/hooks/useDiagramTags';
import { Tag, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ef4444', // red
];

interface TagManagerProps {
  diagramId: string;
  selectedTags: DiagramTag[];
  onTagsChange: (tags: DiagramTag[]) => void;
  compact?: boolean;
}

export const TagManager = ({ diagramId, selectedTags, onTagsChange, compact }: TagManagerProps) => {
  const { tags, createTag, addTagToDiagram, removeTagFromDiagram } = useDiagramTags();
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleToggleTag = async (tag: DiagramTag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    
    if (isSelected) {
      await removeTagFromDiagram({ diagramId, tagId: tag.id });
      onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      await addTagToDiagram({ diagramId, tagId: tag.id });
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    const newTag = await createTag({ name: newTagName.trim(), color: newTagColor });
    await addTagToDiagram({ diagramId, tagId: newTag.id });
    onTagsChange([...selectedTags, newTag]);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[0]);
  };

  const handleRemoveTag = async (tag: DiagramTag, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeTagFromDiagram({ diagramId, tagId: tag.id });
    onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1 text-xs"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
        >
          {tag.name}
          {!compact && (
            <button
              onClick={(e) => handleRemoveTag(tag, e)}
              className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      
      {!compact && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-muted-foreground">
              <Tag className="h-3 w-3" />
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <p className="text-sm font-medium">Gérer les étiquettes</p>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.some((t) => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
                          isSelected
                            ? "ring-2 ring-offset-1"
                            : "hover:opacity-80"
                        )}
                        style={{ 
                          backgroundColor: `${tag.color}20`, 
                          color: tag.color,
                          borderColor: tag.color,
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Créer une étiquette</p>
                <Input
                  placeholder="Nom de l'étiquette"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <div className="flex gap-1.5">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        newTagColor === c ? "ring-2 ring-offset-1 ring-primary" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewTagColor(c)}
                    />
                  ))}
                </div>
                <Button 
                  size="sm" 
                  onClick={handleCreateTag} 
                  disabled={!newTagName.trim()}
                  className="w-full"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
