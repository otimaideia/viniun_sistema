import { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Settings,
  BarChart3,
  Power,
  Save,
  RefreshCw,
  Loader2,
  MessageCircle,
  Users,
  PhoneForwarded,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useChatbotConfigMT,
  useChatbotConversationsMT,
  useChatbotAnalyticsMT
} from '@/hooks/multitenant/useChatbotMT';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { useTenantContext } from '@/contexts/TenantContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Chatbot() {
  const { tenant } = useTenantContext();
  const { isAdmin } = useUserProfileAdapter();
  const { config, isLoading, upsertConfig, toggleActive, isSaving, refetch } = useChatbotConfigMT();
  const { analytics, isLoading: isLoadingAnalytics } = useChatbotAnalyticsMT();
  const { conversations, isLoading: isLoadingConversations } = useChatbotConversationsMT({ limit: 10 });

  const [formData, setFormData] = useState({
    nome: config?.nome || 'Chatbot IA',
    modelo: config?.modelo || 'gpt-4o-mini',
    temperatura: config?.temperatura ?? 0.7,
    max_tokens: config?.max_tokens ?? 1000,
    system_prompt: config?.system_prompt || '',
    welcome_message: config?.welcome_message || '',
    fallback_message: config?.fallback_message || '',
  });

  // Atualizar formData quando config carregar
  useState(() => {
    if (config) {
      setFormData({
        nome: config.nome,
        modelo: config.modelo,
        temperatura: config.temperatura,
        max_tokens: config.max_tokens,
        system_prompt: config.system_prompt,
        welcome_message: config.welcome_message || '',
        fallback_message: config.fallback_message || '',
      });
    }
  });

  const handleSave = async () => {
    await upsertConfig.mutateAsync(formData);
  };

  const handleToggle = async () => {
    if (config) {
      await toggleActive.mutateAsync(!config.is_active);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Chatbot IA
          </h1>
          <p className="text-muted-foreground">
            Configure e monitore seu assistente virtual
            {tenant && <span className="ml-1">- {tenant.nome_fantasia}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          {isAdmin && config && (
            <Button
              variant={config.is_active ? 'destructive' : 'default'}
              onClick={handleToggle}
            >
              <Power className="mr-2 h-4 w-4" />
              {config.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {config && (
        <div className="flex items-center gap-2">
          <Badge variant={config.is_active ? 'default' : 'secondary'} className="gap-1">
            {config.is_active ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Ativo
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Inativo
              </>
            )}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Modelo: {config.modelo}
          </span>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Conversas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold">{analytics.total_conversas}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold">{analytics.conversas_ativas}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transferidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PhoneForwarded className="h-5 w-5 text-amber-600" />
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold">{analytics.conversas_transferidas}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <span className="text-2xl font-bold">{analytics.total_mensagens}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas Recentes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configurações */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Chatbot</CardTitle>
              <CardDescription>
                Configure o comportamento e personalidade do seu assistente virtual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome e Modelo */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Chatbot</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Assistente Virtual"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo de IA</Label>
                  <Select
                    value={formData.modelo}
                    onValueChange={(value) => setFormData({ ...formData, modelo: value })}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recomendado)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Avançado)</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Temperatura e Max Tokens */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Temperatura: {formData.temperatura}</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.temperatura < 0.3 ? 'Focado' : formData.temperatura > 0.7 ? 'Criativo' : 'Balanceado'}
                    </span>
                  </div>
                  <Slider
                    value={[formData.temperatura]}
                    onValueChange={(value) => setFormData({ ...formData, temperatura: value[0] })}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valores mais baixos = respostas mais previsíveis
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Máximo de Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 1000 })}
                    min={100}
                    max={4000}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite de tokens por resposta (100-4000)
                  </p>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="system_prompt">Prompt do Sistema</Label>
                <Textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Você é um assistente virtual especializado em atendimento imobiliário..."
                  rows={5}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Instruções que definem a personalidade e comportamento do chatbot
                </p>
              </div>

              {/* Mensagens Padrão */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                    placeholder="Olá! Sou a assistente virtual. Como posso ajudar?"
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fallback_message">Mensagem de Fallback</Label>
                  <Textarea
                    id="fallback_message"
                    value={formData.fallback_message}
                    onChange={(e) => setFormData({ ...formData, fallback_message: e.target.value })}
                    placeholder="Desculpe, não entendi. Pode reformular sua pergunta?"
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Conversas */}
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Conversas Recentes</CardTitle>
              <CardDescription>
                Últimas interações do chatbot com os usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConversations ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa registrada ainda</p>
                  <p className="text-sm mt-1">
                    As conversas aparecerão aqui quando o chatbot for ativado
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {conv.lead?.nome || 'Visitante'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conv.lead?.telefone || conv.canal}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            conv.status === 'ativa'
                              ? 'default'
                              : conv.status === 'transferida'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {conv.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conv.started_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
