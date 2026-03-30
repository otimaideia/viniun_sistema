// Tipos para o módulo de Vendas

// === ENUMS ===

export type PaymentMethod =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto'
  | 'dinheiro'
  | 'recorrencia'
  | 'misto';

export type PriceTier = 'normal' | 'desconto' | 'volume';

export type PriceTableType = 'maior' | 'menor' | 'promocional';

export type InstallmentType = 'cartao_12x' | 'recorrencia_18x' | 'a_vista';

export type SaleStatus = 'orcamento' | 'aprovado' | 'concluido' | 'cancelado';

export type CommissionType = 'percentual' | 'fixo';

export type CommissionCategory = 'comissao_venda' | 'produtividade' | 'comissao_global' | 'comissao_individual' | 'comissao_gerente';

export type CommissionStatus = 'pendente' | 'aprovado' | 'pago';

export type CommissionRole = 'consultora' | 'supervisora' | 'gerente' | 'aplicadora';

export type CanalOrigem = 'whatsapp' | 'formulario' | 'presencial' | 'telefone' | 'indicacao';

// === LABELS ===

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  recorrencia: 'Recorrência',
  misto: 'Misto',
};

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  normal: 'Normal',
  desconto: 'Com Desconto',
  volume: 'Volume',
};

// DEPRECATED: PriceTableType labels - precificacao agora vive em mt_services
// Mantido apenas para compatibilidade com campo tipo_tabela_usada em vendas
export const PRICE_TABLE_TYPE_LABELS: Record<PriceTableType, string> = {
  maior: 'Tabela Maior (Máximo)',
  menor: 'Tabela Menor (Piso)',
  promocional: 'Promocional',
};

export const INSTALLMENT_TYPE_LABELS: Record<InstallmentType, string> = {
  cartao_12x: 'Cartão 12x',
  recorrencia_18x: 'Recorrência 18x',
  a_vista: 'À Vista',
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  pago: 'Pago',
};

export const COMMISSION_CATEGORY_LABELS: Record<CommissionCategory, string> = {
  comissao_venda: 'Comissão de Venda',
  produtividade: 'Produtividade',
  comissao_global: 'Comissão Global',
  comissao_individual: 'Comissão Individual',
  comissao_gerente: 'Comissão Gerente',
};

export const COMMISSION_ROLE_LABELS: Record<CommissionRole, string> = {
  consultora: 'Consultora de Vendas',
  supervisora: 'Supervisora de Vendas',
  gerente: 'Gerente',
  aplicadora: 'Aplicadora/Esteticista',
};

export const CANAL_ORIGEM_LABELS: Record<CanalOrigem, string> = {
  whatsapp: 'WhatsApp',
  formulario: 'Formulário',
  presencial: 'Presencial',
  telefone: 'Telefone',
  indicacao: 'Indicação',
};

// === PDV: Formas de Pagamento (novo sistema) ===

export type PaymentForm = 'credito' | 'debito' | 'pix' | 'dinheiro' | 'boleto';

export type PaymentPlanType = 'a_vista' | 'recorrencia_mensal' | 'recorrencia_semestral' | 'recorrencia_anual';

export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outro';

export const PAYMENT_FORM_LABELS: Record<PaymentForm, string> = {
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
};

export const PAYMENT_PLAN_LABELS: Record<PaymentPlanType, string> = {
  a_vista: 'À Vista',
  recorrencia_mensal: 'Recorrência Mensal',
  recorrencia_semestral: 'Recorrência Semestral',
  recorrencia_anual: 'Recorrência Anual',
};

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  outro: 'Outro',
};

export interface SalePayment {
  id: string;
  sale_id: string;
  tenant_id: string;
  forma: PaymentForm;
  tipo: PaymentPlanType;
  bandeira: CardBrand | null;
  parcelas: number;
  valor: number;
  created_at: string;
}

export interface SalePaymentCreate {
  forma: PaymentForm;
  tipo: PaymentPlanType;
  bandeira?: CardBrand;
  parcelas: number;
  valor: number;
}

// === INTERFACES ===

// REMOVED: PriceTable, PriceTableCreate, PriceTableUpdate interfaces
// Precificacao agora vive diretamente em mt_services
// Ver useServicePricingMT em useVendasMT.ts

export interface InstallmentConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  forma_pagamento: string;
  max_parcelas: number;
  taxa_juros: number;
  meta_percentual: number | null;
  descricao: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallmentConfigCreate {
  franchise_id?: string;
  forma_pagamento: string;
  max_parcelas: number;
  taxa_juros?: number;
  meta_percentual?: number;
  descricao?: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  franchise_id: string;
  numero_venda: string | null;
  lead_id: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  profissional_id: string | null;
  forma_pagamento: PaymentMethod | null;
  tabela_preco: PriceTier;
  tipo_tabela_usada: PriceTableType | null;
  tipo_parcelamento: InstallmentType | null;
  valor_parcela: number | null;
  parcelas: number;
  valor_bruto: number;
  valor_desconto: number;
  valor_total: number;
  custo_total: number;
  margem: number | null;
  abaixo_piso: boolean;
  justificativa_desconto: string | null;
  status: SaleStatus;
  appointment_id: string | null;
  promotion_id: string | null;
  canal_origem: CanalOrigem | null;
  conversation_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  motivo_cancelamento: string | null;
  data_cancelamento: string | null;
  // JOINs
  items?: SaleItem[];
  profissional?: { id: string; nome: string };
  lead?: { id: string; nome: string; telefone: string | null; email: string | null };
}

export interface SaleCreate {
  franchise_id: string;
  lead_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_email?: string;
  profissional_id?: string;
  forma_pagamento?: PaymentMethod;
  tabela_preco?: PriceTier;
  tipo_tabela_usada?: PriceTableType;
  tipo_parcelamento?: InstallmentType;
  valor_parcela?: number;
  parcelas?: number;
  valor_bruto: number;
  valor_desconto?: number;
  valor_total: number;
  custo_total?: number;
  abaixo_piso?: boolean;
  justificativa_desconto?: string;
  status?: SaleStatus;
  appointment_id?: string;
  promotion_id?: string;
  canal_origem?: CanalOrigem;
  conversation_id?: string;
  observacoes?: string;
  items?: SaleItemCreate[];
  payments?: SalePaymentCreate[];
  // Recurrence config for treatment plans (not stored in DB, used by autoCreateTreatmentPlans)
  _recurrenceConfig?: {
    recorrencia_tipo?: string;
    recorrencia_intervalo_dias?: number;
    dia_preferencial?: number;
    hora_preferencial?: string;
    profissional_preferencial_id?: string;
    geracao_agenda?: string;
  };
}

export interface SaleUpdate extends Partial<Omit<SaleCreate, 'items'>> {
  id: string;
}

export interface SaleFilters {
  status?: SaleStatus;
  forma_pagamento?: PaymentMethod;
  franchise_id?: string;
  profissional_id?: string;
  promotion_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export type SaleItemType = 'servico' | 'produto' | 'pacote';

export interface SaleItem {
  id: string;
  tenant_id: string;
  sale_id: string;
  service_id: string | null;
  product_id: string | null;
  package_id: string | null;
  tipo_item: SaleItemType;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  desconto_percentual: number;
  desconto_valor: number;
  valor_total: number;
  sessoes_protocolo: number;
  created_at: string;
}

export interface SaleItemCreate {
  service_id?: string;
  product_id?: string;
  package_id?: string;
  tipo_item?: SaleItemType;
  descricao: string;
  quantidade?: number;
  preco_unitario: number;
  custo_unitario?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_total: number;
  sessoes_protocolo?: number;
}

export interface Commission {
  id: string;
  tenant_id: string;
  franchise_id: string;
  profissional_id: string;
  sale_id: string;
  tipo: CommissionType;
  categoria: CommissionCategory;
  percentual: number | null;
  valor: number;
  valor_base_calculo: number;
  status: CommissionStatus;
  data_aprovacao: string | null;
  data_pagamento: string | null;
  aprovado_por: string | null;
  observacoes: string | null;
  // Campos de comissão de venda (consultoras)
  meta_global_atingida: boolean;
  meta_individual_atingida: boolean;
  referencia_mes: string | null;
  // Campos de produtividade (aplicadoras)
  sale_item_id: string | null;
  treatment_plan_id: string | null;
  treatment_session_id: string | null;
  numero_sessao: number | null;
  // Campos de automação
  commission_role: CommissionRole | null;
  batch_id: string | null;
  data_referencia: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  profissional?: { id: string; nome: string };
  sale?: Sale;
}

export interface CommissionCreate {
  franchise_id: string;
  profissional_id: string;
  sale_id?: string | null;
  categoria?: CommissionCategory;
  tipo?: CommissionType;
  percentual?: number;
  valor: number;
  valor_base_calculo?: number;
  meta_global_atingida?: boolean;
  meta_individual_atingida?: boolean;
  referencia_mes?: string;
  sale_item_id?: string;
  treatment_plan_id?: string;
  treatment_session_id?: string;
  numero_sessao?: number;
  commission_role?: CommissionRole;
  batch_id?: string;
  data_referencia?: string;
  observacoes?: string;
}

// === COMMISSION RULES & AUTOMATION ===

export interface CommissionRule {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  meta_global_default: number;
  meta_individual_default: number;
  piso_produtividade_diaria: number;
  percentual_produtividade: number;
  percentual_supervisora: number;
  percentual_consultoras: number;
  percentual_individual: number;
  percentual_gerente: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommissionTier {
  id: string;
  rule_id: string;
  meta_valor: number;
  percentual: number;
  ordem: number;
  created_at: string;
}

export interface CommissionBatch {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  tipo: string;
  referencia: string;
  faturamento_total: number | null;
  meta_global_valor: number | null;
  meta_global_atingida: boolean | null;
  tier_percentual: number | null;
  total_comissoes_geradas: number | null;
  qtd_comissoes: number | null;
  processado_por: string | null;
  created_at: string;
}

export interface MonthlyCommissionSummary {
  batch: CommissionBatch;
  faturamento: number;
  meta_global: number;
  meta_atingida: boolean;
  tier: CommissionTier | null;
  pool_global: number;
  supervisoras: Array<{ user_id: string; nome: string; valor: number }>;
  consultoras: Array<{ user_id: string; nome: string; valor_global: number; vendas_individuais: number; meta_individual: number; meta_batida: boolean; valor_individual: number }>;
  gerentes: Array<{ user_id: string; nome: string; valor: number }>;
  total_comissoes: number;
}

export interface CommissionFilters {
  status?: CommissionStatus;
  categoria?: CommissionCategory;
  profissional_id?: string;
  franchise_id?: string;
  date_from?: string;
  date_to?: string;
}

// === DASHBOARD ===

export interface VendasDashboardMetrics {
  receita_total: number;
  receita_mes_atual: number;
  ticket_medio: number;
  total_vendas: number;
  vendas_mes_atual: number;
  vendas_por_status: Record<SaleStatus, number>;
  vendas_por_pagamento: Record<string, number>;
  comissoes_pendentes: number;
  margem_media: number;
  percentual_recorrencia: number;
  percentual_cartao: number;
  vendas_abaixo_piso: number;
  receita_por_servico: Array<{ service_nome: string; total: number; quantidade: number }>;
}

// === COMPLIANCE ===

export interface PriceComplianceMetrics {
  total_vendas: number;
  vendas_acima_piso: number;
  vendas_abaixo_piso: number;
  percentual_compliance: number;
  percentual_recorrencia: number;
  percentual_cartao: number;
  ticket_medio: number;
  margem_media: number;
}

export interface PriceComplianceItem {
  sale_id: string;
  data: string;
  cliente_nome: string;
  service_nome: string;
  valor_venda: number;
  preco_piso: number;
  diferenca: number;
  forma_pagamento: string;
  justificativa: string | null;
  vendedor: string | null;
}
