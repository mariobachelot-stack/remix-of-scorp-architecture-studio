import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DiagramTag } from '@/hooks/useDiagramTags';
import { cn } from '@/lib/utils';
import { Search, Plus, Check, Minus } from 'lucide-react';

const TAG_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];

export type TagAssignState = 'all' | 'none' | 'mixed';

interface LabelPickerProps {
  tags: DiagramTag[];
  /** Map of tagId → assignment state. 'all' = fully assigned, 'none' = not assigned, 'mixed' = partial (multi-select) */
  tagStates: Map<string, TagAssignState>;
  onToggle: (tagId: string) => void;
  onCreate: (name: string, color: string) => Promise<void>;
}

export const LabelPicker = ({ tags, tagStates, onToggle, onCreate }: LabelPickerProps) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = tags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const noMatch = search.trim() && filtered.length === 0;

  const handleCreate = async () => {
    const name = (showCreate ? newName : search).trim();
    if (!name) return;
    setIsCreating(true);
    try {
      await onCreate(name, newColor);
      setNewName('');
      setSearch('');
      setShowCreate(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-60 p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Rechercher une étiquette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm pl-7"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && noMatch) {
              setShowCreate(true);
              setNewName(search.trim());
            }
          }}
        />
      </div>

      {/* Tags list */}
      {filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((tag) => {
            const state = tagStates.get(tag.id) || 'none';
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(tag.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors hover:bg-muted",
                  state !== 'none' && "bg-accent/50"
                )}
              >
                <div
                  className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: tag.color, backgroundColor: state !== 'none' ? tag.color : 'transparent' }}
                >
                  {state === 'all' && <Check className="h-3 w-3 text-white" />}
                  {state === 'mixed' && <Minus className="h-3 w-3 text-white" />}
                </div>
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left truncate">{tag.name}</span>
                {tag.isDefault && (
                  <span className="text-[9px] text-muted-foreground border rounded px-1">défaut</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No match → suggest create */}
      {noMatch && !showCreate && (
        <button
          onClick={() => { setShowCreate(true); setNewName(search.trim()); }}
          className="flex items-center gap-2 w-full px-2 py-2 rounded text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-4 w-4" />
          Créer « {search.trim()} »
        </button>
      )}

      {/* Create section */}
      {!showCreate && !noMatch && (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted transition-colors border-t pt-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Créer une étiquette
        </button>
      )}

      {showCreate && (
        <div className="border-t pt-2 space-y-2">
          <Input
            placeholder="Nom de l'étiquette"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "w-5 h-5 rounded-full transition-all",
                  newColor === c ? "ring-2 ring-offset-1 ring-primary" : "hover:scale-110"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || isCreating} className="w-full h-7 text-xs">
            {isCreating ? 'Création...' : 'Créer et assigner'}
          </Button>
        </div>
      )}
    </div>
  );
};
