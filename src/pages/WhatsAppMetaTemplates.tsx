import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, RefreshCw, FileText, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useTenantContext } from '@/contexts/TenantContext';
import { useWhatsAppMetaTemplatesMT } from '@/hooks/multitenant/useWhatsAppMetaTemplatesMT';
import { useWhatsAppProvidersMT } from '@/hooks/multitenant/useWhatsAppProvidersMT';
import { MetaTemplateCard, MetaTemplateForm } from '@/components/whatsapp/hybrid';
import type { WhatsAppMetaTemplate, CreateMetaTemplateInput, TemplateCategory, TemplateApprovalStatus } from '@/types/whatsapp-hybrid';
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_STATUS_LABELS } from '@/types/whatsapp-hybrid';

export default function WhatsAppMetaTemplates() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TemplateApprovalStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMetaTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { templates, stats, isLoading, refetch, create, update, remove } = useWhatsAppMetaTemplatesMT({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    approval_status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { providers } = useWhatsAppProvidersMT();

  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  const filteredTemplates = useMemo(() =>
    templates.filter(t =>
      t.meta_template_name.toLowerCase().includes(search.toLowerCase()) ||
      t.body_text.toLowerCase().includes(search.toLowerCase())
    ),
    [templates, search]
  );

  const handleCreate = (data: CreateMetaTemplateInput) => {
    create.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdate = (data: CreateMetaTemplateInput) => {
    if (!editingTemplate) return;
    update.mutate({ id: editingTemplate.id, ...data }, {
      onSuccess: () => setEditingTemplate(null),
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    remove.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Templates Meta</h1>
            <p className="text-sm text-muted-foreground">
              Templates aprovados pelo Meta para WhatsApp Business
              {tenant && ` - ${tenant.nome_fantasia}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-[10px] text-muted-foreground">Aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-[10px] text-muted-foreground">Rejeitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as TemplateCategory | 'all')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TemplateApprovalStatus | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(TEMPLATE_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-40 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {templates.length === 0
                ? 'Crie seu primeiro template ou sincronize com a Meta'
                : 'Tente ajustar os filtros de busca'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(t => (
            <MetaTemplateCard
              key={t.id}
              template={t}
              onEdit={setEditingTemplate}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Template Meta</DialogTitle>
          </DialogHeader>
          <MetaTemplateForm
            providers={providers}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={create.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(v) => !v && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <MetaTemplateForm
              template={editingTemplate}
              providers={providers}
              onSubmit={handleUpdate}
              onCancel={() => setEditingTemplate(null)}
              isSubmitting={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template será removido do sistema. Esta ação não afeta o template na plataforma Meta.
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
