import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DiagramTag } from '@/hooks/useDiagramTags';
import { DiagramFolder } from '@/hooks/useDiagramFolders';
import { cn } from '@/lib/utils';
import {
  Tag, User, Calendar, Folder, X, Search, ChevronDown,
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

// ─── Types ────────────────────────────────────────────────────────────
export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | null;

export interface FilterState {
  tagIds: Set<string>;
  createdBy: Set<string>;
  datePreset: DatePreset;
  folderIds: Set<string>;
  noFolder: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  tagIds: new Set(),
  createdBy: new Set(),
  datePreset: null,
  folderIds: new Set(),
  noFolder: false,
};

export const hasActiveFilters = (f: FilterState) =>
  f.tagIds.size > 0 || f.createdBy.size > 0 || f.datePreset !== null || f.folderIds.size > 0 || f.noFolder;

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois-ci' },
  { value: 'quarter', label: 'Ce trimestre' },
];

// ─── Generic multi-select filter dropdown ─────────────────────────────
interface FilterDropdownProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}

const FilterDropdown = ({ icon, label, count, children }: FilterDropdownProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant={count > 0 ? 'default' : 'outline'}
        size="sm"
        className={cn('gap-1.5 h-8 text-xs font-medium', count > 0 && 'shadow-sm')}
      >
        {icon}
        {label}
        {count > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5 bg-primary-foreground/20 text-primary-foreground">
            {count}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-2" align="start">
      {children}
    </PopoverContent>
  </Popover>
);

// ─── FilterBar ───────────────────────────────────────────────────────
interface FilterBarProps {
  tags: DiagramTag[];
  folders: DiagramFolder[];
  creators: string[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const FilterBar = ({ tags, folders, creators, filters, onFiltersChange }: FilterBarProps) => {
  const [tagSearch, setTagSearch] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');

  const toggleSet = <T extends string>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  };

  const filteredTags = useMemo(() =>
    tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())),
    [tags, tagSearch]
  );

  const filteredCreators = useMemo(() =>
    creators.filter(c => c.toLowerCase().includes(creatorSearch.toLowerCase())),
    [creators, creatorSearch]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Tags filter */}
      <FilterDropdown icon={<Tag className="h-3.5 w-3.5" />} label="Étiquettes" count={filters.tagIds.size}>
        <div className="space-y-1.5">
          {tags.length > 5 && (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} className="h-7 text-xs pl-7" />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => onFiltersChange({ ...filters, tagIds: toggleSet(filters.tagIds, tag.id) })}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                  filters.tagIds.has(tag.id) ? "bg-accent" : "hover:bg-muted"
                )}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="flex-1 text-left truncate">{tag.name}</span>
                {filters.tagIds.has(tag.id) && <span className="text-primary text-xs">✓</span>}
              </button>
            ))}
            {filteredTags.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">Aucune étiquette</p>}
          </div>
        </div>
      </FilterDropdown>

      {/* Created by filter */}
      {creators.length > 0 && (
        <FilterDropdown icon={<User className="h-3.5 w-3.5" />} label="Créé par" count={filters.createdBy.size}>
          <div className="space-y-1.5">
            {creators.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={creatorSearch} onChange={(e) => setCreatorSearch(e.target.value)} className="h-7 text-xs pl-7" />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredCreators.map(name => (
                <button
                  key={name}
                  onClick={() => onFiltersChange({ ...filters, createdBy: toggleSet(filters.createdBy, name) })}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                    filters.createdBy.has(name) ? "bg-accent" : "hover:bg-muted"
                  )}
                >
                  <User className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left truncate">{name}</span>
                  {filters.createdBy.has(name) && <span className="text-primary text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>
      )}

      {/* Date filter */}
      <FilterDropdown icon={<Calendar className="h-3.5 w-3.5" />} label="Modifié" count={filters.datePreset ? 1 : 0}>
        <div className="space-y-0.5">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onFiltersChange({ ...filters, datePreset: filters.datePreset === p.value ? null : p.value })}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                filters.datePreset === p.value ? "bg-accent" : "hover:bg-muted"
              )}
            >
              <span className="flex-1 text-left">{p.label}</span>
              {filters.datePreset === p.value && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Folder filter */}
      {folders.length > 0 && (
        <FilterDropdown icon={<Folder className="h-3.5 w-3.5" />} label="Dossier" count={filters.folderIds.size + (filters.noFolder ? 1 : 0)}>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            <button
              onClick={() => onFiltersChange({ ...filters, noFolder: !filters.noFolder })}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                filters.noFolder ? "bg-accent" : "hover:bg-muted"
              )}
            >
              <span className="flex-1 text-left italic text-muted-foreground">Sans dossier</span>
              {filters.noFolder && <span className="text-primary text-xs">✓</span>}
            </button>
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => onFiltersChange({ ...filters, folderIds: toggleSet(filters.folderIds, f.id) })}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors",
                  filters.folderIds.has(f.id) ? "bg-accent" : "hover:bg-muted"
                )}
              >
                <Folder className="h-3 w-3 flex-shrink-0" style={{ color: f.color }} />
                <span className="flex-1 text-left truncate">{f.name}</span>
                {filters.folderIds.has(f.id) && <span className="text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Reset */}
      {hasActiveFilters(filters) && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
          <X className="h-3 w-3" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
};

// ─── Active Filter Chips ─────────────────────────────────────────────
interface ActiveFilterChipsProps {
  filters: FilterState;
  tags: DiagramTag[];
  folders: DiagramFolder[];
  onFiltersChange: (filters: FilterState) => void;
}

const DATE_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois-ci',
  quarter: 'Ce trimestre',
};

export const ActiveFilterChips = ({ filters, tags, folders, onFiltersChange }: ActiveFilterChipsProps) => {
  if (!hasActiveFilters(filters)) return null;

  const chips: { key: string; icon: React.ReactNode; label: string; onRemove: () => void }[] = [];

  // Tag chips
  filters.tagIds.forEach(id => {
    const tag = tags.find(t => t.id === id);
    if (tag) {
      chips.push({
        key: `tag-${id}`,
        icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />,
        label: tag.name,
        onRemove: () => {
          const next = new Set(filters.tagIds);
          next.delete(id);
          onFiltersChange({ ...filters, tagIds: next });
        },
      });
    }
  });

  // Creator chips
  filters.createdBy.forEach(name => {
    chips.push({
      key: `creator-${name}`,
      icon: <User className="h-3 w-3" />,
      label: name,
      onRemove: () => {
        const next = new Set(filters.createdBy);
        next.delete(name);
        onFiltersChange({ ...filters, createdBy: next });
      },
    });
  });

  // Date chip
  if (filters.datePreset) {
    chips.push({
      key: 'date',
      icon: <Calendar className="h-3 w-3" />,
      label: DATE_LABELS[filters.datePreset] || '',
      onRemove: () => onFiltersChange({ ...filters, datePreset: null }),
    });
  }

  // Folder chips
  filters.folderIds.forEach(id => {
    const folder = folders.find(f => f.id === id);
    if (folder) {
      chips.push({
        key: `folder-${id}`,
        icon: <Folder className="h-3 w-3" style={{ color: folder.color }} />,
        label: folder.name,
        onRemove: () => {
          const next = new Set(filters.folderIds);
          next.delete(id);
          onFiltersChange({ ...filters, folderIds: next });
        },
      });
    }
  });

  if (filters.noFolder) {
    chips.push({
      key: 'no-folder',
      icon: <Folder className="h-3 w-3 text-muted-foreground" />,
      label: 'Sans dossier',
      onRemove: () => onFiltersChange({ ...filters, noFolder: false }),
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map(chip => (
        <Badge key={chip.key} variant="secondary" className="gap-1.5 text-xs px-2 py-0.5 h-6">
          {chip.icon}
          {chip.label}
          <button onClick={chip.onRemove} className="ml-0.5 hover:bg-foreground/10 rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
};
