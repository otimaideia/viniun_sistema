/**
 * PipelineTriggersConfig - Configuração de Pipeline Triggers por etapa
 *
 * Permite criar, editar, ativar/desativar e excluir triggers (automações)
 * vinculados a etapas do funil de vendas.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Plus,
  Trash2,
  Settings,
  Loader2,
  Zap,
  ArrowRightLeft,
  MessageSquare,
  Globe,
  Bell,
  Tag,
  UserCheck,
  LogIn,
  LogOut,
  Clock,
  Trophy,
  XCircle,
  Copy,
  AlertCircle,
} from 'lucide-react';
import {
  usePipelineTriggers,
  usePipelineTriggerMutations,
} from '@/hooks/usePipelineTriggers';
import { useFunilMensagemTemplatesAdapter } from '@/hooks/useFunilAutomacoesAdapter';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { PipelineTrigger, PipelineTriggerCreate } from '@/hooks/usePipelineTriggers';
import type { FunilEtapa } from '@/types/funil';

// =============================================================================
// CONSTANTES
// =============================================================================

interface TriggerTypeOption {
  value: PipelineTrigger['trigger_type'];
  label: string;
  icon: React.ReactNode;
  descricao: string;
}

const TRIGGER_TYPES: TriggerTypeOption[] = [
  { value: 'entrada', label: 'Ao entrar', icon: <LogIn className="h-4 w-4" />, descricao: 'Quando um lead entra nesta etapa' },
  { value: 'saida', label: 'Ao sair', icon: <LogOut className="h-4 w-4" />, descricao: 'Quando um lead sai desta etapa' },
  { value: 'tempo', label: 'Timeout', icon: <Clock className="h-4 w-4" />, descricao: 'Quando lead excede X dias na etapa' },
  { value: 'ganho', label: 'Ganho', icon: <Trophy className="h-4 w-4" />, descricao: 'Quando lead é marcado como ganho' },
  { value: 'perda', label: 'Perda', icon: <XCircle className="h-4 w-4" />, descricao: 'Quando lead é marcado como perdido' },
];

interface ActionTypeOption {
  value: PipelineTrigger['action_type'];
  label: string;
  icon: React.ReactNode;
  descricao: string;
}

const ACTION_TYPES: ActionTypeOption[] = [
  { value: 'mover_etapa', label: 'Mover Etapa', icon: <ArrowRightLeft className="h-4 w-4" />, descricao: 'Move o lead para outra etapa' },
  { value: 'mensagem', label: 'Enviar Mensagem', icon: <MessageSquare className="h-4 w-4" />, descricao: 'Envia mensagem WhatsApp' },
  { value: 'webhook', label: 'Webhook', icon: <Globe className="h-4 w-4" />, descricao: 'Envia dados para URL externa' },
  { value: 'notificacao', label: 'Notificação', icon: <Bell className="h-4 w-4" />, descricao: 'Cria notificação no sistema' },
  { value: 'adicionar_tag', label: 'Adicionar Tag', icon: <Tag className="h-4 w-4" />, descricao: 'Adiciona tags ao lead' },
  { value: 'atribuir_usuario', label: 'Atribuir Usuário', icon: <UserCheck className="h-4 w-4" />, descricao: 'Atribui responsável ao lead' },
];

// =============================================================================
// PROPS
// =============================================================================

interface PipelineTriggersConfigProps {
  etapa: FunilEtapa;
  etapas: FunilEtapa[];
  funilId: string;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PipelineTriggersConfig({ etapa, etapas, funilId }: PipelineTriggersConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<PipelineTrigger | null>(null);
  const [deleteTrigId, setDeleteTrigId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { tenant } = useTenantContext();
  const { triggers, isLoading } = usePipelineTriggers(etapa.id);
  const { templates } = useFunilMensagemTemplatesAdapter(funilId);
  const { createTrigger, updateTrigger, deleteTrigger, toggleTrigger } = usePipelineTriggerMutations();

  // Buscar usuários do tenant para dropdown de "Atribuir Usuário"
  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['mt-users-for-triggers', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_users')
        .select('id, nome, email')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Form state
  const [form, setForm] = useState<{
    nome: string;
    trigger_type: PipelineTrigger['trigger_type'];
    trigger_config: Record<string, any>;
    action_type: PipelineTrigger['action_type'];
    action_config: Record<string, any>;
    template_id: string | null;
  }>({
    nome: '',
    trigger_type: 'entrada',
    trigger_config: {},
    action_type: 'mover_etapa',
    action_config: {},
    template_id: null,
  });

  const handleOpenDialog = (trigger?: PipelineTrigger) => {
    if (trigger) {
      setEditingTrigger(trigger);
      setForm({
        nome: trigger.nome,
        trigger_type: trigger.trigger_type,
        trigger_config: trigger.trigger_config,
        action_type: trigger.action_type,
        action_config: trigger.action_config,
        template_id: trigger.template_id,
      });
    } else {
      setEditingTrigger(null);
      setForm({
        nome: '',
        trigger_type: 'entrada',
        trigger_config: {},
        action_type: 'mover_etapa',
        action_config: {},
        template_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar config por action_type
    if (form.action_type === 'mover_etapa' && !form.action_config.etapa_destino_id) {
      errors.action = 'Selecione a etapa destino';
    }
    if (form.action_type === 'webhook' && !form.action_config.webhook_url) {
      errors.action = 'Informe a URL do webhook';
    }
    if (form.action_type === 'webhook' && form.action_config.webhook_url) {
      try {
        const url = new URL(form.action_config.webhook_url);
        if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          errors.action = 'URL deve usar HTTPS';
        }
      } catch {
        errors.action = 'URL inválida';
      }
    }
    if (form.action_type === 'mensagem' && !form.action_config.mensagem_direta && !form.template_id) {
      errors.action = 'Informe uma mensagem ou selecione um template';
    }
    if (form.action_type === 'adicionar_tag' && (!form.action_config.tags || form.action_config.tags.length === 0)) {
      errors.action = 'Informe pelo menos uma tag';
    }
    if (form.action_type === 'atribuir_usuario' && !form.action_config.user_id) {
      errors.action = 'Selecione o usuário responsável';
    }
    if (form.trigger_type === 'tempo' && !form.trigger_config.tempo_dias) {
      errors.trigger = 'Informe o número de dias';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const nome = form.nome.trim() || `${getTriggerLabel(form.trigger_type)} → ${getActionLabel(form.action_type)}`;

      if (editingTrigger) {
        await updateTrigger.mutateAsync({
          id: editingTrigger.id,
          nome,
          trigger_type: form.trigger_type,
          trigger_config: form.trigger_config,
          action_type: form.action_type,
          action_config: form.action_config,
          template_id: form.template_id,
        });
      } else {
        await createTrigger.mutateAsync({
          etapa_id: etapa.id,
          nome,
          trigger_type: form.trigger_type,
          trigger_config: form.trigger_config,
          action_type: form.action_type,
          action_config: form.action_config,
          template_id: form.template_id,
        });
      }

      setIsDialogOpen(false);
      setFormErrors({});
    } catch (error) {
      console.error('Erro ao salvar trigger:', error);
    }
  };

  const handleDuplicate = (trigger: PipelineTrigger) => {
    setEditingTrigger(null);
    setForm({
      nome: `${trigger.nome} (cópia)`,
      trigger_type: trigger.trigger_type,
      trigger_config: { ...trigger.trigger_config },
      action_type: trigger.action_type,
      action_config: { ...trigger.action_config },
      template_id: trigger.template_id,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTrigId) return;
    try {
      await deleteTrigger.mutateAsync(deleteTrigId);
      setDeleteTrigId(null);
    } catch (error) {
      console.error('Erro ao excluir trigger:', error);
    }
  };

  const outrasEtapas = etapas.filter((e) => e.id !== etapa.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Pipeline Triggers
            </CardTitle>
            <CardDescription>
              Automações para a etapa "{etapa.nome}"
              {triggers.length > 0 && (
                <span className="ml-2">
                  ({triggers.filter(t => t.is_active).length} ativo{triggers.filter(t => t.is_active).length !== 1 ? 's' : ''} de {triggers.length})
                </span>
              )}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Trigger
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : triggers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum trigger configurado</p>
            <p className="text-xs mt-1">Crie triggers para automatizar ações nesta etapa</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1">
                      <div className="p-1.5 rounded bg-blue-500/10 text-blue-600">
                        {getTriggerIcon(trigger.trigger_type)}
                      </div>
                      <span className="text-muted-foreground text-xs">→</span>
                      <div className="p-1.5 rounded bg-amber-500/10 text-amber-600">
                        {getActionIcon(trigger.action_type)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{trigger.nome}</span>
                        {!trigger.is_active && (
                          <Badge variant="outline" className="text-xs shrink-0">Inativo</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getTriggerLabel(trigger.trigger_type)} → {getActionLabel(trigger.action_type)}
                        {trigger.action_type === 'mover_etapa' && trigger.action_config?.etapa_destino_id && (
                          <> ({etapas.find(e => e.id === trigger.action_config.etapa_destino_id)?.nome || '...'})</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={trigger.is_active}
                      onCheckedChange={(checked) =>
                        toggleTrigger.mutate({ id: trigger.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(trigger)}
                      title="Editar"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(trigger)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTrigId(trigger.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTrigger ? 'Editar Trigger' : 'Novo Pipeline Trigger'}
            </DialogTitle>
            <DialogDescription>
              Configure quando e o que acontece automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="trigger-nome">Nome</Label>
              <Input
                id="trigger-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Mover lead após 7 dias"
              />
            </div>

            {/* Quando (Trigger) */}
            <div className="space-y-2">
              <Label>Quando (Trigger)</Label>
              <Select
                value={form.trigger_type}
                onValueChange={(v) => setForm({ ...form, trigger_type: v as PipelineTrigger['trigger_type'], trigger_config: {} })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        {t.icon}
                        <div>
                          <span>{t.label}</span>
                          <p className="text-xs text-muted-foreground">{t.descricao}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Config do Trigger (para timeout) */}
            {form.trigger_type === 'tempo' && (
              <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                <Label htmlFor="dias-timeout">Dias na etapa</Label>
                <Input
                  id="dias-timeout"
                  type="number"
                  min="1"
                  value={form.trigger_config.tempo_dias || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      trigger_config: { ...form.trigger_config, tempo_dias: parseInt(e.target.value) || undefined },
                    })
                  }
                  placeholder="Ex: 7"
                />
              </div>
            )}

            {/* O que fazer (Ação) */}
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select
                value={form.action_type}
                onValueChange={(v) => setForm({ ...form, action_type: v as PipelineTrigger['action_type'], action_config: {}, template_id: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      <div className="flex items-center gap-2">
                        {a.icon}
                        <div>
                          <span>{a.label}</span>
                          <p className="text-xs text-muted-foreground">{a.descricao}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Config da Ação - Mover Etapa */}
            {form.action_type === 'mover_etapa' && (
              <div className="space-y-2 pl-4 border-l-2 border-amber-200">
                <Label>Mover para</Label>
                <Select
                  value={form.action_config.etapa_destino_id || ''}
                  onValueChange={(v) =>
                    setForm({ ...form, action_config: { ...form.action_config, etapa_destino_id: v } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {outrasEtapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.cor }} />
                          {e.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Config da Ação - Mensagem */}
            {form.action_type === 'mensagem' && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-200">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={form.template_id || ''}
                    onValueChange={(v) => setForm({ ...form, template_id: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum template. Crie um na aba Templates.
                        </div>
                      ) : (
                        templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg-direta">Ou mensagem direta</Label>
                  <Textarea
                    id="msg-direta"
                    value={form.action_config.mensagem_direta || ''}
                    onChange={(e) =>
                      setForm({ ...form, action_config: { ...form.action_config, mensagem_direta: e.target.value } })
                    }
                    placeholder="Olá {{nome}}, temos novidades..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {'{{nome}}'}, {'{{telefone}}'}, {'{{email}}'}, {'{{etapa}}'}, {'{{data}}'}
                  </p>
                </div>
              </div>
            )}

            {/* Config da Ação - Webhook */}
            {form.action_type === 'webhook' && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-200">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={form.action_config.webhook_url || ''}
                    onChange={(e) =>
                      setForm({ ...form, action_config: { ...form.action_config, webhook_url: e.target.value } })
                    }
                    placeholder="https://exemplo.com/webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-payload">Payload extra (JSON)</Label>
                  <Textarea
                    id="webhook-payload"
                    value={form.action_config.webhook_payload_str || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        action_config: {
                          ...form.action_config,
                          webhook_payload_str: e.target.value,
                          webhook_payload: tryParseJSON(e.target.value),
                        },
                      })
                    }
                    placeholder='{"campo": "valor"}'
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Config da Ação - Notificação */}
            {form.action_type === 'notificacao' && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-200">
                <div className="space-y-2">
                  <Label htmlFor="notif-titulo">Título</Label>
                  <Input
                    id="notif-titulo"
                    value={form.action_config.titulo || ''}
                    onChange={(e) =>
                      setForm({ ...form, action_config: { ...form.action_config, titulo: e.target.value } })
                    }
                    placeholder="Lead movido"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notif-msg">Mensagem</Label>
                  <Textarea
                    id="notif-msg"
                    value={form.action_config.mensagem || ''}
                    onChange={(e) =>
                      setForm({ ...form, action_config: { ...form.action_config, mensagem: e.target.value } })
                    }
                    placeholder="O lead entrou na etapa..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Config da Ação - Adicionar Tag */}
            {form.action_type === 'adicionar_tag' && (
              <div className="space-y-2 pl-4 border-l-2 border-amber-200">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={(form.action_config.tags || []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      action_config: {
                        ...form.action_config,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      },
                    })
                  }
                  placeholder="urgente, vip, follow-up"
                />
              </div>
            )}

            {/* Config da Ação - Atribuir Usuário */}
            {form.action_type === 'atribuir_usuario' && (
              <div className="space-y-2 pl-4 border-l-2 border-amber-200">
                <Label>Responsável</Label>
                <Select
                  value={form.action_config.user_id || ''}
                  onValueChange={(v) =>
                    setForm({ ...form, action_config: { ...form.action_config, user_id: v } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantUsers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum usuário encontrado
                      </div>
                    ) : (
                      tenantUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3" />
                            <span>{u.nome}</span>
                            <span className="text-xs text-muted-foreground">({u.email})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O lead será atribuído a este usuário automaticamente
                </p>
              </div>
            )}
          </div>

          {/* Erros de validação */}
          {Object.keys(formErrors).length > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{Object.values(formErrors)[0]}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setFormErrors({}); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createTrigger.isPending || updateTrigger.isPending}
            >
              {(createTrigger.isPending || updateTrigger.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTrigId} onOpenChange={() => setDeleteTrigId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              Este trigger será desativado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTrigger.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getTriggerLabel(type: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label || type;
}

function getTriggerIcon(type: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.icon || <Zap className="h-4 w-4" />;
}

function getActionLabel(type: string) {
  return ACTION_TYPES.find((a) => a.value === type)?.label || type;
}

function getActionIcon(type: string) {
  return ACTION_TYPES.find((a) => a.value === type)?.icon || <Zap className="h-4 w-4" />;
}

function tryParseJSON(str: string): Record<string, any> | undefined {
  if (!str?.trim()) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
}
