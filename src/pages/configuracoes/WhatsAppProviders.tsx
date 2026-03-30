import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Settings, ArrowLeft, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useWhatsAppProvidersMT } from '@/hooks/multitenant/useWhatsAppProvidersMT';
import { ProviderCard, ProviderConfigForm } from '@/components/whatsapp/hybrid';
import type { WhatsAppProvider, CreateProviderInput } from '@/types/whatsapp-hybrid';

export default function WhatsAppProviders() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const {
    providers,
    wahaProviders,
    metaProviders,
    isLoading,
    refetch,
    create,
    update,
    remove,
    toggleActive,
    setDefault,
  } = useWhatsAppProvidersMT();

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<WhatsAppProvider | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  const filteredProviders = providers.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.phone_number.includes(search)
  );

  const handleCreate = (data: CreateProviderInput) => {
    create.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdate = (data: CreateProviderInput) => {
    if (!editingProvider) return;
    update.mutate({ id: editingProvider.id, ...data }, {
      onSuccess: () => setEditingProvider(null),
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Providers WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie WAHA e Meta Cloud API
              {tenant && ` - ${tenant.nome_fantasia}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Provider
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{providers.length}</p>
            <p className="text-xs text-muted-foreground">Total Providers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{wahaProviders.length}</p>
            <p className="text-xs text-muted-foreground">WAHA (Gratuito)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{metaProviders.length}</p>
            <p className="text-xs text-muted-foreground">Meta Cloud API</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs by type */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({filteredProviders.length})</TabsTrigger>
          <TabsTrigger value="waha">WAHA ({wahaProviders.length})</TabsTrigger>
          <TabsTrigger value="meta">Meta API ({metaProviders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ProviderGrid
            providers={filteredProviders}
            isLoading={isLoading}
            isAdmin={isAdmin}
            onEdit={setEditingProvider}
            onToggleActive={(id, v) => toggleActive.mutate({ id, is_active: v })}
            onSetDefault={(id: string) => setDefault.mutate(id)}
            onDelete={setDeletingId}
          />
        </TabsContent>

        <TabsContent value="waha" className="mt-4">
          <ProviderGrid
            providers={wahaProviders.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()))}
            isLoading={isLoading}
            isAdmin={isAdmin}
            onEdit={setEditingProvider}
            onToggleActive={(id, v) => toggleActive.mutate({ id, is_active: v })}
            onSetDefault={(id: string) => setDefault.mutate(id)}
            onDelete={setDeletingId}
          />
        </TabsContent>

        <TabsContent value="meta" className="mt-4">
          <ProviderGrid
            providers={metaProviders.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()))}
            isLoading={isLoading}
            isAdmin={isAdmin}
            onEdit={setEditingProvider}
            onToggleActive={(id, v) => toggleActive.mutate({ id, is_active: v })}
            onSetDefault={(id: string) => setDefault.mutate(id)}
            onDelete={setDeletingId}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Provider</DialogTitle>
          </DialogHeader>
          <ProviderConfigForm
            providers={providers}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={create.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProvider} onOpenChange={(v) => !v && setEditingProvider(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Provider</DialogTitle>
          </DialogHeader>
          {editingProvider && (
            <ProviderConfigForm
              provider={editingProvider}
              providers={providers}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProvider(null)}
              isSubmitting={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O provider será desativado permanentemente.
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

function ProviderGrid({
  providers,
  isLoading,
  isAdmin,
  onEdit,
  onToggleActive,
  onSetDefault,
  onDelete,
}: {
  providers: WhatsAppProvider[];
  isLoading: boolean;
  isAdmin: boolean;
  onEdit: (p: WhatsAppProvider) => void;
  onToggleActive: (id: string, v: boolean) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-32 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-1">Nenhum provider configurado</h3>
          <p className="text-sm text-muted-foreground">
            Adicione um provider WAHA ou Meta Cloud API para começar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map(p => (
        <ProviderCard
          key={p.id}
          provider={p}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onSetDefault={onSetDefault}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
