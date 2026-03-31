import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetCategoriesMT } from '@/hooks/multitenant/useAssetCategoriesMT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ArrowLeft, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { DEPRECIATION_METHOD_LABELS, DepreciationMethod, MTAssetCategory } from '@/types/patrimonio';

const COLORS = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

type CategoryForm = {
  codigo: string;
  nome: string;
  descricao?: string;
  cor?: string;
  depreciation_method?: DepreciationMethod;
  default_useful_life_years?: number;
  default_salvage_rate?: number;
};

const emptyForm: CategoryForm = {
  codigo: '',
  nome: '',
  cor: '#2196F3',
  depreciation_method: 'straight_line',
  default_useful_life_years: 5,
  default_salvage_rate: 10,
};

export default function PatrimonioCategorias() {
  const navigate = useNavigate();
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useAssetCategoriesMT();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (cat: MTAssetCategory) => {
    setEditingId(cat.id);
    setForm({
      codigo: cat.codigo,
      nome: cat.nome,
      descricao: cat.descricao || undefined,
      cor: cat.cor || '#2196F3',
      depreciation_method: cat.depreciation_method,
      default_useful_life_years: cat.default_useful_life_years || undefined,
      default_salvage_rate: cat.default_salvage_rate || undefined,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nome) return;
    if (editingId) {
      await updateCategory.mutateAsync({ id: editingId, ...form });
    } else {
      await createCategory.mutateAsync(form as Record<string, unknown>);
    }
    setShowDialog(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patrimonio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Categorias de Ativos</h1>
            <p className="text-muted-foreground">Gerencie categorias com padrões de depreciação</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">Cor</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Método Depreciação</TableHead>
                <TableHead>Vida Útil</TableHead>
                <TableHead>% Residual</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                categories.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: cat.cor || '#999' }} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{cat.codigo}</TableCell>
                    <TableCell className="font-medium">{cat.nome}</TableCell>
                    <TableCell className="text-sm">{DEPRECIATION_METHOD_LABELS[cat.depreciation_method]}</TableCell>
                    <TableCell className="text-sm">{cat.default_useful_life_years ? `${cat.default_useful_life_years} anos` : '-'}</TableCell>
                    <TableCell className="text-sm">{cat.default_salvage_rate != null ? `${cat.default_salvage_rate}%` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  placeholder="EQUIP"
                  value={form.codigo}
                  onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Equipamentos Gerais"
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da categoria..."
                value={form.descricao || ''}
                onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${form.cor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, cor: c }))}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Método de Depreciação Padrão</Label>
              <Select
                value={form.depreciation_method || 'straight_line'}
                onValueChange={(v) => setForm(f => ({ ...f, depreciation_method: v as DepreciationMethod }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPRECIATION_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vida Útil Padrão (anos)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.default_useful_life_years || ''}
                  onChange={(e) => setForm(f => ({ ...f, default_useful_life_years: parseInt(e.target.value) || undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label>% Valor Residual Padrão</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.default_salvage_rate ?? ''}
                  onChange={(e) => setForm(f => ({ ...f, default_salvage_rate: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.codigo || !form.nome}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Ativos com esta categoria não serão afetados, apenas a categoria será desativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
