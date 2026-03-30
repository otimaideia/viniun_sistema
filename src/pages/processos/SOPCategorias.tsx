import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSelector } from '@/components/multitenant/TenantSelector';
import { useSOPCategoriesMT } from '@/hooks/multitenant/useSOPCategoriesMT';
import type { MTSOPCategory } from '@/types/sop';

const CORES_DISPONIVEIS = [
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Verde', value: '#22C55E' },
  { label: 'Roxo', value: '#A855F7' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Laranja', value: '#F97316' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Amarelo', value: '#EAB308' },
  { label: 'Ciano', value: '#06B6D4' },
  { label: 'Cinza', value: '#6B7280' },
];

const ICONES_DISPONIVEIS = [
  'FolderOpen', 'FileText', 'ClipboardList', 'BookOpen', 'Settings',
  'Shield', 'Heart', 'Star', 'Zap', 'Target', 'Users', 'Briefcase',
  'Package', 'Truck', 'Wrench', 'AlertTriangle', 'CheckCircle', 'Award',
];

interface CategoryFormData {
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  parent_id: string | null;
}

const emptyForm: CategoryFormData = {
  nome: '',
  descricao: '',
  icone: 'FolderOpen',
  cor: '#3B82F6',
  parent_id: null,
};

export default function SOPCategorias() {
  const { accessLevel } = useTenantContext();
  const { categories, categoryTree, isLoading, create, update, remove } = useSOPCategoriesMT();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: string) => {
    setEditingId(null);
    setForm({ ...emptyForm, parent_id: parentId || null });
    setDialogOpen(true);
  };

  const openEdit = (cat: MTSOPCategory) => {
    setEditingId(cat.id);
    setForm({
      nome: cat.nome,
      descricao: cat.descricao || '',
      icone: cat.icone || 'FolderOpen',
      cor: cat.cor || '#3B82F6',
      parent_id: cat.parent_id,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      icone: form.icone || null,
      cor: form.cor || null,
      parent_id: form.parent_id || null,
      ordem: editingId ? undefined : categories.length + 1,
    };

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      // toast handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    await remove.mutateAsync(id);
  };

  // Exclude self and descendants when editing to prevent circular parent refs
  const getParentOptions = (): MTSOPCategory[] => {
    if (!editingId) return categories;
    const excludeIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      excludeIds.add(parentId);
      categories
        .filter((c) => c.parent_id === parentId)
        .forEach((c) => collectDescendants(c.id));
    };
    collectDescendants(editingId);
    return categories.filter((c) => !excludeIds.has(c.id));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {accessLevel === 'platform' && <TenantSelector variant="dropdown" />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/processos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderTree className="h-6 w-6" />
              Categorias de POPs
            </h1>
            <p className="text-muted-foreground mt-1">
              Organize seus procedimentos em categorias hierárquicas
            </p>
          </div>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Árvore de Categorias
            {categories.length > 0 && (
              <Badge variant="secondary">{categories.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
              <p className="text-sm mt-1">
                Crie categorias para organizar seus procedimentos
              </p>
              <Button className="mt-4" variant="outline" onClick={() => openCreate()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira categoria
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {categoryTree.map((cat) => (
                <CategoryNode
                  key={cat.id}
                  category={cat}
                  level={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddChild={(parentId) => openCreate(parentId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input
                id="cat-nome"
                placeholder="Nome da categoria"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descrição</Label>
              <Textarea
                id="cat-desc"
                placeholder="Descrição breve da categoria"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select
                  value={form.icone}
                  onValueChange={(v) => setForm((f) => ({ ...f, icone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONES_DISPONIVEIS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={form.cor}
                  onValueChange={(v) => setForm((f) => ({ ...f, cor: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORES_DISPONIVEIS.map((cor) => (
                      <SelectItem key={cor.value} value={cor.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cor.value }}
                          />
                          {cor.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria Pai</Label>
              <Select
                value={form.parent_id || '__none__'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, parent_id: v === '__none__' ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (raiz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma (raiz)</SelectItem>
                  {getParentOptions().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={!form.nome.trim() || create.isPending || update.isPending}
            >
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tree Node ────────────────────────────────────────────────────

interface CategoryNodeProps {
  category: MTSOPCategory;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (cat: MTSOPCategory) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function CategoryNode({
  category,
  level,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryNodeProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expanded.has(category.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 group transition-colors"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/collapse */}
        <button
          className="w-5 h-5 flex items-center justify-center shrink-0"
          onClick={() => hasChildren && onToggle(category.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: category.cor || '#6B7280' }}
        />

        {/* Name and description */}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{category.nome}</span>
          {category.descricao && (
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              — {category.descricao}
            </span>
          )}
        </div>

        {/* Icon badge */}
        {category.icone && (
          <Badge variant="outline" className="text-xs hidden md:inline-flex">
            {category.icone}
          </Badge>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddChild(category.id)}
            title="Adicionar subcategoria"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(category)}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a categoria "{category.nome}"?
                  {hasChildren && (
                    <span className="block mt-2 font-medium text-destructive">
                      Esta categoria possui subcategorias que ficarão órfãs.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(category.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
