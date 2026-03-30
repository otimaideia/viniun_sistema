import { useState, useCallback, useEffect } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import type {
  AnalyticsPeriod,
  LeadAnalyticsMetrics,
  HeatmapCell,
  EngagementBucket,
  ResponseMetrics,
  KeywordMention,
  FunnelItem,
  MonthlyTrend,
  ServiceDemand,
  FAQItem,
  ICPData,
} from "@/types/lead-analytics";

// Keywords for body area detection
const BODY_AREA_KEYWORDS = [
  "virilha", "íntima", "intima", "perianal",
  "buço", "buco", "rosto", "facial", "queixo",
  "axila",
  "perna", "joelho",
  "glúteo", "gluteo", "bumbum",
  "barba", "pescoço", "cavanhaque",
  "costas",
  "corpo inteiro", "corpo todo",
  "braço",
  "abdômen", "barriga",
];

const PROCEDURE_KEYWORDS = [
  "botox", "preenchimento", "limpeza de pele", "drenagem",
  "criolipólise", "crio", "massagem", "revitalização",
  "radiofrequência", "microagulhamento", "clareamento",
];

const FAQ_KEYWORDS = [
  "mais informações|tenho interesse|quero saber|gostaria de saber",
  "doi|dor|doer|machuca",
  "currículo|curriculo|vaga|emprego",
  "como funciona|me explica",
  "agendar|horário|horario|marcar",
  "parcela|dividir|quantas vezes",
  "resultado|funciona mesmo|para de nascer",
  "qual valor|qual o valor|quanto custa|qual preço|me passa o valor",
  "quantas sessões|quantas sessoes|quantos meses|quanto tempo",
  "tem promoção|alguma promoção|essa promoção",
];

const FAQ_LABELS = [
  "Interesse geral (mais informações)",
  "Medo de dor",
  "Currículo/Emprego",
  "Como funciona?",
  "Agendamento",
  "Parcelas/Dividir",
  "Resultado",
  "Valor/Preço",
  "Quantas sessões",
  "Promoção",
];

function getDateRange(period: AnalyticsPeriod): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const from = new Date(now);

  switch (period) {
    case "hoje":
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
  }

  return { from: from.toISOString(), to };
}

export function useLeadAnalyticsMT(period: AnalyticsPeriod = "90d") {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const [metrics, setMetrics] = useState<LeadAnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!tenant && accessLevel !== "platform") return;
    const tenantId = tenant?.id;
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { from, to } = getDateRange(period);
      const franchiseId = franchise?.id || null;

      // Parallel fetch: RPCs + client-side data
      const [
        heatmapRes,
        engagementRes,
        responseRes,
        leadsRes,
      ] = await Promise.all([
        // RPC 1: Heatmap
        supabase.rpc("analytics_message_heatmap", {
          p_tenant_id: tenantId,
          p_franchise_id: franchiseId,
          p_date_from: from,
          p_date_to: to,
        }),
        // RPC 2: Engagement
        supabase.rpc("analytics_conversation_engagement", {
          p_tenant_id: tenantId,
          p_franchise_id: franchiseId,
          p_date_from: from,
          p_date_to: to,
        }),
        // RPC 3: Response metrics
        supabase.rpc("analytics_response_metrics", {
          p_tenant_id: tenantId,
          p_franchise_id: franchiseId,
          p_date_from: from,
          p_date_to: to,
        }),
        // Client-side: Leads
        (() => {
          let query = supabase
            .from("mt_leads")
            .select("id, status, origem, servico_interesse, genero, cidade, created_at, convertido, valor_conversao, temperatura")
            .eq("tenant_id", tenantId)
            .is("deleted_at", null);

          if (franchiseId) {
            query = query.eq("franchise_id", franchiseId);
          }
          return query;
        })(),
      ]);

      // Parse RPC results
      const heatmap: HeatmapCell[] = (heatmapRes.data as HeatmapCell[]) || [];
      const engagement: EngagementBucket[] = (engagementRes.data as EngagementBucket[]) || [];
      const responseMetrics: ResponseMetrics = (responseRes.data as ResponseMetrics) || {
        taxa_resposta: 0,
        tempo_medio_minutos: 0,
        sem_resposta: 0,
        msgs_noturnas: 0,
        total_conversas: 0,
        conversas_respondidas: 0,
      };

      const leads = leadsRes.data || [];

      // --- Client-side computations ---

      // Funnel distribution
      const statusCounts: Record<string, number> = {};
      leads.forEach((l) => {
        const s = l.status || "novo";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const funnelDistribution: FunnelItem[] = Object.entries(statusCounts)
        .map(([status, count]) => ({
          status,
          count,
          percentage: leads.length > 0 ? Math.round((count / leads.length) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Monthly trend
      const monthCounts: Record<string, number> = {};
      leads.forEach((l) => {
        const month = l.created_at?.substring(0, 7) || "desconhecido";
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      const monthlyTrend: MonthlyTrend[] = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Service demand from servico_interesse
      const serviceCounts: Record<string, number> = {};
      leads.forEach((l) => {
        if (l.servico_interesse) {
          serviceCounts[l.servico_interesse] = (serviceCounts[l.servico_interesse] || 0) + 1;
        }
      });
      const serviceDemand: ServiceDemand[] = Object.entries(serviceCounts)
        .map(([servico, count]) => ({
          servico,
          count,
          percentage: leads.length > 0 ? Math.round((count / leads.length) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // ICP data
      const cityCounts: Record<string, number> = {};
      const genderCounts: Record<string, number> = {};
      const channelCounts: Record<string, number> = {};
      leads.forEach((l) => {
        if (l.cidade) cityCounts[l.cidade] = (cityCounts[l.cidade] || 0) + 1;
        const g = l.genero || "Não informado";
        genderCounts[g] = (genderCounts[g] || 0) + 1;
        const o = l.origem?.replace(/\s*\(franquia:.*\)/, "") || "Não informado";
        channelCounts[o] = (channelCounts[o] || 0) + 1;
      });

      const icpData: ICPData = {
        topCities: Object.entries(cityCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        genderDistribution: Object.entries(genderCounts)
          .map(([gender, count]) => ({ gender, count }))
          .sort((a, b) => b.count - a.count),
        topChannels: Object.entries(channelCounts)
          .map(([channel, count]) => ({ channel, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      };

      // Conversion rate
      const converted = leads.filter((l) => l.convertido || l.status === "convertido").length;
      const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 1000) / 10 : 0;

      // Now fetch keywords (separate call to avoid blocking main data)
      // We use static keywords for the body areas and procedures
      const keywordsToSearch = [...BODY_AREA_KEYWORDS, ...PROCEDURE_KEYWORDS];
      const keywordsRes = await supabase.rpc("analytics_keyword_mentions", {
        p_tenant_id: tenantId,
        p_keywords: keywordsToSearch,
        p_franchise_id: franchiseId,
        p_date_from: from,
        p_date_to: to,
      });

      const rawKeywords: KeywordMention[] = (keywordsRes.data as KeywordMention[]) || [];

      // Aggregate body area keywords into grouped areas
      const bodyAreaGroups: Record<string, { label: string; keywords: string[] }> = {
        "Virilha/Íntima": { label: "Virilha/Íntima", keywords: ["virilha", "íntima", "intima", "perianal"] },
        "Buço/Rosto": { label: "Buço/Rosto", keywords: ["buço", "buco", "rosto", "facial", "queixo"] },
        "Axilas": { label: "Axilas", keywords: ["axila"] },
        "Pernas": { label: "Pernas", keywords: ["perna", "joelho"] },
        "Glúteo": { label: "Glúteo", keywords: ["glúteo", "gluteo", "bumbum"] },
        "Barba/Pescoço": { label: "Barba/Pescoço", keywords: ["barba", "pescoço", "cavanhaque"] },
        "Costas": { label: "Costas", keywords: ["costas"] },
        "Corpo inteiro": { label: "Corpo inteiro", keywords: ["corpo inteiro", "corpo todo"] },
        "Braço": { label: "Braço", keywords: ["braço"] },
        "Abdômen": { label: "Abdômen", keywords: ["abdômen", "barriga"] },
      };

      const groupedAreas: KeywordMention[] = Object.values(bodyAreaGroups)
        .map((group) => {
          const total = group.keywords.reduce((sum, kw) => {
            const found = rawKeywords.find((r) => r.termo === kw);
            return sum + (found?.mencoes || 0);
          }, 0);
          return { termo: group.label, mencoes: total };
        })
        .filter((a) => a.mencoes > 0)
        .sort((a, b) => b.mencoes - a.mencoes);

      // Top procedures
      const procedureGroups: Record<string, string[]> = {
        "Botox": ["botox"],
        "Limpeza de pele": ["limpeza de pele"],
        "Revitalização": ["revitalização"],
        "Preenchimento": ["preenchimento"],
        "Drenagem": ["drenagem"],
        "Criolipólise": ["criolipólise", "crio"],
        "Massagem": ["massagem"],
        "Radiofrequência": ["radiofrequência"],
        "Microagulhamento": ["microagulhamento"],
        "Clareamento": ["clareamento"],
      };

      const topProcedures: KeywordMention[] = Object.entries(procedureGroups)
        .map(([label, keywords]) => {
          const total = keywords.reduce((sum, kw) => {
            const found = rawKeywords.find((r) => r.termo === kw);
            return sum + (found?.mencoes || 0);
          }, 0);
          return { termo: label, mencoes: total };
        })
        .filter((p) => p.mencoes > 0)
        .sort((a, b) => b.mencoes - a.mencoes);

      // FAQ - we use hardcoded counts from initial analysis proportional to period
      // In future, this should use analytics_keyword_mentions with FAQ patterns
      const topFAQ: FAQItem[] = FAQ_LABELS.map((label, i) => ({
        pergunta: label,
        count: 0, // Will be populated from RPC in future
      }));

      // Leads in period
      const periodLeads = leads.filter((l) => {
        const created = new Date(l.created_at || 0);
        return created >= new Date(from) && created <= new Date(to);
      });

      setMetrics({
        totalLeads: leads.length,
        newLeadsPeriod: periodLeads.length,
        responseRate: responseMetrics.taxa_resposta,
        leadsWithoutResponse: responseMetrics.sem_resposta,
        nightMessages: responseMetrics.msgs_noturnas,
        conversionRate,
        totalConversations: responseMetrics.total_conversas,
        funnelDistribution,
        monthlyTrend,
        serviceDemand,
        engagementFunnel: engagement,
        heatmap,
        topProcedures,
        topFAQ,
        keywordMentions: groupedAreas,
        icpData,
      });
    } catch (err) {
      console.error("[LeadAnalytics] Error fetching analytics:", err);
      setError(err instanceof Error ? err : new Error("Erro ao carregar analytics"));
    } finally {
      setIsLoading(false);
    }
  }, [tenant, franchise, accessLevel, period]);

  useEffect(() => {
    if (!isTenantLoading) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, isTenantLoading]);

  return {
    metrics,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch: fetchAnalytics,
  };
}
