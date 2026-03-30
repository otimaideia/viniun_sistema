import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bookmark,
  Star,
  Trash2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useSavedFilters, type SavedFilter } from '@/hooks/useSavedFilters';
import { toast } from 'sonner';

interface SavedFiltersDropdownProps {
  context: string;
  currentFilters: Record<string, any>;
  onLoadFilter: (filters: Record<string, any>) => void;
}

export function SavedFiltersDropdown({
  context,
  currentFilters,
  onLoadFilter,
}: SavedFiltersDropdownProps) {
  const { savedFilters, saveFilter, deleteFilter, setDefault } = useSavedFilters(context);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterIsDefault, setNewFilterIsDefault] = useState(false);

  const hasActiveFilters = Object.values(currentFilters).some(v =>
    v !== undefined && v !== '' && v !== null && (!Array.isArray(v) || v.length > 0)
  );

  const handleSave = () => {
    if (!newFilterName.trim()) {
      toast.error('Digite um nome para o filtro');
      return;
    }

    saveFilter(newFilterName.trim(), currentFilters, newFilterIsDefault);
    toast.success(`Filtro "${newFilterName}" salvo`);
    setNewFilterName('');
    setNewFilterIsDefault(false);
    setIsSaveDialogOpen(false);
  };

  const handleLoad = (filter: SavedFilter) => {
    onLoadFilter(filter.filters);
    toast.success(`Filtro "${filter.name}" aplicado`);
  };

  const handleDelete = (e: React.MouseEvent, filter: SavedFilter) => {
    e.stopPropagation();
    deleteFilter(filter.id);
    toast.success(`Filtro "${filter.name}" removido`);
  };

  const handleToggleDefault = (e: React.MouseEvent, filter: SavedFilter) => {
    e.stopPropagation();
    setDefault(filter.isDefault ? null : filter.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Bookmark className="h-4 w-4" />
            Filtros
            {savedFilters.length > 0 && (
              <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                {savedFilters.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {savedFilters.length > 0 ? (
            <>
              {savedFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleLoad(filter)}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={(e) => handleToggleDefault(e, filter)}
                      className="shrink-0"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          filter.isDefault
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                    <span className="truncate">{filter.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, filter)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              Nenhum filtro salvo
            </div>
          )}

          <DropdownMenuItem
            onClick={() => setIsSaveDialogOpen(true)}
            disabled={!hasActiveFilters}
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar filtro atual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para salvar filtro */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Filtro</DialogTitle>
            <DialogDescription>
              Salve a combinacao atual de filtros para reutilizar depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nome do filtro</Label>
              <Input
                id="filter-name"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                placeholder="Ex: Leads quentes SP"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-default"
                checked={newFilterIsDefault}
                onCheckedChange={(checked) => setNewFilterIsDefault(checked === true)}
              />
              <Label htmlFor="filter-default" className="text-sm font-normal cursor-pointer">
                Definir como filtro padrao (carrega automaticamente)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
