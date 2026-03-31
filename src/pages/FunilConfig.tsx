import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  ArrowLeft,
  Plus,
  Settings,
  Trash2,
  GripVertical,
  Save,
  Trophy,
  XCircle,
  Loader2,
  Palette,
  Zap,
  MessageSquare,
  Layers,
  Activity,
  Shield,
  Star,
  Building2,
  Users,
  UserCheck,
  Phone,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFunilAdapter, useFunilMutationsAdapter } from '@/hooks/useFunisAdapter';
import { useFunilEtapasAdapter, useFunilEtapasMutationsAdapter } from '@/hooks/useFunilEtapasAdapter';
import { ETAPA_CORES, ETAPA_ICONES, ETAPAS_PADRAO } from '@/types/funil';
import type { FunilEtapa } from '@/types/funil';
import { AutomacaoConfig, MensagemTemplateEditor, PipelineTriggersConfig, TriggerExecutionLog } from '@/components/funil';
import { useFunnelRoleAccessMT, useFunnelUserAccessMT, type FunnelRoleAccess } from '@/hooks/multitenant/useFunnelAccessMT';
import { useFranchiseDefaultFunnelMT } from '@/hooks/multitenant/useFranchiseDefaultFunnelMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { useCadenciaConfig } from '@/hooks/multitenant/useCadenciaMT';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/multitenant/useDepartments';
import { useTeams } from '@/hooks/multitenant/useTeams';
import { useUsers } from '@/hooks/useUsers';

// =============================================================================
// Componente: Automações Globais (on/off por funil)
// =============================================================================
interface AutomationConfig {
  id: string;
  auto_lead_to_cadencia: boolean;
  auto_assign_responsible: boolean;
  auto_start_cadencia: boolean;
  auto_detect_response: boolean;
  auto_move_on_appointment: boolean;
  auto_move_on_checkin: boolean;
  auto_move_on_sale: boolean;
  auto_move_on_payment: boolean;
  auto_move_on_cadencia_esgotada: boolean;
}

const AUTOMATION_LABELS: { key: keyof Omit<AutomationConfig, 'id'>; label: string; description: string; icon: string }[] = [
  { key: 'auto_lead_to_cadencia', label: 'Lead → Cadência Ativa', description: 'Novos leads entram direto na etapa "Cadência Ativa" (em vez de "Lead Novo")', icon: '🔥' },
  { key: 'auto_assign_responsible', label: 'Atribuir Responsável (Round Robin)', description: 'Atribui automaticamente um responsável ao lead novo via Round Robin', icon: '👤' },
  { key: 'auto_start_cadencia', label: 'Iniciar Cadência Automática', description: 'Ao mover para "Cadência Ativa", inicia a sequência de tentativas de contato', icon: '📞' },
  { key: 'auto_detect_response', label: 'Detectar Resposta WhatsApp', description: 'Ao receber mensagem do lead no WhatsApp, move para "Interessada"', icon: '💬' },
  { key: 'auto_move_on_appointment', label: 'Agendamento → Avaliação', description: 'Ao criar agendamento para o lead, move para "Avaliação Agendada"', icon: '📅' },
  { key: 'auto_move_on_checkin', label: 'Check-in → Compareceu', description: 'Ao fazer check-in (status em_atendimento), move para "Compareceu"', icon: '🏪' },
  { key: 'auto_move_on_sale', label: 'Venda Criada → Fechamento', description: 'Ao criar venda/orçamento para o lead, move para "Fechamento"', icon: '💳' },
  { key: 'auto_move_on_payment', label: 'Pagamento → Cliente', description: 'Ao pagar/aprovar venda, move para "✅ Cliente"', icon: '✅' },
  { key: 'auto_move_on_cadencia_esgotada', label: 'Cadência Esgotada → Perdido', description: 'Após esgotar todas as tentativas sem resposta, move para "Perdido"', icon: '❌' },
];

function AutomacoesGlobaisTab({ funilId }: { funilId: string }) {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('mt_funnel_automation_config' as never)
        .select('*')
        .eq('funnel_id', funilId)
        .single();
      if (data) setConfig(data as AutomationConfig);
      setIsLoading(false);
    })();
  }, [funilId]);

  const handleToggle = async (key: keyof Omit<AutomationConfig, 'id'>) => {
    if (!config) return;
    const newValue = !config[key];
    setConfig({ ...config, [key]: newValue });
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mt_funnel_automation_config' as never)
        .update({ [key]: newValue, updated_at: new Date().toISOString() })
        .eq('funnel_id', funilId);
      if (error) throw error;
      toast.success(`${newValue ? 'Ativado' : 'Desativado'}: ${AUTOMATION_LABELS.find(l => l.key === key)?.label}`);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setConfig({ ...config, [key]: !newValue }); // rollback
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!config) return <div className="text-center text-muted-foreground py-8">Configuração não encontrada para este funil</div>;

  const totalAtivas = AUTOMATION_LABELS.filter(l => config[l.key]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Automações do Pipeline
        </CardTitle>
        <CardDescription>
          Ative ou desative cada automação individualmente. {totalAtivas}/{AUTOMATION_LABELS.length} ativas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {AUTOMATION_LABELS.map((item) => (
          <div
            key={item.key}
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-colors',
              config[item.key] ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{item.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <Switch
              checked={config[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              disabled={isSaving}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Componente da aba Cadência (editável)
function CadenciaTabContent({ funilId, etapas }: { funilId: string; etapas: FunilEtapa[] }) {
  const { configs, isLoading } = useCadenciaConfig(funilId);
  const config = configs[0];
  const [minTentativas, setMinTentativas] = useState('5');
  const [maxTentativas, setMaxTentativas] = useState('8');
  const [intervalos, setIntervalos] = useState('1, 2, 2, 3, 3, 4');
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carregar valores do banco
  if (config && !loaded) {
    setMinTentativas(String(config.min_tentativas));
    setMaxTentativas(String(config.max_tentativas));
    setIntervalos((config.intervalo_dias || [1,2,2,3,3,4]).join(', '));
    setLoaded(true);
  }

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const dias = intervalos.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const { error } = await supabase
        .from('mt_cadencia_config' as never)
        .update({
          min_tentativas: parseInt(minTentativas) || 5,
          max_tentativas: parseInt(maxTentativas) || 8,
          intervalo_dias: dias.length > 0 ? dias : [1,2,2,3,3,4],
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) throw error;
      toast.success('Cadência atualizada!');
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-orange-600" />
            Configuração da Cadência
          </CardTitle>
          <CardDescription>
            Define quantas tentativas de contato devem ser feitas antes de desistir do lead
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mínimo de tentativas</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={minTentativas}
                onChange={(e) => setMinTentativas(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Tentativas obrigatórias</p>
            </div>
            <div className="space-y-2">
              <Label>Máximo de tentativas</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={maxTentativas}
                onChange={(e) => setMaxTentativas(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Após isso, lead é movido</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intervalos entre tentativas (dias)</Label>
            <Input
              value={intervalos}
              onChange={(e) => setIntervalos(e.target.value)}
              placeholder="1, 2, 2, 3, 3, 4"
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgula. Ex: 1, 2, 2, 3 = 1º dia, 3º dia, 5º dia, 8º dia
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Quando lead responde</Label>
            <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
              → Move automaticamente para <strong>💬 Interessada</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quando esgota tentativas sem resposta</Label>
            <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
              → Move automaticamente para <strong>❌ Perdido / Sem Retorno</strong>
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Cadência
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
          <CardDescription>Fluxo automático da cadência</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">1</Badge>
            <p>Lead entra na etapa <strong>🔥 Cadência Ativa</strong> (manual ou automático)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">2</Badge>
            <p>Sistema cria cadência com <strong>{minTentativas}-{maxTentativas} tentativas</strong> e agenda próximo contato</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">3</Badge>
            <p>Vendedora registra cada contato (WhatsApp, ligação, email)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">4</Badge>
            <p>Card no Kanban mostra <strong>tentativa X/Y</strong> e alerta de atraso</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="mt-0.5 bg-green-600">✓</Badge>
            <p><strong>Se responde:</strong> cadência para, lead move para 💬 Interessada</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="destructive" className="mt-0.5">✗</Badge>
            <p><strong>Se não responde após máximo:</strong> move para ❌ Perdido</p>
          </div>

          <Separator />

          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 space-y-1">
            <p className="font-medium">Automações ativas:</p>
            <p>• Cadência inicia automaticamente ao mover lead para "Cadência Ativa"</p>
            <p>• Resposta no WhatsApp detectada automaticamente</p>
            <p>• Lead movido para "Perdido" quando tentativas esgotam</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Converter nome do ícone para PascalCase
function toPascalCase(str: string | null | undefined): string {
  if (!str) return 'Circle';
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export default function FunilConfig() {
  const { funilId } = useParams<{ funilId: string }>();
  const navigate = useNavigate();

  const [isEtapaDialogOpen, setIsEtapaDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<FunilEtapa | null>(null);
  const [deleteEtapaId, setDeleteEtapaId] = useState<string | null>(null);
  const [isSavingFunil, setIsSavingFunil] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('etapas');
  const [selectedEtapaForAutomacao, setSelectedEtapaForAutomacao] = useState<string | null>(null);
  const [selectedEtapaForTrigger, setSelectedEtapaForTrigger] = useState<string | null>(null);

  // Contexto multi-tenant
  const { accessLevel, franchise } = useTenantContext();

  // Dados do funil
  const { funil, isLoading: isLoadingFunil } = useFunilAdapter(funilId);
  const { updateFunil, deleteFunil } = useFunilMutationsAdapter();

  // Etapas do funil
  const { etapas, isLoading: isLoadingEtapas } = useFunilEtapasAdapter(funilId);
  const { createEtapa, updateEtapa, deleteEtapa, reorderEtapas, isCreating, isUpdating, isDeleting } =
    useFunilEtapasMutationsAdapter();

  // Controle de acesso e permissões
  const { permissions } = useFunnelUserAccessMT(funilId);
  const { accessRules, createAccess, updateAccess, removeAccess, isLoading: isLoadingAccess } = useFunnelRoleAccessMT(funilId);
  const { defaultFunnel, defaultFunnelId, setDefaultFunnel, removeDefaultFunnel, canSetDefault } = useFranchiseDefaultFunnelMT();
  const { departments = [], isLoading: isLoadingDepts } = useDepartments();
  const { teams = [], isLoading: isLoadingTeams } = useTeams();
  const { users = [] } = useUsers();

  // Estado para novo acesso
  const [newAccessType, setNewAccessType] = useState<'department' | 'team' | 'user'>('department');
  const [newAccessTargetId, setNewAccessTargetId] = useState<string>('');
  const [deleteAccessId, setDeleteAccessId] = useState<string | null>(null);

  // Verificar se este funil é o padrão
  const isDefaultFunnel = defaultFunnelId === funilId;

  // Form state para edição do funil
  const [funilForm, setFunilForm] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  });

  // Form state para edição de etapa
  const [etapaForm, setEtapaForm] = useState({
    nome: '',
    descricao: '',
    cor: ETAPA_CORES[0].value,
    icone: ETAPA_ICONES[0].value,
    tipo: 'padrao' as 'entrada' | 'padrao' | 'ativa' | 'ganho' | 'perda',
    meta_dias: '',
    automacao_dias: '',
    automacao_destino_id: '',
  });

  // Atualizar form quando carregar funil
  useState(() => {
    if (funil) {
      setFunilForm({
        nome: funil.nome,
        descricao: funil.descricao || '',
        ativo: funil.ativo,
      });
    }
  });

  const handleSaveFunil = async () => {
    if (!funilId || !funilForm.nome.trim()) return;

    setIsSavingFunil(true);
    try {
      await updateFunil.mutateAsync({
        id: funilId,
        data: {
          nome: funilForm.nome,
          descricao: funilForm.descricao || null,
          ativo: funilForm.ativo,
        },
      });
      toast.success('Funil salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar funil');
    } finally {
      setIsSavingFunil(false);
    }
  };

  const handleOpenEtapaDialog = (etapa?: FunilEtapa) => {
    if (etapa) {
      setEditingEtapa(etapa);
      setEtapaForm({
        nome: etapa.nome,
        descricao: etapa.descricao || '',
        cor: etapa.cor,
        icone: etapa.icone,
        tipo: etapa.tipo,
        meta_dias: etapa.meta_dias?.toString() || '',
        automacao_dias: etapa.automacao_dias?.toString() || '',
        automacao_destino_id: etapa.automacao_destino_id || '',
      });
    } else {
      setEditingEtapa(null);
      setEtapaForm({
        nome: '',
        descricao: '',
        cor: ETAPA_CORES[etapas.length % ETAPA_CORES.length]?.value || ETAPA_CORES[0].value,
        icone: ETAPA_ICONES[0].value,
        tipo: 'padrao',
        meta_dias: '',
        automacao_dias: '',
        automacao_destino_id: '',
      });
    }
    setIsEtapaDialogOpen(true);
  };

  const handleSaveEtapa = async () => {
    if (!funilId || !etapaForm.nome.trim()) return;

    try {
      const etapaData = {
        nome: etapaForm.nome,
        descricao: etapaForm.descricao || null,
        cor: etapaForm.cor,
        icone: etapaForm.icone,
        tipo: etapaForm.tipo,
        meta_dias: etapaForm.meta_dias ? parseInt(etapaForm.meta_dias) : null,
        automacao_dias: etapaForm.automacao_dias ? parseInt(etapaForm.automacao_dias) : null,
        automacao_destino_id: etapaForm.automacao_destino_id || null,
      };

      if (editingEtapa) {
        await updateEtapa.mutateAsync({
          id: editingEtapa.id,
          data: etapaData,
        });
        toast.success('Etapa atualizada!');
      } else {
        await createEtapa.mutateAsync({
          funil_id: funilId,
          ordem: etapas.length,
          ...etapaData,
        });
        toast.success('Etapa criada!');
      }

      setIsEtapaDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar etapa');
    }
  };

  const handleDeleteEtapa = async () => {
    if (!deleteEtapaId) return;

    try {
      await deleteEtapa.mutateAsync(deleteEtapaId);
      toast.success('Etapa removida!');
      setDeleteEtapaId(null);
    } catch (error) {
      toast.error('Erro ao remover etapa');
    }
  };

  const handleMoveEtapa = async (etapaId: string, direction: 'up' | 'down') => {
    const currentIndex = etapas.findIndex((e) => e.id === etapaId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= etapas.length) return;

    const newOrder = [...etapas];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    try {
      await reorderEtapas.mutateAsync(newOrder.map((e, idx) => ({ id: e.id, ordem: idx })));
    } catch (error) {
      toast.error('Erro ao reordenar etapas');
    }
  };

  if (isLoadingFunil || isLoadingEtapas) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!funil) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <p className="text-muted-foreground">Funil não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/funil')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/funil')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configurar Funil</h1>
              <p className="text-muted-foreground">
                Configure as etapas e automações do funil
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDefaultFunnel && (
              <Badge variant="default" className="bg-yellow-500">
                <Star className="h-3 w-3 mr-1" />
                Padrão
              </Badge>
            )}
            {funil.is_template && (
              <Badge variant="secondary">Template</Badge>
            )}
            {permissions.canEditFunnel && (
              <Button onClick={handleSaveFunil} disabled={isSavingFunil}>
                {isSavingFunil ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full lg:w-auto">
            <TabsTrigger value="etapas" className="gap-2">
              <Layers className="h-4 w-4" />
              Etapas
            </TabsTrigger>
            {permissions.canManageAutomations && (
              <TabsTrigger value="automacoes" className="gap-2">
                <Zap className="h-4 w-4" />
                Automações
              </TabsTrigger>
            )}
            {permissions.canManageAutomations && (
              <TabsTrigger value="triggers" className="gap-2">
                <Activity className="h-4 w-4" />
                Triggers
              </TabsTrigger>
            )}
            {permissions.canManageAutomations && (
              <TabsTrigger value="templates" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Templates
              </TabsTrigger>
            )}
            {permissions.canManageAutomations && (
              <TabsTrigger value="cadencia" className="gap-2">
                <Phone className="h-4 w-4" />
                Cadência
              </TabsTrigger>
            )}
            {permissions.canEditFunnel && (
              <TabsTrigger value="acesso" className="gap-2">
                <Shield className="h-4 w-4" />
                Acesso
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Etapas */}
          <TabsContent value="etapas">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configurações gerais */}
              <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Informações do Funil</CardTitle>
              <CardDescription>Configure os dados básicos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={funilForm.nome || funil.nome}
                  onChange={(e) => setFunilForm({ ...funilForm, nome: e.target.value })}
                  placeholder="Nome do funil"
                  disabled={!permissions.canEditFunnel}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={funilForm.descricao || funil.descricao || ''}
                  onChange={(e) => setFunilForm({ ...funilForm, descricao: e.target.value })}
                  placeholder="Descreva o objetivo deste funil"
                  rows={3}
                  disabled={!permissions.canEditFunnel}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Funil ativo</Label>
                <Switch
                  id="ativo"
                  checked={funilForm.ativo !== undefined ? funilForm.ativo : funil.ativo}
                  onCheckedChange={(checked) => setFunilForm({ ...funilForm, ativo: checked })}
                  disabled={!permissions.canEditFunnel}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Informações</p>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Etapas:</strong> {etapas.length}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{' '}
                    {new Date(funil.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {funil.template_origem_id && (
                    <p>
                      <strong>Clonado de:</strong> Template
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Etapas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Etapas do Funil</CardTitle>
                  <CardDescription>
                    Organize as etapas na ordem desejada
                  </CardDescription>
                </div>
                {permissions.canEditFunnel && (
                  <Button onClick={() => handleOpenEtapaDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Etapa
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {etapas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma etapa configurada</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => handleOpenEtapaDialog()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira etapa
                      </Button>
                    </div>
                  ) : (
                    etapas.map((etapa, index) => {
                      const IconComponent = (
                        LucideIcons as Record<string, React.ComponentType<{ className?: string }>>
                      )[toPascalCase(etapa.icone)] || LucideIcons.Circle;

                      return (
                        <div
                          key={etapa.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          style={{ borderLeftColor: etapa.cor, borderLeftWidth: 4 }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMoveEtapa(etapa.id, 'up')}
                              disabled={index === 0}
                            >
                              <LucideIcons.ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMoveEtapa(etapa.id, 'down')}
                              disabled={index === etapas.length - 1}
                            >
                              <LucideIcons.ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <div
                            className="p-2 rounded"
                            style={{ backgroundColor: `${etapa.cor}20`, color: etapa.cor }}
                          >
                            {etapa.tipo === 'ganho' ? (
                              <Trophy className="h-5 w-5" />
                            ) : etapa.tipo === 'perda' ? (
                              <XCircle className="h-5 w-5" />
                            ) : (
                              <IconComponent className="h-5 w-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{etapa.nome}</p>
                              {(etapa.tipo === 'ganho' || etapa.tipo === 'perda') && (
                                <Badge
                                  variant={etapa.tipo === 'ganho' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {etapa.tipo === 'ganho' ? 'Ganho' : 'Perda'}
                                </Badge>
                              )}
                              {etapa.tipo === 'entrada' && (
                                <Badge variant="secondary" className="text-xs">
                                  Entrada
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>Ordem: {etapa.ordem}</span>
                              {etapa.meta_dias && (
                                <span>Meta: {etapa.meta_dias} dias</span>
                              )}
                              {etapa.automacao_dias && (
                                <span>Auto-move: {etapa.automacao_dias} dias</span>
                              )}
                            </div>
                          </div>

                          {permissions.canEditFunnel && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEtapaDialog(etapa)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteEtapaId(etapa.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          {/* Tab: Automações */}
          <TabsContent value="automacoes">
            {/* Automações Globais (on/off) */}
            <AutomacoesGlobaisTab funilId={funilId!} />

            <Separator className="my-6" />

            <h3 className="text-lg font-semibold mb-4">Automações por Etapa</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seletor de etapa */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Selecionar Etapa</CardTitle>
                  <CardDescription>
                    Escolha uma etapa para configurar suas automações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {etapas.filter(e => e.tipo !== 'ganho' && e.tipo !== 'perda').map((etapa) => (
                      <button
                        key={etapa.id}
                        type="button"
                        onClick={() => setSelectedEtapaForAutomacao(etapa.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          selectedEtapaForAutomacao === etapa.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                        style={{ borderLeftColor: etapa.cor, borderLeftWidth: 4 }}
                      >
                        <div
                          className="p-1.5 rounded"
                          style={{ backgroundColor: `${etapa.cor}20`, color: etapa.cor }}
                        >
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{etapa.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Ordem: {etapa.ordem}
                          </p>
                        </div>
                        {selectedEtapaForAutomacao === etapa.id && (
                          <LucideIcons.Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                    {etapas.filter(e => e.tipo !== 'ganho' && e.tipo !== 'perda').length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma etapa ativa configurada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configuração de automações */}
              <div className="lg:col-span-2">
                {selectedEtapaForAutomacao && etapas.find(e => e.id === selectedEtapaForAutomacao) ? (
                  <AutomacaoConfig
                    etapa={etapas.find(e => e.id === selectedEtapaForAutomacao)!}
                    funilId={funilId!}
                    etapas={etapas}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
                      <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        Selecione uma etapa para configurar as automações
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Pipeline Triggers */}
          <TabsContent value="triggers">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seletor de etapa para triggers (estado independente) */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Selecionar Etapa</CardTitle>
                  <CardDescription>
                    Escolha uma etapa para configurar seus triggers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {etapas.map((etapa) => (
                      <button
                        key={etapa.id}
                        type="button"
                        onClick={() => setSelectedEtapaForTrigger(etapa.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          selectedEtapaForTrigger === etapa.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                        style={{ borderLeftColor: etapa.cor, borderLeftWidth: 4 }}
                      >
                        <div
                          className="p-1.5 rounded"
                          style={{ backgroundColor: `${etapa.cor}20`, color: etapa.cor }}
                        >
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{etapa.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {etapa.tipo === 'ganho' ? 'Ganho' : etapa.tipo === 'perda' ? 'Perda' : `Ordem: ${etapa.ordem}`}
                          </p>
                        </div>
                        {selectedEtapaForTrigger === etapa.id && (
                          <LucideIcons.Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                    {etapas.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma etapa configurada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configuração de triggers + Log */}
              <div className="lg:col-span-2 space-y-6">
                {selectedEtapaForTrigger && etapas.find(e => e.id === selectedEtapaForTrigger) ? (
                  <>
                    <PipelineTriggersConfig
                      etapa={etapas.find(e => e.id === selectedEtapaForTrigger)!}
                      funilId={funilId!}
                      etapas={etapas}
                    />
                    <TriggerExecutionLog funilId={funilId!} />
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
                      <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        Selecione uma etapa para configurar os Pipeline Triggers
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Triggers são automações que disparam quando leads entram ou saem de uma etapa
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Templates de Mensagem */}
          <TabsContent value="templates">
            <MensagemTemplateEditor funilId={funilId!} />
          </TabsContent>

          {/* Tab: Cadência de Contato */}
          <TabsContent value="cadencia">
            <CadenciaTabContent funilId={funilId!} etapas={etapas} />
          </TabsContent>

          {/* Tab: Controle de Acesso */}
          <TabsContent value="acesso">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funil Padrão */}
              {canSetDefault && (
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          Funil Padrão da Unidade
                        </CardTitle>
                        <CardDescription>
                          Defina este funil como o padrão para a sua unidade. O funil padrão será selecionado automaticamente para todos os usuários da franquia.
                        </CardDescription>
                      </div>
                      {isDefaultFunnel ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const fId = defaultFunnel?.franchise_id || franchise?.id;
                            if (fId) removeDefaultFunnel.mutate(fId);
                          }}
                          disabled={removeDefaultFunnel.isPending}
                        >
                          {removeDefaultFunnel.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Remover como Padrão
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            const fId = franchise?.id;
                            if (funilId && fId) {
                              setDefaultFunnel.mutate({
                                franchiseId: fId,
                                funnelId: funilId,
                              });
                            }
                          }}
                          disabled={setDefaultFunnel.isPending || !franchise?.id}
                        >
                          {setDefaultFunnel.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4 mr-2" />
                          )}
                          Definir como Padrão
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {isDefaultFunnel && (
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                        <LucideIcons.CheckCircle className="h-4 w-4" />
                        Este funil é o padrão da unidade. Todos os usuários verão este funil selecionado por padrão.
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Adicionar novo acesso */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Adicionar Acesso</CardTitle>
                  <CardDescription>
                    Configure quem pode acessar este funil e com quais permissões
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de acesso</Label>
                    <Select
                      value={newAccessType}
                      onValueChange={(v: 'department' | 'team' | 'user') => {
                        setNewAccessType(v);
                        setNewAccessTargetId('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Departamento
                          </div>
                        </SelectItem>
                        <SelectItem value="team">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Equipe
                          </div>
                        </SelectItem>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Usuário
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {newAccessType === 'department' ? 'Departamento' :
                       newAccessType === 'team' ? 'Equipe' : 'Usuário'}
                    </Label>
                    <Select
                      value={newAccessTargetId}
                      onValueChange={setNewAccessTargetId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Selecione ${
                          newAccessType === 'department' ? 'o departamento' :
                          newAccessType === 'team' ? 'a equipe' : 'o usuário'
                        }`} />
                      </SelectTrigger>
                      <SelectContent>
                        {newAccessType === 'department' && departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              {dept.cor && (
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.cor }} />
                              )}
                              {dept.nome}
                            </div>
                          </SelectItem>
                        ))}
                        {newAccessType === 'team' && teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              {team.cor && (
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.cor }} />
                              )}
                              {team.nome}
                            </div>
                          </SelectItem>
                        ))}
                        {newAccessType === 'user' && (users as Array<{ id: string; nome: string; email?: string }>).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome} {u.email ? `(${u.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!funilId || !newAccessTargetId) return;

                      const alreadyExists = accessRules.some((rule) => {
                        if (newAccessType === 'department') return rule.department_id === newAccessTargetId;
                        if (newAccessType === 'team') return rule.team_id === newAccessTargetId;
                        return rule.user_id === newAccessTargetId;
                      });

                      if (alreadyExists) {
                        toast.error('Acesso já configurado para este item');
                        return;
                      }

                      createAccess.mutate({
                        funnel_id: funilId,
                        department_id: newAccessType === 'department' ? newAccessTargetId : null,
                        team_id: newAccessType === 'team' ? newAccessTargetId : null,
                        user_id: newAccessType === 'user' ? newAccessTargetId : null,
                        can_view: true,
                        can_move_leads: true,
                        can_add_leads: true,
                        can_remove_leads: false,
                        can_edit_funnel: false,
                        can_manage_automations: false,
                      });
                      setNewAccessTargetId('');
                    }}
                    disabled={!newAccessTargetId || createAccess.isPending}
                  >
                    {createAccess.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Adicionar Acesso
                  </Button>

                  <Separator />

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Como funciona:</p>
                    <p>• Se nenhum acesso for configurado, todos podem ver o funil</p>
                    <p>• Se pelo menos um acesso existir, apenas os listados terão acesso</p>
                    <p>• Permissões de múltiplas regras são combinadas (a mais permissiva vence)</p>
                    <p>• Admins sempre têm acesso total, independente das regras</p>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de acessos configurados */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Acessos Configurados</CardTitle>
                      <CardDescription>
                        {accessRules.length === 0
                          ? 'Nenhuma restrição — todos os usuários podem acessar este funil'
                          : `${accessRules.length} regra(s) de acesso configurada(s)`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingAccess ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : accessRules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                      <Shield className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-medium">Acesso aberto</p>
                      <p className="text-sm">Todos os usuários do sistema podem acessar este funil</p>
                      <p className="text-xs mt-2">Adicione regras para restringir o acesso por departamento, equipe ou usuário</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[450px] pr-4">
                      <div className="space-y-3">
                        {accessRules.map((rule) => {
                          const label = rule.department?.nome || rule.team?.nome || rule.user?.nome || 'Desconhecido';
                          const typeIcon = rule.department_id ? (
                            <Building2 className="h-4 w-4" />
                          ) : rule.team_id ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          );
                          const typeLabel = rule.department_id ? 'Departamento' : rule.team_id ? 'Equipe' : 'Usuário';

                          return (
                            <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded bg-muted">{typeIcon}</div>
                                  <div>
                                    <p className="font-medium text-sm">{label}</p>
                                    <p className="text-xs text-muted-foreground">{typeLabel}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteAccessId(rule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                  { key: 'can_view', label: 'Visualizar' },
                                  { key: 'can_move_leads', label: 'Mover leads' },
                                  { key: 'can_add_leads', label: 'Adicionar leads' },
                                  { key: 'can_remove_leads', label: 'Remover leads' },
                                  { key: 'can_edit_funnel', label: 'Editar funil' },
                                  { key: 'can_manage_automations', label: 'Automações' },
                                ].map(({ key, label: permLabel }) => (
                                  <label
                                    key={key}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={(rule as Record<string, unknown>)[key] as boolean}
                                      onCheckedChange={(checked) => {
                                        updateAccess.mutate({
                                          id: rule.id,
                                          [key]: !!checked,
                                        });
                                      }}
                                    />
                                    {permLabel}
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog de edição de etapa */}
        <Dialog open={isEtapaDialogOpen} onOpenChange={setIsEtapaDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}
              </DialogTitle>
              <DialogDescription>
                Configure as propriedades da etapa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="etapa-nome">Nome</Label>
                <Input
                  id="etapa-nome"
                  value={etapaForm.nome}
                  onChange={(e) => setEtapaForm({ ...etapaForm, nome: e.target.value })}
                  placeholder="Ex: Contato Iniciado"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="etapa-descricao">Descrição</Label>
                <Textarea
                  id="etapa-descricao"
                  value={etapaForm.descricao}
                  onChange={(e) => setEtapaForm({ ...etapaForm, descricao: e.target.value })}
                  placeholder="Descreva esta etapa..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {ETAPA_CORES.map((corObj) => (
                      <button
                        key={corObj.value}
                        type="button"
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          etapaForm.cor === corObj.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:border-muted-foreground'
                        )}
                        style={{ backgroundColor: corObj.value }}
                        onClick={() => setEtapaForm({ ...etapaForm, cor: corObj.value })}
                        title={corObj.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex flex-wrap gap-2">
                    {ETAPA_ICONES.slice(0, 12).map((iconeObj) => {
                      const Icon = (
                        LucideIcons as Record<string, React.ComponentType<{ className?: string }>>
                      )[toPascalCase(iconeObj.value)] || LucideIcons.Circle;
                      return (
                        <button
                          key={iconeObj.value}
                          type="button"
                          className={cn(
                            'p-2 rounded border transition-all',
                            etapaForm.icone === iconeObj.value
                              ? 'border-primary bg-primary/10'
                              : 'border-transparent hover:border-muted-foreground hover:bg-muted'
                          )}
                          onClick={() => setEtapaForm({ ...etapaForm, icone: iconeObj.value })}
                          title={iconeObj.label}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo da etapa</Label>
                <Select
                  value={etapaForm.tipo}
                  onValueChange={(value: string) =>
                    setEtapaForm({ ...etapaForm, tipo: value as 'ativa' | 'entrada' | 'padrao' | 'ganho' | 'perda' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <LucideIcons.LogIn className="h-4 w-4 text-blue-600" />
                        Entrada (primeira etapa)
                      </div>
                    </SelectItem>
                    <SelectItem value="padrao">
                      <div className="flex items-center gap-2">
                        <LucideIcons.Circle className="h-4 w-4" />
                        Padrão (etapa normal)
                      </div>
                    </SelectItem>
                    <SelectItem value="ganho">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-green-600" />
                        Ganho (conversão)
                      </div>
                    </SelectItem>
                    <SelectItem value="perda">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Perda (descarte)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-dias">Meta (dias)</Label>
                  <Input
                    id="meta-dias"
                    type="number"
                    min="0"
                    value={etapaForm.meta_dias}
                    onChange={(e) => setEtapaForm({ ...etapaForm, meta_dias: e.target.value })}
                    placeholder="Ex: 7"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta visual após X dias
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="automacao-dias">Auto-mover (dias)</Label>
                  <Input
                    id="automacao-dias"
                    type="number"
                    min="0"
                    value={etapaForm.automacao_dias}
                    onChange={(e) =>
                      setEtapaForm({ ...etapaForm, automacao_dias: e.target.value })
                    }
                    placeholder="Ex: 14"
                  />
                  <p className="text-xs text-muted-foreground">
                    Move automaticamente após X dias
                  </p>
                </div>
              </div>

              {etapaForm.automacao_dias && (
                <div className="space-y-2">
                  <Label>Mover para</Label>
                  <Select
                    value={etapaForm.automacao_destino_id}
                    onValueChange={(value) =>
                      setEtapaForm({ ...etapaForm, automacao_destino_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {etapas
                        .filter((e) => e.id !== editingEtapa?.id)
                        .map((etapa) => (
                          <SelectItem key={etapa.id} value={etapa.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: etapa.cor }}
                              />
                              {etapa.nome}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEtapaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEtapa}
                disabled={!etapaForm.nome.trim() || isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão de etapa */}
        <AlertDialog open={!!deleteEtapaId} onOpenChange={() => setDeleteEtapaId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover etapa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os leads nesta etapa serão
                desvinculados do funil.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteEtapa}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de confirmação de exclusão de acesso */}
        <AlertDialog open={!!deleteAccessId} onOpenChange={() => setDeleteAccessId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover regra de acesso?</AlertDialogTitle>
              <AlertDialogDescription>
                O departamento, equipe ou usuário perderá o acesso configurado para este funil.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteAccessId) {
                    removeAccess.mutate(deleteAccessId);
                    setDeleteAccessId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
