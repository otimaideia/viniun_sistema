// Pagina: Criar/Editar Campanha de Broadcast WhatsApp (Wizard)

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Radio,
  MessageSquare,
  Users,
  Settings,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
  Image,
  Video,
  FileText,
  Type,
  Upload,
  X,
  Link2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  useBroadcastCampaignsMT,
  useBroadcastCampaignMT,
  type BroadcastProviderType,
  type BroadcastMessageType,
  type CreateBroadcastCampaignInput,
  type UpdateBroadcastCampaignInput,
} from '@/hooks/multitenant/useBroadcastCampaignsMT';
import { useBroadcastListsMT } from '@/hooks/multitenant/useBroadcastListsMT';
import { useWhatsAppSessionsMT } from '@/hooks/multitenant/useWhatsAppSessionsMT';
import { useBroadcastMediaUpload } from '@/hooks/multitenant/useBroadcastMediaUpload';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  nome: string;
  descricao: string;
  provider_type: BroadcastProviderType;
  session_id: string;
  message_type: BroadcastMessageType;
  message_text: string;
  media_url: string;
  send_text_separate: boolean;
  template_name: string;
  message_template_language: string;
  template_components: string;
  list_id: string;
  delay_between_messages_ms: number;
  batch_size: number;
  max_per_minute: number;
  frequency_cap_hours: number;
  wave_size: number;
  wave_pause_minutes: number;
  schedule_type: 'now' | 'scheduled';
  scheduled_at: string;
}

const INITIAL_FORM: FormData = {
  nome: '',
  descricao: '',
  provider_type: 'waha',
  session_id: '',
  message_type: 'text',
  message_text: '',
  media_url: '',
  send_text_separate: true,
  template_name: '',
  message_template_language: 'pt_BR',
  template_components: '{}',
  list_id: '',
  delay_between_messages_ms: 3000,
  batch_size: 50,
  max_per_minute: 20,
  frequency_cap_hours: 24,
  wave_size: 80,
  wave_pause_minutes: 30,
  schedule_type: 'now',
  scheduled_at: '',
};

const STEPS = [
  { key: 'provider', label: 'Provider', icon: Radio },
  { key: 'mensagem', label: 'Mensagem', icon: MessageSquare },
  { key: 'destinatarios', label: 'Destinatarios', icon: Users },
  { key: 'configuracao', label: 'Configuracao', icon: Settings },
  { key: 'revisao', label: 'Revisao', icon: ClipboardCheck },
] as const;

const MESSAGE_TYPE_OPTIONS: { value: BroadcastMessageType; label: string; icon: typeof Type }[] = [
  { value: 'text', label: 'Texto', icon: Type },
  { value: 'image', label: 'Imagem', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'template', label: 'Template', icon: MessageSquare },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppBroadcastEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  // Hooks
  const { campaign, isLoading: isLoadingCampaign } = useBroadcastCampaignMT(id);
  const { createCampaign, updateCampaign, startCampaign, isCreating, isUpdating } = useBroadcastCampaignsMT();
  const { lists, isLoading: isLoadingLists } = useBroadcastListsMT();
  const { sessions, isLoading: isLoadingSessions } = useWhatsAppSessionsMT();
  const { uploadMedia, deleteMedia, isUploading, progress: uploadProgress } = useBroadcastMediaUpload();

  const [mediaInputMode, setMediaInputMode] = useState<'upload' | 'url'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);

  const isSaving = isCreating || isUpdating;

  // Load campaign data when editing
  const [formLoaded, setFormLoaded] = useState(false);
  useEffect(() => {
    if (isEditing && campaign && !formLoaded) {
      setForm({
        nome: campaign.nome || '',
        descricao: campaign.descricao || '',
        provider_type: campaign.provider_type || 'waha',
        session_id: campaign.session_id || '',
        message_type: campaign.message_type || 'text',
        message_text: campaign.message_text || '',
        media_url: campaign.media_url || '',
        template_name: campaign.template_name || '',
        message_template_language: (campaign.template_components as Record<string, string> | null)?.language || 'pt_BR',
        template_components: campaign.template_components
          ? JSON.stringify(campaign.template_components, null, 2)
          : '{}',
        list_id: campaign.list_id || '',
        delay_between_messages_ms: campaign.delay_between_messages_ms || 3000,
        batch_size: campaign.batch_size || 50,
        max_per_minute: campaign.max_per_minute || 20,
        frequency_cap_hours: campaign.frequency_cap_hours || 24,
        wave_size: campaign.wave_size || 80,
        wave_pause_minutes: campaign.wave_pause_minutes || 30,
        send_text_separate: campaign.send_text_separate || false,
        schedule_type: campaign.scheduled_at ? 'scheduled' : 'now',
        scheduled_at: campaign.scheduled_at
          ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
          : '',
      });
      setFormLoaded(true);
      // Avançar para o step correto se já tem dados preenchidos
      if (campaign.session_id) setCurrentStep(1);
    }
  }, [isEditing, campaign, formLoaded]);

  // ---------------------------------------------------------------------------
  // Form update helper
  // ---------------------------------------------------------------------------

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validateStep(step: number): string | null {
    switch (step) {
      case 0: // Provider
        if (!form.nome.trim()) return 'Informe o nome da campanha.';
        if (form.provider_type === 'waha' && !form.session_id) return 'Selecione uma sessao WAHA.';
        return null;
      case 1: // Mensagem
        if (form.provider_type === 'waha' || form.message_type !== 'template') {
          if (!form.message_text.trim()) return 'Informe o conteudo da mensagem.';
        }
        if (form.message_type === 'template' && form.provider_type === 'meta_api') {
          if (!form.template_name.trim()) return 'Informe o nome do template.';
        }
        return null;
      case 2: // Destinatarios
        if (!form.list_id) return 'Selecione uma lista de destinatarios.';
        return null;
      case 3: // Configuracao
        if (form.delay_between_messages_ms < 500) return 'Delay minimo de 500ms.';
        if (form.schedule_type === 'scheduled' && !form.scheduled_at) return 'Informe a data/hora de agendamento.';
        return null;
      default:
        return null;
    }
  }

  function canAdvance(): boolean {
    return validateStep(currentStep) === null;
  }

  function handleNext() {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function handlePrev() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit() {
    // Validate all steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      const error = validateStep(i);
      if (error) {
        toast.error(error);
        setCurrentStep(i);
        return;
      }
    }

    let templateParams: Record<string, string> | null = null;
    if (form.message_type === 'template') {
      try {
        templateParams = JSON.parse(form.template_components);
      } catch {
        toast.error('JSON de parametros do template invalido.');
        setCurrentStep(1);
        return;
      }
    }

    try {
      if (isEditing && id) {
        const input: UpdateBroadcastCampaignInput = {
          id,
          nome: form.nome,
          descricao: form.descricao || undefined,
          provider_type: form.provider_type,
          session_id: form.provider_type === 'waha' ? form.session_id : null,
          message_type: form.message_type,
          message_text: form.message_text,
          media_url: form.media_url || null,
          template_name: form.template_name || null,
          template_components: templateParams || undefined,
          scheduled_at: form.schedule_type === 'scheduled' ? new Date(form.scheduled_at).toISOString() : null,
          delay_between_messages_ms: form.delay_between_messages_ms,
          batch_size: form.batch_size,
          frequency_cap_hours: form.frequency_cap_hours,
          wave_size: form.wave_size,
          wave_pause_minutes: form.wave_pause_minutes,
          send_text_separate: form.send_text_separate,
        };
        await updateCampaign.mutateAsync(input);
        navigate(`/whatsapp/broadcast/${id}`);
      } else {
        const input: CreateBroadcastCampaignInput = {
          nome: form.nome,
          descricao: form.descricao || undefined,
          list_id: form.list_id,
          provider_type: form.provider_type,
          session_id: form.provider_type === 'waha' ? form.session_id : null,
          message_type: form.message_type,
          message_text: form.message_text,
          media_url: form.media_url || null,
          template_name: form.template_name || null,
          template_components: templateParams || undefined,
          scheduled_at: form.schedule_type === 'scheduled' ? new Date(form.scheduled_at).toISOString() : null,
          delay_between_messages_ms: form.delay_between_messages_ms,
          batch_size: form.batch_size,
          frequency_cap_hours: form.frequency_cap_hours,
          wave_size: form.wave_size,
          wave_pause_minutes: form.wave_pause_minutes,
          send_text_separate: form.send_text_separate,
        };
        const created = await createCampaign.mutateAsync(input);

        if (form.schedule_type === 'now') {
          // Iniciar envio imediatamente
          toast.info('Campanha criada! Iniciando envio...');
          try {
            await startCampaign.mutateAsync(created.id);
          } catch {
            // Se falhar ao iniciar, redireciona para a página de detalhes
          }
        } else {
          // Agendado - salvar como scheduled e invocar edge function
          await supabase
            .from('mt_broadcast_campaigns')
            .update({ status: 'scheduled' })
            .eq('id', created.id);

          // Invocar edge function que vai verificar scheduled_at
          await supabase.functions.invoke('broadcast-processor', {
            body: { broadcast_campaign_id: created.id },
          }).catch(() => {});

          toast.success(`Campanha agendada para ${new Date(form.scheduled_at).toLocaleString('pt-BR')}`);
        }

        navigate(`/whatsapp/broadcast/${created.id}`);
      }
    } catch {
      // Error handled by hook toast
    }
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isEditing && (isLoadingCampaign || !formLoaded)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (isEditing && !campaign && !isLoadingCampaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">Campanha nao encontrada</h2>
        <Button variant="outline" asChild>
          <Link to="/whatsapp/broadcast">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Selected list info
  // ---------------------------------------------------------------------------

  const selectedList = lists.find((l) => l.id === form.list_id);
  const selectedSession = sessions.find((s) => s.id === form.session_id);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/whatsapp/broadcast">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing
              ? 'Altere as configuracoes da campanha de broadcast.'
              : 'Configure sua campanha de envio em massa passo a passo.'}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;

          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => {
                  if (idx < currentStep) setCurrentStep(idx);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-primary/10 text-primary cursor-pointer'
                    : 'text-muted-foreground'
                }`}
                disabled={idx > currentStep}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden md:inline">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <Separator
                  className={`w-8 mx-2 ${idx < currentStep ? 'bg-primary' : 'bg-muted'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Provider */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-1">Provider e Sessao</CardTitle>
                <CardDescription>Escolha o provider e configure a sessao de envio.</CardDescription>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome da Campanha *</label>
                  <Input
                    value={form.nome}
                    onChange={(e) => updateField('nome', e.target.value)}
                    placeholder="Ex: Black Friday 2026"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Descricao</label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => updateField('descricao', e.target.value)}
                    placeholder="Descricao opcional da campanha..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Provider *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('provider_type', 'waha')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        form.provider_type === 'waha'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          WAHA
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Envia via WhatsApp HTTP API. Requer sessao autenticada.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField('provider_type', 'meta_api')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        form.provider_type === 'meta_api'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          Meta API
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Envia via Meta WhatsApp Business API. Requer template aprovado.
                      </p>
                    </button>
                  </div>
                </div>

                {form.provider_type === 'waha' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Sessao WAHA *</label>
                    <Select
                      value={form.session_id || 'none'}
                      onValueChange={(v) => updateField('session_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sessao" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Selecione uma sessao</SelectItem>
                        {isLoadingSessions ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : (
                          sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.display_name || session.session_name}
                              {session.telefone && ` (${session.telefone})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.provider_type === 'meta_api' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      A Meta API requer templates de mensagem pre-aprovados. Configure o template na proxima etapa.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Mensagem */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-1">Conteudo da Mensagem</CardTitle>
                <CardDescription>
                  {form.provider_type === 'waha'
                    ? 'Escreva a mensagem que sera enviada para todos os destinatarios.'
                    : 'Configure o template Meta que sera utilizado.'}
                </CardDescription>
              </div>

              {form.provider_type === 'waha' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tipo de Mensagem</label>
                    <div className="flex flex-wrap gap-2">
                      {MESSAGE_TYPE_OPTIONS.filter((o) => o.value !== 'template').map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateField('message_type', opt.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                              form.message_type === opt.value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-muted hover:border-muted-foreground/30'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">Mensagem *</label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Variáveis:</span>
                        {[
                          { key: '{nome}', label: 'Nome' },
                          { key: '{telefone}', label: 'Telefone' },
                        ].map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => {
                              updateField('message_text', form.message_text + v.key);
                            }}
                            className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
                          >
                            {v.key}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      value={form.message_text}
                      onChange={(e) => updateField('message_text', e.target.value)}
                      placeholder="Ex: Olá {nome}! Temos uma oferta especial para você..."
                      rows={6}
                      maxLength={4096}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.message_text.length}/4096 caracteres
                      {form.message_text.includes('{nome}') && (
                        <span className="text-green-600 ml-2">• {'{nome}'} será substituído pelo nome do destinatário</span>
                      )}
                    </p>
                  </div>

                  {(form.message_type === 'image' || form.message_type === 'video' || form.message_type === 'document') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Mídia</label>
                        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => setMediaInputMode('upload')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              mediaInputMode === 'upload'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Upload className="h-3 w-3" />
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaInputMode('url')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              mediaInputMode === 'url'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Link2 className="h-3 w-3" />
                            URL
                          </button>
                        </div>
                      </div>

                      {/* Preview da mídia atual */}
                      {form.media_url && (
                        <div className="relative rounded-lg border bg-muted/30 p-3">
                          <button
                            type="button"
                            onClick={async () => {
                              if (form.media_url.includes('broadcast-media')) {
                                await deleteMedia(form.media_url);
                              }
                              updateField('media_url', '');
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {form.message_type === 'image' ? (
                            <img
                              src={form.media_url}
                              alt="Preview"
                              className="max-h-48 rounded-md object-contain mx-auto"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <span className="truncate max-w-[300px]">{form.media_url.split('/').pop()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Upload mode */}
                      {!form.media_url && mediaInputMode === 'upload' && (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            const file = e.dataTransfer.files[0];
                            if (!file) return;
                            const result = await uploadMedia(file, form.message_type);
                            if (result) updateField('media_url', result.url);
                          }}
                          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                            isDragOver
                              ? 'border-primary bg-primary/5'
                              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                          }`}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = form.message_type === 'image'
                              ? 'image/*'
                              : form.message_type === 'video'
                              ? 'video/*'
                              : '.pdf,.doc,.docx,.xls,.xlsx';
                            input.onchange = async (ev) => {
                              const file = (ev.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const result = await uploadMedia(file, form.message_type);
                              if (result) updateField('media_url', result.url);
                            };
                            input.click();
                          }}
                        >
                          {isUploading ? (
                            <div className="space-y-2">
                              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">Enviando... {uploadProgress}%</p>
                              <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                              <p className="text-xs text-muted-foreground">
                                {form.message_type === 'image' && 'JPG, PNG, WebP, GIF (max 16MB)'}
                                {form.message_type === 'video' && 'MP4, 3GP (max 16MB)'}
                                {form.message_type === 'document' && 'PDF, DOC, XLS (max 16MB)'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* URL mode */}
                      {!form.media_url && mediaInputMode === 'url' && (
                        <div>
                          <Input
                            value={form.media_url}
                            onChange={(e) => updateField('media_url', e.target.value)}
                            placeholder="https://exemplo.com/arquivo.jpg"
                            type="url"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            URL pública do arquivo de mídia a ser enviado.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opção: texto separado da imagem */}
                  {form.media_url && form.message_text && (
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <label className="text-sm font-medium mb-2 block">Como enviar texto + imagem?</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateField('send_text_separate', false)}
                          className={`flex-1 p-2.5 rounded-lg border text-center transition-colors text-xs ${
                            !form.send_text_separate
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <p className="font-medium">Legenda na imagem</p>
                          <p className="text-muted-foreground mt-0.5">Texto como caption (links não clicáveis)</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('send_text_separate', true)}
                          className={`flex-1 p-2.5 rounded-lg border text-center transition-colors text-xs ${
                            form.send_text_separate
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-muted hover:border-muted-foreground/30'
                          }`}
                        >
                          <p className="font-medium">Imagem + texto separado</p>
                          <p className="text-muted-foreground mt-0.5">2 mensagens (links clicáveis ✅)</p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nome do Template *</label>
                    <Input
                      value={form.template_name}
                      onChange={(e) => updateField('template_name', e.target.value)}
                      placeholder="Ex: hello_world"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Idioma do Template</label>
                    <Select
                      value={form.message_template_language}
                      onValueChange={(v) => updateField('message_template_language', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt_BR">Portugues (Brasil)</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="es">Espanol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Parametros do Template (JSON)</label>
                    <Textarea
                      value={form.template_components}
                      onChange={(e) => updateField('template_components', e.target.value)}
                      placeholder='{"1": "Valor 1", "2": "Valor 2"}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      JSON com os parametros variaveis do template.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Conteudo de Fallback</label>
                    <Textarea
                      value={form.message_text}
                      onChange={(e) => updateField('message_text', e.target.value)}
                      placeholder="Conteudo de referencia para visualizacao..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Destinatarios */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-1">Lista de Destinatarios</CardTitle>
                <CardDescription>
                  Selecione a lista de contatos que receberao a mensagem.
                </CardDescription>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Lista de Broadcast *</label>
                  <Select
                    value={form.list_id || 'none'}
                    onValueChange={(v) => updateField('list_id', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma lista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Selecione uma lista</SelectItem>
                      {isLoadingLists ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : (
                        lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.nome} ({list.total_recipients} destinatarios)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedList && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{selectedList.total_recipients}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">{selectedList.valid_numbers}</p>
                          <p className="text-xs text-muted-foreground">Validos</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-destructive">{selectedList.invalid_numbers}</p>
                          <p className="text-xs text-muted-foreground">Invalidos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {lists.length === 0 && !isLoadingLists && (
                  <div className="text-center py-6 border rounded-lg border-dashed">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma lista de broadcast encontrada.
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/whatsapp/broadcast/listas">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Criar Lista
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Configuracao */}
          {currentStep === 3 && (() => {
            const recipientCount = selectedList?.total_recipients || 0;
            const delayMs = form.delay_between_messages_ms || 3000;
            const estimatedSeconds = Math.ceil((recipientCount * delayMs) / 1000);
            const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
            const estimatedHours = Math.floor(estimatedMinutes / 60);
            const remainingMinutes = estimatedMinutes % 60;
            const timeStr = estimatedHours > 0
              ? `~${estimatedHours}h ${remainingMinutes}min`
              : `~${estimatedMinutes} min`;

            return (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-1">Configuração de Envio</CardTitle>
                <CardDescription>
                  Configure a velocidade de envio e agendamento.
                </CardDescription>
              </div>

              {/* Estimativa de envio */}
              {recipientCount > 0 && (
                <Card className={recipientCount > 500 ? 'border-orange-300 bg-orange-50/50' : 'bg-muted/50'}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {recipientCount > 500 ? (
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {recipientCount.toLocaleString('pt-BR')} destinatários • Tempo estimado: {timeStr}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Delay de {(delayMs / 1000).toFixed(1)}s entre mensagens • Lotes de {form.batch_size}
                        </p>
                        {recipientCount > 500 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Envio grande detectado. Recomendamos delay de 3-5s para evitar bloqueio do WhatsApp.
                          </p>
                        )}
                        {recipientCount > 2000 && (
                          <p className="text-xs text-orange-700 font-medium mt-0.5">
                            Com {recipientCount.toLocaleString('pt-BR')}+ contatos, considere dividir em múltiplas campanhas de ~500 cada.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Delay entre mensagens</label>
                    <Select
                      value={String(form.delay_between_messages_ms)}
                      onValueChange={(v) => updateField('delay_between_messages_ms', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1 segundo (rápido)</SelectItem>
                        <SelectItem value="2000">2 segundos</SelectItem>
                        <SelectItem value="3000">3 segundos (recomendado)</SelectItem>
                        <SelectItem value="5000">5 segundos (seguro)</SelectItem>
                        <SelectItem value="10000">10 segundos (muito seguro)</SelectItem>
                        <SelectItem value="30000">30 segundos</SelectItem>
                        <SelectItem value="60000">1 minuto</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Intervalo entre cada envio</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tamanho do lote</label>
                    <Input
                      type="number"
                      value={form.batch_size}
                      onChange={(e) => updateField('batch_size', Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Mensagens por lote</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Máximo por minuto</label>
                    <Input
                      type="number"
                      value={form.max_per_minute}
                      onChange={(e) => updateField('max_per_minute', Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={60}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Rate limiting</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Frequency Cap (horas)</label>
                  <Input
                    type="number"
                    value={form.frequency_cap_hours}
                    onChange={(e) => updateField('frequency_cap_hours', Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Intervalo mínimo entre envios para o mesmo destinatário. 0 = sem limite.
                  </p>
                </div>

                <Separator />

                {/* Controle de Ondas (anti-bloqueio) */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Controle de Ondas (anti-bloqueio WhatsApp)</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    WhatsApp pode bloquear após ~100 mensagens seguidas. O sistema envia em ondas com pausas automáticas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Mensagens por onda</label>
                      <Select
                        value={String(form.wave_size)}
                        onValueChange={(v) => updateField('wave_size', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 mensagens (muito seguro)</SelectItem>
                          <SelectItem value="50">50 mensagens (seguro)</SelectItem>
                          <SelectItem value="80">80 mensagens (recomendado)</SelectItem>
                          <SelectItem value="100">100 mensagens (limite)</SelectItem>
                          <SelectItem value="0">Sem limite (arriscado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Pausa entre ondas</label>
                      <Select
                        value={String(form.wave_pause_minutes)}
                        onValueChange={(v) => updateField('wave_pause_minutes', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos (recomendado)</SelectItem>
                          <SelectItem value="60">1 hora (seguro)</SelectItem>
                          <SelectItem value="120">2 horas (muito seguro)</SelectItem>
                          <SelectItem value="240">4 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {recipientCount > 0 && form.wave_size > 0 && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                      {Math.ceil(recipientCount / form.wave_size)} onda(s) de {form.wave_size} msgs • Pausa de {form.wave_pause_minutes}min entre ondas • Tempo total estimado:{' '}
                      <span className="font-medium text-foreground">
                        {(() => {
                          const waves = Math.ceil(recipientCount / form.wave_size);
                          const sendTimeMin = Math.ceil((form.wave_size * (form.delay_between_messages_ms / 1000)) / 60);
                          const totalMin = (waves * sendTimeMin) + ((waves - 1) * form.wave_pause_minutes);
                          const h = Math.floor(totalMin / 60);
                          const m = totalMin % 60;
                          return h > 0 ? `~${h}h ${m}min` : `~${m}min`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Agendamento</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('schedule_type', 'now')}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                        form.schedule_type === 'now'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <p className="text-sm font-medium">Enviar agora</p>
                      <p className="text-xs text-muted-foreground">Inicia imediatamente ao confirmar</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField('schedule_type', 'scheduled')}
                      className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                        form.schedule_type === 'scheduled'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <p className="text-sm font-medium">Agendar</p>
                      <p className="text-xs text-muted-foreground">Programa para data/hora especifica</p>
                    </button>
                  </div>
                </div>

                {form.schedule_type === 'scheduled' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Data e Hora *</label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => updateField('scheduled_at', e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="max-w-[280px]"
                    />
                  </div>
                )}
              </div>
            </div>
            );
          })()}

          {/* Step 4: Revisao */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <CardTitle className="mb-1">Revisão Final</CardTitle>
                <CardDescription>
                  Confira todas as configurações antes de {isEditing ? 'salvar' : 'criar'} a campanha.
                </CardDescription>
              </div>

              {/* Envio de Teste */}
              {form.provider_type === 'waha' && form.session_id && form.message_text && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Send className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Enviar Teste</span>
                      <span className="text-xs text-muted-foreground">- Envie a mensagem para um número antes de disparar para todos</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="5513999999999"
                        id="test-phone"
                        className="max-w-[220px] bg-white"
                      />
                      <Input
                        placeholder="Nome teste"
                        id="test-name"
                        defaultValue="Teste"
                        className="max-w-[160px] bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={async () => {
                          const phoneEl = document.getElementById('test-phone') as HTMLInputElement;
                          const nameEl = document.getElementById('test-name') as HTMLInputElement;
                          const phone = phoneEl?.value?.replace(/\D/g, '');
                          const name = nameEl?.value || 'Teste';

                          if (!phone || phone.length < 10) {
                            toast.error('Informe um número válido (ex: 5513999999999)');
                            return;
                          }

                          const session = sessions.find((s) => s.id === form.session_id);
                          if (!session) {
                            toast.error('Sessão não encontrada');
                            return;
                          }

                          // Substituir placeholders
                          let text = form.message_text
                            .replace(/\{nome\}/gi, name)
                            .replace(/\{telefone\}/gi, phone);

                          toast.loading('Enviando teste...', { id: 'test-send' });

                          try {
                            // Buscar config WAHA do tenant (mt_waha_config)
                            const { data: wahaConfig } = await supabase
                              .from('mt_waha_config')
                              .select('api_url, api_key')
                              .eq('is_active', true)
                              .limit(1)
                              .single();

                            if (!wahaConfig?.api_url) {
                              toast.error('Configuração WAHA não encontrada. Verifique em Configurações > WhatsApp.', { id: 'test-send' });
                              return;
                            }

                            const chatId = `${phone}@c.us`;
                            let apiUrl: string;
                            let body: Record<string, unknown>;

                            if (form.media_url) {
                              const caption = form.send_text_separate ? '' : text;
                              if (form.message_type === 'image') {
                                apiUrl = `${wahaConfig.api_url}/api/sendImage`;
                                body = { chatId, session: session.session_name, file: { url: form.media_url, mimetype: 'image/jpeg' }, caption };
                              } else if (form.message_type === 'video') {
                                apiUrl = `${wahaConfig.api_url}/api/sendVideo`;
                                body = { chatId, session: session.session_name, file: { url: form.media_url, mimetype: 'video/mp4' }, caption };
                              } else {
                                apiUrl = `${wahaConfig.api_url}/api/sendFile`;
                                body = { chatId, session: session.session_name, file: { url: form.media_url }, caption };
                              }
                            } else {
                              apiUrl = `${wahaConfig.api_url}/api/sendText`;
                              body = { chatId, session: session.session_name, text };
                            }

                            const res = await fetch(apiUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Api-Key': wahaConfig.api_key || '',
                              },
                              body: JSON.stringify(body),
                            });

                            if (res.ok) {
                              // Se texto separado, enviar segunda mensagem com o texto
                              if (form.send_text_separate && form.media_url && text) {
                                await new Promise((r) => setTimeout(r, 1500));
                                await fetch(`${wahaConfig.api_url}/api/sendText`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-Api-Key': wahaConfig.api_key || '',
                                  },
                                  body: JSON.stringify({ chatId, session: session.session_name, text }),
                                });
                              }
                              toast.success(`Teste enviado para ${phone}!`, { id: 'test-send' });
                            } else {
                              const err = await res.text();
                              toast.error(`Erro: ${err}`, { id: 'test-send' });
                            }
                          } catch (err: unknown) {
                            toast.error(`Falha: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, { id: 'test-send' });
                          }
                        }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Enviar teste
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados gerais */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dados Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{form.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <Badge
                        variant="outline"
                        className={
                          form.provider_type === 'waha'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }
                      >
                        {form.provider_type === 'waha' ? 'WAHA' : 'Meta API'}
                      </Badge>
                    </div>
                    {form.provider_type === 'waha' && selectedSession && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sessao:</span>
                        <span className="font-medium">
                          {selectedSession.display_name || selectedSession.session_name}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mensagem */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium capitalize">{form.message_type}</span>
                    </div>
                    {form.message_text && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Conteudo:</span>
                        <p className="bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {form.message_text}
                        </p>
                      </div>
                    )}
                    {form.media_url && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Mídia:</span>
                        {form.message_type === 'image' ? (
                          <img
                            src={form.media_url}
                            alt="Preview"
                            className="max-h-32 rounded-md object-contain"
                          />
                        ) : (
                          <span className="font-medium truncate max-w-[200px] block text-xs">{form.media_url.split('/').pop()}</span>
                        )}
                      </div>
                    )}
                    {form.message_type === 'template' && form.template_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Template:</span>
                        <span className="font-medium">{form.template_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Destinatarios */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Destinatarios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedList ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lista:</span>
                          <span className="font-medium">{selectedList.nome}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{selectedList.total_recipients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Validos:</span>
                          <span className="font-medium text-green-600">{selectedList.valid_numbers}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Nenhuma lista selecionada</p>
                    )}
                  </CardContent>
                </Card>

                {/* Configuracao */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Configuracao</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delay:</span>
                      <span className="font-medium">{form.delay_between_messages_ms}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lote:</span>
                      <span className="font-medium">{form.batch_size} msgs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max/min:</span>
                      <span className="font-medium">{form.max_per_minute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frequency cap:</span>
                      <span className="font-medium">
                        {form.frequency_cap_hours > 0 ? `${form.frequency_cap_hours}h` : 'Sem limite'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agendamento:</span>
                      <span className="font-medium">
                        {form.schedule_type === 'now'
                          ? 'Enviar agora'
                          : form.scheduled_at
                          ? new Date(form.scheduled_at).toLocaleString('pt-BR')
                          : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="flex gap-2">
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canAdvance()}>
              Proximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alteracoes' : 'Criar Campanha'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
