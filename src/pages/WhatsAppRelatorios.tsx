import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Users,
  Clock,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Send,
  Inbox,
  PieChart,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleLayout, StatItem } from '@/components/shared/index';
import { useWhatsAppSessionsAdapter } from '@/hooks/useWhatsAppSessionsAdapter';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { useTenantContext } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
interface DailyStats {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
}

interface SessionStats {
  id: string;
  nome: string;
  session_name: string;
  status: string;
  conversations: number;
  messages: number;
  inbound: number;
  outbound: number;
}

// Componente de gráfico de barras
const BarChart: React.FC<{ data: DailyStats[]; height?: number }> = ({ data, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Recebidas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Enviadas</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center gap-0.5" style={{ height: height - 20 }}>
              <div className="flex-1 w-full flex flex-col justify-end gap-0.5">
                <div
                  className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                  style={{ height: `${(day.outbound / maxValue) * 100}%`, minHeight: day.outbound > 0 ? '4px' : '0' }}
                  title={`Enviadas: ${day.outbound}`}
                />
                <div
                  className="w-full bg-blue-500 rounded-b transition-all hover:bg-blue-600"
                  style={{ height: `${(day.inbound / maxValue) * 100}%`, minHeight: day.inbound > 0 ? '4px' : '0' }}
                  title={`Recebidas: ${day.inbound}`}
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
              {format(new Date(day.date), 'dd/MM', { locale: ptBR })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de card de métrica
const MetricCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}> = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) => {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <Card>
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
          <div className={cn('rounded-lg p-3', `bg-${color}/10`)}>
            <Icon className={cn('h-6 w-6', `text-${color}`)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de distribuição por tipo
const TypeDistribution: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const total = Object.values(data).reduce((acc, val) => acc + val, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">Sem dados</p>;

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

  const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

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

// Tabela de ranking de sessões
const SessionRankingTable: React.FC<{ sessions: SessionStats[] }> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão encontrada</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Sessão</th>
            <th className="text-center py-2 px-2">Status</th>
            <th className="text-right py-2 px-2">Conversas</th>
            <th className="text-right py-2 px-2">Recebidas</th>
            <th className="text-right py-2 px-2">Enviadas</th>
            <th className="text-right py-2 px-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr key={session.id} className="border-b hover:bg-muted/50">
              <td className="py-2 px-2">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  index === 0 ? "bg-yellow-500 text-white" :
                  index === 1 ? "bg-gray-400 text-white" :
                  index === 2 ? "bg-orange-600 text-white" : "bg-muted"
                )}>
                  {index + 1}
                </div>
              </td>
              <td className="py-2 px-2 font-medium">{session.nome || session.session_name}</td>
              <td className="py-2 px-2 text-center">
                <Badge className={cn(
                  session.status === 'working' ? 'bg-green-500' :
                  session.status === 'stopped' ? 'bg-gray-500' : 'bg-yellow-500'
                )}>
                  {session.status === 'working' ? 'Online' : session.status === 'stopped' ? 'Offline' : session.status}
                </Badge>
              </td>
              <td className="py-2 px-2 text-right">{session.conversations.toLocaleString('pt-BR')}</td>
              <td className="py-2 px-2 text-right text-blue-600">{session.inbound.toLocaleString('pt-BR')}</td>
              <td className="py-2 px-2 text-right text-green-600">{session.outbound.toLocaleString('pt-BR')}</td>
              <td className="py-2 px-2 text-right font-medium">{session.messages.toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Loading skeleton
const ReportsSkeleton: React.FC = () => (
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
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  </div>
);

export default function WhatsAppRelatorios() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { isUnidade, unidadeId } = useUserProfileAdapter();
  const { sessions: sessoes, isLoading: loadingSessoes } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);

  const [periodo, setPeriodo] = useState<'7d' | '15d' | '30d' | '90d'>('30d');
  const [sessaoFilter, setSessaoFilter] = useState<string>('all');

  // Buscar métricas de relatório
  const { data: reportData, isLoading: loadingReport, refetch } = useQuery({
    queryKey: ['whatsapp_reports', periodo, sessaoFilter, tenant?.id],
    queryFn: async () => {
      const now = new Date();
      const days = parseInt(periodo);
      const startDate = subDays(now, days).toISOString();

      // Filtro de sessão
      let sessaoIds = sessoes.map(s => s.id);
      if (sessaoFilter !== 'all') {
        sessaoIds = [sessaoFilter];
      }

      // Buscar conversas
      let conversasQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id, session_id, contact_phone, contact_name, updated_at, status');

      if (sessaoIds.length > 0) {
        conversasQuery = conversasQuery.in('session_id', sessaoIds);
      }

      if (accessLevel === 'tenant' && tenant) {
        conversasQuery = conversasQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        conversasQuery = conversasQuery.eq('franchise_id', franchise.id);
      }

      const { data: conversas } = await conversasQuery;

      // Buscar mensagens do período (usando colunas MT: from_me, tipo)
      let mensagensQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id, conversation_id, from_me, tipo, created_at')
        .gte('created_at', startDate);

      if (accessLevel === 'tenant' && tenant) {
        mensagensQuery = mensagensQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        mensagensQuery = mensagensQuery.eq('franchise_id', franchise.id);
      }

      const { data: mensagens } = await mensagensQuery;

      const allConversas = conversas || [];
      const allMensagens = (mensagens || []).filter(m => {
        const conversa = allConversas.find(c => c.id === m.conversation_id);
        return conversa !== undefined;
      });

      // Calcular métricas gerais (from_me: false=recebida, true=enviada)
      const totalMessages = allMensagens.length;
      const inboundMessages = allMensagens.filter(m => m.from_me === false).length;
      const outboundMessages = allMensagens.filter(m => m.from_me === true).length;

      // Métricas diárias
      const dailyStats: DailyStats[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayMessages = allMensagens.filter(m => m.created_at?.startsWith(dateStr));
        dailyStats.push({
          date: dateStr,
          inbound: dayMessages.filter(m => m.from_me === false).length,
          outbound: dayMessages.filter(m => m.from_me === true).length,
          total: dayMessages.length,
        });
      }

      // Tipos de mensagem (usando coluna 'tipo')
      const messagesByType: Record<string, number> = {};
      allMensagens.forEach(m => {
        const tipo = m.tipo || 'text';
        messagesByType[tipo] = (messagesByType[tipo] || 0) + 1;
      });

      // Métricas por sessão (usando colunas MT: session_id, conversation_id)
      const sessionStats: SessionStats[] = sessoes.map(s => {
        const sessionConversas = allConversas.filter(c => c.session_id === s.id);
        const conversaIds = new Set(sessionConversas.map(c => c.id));
        const sessionMsgs = allMensagens.filter(m => conversaIds.has(m.conversation_id));

        return {
          id: s.id,
          nome: s.nome,
          session_name: s.session_name,
          status: s.status,
          conversations: sessionConversas.length,
          messages: sessionMsgs.length,
          inbound: sessionMsgs.filter(m => m.from_me === false).length,
          outbound: sessionMsgs.filter(m => m.from_me === true).length,
        };
      }).sort((a, b) => b.messages - a.messages);

      // Horários de pico
      const hourlyDistribution: Record<number, number> = {};
      allMensagens.forEach(m => {
        if (m.created_at) {
          const hour = new Date(m.created_at).getHours();
          hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        }
      });

      // Média diária
      const avgDaily = Math.round(totalMessages / days);

      // Calcular tendência (últimos 7 dias vs 7 dias anteriores)
      const last7 = dailyStats.slice(-7).reduce((sum, d) => sum + d.total, 0);
      const prev7 = dailyStats.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);
      const trend = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

      return {
        totalMessages,
        inboundMessages,
        outboundMessages,
        totalConversations: allConversas.length,
        activeConversations: new Set(allMensagens.map(m => m.conversation_id)).size,
        dailyStats,
        messagesByType,
        sessionStats,
        hourlyDistribution,
        avgDaily,
        trend,
        periodo: days,
      };
    },
    enabled: !loadingSessoes && sessoes.length > 0,
    staleTime: 60000,
  });

  const isLoading = loadingSessoes || loadingReport;

  // Exportar dados
  const handleExport = () => {
    if (!reportData) return;

    const csvContent = [
      ['Data', 'Recebidas', 'Enviadas', 'Total'],
      ...reportData.dailyStats.map(d => [d.date, d.inbound, d.outbound, d.total]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `whatsapp-relatorio-${periodo}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Relatórios WhatsApp"
        description="Análise detalhada de mensagens e conversas"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Relatórios' },
        ]}
      >
        <ReportsSkeleton />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Relatórios WhatsApp"
      description="Análise detalhada de mensagens e conversas"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Relatórios' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!reportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      }
    >
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="15d">Últimos 15 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sessaoFilter} onValueChange={setSessaoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as sessões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as sessões</SelectItem>
                  {sessoes.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome || s.session_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData ? (
        <>
          {/* Cards de métricas principais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard
              title="Total de Mensagens"
              value={reportData.totalMessages}
              subtitle={`Média de ${reportData.avgDaily}/dia`}
              icon={MessageSquare}
              trend={reportData.trend > 0 ? 'up' : reportData.trend < 0 ? 'down' : 'neutral'}
              trendValue={`${Math.abs(reportData.trend)}% vs período anterior`}
            />
            <MetricCard
              title="Mensagens Recebidas"
              value={reportData.inboundMessages}
              subtitle={`${Math.round((reportData.inboundMessages / Math.max(reportData.totalMessages, 1)) * 100)}% do total`}
              icon={Inbox}
              color="blue-600"
            />
            <MetricCard
              title="Mensagens Enviadas"
              value={reportData.outboundMessages}
              subtitle={`${Math.round((reportData.outboundMessages / Math.max(reportData.totalMessages, 1)) * 100)}% do total`}
              icon={Send}
              color="green-600"
            />
            <MetricCard
              title="Conversas Ativas"
              value={reportData.activeConversations}
              subtitle={`De ${reportData.totalConversations} total`}
              icon={Users}
              color="purple-600"
            />
          </div>

          {/* Gráfico de mensagens por dia */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mensagens por Dia
              </CardTitle>
              <CardDescription>
                Volume de mensagens nos últimos {reportData.periodo} dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart data={reportData.dailyStats} height={250} />
            </CardContent>
          </Card>

          {/* Grid de detalhes */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Tipos de mensagem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Tipos de Mensagem
                </CardTitle>
                <CardDescription>Distribuição por formato</CardDescription>
              </CardHeader>
              <CardContent>
                <TypeDistribution data={reportData.messagesByType} />
              </CardContent>
            </Card>

            {/* Horários de pico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários de Pico
                </CardTitle>
                <CardDescription>Distribuição por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(reportData.hourlyDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([hour, count]) => {
                      const maxCount = Math.max(...Object.values(reportData.hourlyDistribution));
                      const percentage = Math.round((count / maxCount) * 100);
                      return (
                        <div key={hour} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{hour}:00 - {hour}:59</span>
                            <span className="text-muted-foreground">{count} mensagens</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de sessões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ranking de Sessões
              </CardTitle>
              <CardDescription>Performance por sessão WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionRankingTable sessions={reportData.sessionStats} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sem dados para exibir</h3>
            <p className="text-muted-foreground mb-4">
              Não há mensagens registradas no período selecionado.
            </p>
            <Button variant="outline" onClick={() => navigate('/whatsapp/sessoes')}>
              Configurar Sessões
            </Button>
          </CardContent>
        </Card>
      )}
    </ModuleLayout>
  );
}
