import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Bot,
  Power,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
  Settings2,
  Activity,
  Clock,
  Users,
  Zap,
  Shield,
  ScrollText,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ModuleLayout } from '@/components/shared/index';
import { useWhatsAppBotConfigMT } from '@/hooks/multitenant/useWhatsAppBotConfigMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  is_active: z.boolean().default(false),
  auto_respond: z.boolean().default(true),
  system_prompt: z.string().min(10, 'Mínimo 10 caracteres').max(4000, 'Máximo 4000 caracteres'),
  welcome_message: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  fallback_message: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  handoff_message: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  transfer_after_attempts: z.coerce.number().min(1, 'Mínimo 1').max(50, 'Máximo 50'),
  min_confidence_score: z.coerce.number().min(0, 'Mínimo 0').max(1, 'Máximo 1'),
  transfer_on_keywords_text: z.string().optional(),
  openai_api_key: z.string().min(20, 'API key inválida').max(200, 'API key muito longa'),
  openai_model: z.string().min(1, 'Selecione um modelo'),
  openai_temperature: z.coerce.number().min(0, 'Mínimo 0').max(2, 'Máximo 2'),
  openai_max_tokens: z.coerce.number().min(50, 'Mínimo 50').max(4000, 'Máximo 4000'),
  exclude_groups: z.boolean().default(true),
  only_outside_hours: z.boolean().default(false),
  horario_inicio: z.string().optional().or(z.literal('')),
  horario_fim: z.string().optional().or(z.literal('')),
  dias_semana: z.array(z.number()).default([1, 2, 3, 4, 5]),
});

type FormValues = z.infer<typeof formSchema>;

export default function WhatsAppBotConfig() {
  const { tenant } = useTenantContext();
  const { config, isLoading, upsert, toggleActive, resetStats, logs, isLoadingLogs, refetchLogs } = useWhatsAppBotConfigMT();
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('prompts');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_active: false,
      auto_respond: true,
      system_prompt: 'Você é um assistente virtual de atendimento ao cliente. Seja sempre educado, prestativo e objetivo.',
      welcome_message: 'Olá! Sou o assistente virtual. Como posso ajudar você hoje?',
      fallback_message: 'Desculpe, não entendi sua mensagem. Pode reformular de outra forma?',
      handoff_message: 'Vou transferir você para um de nossos atendentes. Aguarde um momento.',
      transfer_after_attempts: 10,
      min_confidence_score: 0.3,
      transfer_on_keywords_text: '',
      openai_api_key: '',
      openai_model: 'gpt-4o-mini',
      openai_temperature: 0.7,
      openai_max_tokens: 500,
      exclude_groups: true,
      only_outside_hours: false,
      horario_inicio: '',
      horario_fim: '',
      dias_semana: [1, 2, 3, 4, 5],
    },
  });

  // Preencher formulário quando config carregar
  useEffect(() => {
    if (config) {
      form.reset({
        is_active: config.is_active,
        auto_respond: config.auto_respond ?? true,
        system_prompt: config.system_prompt || '',
        welcome_message: config.welcome_message || '',
        fallback_message: config.fallback_message || '',
        handoff_message: config.handoff_message || '',
        transfer_after_attempts: config.transfer_after_attempts || 10,
        min_confidence_score: config.min_confidence_score || 0.3,
        transfer_on_keywords_text: config.transfer_on_keywords?.join(', ') || '',
        openai_api_key: config.openai_api_key || '',
        openai_model: config.openai_model || 'gpt-4o-mini',
        openai_temperature: config.openai_temperature ?? 0.7,
        openai_max_tokens: config.openai_max_tokens || 500,
        exclude_groups: config.exclude_groups ?? true,
        only_outside_hours: config.only_outside_hours ?? false,
        horario_inicio: config.horario_inicio || '',
        horario_fim: config.horario_fim || '',
        dias_semana: config.dias_semana || [1, 2, 3, 4, 5],
      });
    }
  }, [config, form]);

  // Salvar configurações
  const onSubmit = async (values: FormValues) => {
    const { transfer_on_keywords_text, ...rest } = values;
    const keywords = transfer_on_keywords_text
      ? transfer_on_keywords_text.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    await upsert.mutateAsync({
      ...rest,
      transfer_on_keywords: keywords.length > 0 ? keywords : undefined,
    });
  };

  // Toggle ativar/desativar
  const handleToggleActive = async () => {
    const newValue = !form.getValues('is_active');
    await toggleActive.mutateAsync(newValue);
    form.setValue('is_active', newValue);
  };

  // Resetar estatísticas
  const handleResetStats = async () => {
    if (confirm('Tem certeza que deseja resetar todas as estatísticas do chatbot?')) {
      await resetStats.mutateAsync();
    }
  };

  // Calcular métricas
  const successRate = config?.total_messages_handled
    ? ((config.successful_resolutions / config.total_messages_handled) * 100).toFixed(1)
    : '0';

  const handoffRate = config?.total_messages_handled
    ? ((config.handoffs_to_human / config.total_messages_handled) * 100).toFixed(1)
    : '0';

  // Status badge para logs
  const getLogStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Aviso</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Configuração do Chatbot IA"
        description="Configure o assistente virtual OpenAI para WhatsApp"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Chatbot IA' },
        ]}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Configuração do Chatbot IA"
      description="Configure o assistente virtual OpenAI para WhatsApp"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Chatbot IA' },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Status Geral */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <div>
                    <CardTitle>Status do Chatbot</CardTitle>
                    <CardDescription>
                      Ative ou desative o assistente virtual
                    </CardDescription>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={handleToggleActive}
                          disabled={toggleActive.isPending}
                        />
                      </FormControl>
                      <Badge variant={field.value ? 'default' : 'secondary'}>
                        {field.value ? (
                          <>
                            <Power className="mr-1 h-3 w-3" />
                            Ativo
                          </>
                        ) : (
                          'Inativo'
                        )}
                      </Badge>
                    </FormItem>
                  )}
                />
              </div>
            </CardHeader>
            <CardContent>
              {form.watch('is_active') ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Chatbot Ativado</AlertTitle>
                  <AlertDescription>
                    O assistente virtual está respondendo automaticamente mensagens no WhatsApp.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chatbot Desativado</AlertTitle>
                  <AlertDescription>
                    Ative o chatbot para começar a responder mensagens automaticamente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Tabs de Configuração */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                <CardTitle>Configurações</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="prompts" className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Prompts</span>
                  </TabsTrigger>
                  <TabsTrigger value="openai" className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">OpenAI</span>
                  </TabsTrigger>
                  <TabsTrigger value="horario" className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Horários</span>
                  </TabsTrigger>
                  <TabsTrigger value="triggers" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Regras</span>
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">Estatísticas</span>
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="flex items-center gap-1">
                    <ScrollText className="h-4 w-4" />
                    <span className="hidden sm:inline">Logs</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Prompts */}
                <TabsContent value="prompts" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="system_prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt do Sistema</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Você é um assistente virtual..." rows={6} className="resize-none" />
                        </FormControl>
                        <FormDescription>
                          Instruções gerais para o comportamento do chatbot (10-4000 caracteres)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="welcome_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Boas-Vindas</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Olá! Como posso ajudar?" rows={2} className="resize-none" />
                        </FormControl>
                        <FormDescription>Primeira mensagem enviada ao usuário (opcional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fallback_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Fallback</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Desculpe, não entendi..." rows={2} className="resize-none" />
                        </FormControl>
                        <FormDescription>Mensagem quando ocorre erro na OpenAI (opcional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="handoff_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Transferência</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Vou transferir você para um atendente..." rows={2} className="resize-none" />
                        </FormControl>
                        <FormDescription>Mensagem enviada ao transferir para humano (opcional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab: OpenAI */}
                <TabsContent value="openai" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="openai_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OpenAI API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showApiKey ? 'text' : 'password'}
                              placeholder="sk-..."
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? '...' : '***'}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>Chave de API da OpenAI (obrigatória)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openai_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo OpenAI</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o modelo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recomendado - Rapido e barato)</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o (Mais inteligente)</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Avancado)</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais barato)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Escolha o modelo de IA para as respostas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="openai_temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.1" min="0" max="2" />
                          </FormControl>
                          <FormDescription>0 = preciso, 2 = criativo</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="openai_max_tokens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Tokens</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="50" min="50" max="4000" />
                          </FormControl>
                          <FormDescription>Tamanho max da resposta</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="auto_respond"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Auto-responder</FormLabel>
                          <FormDescription>Bot responde automaticamente mensagens recebidas</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab: Horários de Atendimento */}
                <TabsContent value="horario" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="only_outside_hours"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Somente fora do horário comercial</FormLabel>
                          <FormDescription>
                            O bot responde apenas quando a equipe não está disponível
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="horario_inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário de início (equipe humana)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} placeholder="09:00" />
                          </FormControl>
                          <FormDescription>
                            Hora que a equipe começa a atender
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="horario_fim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário de término (equipe humana)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} placeholder="18:00" />
                          </FormControl>
                          <FormDescription>
                            Hora que a equipe para de atender
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dias_semana"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias da semana (equipe ativa)</FormLabel>
                        <FormDescription>
                          Selecione os dias em que a equipe humana trabalha. O bot responde nos demais dias.
                        </FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[
                            { value: 0, label: 'Dom' },
                            { value: 1, label: 'Seg' },
                            { value: 2, label: 'Ter' },
                            { value: 3, label: 'Qua' },
                            { value: 4, label: 'Qui' },
                            { value: 5, label: 'Sex' },
                            { value: 6, label: 'Sáb' },
                          ].map((day) => {
                            const isSelected = (field.value || []).includes(day.value);
                            return (
                              <Button
                                key={day.value}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const current = field.value || [];
                                  if (isSelected) {
                                    field.onChange(current.filter((d: number) => d !== day.value));
                                  } else {
                                    field.onChange([...current, day.value].sort());
                                  }
                                }}
                              >
                                {day.label}
                              </Button>
                            );
                          })}
                        </div>
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Como funciona</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                        <li><strong>Bot 24h</strong>: Desative "Somente fora do horário" — o bot responde sempre</li>
                        <li><strong>Bot fora do expediente</strong>: Ative "Somente fora do horário" e defina o horário da equipe — o bot responde antes e depois desse horário</li>
                        <li><strong>Dias não selecionados</strong>: O bot responde o dia inteiro</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* Tab: Regras de Transferência */}
                <TabsContent value="triggers" className="space-y-4 mt-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Regras de Transferência</AlertTitle>
                    <AlertDescription>
                      Configure quando o chatbot deve transferir a conversa para um atendente humano.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="transfer_after_attempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transferir apos N tentativas</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="50" />
                        </FormControl>
                        <FormDescription>
                          Numero maximo de respostas do bot antes de transferir para humano (1-50)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_confidence_score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confidence Score Minimo</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.05" min="0" max="1" />
                        </FormControl>
                        <FormDescription>
                          Se a confianca da resposta ficar abaixo deste valor, transfere para humano (0.0-1.0)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transfer_on_keywords_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keywords de Transferencia</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="falar com atendente, atendimento humano, cancelar"
                            rows={2}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormDescription>
                          Palavras/frases que disparam transferencia automatica (separadas por virgula)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exclude_groups"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Ignorar Grupos</FormLabel>
                          <FormDescription>Bot nao responde em conversas de grupo</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab: Estatísticas */}
                <TabsContent value="stats" className="space-y-4 mt-4">
                  {config ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {(config.total_messages_handled || 0).toLocaleString('pt-BR')}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {config.successful_resolutions || 0} resoluções
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <CardTitle className="text-sm font-medium">Transferências</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                              {config.handoffs_to_human || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{handoffRate}% do total</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-500" />
                              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                              {((config.avg_response_time_ms || 0) / 1000).toFixed(2)}s
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Por resposta</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Separator />

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetStats}
                          disabled={resetStats.isPending}
                        >
                          {resetStats.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetando...</>
                          ) : (
                            <><RotateCcw className="mr-2 h-4 w-4" />Resetar Estatísticas</>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sem Dados</AlertTitle>
                      <AlertDescription>
                        Nenhuma estatística disponível ainda. Ative o chatbot para começar a coletar dados.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Tab: Logs */}
                <TabsContent value="logs" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Últimos 100 logs do chatbot</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchLogs()}>
                      <RotateCcw className="mr-2 h-3 w-3" />
                      Atualizar
                    </Button>
                  </div>

                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : logs.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sem Logs</AlertTitle>
                      <AlertDescription>
                        Nenhum log encontrado. Os logs aparecem quando o chatbot processa mensagens.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {logs.map((log: Record<string, unknown>) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card text-sm"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : log.status === 'error' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : log.status === 'warning' ? (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getLogStatusBadge(log.status)}
                              <Badge variant="outline" className="text-xs">
                                {log.event_type}
                              </Badge>
                              {log.openai_model && (
                                <Badge variant="outline" className="text-xs bg-purple-50">
                                  {log.openai_model}
                                </Badge>
                              )}
                              {log.tokens_used > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {log.tokens_used} tokens
                                </span>
                              )}
                              {log.response_time_ms > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {(log.response_time_ms / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {log.message && (
                              <p className="mt-1 text-muted-foreground truncate">
                                {log.message}
                              </p>
                            )}
                            {log.error_message && (
                              <p className="mt-1 text-red-500 text-xs truncate">
                                {log.error_message}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={upsert.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={upsert.isPending || !form.formState.isDirty}
            >
              {upsert.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Salvar Configurações</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </ModuleLayout>
  );
}
