// =============================================================================
// USE INDICACOES MT - Hook Multi-Tenant para Indicações de Leads
// =============================================================================
//
// Este hook gerencia indicações de leads (programa de indicações)
// com isolamento por tenant via TenantContext.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTLead } from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTIndicacaoHistorico {
  id: string;
  tenant_id: string;
  lead_indicador_id: string;
  lead_indicado_id: string;
  codigo_usado: string | null;
  campanha: string | null;
  origem: string | null;
  status: 'pendente' | 'validada' | 'convertido' | 'invalida';
  observacoes: string | null;
  data_indicacao: string;
  data_conversao: string | null;
  created_at: string;
  updated_at: string;

  // Relacionamentos
  lead_indicador?: MTLead;
  lead_indicado?: MTLead;
}

export interface MTIndicacaoKPIs {
  total_leads_que_indicaram: number;
  total_indicacoes: number;
  media_indicacoes_por_lead: number;
  cadeia_mais_longa: number;
  top_indicador?: { nome: string; quantidade: number };
  indicacoes_ultimo_mes: number;
  taxa_conversao_global: number;
}

export interface MTIndicacaoLeaderboardItem {
  posicao: number;
  lead_id: string;
  lead_nome: string;
  lead_codigo: string | null;
  lead_whatsapp: string | null;
  franchise_nome: string | null;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  ultima_indicacao: string | null;
}

export interface MTIndicacaoFiltros {
  periodo?: { inicio: string; fim: string };
  status?: MTIndicacaoHistorico['status'];
  campanha?: string;
  franchise_id?: string;
  busca?: string;
}

export interface MTIndicacaoArvoreNode {
  lead: MTLead;
  indicados: MTIndicacaoArvoreNode[];
  nivel: number;
  total_descendentes: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-indicacoes';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useIndicacoesMT(filtros: MTIndicacaoFiltros = {}) {
  const queryClient = useQueryClient();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ---------------------------------------------------------------------------
  // Query: Histórico de Indicações
  // ---------------------------------------------------------------------------

  const indicacoesQuery = useQuery({
    queryKey: [QUERY_KEY, 'historico', tenant?.id, franchise?.id, filtros],
    queryFn: async (): Promise<MTIndicacaoHistorico[]> => {
      const historico: MTIndicacaoHistorico[] = [];

      // =========================================================================
      // FONTE 1: Indicações lead-a-lead (via indicado_por_id)
      // =========================================================================
      let query = supabase
        .from('mt_leads')
        .select(`
          id,
          tenant_id,
          nome,
          telefone,
          whatsapp,
          email,
          codigo_indicacao,
          indicado_por_id,
          indicado_por_nome,
          created_at,
          franchise:mt_franchises (id, nome)
        `)
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo')
        .order('created_at', { ascending: false });

      // Filtros por tenant
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        query = query.eq('tenant_id', tenant.id);
        query = query.eq('franchise_id', franchise.id);
      }

      if (filtros.periodo) {
        query = query
          .gte('created_at', filtros.periodo.inicio)
          .lte('created_at', filtros.periodo.fim);
      }

      if (filtros.franchise_id) {
        query = query.eq('franchise_id', filtros.franchise_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar indicações lead-a-lead MT:', error);
        throw error;
      }

      // Batch: buscar indicadores
      const indicadorIds = [...new Set((data || []).map(d => d.indicado_por_id).filter(Boolean))];
      let indicadorMap = new Map<string, any>();
      if (indicadorIds.length > 0) {
        const { data: indicadores } = await supabase
          .from('mt_leads')
          .select('id, nome, telefone, whatsapp, email, codigo_indicacao, status')
          .in('id', indicadorIds);
        indicadorMap = new Map((indicadores || []).map(i => [i.id, i]));
      }

      (data || []).forEach((indicado) => {
        const indicador = indicadorMap.get(indicado.indicado_por_id) || null;
        historico.push({
          id: `lead-${indicado.indicado_por_id}-${indicado.id}`,
          tenant_id: indicado.tenant_id,
          lead_indicador_id: indicado.indicado_por_id,
          lead_indicado_id: indicado.id,
          codigo_usado: indicador?.codigo_indicacao || null,
          campanha: null,
          origem: 'Indicação de Lead',
          status: indicado.status === 'convertido' ? 'convertido' : 'validada',
          observacoes: null,
          data_indicacao: indicado.created_at,
          data_conversao: null,
          created_at: indicado.created_at,
          updated_at: indicado.created_at,
          lead_indicador: indicador as MTLead,
          lead_indicado: indicado as unknown as MTLead,
        });
      });

      // =========================================================================
      // FONTE 2: Indicações de influenciadoras (via mt_influencer_referrals)
      // =========================================================================
      let influencerQuery = supabase
        .from('mt_influencer_referrals')
        .select(`
          id,
          tenant_id,
          influencer_id,
          lead_id,
          codigo_usado,
          status,
          data_conversao,
          created_at,
          influencer:mt_influencers(id, nome, nome_artistico, codigo, whatsapp),
          lead:mt_leads(id, nome, telefone, whatsapp, email, status)
        `)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        influencerQuery = influencerQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        influencerQuery = influencerQuery.eq('tenant_id', tenant.id);
      }

      if (filtros.periodo) {
        influencerQuery = influencerQuery
          .gte('created_at', filtros.periodo.inicio)
          .lte('created_at', filtros.periodo.fim);
      }

      const { data: influencerReferrals, error: influencerError } = await influencerQuery;

      if (influencerError) {
        console.error('Erro ao buscar indicações de influenciadoras:', influencerError);
        // Não lançar erro - continuar com os dados que temos
      }

      (influencerReferrals || []).forEach((ref: any) => {
        const influencer = ref.influencer;
        const lead = ref.lead;

        // Mapear status do influencer referral para o formato da indicação
        let mappedStatus: MTIndicacaoHistorico['status'] = 'pendente';
        if (ref.status === 'convertido') mappedStatus = 'convertido';
        else if (ref.status === 'cancelado') mappedStatus = 'invalida';

        historico.push({
          id: `inf-${ref.id}`,
          tenant_id: ref.tenant_id,
          lead_indicador_id: ref.influencer_id,
          lead_indicado_id: ref.lead_id || '',
          codigo_usado: ref.codigo_usado,
          campanha: null,
          origem: 'Influenciadora',
          status: mappedStatus,
          observacoes: null,
          data_indicacao: ref.created_at,
          data_conversao: ref.data_conversao,
          created_at: ref.created_at,
          updated_at: ref.created_at,
          // Mapear influenciadora como "indicador" para exibição na tabela
          lead_indicador: influencer ? {
            id: influencer.id,
            nome: influencer.nome_artistico || influencer.nome,
            whatsapp: influencer.whatsapp,
            codigo_indicacao: influencer.codigo,
          } as unknown as MTLead : undefined,
          lead_indicado: lead as unknown as MTLead,
        });
      });

      // Ordenar por data (mais recente primeiro)
      historico.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Filtro de busca
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        return historico.filter((i) =>
          i.lead_indicador?.nome?.toLowerCase().includes(busca) ||
          i.lead_indicado?.nome?.toLowerCase().includes(busca) ||
          i.codigo_usado?.toLowerCase().includes(busca) ||
          i.origem?.toLowerCase().includes(busca)
        );
      }

      // Filtro de status
      if (filtros.status) {
        return historico.filter((i) => i.status === filtros.status);
      }

      return historico;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Query: KPIs de Indicações
  // ---------------------------------------------------------------------------

  const kpisQuery = useQuery({
    queryKey: [QUERY_KEY, 'kpis', tenant?.id, franchise?.id],
    queryFn: async (): Promise<MTIndicacaoKPIs> => {
      const indicacoesPorIndicador: Record<string, number> = {};
      let totalIndicacoes = 0;

      // =========================================================================
      // FONTE 1: Indicações lead-a-lead
      // =========================================================================
      let indicadoresQuery = supabase
        .from('mt_leads')
        .select('indicado_por_id')
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo');

      if (tenant) {
        indicadoresQuery = indicadoresQuery.eq('tenant_id', tenant.id);
      }

      const { data: indicados } = await indicadoresQuery;

      (indicados || []).forEach((i: { indicado_por_id: string }) => {
        indicacoesPorIndicador[`lead-${i.indicado_por_id}`] = (indicacoesPorIndicador[`lead-${i.indicado_por_id}`] || 0) + 1;
      });
      totalIndicacoes += (indicados || []).length;

      // =========================================================================
      // FONTE 2: Indicações de influenciadoras
      // =========================================================================
      let influencerCountQuery = supabase
        .from('mt_influencer_referrals')
        .select('influencer_id, status');

      if (tenant) {
        influencerCountQuery = influencerCountQuery.eq('tenant_id', tenant.id);
      }

      const { data: influencerRefs } = await influencerCountQuery;

      (influencerRefs || []).forEach((ref: { influencer_id: string; status: string }) => {
        indicacoesPorIndicador[`inf-${ref.influencer_id}`] = (indicacoesPorIndicador[`inf-${ref.influencer_id}`] || 0) + 1;
      });
      totalIndicacoes += (influencerRefs || []).length;

      // =========================================================================
      // Calcular KPIs combinados
      // =========================================================================
      const indicadoresUnicos = Object.keys(indicacoesPorIndicador);

      // Top indicador
      let topIndicadorKey: string | null = null;
      let maxIndicacoes = 0;
      for (const [key, count] of Object.entries(indicacoesPorIndicador)) {
        if (count > maxIndicacoes) {
          maxIndicacoes = count;
          topIndicadorKey = key;
        }
      }

      let topIndicadorNome = 'N/A';
      if (topIndicadorKey) {
        if (topIndicadorKey.startsWith('lead-')) {
          const leadId = topIndicadorKey.replace('lead-', '');
          const { data: topLead } = await supabase
            .from('mt_leads')
            .select('nome')
            .eq('id', leadId)
            .single();
          topIndicadorNome = topLead?.nome || 'N/A';
        } else if (topIndicadorKey.startsWith('inf-')) {
          const influencerId = topIndicadorKey.replace('inf-', '');
          const { data: topInfluencer } = await supabase
            .from('mt_influencers')
            .select('nome, nome_artistico')
            .eq('id', influencerId)
            .single();
          topIndicadorNome = topInfluencer?.nome_artistico || topInfluencer?.nome || 'N/A';
        }
      }

      // Indicações no último mês (combinadas)
      const umMesAtras = new Date();
      umMesAtras.setMonth(umMesAtras.getMonth() - 1);

      let indicacoesUltimoMesQuery = supabase
        .from('mt_leads')
        .select('id', { count: 'exact', head: true })
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo')
        .gte('created_at', umMesAtras.toISOString());

      if (tenant) {
        indicacoesUltimoMesQuery = indicacoesUltimoMesQuery.eq('tenant_id', tenant.id);
      }

      const { count: indicacoesLeadUltimoMes } = await indicacoesUltimoMesQuery;

      let influencerUltimoMesQuery = supabase
        .from('mt_influencer_referrals')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', umMesAtras.toISOString());

      if (tenant) {
        influencerUltimoMesQuery = influencerUltimoMesQuery.eq('tenant_id', tenant.id);
      }

      const { count: indicacoesInfluencerUltimoMes } = await influencerUltimoMesQuery;

      const indicacoesUltimoMes = (indicacoesLeadUltimoMes || 0) + (indicacoesInfluencerUltimoMes || 0);

      // Taxa de conversão (lead-a-lead + influencer convertidos)
      const influencerConvertidos = (influencerRefs || []).filter(
        (ref: { status: string }) => ref.status === 'convertido'
      ).length;

      let convertidasQuery = supabase
        .from('mt_leads')
        .select('id', { count: 'exact', head: true })
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo')
        .eq('convertido', true);

      if (tenant) {
        convertidasQuery = convertidasQuery.eq('tenant_id', tenant.id);
      }

      const { count: convertidasLead } = await convertidasQuery;
      const totalConvertidas = (convertidasLead || 0) + influencerConvertidos;
      const taxaConversao = totalIndicacoes > 0 ? (totalConvertidas / totalIndicacoes) * 100 : 0;

      // Calcular cadeia mais longa (max depth de indicações encadeadas)
      let cadeiaQuery = supabase
        .from('mt_leads')
        .select('id, indicado_por_id')
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo');
      if (tenant) cadeiaQuery = cadeiaQuery.eq('tenant_id', tenant.id);
      const { data: leadsComIndicador } = await cadeiaQuery;

      let cadeiaMaisLonga = 0;
      if (leadsComIndicador && leadsComIndicador.length > 0) {
        // Build parent map
        const parentMap = new Map<string, string>();
        for (const l of leadsComIndicador) {
          if (l.indicado_por_id) parentMap.set(l.id, l.indicado_por_id);
        }
        // Find max chain depth (follow indicado_por_id up to 10 levels to prevent infinite loops)
        for (const leadId of parentMap.keys()) {
          let depth = 1;
          let current = parentMap.get(leadId);
          const visited = new Set<string>([leadId]);
          while (current && depth < 10 && !visited.has(current)) {
            visited.add(current);
            if (parentMap.has(current)) {
              depth++;
              current = parentMap.get(current);
            } else {
              break;
            }
          }
          if (depth > cadeiaMaisLonga) cadeiaMaisLonga = depth;
        }
      }

      return {
        total_leads_que_indicaram: indicadoresUnicos.length,
        total_indicacoes: totalIndicacoes,
        media_indicacoes_por_lead: indicadoresUnicos.length > 0
          ? Math.round((totalIndicacoes / indicadoresUnicos.length) * 10) / 10
          : 0,
        cadeia_mais_longa: cadeiaMaisLonga,
        top_indicador: topIndicadorKey
          ? { nome: topIndicadorNome, quantidade: maxIndicacoes }
          : undefined,
        indicacoes_ultimo_mes: indicacoesUltimoMes,
        taxa_conversao_global: Math.round(taxaConversao * 10) / 10,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: Leaderboard
  // ---------------------------------------------------------------------------

  const leaderboardQuery = useQuery({
    queryKey: [QUERY_KEY, 'leaderboard', tenant?.id, franchise?.id],
    queryFn: async (): Promise<MTIndicacaoLeaderboardItem[]> => {
      // Buscar todos os leads indicados
      let indicadosQuery = supabase
        .from('mt_leads')
        .select('indicado_por_id, status, convertido')
        .not('indicado_por_id', 'is', null)
        .eq('status_geral', 'ativo');

      if (tenant) {
        indicadosQuery = indicadosQuery.eq('tenant_id', tenant.id);
      }

      const { data: indicados } = await indicadosQuery;

      // Contar por indicador
      const statsPorIndicador: Record<string, { total: number; convertidos: number }> = {};
      (indicados || []).forEach((i: { indicado_por_id: string; convertido?: boolean; status?: string }) => {
        if (!statsPorIndicador[i.indicado_por_id]) {
          statsPorIndicador[i.indicado_por_id] = { total: 0, convertidos: 0 };
        }
        statsPorIndicador[i.indicado_por_id].total++;
        if (i.convertido || i.status === 'convertido') {
          statsPorIndicador[i.indicado_por_id].convertidos++;
        }
      });

      // Ordenar por total de indicações
      const indicadoresOrdenados = Object.entries(statsPorIndicador)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);

      // Buscar dados dos indicadores em batch (elimina N+1)
      const indicadorIds = indicadoresOrdenados.map(([id]) => id);
      let indicadorMap = new Map<string, any>();

      if (indicadorIds.length > 0) {
        const { data: indicadores } = await supabase
          .from('mt_leads')
          .select(`
            id, nome, codigo_indicacao, whatsapp,
            franchise:mt_franchises (nome)
          `)
          .in('id', indicadorIds);

        indicadorMap = new Map((indicadores || []).map(i => [i.id, i]));
      }

      const leaderboard: MTIndicacaoLeaderboardItem[] = indicadoresOrdenados
        .map(([indicadorId, stats], i) => {
          const indicador = indicadorMap.get(indicadorId);
          if (!indicador) return null;

          return {
            posicao: i + 1,
            lead_id: indicador.id,
            lead_nome: indicador.nome,
            lead_codigo: indicador.codigo_indicacao,
            lead_whatsapp: indicador.whatsapp,
            franchise_nome: (indicador.franchise as any)?.nome || null,
            total_indicacoes: stats.total,
            indicacoes_convertidas: stats.convertidos,
            taxa_conversao: stats.total > 0
              ? Math.round((stats.convertidos / stats.total) * 1000) / 10
              : 0,
            ultima_indicacao: null,
          };
        })
        .filter(Boolean) as MTIndicacaoLeaderboardItem[];

      return leaderboard;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // ---------------------------------------------------------------------------
  // Funções Auxiliares
  // ---------------------------------------------------------------------------

  /**
   * Buscar indicações de um lead específico (pessoas que ele indicou)
   */
  const getIndicacoesByLead = async (leadId: string): Promise<MTLead[]> => {
    const { data, error } = await supabase
      .from('mt_leads')
      .select('*')
      .eq('indicado_por_id', leadId)
      .eq('status_geral', 'ativo')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar indicações do lead MT:', error);
      return [];
    }

    return (data || []) as MTLead[];
  };

  /**
   * Buscar quem indicou um lead
   */
  const getIndicadorByLead = async (leadId: string): Promise<MTLead | null> => {
    const { data: lead } = await supabase
      .from('mt_leads')
      .select('indicado_por_id')
      .eq('id', leadId)
      .single();

    if (!lead?.indicado_por_id) return null;

    const { data: indicador, error } = await supabase
      .from('mt_leads')
      .select('*')
      .eq('id', lead.indicado_por_id)
      .single();

    if (error) {
      console.error('Erro ao buscar indicador MT:', error);
      return null;
    }

    return indicador as MTLead;
  };

  /**
   * Buscar lead pelo código de indicação
   */
  const getLeadByCodigo = async (codigo: string): Promise<MTLead | null> => {
    let query = supabase
      .from('mt_leads')
      .select('*')
      .eq('codigo_indicacao', codigo)
      .eq('status_geral', 'ativo');

    if (tenant) {
      query = query.eq('tenant_id', tenant.id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Erro ao buscar lead pelo código MT:', error);
      return null;
    }

    return data as MTLead | null;
  };

  /**
   * Gerar código de indicação para um lead
   */
  const gerarCodigoIndicacao = useMutation({
    mutationFn: async (leadId: string): Promise<string> => {
      // Gerar código único
      const codigo = `IND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await supabase
        .from('mt_leads')
        .update({
          codigo_indicacao: codigo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      return codigo;
    },
    onSuccess: (codigo) => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success(`Código de indicação gerado: ${codigo}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar código: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Função: Árvore multinível de indicações (até 3 níveis)
  // ---------------------------------------------------------------------------

  const getArvoreIndicacoes = async (leadId: string, maxNiveis = 3): Promise<MTIndicacaoArvoreNode | null> => {
    const { data: lead } = await supabase
      .from('mt_leads')
      .select('*')
      .eq('id', leadId)
      .eq('status_geral', 'ativo')
      .single();

    if (!lead) return null;

    const buildTree = async (parentId: string, nivel: number): Promise<MTIndicacaoArvoreNode[]> => {
      if (nivel >= maxNiveis) return [];

      const { data: filhos } = await supabase
        .from('mt_leads')
        .select('*')
        .eq('indicado_por_id', parentId)
        .eq('status_geral', 'ativo')
        .order('created_at', { ascending: false });

      if (!filhos || filhos.length === 0) return [];

      const nodes: MTIndicacaoArvoreNode[] = [];
      for (const filho of filhos) {
        const indicados = await buildTree(filho.id, nivel + 1);
        const total_descendentes = indicados.reduce((sum, n) => sum + 1 + n.total_descendentes, 0);
        nodes.push({
          lead: filho as MTLead,
          indicados,
          nivel: nivel + 1,
          total_descendentes,
        });
      }
      return nodes;
    };

    const indicados = await buildTree(leadId, 0);
    const total_descendentes = indicados.reduce((sum, n) => sum + 1 + n.total_descendentes, 0);

    return {
      lead: lead as MTLead,
      indicados,
      nivel: 0,
      total_descendentes,
    };
  };

  // ---------------------------------------------------------------------------
  // Mutation: Calcular comissão de indicação quando lead converte
  // ---------------------------------------------------------------------------

  const calcularComissaoIndicacao = useMutation({
    mutationFn: async ({
      leadIndicadoId,
      valorConversao,
      percentualComissao = 5,
    }: {
      leadIndicadoId: string;
      valorConversao: number;
      percentualComissao?: number;
    }) => {
      // Validar percentual de comissão (deve estar entre 0 e 100)
      if (percentualComissao < 0 || percentualComissao > 100) {
        throw new Error('O percentual de comissão deve estar entre 0 e 100');
      }

      // Validar valor de conversão
      if (valorConversao < 0) {
        throw new Error('O valor de conversão não pode ser negativo');
      }

      // Buscar quem indicou
      const { data: lead } = await supabase
        .from('mt_leads')
        .select('indicado_por_id')
        .eq('id', leadIndicadoId)
        .single();

      if (!lead?.indicado_por_id) {
        throw new Error('Lead não possui indicador');
      }

      const valorComissao = (valorConversao * percentualComissao) / 100;

      // Verificar se já existe referral na tabela de influencer_referrals
      const { data: existingReferral } = await supabase
        .from('mt_influencer_referrals')
        .select('id')
        .eq('lead_id', leadIndicadoId)
        .maybeSingle();

      if (existingReferral) {
        // Atualizar referral existente com comissão
        await supabase
          .from('mt_influencer_referrals')
          .update({
            status: 'convertido',
            valor_comissao: valorComissao,
            percentual_comissao: percentualComissao,
            valor_servico: valorConversao,
            data_conversao: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReferral.id);
      }

      // Atualizar o lead como convertido
      await supabase
        .from('mt_leads')
        .update({
          convertido: true,
          valor_conversao: valorConversao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadIndicadoId);

      return { indicadorId: lead.indicado_por_id, valorComissao };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      toast.success('Comissão de indicação calculada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    indicacoes: indicacoesQuery.data || [],
    kpis: kpisQuery.data,
    leaderboard: leaderboardQuery.data || [],
    isLoading: indicacoesQuery.isLoading || isTenantLoading,
    error: indicacoesQuery.error as Error | null,
    refetch: indicacoesQuery.refetch,
    isFetching: indicacoesQuery.isFetching,
    getIndicacoesByLead,
    getIndicadorByLead,
    getLeadByCodigo,
    getArvoreIndicacoes,
    gerarCodigoIndicacao: gerarCodigoIndicacao.mutateAsync,
    isGeneratingCodigo: gerarCodigoIndicacao.isPending,
    calcularComissaoIndicacao: calcularComissaoIndicacao.mutateAsync,
    isCalculatingComissao: calcularComissaoIndicacao.isPending,
  };
}

export default useIndicacoesMT;
