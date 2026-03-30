import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  Save,
  Loader2,
  ArrowLeft,
  X,
  Plus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAIAgentsMT, useAIAgentMT } from '@/hooks/multitenant/useAIAgentsMT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { AI_MODELS } from '@/types/ai-agent';
import { AI_DOMAINS } from '@/types/ai-sales-assistant';

interface AgentFormValues {
  nome: string;
  codigo: string;
  descricao: string;
  icone: string;
  cor: string;
  tipo: 'assistant' | 'quality';
  domain: string;
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  context_instructions: string;
  output_format: 'suggestions' | 'analysis' | 'both';
  routing_priority: number;
  is_active: boolean;
}

export default function AIAgentEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const { create, update } = useAIAgentsMT();
  const { data: existingAgent, isLoading: isAgentLoading } = useAIAgentMT(id);

  const [routingKeywords, setRoutingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const { register, handleSubmit, watch, setValue, reset, formState: { isDirty, isSubmitting } } = useForm<AgentFormValues>({
    defaultValues: {
      nome: '',
      codigo: '',
      descricao: '',
      icone: 'Bot',
      cor: '#6366f1',
      tipo: 'assistant',
      domain: '',
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: '',
      context_instructions: '',
      output_format: 'suggestions',
      routing_priority: 50,
      is_active: true,
    },
  });

  const selectedProvider = watch('provider');
  const availableModels = AI_MODELS[selectedProvider] || [];

  // Load existing agent into form
  useEffect(() => {
    if (existingAgent) {
      const extAgent = existingAgent as any;
      reset({
        nome: existingAgent.nome || '',
        codigo: existingAgent.codigo || '',
        descricao: existingAgent.descricao || '',
        icone: existingAgent.icone || 'Bot',
        cor: existingAgent.cor || '#6366f1',
        tipo: existingAgent.tipo || 'assistant',
        domain: extAgent.domain || '',
        provider: existingAgent.provider || 'openai',
        model: existingAgent.model || 'gpt-4o-mini',
        temperature: existingAgent.temperature ?? 0.7,
        max_tokens: existingAgent.max_tokens ?? 1000,
        system_prompt: existingAgent.system_prompt || '',
        context_instructions: existingAgent.context_instructions || '',
        output_format: existingAgent.output_format || 'suggestions',
        routing_priority: extAgent.routing_priority ?? 50,
        is_active: existingAgent.is_active ?? true,
      });
      setRoutingKeywords(extAgent.routing_keywords || []);
    }
  }, [existingAgent, reset]);

  // Reset model when provider changes
  useEffect(() => {
    const models = AI_MODELS[selectedProvider];
    if (models && models.length > 0) {
      const currentModel = watch('model');
      const modelExists = models.some((m) => m.value === currentModel);
      if (!modelExists) {
        setValue('model', models[0].value);
      }
    }
  }, [selectedProvider, setValue, watch]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !routingKeywords.includes(trimmed)) {
      setRoutingKeywords([...routingKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setRoutingKeywords(routingKeywords.filter((k) => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const onSubmit = async (data: AgentFormValues) => {
    const payload: any = {
      ...data,
      temperature: Number(data.temperature),
      max_tokens: Number(data.max_tokens),
      routing_priority: Number(data.routing_priority),
      routing_keywords: routingKeywords,
    };

    if (isEditing && id) {
      await update.mutateAsync({ id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }

    navigate('/ia/agentes');
  };

  if (isTenantLoading || (isEditing && isAgentLoading)) {
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/ia/agentes')}>
              Agentes
            </Button>
            <span>/</span>
            <span>{isEditing ? 'Editar' : 'Novo'}</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            {isEditing ? `Editar Agente: ${existingAgent?.nome || ''}` : 'Novo Agente de IA'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Edite as configuracoes do agente' : 'Configure um novo agente de inteligencia artificial'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/ia/agentes')}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Salvar' : 'Criar Agente'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informacoes Basicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Basicas</CardTitle>
            <CardDescription>Defina nome, codigo e aparencia do agente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: SDR Qualificador"
                  {...register('nome', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo *</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: sdr_qualificador"
                  {...register('codigo', { required: true })}
                />
                <p className="text-xs text-muted-foreground">Identificador unico (snake_case)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o que este agente faz..."
                rows={2}
                {...register('descricao')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="icone">Icone (Lucide)</Label>
                <Input
                  id="icone"
                  placeholder="Bot"
                  {...register('icone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor"
                    type="color"
                    className="w-12 h-9 p-1"
                    {...register('cor')}
                  />
                  <Input
                    placeholder="#6366f1"
                    {...register('cor')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={watch('tipo')}
                  onValueChange={(val: 'assistant' | 'quality') => setValue('tipo', val, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant">Assistente</SelectItem>
                    <SelectItem value="quality">Qualidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dominio</Label>
              <Select
                value={watch('domain')}
                onValueChange={(val) => setValue('domain', val, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dominio" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_DOMAINS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Modelo de IA */}
        <Card>
          <CardHeader>
            <CardTitle>Modelo de IA</CardTitle>
            <CardDescription>Configure o provedor, modelo e parametros de geracao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={(val: 'openai' | 'anthropic') => setValue('provider', val, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={watch('model')}
                  onValueChange={(val) => setValue('model', val, { shouldDirty: true })}
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
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura ({watch('temperature')})</Label>
                <Input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  {...register('temperature')}
                />
                <p className="text-xs text-muted-foreground">0 = Preciso, 1 = Criativo</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  min="100"
                  max="16000"
                  {...register('max_tokens', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Formato de Saida</Label>
                <Select
                  value={watch('output_format')}
                  onValueChange={(val: 'suggestions' | 'analysis' | 'both') => setValue('output_format', val, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestions">Sugestoes</SelectItem>
                    <SelectItem value="analysis">Analise</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prompts */}
        <Card>
          <CardHeader>
            <CardTitle>Prompts</CardTitle>
            <CardDescription>
              Defina as instrucoes de comportamento do agente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system_prompt">System Prompt *</Label>
              <Textarea
                id="system_prompt"
                placeholder="Voce e um assistente especializado em..."
                rows={6}
                {...register('system_prompt', { required: true })}
              />
              <p className="text-xs text-muted-foreground">
                Instrucoes principais que definem o comportamento do agente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="context_instructions">Instrucoes de Contexto</Label>
              <Textarea
                id="context_instructions"
                placeholder="Contexto adicional sobre a empresa, servicos, etc."
                rows={4}
                {...register('context_instructions')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Roteamento */}
        <Card>
          <CardHeader>
            <CardTitle>Roteamento</CardTitle>
            <CardDescription>
              Configure palavras-chave e prioridade para roteamento automatico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Palavras-chave de Roteamento</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite e pressione Enter..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {routingKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {routingKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="routing_priority">Prioridade de Roteamento</Label>
                <Input
                  id="routing_priority"
                  type="number"
                  min="0"
                  max="100"
                  {...register('routing_priority', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  0 = menor prioridade, 100 = maior prioridade
                </p>
              </div>
              <div className="flex items-center justify-between pt-6">
                <div>
                  <Label>Ativo</Label>
                  <p className="text-xs text-muted-foreground">O agente esta disponivel para uso</p>
                </div>
                <Switch
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked, { shouldDirty: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
