// Tipos para o módulo de Conciliação Bancária

import type { FinancialAccount, FinancialTransaction } from './financeiro';

// === ENUMS ===

export type BankStatementStatus = 'importado' | 'em_conciliacao' | 'conciliado' | 'cancelado';
export type EntryMatchStatus = 'pendente' | 'auto_matched' | 'manual_matched' | 'created' | 'ignored';
export type BankFileFormat = 'ofx' | 'xls' | 'xlsx' | 'pdf';

// === LABELS ===

export const BANK_STATEMENT_STATUS_LABELS: Record<BankStatementStatus, string> = {
  importado: 'Importado',
  em_conciliacao: 'Em Conciliação',
  conciliado: 'Conciliado',
  cancelado: 'Cancelado',
};

export const BANK_STATEMENT_STATUS_COLORS: Record<BankStatementStatus, string> = {
  importado: 'bg-blue-100 text-blue-800',
  em_conciliacao: 'bg-yellow-100 text-yellow-800',
  conciliado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export const ENTRY_MATCH_STATUS_LABELS: Record<EntryMatchStatus, string> = {
  pendente: 'Pendente',
  auto_matched: 'Auto',
  manual_matched: 'Manual',
  created: 'Criado',
  ignored: 'Ignorado',
};

export const ENTRY_MATCH_STATUS_COLORS: Record<EntryMatchStatus, string> = {
  pendente: 'bg-gray-100 text-gray-800',
  auto_matched: 'bg-green-100 text-green-800',
  manual_matched: 'bg-blue-100 text-blue-800',
  created: 'bg-purple-100 text-purple-800',
  ignored: 'bg-orange-100 text-orange-800',
};

export const BANK_FILE_FORMAT_LABELS: Record<BankFileFormat, string> = {
  ofx: 'OFX Money',
  xls: 'Excel (XLS)',
  xlsx: 'Excel (XLSX)',
  pdf: 'PDF',
};

// === INTERFACES ===

export interface BankStatement {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  account_id: string;
  file_name: string;
  file_url: string | null;
  file_format: BankFileFormat;
  file_size_bytes: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_entries: number;
  total_entradas: number;
  total_saidas: number;
  saldo_inicial_extrato: number | null;
  saldo_final_extrato: number | null;
  status: BankStatementStatus;
  entries_matched: number;
  entries_unmatched: number;
  entries_created: number;
  conciliado_em: string | null;
  conciliado_por: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  account?: FinancialAccount;
}

export interface BankStatementEntry {
  id: string;
  tenant_id: string;
  statement_id: string;
  data_transacao: string;
  descricao_banco: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  saldo_apos: number | null;
  fitid: string | null;
  ref_num: string | null;
  memo: string | null;
  match_status: EntryMatchStatus;
  match_confidence: number | null;
  transaction_id: string | null;
  matched_at: string | null;
  matched_by: string | null;
  created_at: string;
  // JOINs
  transaction?: FinancialTransaction;
}

export interface BankStatementCreate {
  account_id: string;
  franchise_id?: string;
  file_name: string;
  file_url?: string;
  file_format: BankFileFormat;
  file_size_bytes?: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  total_entries: number;
  total_entradas: number;
  total_saidas: number;
  saldo_inicial_extrato?: number;
  saldo_final_extrato?: number;
}

export interface BankStatementEntryCreate {
  statement_id: string;
  data_transacao: string;
  descricao_banco: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  saldo_apos?: number;
  fitid?: string;
  ref_num?: string;
  memo?: string;
}

export interface BankStatementFilters {
  account_id?: string;
  status?: BankStatementStatus;
  date_from?: string;
  date_to?: string;
}

// === PARSER TYPES ===

export interface ParsedBankStatement {
  entries: ParsedBankEntry[];
  periodo_inicio: string;
  periodo_fim: string;
  saldo_inicial?: number;
  saldo_final?: number;
  bank_name?: string;
  account_info?: string;
}

export interface ParsedBankEntry {
  data_transacao: string;
  descricao_banco: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  saldo_apos?: number;
  fitid?: string;
  ref_num?: string;
  memo?: string;
}

// === RECONCILIATION TYPES ===

export interface MatchResult {
  entryId: string;
  transactionId: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy_date' | 'description';
}

export interface ReconciliationSummary {
  total: number;
  matched: number;
  suggestions: number;
  pending: number;
  created: number;
  ignored: number;
}

export interface ReconciliationRule {
  id: string;
  tenant_id: string;
  nome: string;
  descricao_pattern: string;
  category_id: string | null;
  tipo: 'receita' | 'despesa' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
