import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Clock,
  Bell,
  MessageSquare,
  Calendar,
  Trash2,
  Settings,
  Loader2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFunilAutomacoesAdapter,
  useFunilAutomacaoMutationsAdapter,
  useFunilMensagemTemplatesAdapter,
  type FunilAutomacao,
} from '@/hooks/useFunilAutomacoesAdapter';
import type { FunilEtapa } from '@/types/funil';

interface AutomacaoConfigProps {
  etapa: FunilEtapa;
  etapas: FunilEtapa[];
  funilId: string;
}

type AutomacaoTipo = 'timeout' | 'alerta' | 'mensagem' | 'agendamento';

const AUTOMACAO_TIPOS: { value: AutomacaoTipo; label: string; icon: React.ReactNode; descricao: string }[] = [
  {
    value: 'timeout',
    label: 'Timeout',
    icon: <Clock className="h-4 w-4" />,
    descricao: 'Move o lead automaticamente após X dias',
  },
  {
    value: 'alerta',
    label: 'Alerta',
    icon: <Bell className="h-4 w-4" />,
    descricao: 'Exibe alerta visual quando lead está esfriando',
  },
  {
    value: 'mensagem',
    label: 'Mensagem',
    icon: <MessageSquare className="h-4 w-4" />,
    descricao: 'Envia mensagem WhatsApp ao entrar na etapa',
  },
  {
    value: 'agendamento',
    label: 'Agendamento',
    icon: <Calendar className="h-4 w-4" />,
    descricao: 'Move o lead quando agendamento é criado',
  },
];

export function AutomacaoConfig({ etapa, etapas, funilId }: AutomacaoConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomacao, setEditingAutomacao] = useState<FunilAutomacao | null>(null);
  const [deleteAutomacaoId, setDeleteAutomacaoId] = useState<string | null>(null);

  const { automacoes, isLoading } = useFunilAutomacoesAdapter(etapa.id);
  const { templates } = useFunilMensagemTemplatesAdapter(funilId);
  const { createAutomacao, updateAutomacao, deleteAutomacao, toggleAutomacao } =
    useFunilAutomacaoMutationsAdapter();
  const isCreating = createAutomacao.isPending;
  const isUpdating = updateAutomacao.isPending;
  const isDeleting = deleteAutomacao.isPending;

  // Form state
  const [formTipo, setFormTipo] = useState<AutomacaoTipo>('timeout');
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({});

  // Mapear trigger_type+acao_tipo do adapter para tipo visual do componente
  const adapterToFormTipo = (a: FunilAutomacao): AutomacaoTipo => {
    if (a.tipo_trigger === 'tempo' && a.acao_tipo === 'mover_etapa') return 'timeout';
    if (a.tipo_trigger === 'tempo' && a.acao_tipo === 'notificacao') return 'alerta';
    if (a.acao_tipo === 'mensagem') return 'mensagem';
    if (a.tipo_trigger === 'entrada' && a.acao_tipo === 'mover_etapa') return 'agendamento';
    return 'timeout';
  };

  const adapterToFormConfig = (a: FunilAutomacao): Record<string, unknown> => {
    const config: Record<string, unknown> = {};
    if (a.tempo_dias) config.dias = a.tempo_dias;
    if (a.etapa_destino_id) config.destino_etapa_id = a.etapa_destino_id;
    if (a.mensagem_template_id) config.template_id = a.mensagem_template_id;
    if (a.webhook_url) config.webhook_url = a.webhook_url;
    return config;
  };

  const handleOpenDialog = (automacao?: FunilAutomacao) => {
    if (automacao) {
      setEditingAutomacao(automacao);
      setFormTipo(adapterToFormTipo(automacao));
      setFormConfig(adapterToFormConfig(automacao));
    } else {
      setEditingAutomacao(null);
      setFormTipo('timeout');
      setFormConfig({});
    }
    setIsDialogOpen(true);
  };

  // Mapear form → adapter fields
  const formToAdapterData = () => {
    const tipoMap: Record<AutomacaoTipo, { tipo_trigger: FunilAutomacao['tipo_trigger']; acao_tipo: FunilAutomacao['acao_tipo'] }> = {
      timeout: { tipo_trigger: 'tempo', acao_tipo: 'mover_etapa' },
      alerta: { tipo_trigger: 'tempo', acao_tipo: 'notificacao' },
      mensagem: { tipo_trigger: 'entrada', acao_tipo: 'mensagem' },
      agendamento: { tipo_trigger: 'entrada', acao_tipo: 'mover_etapa' },
    };

    const mapped = tipoMap[formTipo];
    return {
      etapa_id: etapa.id,
      tipo_trigger: mapped.tipo_trigger,
      acao_tipo: mapped.acao_tipo,
      tempo_dias: formConfig.dias as number | undefined,
      etapa_destino_id: formConfig.destino_etapa_id as string | undefined,
      mensagem_template_id: formConfig.template_id as string | undefined,
      webhook_url: formConfig.webhook_url as string | undefined,
      is_active: true,
    };
  };

  const handleSave = async () => {
    try {
      const data = formToAdapterData();

      if (editingAutomacao) {
        await updateAutomacao.mutateAsync({ id: editingAutomacao.id, ...data });
      } else {
        await createAutomacao.mutateAsync(data);
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteAutomacaoId) return;

    try {
      await deleteAutomacao.mutateAsync(deleteAutomacaoId);
      setDeleteAutomacaoId(null);
    } catch (error) {
      console.error('Erro ao excluir automação:', error);
    }
  };

  const handleToggle = async (automacao: FunilAutomacao) => {
    try {
      await toggleAutomacao.mutateAsync({ id: automacao.id, is_active: !automacao.is_active });
    } catch (error) {
      console.error('Erro ao alternar automação:', error);
    }
  };

  const getAutomacaoIcon = (automacao: FunilAutomacao) => {
    const tipo = adapterToFormTipo(automacao);
    const found = AUTOMACAO_TIPOS.find((t) => t.value === tipo);
    return found?.icon || <Zap className="h-4 w-4" />;
  };

  const getAutomacaoLabel = (automacao: FunilAutomacao) => {
    const tipo = adapterToFormTipo(automacao);
    const found = AUTOMACAO_TIPOS.find((t) => t.value === tipo);
    return found?.label || tipo;
  };

  const getConfigSummary = (automacao: FunilAutomacao) => {
    const tipo = adapterToFormTipo(automacao);
    switch (tipo) {
      case 'timeout': {
        const destino = etapas.find((e) => e.id === automacao.etapa_destino_id);
        return `${automacao.tempo_dias || '?'} dias → ${destino?.nome || 'Etapa'}`;
      }
      case 'alerta':
        return `Após ${automacao.tempo_dias || '?'} dias`;
      case 'mensagem': {
        const template = templates.find((t) => t.id === automacao.mensagem_template_id);
        return template?.nome || 'Template';
      }
      case 'agendamento': {
        const etapaDestino = etapas.find((e) => e.id === automacao.etapa_destino_id);
        return `→ ${etapaDestino?.nome || 'Etapa'}`;
      }
      default:
        return automacao.acao_tipo;
    }
  };

  const outrasEtapas = etapas.filter((e) => e.id !== etapa.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Automações</CardTitle>
            <CardDescription>
              Configure ações automáticas para a etapa "{etapa.nome}"
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : automacoes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma automação configurada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {automacoes.map((automacao) => (
              <div
                key={automacao.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {getAutomacaoIcon(automacao)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {getAutomacaoLabel(automacao)}
                      </span>
                      {!automacao.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Desativada
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getConfigSummary(automacao)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={automacao.is_active}
                    onCheckedChange={() => handleToggle(automacao)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(automacao)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteAutomacaoId(automacao.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog de edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAutomacao ? 'Editar Automação' : 'Nova Automação'}
            </DialogTitle>
            <DialogDescription>
              Configure a automação para a etapa "{etapa.nome}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de automação */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formTipo}
                onValueChange={(value) => {
                  setFormTipo(value as AutomacaoTipo);
                  setFormConfig({});
                }}
                disabled={!!editingAutomacao}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMACAO_TIPOS.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        {tipo.icon}
                        <div>
                          <span>{tipo.label}</span>
                          <p className="text-xs text-muted-foreground">
                            {tipo.descricao}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Configuração específica por tipo */}
            {formTipo === 'timeout' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dias">Dias na etapa</Label>
                  <Input
                    id="dias"
                    type="number"
                    min="1"
                    value={(formConfig.dias as number) || ''}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, dias: parseInt(e.target.value) || '' })
                    }
                    placeholder="Ex: 7"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mover para</Label>
                  <Select
                    value={(formConfig.destino_etapa_id as string) || ''}
                    onValueChange={(value) =>
                      setFormConfig({ ...formConfig, destino_etapa_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {outrasEtapas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: e.cor }}
                            />
                            {e.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formTipo === 'alerta' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dias-alerta">Dias para alerta</Label>
                  <Input
                    id="dias-alerta"
                    type="number"
                    min="1"
                    value={(formConfig.dias as number) || ''}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, dias: parseInt(e.target.value) || '' })
                    }
                    placeholder="Ex: 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta visual aparece após X dias na etapa
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de alerta</Label>
                  <Select
                    value={(formConfig.tipo_alerta as string) || 'esfriando'}
                    onValueChange={(value) =>
                      setFormConfig({ ...formConfig, tipo_alerta: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esfriando">🔥 Lead esfriando</SelectItem>
                      <SelectItem value="urgente">🚨 Urgente</SelectItem>
                      <SelectItem value="atencao">⚠️ Atenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formTipo === 'mensagem' && (
              <>
                <div className="space-y-2">
                  <Label>Template de mensagem</Label>
                  <Select
                    value={(formConfig.template_id as string) || ''}
                    onValueChange={(value) =>
                      setFormConfig({ ...formConfig, template_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum template disponível
                        </div>
                      ) : (
                        templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    A mensagem será enviada via WhatsApp ao entrar na etapa
                  </p>
                </div>
              </>
            )}

            {formTipo === 'agendamento' && (
              <>
                <div className="space-y-2">
                  <Label>Ao criar agendamento, mover para</Label>
                  <Select
                    value={(formConfig.destino_etapa_id as string) || ''}
                    onValueChange={(value) =>
                      setFormConfig({ ...formConfig, destino_etapa_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {outrasEtapas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: e.cor }}
                            />
                            {e.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteAutomacaoId} onOpenChange={() => setDeleteAutomacaoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
