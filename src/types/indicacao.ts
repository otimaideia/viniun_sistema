// Tipos para o Sistema de Indicações Viniun
// Modelo Wise Up - Indicações em cadeia

import type { Lead } from './lead';

// =============================================================
// HISTÓRICO DE INDICAÇÕES
// =============================================================

export type IndicacaoStatus = 'pendente' | 'convertido' | 'perdido' | 'cancelado';

export interface IndicacaoHistorico {
  id: string;
  lead_indicador_id: string;
  lead_indicado_id: string;
  campanha?: string | null;
  landing_page?: string | null;
  data_indicacao: string;
  status: IndicacaoStatus;
  data_conversao?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;

  // Relacionamentos carregados
  lead_indicador?: Lead;
  lead_indicado?: Lead;
}

export type IndicacaoHistoricoInsert = Omit<
  IndicacaoHistorico,
  'id' | 'created_at' | 'updated_at' | 'lead_indicador' | 'lead_indicado'
>;

// =============================================================
// ESTATÍSTICAS DE INDICAÇÃO
// =============================================================

export interface IndicacaoStats {
  total_indicacoes: number;
  indicacoes_convertidas: number;
  indicacoes_pendentes: number;
  indicacoes_perdidas: number;
  taxa_conversao: number;
  cadeia_maxima: number; // Profundidade máxima da árvore de indicações
}

export interface IndicacaoLeadStats {
  lead_id: string;
  lead_nome: string;
  lead_codigo: string;
  total_indicados: number;
  indicados_convertidos: number;
  indicados_pendentes: number;
  taxa_conversao: number;
}

// =============================================================
// ÁRVORE DE INDICAÇÕES
// =============================================================

export interface IndicacaoArvoreNode {
  lead: Lead;
  indicados: IndicacaoArvoreNode[];
  nivel: number;
  total_descendentes: number;
}

// =============================================================
// LEADERBOARD DE INDICADORES
// =============================================================

export interface IndicacaoLeaderboardItem {
  posicao: number;
  lead_id: string;
  lead_nome: string;
  lead_codigo: string;
  lead_whatsapp?: string | null;
  franqueado_nome?: string | null;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  ultima_indicacao?: string | null;
}

// =============================================================
// FILTROS PARA INDICAÇÕES
// =============================================================

export interface IndicacaoFiltros {
  periodo?: {
    inicio: string;
    fim: string;
  };
  franqueado_id?: string;
  campanha?: string;
  status?: IndicacaoStatus;
  busca?: string; // Busca por nome, email ou código
}

// =============================================================
// SHARE / COMPARTILHAMENTO
// =============================================================

export interface IndicacaoShareData {
  codigo: string;
  link: string;
  lead_nome: string;
  mensagem_whatsapp: string;
  mensagem_email: string;
}

// =============================================================
// KPIs DE INDICAÇÃO
// =============================================================

export interface IndicacaoKPIs {
  total_leads_que_indicaram: number;
  total_indicacoes: number;
  media_indicacoes_por_lead: number;
  cadeia_mais_longa: number;
  top_indicador?: {
    nome: string;
    quantidade: number;
  };
  indicacoes_ultimo_mes: number;
  taxa_conversao_global: number;
}

// =============================================================
// CONSTANTES
// =============================================================

/**
 * Slug do formulário padrão para indicações (leads, influenciadoras, parcerias)
 * Este é o formulário centralizado que processa todas as indicações
 */
export const FORMULARIO_INDICACAO_SLUG = 'boas-vindas';

/**
 * URL base para formulários (produção)
 */
export const FORMULARIO_BASE_URL = 'https://www.viniun.com.br';

export const INDICACAO_STATUS_LABELS: Record<IndicacaoStatus, string> = {
  pendente: 'Pendente',
  convertido: 'Convertido',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
};

export const INDICACAO_STATUS_COLORS: Record<IndicacaoStatus, { color: string; bg: string }> = {
  pendente: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  convertido: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  perdido: { color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
  cancelado: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

// =============================================================
// HELPERS
// =============================================================

/**
 * Gera uma mensagem de compartilhamento para WhatsApp
 * @param nomeIndicador - Nome de quem está indicando
 * @param codigoIndicacao - Código de indicação
 * @param linkFormulario - Link completo do formulário (opcional, usa o padrão se não informado)
 */
export function gerarMensagemWhatsApp(
  nomeIndicador: string,
  codigoIndicacao: string,
  linkFormulario?: string
): string {
  const link = linkFormulario || gerarLinkIndicacao(codigoIndicacao);
  return `Oi! Eu sou ${nomeIndicador} e quero te indicar para a Viniun!

Use meu código de indicação: *${codigoIndicacao}*

Ou acesse diretamente: ${link}

Você vai amar os tratamentos! `;
}

/**
 * Gera o link do formulário com código de indicação
 * Usa o formulário padrão de indicações (boas-vindas) por default
 * @param codigoIndicacao - Código de indicação do lead/influenciadora/parceria
 * @param baseUrl - URL base (default: window.location.origin em dev, FORMULARIO_BASE_URL em prod)
 * @param slug - Slug do formulário (default: FORMULARIO_INDICACAO_SLUG = 'boas-vindas')
 */
export function gerarLinkIndicacao(
  codigoIndicacao: string,
  baseUrl?: string,
  slug: string = FORMULARIO_INDICACAO_SLUG
): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : FORMULARIO_BASE_URL);
  return `${url}/form/${slug}?ref=${codigoIndicacao}`;
}

/**
 * Extrai o código de indicação de uma URL
 */
export function extrairCodigoIndicacao(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch {
    // Se não for URL válida, tenta extrair do query string
    const match = url.match(/[?&]ref=([^&]+)/);
    return match ? match[1] : null;
  }
}
