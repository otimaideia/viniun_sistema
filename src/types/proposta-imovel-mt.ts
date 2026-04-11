// ═══════════════════════════════════════════════════
// Tipos do módulo PROPOSTAS IMOBILIÁRIAS
// mt_property_proposal_templates, mt_property_proposals,
// mt_property_proposal_items, mt_property_proposal_history
// ═══════════════════════════════════════════════════

// ───────────────────────────────────────────
// Enums / Union Types
// ───────────────────────────────────────────

export type ProposalTemplateTipo = 'venda' | 'locacao' | 'temporada';

export type ProposalStatus =
  | 'rascunho'
  | 'enviada'
  | 'visualizada'
  | 'aceita'
  | 'contrapropostada'
  | 'rejeitada'
  | 'expirada';

export type ProposalItemTipo =
  | 'entrada'
  | 'parcela'
  | 'intermediaria'
  | 'chaves'
  | 'financiamento'
  | 'sinal'
  | 'outro';

export type ProposalHistoryTipo =
  | 'criacao'
  | 'envio'
  | 'visualizacao'
  | 'contraproposta'
  | 'aceite'
  | 'rejeicao'
  | 'expiracao'
  | 'edicao'
  | 'cancelamento';

// ───────────────────────────────────────────
// Labels e Cores
// ───────────────────────────────────────────

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  visualizada: 'Visualizada',
  aceita: 'Aceita',
  contrapropostada: 'Contrapropostada',
  rejeitada: 'Rejeitada',
  expirada: 'Expirada',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  rascunho: 'gray',
  enviada: 'blue',
  visualizada: 'yellow',
  aceita: 'green',
  contrapropostada: 'orange',
  rejeitada: 'red',
  expirada: 'slate',
};

export const PROPOSAL_ITEM_LABELS: Record<ProposalItemTipo, string> = {
  entrada: 'Entrada',
  parcela: 'Parcela',
  intermediaria: 'Intermediária',
  chaves: 'Chaves',
  financiamento: 'Financiamento',
  sinal: 'Sinal',
  outro: 'Outro',
};

export const PROPOSAL_TEMPLATE_TIPO_LABELS: Record<ProposalTemplateTipo, string> = {
  venda: 'Venda',
  locacao: 'Locação',
  temporada: 'Temporada',
};

export const PROPOSAL_HISTORY_LABELS: Record<ProposalHistoryTipo, string> = {
  criacao: 'Criação',
  envio: 'Envio',
  visualizacao: 'Visualização',
  contraproposta: 'Contraproposta',
  aceite: 'Aceite',
  rejeicao: 'Rejeição',
  expiracao: 'Expiração',
  edicao: 'Edição',
  cancelamento: 'Cancelamento',
};

// ───────────────────────────────────────────
// Interfaces Principais
// ───────────────────────────────────────────

export interface MTPropertyProposalTemplate {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  tipo: ProposalTemplateTipo;
  html_template: string;
  variaveis: unknown[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface MTPropertyProposal {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  numero_proposta: string | null;

  // Relacionamentos
  property_id: string;
  lead_id: string | null;
  client_id: string | null;
  corretor_id: string | null;
  inquiry_id: string | null;

  // Valores
  valor_imovel: number | null;
  valor_proposta: number;
  valor_entrada: number;
  valor_financiamento: number;
  parcelas: number;
  desconto_percentual: number;
  valor_final: number | null;

  // Condições
  condicoes_pagamento: Record<string, unknown>;
  forma_pagamento: string | null;
  prazo_validade_dias: number;

  // Status
  status: ProposalStatus;

  // Documento
  template_id: string | null;
  html_content: string | null;
  pdf_url: string | null;

  // Token público
  token_acesso: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  enviada_em: string | null;
  visualizada_em: string | null;
  respondida_em: string | null;
  validade_ate: string | null;

  // Negociação
  observacoes: string | null;
  motivo_rejeicao: string | null;
  contraproposta_valor: number | null;
  contraproposta_condicoes: string | null;

  // Auditoria
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;

  // Joins opcionais
  property?: { id: string; titulo: string; ref_code: string | null; valor_venda: number | null };
  lead?: { id: string; nome: string; email: string | null; telefone: string | null };
  client?: { id: string; nome: string };
  corretor?: { id: string; nome: string };
  template?: MTPropertyProposalTemplate;
  items?: MTPropertyProposalItem[];
  tenant?: { slug: string; nome_fantasia: string };
}

export interface MTPropertyProposalItem {
  id: string;
  tenant_id: string;
  proposal_id: string;
  tipo: ProposalItemTipo;
  descricao: string | null;
  valor: number;
  data_vencimento: string | null;
  numero_parcela: number | null;
  quantidade: number;
  ordem: number;
  created_at: string;
}

export interface MTPropertyProposalHistory {
  id: string;
  tenant_id: string;
  proposal_id: string;
  tipo_alteracao: ProposalHistoryTipo;
  dados: Record<string, unknown>;
  usuario_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joins
  usuario?: { id: string; nome: string };
}

// ───────────────────────────────────────────
// Create / Update Types
// ───────────────────────────────────────────

export interface MTPropertyProposalTemplateCreate {
  nome: string;
  tipo?: ProposalTemplateTipo;
  franchise_id?: string;
  html_template?: string;
  variaveis?: unknown[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface MTPropertyProposalTemplateUpdate extends Partial<MTPropertyProposalTemplateCreate> {
  id: string;
}

export interface MTPropertyProposalCreate {
  property_id: string;
  valor_proposta: number;
  franchise_id?: string;
  numero_proposta?: string;
  lead_id?: string;
  client_id?: string;
  corretor_id?: string;
  inquiry_id?: string;
  valor_imovel?: number;
  valor_entrada?: number;
  valor_financiamento?: number;
  parcelas?: number;
  desconto_percentual?: number;
  valor_final?: number;
  condicoes_pagamento?: Record<string, unknown>;
  forma_pagamento?: string;
  prazo_validade_dias?: number;
  template_id?: string;
  html_content?: string;
  observacoes?: string;
  validade_ate?: string;
}

export interface MTPropertyProposalUpdate extends Partial<MTPropertyProposalCreate> {
  id: string;
  status?: ProposalStatus;
  motivo_rejeicao?: string;
  contraproposta_valor?: number;
  contraproposta_condicoes?: string;
  pdf_url?: string;
}

export interface MTPropertyProposalItemCreate {
  proposal_id: string;
  valor: number;
  tipo?: ProposalItemTipo;
  descricao?: string;
  data_vencimento?: string;
  numero_parcela?: number;
  quantidade?: number;
  ordem?: number;
}

export interface MTPropertyProposalItemUpdate extends Partial<MTPropertyProposalItemCreate> {
  id: string;
}

// ───────────────────────────────────────────
// Filtros
// ───────────────────────────────────────────

export interface MTPropertyProposalFilters {
  status?: ProposalStatus | ProposalStatus[];
  property_id?: string;
  lead_id?: string;
  corretor_id?: string;
  client_id?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
}
