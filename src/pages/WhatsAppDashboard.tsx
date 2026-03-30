import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Send,
  Inbox,
  Smartphone,
  Wifi,
  TrendingUp,
  Clock,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  MessageCircle,
  AlertTriangle,
  Settings,
  UserPlus,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ModuleLayout, MiniDashboard, StatItem } from '@/components/shared/index';
import { useWhatsAppSessionsAdapter } from '@/hooks/useWhatsAppSessionsAdapter';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { useWahaConfigAdapter } from '@/hooks/useWahaConfigAdapter';
import { useTenantContext } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Componente de Card de Métrica
const MetricCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}> = ({ title, value, subtitle, icon: Icon, trend, trendValue, className }) => {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de gráfico de barras simples com 3 camadas
const SimpleBarChart: React.FC<{
  data: Array<{ date: string; inbound: number; outbound: number; total: number; conversations?: number; leads?: number }>;
}> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.total), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Recebidas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Enviadas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span>Conversas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span>Leads</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 h-48">
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {/* Indicadores de conversas e leads acima das barras */}
            <div className="flex gap-1 text-[9px] font-medium mb-0.5">
              {(day.conversations ?? 0) > 0 && (
                <span className="text-amber-600" title={`${day.conversations} conversas`}>
                  {day.conversations}
                </span>
              )}
              {(day.leads ?? 0) > 0 && (
                <span className="text-purple-600" title={`${day.leads} leads`}>
                  {day.leads}
                </span>
              )}
            </div>
            <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '120px' }}>
              <div className="flex-1 w-full flex flex-col justify-end gap-0.5">
                <div
                  className="w-full bg-green-500 rounded-t transition-all"
                  style={{ height: `${(day.outbound / maxValue) * 100}%`, minHeight: day.outbound > 0 ? '4px' : '0' }}
                  title={`Enviadas: ${day.outbound}`}
                />
                <div
                  className="w-full bg-blue-500 rounded-b transition-all"
                  style={{ height: `${(day.inbound / maxValue) * 100}%`, minHeight: day.inbound > 0 ? '4px' : '0' }}
                  title={`Recebidas: ${day.inbound}`}
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
              {formatDate(day.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de distribuição por tipo
const MessageTypeDistribution: React.FC<{
  data: Record<string, number>;
}> = ({ data }) => {
  const total = Object.values(data).reduce((acc, val) => acc + val, 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados</p>;
  }

  const typeLabels: Record<string, string> = {
    text: 'Texto',
    image: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    document: 'Documento',
    sticker: 'Figurinha',
    location: 'Localização',
    contact: 'Contato',
    reaction: 'Reação',
    poll: 'Enquete',
    unknown: 'Outro',
  };

  const sortedEntries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-3">
      {sortedEntries.map(([type, count]) => {
        const percentage = Math.round((count / total) * 100);
        return (
          <div key={type} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{typeLabels[type] || type}</span>
              <span className="text-muted-foreground">{count.toLocaleString('pt-BR')} ({percentage}%)</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      })}
    </div>
  );
};

// Função para formatar telefone brasileiro
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return 'Sem telefone';

  if (phone.includes('@lid')) {
    return '💬 Meta (Instagram/Facebook)';
  }

  let cleaned = phone.replace(/@.*$/, '');
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return phone;
  }

  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }

  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 7);
    const part2 = cleaned.slice(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  }

  return phone;
};

// Componente de Top Contatos
const TopContactsList: React.FC<{
  contacts: Array<{ id: string; contact_name: string; contact_phone: string; message_count: number; lead_id?: string | null }>;
}> = ({ contacts }) => {
  const navigate = useNavigate();

  if (contacts.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>;
  }

  return (
    <div className="space-y-3">
      {contacts.slice(0, 5).map((contact, index) => (
        <div key={contact.id} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium flex-shrink-0">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">
                  {contact.contact_name || 'Sem nome'}
                </p>
                {contact.lead_id && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-purple-50 text-purple-700 border-purple-200">
                    Lead
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {formatPhoneNumber(contact.contact_phone)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="whitespace-nowrap">
              {contact.message_count.toLocaleString('pt-BR')} msgs
            </Badge>
            <button
              onClick={() => navigate(`/whatsapp/conversas?id=${contact.id}`)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors"
              title="Abrir conversa"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de Ranking de Sessões
const SessionRankingList: React.FC<{
  sessions: Array<{
    id: string;
    session_name: string;
    nome: string;
    status: string;
    conversations_count: number;
    messages_count: number;
  }>;
}> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada</p>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-500 text-xs">Online</Badge>;
      case 'stopped':
        return <Badge variant="secondary" className="text-xs">Offline</Badge>;
      case 'starting':
        return <Badge className="bg-yellow-500 text-xs">Conectando</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {sessions.map((session, index) => (
        <div key={session.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold flex-shrink-0",
              index === 0 ? "bg-yellow-500 text-white" :
              index === 1 ? "bg-gray-400 text-white" :
              index === 2 ? "bg-orange-600 text-white" : "bg-primary/10"
            )}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {session.nome || session.session_name}
                </p>
                {getStatusBadge(session.status)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-sm font-medium text-green-600">
              {session.conversations_count.toLocaleString('pt-BR')} conversas
            </span>
            <span className="text-xs text-muted-foreground">
              {session.messages_count.toLocaleString('pt-BR')} msgs
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Loading skeleton
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function WhatsAppDashboard() {
  const navigate = useNavigate();
  const { isUnidade, unidadeId } = useUserProfileAdapter();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { sessions: sessoes, isLoading: loadingSessoes } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);

  // Carregar configuração WAHA do banco de dados para inicializar o wahaApi
  const { config: wahaConfig, isLoading: loadingConfig } = useWahaConfigAdapter();

  // Verificar se WAHA está configurado
  const isWahaConfigured = !!(wahaConfig?.api_url && wahaConfig?.api_key);

  // Buscar métricas via RPC server-side (evita limite de 1000 linhas do PostgREST)
  const { data: metrics, isLoading: loadingMetrics, refetch } = useQuery({
    queryKey: ['whatsapp_dashboard_metrics', tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        console.warn('[Dashboard] Tenant não carregado');
        return null;
      }

      const params: { p_tenant_id?: string; p_franchise_id?: string } = {};

      if (accessLevel === 'tenant' && tenant) {
        params.p_tenant_id = tenant.id;
      } else if (accessLevel === 'franchise' && franchise) {
        params.p_tenant_id = tenant?.id;
        params.p_franchise_id = franchise.id;
      }
      // platform: sem filtro = todos os dados

      const { data, error } = await supabase.rpc('get_whatsapp_dashboard_stats', params);

      if (error) {
        console.error('[Dashboard] Erro ao buscar métricas:', error);
        throw error;
      }

      console.log('[Dashboard] Métricas carregadas via RPC:', {
        totalMessages: data?.totalMessages,
        totalConversations: data?.totalConversations,
        todayMessages: data?.todayMessages,
        todayConversations: data?.todayConversations,
      });

      return {
        ...data,
        totalSessions: sessoes.length,
        connectedSessions: sessoes.filter(s => s.status === 'working' || s.status === 'connected').length,
      };
    },
    enabled: !loadingSessoes && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const isLoading = loadingSessoes || loadingMetrics || loadingConfig || isTenantLoading;

  // Stats for MiniDashboard
  const stats: StatItem[] = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: 'Mensagens Hoje',
        value: metrics.todayMessages,
        icon: MessageSquare,
        color: 'primary' as const,
      },
      {
        label: 'Conversas Hoje',
        value: metrics.todayConversations,
        icon: MessageCircle,
        color: 'success' as const,
      },
      {
        label: 'Leads (WhatsApp)',
        value: metrics.leadsFromWhatsapp || 0,
        icon: UserPlus,
        color: 'warning' as const,
      },
      {
        label: 'Sessões Conectadas',
        value: `${metrics.connectedSessions}/${metrics.totalSessions}`,
        icon: Wifi,
        color: 'info' as const,
      },
    ];
  }, [metrics]);

  if (isLoading) {
    return (
      <ModuleLayout
        title="Dashboard WhatsApp"
        description="Métricas e analytics das conversas"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Dashboard' },
        ]}
      >
        <DashboardSkeleton />
      </ModuleLayout>
    );
  }

  if (!metrics) {
    return (
      <ModuleLayout
        title="Dashboard WhatsApp"
        description="Métricas e analytics das conversas"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Dashboard' },
        ]}
      >
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Não foi possível carregar as métricas.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  // Calcular tendências de mensagens
  const trend = metrics.dailyTrend || [];
  const todayTrendTotal = trend[trend.length - 1]?.total || 0;
  const yesterdayTrendTotal = trend[trend.length - 2]?.total || 0;
  const messagesTrend = todayTrendTotal > yesterdayTrendTotal ? 'up' : todayTrendTotal < yesterdayTrendTotal ? 'down' : 'neutral';
  const trendPercentage = yesterdayTrendTotal > 0
    ? Math.abs(Math.round(((todayTrendTotal - yesterdayTrendTotal) / yesterdayTrendTotal) * 100))
    : 0;

  return (
    <ModuleLayout
      title="Dashboard WhatsApp"
      description="Métricas e analytics das conversas"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Dashboard' },
      ]}
      actions={
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      {/* Alerta se WAHA não está configurado */}
      {!isWahaConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>WAHA não configurado</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Configure a integração com o servidor WAHA para habilitar o envio e recebimento de mensagens.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => navigate('/configuracoes')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Mini Dashboard */}
      <MiniDashboard stats={stats} />

      {/* Seção: MENSAGENS */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensagens
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Mensagens Hoje"
            value={metrics.todayMessages}
            subtitle={`${metrics.inboundMessages > 0 ? Math.round((metrics.outboundMessages / metrics.totalMessages) * 100) : 0}% enviadas`}
            icon={MessageSquare}
            trend={messagesTrend}
            trendValue={trendPercentage > 0 ? `${trendPercentage}% vs ontem` : 'Igual a ontem'}
          />
          <MetricCard
            title="Mensagens 7 dias"
            value={metrics.weekMessages}
            subtitle={`${metrics.monthMessages.toLocaleString('pt-BR')} no mês`}
            icon={Clock}
          />
          <MetricCard
            title="Total de Mensagens"
            value={metrics.totalMessages}
            subtitle={`${metrics.inboundMessages.toLocaleString('pt-BR')} recebidas | ${metrics.outboundMessages.toLocaleString('pt-BR')} enviadas`}
            icon={BarChart3}
          />
          <MetricCard
            title="Sessões Conectadas"
            value={`${metrics.connectedSessions}/${metrics.totalSessions}`}
            subtitle="Online agora"
            icon={Wifi}
          />
        </div>
      </div>

      {/* Seção: CONVERSAS */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Conversas
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Conversas Hoje"
            value={metrics.todayConversations}
            subtitle="Com mensagens hoje"
            icon={MessageCircle}
          />
          <MetricCard
            title="Conversas 7 dias"
            value={metrics.weekConversations || 0}
            subtitle="Com mensagens na semana"
            icon={TrendingUp}
          />
          <MetricCard
            title="Total de Conversas"
            value={metrics.totalConversations}
            subtitle={`${metrics.conversationsWithLead || 0} vinculadas a lead`}
            icon={Users}
          />
          <MetricCard
            title="Conversas Ativas"
            value={metrics.activeConversations}
            subtitle="Atualizadas em 7 dias"
            icon={Clock}
          />
        </div>
      </div>

      {/* Seção: LEADS */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Leads
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Leads Hoje"
            value={metrics.todayLeads || 0}
            subtitle="Criados hoje"
            icon={UserPlus}
          />
          <MetricCard
            title="Leads 7 dias"
            value={metrics.weekLeads || 0}
            subtitle={`${metrics.monthLeads?.toLocaleString('pt-BR') || 0} no mês`}
            icon={Clock}
          />
          <MetricCard
            title="Total de Leads"
            value={metrics.totalLeads || 0}
            subtitle={`${metrics.leadsFromWhatsapp || 0} originados do WhatsApp`}
            icon={Users}
          />
          <MetricCard
            title="Conversas com Lead"
            value={metrics.conversationsWithLead || 0}
            subtitle={`${metrics.totalConversations > 0 ? Math.round(((metrics.conversationsWithLead || 0) / metrics.totalConversations) * 100) : 0}% das conversas`}
            icon={Link2}
          />
        </div>
      </div>

        {/* Seção de recebidas vs enviadas */}
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensagens Recebidas</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.inboundMessages.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-3">
                  <Inbox className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <Progress
                value={(metrics.inboundMessages / Math.max(metrics.totalMessages, 1)) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((metrics.inboundMessages / Math.max(metrics.totalMessages, 1)) * 100)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensagens Enviadas</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.outboundMessages.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <Progress
                value={(metrics.outboundMessages / Math.max(metrics.totalMessages, 1)) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((metrics.outboundMessages / Math.max(metrics.totalMessages, 1)) * 100)}% do total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mensagens por Dia
              </CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={metrics.dailyTrend || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Tipos de Mensagem
              </CardTitle>
              <CardDescription>Distribuição por formato</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageTypeDistribution data={metrics.messagesByType || {}} />
            </CardContent>
          </Card>
        </div>

        {/* Ranking de Sessões, Top Contatos e Info de Sessões */}
        <div className="grid gap-4 lg:grid-cols-3 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ranking de Sessões
              </CardTitle>
              <CardDescription>Por número de conversas</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionRankingList sessions={metrics.sessionRanking || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Contatos
              </CardTitle>
              <CardDescription>Contatos com mais mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <TopContactsList contacts={metrics.topContacts || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Resumo Geral
              </CardTitle>
              <CardDescription>Visão consolidada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sessões */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessões</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conectadas / Total</span>
                  <Badge className="bg-green-500">{metrics.connectedSessions}/{metrics.totalSessions}</Badge>
                </div>
                <hr />
                {/* Mensagens */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagens</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <Badge variant="outline">{metrics.totalMessages.toLocaleString('pt-BR')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recebidas / Enviadas</span>
                  <span className="text-xs text-muted-foreground">
                    {metrics.inboundMessages.toLocaleString('pt-BR')} / {metrics.outboundMessages.toLocaleString('pt-BR')}
                  </span>
                </div>
                <hr />
                {/* Conversas */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversas</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <Badge variant="outline">{metrics.totalConversations.toLocaleString('pt-BR')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Com mensagens (7d)</span>
                  <Badge variant="outline">{(metrics.weekConversations || 0).toLocaleString('pt-BR')}</Badge>
                </div>
                <hr />
                {/* Leads */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leads</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <Badge variant="outline">{(metrics.totalLeads || 0).toLocaleString('pt-BR')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Do WhatsApp</span>
                  <Badge className="bg-purple-500">{(metrics.leadsFromWhatsapp || 0).toLocaleString('pt-BR')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conversas com lead</span>
                  <Badge variant="outline">{(metrics.conversationsWithLead || 0).toLocaleString('pt-BR')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/whatsapp/sessoes')}>
                <Smartphone className="mr-2 h-4 w-4" />
                Gerenciar Sessões
              </Button>
              <Button variant="outline" onClick={() => navigate('/whatsapp/conversas')}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Abrir Chat
              </Button>
              <Button variant="outline" onClick={() => navigate('/whatsapp/automacoes')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Automações
              </Button>
              <Button variant="outline" onClick={() => navigate('/whatsapp/configuracoes')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
    </ModuleLayout>
  );
}
