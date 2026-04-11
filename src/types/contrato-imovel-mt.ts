// ═══════════════════════════════════════════════════
// Tipos do módulo CONTRATOS IMOBILIÁRIOS
// mt_property_contract_templates, mt_property_contracts,
// mt_property_contract_signatories, mt_property_contract_history
// ═══════════════════════════════════════════════════

// ───────────────────────────────────────────
// Enums / Union Types
// ───────────────────────────────────────────

export type ContractTipo = 'venda' | 'locacao_definitiva' | 'locacao_temporada' | 'compra';

export type ContractStatus =
  | 'rascunho'
  | 'pendente_assinatura'
  | 'assinado_parcialmente'
  | 'assinado'
  | 'em_execucao'
  | 'finalizado'
  | 'cancelado'
  | 'distrato';

export type ContractSignatoryTipo =
  | 'comprador'
  | 'vendedor'
  | 'locatario'
  | 'locador'
  | 'fiador'
  | 'testemunha'
  | 'corretor';

export type ContractHistoryTipo =
  | 'criacao'
  | 'envio'
  | 'assinatura'
  | 'assinatura_parcial'
  | 'aditivo'
  | 'distrato'
  | 'cancelamento'
  | 'finalizacao'
  | 'edicao';

export type IndiceReajuste = 'IGPM' | 'IPCA' | 'INPC' | 'fixo' | 'nenhum';

// ───────────────────────────────────────────
// Labels e Cores
// ───────────────────────────────────────────

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  pendente_assinatura: 'Pendente Assinatura',
  assinado_parcialmente: 'Assinado Parcialmente',
  assinado: 'Assinado',
  em_execucao: 'Em Execução',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  distrato: 'Distrato',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  rascunho: 'gray',
  pendente_assinatura: 'yellow',
  assinado_parcialmente: 'orange',
  assinado: 'blue',
  em_execucao: 'cyan',
  finalizado: 'green',
  cancelado: 'red',
  distrato: 'slate',
};

export const CONTRACT_TIPO_LABELS: Record<ContractTipo, string> = {
  venda: 'Venda',
  locacao_definitiva: 'Locação Definitiva',
  locacao_temporada: 'Locação Temporada',
  compra: 'Compra',
};

export const CONTRACT_SIGNATORY_LABELS: Record<ContractSignatoryTipo, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  locatario: 'Locatário',
  locador: 'Locador',
  fiador: 'Fiador',
  testemunha: 'Testemunha',
  corretor: 'Corretor',
};

export const CONTRACT_HISTORY_LABELS: Record<ContractHistoryTipo, string> = {
  criacao: 'Criação',
  envio: 'Envio',
  assinatura: 'Assinatura',
  assinatura_parcial: 'Assinatura Parcial',
  aditivo: 'Aditivo',
  distrato: 'Distrato',
  cancelamento: 'Cancelamento',
  finalizacao: 'Finalização',
  edicao: 'Edição',
};

export const INDICE_REAJUSTE_LABELS: Record<IndiceReajuste, string> = {
  IGPM: 'IGP-M',
  IPCA: 'IPCA',
  INPC: 'INPC',
  fixo: 'Fixo',
  nenhum: 'Nenhum',
};

// ───────────────────────────────────────────
// Interfaces Principais
// ───────────────────────────────────────────

export interface MTPropertyContractTemplate {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  tipo_contrato: ContractTipo;
  html_template: string;
  clausulas_padrao: unknown[];
  variaveis: unknown[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface MTPropertyContract {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  numero_contrato: string | null;

  // Relacionamentos
  proposal_id: string | null;
  property_id: string;
  lead_id: string | null;
  client_id: string | null;
  corretor_id: string | null;
  owner_id: string | null;

  // Tipo e status
  tipo: ContractTipo;
  status: ContractStatus;

  // Valores
  valor_contrato: number;
  valor_mensal: number | null;
  taxa_administracao: number | null;
  comissao_corretor: number | null;
  valor_comissao: number | null;

  // Datas
  data_inicio: string | null;
  data_vencimento: string | null;
  data_assinatura: string | null;
  data_cancelamento: string | null;

  // Documento
  template_id: string | null;
  html_content: string | null;
  pdf_url: string | null;

  // Token público
  token_acesso: string | null;

  // Cláusulas e reajuste
  clausulas: unknown[];
  multa_rescisoria: number | null;
  indice_reajuste: IndiceReajuste | null;
  percentual_reajuste: number | null;

  // Auditoria
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;

  // Joins opcionais
  proposal?: { id: string; numero_proposta: string | null; valor_proposta: number };
  property?: { id: string; titulo: string; ref_code: string | null; valor_venda: number | null };
  lead?: { id: string; nome: string; email: string | null; telefone: string | null };
  client?: { id: string; nome: string };
  corretor?: { id: string; nome: string };
  owner?: { id: string; nome: string };
  template?: MTPropertyContractTemplate;
  signatories?: MTPropertyContractSignatory[];
  tenant?: { slug: string; nome_fantasia: string };
}

export interface MTPropertyContractSignatory {
  id: string;
  tenant_id: string;
  contract_id: string;

  // Dados do signatário
  tipo: ContractSignatoryTipo;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  ordem_assinatura: number;

  // Assinatura
  assinado: boolean;
  assinado_em: string | null;
  assinatura_hash: string | null;
  assinatura_canvas_data: string | null;

  // Rastreamento
  ip_address: string | null;
  user_agent: string | null;
  token_assinatura: string | null;

  created_at: string;
}

export interface MTPropertyContractHistory {
  id: string;
  tenant_id: string;
  contract_id: string;
  tipo_alteracao: ContractHistoryTipo;
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

export interface MTPropertyContractTemplateCreate {
  nome: string;
  tipo_contrato?: ContractTipo;
  franchise_id?: string;
  html_template?: string;
  clausulas_padrao?: unknown[];
  variaveis?: unknown[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface MTPropertyContractTemplateUpdate extends Partial<MTPropertyContractTemplateCreate> {
  id: string;
}

export interface MTPropertyContractCreate {
  property_id: string;
  valor_contrato: number;
  franchise_id?: string;
  numero_contrato?: string;
  proposal_id?: string;
  lead_id?: string;
  client_id?: string;
  corretor_id?: string;
  owner_id?: string;
  tipo?: ContractTipo;
  valor_mensal?: number;
  taxa_administracao?: number;
  comissao_corretor?: number;
  valor_comissao?: number;
  data_inicio?: string;
  data_vencimento?: string;
  template_id?: string;
  html_content?: string;
  clausulas?: unknown[];
  multa_rescisoria?: number;
  indice_reajuste?: IndiceReajuste;
  percentual_reajuste?: number;
}

export interface MTPropertyContractUpdate extends Partial<MTPropertyContractCreate> {
  id: string;
  status?: ContractStatus;
  pdf_url?: string;
  data_assinatura?: string;
  data_cancelamento?: string;
}

export interface MTPropertyContractSignatoryCreate {
  contract_id: string;
  tipo: ContractSignatoryTipo;
  nome: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  ordem_assinatura?: number;
}

export interface MTPropertyContractSignatoryUpdate extends Partial<MTPropertyContractSignatoryCreate> {
  id: string;
  assinado?: boolean;
  assinado_em?: string;
  assinatura_hash?: string;
  assinatura_canvas_data?: string;
  ip_address?: string;
  user_agent?: string;
}

// ───────────────────────────────────────────
// Filtros
// ───────────────────────────────────────────

export interface MTPropertyContractFilters {
  status?: ContractStatus | ContractStatus[];
  tipo?: ContractTipo | ContractTipo[];
  property_id?: string;
  lead_id?: string;
  corretor_id?: string;
  client_id?: string;
  owner_id?: string;
  proposal_id?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
}
