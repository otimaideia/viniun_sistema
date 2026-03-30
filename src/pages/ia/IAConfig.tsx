import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Loader2,
  Save,
  Eye,
  EyeOff,
  BrainCircuit,
  ArrowLeft,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTenantContext } from '@/contexts/TenantContext';
import { useYESiaConfigMT } from '@/hooks/multitenant/useYESiaConfigMT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AI_MODELS_EXTENDED } from '@/types/ai-sales-assistant';
import type { YESiaConfig, AIProvider } from '@/types/ai-sales-assistant';

interface ConfigFormValues {
  assistant_name: string;
  welcome_message: string;
  default_provider: AIProvider;
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  daily_limit_usd: number | null;
  monthly_limit_usd: number | null;
  enable_memory: boolean;
  enable_proactive: boolean;
  enable_knowledge_rag: boolean;
  enable_whatsapp_learning: boolean;
  enable_function_calling: boolean;
  enable_document_processing: boolean;
  enable_audio_transcription: boolean;
  openai_api_key_encrypted: string;
  anthropic_api_key_encrypted: string;
  google_api_key_encrypted: string;
}

export default function IAConfig() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const { config, isLoading, updateConfig, createConfig } = useYESiaConfigMT();

  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { isDirty, isSubmitting } } = useForm<ConfigFormValues>({
    defaultValues: {
      assistant_name: 'YESia',
      welcome_message: '',
      default_provider: 'openai',
      default_model: 'gpt-4o-mini',
      default_temperature: 0.7,
      default_max_tokens: 1000,
      daily_limit_usd: null,
      monthly_limit_usd: null,
      enable_memory: false,
      enable_proactive: false,
      enable_knowledge_rag: false,
      enable_whatsapp_learning: false,
      enable_function_calling: false,
      enable_document_processing: false,
      enable_audio_transcription: false,
      openai_api_key_encrypted: '',
      anthropic_api_key_encrypted: '',
      google_api_key_encrypted: '',
    },
  });

  const selectedProvider = watch('default_provider');
  const availableModels = AI_MODELS_EXTENDED[selectedProvider] || [];

  // Load config into form when available
  useEffect(() => {
    if (config) {
      reset({
        assistant_name: config.assistant_name || 'YESia',
        welcome_message: config.welcome_message || '',
        default_provider: config.default_provider || 'openai',
        default_model: config.default_model || 'gpt-4o-mini',
        default_temperature: config.default_temperature ?? 0.7,
        default_max_tokens: config.default_max_tokens ?? 1000,
        daily_limit_usd: config.daily_limit_usd,
        monthly_limit_usd: config.monthly_limit_usd,
        enable_memory: config.enable_memory ?? false,
        enable_proactive: config.enable_proactive ?? false,
        enable_knowledge_rag: config.enable_knowledge_rag ?? false,
        enable_whatsapp_learning: config.enable_whatsapp_learning ?? false,
        enable_function_calling: config.enable_function_calling ?? false,
        enable_document_processing: config.enable_document_processing ?? false,
        enable_audio_transcription: config.enable_audio_transcription ?? false,
        openai_api_key_encrypted: config.openai_api_key_encrypted || '',
        anthropic_api_key_encrypted: config.anthropic_api_key_encrypted || '',
        google_api_key_encrypted: config.google_api_key_encrypted || '',
      });
    }
  }, [config, reset]);

  // Reset model when provider changes
  useEffect(() => {
    const models = AI_MODELS_EXTENDED[selectedProvider];
    if (models && models.length > 0) {
      const currentModel = watch('default_model');
      const modelExists = models.some((m) => m.value === currentModel);
      if (!modelExists) {
        setValue('default_model', models[0].value);
      }
    }
  }, [selectedProvider, setValue, watch]);

  const onSubmit = async (data: ConfigFormValues) => {
    const payload: Partial<YESiaConfig> = {
      ...data,
      daily_limit_usd: data.daily_limit_usd ? Number(data.daily_limit_usd) : null,
      monthly_limit_usd: data.monthly_limit_usd ? Number(data.monthly_limit_usd) : null,
      default_temperature: Number(data.default_temperature),
      default_max_tokens: Number(data.default_max_tokens),
    };

    if (config) {
      await updateConfig.mutateAsync(payload);
    } else {
      await createConfig.mutateAsync(payload);
    }
  };

  if (isTenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/ia')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              YESia
            </Button>
            <span>/</span>
            <span>Configuracao</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuracao Global da IA
          </h1>
          <p className="text-muted-foreground">
            Defina as configuracoes globais da inteligencia artificial
            {tenant && ` para ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configuracao
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" />
              Identidade do Assistente
            </CardTitle>
            <CardDescription>
              Defina o nome e a mensagem de boas-vindas do assistente IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assistant_name">Nome do Assistente</Label>
                <Input
                  id="assistant_name"
                  placeholder="YESia"
                  {...register('assistant_name')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome_message">Mensagem de Boas-Vindas</Label>
              <Textarea
                id="welcome_message"
                placeholder="Ola! Sou a YESia, sua assistente de IA..."
                rows={3}
                {...register('welcome_message')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Provedor e Modelo */}
        <Card>
          <CardHeader>
            <CardTitle>Provedor e Modelo Padrao</CardTitle>
            <CardDescription>
              Configure o provedor de IA e modelo padrao para novos agentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor Padrao</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(val: AIProvider) => setValue('default_provider', val, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo Padrao</Label>
                <Select
                  value={watch('default_model')}
                  onValueChange={(val) => setValue('default_model', val, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_temperature">Temperatura ({watch('default_temperature')})</Label>
                <Input
                  id="default_temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  {...register('default_temperature')}
                />
                <p className="text-xs text-muted-foreground">
                  0 = Preciso, 1 = Criativo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_max_tokens">Max Tokens</Label>
                <Input
                  id="default_max_tokens"
                  type="number"
                  min="100"
                  max="16000"
                  {...register('default_max_tokens', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limites de Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Limites de Custo</CardTitle>
            <CardDescription>
              Defina limites diarios e mensais para controlar gastos com IA (em USD).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily_limit_usd">Limite Diario (USD)</Label>
                <Input
                  id="daily_limit_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 5.00"
                  {...register('daily_limit_usd', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_limit_usd">Limite Mensal (USD)</Label>
                <Input
                  id="monthly_limit_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 100.00"
                  {...register('monthly_limit_usd', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chaves de API */}
        <Card>
          <CardHeader>
            <CardTitle>Chaves de API</CardTitle>
            <CardDescription>
              Insira as chaves de API dos provedores de IA. As chaves sao armazenadas de forma criptografada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai_api_key_encrypted">Chave OpenAI</Label>
              <div className="relative">
                <Input
                  id="openai_api_key_encrypted"
                  type={showOpenAIKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  {...register('openai_api_key_encrypted')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                >
                  {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anthropic_api_key_encrypted">Chave Anthropic</Label>
              <div className="relative">
                <Input
                  id="anthropic_api_key_encrypted"
                  type={showAnthropicKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  {...register('anthropic_api_key_encrypted')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                >
                  {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google_api_key_encrypted">Chave Google AI</Label>
              <div className="relative">
                <Input
                  id="google_api_key_encrypted"
                  type={showGoogleKey ? 'text' : 'password'}
                  placeholder="AIza..."
                  {...register('google_api_key_encrypted')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                >
                  {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades</CardTitle>
            <CardDescription>
              Habilite ou desabilite funcionalidades da IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'enable_memory' as const, label: 'Memoria de Contexto', desc: 'A IA lembra informacoes de conversas anteriores' },
              { key: 'enable_proactive' as const, label: 'Sugestoes Proativas', desc: 'A IA sugere acoes automaticamente com base em dados' },
              { key: 'enable_knowledge_rag' as const, label: 'Base de Conhecimento (RAG)', desc: 'Busca em documentos e base de conhecimento para respostas' },
              { key: 'enable_whatsapp_learning' as const, label: 'Aprendizado WhatsApp', desc: 'Aprende com conversas do WhatsApp para melhorar respostas' },
              { key: 'enable_function_calling' as const, label: 'Function Calling', desc: 'Permite que a IA execute acoes no sistema' },
              { key: 'enable_document_processing' as const, label: 'Processamento de Documentos', desc: 'Analise e extracao de informacoes de documentos' },
              { key: 'enable_audio_transcription' as const, label: 'Transcricao de Audio', desc: 'Converte audio em texto automaticamente via Whisper' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={watch(item.key)}
                  onCheckedChange={(checked) => setValue(item.key, checked, { shouldDirty: true })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
