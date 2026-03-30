import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFinancialCategoriesMT } from '@/hooks/multitenant/useFinanceiroMT';
import type { TransactionType, FinancialCategory, FinancialCategoryCreate } from '@/types/financeiro';
import { toast } from 'sonner';

export default function Categorias() {
  const { categories, categoryTree, isLoading, createCategory, updateCategory, deleteCategory } = useFinancialCategoriesMT();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FinancialCategoryCreate>({
    nome: '',
    tipo: 'despesa',
    codigo: '',
    descricao: '',
    parent_id: undefined,
    ordem: 0,
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const receitaTree = categoryTree.filter((c) => c.tipo === 'receita');
  const despesaTree = categoryTree.filter((c) => c.tipo === 'despesa');

  const openNew = (tipo: TransactionType, parentId?: string) => {
    setEditingId(null);
    setForm({ nome: '', tipo, codigo: '', descricao: '', parent_id: parentId, ordem: 0 });
    setDialogOpen(true);
  };

  const openEdit = (cat: FinancialCategory) => {
    setEditingId(cat.id);
    setForm({
      nome: cat.nome,
      tipo: cat.tipo,
      codigo: cat.codigo || '',
      descricao: cat.descricao || '',
      parent_id: cat.parent_id || undefined,
      ordem: cat.ordem,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) {
      toast.error('Informe o nome da categoria');
      return;
    }
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await createCategory(form);
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const renderCategory = (cat: FinancialCategory, level: number = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expanded[cat.id] ?? false;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg group`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-2">
            {/* Expand/collapse toggle or indent placeholder */}
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(cat.id)}
                className="flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="inline-block w-5" />
            )}
            {/* Connecting line dot for child items */}
            {level > 0 && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 -ml-1 mr-0.5" />
            )}
            {cat.codigo && <span className="text-xs text-muted-foreground font-mono">{cat.codigo}</span>}
            <span className={`font-medium text-sm ${level === 0 ? '' : 'text-muted-foreground'}`}>{cat.nome}</span>
            {hasChildren && !isExpanded && (
              <span className="text-xs text-muted-foreground/60">({cat.children!.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNew(cat.tipo, cat.id)} title="Adicionar subcategoria">
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso ira remover "{cat.nome}"{hasChildren ? ` e suas ${cat.children!.length} subcategorias` : ''}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteCategory(cat.id)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {/* Children - only render when expanded */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Vertical connecting line */}
            <div
              className="absolute top-0 bottom-2 border-l border-muted-foreground/15"
              style={{ left: `${level * 24 + 22}px` }}
            />
            {cat.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, tree: FinancialCategory[], tipo: TransactionType, color: string) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="secondary" className={color}>{title}</Badge>
            <span className="text-sm text-muted-foreground font-normal">({tree.length} categorias)</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => openNew(tipo)}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada</p>
        ) : (
          <div className="divide-y">{tree.map((cat) => renderCategory(cat))}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Categorias</span>
          </div>
          <h1 className="text-2xl font-bold">Categorias Financeiras</h1>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderSection('Receitas', receitaTree, 'receita', 'bg-green-100 text-green-800')}
          {renderSection('Despesas', despesaTree, 'despesa', 'bg-red-100 text-red-800')}
        </div>
      )}

      {/* Dialog for Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TransactionType }))} disabled={!!editingId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cat-codigo">Codigo</Label>
              <Input id="cat-codigo" value={form.codigo || ''} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ex: 1.1.01" />
            </div>
            <div>
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input id="cat-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome da categoria" />
            </div>
            <div>
              <Label>Categoria Pai</Label>
              <Select value={form.parent_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === 'none' ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {categories.filter((c) => c.tipo === form.tipo && !c.parent_id && c.id !== editingId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cat-descricao">Descricao</Label>
              <Input id="cat-descricao" value={form.descricao || ''} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descricao opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
