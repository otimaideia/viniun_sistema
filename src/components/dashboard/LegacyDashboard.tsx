import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { usePromocaoCadastrosAdapter } from "@/hooks/usePromocaoCadastrosAdapter";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useRecrutamentoMetricsAdapter } from "@/hooks/useRecrutamentoMetricsAdapter";
import { useResponsibleUsersAdapter } from "@/hooks/useResponsibleUsersAdapter";
import { useMetrics as useWhatsAppMetrics } from "@/hooks/whatsapp/useMetrics";
import { useMetasAdapter } from "@/hooks/useMetasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { ORIGEM_CONFIG, type LeadOrigem } from "@/types/lead-mt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import {
  Users,
  UserPlus,
  Building2,
  CalendarDays,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Briefcase,
  Target,
  TrendingUp,
  Trophy,
  Medal,
  MapPin,
  Sparkles,
  Calendar,
  BarChart3,
  DollarSign,
  MessageSquare,
  Crown,
  Timer,
  Zap,
  Flag,
} from "lucide-react";
import { format, subDays, isAfter, isBefore, eachDayOfInterval, isValid, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Helper para formatar datas com segurança
const safeFormatDate = (dateValue: string | Date | null | undefined, formatStr: string): string | null => {
  if (!dateValue) return null;
  const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  return isValid(date) ? format(date, formatStr) : null;
};

// Helper para converter data com segurança
const safeParseDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  return isValid(date) ? date : null;
};

const COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#22c55e", // green
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f97316", // orange
  "#3b82f6", // blue
  "#ef4444", // red
  "#a855f7", // purple
];

const GENDER_COLORS: Record<string, string> = {
  "Feminino": "#ec4899",
  "Masculino": "#3b82f6",
  "Outro": "#8b5cf6",
  "Não informado": "#94a3b8",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Helper: mapear origem bruta para label legível
const getOrigemLabel = (rawOrigem: string): string => {
  if (rawOrigem in ORIGEM_CONFIG) {
    return ORIGEM_CONFIG[rawOrigem as LeadOrigem].label;
  }
  const lower = rawOrigem.toLowerCase();
  if (lower.includes('whatsapp') || lower.includes('wpp') || lower.includes('waha')) return 'WhatsApp';
  if (lower.includes('instagram') || lower.includes('insta')) return 'Instagram';
  if (lower.includes('facebook') || lower.includes('fb')) return 'Facebook';
  if (lower.includes('google_maps') || lower.includes('gmaps')) return 'Google Maps';
  if (lower.includes('google')) return 'Google';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('site') || lower.includes('formulario') || lower.includes('landing')) return 'Site';
  if (lower.includes('indicacao') || lower.includes('indicação')) return 'Indicação';
  if (lower.includes('telefone') || lower.includes('ligacao')) return 'Telefone';
  if (lower.includes('presencial')) return 'Presencial';
  if (lower.includes('bio_link') || lower.includes('bio')) return 'Link da Bio';
  // Remove UUID patterns "(franquia: uuid...)" and retry
  const cleaned = rawOrigem.replace(/\s*\(franquia:?\s*[a-f0-9-]+\)/gi, '').replace(/_sync$/i, '').trim();
  if (cleaned !== rawOrigem && cleaned.length > 0) return getOrigemLabel(cleaned);
  return rawOrigem;
};

// Helper: cor por origem
const ORIGEM_COLORS: Record<string, string> = {
  'WhatsApp': '#22c55e', 'Instagram': '#ec4899', 'Facebook': '#3b82f6',
  'Google Maps': '#ef4444', 'Google': '#f59e0b', 'TikTok': '#64748b',
  'Site': '#06b6d4', 'Indicação': '#10b981', 'Telefone': '#f97316',
  'Presencial': '#6366f1', 'Link da Bio': '#a855f7', 'Outras Redes': '#8b5cf6',
  'Outro': '#94a3b8', 'Não informado': '#94a3b8',
};
const getOrigemColor = (label: string): string => ORIGEM_COLORS[label] || '#94a3b8';

// Formatar moeda BRL
const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return `R$ ${value.toFixed(0)}`;
};

export function LegacyDashboard() {
  const navigate = useNavigate();
  const { accessLevel, franchise, tenant, isLoading: isTenantLoading } = useTenantContext();
  const isFranchiseView = accessLevel === 'franchise' || accessLevel === 'user';
  const isGlobalView = accessLevel === 'platform' || accessLevel === 'tenant';

  const { leads: allLeads, isLoading: leadsLoading } = useLeadsAdapter();
  const { cadastros, isLoading: cadastrosLoading } = usePromocaoCadastrosAdapter();
  const { indicacoes, isLoading: indicacoesLoading } = usePromocaoIndicacoesAdapter();
  const { agendamentos, isLoading: agendamentosLoading } = useAgendamentosAdapter();
  const { franqueados, isLoading: franqueadosLoading } = useFranqueadosAdapter();
  const { metrics: recrutamentoMetrics, isLoading: recrutamentoLoading } = useRecrutamentoMetricsAdapter();
  const { users: responsibleUsers, isLoading: usersLoading } = useResponsibleUsersAdapter();
  const { metrics: whatsappMetrics } = useWhatsAppMetrics();
  const { metas, stats: metasStats } = useMetasAdapter();

  // =================================================================
  // FILTRO DE PERÍODO
  // =================================================================
  const [periodo, setPeriodo] = useState<number>(30);

  // Leads filtrados pelo período selecionado
  const leads = useMemo(() => {
    if (periodo === 0) return allLeads;
    const cutoff = subDays(new Date(), periodo);
    return allLeads.filter(l => {
      const d = safeParseDate(l.created_at);
      return d && isAfter(d, cutoff);
    });
  }, [allLeads, periodo]);

  // Leads do período anterior (para comparação)
  const previousLeads = useMemo(() => {
    if (periodo === 0) return [];
    const currentStart = subDays(new Date(), periodo);
    const previousStart = subDays(new Date(), periodo * 2);
    return allLeads.filter(l => {
      const d = safeParseDate(l.created_at);
      return d && isAfter(d, previousStart) && isBefore(d, currentStart);
    });
  }, [allLeads, periodo]);

  // Comparação com período anterior
  const comparison = useMemo(() => {
    if (periodo === 0 || previousLeads.length === 0) return null;

    const prevTotal = previousLeads.length;
    const prevConvertidos = previousLeads.filter(l => l.status === 'convertido').length;
    const prevTaxa = prevTotal > 0 ? (prevConvertidos / prevTotal) * 100 : 0;
    const prevIndicacoes = indicacoes.filter(i => {
      const d = safeParseDate(i.created_at);
      const currentStart = subDays(new Date(), periodo);
      const previousStart = subDays(new Date(), periodo * 2);
      return d && isAfter(d, previousStart) && isBefore(d, currentStart);
    }).length;
    const currentIndicacoes = indicacoes.filter(i => {
      const d = safeParseDate(i.created_at);
      const cutoff = subDays(new Date(), periodo);
      return d && isAfter(d, cutoff);
    }).length;

    const currentTotal = leads.length;
    const currentConvertidos = leads.filter(l => l.status === 'convertido').length;
    const currentTaxa = currentTotal > 0 ? (currentConvertidos / currentTotal) * 100 : 0;

    const calcDelta = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    return {
      leadsTotal: calcDelta(currentTotal, prevTotal),
      conversoes: calcDelta(currentConvertidos, prevConvertidos),
      taxa: parseFloat((currentTaxa - prevTaxa).toFixed(1)),
      indicacoes: calcDelta(currentIndicacoes, prevIndicacoes),
    };
  }, [leads, previousLeads, periodo, indicacoes]);

  // Conversas WhatsApp por usuário (para rank de consultoras)
  const { data: waUserConversations = {} } = useQuery({
    queryKey: ['wa-user-conv-counts', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_whatsapp_conversations')
        .select('assigned_to')
        .not('assigned_to', 'is', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data } = await q;
      if (!data) return {} as Record<string, number>;

      const counts: Record<string, number> = {};
      data.forEach((c: any) => {
        if (c.assigned_to) {
          counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 300000,
  });

  const isLoading = leadsLoading || cadastrosLoading || indicacoesLoading || agendamentosLoading || franqueadosLoading || recrutamentoLoading;

  // Calculate metrics
  const metrics = useMemo(() => {
    const today = new Date();
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    const totalLeads = leads.length;
    const leadsRecentes = leads.filter(l => {
      const createdAt = safeParseDate(l.created_at);
      return createdAt && isAfter(createdAt, last7Days);
    }).length;
    const leadsMes = leads.filter(l => {
      const createdAt = safeParseDate(l.created_at);
      return createdAt && isAfter(createdAt, last30Days);
    }).length;
    const leadsConvertidos = leads.filter(l => l.status === "convertido").length;
    const leadsEmContato = leads.filter(l => l.status === "contato").length;
    const leadsAgendados = leads.filter(l => l.status === "agendado").length;
    const leadsConfirmados = leads.filter(l => l.status === "confirmado").length;
    const leadsAtendidos = leads.filter(l => l.status === "atendido").length;
    const taxaConversao = totalLeads > 0 ? ((leadsConvertidos / totalLeads) * 100).toFixed(1) : "0";

    const leadsParados = leads.filter(l => {
      const lastUpdate = safeParseDate(l.updated_at || l.created_at);
      return lastUpdate && !isAfter(lastUpdate, last7Days) &&
             l.status !== "convertido" &&
             l.status !== "atendido" &&
             l.status !== "perdido" &&
             l.status !== "cancelado";
    }).length;

    const totalIndicacoes = indicacoes.length;
    const indicacoesRecentes = indicacoes.filter(i => {
      const createdAt = safeParseDate(i.created_at);
      return createdAt && isAfter(createdAt, last7Days);
    }).length;

    const totalAgendamentos = agendamentos.length;
    const todayStr = format(today, "yyyy-MM-dd");
    const agendamentosHoje = agendamentos.filter(a => {
      if (!a.data_agendamento) return false;
      const agendamentoDate = typeof a.data_agendamento === 'string'
        ? parseISO(a.data_agendamento)
        : new Date(a.data_agendamento);
      if (!isValid(agendamentoDate)) return false;
      return format(agendamentoDate, "yyyy-MM-dd") === todayStr;
    }).length;
    const agendamentosPendentes = agendamentos.filter(a => a.status === "agendado").length;

    const totalFranqueados = franqueados.length;
    const franqueadosAtivos = franqueados.filter(f => f.status === "Ativo").length;

    // Tempo médio de conversão (dias)
    const leadsConvertidosComData = leads.filter(l => l.status === "convertido" && l.data_conversao && l.created_at);
    let tempoMedioConversao: number | null = null;
    if (leadsConvertidosComData.length > 0) {
      const totalDias = leadsConvertidosComData.reduce((acc, l) => {
        const criacao = safeParseDate(l.created_at);
        const conversao = safeParseDate(l.data_conversao);
        if (criacao && conversao) {
          return acc + ((conversao.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24));
        }
        return acc;
      }, 0);
      tempoMedioConversao = Math.round(totalDias / leadsConvertidosComData.length);
    }

    // =================================================================
    // MÉTRICAS DE NEGÓCIO
    // =================================================================

    // Valor no Pipeline (leads ativos com valor estimado)
    const leadsAtivos = leads.filter(l =>
      !['perdido', 'cancelado', 'convertido'].includes(l.status || '')
    );
    const valorPipeline = leadsAtivos.reduce((acc, l) => acc + (l.valor_estimado || 0), 0);

    // Valor Convertido (total valor_conversao de leads convertidos)
    const valorConvertido = leads.filter(l => l.status === 'convertido')
      .reduce((acc, l) => acc + (l.valor_conversao || l.valor_estimado || 0), 0);

    // Ticket Médio
    const leadsConvertidosComValor = leads.filter(l =>
      l.status === 'convertido' && (l.valor_conversao || l.valor_estimado)
    );
    const ticketMedio = leadsConvertidosComValor.length > 0
      ? valorConvertido / leadsConvertidosComValor.length
      : 0;

    // SLA: Tempo médio até primeiro atendimento (created_at → data_agendamento)
    const leadsComAgendamento = leads.filter(l => l.data_agendamento && l.created_at);
    let slaTempoMedioHoras: number | null = null;
    if (leadsComAgendamento.length > 0) {
      const totalHoras = leadsComAgendamento.reduce((acc, l) => {
        const criacao = safeParseDate(l.created_at);
        const agendamento = safeParseDate(l.data_agendamento);
        if (criacao && agendamento) {
          return acc + ((agendamento.getTime() - criacao.getTime()) / (1000 * 60 * 60));
        }
        return acc;
      }, 0);
      slaTempoMedioHoras = Math.round(totalHoras / leadsComAgendamento.length);
    }

    // Conversões no mês
    const conversoesNoMes = leads.filter(l => {
      if (l.status !== 'convertido') return false;
      const convDate = safeParseDate(l.data_conversao || l.updated_at);
      return convDate && isAfter(convDate, last30Days);
    }).length;

    return {
      totalLeads,
      leadsRecentes,
      leadsMes,
      leadsConvertidos,
      leadsEmContato,
      leadsAgendados,
      leadsConfirmados,
      leadsAtendidos,
      leadsParados,
      taxaConversao,
      totalIndicacoes,
      indicacoesRecentes,
      totalAgendamentos,
      agendamentosHoje,
      agendamentosPendentes,
      totalFranqueados,
      franqueadosAtivos,
      tempoMedioConversao,
      // Business metrics
      valorPipeline,
      valorConvertido,
      ticketMedio,
      slaTempoMedioHoras,
      conversoesNoMes,
    };
  }, [leads, indicacoes, agendamentos, franqueados]);

  // Funnel data
  const funnelData = useMemo(() => {
    const contatados = leads.filter(l => l.status === "contato").length;
    const agendados = leads.filter(l => l.status === "agendado").length;
    const comparecimentos = leads.filter(l => l.status === "atendido").length;
    const conversoes = leads.filter(l => l.status === "convertido").length;

    const total = leads.length || 1;

    return [
      {
        etapa: "Recebidos",
        quantidade: total,
        percentual: 100,
        conversaoAnterior: 100
      },
      {
        etapa: "Contatados",
        quantidade: contatados + agendados + comparecimentos + conversoes,
        percentual: ((contatados + agendados + comparecimentos + conversoes) / total) * 100,
        conversaoAnterior: ((contatados + agendados + comparecimentos + conversoes) / total) * 100
      },
      {
        etapa: "Agendados",
        quantidade: agendados + comparecimentos + conversoes,
        percentual: ((agendados + comparecimentos + conversoes) / total) * 100,
        conversaoAnterior: (contatados + agendados + comparecimentos + conversoes) > 0
          ? ((agendados + comparecimentos + conversoes) / (contatados + agendados + comparecimentos + conversoes)) * 100
          : 0
      },
      {
        etapa: "Comparecimentos",
        quantidade: comparecimentos + conversoes,
        percentual: ((comparecimentos + conversoes) / total) * 100,
        conversaoAnterior: (agendados + comparecimentos + conversoes) > 0
          ? ((comparecimentos + conversoes) / (agendados + comparecimentos + conversoes)) * 100
          : 0
      },
      {
        etapa: "Conversões",
        quantidade: conversoes,
        percentual: (conversoes / total) * 100,
        conversaoAnterior: (comparecimentos + conversoes) > 0
          ? (conversoes / (comparecimentos + conversoes)) * 100
          : 0
      },
    ];
  }, [leads]);

  // Trend data for selected period
  const trendDays = periodo > 0 ? Math.min(periodo, 90) : 30;
  const trendData = useMemo(() => {
    const today = new Date();
    const start = subDays(today, trendDays);
    const days = eachDayOfInterval({ start, end: today });

    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");

      const leadsCount = leads.filter(l =>
        safeFormatDate(l.created_at, "yyyy-MM-dd") === dayStr
      ).length;

      const conversoes = leads.filter(l =>
        l.status === "convertido" &&
        safeFormatDate(l.updated_at || l.created_at, "yyyy-MM-dd") === dayStr
      ).length;

      const indicacoesCount = indicacoes.filter(i =>
        safeFormatDate(i.created_at, "yyyy-MM-dd") === dayStr
      ).length;

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        leads: leadsCount,
        conversoes,
        indicacoes: indicacoesCount,
      };
    });
  }, [leads, indicacoes, trendDays]);

  // Leads by gender (pie chart)
  const leadsByGenero = useMemo(() => {
    const generoCounts: Record<string, number> = {};
    leads.forEach(l => {
      const genero = l.genero || "Não informado";
      generoCounts[genero] = (generoCounts[genero] || 0) + 1;
    });

    return Object.entries(generoCounts)
      .map(([name, value]) => ({
        name,
        value,
        fill: GENDER_COLORS[name] || "#94a3b8"
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // Leads by bairro (para franchise view)
  const leadsByBairro = useMemo(() => {
    const bairroCounts: Record<string, number> = {};
    leads.forEach(l => {
      const bairro = l.bairro || "Não informado";
      bairroCounts[bairro] = (bairroCounts[bairro] || 0) + 1;
    });

    return Object.entries(bairroCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leads]);

  // Leads by serviço de interesse
  const leadsByServico = useMemo(() => {
    const servicoCounts: Record<string, number> = {};
    leads.forEach(l => {
      const servico = l.servico_interesse || "Não informado";
      servicoCounts[servico] = (servicoCounts[servico] || 0) + 1;
    });

    const total = leads.length || 1;
    return Object.entries(servicoCounts)
      .map(([name, value]) => ({
        name: name.length > 25 ? name.substring(0, 25) + "..." : name,
        fullName: name,
        value,
        percentage: ((value / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads]);

  // Leads por dia da semana
  const leadsByDiaSemana = useMemo(() => {
    const diaCounts: number[] = [0, 0, 0, 0, 0, 0, 0]; // Dom-Sáb
    leads.forEach(l => {
      const date = safeParseDate(l.created_at);
      if (date) {
        diaCounts[getDay(date)] += 1;
      }
    });

    return DIAS_SEMANA.map((name, index) => ({
      name,
      value: diaCounts[index],
    }));
  }, [leads]);

  // Leads by unidade (horizontal bar chart) - apenas global view
  const leadsByUnidade = useMemo(() => {
    if (isFranchiseView) return [];
    const unidadeCounts: Record<string, number> = {};
    leads.forEach(l => {
      const unidade = l.unidade || "Não vinculado";
      unidadeCounts[unidade] = (unidadeCounts[unidade] || 0) + 1;
    });

    return Object.entries(unidadeCounts)
      .map(([name, value]) => ({
        name: name.replace("Viniun ", "").substring(0, 18),
        fullName: name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [leads, isFranchiseView]);

  // Leads by cidade
  const leadsByCidade = useMemo(() => {
    const cidadeCounts: Record<string, number> = {};
    leads.forEach(l => {
      const cidade = l.cidade || "Não informado";
      cidadeCounts[cidade] = (cidadeCounts[cidade] || 0) + 1;
    });

    return Object.entries(cidadeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads]);

  // Leads by origem (acquisition channels) - com nomes mapeados
  const leadsByOrigem = useMemo(() => {
    // Agrupar por label legível (não por valor bruto)
    const origemCounts: Record<string, number> = {};
    leads.forEach(l => {
      const rawOrigem = l.origem || "Não informado";
      const label = getOrigemLabel(rawOrigem);
      origemCounts[label] = (origemCounts[label] || 0) + 1;
    });

    const total = leads.length || 1;
    return Object.entries(origemCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: getOrigemColor(name),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leads]);

  // Unit performance ranking - apenas global view
  const unidadeRanking = useMemo(() => {
    if (isFranchiseView) return [];
    const unidadeStats: Record<string, {
      total: number;
      convertidos: number;
      agendados: number;
      emContato: number;
    }> = {};

    leads.forEach(l => {
      const unidade = l.unidade || "Não vinculado";
      if (!unidadeStats[unidade]) {
        unidadeStats[unidade] = { total: 0, convertidos: 0, agendados: 0, emContato: 0 };
      }
      unidadeStats[unidade].total += 1;

      if (l.status === "convertido") {
        unidadeStats[unidade].convertidos += 1;
      }
      if (l.status === "agendado" || l.status === "atendido") {
        unidadeStats[unidade].agendados += 1;
      }
      if (l.status === "contato") {
        unidadeStats[unidade].emContato += 1;
      }
    });

    return Object.entries(unidadeStats)
      .map(([name, stats]) => ({
        name: name.replace("Viniun ", ""),
        fullName: name,
        total: stats.total,
        convertidos: stats.convertidos,
        agendados: stats.agendados,
        emContato: stats.emContato,
        taxaConversao: stats.total > 0 ? ((stats.convertidos / stats.total) * 100) : 0,
        taxaAgendamento: stats.total > 0 ? ((stats.agendados / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.taxaConversao - a.taxaConversao)
      .slice(0, 15);
  }, [leads, isFranchiseView]);

  // Conversão por origem (para franchise view - insights inteligentes)
  const conversaoPorOrigem = useMemo(() => {
    if (!isFranchiseView) return [];
    const origemStats: Record<string, { total: number; convertidos: number }> = {};
    leads.forEach(l => {
      const rawOrigem = l.origem || "Não informado";
      const label = getOrigemLabel(rawOrigem);
      if (!origemStats[label]) origemStats[label] = { total: 0, convertidos: 0 };
      origemStats[label].total += 1;
      if (l.status === "convertido") origemStats[label].convertidos += 1;
    });

    return Object.entries(origemStats)
      .filter(([, stats]) => stats.total >= 2)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        convertidos: stats.convertidos,
        taxa: stats.total > 0 ? Math.round((stats.convertidos / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 5);
  }, [leads, isFranchiseView]);

  // =================================================================
  // RANK DE CONSULTORAS (por leads, conversão e conversas WA)
  // =================================================================
  const consultorasRanking = useMemo(() => {
    if (!responsibleUsers || responsibleUsers.length === 0) return [];

    // Calcular conversões por consultora
    const userStats = new Map<string, { total: number; convertidos: number; ativos: number }>();
    leads.forEach(l => {
      if (!l.atribuido_para) return;
      if (!userStats.has(l.atribuido_para)) {
        userStats.set(l.atribuido_para, { total: 0, convertidos: 0, ativos: 0 });
      }
      const stats = userStats.get(l.atribuido_para)!;
      stats.total++;
      if (l.status === 'convertido') stats.convertidos++;
      if (!['perdido', 'cancelado', 'convertido'].includes(l.status || '')) stats.ativos++;
    });

    const waCounts = waUserConversations as Record<string, number>;
    return responsibleUsers
      .map(u => {
        const stats = userStats.get(u.id) || { total: 0, convertidos: 0, ativos: 0 };
        return {
          id: u.id,
          nome: u.nome,
          cargo: u.cargo,
          avatar_url: u.avatar_url,
          total_leads: stats.total,
          convertidos: stats.convertidos,
          ativos: stats.ativos,
          taxa: stats.total > 0 ? Math.round((stats.convertidos / stats.total) * 100) : 0,
          conversas_wa: waCounts[u.id] || 0,
        };
      })
      .filter(u => u.total_leads > 0 || u.conversas_wa > 0)
      .sort((a, b) => b.convertidos - a.convertidos || b.taxa - a.taxa)
      .slice(0, 10);
  }, [responsibleUsers, leads, waUserConversations]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // HEADER - adaptativo
  // ============================================================================
  const headerTitle = isFranchiseView && franchise
    ? `Dashboard - ${franchise.nome || franchise.nome_fantasia || "Minha Unidade"}`
    : "Dashboard";

  const headerSubtitle = isFranchiseView && franchise
    ? `Visão geral da sua unidade${franchise.cidade ? ` em ${franchise.cidade}` : ""}`
    : tenant
      ? `Visão geral - ${tenant.nome_fantasia}`
      : "Visão geral do sistema";

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{headerTitle}</h1>
          <p className="text-muted-foreground">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-1">Período:</span>
          {[
            { value: 7, label: '7 dias' },
            { value: 30, label: '30 dias' },
            { value: 90, label: '90 dias' },
            { value: 0, label: 'Tudo' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={periodo === opt.value ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setPeriodo(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      {periodo > 0 && comparison && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground -mt-3">
          <span>vs {periodo} dias anteriores:</span>
          <span className={comparison.leadsTotal > 0 ? 'text-emerald-600 font-medium' : comparison.leadsTotal < 0 ? 'text-red-500 font-medium' : ''}>
            Leads {comparison.leadsTotal > 0 ? '▲' : comparison.leadsTotal < 0 ? '▼' : '='} {Math.abs(comparison.leadsTotal)}%
          </span>
          <span className={comparison.conversoes > 0 ? 'text-emerald-600 font-medium' : comparison.conversoes < 0 ? 'text-red-500 font-medium' : ''}>
            Conversões {comparison.conversoes > 0 ? '▲' : comparison.conversoes < 0 ? '▼' : '='} {Math.abs(comparison.conversoes)}%
          </span>
          <span className={comparison.taxa > 0 ? 'text-emerald-600 font-medium' : comparison.taxa < 0 ? 'text-red-500 font-medium' : ''}>
            Taxa {comparison.taxa > 0 ? '+' : ''}{comparison.taxa}pp
          </span>
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN KPIs - adaptativo por nível de acesso */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads - sempre visível */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/leads")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{metrics.totalLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {periodo > 0 ? `últimos ${periodo} dias` : `+${metrics.leadsRecentes} últimos 7 dias`}
                  {comparison && comparison.leadsTotal !== 0 && (
                    <span className={`ml-1 font-medium ${comparison.leadsTotal > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comparison.leadsTotal > 0 ? '▲' : '▼'}{Math.abs(comparison.leadsTotal)}%
                    </span>
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão - sempre visível */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold">{metrics.taxaConversao}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.leadsConvertidos} efetivos
                  {comparison && comparison.taxa !== 0 && (
                    <span className={`ml-1 font-medium ${comparison.taxa > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comparison.taxa > 0 ? '▲' : '▼'}{Math.abs(comparison.taxa)}pp
                    </span>
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicações - sempre visível */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/indicacoes")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Indicações</p>
                <p className="text-3xl font-bold">{metrics.totalIndicacoes}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {periodo > 0 ? `últimos ${periodo} dias` : `+${metrics.indicacoesRecentes} últimos 7 dias`}
                  {comparison && comparison.indicacoes !== 0 && (
                    <span className={`ml-1 font-medium ${comparison.indicacoes > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comparison.indicacoes > 0 ? '▲' : '▼'}{Math.abs(comparison.indicacoes)}%
                    </span>
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4º Card: Franqueados (global) OU Leads no Mês (franchise) */}
        {isGlobalView ? (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/franqueados")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Franqueados</p>
                  <p className="text-3xl font-bold">{metrics.totalFranqueados}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.franqueadosAtivos} ativos
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads no Mês</p>
                  <p className="text-3xl font-bold">{metrics.leadsMes}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    últimos 30 dias
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/agendamentos")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
                <p className="text-3xl font-bold">{metrics.agendamentosHoje}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.agendamentosPendentes} pendentes
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Contato</p>
                <p className="text-3xl font-bold">{metrics.leadsEmContato}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.leadsAgendados} agendados
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Phone className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3º card: Tempo Médio (franchise) OU Vagas (global) */}
        {isFranchiseView ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio Conversão</p>
                  <p className="text-3xl font-bold">
                    {metrics.tempoMedioConversao !== null ? `${metrics.tempoMedioConversao}d` : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    dias até converter
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/recrutamento")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vagas Abertas</p>
                  <p className="text-3xl font-bold">{recrutamentoMetrics?.vagasPublicadas || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recrutamentoMetrics?.totalCandidatos || 0} candidatos
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={metrics.leadsParados > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Parados</p>
                <p className="text-3xl font-bold">{metrics.leadsParados}</p>
                <p className="text-xs text-destructive mt-1">
                  {metrics.leadsParados > 0 ? "Atenção necessária" : "Tudo em dia"}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                metrics.leadsParados > 0 ? "bg-destructive/10" : "bg-success/10"
              }`}>
                {metrics.leadsParados > 0 ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* BUSINESS METRICS - Métricas Estratégicas */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-800">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(metrics.valorPipeline)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(metrics.valorConvertido)}
                </p>
                <p className="text-[10px] text-muted-foreground">{metrics.conversoesNoMes} no mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-800">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {metrics.ticketMedio > 0 ? formatCurrency(metrics.ticketMedio) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          metrics.slaTempoMedioHoras !== null && metrics.slaTempoMedioHoras <= 24
            ? 'from-green-50 to-green-100/50 border-green-200 dark:from-green-950/30 dark:to-green-900/20 dark:border-green-800'
            : metrics.slaTempoMedioHoras !== null && metrics.slaTempoMedioHoras <= 48
              ? 'from-amber-50 to-amber-100/50 border-amber-200 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800'
              : 'from-red-50 to-red-100/50 border-red-200 dark:from-red-950/30 dark:to-red-900/20 dark:border-red-800'
        }`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Timer className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SLA Atendimento</p>
                <p className="text-xl font-bold">
                  {metrics.slaTempoMedioHoras !== null
                    ? metrics.slaTempoMedioHoras < 24
                      ? `${metrics.slaTempoMedioHoras}h`
                      : `${Math.round(metrics.slaTempoMedioHoras / 24)}d`
                    : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground">tempo médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200 dark:from-violet-950/30 dark:to-violet-900/20 dark:border-violet-800">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo Conversão</p>
                <p className="text-xl font-bold text-violet-700 dark:text-violet-400">
                  {metrics.tempoMedioConversao !== null ? `${metrics.tempoMedioConversao}d` : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground">dias até fechar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* METAS / GOALS */}
      {/* ================================================================== */}
      {metas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="h-5 w-5 text-amber-500" />
                Metas Ativas
              </CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{metasStats.total} metas</span>
                {metasStats.atingidas > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">
                    {metasStats.atingidas} atingidas
                  </Badge>
                )}
                <Badge variant="secondary">
                  {metasStats.progresso_medio}% médio
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metas
                .filter(m => m.status !== 'expirada')
                .slice(0, 6)
                .map(meta => {
                  const percent = meta.percentual || 0;
                  const statusColor = meta.status === 'atingida' ? 'bg-emerald-500'
                    : meta.status === 'proxima' ? 'bg-amber-500'
                    : 'bg-blue-500';

                  return (
                    <div key={meta.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium truncate max-w-[200px]">{meta.titulo}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {meta.tipo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${statusColor}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-foreground min-w-[40px] text-right">
                          {percent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(meta.valor_atual ?? 0).toLocaleString('pt-BR')} / {(meta.valor_meta ?? 0).toLocaleString('pt-BR')}
                        {meta.data_fim && (() => {
                          const d = safeParseDate(meta.data_fim);
                          return d ? ` · até ${format(d, 'dd/MM')}` : '';
                        })()}
                      </p>
                    </div>
                  );
                })}
            </div>
            {metas.filter(m => m.status !== 'expirada').length > 6 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => navigate("/metas")}>
                  Ver todas as metas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* FUNNEL + GENDER */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ConversionFunnel data={funnelData} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Leads por Gênero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsByGenero}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {leadsByGenero.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 2px 4px rgb(0 0 0 / 0.05)"
                    }}
                    formatter={(value: number) => [`${value} leads`, "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {leadsByGenero.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* TREND CHART */}
      {/* ================================================================== */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Evolução de Leads - Últimos {trendDays} Dias</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIndicacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgb(0 0 0 / 0.05)",
                    fontSize: "12px"
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Novos Leads"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="conversoes"
                  name="Conversões"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorConversoes)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="indicacoes"
                  name="Indicações"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorIndicacoes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* FRANCHISE VIEW: Bairro + Serviço de Interesse */}
      {/* ================================================================== */}
      {isFranchiseView && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leads por Bairro */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Leads por Bairro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadsByBairro.map((bairro, index) => {
                  const maxValue = leadsByBairro[0]?.value || 1;
                  const percentage = (bairro.value / (metrics.totalLeads || 1)) * 100;
                  const barWidth = (bairro.value / maxValue) * 100;

                  return (
                    <div key={bairro.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[150px]">{bairro.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{bairro.value} leads</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {leadsByBairro.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado de bairro disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leads por Serviço de Interesse */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Serviços Mais Procurados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadsByServico.map((servico, index) => {
                  const maxValue = leadsByServico[0]?.value || 1;
                  const barWidth = (servico.value / maxValue) * 100;

                  return (
                    <div key={servico.fullName} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[180px]" title={servico.fullName}>
                          {servico.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{servico.value}</span>
                          <Badge variant="secondary" className="text-xs">
                            {servico.percentage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {leadsByServico.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado de serviço disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* FRANCHISE VIEW: Dia da semana + Conversão por Origem */}
      {/* ================================================================== */}
      {isFranchiseView && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leads por dia da semana */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Leads por Dia da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsByDiaSemana}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 2px 4px rgb(0 0 0 / 0.05)"
                      }}
                      formatter={(value: number) => [`${value} leads`, "Leads"]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversão por Origem (insights) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Melhor Conversão por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversaoPorOrigem.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`text-lg font-bold ${
                        index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.convertidos}/{item.total} convertidos
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={item.taxa >= 30 ? "default" : "secondary"}
                      className={
                        item.taxa >= 30
                          ? "bg-emerald-500/20 text-emerald-700 border-emerald-300"
                          : ""
                      }
                    >
                      {item.taxa}%
                    </Badge>
                  </div>
                ))}
                {conversaoPorOrigem.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Dados insuficientes para análise
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* GLOBAL VIEW: Leads por Unidade + Cidade */}
      {/* ================================================================== */}
      {isGlobalView && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Leads by Unidade */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Leads por Unidade</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/franqueados")}>
                  Ver todos
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsByUnidade} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={90}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 2px 4px rgb(0 0 0 / 0.05)"
                      }}
                      formatter={(value: number, _name: string, props: any) => [
                        `${value} leads`,
                        props.payload.fullName
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads by Cidade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Leads por Cidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadsByCidade.map((cidade, index) => {
                  const maxValue = leadsByCidade[0]?.value || 1;
                  const percentage = (cidade.value / (metrics.totalLeads || 1)) * 100;
                  const barWidth = (cidade.value / maxValue) * 100;

                  return (
                    <div key={cidade.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[150px]">{cidade.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{cidade.value} leads</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {leadsByCidade.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* Origem dos Leads - sempre visível (com cores por canal) */}
      {/* ================================================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Origem dos Leads (Canais de Aquisição)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByOrigem.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByOrigem} layout="vertical" margin={{ left: 20, right: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={120}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    }}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} leads (${props.payload.percentage}%)`,
                      props.payload.name
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    label={{
                      position: "right",
                      fontSize: 11,
                      fill: "#6b7280",
                      formatter: (value: number) => value
                    }}
                  >
                    {leadsByOrigem.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* GLOBAL VIEW: Unit Performance Ranking */}
      {/* ================================================================== */}
      {isGlobalView && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Ranking de Performance por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Unidade</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Em Contato</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Agendados</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Convertidos</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Taxa Conv.</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {unidadeRanking.map((unidade, index) => (
                    <tr
                      key={unidade.fullName}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        index < 3 ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="py-3 px-2">
                        {index === 0 ? (
                          <Medal className="h-5 w-5 text-amber-500" />
                        ) : index === 1 ? (
                          <Medal className="h-5 w-5 text-slate-400" />
                        ) : index === 2 ? (
                          <Medal className="h-5 w-5 text-amber-700" />
                        ) : (
                          <span className="text-muted-foreground pl-1">{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium truncate max-w-[180px]" title={unidade.fullName}>
                        {unidade.name}
                      </td>
                      <td className="text-center py-3 px-2">{unidade.total}</td>
                      <td className="text-center py-3 px-2 text-cyan-600">{unidade.emContato}</td>
                      <td className="text-center py-3 px-2 text-amber-600">{unidade.agendados}</td>
                      <td className="text-center py-3 px-2 text-emerald-600 font-medium">{unidade.convertidos}</td>
                      <td className="text-center py-3 px-2">
                        <Badge
                          variant={unidade.taxaConversao >= 20 ? "default" : unidade.taxaConversao >= 10 ? "secondary" : "outline"}
                          className={
                            unidade.taxaConversao >= 20
                              ? "bg-emerald-500/20 text-emerald-700 border-emerald-300"
                              : unidade.taxaConversao >= 10
                                ? "bg-amber-500/20 text-amber-700 border-amber-300"
                                : ""
                          }
                        >
                          {unidade.taxaConversao.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                unidade.taxaConversao >= 20
                                  ? "bg-emerald-500"
                                  : unidade.taxaConversao >= 10
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                              }`}
                              style={{ width: `${Math.min(unidade.taxaConversao * 2, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {unidadeRanking.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* RANK DE CONSULTORAS + WHATSAPP STATS */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rank de Consultoras */}
        {consultorasRanking.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Rank de Consultoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {consultorasRanking.map((user, index) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <span className={`text-lg font-bold w-6 text-center ${
                      index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-muted-foreground"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.total_leads} leads · {user.ativos} ativos
                        {user.conversas_wa > 0 && (
                          <span className="text-green-600"> · {user.conversas_wa} conversas</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={user.taxa >= 20 ? "default" : "secondary"}
                        className={
                          user.taxa >= 20
                            ? "bg-emerald-500/20 text-emerald-700 border-emerald-300"
                            : ""
                        }
                      >
                        {user.convertidos} conv · {user.taxa}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Stats */}
        {whatsappMetrics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                WhatsApp - Resumo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground">Mensagens 24h</p>
                  <p className="text-2xl font-bold text-green-600">{whatsappMetrics.messagesLast24h}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground">Mensagens 7d</p>
                  <p className="text-2xl font-bold text-blue-600">{whatsappMetrics.messagesLast7d}</p>
                </div>
                <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                  <p className="text-xs text-muted-foreground">Conversas Ativas</p>
                  <p className="text-2xl font-bold text-violet-600">{whatsappMetrics.activeConversations}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-muted-foreground">Não Lidas</p>
                  <p className="text-2xl font-bold text-amber-600">{whatsappMetrics.unreadConversations}</p>
                </div>
              </div>

              {/* Trend diário */}
              {whatsappMetrics.dailyTrend && whatsappMetrics.dailyTrend.length > 0 && (
                <div className="h-40">
                  <p className="text-xs text-muted-foreground mb-2">Mensagens por dia (últimos 7 dias)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatsappMetrics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => {
                          const parts = v.split('-');
                          return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : v;
                        }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                      />
                      <Bar dataKey="inbound" name="Recebidas" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="stack" />
                      <Bar dataKey="outbound" name="Enviadas" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Session ranking */}
              {whatsappMetrics.sessionRanking && whatsappMetrics.sessionRanking.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sessões por Atividade</p>
                  <div className="space-y-2">
                    {whatsappMetrics.sessionRanking.slice(0, 4).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${s.status === 'connected' ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="truncate max-w-[160px]">{s.display_name || s.session_name}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {s.conversations_today} hoje · {s.conversations_7d} semana
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================================================================== */}
      {/* Quick Access - adaptativo */}
      {/* ================================================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-3 ${isFranchiseView ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-6"}`}>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate("/leads")}
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs">Leads</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate("/indicacoes")}
            >
              <UserPlus className="h-5 w-5 text-violet-500" />
              <span className="text-xs">Indicações</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate("/agendamentos")}
            >
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <span className="text-xs">Agendamentos</span>
            </Button>
            {isGlobalView && (
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => navigate("/franqueados")}
              >
                <Building2 className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Franqueados</span>
              </Button>
            )}
            {isGlobalView && (
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => navigate("/recrutamento")}
              >
                <Briefcase className="h-5 w-5 text-pink-500" />
                <span className="text-xs">Recrutamento</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 relative"
              onClick={() => navigate("/leads")}
            >
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs">Pendentes</span>
              {metrics.leadsParados > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {metrics.leadsParados}
                </Badge>
              )}
            </Button>
            {isFranchiseView && (
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => navigate("/funil")}
              >
                <Target className="h-5 w-5 text-emerald-500" />
                <span className="text-xs">Funil</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
