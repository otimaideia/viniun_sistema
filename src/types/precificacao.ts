// =============================================================================
// TIPOS - Módulo de Precificação
// =============================================================================

export interface CustoInsumo {
  id: string;
  service_id: string;
  product_id: string;
  quantidade: number;
  custo_unitario_calc: number;
  custo_total_linha: number;
  product?: {
    id: string;
    nome: string;
    unidade_medida: string;
    custo_pix: number | null;
    custo_unitario_fracionado: number | null;
    is_fracionado: boolean;
  };
}

export interface CustoProfissional {
  id: string;
  service_id: string;
  employee_id: string;
  papel: 'executor' | 'auxiliar' | 'supervisor';
  horas_mes: number;
  custo_hora_calculado: number;
  custo_hora_manual: number | null;
  tempo_execucao_minutos: number | null;
  custo_por_sessao: number;
  employee?: {
    id: string;
    nome: string;
    cargo: string;
    salario_base: number;
  };
}

export interface ComissaoConfig {
  tipo: 'vendedor' | 'aplicador' | 'gerente';
  percentual: number;
  valor_fixo: number;
  base_calculo: 'preco_venda' | 'margem';
}

export interface CustoFixoItem {
  descricao: string;
  valor_mensal: number;
  sessoes_mes: number;
  rateio_por_sessao: number;
}

export interface PrecificacaoResumo {
  service_id: string;
  nome: string;
  categoria: string | null;
  duracao_minutos: number | null;
  // Custos
  custo_insumos: number;
  custo_mao_obra: number;
  custo_fixo_rateado: number;
  custo_comissoes: number;
  custo_impostos: number;
  custo_total_sessao: number;
  // Preços
  preco_tabela_maior: number | null;
  preco_tabela_menor: number | null;
  // Margens
  margem_maior: number;
  margem_menor: number;
  margem_maior_pct: number;
  margem_menor_pct: number;
  // Status
  status: 'saudavel' | 'atencao' | 'critico' | 'sem_dados';
}

export interface SimuladorParams {
  custo_insumos: number;
  custo_mao_obra: number;
  custo_fixo_rateado: number;
  custo_comissoes: number;
  custo_impostos: number;
  preco_venda: number;
  sessoes_dia: number;
  dias_mes: number;
}

export interface SimuladorResultado {
  custo_total_sessao: number;
  margem_bruta: number;
  margem_bruta_pct: number;
  ponto_equilibrio_sessoes: number;
  receita_mensal: number;
  custo_mensal: number;
  lucro_mensal: number;
}
