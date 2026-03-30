// Tipos para o módulo Financeiro

// === ENUMS ===

export type TransactionType = 'receita' | 'despesa';

export type TransactionStatus = 'pendente' | 'pago' | 'cancelado' | 'atrasado';

export type AccountType = 'caixa' | 'banco' | 'cartao' | 'digital';

export type RecurringFrequency = 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export type PayrollStatus = 'rascunho' | 'processado' | 'pago';

export type ContractType = 'clt' | 'mei';

export type SalaryType = 'fixo' | 'diaria' | 'comissao';

export type CommissionType = 'percentual_faturamento' | 'percentual_meta' | 'valor_fixo';

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  clt: 'CLT',
  mei: 'MEI',
};

export const CLT_CARGOS = [
  'Consultora de Vendas',
  'Administrativo',
  'Gerente',
  'Supervisor de Vendas',
  'Recepcionista',
  'Auxiliar Administrativo',
] as const;

export const MEI_CARGOS = [
  'Esteticista',
  'Biomédica',
  'Aplicadora de Laser',
  'Aplicadora',
] as const;

// === LABELS ===

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
  atrasado: 'Atrasado',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  caixa: 'Caixa',
  banco: 'Conta Bancária',
  cartao: 'Cartão',
  digital: 'Conta Digital',
};

// === INTERFACES ===

export interface FinancialCategory {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  codigo: string | null;
  nome: string;
  tipo: TransactionType;
  descricao: string | null;
  is_active: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs / computed
  children?: FinancialCategory[];
}

export interface FinancialCategoryCreate {
  parent_id?: string;
  codigo?: string;
  nome: string;
  tipo: TransactionType;
  descricao?: string;
  ordem?: number;
}

export interface FinancialAccount {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  tipo: AccountType;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_inicial: number;
  saldo_atual: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinancialAccountCreate {
  franchise_id?: string;
  nome: string;
  tipo: AccountType;
  banco?: string;
  agencia?: string;
  conta?: string;
  saldo_inicial?: number;
}

export interface FinancialAccountUpdate extends Partial<FinancialAccountCreate> {
  id: string;
  is_active?: boolean;
}

export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  franchise_id: string;
  account_id: string | null;
  category_id: string | null;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  sale_id: string | null;
  movement_id: string | null;
  data_competencia: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: TransactionStatus;
  forma_pagamento: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  documento: string | null;
  observacoes: string | null;
  comprovante_url?: string | null;
  parcela_grupo_id?: string | null;
  recurring_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  // JOINs
  category?: FinancialCategory;
  account?: FinancialAccount;
}

export interface FinancialTransactionCreate {
  franchise_id: string;
  account_id?: string;
  category_id?: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  sale_id?: string;
  movement_id?: string;
  data_competencia: string;
  data_vencimento?: string;
  data_pagamento?: string;
  status?: TransactionStatus;
  forma_pagamento?: string;
  parcela_atual?: number;
  parcela_total?: number;
  documento?: string;
  observacoes?: string;
  comprovante_url?: string;
  parcela_grupo_id?: string;
  recurring_id?: string;
}

export interface FinancialTransactionUpdate extends Partial<FinancialTransactionCreate> {
  id: string;
}

export interface FinancialTransactionFilters {
  tipo?: TransactionType;
  status?: TransactionStatus;
  category_id?: string;
  account_id?: string;
  franchise_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CostCenter {
  id: string;
  tenant_id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// === DASHBOARD ===

export interface FinanceiroDashboardMetrics {
  receita_total: number;
  despesa_total: number;
  lucro_liquido: number;
  margem_liquida: number;
  receitas_pendentes: number;
  despesas_pendentes: number;
  contas_a_pagar_vencidas: number;
  contas_a_receber_vencidas?: number;
  total_vencidos?: number;
  saldo_total_contas: number;
}

export interface DREData {
  periodo: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos_servicos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  lucro_operacional: number;
  resultado_financeiro: number;
  lucro_liquido: number;
}

export interface FluxoCaixaData {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldo_acumulado: number;
}

// === RECURRING ===

export interface FinancialRecurring {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  category_id: string | null;
  account_id: string | null;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  forma_pagamento: string | null;
  frequencia: RecurringFrequency;
  dia_vencimento: number | null;
  data_inicio: string;
  data_fim: string | null;
  next_due_date: string;
  is_active: boolean;
  total_gerados: number;
  ultimo_gerado_em: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  category?: FinancialCategory;
  account?: FinancialAccount;
}

export interface FinancialRecurringCreate {
  franchise_id?: string;
  category_id?: string;
  account_id?: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  forma_pagamento?: string;
  frequencia: RecurringFrequency;
  dia_vencimento?: number;
  data_inicio: string;
  data_fim?: string;
  next_due_date: string;
  observacoes?: string;
}

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

// === PAYROLL ===

export interface PayrollEmployee {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  tipo_contratacao: ContractType;
  nome: string;
  cargo: string;
  cpf: string | null;
  data_admissao: string | null;
  salario_base: number;
  tipo_salario: SalaryType;
  diaria_minima: number;
  has_vt: boolean;
  vt_valor: number;
  has_vr: boolean;
  vr_valor: number;
  fgts_percentual: number;
  inss_percentual: number;
  comissao_tipo: CommissionType | null;
  comissao_valor: number;
  comissao_descricao: string | null;
  comissao_meta_global_pct: number;
  comissao_meta_individual_pct: number;
  is_active: boolean;
  data_desligamento: string | null;
  user_id: string | null;
  observacoes: string | null;
  // Dados pessoais
  pis: string | null;
  rg: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cbo: string | null;
  etnia_raca: string | null;
  estado_civil: string | null;
  grau_instrucao: string | null;
  // Dados bancários
  banco: string | null;
  agencia: string | null;
  conta_bancaria: string | null;
  pix: string | null;
  // Jornada CLT
  jornada_semanal: number;
  horario_entrada: string;
  horario_saida: string;
  escala_trabalho: string | null;
  contrato_experiencia: string | null;
  optante_vt: boolean;
  adiantamento: string | null;
  // Provisões (% editáveis)
  provisao_13_pct: number;
  provisao_ferias_pct: number;
  provisao_ferias_terco_pct: number;
  provisao_multa_fgts_pct: number;
  // Encargos patronais (% editáveis)
  inss_patronal_pct: number;
  rat_pct: number;
  sistema_s_pct: number;
  salario_educacao_pct: number;
  // Benefícios adicionais
  has_va: boolean;
  va_valor: number;
  has_plano_saude: boolean;
  plano_saude_valor: number;
  has_plano_odonto: boolean;
  plano_odonto_valor: number;
  has_auxilio_creche: boolean;
  auxilio_creche_valor: number;
  has_salario_familia: boolean;
  salario_familia_valor: number;
  // Descontos do funcionário
  desconto_vt_pct: number;
  inss_funcionario_pct: number;
  irrf_valor: number;
  desconto_plano_saude_valor: number;
  desconto_plano_odonto_valor: number;
  outros_descontos_valor: number;
  outros_descontos_descricao: string | null;
  // Dependentes
  qtd_dependentes: number;
  qtd_filhos_creche: number;
  qtd_filhos_salario_familia: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PayrollEmployeeCreate {
  franchise_id?: string;
  user_id?: string;
  tipo_contratacao: ContractType;
  nome: string;
  cargo: string;
  cpf?: string;
  data_admissao?: string;
  salario_base: number;
  tipo_salario?: SalaryType;
  diaria_minima?: number;
  has_vt?: boolean;
  vt_valor?: number;
  has_vr?: boolean;
  vr_valor?: number;
  fgts_percentual?: number;
  inss_percentual?: number;
  comissao_tipo?: CommissionType;
  comissao_valor?: number;
  comissao_descricao?: string;
  comissao_meta_global_pct?: number;
  comissao_meta_individual_pct?: number;
  observacoes?: string;
  // Dados pessoais
  pis?: string;
  rg?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cbo?: string;
  etnia_raca?: string;
  estado_civil?: string;
  grau_instrucao?: string;
  // Dados bancários
  banco?: string;
  agencia?: string;
  conta_bancaria?: string;
  pix?: string;
  // Jornada
  jornada_semanal?: number;
  horario_entrada?: string;
  horario_saida?: string;
  escala_trabalho?: string;
  contrato_experiencia?: string;
  optante_vt?: boolean;
  adiantamento?: string;
  // Provisões
  provisao_13_pct?: number;
  provisao_ferias_pct?: number;
  provisao_ferias_terco_pct?: number;
  provisao_multa_fgts_pct?: number;
  // Encargos patronais
  inss_patronal_pct?: number;
  rat_pct?: number;
  sistema_s_pct?: number;
  salario_educacao_pct?: number;
  // Benefícios adicionais
  has_va?: boolean;
  va_valor?: number;
  has_plano_saude?: boolean;
  plano_saude_valor?: number;
  has_plano_odonto?: boolean;
  plano_odonto_valor?: number;
  has_auxilio_creche?: boolean;
  auxilio_creche_valor?: number;
  has_salario_familia?: boolean;
  salario_familia_valor?: number;
  // Descontos
  desconto_vt_pct?: number;
  inss_funcionario_pct?: number;
  irrf_valor?: number;
  desconto_plano_saude_valor?: number;
  desconto_plano_odonto_valor?: number;
  outros_descontos_valor?: number;
  outros_descontos_descricao?: string;
  // Dependentes
  qtd_dependentes?: number;
  qtd_filhos_creche?: number;
  qtd_filhos_salario_familia?: number;
}

export interface PayrollRun {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  competencia: string;
  status: PayrollStatus;
  total_salarios: number;
  total_beneficios: number;
  total_impostos: number;
  total_comissoes: number;
  total_provisoes: number;
  total_encargos: number;
  total_descontos: number;
  total_geral: number;
  processado_em: string | null;
  processado_por: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  items?: PayrollItem[];
}

export interface PayrollRunCreate {
  franchise_id?: string;
  competencia: string;
  observacoes?: string;
}

export interface PayrollItem {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  transaction_id: string | null;
  salario_base: number;
  vt_valor: number;
  vr_valor: number;
  fgts_valor: number;
  inss_valor: number;
  comissao_valor: number;
  // Provisões
  provisao_13_valor: number;
  provisao_ferias_valor: number;
  provisao_ferias_terco_valor: number;
  fgts_13_valor: number;
  fgts_ferias_valor: number;
  provisao_multa_fgts_valor: number;
  // Encargos patronais
  inss_patronal_valor: number;
  rat_valor: number;
  sistema_s_valor: number;
  salario_educacao_valor: number;
  // Benefícios
  va_valor: number;
  plano_saude_valor: number;
  plano_odonto_valor: number;
  auxilio_creche_valor: number;
  salario_familia_valor: number;
  // Descontos
  desconto_vt_valor: number;
  inss_funcionario_valor: number;
  irrf_valor: number;
  total_bruto: number;
  total_liquido: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  employee?: PayrollEmployee;
}

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  rascunho: 'Rascunho',
  processado: 'Processado',
  pago: 'Pago',
};

// === CHECKLIST ADMISSIONAL / DEMISSIONAL ===

export type ChecklistStatus = 'pendente' | 'enviado' | 'validado' | 'rejeitado';
export type ChecklistTipo = 'admissional' | 'demissional';

export interface PayrollChecklistItem {
  id: string;
  tenant_id: string;
  employee_id: string;
  codigo: string;
  categoria: string;
  nome: string;
  status: ChecklistStatus;
  obrigatorio: boolean;
  tipo: ChecklistTipo;
  documento_id: string | null;
  validado_por: string | null;
  validado_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// === DADOS DEMISSIONAIS (formulário do desligamento) ===

export interface DemissionalData {
  id: string;
  tenant_id: string;
  employee_id: string;
  quem_solicitou: 'empregador' | 'empregado' | null;
  tipo_aviso_previo: string | null;
  variaveis: string | null;
  descontos: string | null;
  info_ferias_13: string | null;
  houve_afastamento: string | null;
  created_at: string;
  updated_at: string;
}

export const QUEM_SOLICITOU_OPTIONS = [
  { value: 'empregador', label: 'O Empregador' },
  { value: 'empregado', label: 'O Empregado' },
] as const;

export const TIPO_AVISO_PREVIO_OPTIONS = [
  { value: 'indenizado', label: 'Indenizado' },
  { value: 'trabalhado', label: 'Trabalhado' },
  { value: 'descontado', label: 'Descontado' },
  { value: 'termino_experiencia', label: 'Término de Contrato de Experiência' },
  { value: 'dispensado', label: 'Dispensado (pedido de demissão sem desconto)' },
  { value: 'justa_causa', label: 'Justa Causa' },
] as const;

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
};

export const CHECKLIST_CATEGORIA_LABELS: Record<string, string> = {
  // Admissional
  documentos_pessoais: 'Documentos Pessoais',
  exames: 'Exames',
  contratos: 'Contratos',
  beneficios: 'Benefícios',
  dados_preenchidos: 'Dados Preenchidos',
  // Demissional
  documentos_rescisao: 'Documentos Rescisórios',
  exames_demissional: 'Exames Demissionais',
};

export const ETNIA_OPTIONS = [
  { value: 'branco', label: 'Branco' },
  { value: 'negro', label: 'Negro' },
  { value: 'amarelo', label: 'Amarelo' },
  { value: 'pardo', label: 'Pardo' },
  { value: 'indigena', label: 'Indígena' },
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
] as const;

export const GRAU_INSTRUCAO_OPTIONS = [
  { value: 'fundamental_incompleto', label: 'Fundamental Incompleto' },
  { value: 'fundamental_completo', label: 'Fundamental Completo' },
  { value: 'medio_incompleto', label: 'Médio Incompleto' },
  { value: 'medio_completo', label: 'Médio Completo' },
  { value: 'superior_incompleto', label: 'Superior Incompleto' },
  { value: 'superior_completo', label: 'Superior Completo' },
  { value: 'pos_graduacao', label: 'Pós-Graduação' },
] as const;

export const CONTRATO_EXPERIENCIA_OPTIONS = [
  { value: 'sim_45_45', label: 'Sim — 45 + 45 dias' },
  { value: 'sim_30_60', label: 'Sim — 30 + 60 dias' },
  { value: 'nao', label: 'Não' },
] as const;

export const ADIANTAMENTO_OPTIONS = [
  { value: 'sim_40', label: 'Sim — 40%' },
  { value: 'sim_50', label: 'Sim — 50%' },
  { value: 'nao', label: 'Não' },
] as const;

export const DEFAULT_CHECKLIST_ITEMS = [
  { codigo: 'doc_rg', categoria: 'documentos_pessoais', nome: 'RG (cópia)', obrigatorio: true },
  { codigo: 'doc_cpf', categoria: 'documentos_pessoais', nome: 'CPF (cópia)', obrigatorio: true },
  { codigo: 'doc_titulo_eleitor', categoria: 'documentos_pessoais', nome: 'Título de Eleitor', obrigatorio: true },
  { codigo: 'doc_carteira_trabalho', categoria: 'documentos_pessoais', nome: 'Carteira de Trabalho (CTPS)', obrigatorio: true },
  { codigo: 'doc_pis', categoria: 'documentos_pessoais', nome: 'Cartão PIS/NIS', obrigatorio: true },
  { codigo: 'doc_comprovante_endereco', categoria: 'documentos_pessoais', nome: 'Comprovante de Endereço', obrigatorio: true },
  { codigo: 'doc_foto_3x4', categoria: 'documentos_pessoais', nome: 'Foto 3x4', obrigatorio: true },
  { codigo: 'doc_comprovante_escolaridade', categoria: 'documentos_pessoais', nome: 'Comprovante de Escolaridade', obrigatorio: true },
  { codigo: 'doc_certidao_casamento', categoria: 'documentos_pessoais', nome: 'Certidão de Casamento/Nascimento', obrigatorio: true },
  { codigo: 'doc_certidao_nascimento_filhos', categoria: 'documentos_pessoais', nome: 'Certidão de Nascimento dos Filhos', obrigatorio: false },
  { codigo: 'doc_carteira_vacinacao_filhos', categoria: 'documentos_pessoais', nome: 'Carteira de Vacinação (filhos até 7 anos)', obrigatorio: false },
  { codigo: 'doc_declaracao_escola_filhos', categoria: 'documentos_pessoais', nome: 'Declaração Escolar (filhos 7-14 anos)', obrigatorio: false },
  { codigo: 'doc_reservista', categoria: 'documentos_pessoais', nome: 'Certificado de Reservista', obrigatorio: false },
  { codigo: 'exame_admissional', categoria: 'exames', nome: 'Exame Admissional (ASO)', obrigatorio: true },
  { codigo: 'contrato_trabalho', categoria: 'contratos', nome: 'Contrato de Trabalho assinado', obrigatorio: true },
  { codigo: 'contrato_experiencia', categoria: 'contratos', nome: 'Contrato de Experiência', obrigatorio: false },
  { codigo: 'termo_vt', categoria: 'beneficios', nome: 'Termo de Opção de Vale Transporte', obrigatorio: true },
  { codigo: 'termo_plano_saude', categoria: 'beneficios', nome: 'Termo de Adesão Plano de Saúde', obrigatorio: false },
  { codigo: 'termo_plano_odonto', categoria: 'beneficios', nome: 'Termo de Adesão Plano Odontológico', obrigatorio: false },
  { codigo: 'dados_pessoais_completos', categoria: 'dados_preenchidos', nome: 'Dados Pessoais Completos', obrigatorio: true },
  { codigo: 'dados_bancarios_completos', categoria: 'dados_preenchidos', nome: 'Dados Bancários Completos', obrigatorio: true },
  { codigo: 'dados_dependentes_ir', categoria: 'dados_preenchidos', nome: 'Dependentes para IR informados', obrigatorio: false },
] as const;

export const DEFAULT_DEMISSIONAL_ITEMS = [
  { codigo: 'exame_demissional', categoria: 'exames_demissional', nome: 'Exame Demissional (ASO)', obrigatorio: true },
  { codigo: 'carta_demissao', categoria: 'documentos_rescisao', nome: 'Carta de Demissão assinada (em casos de pedido)', obrigatorio: true },
  { codigo: 'comunicado_dispensa', categoria: 'documentos_rescisao', nome: 'Comunicado de Dispensa assinado (em casos de dispensa)', obrigatorio: true },
] as const;

// === COMPARATIVO ===

export interface ComparativoData {
  periodA: { receitas: number; despesas: number; lucro: number; label: string };
  periodB: { receitas: number; despesas: number; lucro: number; label: string };
  growth: { receitas_pct: number; despesas_pct: number; lucro_pct: number };
  byCategory: ComparativoCategory[];
}

export interface ComparativoCategory {
  category_id: string | null;
  category_nome: string;
  periodA_value: number;
  periodB_value: number;
  change_pct: number;
  delta: number;
}
