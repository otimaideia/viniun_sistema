import { useState } from 'react';
import {
  Zap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  MessageSquare,
  Tag,
  Globe,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleLayout } from '@/components/shared/index';
import { useQuickRepliesAdapter, QUICK_REPLY_CATEGORIES } from '@/hooks/useQuickRepliesAdapter';
import type { QuickReply, QuickReplyCreate } from '@/hooks/useQuickRepliesAdapter';
import { useWhatsAppSessionsAdapter } from '@/hooks/useWhatsAppSessionsAdapter';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Formulário de criação/edição
interface QuickReplyFormProps {
  initialData?: QuickReply;
  onSubmit: (data: QuickReplyCreate) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const QuickReplyForm: React.FC<QuickReplyFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [mensagem, setMensagem] = useState(initialData?.mensagem || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || '');
  const [atalho, setAtalho] = useState(initialData?.atalho || '');
  const [isGlobal, setIsGlobal] = useState(initialData?.is_global ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    await onSubmit({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      categoria: categoria || undefined,
      atalho: atalho.trim() || undefined,
      is_global: isGlobal,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Saudação inicial"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mensagem">Mensagem *</Label>
        <Textarea
          id="mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Digite a mensagem que será enviada..."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use [NOME], [DATA], [HORA] para variáveis dinâmicas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {QUICK_REPLY_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="atalho">Atalho</Label>
          <Input
            id="atalho"
            value={atalho}
            onChange={(e) => setAtalho(e.target.value)}
            placeholder="Ex: /ola"
          />
          <p className="text-xs text-muted-foreground">
            Digite no chat para usar rápido
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {isGlobal ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <Label htmlFor="global">Resposta Global</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {isGlobal
              ? 'Disponível para todas as sessões'
              : 'Apenas para a sessão atual'}
          </p>
        </div>
        <Switch
          id="global"
          checked={isGlobal}
          onCheckedChange={setIsGlobal}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Card de resposta rápida
interface QuickReplyCardProps {
  reply: QuickReply;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

const QuickReplyCard: React.FC<QuickReplyCardProps> = ({
  reply,
  onEdit,
  onDelete,
  onCopy,
}) => {
  const categoryLabel = QUICK_REPLY_CATEGORIES.find(c => c.value === reply.categoria)?.label || reply.categoria;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium truncate">{reply.titulo}</h3>
              {reply.is_global ? (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Global
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Sessão
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {reply.mensagem}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {categoryLabel && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {categoryLabel}
                </Badge>
              )}
              {reply.atalho && (
                <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                  {reply.atalho}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar mensagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default function WhatsAppRespostasRapidas() {
  const { isUnidade, unidadeId } = useUserProfileAdapter();
  const { sessions: sessoes } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);

  const [selectedSessao, setSelectedSessao] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [deletingReply, setDeletingReply] = useState<QuickReply | null>(null);

  const {
    quickReplies,
    groupedByCategory,
    isLoading,
    refetch,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    isCreating,
    isUpdating,
    isDeleting,
  } = useQuickRepliesAdapter(selectedSessao);

  // Filtrar respostas
  const filteredReplies = quickReplies.filter(reply => {
    const matchesSearch = search.trim() === '' ||
      reply.titulo.toLowerCase().includes(search.toLowerCase()) ||
      reply.mensagem.toLowerCase().includes(search.toLowerCase()) ||
      reply.atalho?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || reply.categoria === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Estatísticas
  const globalCount = quickReplies.filter(r => r.is_global).length;
  const sessionCount = quickReplies.filter(r => !r.is_global).length;

  const handleCreate = async (data: QuickReplyCreate) => {
    await createQuickReply.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: QuickReplyCreate) => {
    if (!editingReply) return;
    await updateQuickReply.mutateAsync({ id: editingReply.id, data });
    setEditingReply(null);
  };

  const handleDelete = async () => {
    if (!deletingReply) return;
    await deleteQuickReply.mutateAsync(deletingReply.id);
    setDeletingReply(null);
  };

  const handleCopy = (reply: QuickReply) => {
    navigator.clipboard.writeText(reply.mensagem);
    toast.success('Mensagem copiada!');
  };

  return (
    <ModuleLayout
      title="Respostas Rápidas"
      description="Gerencie mensagens pré-definidas para agilizar o atendimento"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Respostas Rápidas' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Resposta
          </Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickReplies.length}</p>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalCount}</p>
                <p className="text-sm text-muted-foreground">Respostas Globais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Lock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessionCount}</p>
                <p className="text-sm text-muted-foreground">Por Sessão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, mensagem ou atalho..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {QUICK_REPLY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sessoes.length > 0 && (
              <Select value={selectedSessao || 'all'} onValueChange={(v) => setSelectedSessao(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sessão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as sessões</SelectItem>
                  {sessoes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome || s.session_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de respostas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma resposta encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Tente ajustar os filtros de busca' : 'Crie sua primeira resposta rápida'}
            </p>
            {!search && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Resposta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReplies.map((reply) => (
            <QuickReplyCard
              key={reply.id}
              reply={reply}
              onEdit={() => setEditingReply(reply)}
              onDelete={() => setDeletingReply(reply)}
              onCopy={() => handleCopy(reply)}
            />
          ))}
        </div>
      )}

      {/* Dialog de criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Resposta Rápida</DialogTitle>
            <DialogDescription>
              Crie uma mensagem pré-definida para usar no atendimento
            </DialogDescription>
          </DialogHeader>
          <QuickReplyForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de edição */}
      <Dialog open={!!editingReply} onOpenChange={() => setEditingReply(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Resposta Rápida</DialogTitle>
            <DialogDescription>
              Atualize os dados da resposta rápida
            </DialogDescription>
          </DialogHeader>
          {editingReply && (
            <QuickReplyForm
              initialData={editingReply}
              onSubmit={handleUpdate}
              onCancel={() => setEditingReply(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <AlertDialog open={!!deletingReply} onOpenChange={() => setDeletingReply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Resposta Rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingReply?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
