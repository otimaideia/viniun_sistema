// =============================================================================
// USE INDICACOES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para indicações de leads usando tabelas MT
// SISTEMA 100% MT - Usa useIndicacoesMT diretamente
//
// =============================================================================

import { useIndicacoesMT, type MTIndicacaoHistorico, type MTIndicacaoKPIs, type MTIndicacaoLeaderboardItem, type MTIndicacaoFiltros } from './useIndicacoesMT';

// -----------------------------------------------------------------------------
// Tipos do Adapter (compatibilidade com código existente)
// -----------------------------------------------------------------------------

export interface IndicacaoHistoricoAdapted {
  id: string;
  lead_indicador_id: string;
  lead_indicado_id: string;
  codigo_usado?: string | null;
  campanha?: string | null;
  origem?: string | null;
  status: 'pendente' | 'validada' | 'convertido' | 'invalida';
  observacoes?: string | null;
  data_indicacao: string;
  data_conversao?: string | null;
  created_at: string;
  lead_indicador?: {
    id: string;
    nome: string;
    email?: string | null;
    whatsapp?: string | null;
    codigo_indicacao?: string | null;
    franqueado_id?: string | null;
  };
  lead_indicado?: {
    id: string;
    nome: string;
    email?: string | null;
    whatsapp?: string | null;
    status?: string | null;
    franqueado_id?: string | null;
  };
}

export interface IndicacaoKPIsAdapted {
  total_leads_que_indicaram: number;
  total_indicacoes: number;
  media_indicacoes_por_lead: number;
  cadeia_mais_longa: number;
  top_indicador?: { nome: string; quantidade: number };
  indicacoes_ultimo_mes: number;
  taxa_conversao_global: number;
}

export interface IndicacaoLeaderboardItemAdapted {
  posicao: number;
  lead_id: string;
  lead_nome: string;
  lead_codigo?: string | null;
  lead_whatsapp?: string | null;
  franqueado_nome?: string | null;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  ultima_indicacao?: string | null;
}

export interface IndicacaoFiltrosAdapted {
  periodo?: { inicio: string; fim: string };
  status?: 'pendente' | 'validada' | 'convertido' | 'invalida';
  campanha?: string;
  franqueado_id?: string;
  busca?: string;
}

// -----------------------------------------------------------------------------
// Funções de Mapeamento
// -----------------------------------------------------------------------------

function mapMTIndicacaoToAdapter(indicacao: MTIndicacaoHistorico): IndicacaoHistoricoAdapted {
  return {
    id: indicacao.id,
    lead_indicador_id: indicacao.lead_indicador_id,
    lead_indicado_id: indicacao.lead_indicado_id,
    codigo_usado: indicacao.codigo_usado,
    campanha: indicacao.campanha,
    origem: indicacao.origem,
    status: indicacao.status,
    observacoes: indicacao.observacoes,
    data_indicacao: indicacao.data_indicacao,
    data_conversao: indicacao.data_conversao,
    created_at: indicacao.created_at,
    lead_indicador: indicacao.lead_indicador ? {
      id: indicacao.lead_indicador.id,
      nome: indicacao.lead_indicador.nome,
      email: indicacao.lead_indicador.email,
      whatsapp: indicacao.lead_indicador.whatsapp,
      codigo_indicacao: indicacao.lead_indicador.codigo_indicacao,
      franqueado_id: indicacao.lead_indicador.franchise_id,
    } : undefined,
    lead_indicado: indicacao.lead_indicado ? {
      id: indicacao.lead_indicado.id,
      nome: indicacao.lead_indicado.nome,
      email: indicacao.lead_indicado.email,
      whatsapp: indicacao.lead_indicado.whatsapp,
      status: indicacao.lead_indicado.status,
      franqueado_id: indicacao.lead_indicado.franchise_id,
    } : undefined,
  };
}

function mapMTKPIsToAdapter(kpis: MTIndicacaoKPIs | undefined): IndicacaoKPIsAdapted | undefined {
  if (!kpis) return undefined;
  return {
    total_leads_que_indicaram: kpis.total_leads_que_indicaram,
    total_indicacoes: kpis.total_indicacoes,
    media_indicacoes_por_lead: kpis.media_indicacoes_por_lead,
    cadeia_mais_longa: kpis.cadeia_mais_longa,
    top_indicador: kpis.top_indicador,
    indicacoes_ultimo_mes: kpis.indicacoes_ultimo_mes,
    taxa_conversao_global: kpis.taxa_conversao_global,
  };
}

function mapMTLeaderboardToAdapter(item: MTIndicacaoLeaderboardItem): IndicacaoLeaderboardItemAdapted {
  return {
    posicao: item.posicao,
    lead_id: item.lead_id,
    lead_nome: item.lead_nome,
    lead_codigo: item.lead_codigo,
    lead_whatsapp: item.lead_whatsapp,
    franqueado_nome: item.franchise_nome,
    total_indicacoes: item.total_indicacoes,
    indicacoes_convertidas: item.indicacoes_convertidas,
    taxa_conversao: item.taxa_conversao,
    ultima_indicacao: item.ultima_indicacao,
  };
}

function mapFiltersToMT(filtros?: IndicacaoFiltrosAdapted): MTIndicacaoFiltros | undefined {
  if (!filtros) return undefined;
  return {
    periodo: filtros.periodo,
    status: filtros.status,
    campanha: filtros.campanha,
    franchise_id: filtros.franqueado_id,
    busca: filtros.busca,
  };
}

// -----------------------------------------------------------------------------
// Hook Principal do Adapter - 100% MT
// -----------------------------------------------------------------------------

export function useIndicacoesAdapter(filtros: IndicacaoFiltrosAdapted = {}) {
  const mtHook = useIndicacoesMT(mapFiltersToMT(filtros));

  return {
    indicacoes: (mtHook.indicacoes || []).map(mapMTIndicacaoToAdapter),
    kpis: mapMTKPIsToAdapter(mtHook.kpis),
    leaderboard: (mtHook.leaderboard || []).map(mapMTLeaderboardToAdapter),
    isLoading: mtHook.isLoading,
    error: mtHook.error,
    refetch: mtHook.refetch,
    isFetching: mtHook.isFetching,

    // Funções auxiliares
    getIndicacoesByLead: mtHook.getIndicacoesByLead,
    getIndicadorByLead: mtHook.getIndicadorByLead,
    getLeadByCodigo: mtHook.getLeadByCodigo,

    // Mutations
    gerarCodigoIndicacao: mtHook.gerarCodigoIndicacao,
    isGeneratingCodigo: mtHook.isGeneratingCodigo,

    // Marcador MT
    _mode: 'mt' as const,
  };
}

export default useIndicacoesAdapter;
