import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus, MessageCircle, AlertTriangle, Moon, TrendingUp, Clock,
  RefreshCw, BarChart3, Users, MessageSquare, Route, Lightbulb,
  Target, Zap, Bot, Megaphone, Heart, Star, ChevronRight,
  ThumbsUp, ThumbsDown, ShieldQuestion, Image, Mic, Video, FileText,
  Thermometer, Flame, Snowflake,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { useLeadAnalyticsMT } from "@/hooks/multitenant/useLeadAnalyticsMT";
import { MessageHeatmap } from "@/components/analytics/MessageHeatmap";
import { EngagementFunnel } from "@/components/analytics/EngagementFunnel";
import { ConversationExample } from "@/components/analytics/ConversationExample";
import { ANALYTICS_PERIODS } from "@/types/lead-analytics";
import type { AnalyticsPeriod, ConversationExampleData } from "@/types/lead-analytics";

const CHART_COLORS = [
  "hsl(340, 82%, 52%)", // pink/primary
  "hsl(210, 70%, 55%)", // blue
  "hsl(160, 60%, 45%)", // teal
  "hsl(45, 90%, 50%)",  // amber
  "hsl(280, 60%, 55%)", // purple
  "hsl(15, 80%, 55%)",  // orange
  "hsl(190, 70%, 50%)", // cyan
  "hsl(100, 50%, 45%)", // green
  "hsl(330, 50%, 55%)", // rose
  "hsl(220, 40%, 50%)", // slate blue
];

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  contato: "Em Contato",
  agendado: "Agendado",
  confirmado: "Confirmado",
  atendido: "Atendido",
  convertido: "Convertido",
  perdido: "Perdido",
  cancelado: "Cancelado",
  aguardando: "Aguardando",
  recontato: "Recontato",
  curriculo: "Currículo",
  "Lead Recebido": "Lead Recebido",
};

// Hardcoded conversation examples from real data analysis
const CONVERSATION_EXAMPLES: ConversationExampleData[] = [
  {
    title: "Lead perdido - Sem resposta por 14h",
    isGood: false,
    messages: [
      { body: "Olá! Tenho interesse e queria mais informações, por favor.", fromMe: false, contactName: "Debora", timestamp: "11/03 às 22:42" },
      { body: "essa promoção é paga como?", fromMe: false, contactName: "Debora", timestamp: "12/03 às 12:40" },
    ],
    whatHappened: "Cliente mandou mensagem às 22h42 (fora do horário). No dia seguinte ao meio-dia, insistiu com dúvida sobre pagamento - sinal de ALTA intenção de compra. Nunca foi respondida.",
    whatShouldHappen: "Chatbot noturno responde às 22h42 com catálogo. Às 10h do dia seguinte, atendente retoma. Lead que pergunta sobre pagamento = QUENTE, prioridade máxima.",
    lesson: "Perguntar sobre pagamento = lead quente. Nunca deixe sem resposta por mais de 2h no horário comercial.",
  },
  {
    title: "Resposta fria - Sem CTA",
    isGood: false,
    messages: [
      { body: "Olá! Tenho interesse e queria mais informações, por favor.", fromMe: false, contactName: "Cliente", timestamp: "19:31" },
      { body: "Boa tarde, tudo bem?\nMe chamo Melissa, sou da YesLaser Praia Grande ✨", fromMe: true, timestamp: "19:39" },
      { body: "Boa tarde!", fromMe: false, contactName: "Cliente", timestamp: "19:49" },
    ],
    whatHappened: "Tempo de resposta bom (8 min). Mas a atendente apenas se apresentou e NÃO fez pergunta, não ofereceu promo, não criou urgência. Cliente respondeu 'Boa tarde!' esperando continuidade. Silêncio.",
    whatShouldHappen: "Após apresentação, SEMPRE incluir: 1) Pergunta (\"Já fez laser antes?\") 2) Oferta (promoção vigente) 3) CTA (\"Qual área tem interesse?\").",
    lesson: "Toda primeira mensagem DEVE ter: NOME + PERGUNTA + OFERTA + CTA. Sem isso, a conversa morre.",
  },
  {
    title: "Currículo misturado com comercial",
    isGood: false,
    messages: [
      { body: "Boa tarde! Gostaria de saber se a vaga de recepcionista está disponível", fromMe: false, contactName: "Candidata", timestamp: "20:24" },
      { body: "Boa noite! Desculpe, só vi agora", fromMe: false, contactName: "Candidata", timestamp: "22:19" },
      { body: "Ótimo final de semana!", fromMe: false, contactName: "Candidata", timestamp: "22:19" },
    ],
    whatHappened: "Candidata a vaga mandou msg no canal comercial. Nunca recebeu resposta. São 223 mensagens de currículo misturadas com leads comerciais.",
    whatShouldHappen: "Filtro automático detecta 'currículo/vaga/emprego' e responde: 'Para vagas, envie seu currículo em [link formulário RH]'. Lead marcado como 'currículo' no sistema.",
    lesson: "Separar fluxo de RH do comercial automaticamente. 12% das mensagens são sobre emprego e poluem o funil.",
  },
  {
    title: "Negociação ativa com fechamento",
    isGood: true,
    messages: [
      { body: "Uma área é 199,90 à vista", fromMe: true, timestamp: "15:02" },
      { body: "3 áreas dá 599, 12x de 49,90 sem juros", fromMe: true, timestamp: "15:03" },
      { body: "É a campanha que está rodando", fromMe: true, timestamp: "15:03" },
      { body: "Chefe, a cliente quer: Axilas, virilha, perianal, meia perna + Spa Gold", fromMe: true, timestamp: "17:37" },
      { body: "Pacote completo - Promoção 12x sem juros", fromMe: false, contactName: "Gestora", timestamp: "17:59" },
      { body: "Fechado! O cartão fecha amanhã, já finaliza", fromMe: true, timestamp: "18:25" },
    ],
    whatHappened: "Respondeu rápido com VALORES claros. Deu opções de parcelamento. Negociou pacote personalizado com a gestora. Criou urgência ('campanha rodando'). Flexibilizou pagamento.",
    whatShouldHappen: "",
    lesson: "Modelo ideal: valores claros + parcelamento + pacote personalizado + urgência + flexibilidade = fechamento.",
  },
  {
    title: "Prospecção que engaja",
    isGood: true,
    messages: [
      { body: "*PRESENTE LIBERADO* 🎁\n\n4 sessões de estética pra você realizar - vagas limitadas.\n\nVamos agendar? 💜", fromMe: true, timestamp: "14:00" },
    ],
    whatHappened: "Mensagem curta, oferece algo GRÁTIS, cria escassez ('vagas limitadas'), termina com CTA direto. Foi enviada 130 vezes com alto engajamento.",
    whatShouldHappen: "",
    lesson: "Prospecção ideal: CURTA + GRATUIDADE + ESCASSEZ + CTA. Máximo 3 linhas.",
  },
];

// FAQ data based on real analysis
const FAQ_DATA = [
  { pergunta: "Interesse geral (mais informações)", count: 1047 },
  { pergunta: "Medo de dor", count: 419 },
  { pergunta: "Currículo/Emprego", count: 223 },
  { pergunta: "Como funciona?", count: 121 },
  { pergunta: "Agendamento", count: 110 },
  { pergunta: "Parcelas/Dividir", count: 61 },
  { pergunta: "Resultado", count: 59 },
  { pergunta: "Valor/Preço", count: 50 },
  { pergunta: "Quantas sessões", count: 37 },
  { pergunta: "Promoção", count: 21 },
];

// Objections data from real WhatsApp analysis
const OBJECTIONS_DATA = [
  { objecao: "Depois / agora não", mencoes: 157, quebra: "Criar urgência: \"vagas limitadas\", \"só essa semana\"" },
  { objecao: "Caro / sem condição", mencoes: 70, quebra: "Mostrar recorrência R$59,90/mês, PIX com desconto" },
  { objecao: "Medo / receio", mencoes: 12, quebra: "Vídeo do processo, jato gelado, depoimentos" },
  { objecao: "Vou pensar", mencoes: 5, quebra: "Follow-up em 24h com benefício extra" },
  { objecao: "Não quero / desisto", mencoes: 10, quebra: "Respeitar + manter no CRM para reativação futura" },
];

// Sentiment analysis data
const SENTIMENT_DATA = [
  { sentimento: "Interesse alto", mencoes: 1064, descricao: "\"quero\", \"pode agendar\", \"quero fazer\"", cor: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
  { sentimento: "Elogios / agradecimentos", mencoes: 463, descricao: "\"obrigada\", \"amei\", \"adorei\", \"maravilhoso\"", cor: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
  { sentimento: "Reclamações", mencoes: 1, descricao: "\"insatisfeito\", \"péssimo\", \"nunca mais\"", cor: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
];

// Client experience: first time vs returning
const EXPERIENCE_DATA = [
  { tipo: "Primeira vez (nunca fiz)", mencoes: 123, percentual: "60%", abordagem: "Educação, quebrar medo de dor, explicar protocolo 18 sessões" },
  { tipo: "Já fez (outra clínica)", mencoes: 82, percentual: "40%", abordagem: "Foco em preço, comparação, velocidade, tecnologia superior" },
];

// Response rate by day of week
const RESPONSE_RATE_BY_DAY = [
  { dia: "Domingo", clientes: 114, respondidas: 20, taxa: 17.5 },
  { dia: "Segunda", clientes: 365, respondidas: 499, taxa: 100 },
  { dia: "Terça", clientes: 409, respondidas: 423, taxa: 100 },
  { dia: "Quarta", clientes: 360, respondidas: 324, taxa: 90.0 },
  { dia: "Quinta", clientes: 377, respondidas: 595, taxa: 100 },
  { dia: "Sexta", clientes: 383, respondidas: 460, taxa: 100 },
  { dia: "Sábado", clientes: 241, respondidas: 229, taxa: 95.0 },
];

// Media types exchanged
const MEDIA_DATA = [
  { tipo: "Texto", icone: "💬", cliente: 12664, clinica: 11672, insight: "Equilíbrio bom" },
  { tipo: "Imagem", icone: "📷", cliente: 1601, clinica: 148, insight: "Clínica envia 10x MENOS imagens" },
  { tipo: "Áudio", icone: "🎤", cliente: 310, clinica: 306, insight: "Equilíbrio bom" },
  { tipo: "Vídeo", icone: "📹", cliente: 206, clinica: 3, insight: "Clínica quase NÃO envia vídeos" },
  { tipo: "Documento", icone: "📄", cliente: 157, clinica: 4, insight: "Oportunidade: enviar catálogos/tabelas" },
  { tipo: "Sticker", icone: "😊", cliente: 125, clinica: 0, insight: "Clientes usam, clínica não" },
];

// Lead temperature distribution
const TEMPERATURE_DATA = [
  { temperatura: "Frio", leads: 1879, percentual: 99.3, cor: "text-blue-600", icon: Snowflake },
  { temperatura: "Quente", leads: 12, percentual: 0.6, cor: "text-red-600", icon: Flame },
  { temperatura: "Morno", leads: 2, percentual: 0.1, cor: "text-amber-600", icon: Thermometer },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { fontWeight: 600, marginBottom: "4px" },
};

function KPICard({ title, value, subtitle, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

const LeadAnalytics = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>("90d");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { metrics, isLoading, error, refetch } = useLeadAnalyticsMT(period);

  // Body area data for charts (from keyword mentions)
  const bodyAreaData = useMemo(() => {
    if (!metrics?.keywordMentions.length) return [];
    const total = metrics.keywordMentions.reduce((s, k) => s + k.mencoes, 0);
    return metrics.keywordMentions.map((k) => ({
      name: k.termo,
      value: k.mencoes,
      percentage: total > 0 ? Math.round((k.mencoes / total) * 1000) / 10 : 0,
    }));
  }, [metrics]);

  const procedureData = useMemo(() => {
    if (!metrics?.topProcedures.length) return [];
    return metrics.topProcedures.map((p) => ({
      name: p.termo,
      value: p.mencoes,
    }));
  }, [metrics]);

  const funnelChartData = useMemo(() => {
    if (!metrics?.funnelDistribution.length) return [];
    return metrics.funnelDistribution.map((f) => ({
      name: STATUS_LABELS[f.status] || f.status,
      value: f.count,
      percentage: f.percentage,
    }));
  }, [metrics]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <div className="p-8 text-center text-destructive">Erro: {error.message}</div>;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Análise de Leads</h1>
          <p className="text-muted-foreground">
            Insights do WhatsApp e CRM para a reunião diária
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ANALYTICS_PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? "default" : "outline"}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total de Leads" value={metrics.totalLeads} icon={Users} />
        <KPICard title="Taxa de Resposta" value={`${metrics.responseRate}%`} subtitle={`${metrics.totalConversations} conversas`} icon={MessageCircle} color="text-green-600" />
        <KPICard title="Sem Resposta" value={metrics.leadsWithoutResponse} subtitle="conversas ignoradas" icon={AlertTriangle} color="text-red-600" />
        <KPICard title="Msgs Noturnas" value={metrics.nightMessages} subtitle="22h-8h + domingos" icon={Moon} color="text-amber-600" />
        <KPICard title="Conversão" value={`${metrics.conversionRate}%`} icon={TrendingUp} color="text-emerald-600" />
        <KPICard title="Novos no Período" value={metrics.newLeadsPeriod} subtitle={`últimos ${ANALYTICS_PERIODS.find(p => p.value === period)?.label}`} icon={UserPlus} color="text-blue-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="visao-geral" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="demanda" className="gap-1.5">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Demanda</span>
          </TabsTrigger>
          <TabsTrigger value="atendimento" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Atendimento</span>
          </TabsTrigger>
          <TabsTrigger value="exemplos" className="gap-1.5">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Exemplos</span>
          </TabsTrigger>
          <TabsTrigger value="caminhos" className="gap-1.5">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Caminhos</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Status</CardTitle>
                <CardDescription>Status atual dos {metrics.totalLeads} leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={funnelChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        labelLine={true}
                      >
                        {funnelChartData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência Mensal de Leads</CardTitle>
                <CardDescription>Novos leads por mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Leads"
                        stroke="hsl(340, 82%, 52%)"
                        fill="hsl(340, 82%, 52%)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ICP - Perfil Demografico Completo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil do Cliente (ICP)</CardTitle>
              <CardDescription>Quem é nosso cliente ideal baseado em {metrics.totalLeads} leads e 225.772 mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabela demografica fixa */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Dado</th>
                      <th className="text-left py-2 font-semibold">Valor</th>
                      <th className="text-left py-2 font-semibold">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dado: "Gênero", valor: "~80% Feminino", fonte: "34F vs 10M identificados" },
                      { dado: "Localização", valor: "Praia Grande (41%), Cubatão (34%), Santos (9%)", fonte: "Endereços dos leads" },
                      { dado: "Raio de atuação", valor: "~30km (Baixada Santista)", fonte: "Cidades registradas" },
                      { dado: "Perfil econômico", valor: "Classe B/C - sensível a preço", fonte: "61 menções parcelas, 93 recorrência" },
                      { dado: "Canal preferido", valor: "WhatsApp (95% dos contatos)", fonte: "95% leads via WA" },
                      { dado: "Origem do tráfego", valor: "Instagram / Meta Ads", fonte: 'Msg padrão: "Olá! Tenho interesse..."' },
                    ].map((row) => (
                      <tr key={row.dado} className="border-b">
                        <td className="py-2 font-medium">{row.dado}</td>
                        <td className="py-2">{row.valor}</td>
                        <td className="py-2 text-muted-foreground text-xs">{row.fonte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dados dinamicos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Top Cidades (dinâmico)</h4>
                  <div className="space-y-2">
                    {metrics.icpData.topCities.slice(0, 5).map((city) => (
                      <div key={city.name} className="flex items-center justify-between text-sm">
                        <span>{city.name}</span>
                        <Badge variant="secondary">{city.count}</Badge>
                      </div>
                    ))}
                    {metrics.icpData.topCities.length === 0 && (
                      <p className="text-sm text-muted-foreground">Poucos dados de cidade</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">Gênero (dinâmico)</h4>
                  <div className="space-y-2">
                    {metrics.icpData.genderDistribution.map((g) => (
                      <div key={g.gender} className="flex items-center justify-between text-sm">
                        <span>{g.gender}</span>
                        <Badge variant="secondary">{g.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-3">Canais de Origem (dinâmico)</h4>
                  <div className="space-y-2">
                    {metrics.icpData.topChannels.slice(0, 5).map((ch) => (
                      <div key={ch.channel} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[180px]">{ch.channel}</span>
                        <Badge variant="secondary">{ch.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comportamento - Dias da Semana + Horarios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume por Dia da Semana</CardTitle>
                <CardDescription>Quando o cliente entra em contato</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">Dia</th>
                        <th className="text-center py-2 font-semibold">Total</th>
                        <th className="text-center py-2 font-semibold">Recebidas</th>
                        <th className="text-center py-2 font-semibold">Enviadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { dia: "Quinta", total: "5.402", rec: "2.757", env: "2.645" },
                        { dia: "Sexta", total: "5.285", rec: "2.704", env: "2.581" },
                        { dia: "Terça", total: "4.932", rec: "2.640", env: "2.292" },
                        { dia: "Segunda", total: "4.834", rec: "2.647", env: "2.187" },
                        { dia: "Quarta", total: "4.127", rec: "2.521", env: "1.606" },
                        { dia: "Sábado", total: "2.364", rec: "1.439", env: "925" },
                        { dia: "Domingo", total: "443", rec: "410", env: "33" },
                      ].map((row) => (
                        <tr key={row.dia} className={`border-b ${row.dia === "Domingo" ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2 font-medium">{row.dia}</td>
                          <td className="text-center py-2">{row.total}</td>
                          <td className="text-center py-2">{row.rec}</td>
                          <td className="text-center py-2">{row.env}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    Domingo: 410 msgs de clientes e apenas 33 respostas. Perdendo leads no domingo.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Horários de Pico</CardTitle>
                <CardDescription>Mensagens recebidas de clientes por horário</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">Horário</th>
                        <th className="text-center py-2 font-semibold">Recebidas</th>
                        <th className="text-left py-2 font-semibold">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { hora: "14h", rec: "1.427", obs: "PICO MÁXIMO", cor: "bg-pink-50 dark:bg-pink-950/20" },
                        { hora: "18h-19h", rec: "1.459-1.478", obs: "Segundo pico (fim expediente)", cor: "bg-pink-50/50 dark:bg-pink-950/10" },
                        { hora: "20h", rec: "1.309", obs: "Noturno ainda forte", cor: "" },
                        { hora: "22h-23h", rec: "741-513", obs: "Clientes mandam msg tarde", cor: "bg-amber-50 dark:bg-amber-950/20" },
                        { hora: "0h-1h", rec: "209-224", obs: "Madrugada - sem resposta", cor: "bg-red-50 dark:bg-red-950/20" },
                        { hora: "4h-8h", rec: "12-49", obs: "Horário morto", cor: "" },
                      ].map((row) => (
                        <tr key={row.hora} className={`border-b ${row.cor}`}>
                          <td className="py-2 font-medium">{row.hora}</td>
                          <td className="text-center py-2">{row.rec}</td>
                          <td className="py-2 text-muted-foreground text-xs">{row.obs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    Entre 22h e 1h recebemos 1.468 mensagens. ZERO respostas nesse horário.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indicações: Clientes vs Influencers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Indicações de Clientes
                </CardTitle>
                <CardDescription>Clientes que indicaram outros clientes (53 leads)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { nome: "Ana Carolina Meirelles", indicacoes: 5, leads: "Stefany, Nora, Larissa, Andrea, Pedro" },
                    { nome: "Fiama Moura", indicacoes: 5, leads: "Simone, Elida, Jessica, Mislayne, Carol" },
                    { nome: "Juliana Goulart", indicacoes: 5, leads: "Gra, Rafaelle, Grazielle, Bruna, Michele" },
                    { nome: "Karen Bernardino", indicacoes: 5, leads: "Thaís, Andreza, Yasmin, Mikaelly, Aline" },
                    { nome: "Eliane Vendite", indicacoes: 1, leads: "Alice Mattos" },
                  ].map((indicador) => (
                    <div key={indicador.nome} className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{indicador.nome}</span>
                        <Badge variant="secondary">{indicador.indicacoes} indicações</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Indicou: {indicador.leads}</p>
                    </div>
                  ))}
                  <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                    + 32 indicações sem identificação do indicador
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-purple-600" />
                  Indicações de Influencers
                </CardTitle>
                <CardDescription>Influenciadoras cadastradas e suas indicações (26 leads)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { nome: "GiBeletti (Giovanna)", referrals: 28, status: "aprovado", codigo: "GIBELETTI10" },
                    { nome: "@steborgesx (Stephannye)", referrals: 1, status: "aprovado", codigo: "STEBORGES10" },
                    { nome: "lariselleri (Larissa)", referrals: 0, status: "aprovado", codigo: "-" },
                    { nome: "Carol Pettra", referrals: 0, status: "aprovado", codigo: "-" },
                    { nome: "@acmiria (Amanda)", referrals: 0, status: "aprovado", codigo: "-" },
                  ].map((inf) => (
                    <div key={inf.nome} className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{inf.nome}</span>
                        <div className="flex items-center gap-2">
                          {inf.codigo !== "-" && (
                            <Badge variant="outline" className="text-xs">{inf.codigo}</Badge>
                          )}
                          <Badge variant={inf.referrals > 0 ? "default" : "secondary"}>
                            {inf.referrals} leads
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      15 influencers cadastradas, apenas 1 gerando leads ativamente
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      GiBeletti gera 96% das indicações de influencers. Necessário ativar as demais.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipe de Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equipe de Atendimento</CardTitle>
              <CardDescription>Mensagens padrão e volume por atendente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Atendentes */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Volume por Atendente</h4>
                  <div className="space-y-2">
                    {[
                      { nome: "Julia", msgs: 494, variantes: "Me chamo *Julia*... (241+215+38)" },
                      { nome: "Amanda", msgs: 200, variantes: "Me chamo *Amanda*... (121+79)" },
                      { nome: "Emily", msgs: 38, variantes: "Meu nome é Emily..." },
                      { nome: "Melissa", msgs: 0, variantes: "Identificada em conversas individuais" },
                    ].map((at) => (
                      <div key={at.nome} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div>
                          <span className="font-medium text-sm">{at.nome}</span>
                          <p className="text-xs text-muted-foreground">{at.variantes}</p>
                        </div>
                        {at.msgs > 0 && <Badge variant="secondary">{at.msgs} msgs padrão</Badge>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scripts mais usados */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Scripts Mais Enviados</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { msg: '"Me chamo Julia/Amanda, sou da YesLaser..."', vezes: 694, tipo: "Apresentação" },
                      { msg: '"Olá bom dia/tarde! Tudo bem?"', vezes: 237, tipo: "Abertura" },
                      { msg: '"Qual o seu nome por favor?"', vezes: 152, tipo: "Qualificação" },
                      { msg: '"PRESENTE LIBERADO - 4 sessões"', vezes: 130, tipo: "Prospecção" },
                      { msg: '"Grupo VIP YESLASER - 90% desconto"', vezes: 103, tipo: "Campanha" },
                      { msg: '"Cadastro: nome, data nasc, CPF..."', vezes: 82, tipo: "Fechamento" },
                      { msg: '"Promoção pré-inauguração R$79,90"', vezes: 63, tipo: "Oferta" },
                      { msg: '"Não estamos disponíveis..."', vezes: 46, tipo: "Fora horário" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">{s.tipo}</Badge>
                          <span className="truncate text-muted-foreground">{s.msg}</span>
                        </div>
                        <span className="font-mono text-xs flex-shrink-0">{s.vezes}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Taxa de Resposta por Dia + Temperatura */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Taxa de Resposta por Dia da Semana</CardTitle>
                <CardDescription>Conversas com pelo menos 1 resposta da clínica</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">Dia</th>
                        <th className="text-center py-2 font-semibold">Clientes</th>
                        <th className="text-center py-2 font-semibold">Respondidas</th>
                        <th className="text-center py-2 font-semibold">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESPONSE_RATE_BY_DAY.map((row) => (
                        <tr key={row.dia} className={`border-b ${row.taxa < 50 ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                          <td className="py-2 font-medium">{row.dia}</td>
                          <td className="text-center py-2">{row.clientes}</td>
                          <td className="text-center py-2">{row.respondidas}</td>
                          <td className="text-center py-2">
                            <Badge variant={row.taxa < 50 ? "destructive" : row.taxa >= 95 ? "default" : "secondary"}>
                              {row.taxa < 100 ? `${row.taxa}%` : ">100%"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    Domingo tem apenas 17.5% de taxa de resposta — praticamente abandonado.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperatura dos Leads
                </CardTitle>
                <CardDescription>Classificação atual de {metrics.totalLeads} leads no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {TEMPERATURE_DATA.map((temp) => {
                    const Icon = temp.icon;
                    return (
                      <div key={temp.temperatura} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${temp.cor}`} />
                            <span className="font-medium">{temp.temperatura}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold tabular-nums">{temp.leads}</span>
                            <span className="text-muted-foreground text-xs">({temp.percentual}%)</span>
                          </div>
                        </div>
                        <div className="h-6 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              temp.temperatura === "Frio" ? "bg-blue-500" :
                              temp.temperatura === "Quente" ? "bg-red-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.max(temp.percentual, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    99.3% dos leads estão "frios" — sem classificação automática de temperatura
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Automação sugerida: lead que menciona "agendar" ou "fechar" → quente. Lead que pergunta preço → morno.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Demanda */}
        <TabsContent value="demanda" className="space-y-6">
          {/* Trio de Ouro highlight */}
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-bold text-lg">TRIO DE OURO: Virilha + Axilas + Buço</p>
                  <p className="text-muted-foreground">
                    Representam ~68.9% da demanda. Este combo deveria ser o carro-chefe de todas as campanhas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Body Areas Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Áreas Corporais Mais Pedidas</CardTitle>
                <CardDescription>Baseado em menções no WhatsApp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bodyAreaData}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        labelLine={true}
                      >
                        {bodyAreaData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Procedures Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Procedimentos Estéticos</CardTitle>
                <CardDescription>Além da depilação a laser</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={procedureData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="value" name="Menções" fill="hsl(280, 60%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Keywords Table - Complete */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Palavras-chave Mais Mencionadas pelos Clientes</CardTitle>
              <CardDescription>O que as mensagens revelam sobre intenção de compra</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Termo</th>
                      <th className="text-center py-2 font-semibold">Menções</th>
                      <th className="text-left py-2 font-semibold">O que revela</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { termo: "Promoção", mencoes: 1416, insight: "Cliente é MOVIDO por promoção" },
                      { termo: "Preço/valor/quanto", mencoes: 469, insight: "Preço é decisivo na compra" },
                      { termo: "Dor/dói", mencoes: 418, insight: "MEDO DE DOR é a barreira #1" },
                      { termo: "Agendamento/marcar", mencoes: 408, insight: "Alta intenção de compra" },
                      { termo: "Sessão/sessões", mencoes: 335, insight: "Quer entender o protocolo" },
                      { termo: "Laser", mencoes: 330, insight: "Busca específica" },
                      { termo: "Depilação", mencoes: 202, insight: "Termo genérico" },
                      { termo: "Pacote", mencoes: 128, insight: "Quer combo/economia" },
                      { termo: "Recorrência/mensal", mencoes: 93, insight: "Prefere pagamento parcelado" },
                      { termo: "Resultado", mencoes: 58, insight: "Quer prova social" },
                      { termo: "Parcelar", mencoes: 53, insight: "Precisa facilitar pagamento" },
                      { termo: "PIX", mencoes: 50, insight: "Quer desconto à vista" },
                    ].map((row) => (
                      <tr key={row.termo} className="border-b">
                        <td className="py-2 font-medium">{row.termo}</td>
                        <td className="text-center py-2">
                          <Badge variant="secondary">{row.mencoes.toLocaleString()}</Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{row.insight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic keywords from hook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Áreas Corporais por Menções (Dinâmico)</CardTitle>
              <CardDescription>Dados do período selecionado via análise de mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {metrics.keywordMentions.map((kw) => (
                  <div key={kw.termo} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{kw.termo}</span>
                    <Badge variant="secondary" className="ml-2">{kw.mencoes}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Atendimento */}
        <TabsContent value="atendimento" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de Engajamento</CardTitle>
                <CardDescription>Como as conversas são tratadas pela equipe</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementFunnel data={metrics.engagementFunnel} />
                <Link to="/relatorios/leads/sem-resposta" className="block mt-4">
                  <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Ver todas as conversas sem resposta
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Dúvidas dos Clientes</CardTitle>
                <CardDescription>Perguntas mais frequentes no WhatsApp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={FAQ_DATA} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="pergunta"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={160}
                      />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" name="Menções" fill="hsl(210, 70%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapa de Calor - Mensagens por Horário</CardTitle>
              <CardDescription>Mensagens recebidas dos clientes (quando eles entram em contato)</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageHeatmap data={metrics.heatmap} showReceived={true} />
            </CardContent>
          </Card>

          {/* Insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-300">
                      {metrics.nightMessages} mensagens noturnas sem resposta
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Entre 22h-8h e domingos, clientes mandam mensagem e não recebem retorno.
                      Chatbot noturno resolveria este problema.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-300">
                      Pico de contato: 14h e 18h-19h
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Estes são os melhores horários para ter toda a equipe disponível.
                      Segundo pico noturno: 20h-22h.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Objeções + Sentimento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  Objeções Mais Comuns
                </CardTitle>
                <CardDescription>O que impede o cliente de fechar e como quebrar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {OBJECTIONS_DATA.map((obj) => (
                    <div key={obj.objecao} className="p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{obj.objecao}</span>
                        <Badge variant="secondary">{obj.mencoes} menções</Badge>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        <span className="font-medium">Quebrar:</span> {obj.quebra}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-600" />
                  Análise de Sentimento
                </CardTitle>
                <CardDescription>Sentimento predominante nas mensagens dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SENTIMENT_DATA.map((sent) => (
                    <div key={sent.sentimento} className={`p-3 rounded-lg border ${sent.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{sent.sentimento}</span>
                        <Badge variant="secondary">{sent.mencoes.toLocaleString()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{sent.descricao}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    1.064 mensagens de alta intenção — esses leads deveriam ser priorizados automaticamente
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Apenas 1 reclamação em 225.772 mensagens = excelente satisfação
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primeira Vez vs Retorno + Mídia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldQuestion className="h-4 w-4 text-purple-600" />
                  Primeira Vez vs. Já Fez
                </CardTitle>
                <CardDescription>Experiência prévia dos clientes com depilação a laser</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EXPERIENCE_DATA.map((exp) => (
                    <div key={exp.tipo} className="p-4 rounded-lg border bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{exp.tipo}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{exp.percentual}</Badge>
                          <Badge variant="secondary">{exp.mencoes} menções</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Abordagem ideal:</span> {exp.abordagem}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                    2 perfis distintos que exigem scripts diferentes
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Primeira pergunta do script: "Já fez laser antes?" define qual caminho seguir.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4 text-indigo-600" />
                  Tipos de Mídia Trocados
                </CardTitle>
                <CardDescription>O que clientes enviam vs o que a clínica responde</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">Tipo</th>
                        <th className="text-center py-2 font-semibold">Cliente</th>
                        <th className="text-center py-2 font-semibold">Clínica</th>
                        <th className="text-left py-2 font-semibold">Insight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MEDIA_DATA.map((row) => (
                        <tr key={row.tipo} className={`border-b ${
                          row.cliente > row.clinica * 5 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                        }`}>
                          <td className="py-2 font-medium">
                            <span className="mr-1">{row.icone}</span> {row.tipo}
                          </td>
                          <td className="text-center py-2 font-mono text-xs">{row.cliente.toLocaleString()}</td>
                          <td className="text-center py-2 font-mono text-xs">{row.clinica.toLocaleString()}</td>
                          <td className="py-2 text-xs text-muted-foreground">{row.insight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                    Oportunidade: enviar mais imagens (antes/depois) e vídeos (procedimento, tour)
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Clientes enviam 10x mais imagens e 68x mais vídeos que a clínica. Conteúdo visual vende.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: Exemplos */}
        <TabsContent value="exemplos" className="space-y-6">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-bold">Script Recomendado de Abertura</p>
                  <div className="mt-2 p-3 rounded-lg bg-white dark:bg-zinc-900 border text-sm">
                    <p>Oi <strong>[NOME]</strong>! Me chamo <strong>[ATENDENTE]</strong>, da YesLaser Praia Grande ✨</p>
                    <p className="mt-1">Vi que você se interessou pela depilação a laser! Já fez alguma vez ou seria sua primeira experiência?</p>
                    <p className="mt-1">Estamos com condição especial esse mês:</p>
                    <p className="mt-1">🔥 <strong>[PROMOÇÃO DO MOMENTO]</strong></p>
                    <p className="mt-1">Me conta qual área você tem mais interesse! 😊</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    NOME + PERGUNTA + OFERTA + CTA = conversa continua
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {CONVERSATION_EXAMPLES.map((example, idx) => (
              <ConversationExample key={idx} example={example} />
            ))}
          </div>
        </TabsContent>

        {/* TAB 5: Caminhos */}
        <TabsContent value="caminhos" className="space-y-6">

          {/* RESUMO EXECUTIVO - 3 Ações Urgentes */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Resumo Executivo - 3 Ações Mais Urgentes
              </CardTitle>
              <CardDescription>Situação: 43.6% dos leads nunca são atendidos, 90.7% parados em "novo", ~1.800 msgs noturnas sem resposta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <Badge className="mb-2 bg-red-600">HOJE</Badge>
                  <p className="font-bold text-sm mb-2">1. Corrigir Script de Abertura</p>
                  <p className="text-xs text-muted-foreground mb-2">De: "Me chamo Julia, sou da YesLaser"</p>
                  <p className="text-xs font-medium">Para: "Oi [NOME]! Sou a Julia da YesLaser. Vi seu interesse! Já fez laser antes? Temos [PROMO] esse mês. Qual área quer?"</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Badge className="mb-2 bg-amber-600">ESTA SEMANA</Badge>
                  <p className="font-bold text-sm mb-2">2. Ativar Chatbot Noturno</p>
                  <p className="text-xs text-muted-foreground mb-2">Responder 22h-8h + domingos com FAQ básico</p>
                  <p className="text-xs font-medium">Ganho: +1.800 leads/mês atendidos fora de horário</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <Badge className="mb-2 bg-blue-600">PRÓXIMO MÊS</Badge>
                  <p className="font-bold text-sm mb-2">3. Automatizar Classificação</p>
                  <p className="text-xs text-muted-foreground mb-2">Extrair serviço da conversa, separar currículos, mover funil</p>
                  <p className="text-xs font-medium">Resultado: funil refletindo realidade para decisão</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Resultado esperado: de 43.6% para &lt;20% leads perdidos | de 0.1% para &gt;3% conversão | +1.800 leads/mês atendidos
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 7 PROBLEMAS CRITICOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                7 Problemas Críticos Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    num: 1, titulo: "Funil PARADO - 90.7% em 'novo'",
                    impacto: "Impossível saber quantos leads estão sendo trabalhados",
                    causa: "Equipe NÃO atualiza status. Sem automação de movimento",
                    solucao: "Automatizar: resposta = 'contato', agendou = 'agendado'",
                  },
                  {
                    num: 2, titulo: "99.7% sem serviço de interesse",
                    impacto: "Impossível segmentar campanhas ou priorizar leads",
                    causa: "Campo não preenchido automaticamente da conversa",
                    solucao: "Extrair da conversa WhatsApp + pergunta obrigatória no script",
                  },
                  {
                    num: 3, titulo: "43.6% conversas morrem com 0-1 resposta",
                    impacto: "A cada 10 leads, ~4 nunca são atendidos",
                    causa: "Sem alerta de lead sem resposta, sem follow-up",
                    solucao: "Alerta automático + meta <15min + chatbot fora horário",
                  },
                  {
                    num: 4, titulo: "~1.800 msgs noturnas/domingo sem resposta",
                    impacto: "Lead esfria ou vai para concorrente",
                    causa: "Chatbot existe no sistema mas está DESLIGADO",
                    solucao: "Ativar chatbot com FAQ top 10 para 22h-8h + domingos",
                  },
                  {
                    num: 5, titulo: "223 currículos poluindo o funil",
                    impacto: "Equipe perde tempo, leads comerciais ficam sem resposta",
                    causa: "Sem filtro automático para 'currículo/vaga/emprego'",
                    solucao: "Filtro + resposta automática + status 'currículo'",
                  },
                  {
                    num: 6, titulo: "SPAM de promoções externas",
                    impacto: "Leads falsos criados (Petz, Smart TV, etc.)",
                    causa: "Sem filtro anti-spam para links de promo",
                    solucao: "Detectar promocoestops.com.br, não criar lead",
                  },
                  {
                    num: 7, titulo: "Script sem CTA - conversa morre",
                    impacto: "694 msgs apenas 'Me chamo Julia...' sem pergunta/oferta",
                    causa: "Script incompleto: só apresentação, sem CTA",
                    solucao: "NOME + PERGUNTA + OFERTA + CTA na primeira msg",
                  },
                ].map((prob) => (
                  <div key={prob.num} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive" className="text-xs">{prob.num}</Badge>
                      <span className="font-semibold text-sm">{prob.titulo}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-medium text-red-600 dark:text-red-400">Impacto:</span> {prob.impacto}</p>
                      <p><span className="font-medium text-amber-600 dark:text-amber-400">Causa:</span> {prob.causa}</p>
                      <p><span className="font-medium text-green-600 dark:text-green-400">Solução:</span> {prob.solucao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategic Paths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base">Caminho 1: Otimizar Atendimento</CardTitle>
                </div>
                <Badge variant="secondary">1 semana</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Novo script de abertura com PERGUNTA + PROMO + CTA</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Meta de tempo de resposta: &lt;15 minutos</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Checklist: lead sem resposta após 2h = alerta vermelho</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Separar currículos do comercial manualmente</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Caminho 2: Automações</CardTitle>
                </div>
                <Badge variant="secondary">2-4 semanas</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Chatbot noturno/domingo (já existe, ativar)</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Auto-classificação de leads por conversa</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Auto-movimento de funil baseado em atividade</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Filtro anti-spam automático</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-base">Caminho 3: Marketing por Dados</CardTitle>
                </div>
                <Badge variant="secondary">Médio prazo</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-purple-600" />
                  <span><strong>Seg. A (68.9%)</strong>: Mulher, Virilha+Axilas+Buço</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-purple-600" />
                  <span><strong>Seg. B (22.4%)</strong>: Mulher, Facial (Buço+Queixo)</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-purple-600" />
                  <span><strong>Seg. C (5.3%)</strong>: Homem, Barba/Pescoço</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-purple-600" />
                  <span><strong>Seg. D</strong>: Estética Premium (Botox, Preenchimento)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base">Caminho 4: Dashboard Inteligente</CardTitle>
                </div>
                <Badge variant="secondary">Longo prazo</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-amber-600" />
                  <span>Funil visual em tempo real</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-amber-600" />
                  <span>Ranking de áreas corporais da semana</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-amber-600" />
                  <span>Taxa de resposta por atendente</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-amber-600" />
                  <span>Alerta de leads quentes não atendidos</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI targets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metas vs. Atual</CardTitle>
              <CardDescription>KPIs recomendados para acompanhamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">KPI</th>
                      <th className="text-center py-2 font-semibold">Atual</th>
                      <th className="text-center py-2 font-semibold">Meta</th>
                      <th className="text-center py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { kpi: "Taxa de resposta", atual: `${metrics.responseRate}%`, meta: ">95%", ok: metrics.responseRate >= 95 },
                      { kpi: "Conversas sem resposta", atual: `${metrics.leadsWithoutResponse}`, meta: "<5%", ok: false },
                      { kpi: "Leads com serviço preenchido", atual: "0.3%", meta: ">80%", ok: false },
                      { kpi: "Leads que saem de 'novo'", atual: "9.3%", meta: ">60%", ok: false },
                      { kpi: "Taxa de conversão", atual: `${metrics.conversionRate}%`, meta: ">5%", ok: metrics.conversionRate >= 5 },
                      { kpi: "Atendimento noturno", atual: "~4%", meta: ">80%", ok: false },
                    ].map((row) => (
                      <tr key={row.kpi} className="border-b">
                        <td className="py-2">{row.kpi}</td>
                        <td className="text-center py-2 font-mono">{row.atual}</td>
                        <td className="text-center py-2 font-mono text-green-700 dark:text-green-400">{row.meta}</td>
                        <td className="text-center py-2">
                          <Badge variant={row.ok ? "default" : "destructive"}>
                            {row.ok ? "OK" : "Abaixo"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadAnalytics;
