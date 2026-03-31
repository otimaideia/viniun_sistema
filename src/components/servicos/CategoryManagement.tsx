import { useState } from 'react';
import { useServiceCategoriesMT, MTServiceCategory, MTServiceCategoryCreate, CategoryTipo } from '@/hooks/multitenant/useServiceCategoriesMT';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings2, Plus, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';

// -----------------------------------------------------------------------------
// Slugify helper
// -----------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

// -----------------------------------------------------------------------------
// Category Form Dialog
// -----------------------------------------------------------------------------

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: MTServiceCategory | null;
  onSave: (data: MTServiceCategoryCreate) => void;
  isSaving: boolean;
}

function CategoryFormDialog({ open, onOpenChange, category, onSave, isSaving }: CategoryFormProps) {
  const isEditing = !!category;
  const [formData, setFormData] = useState<MTServiceCategoryCreate>({
    codigo: category?.codigo || '',
    nome: category?.nome || '',
    descricao: category?.descricao || '',
    tipo: category?.tipo || 'ambos',
    icone: category?.icone || '',
    cor: category?.cor || '#6366f1',
    ordem: category?.ordem || 0,
    is_active: category?.is_active ?? true,
  });

  const handleNomeChange = (nome: string) => {
    setFormData(prev => ({
      ...prev,
      nome,
      // Auto-gerar codigo se ainda não editou manualmente
      ...(!isEditing && !prev.codigo || slugify(prev.nome) === prev.codigo
        ? { codigo: slugify(nome) }
        : {}),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.codigo.trim()) return;
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input
                id="cat-nome"
                value={formData.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Serviços Premium"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-codigo">Código</Label>
              <Input
                id="cat-codigo"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: slugify(e.target.value) }))}
                placeholder="servicos_premium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-descricao">Descrição</Label>
            <Textarea
              id="cat-descricao"
              value={formData.descricao || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição opcional da categoria"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as CategoryTipo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Ambos</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-cor">Cor</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.cor || '#6366f1'}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <Input
                  value={formData.cor || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-ordem">Ordem</Label>
              <Input
                id="cat-ordem"
                type="number"
                min="0"
                value={formData.ordem}
                onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !formData.nome.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

interface CategoryManagementProps {
  trigger?: React.ReactNode;
}

export function CategoryManagement({ trigger }: CategoryManagementProps) {
  const { allCategories, isLoading, create, update, remove } = useServiceCategoriesMT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MTServiceCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MTServiceCategory | null>(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEdit = (cat: MTServiceCategory) => {
    setEditingCategory(cat);
    setFormOpen(true);
  };

  const handleSave = (data: MTServiceCategoryCreate) => {
    if (editingCategory) {
      update.mutate({ id: editingCategory.id, ...data }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      create.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const tipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'servico': return 'Serviço';
      case 'produto': return 'Produto';
      case 'ambos': return 'Ambos';
      default: return tipo;
    }
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Gerenciar Categorias
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Categorias de Serviços / Produtos</SheetTitle>
            <SheetDescription>
              Gerencie as categorias disponíveis para classificar serviços e produtos.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button onClick={handleCreate} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma categoria cadastrada.
              </p>
            ) : (
              <div className="space-y-2">
                {allCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      cat.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                    <div
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: cat.cor || '#6366f1' }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{cat.nome}</span>
                        {!cat.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{cat.codigo}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{tipoLabel(cat.tipo)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSave={handleSave}
        isSaving={create.isPending || update.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleteTarget?.nome}" será removida. Serviços que já usam esta categoria
              manterão o valor atual, mas a categoria não aparecerá mais nas opções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
