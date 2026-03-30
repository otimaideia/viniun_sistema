import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, RefreshCw, Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useWhatsAppRoutingRulesMT } from '@/hooks/multitenant/useWhatsAppRoutingRulesMT';
import { RoutingRuleCard, RoutingRuleForm } from '@/components/whatsapp/hybrid';
import type { WhatsAppRoutingRule, CreateRoutingRuleInput } from '@/types/whatsapp-hybrid';

export default function WhatsAppRouting() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const { rules, isLoading, refetch, create, update, remove, toggleActive, reorder } = useWhatsAppRoutingRulesMT();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<WhatsAppRoutingRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  const handleCreate = (data: CreateRoutingRuleInput) => {
    create.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdate = (data: CreateRoutingRuleInput) => {
    if (!editingRule) return;
    update.mutate({ id: editingRule.id, ...data }, {
      onSuccess: () => setEditingRule(null),
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
            <h1 className="text-2xl font-bold">Regras de Roteamento</h1>
            <p className="text-sm text-muted-foreground">
              Configure quando usar WAHA ou Meta Cloud API
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
              Nova Regra
            </Button>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Route className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700">Como funciona o roteamento?</p>
              <p className="text-blue-600 mt-1">
                As regras são avaliadas por ordem de prioridade (menor número = maior prioridade).
                A primeira regra que corresponder à condição define qual provider será usado.
                Se nenhuma regra aplicar, o provider padrão é utilizado (geralmente WAHA por ser gratuito).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">Nenhuma regra configurada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              O sistema usará WAHA como padrão (gratuito). Crie regras para usar Meta Cloud API quando necessário.
            </p>
            {isAdmin && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira regra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <RoutingRuleCard
              key={rule.id}
              rule={rule}
              index={index}
              onEdit={setEditingRule}
              onToggle={(id, v) => toggleActive.mutate({ id, is_active: v })}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Regra de Roteamento</DialogTitle>
          </DialogHeader>
          <RoutingRuleForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={create.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(v) => !v && setEditingRule(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Regra</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <RoutingRuleForm
              rule={editingRule}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRule(null)}
              isSubmitting={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover regra?</AlertDialogTitle>
            <AlertDialogDescription>
              A regra será removida permanentemente. As mensagens passarão a usar a próxima regra ou o provider padrão.
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
