// Tipos para o módulo de Projeção Financeira (Plano de Negócio vs Realidade)

// === ENUMS ===

export type ProjectionSection = 'dre' | 'despesas_fixas' | 'faturamento' | 'payback';
export type ProjectionLineType = 'receita' | 'despesa' | 'subtotal' | 'indicador';

export const SECTION_LABELS: Record<ProjectionSection, string> = {
  dre: 'DRE - Demonstração do Resultado',
  despesas_fixas: 'Despesas Fixas Detalhadas',
  faturamento: 'Faturamento Detalhado',
  payback: 'PayBack',
};

export const LINE_TYPE_LABELS: Record<ProjectionLineType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  subtotal: 'Subtotal',
  indicador: 'Indicador',
};

// === INTERFACES ===

export interface FinancialProjection {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  data_inicio: string;
  total_meses: number;
  investimento_inicial: number | null;
  tir_projetada: number | null;
  vpl_projetado: number | null;
  roi_projetado: number | null;
  payback_mes: number | null;
  lucratividade_media: number | null;
  lucro_liquido_medio: number | null;
  investimento_detalhado: Record<string, number> | null;
  parcelamentos: { desc: string; parcelas: number; valor: number }[] | null;
  file_name: string | null;
  file_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  franchise?: { id: string; nome: string } | null;
}

export interface ProjectionLine {
  id: string;
  projection_id: string;
  tenant_id: string;
  secao: ProjectionSection;
  codigo: string;
  nome: string;
  tipo: ProjectionLineType;
  percentual: number | null;
  base_calculo: string | null;
  valores: Record<string, number>;
  category_id: string | null;
  match_rule: Record<string, any> | null;
  ordem: number;
  is_subtotal: boolean;
  indent_level: number;
  created_at: string;
}

// === CREATE TYPES ===

export interface FinancialProjectionCreate {
  franchise_id?: string | null;
  nome: string;
  descricao?: string;
  data_inicio: string;
  total_meses?: number;
  investimento_inicial?: number;
  tir_projetada?: number;
  vpl_projetado?: number;
  roi_projetado?: number;
  payback_mes?: number;
  lucratividade_media?: number;
  lucro_liquido_medio?: number;
  investimento_detalhado?: Record<string, number>;
  parcelamentos?: { desc: string; parcelas: number; valor: number }[];
  file_name?: string;
}

export interface ProjectionLineCreate {
  secao: ProjectionSection;
  codigo: string;
  nome: string;
  tipo: ProjectionLineType;
  percentual?: number | null;
  base_calculo?: string | null;
  valores: Record<string, number>;
  category_id?: string | null;
  match_rule?: Record<string, any> | null;
  ordem: number;
  is_subtotal?: boolean;
  indent_level?: number;
}

// === COMPARISON TYPES ===

export interface LineComparison {
  line: ProjectionLine;
  realizado: Record<string, number>;
  variacao: Record<string, number>;
}

export interface MonthSummary {
  mes: number;
  mes_label: string;
  data_inicio: string;
  data_fim: string;
  proj_receitas: number;
  proj_despesas: number;
  proj_resultado: number;
  proj_margem: number;
  real_receitas: number;
  real_despesas: number;
  real_resultado: number;
  real_margem: number;
  var_receita_pct: number;
  var_despesa_pct: number;
  var_resultado_pct: number;
}

// === PARSER TYPES ===

export interface ParsedProjection {
  header: {
    investimento_inicial: number;
    tir_projetada: number;
    vpl_projetado: number;
    roi_projetado: number;
    payback_mes: number;
    lucratividade_media: number;
    lucro_liquido_medio: number;
    investimento_detalhado: Record<string, number>;
    parcelamentos: { desc: string; parcelas: number; valor: number }[];
  };
  lines: ProjectionLineCreate[];
}

// === HELPERS ===

export function getMonthLabel(dataInicio: string, mes: number): string {
  const date = new Date(dataInicio);
  date.setMonth(date.getMonth() + mes - 1);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
}

export function getMonthDateRange(dataInicio: string, mes: number): { inicio: string; fim: string } {
  const date = new Date(dataInicio);
  date.setMonth(date.getMonth() + mes - 1);
  const year = date.getFullYear();
  const month = date.getMonth();
  const inicio = new Date(year, month, 1).toISOString().split('T')[0];
  const fim = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { inicio, fim };
}
