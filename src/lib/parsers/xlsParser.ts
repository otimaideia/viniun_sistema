/**
 * Parser para extratos bancários em formato Excel (XLS/XLSX)
 * Otimizado para Santander mas funciona com outros bancos brasileiros
 */

import * as XLSX from 'xlsx';
import type { ParsedBankStatement, ParsedBankEntry } from '@/types/conciliacao';

// Padrões de cabeçalho conhecidos por banco
const HEADER_PATTERNS = {
  data: ['data', 'dt', 'date', 'dt. movimento', 'data mov', 'data lançamento', 'dt lançamento', 'dt. lançamento'],
  descricao: ['histórico', 'historico', 'descrição', 'descricao', 'descrição do lançamento', 'lancamento', 'lançamento', 'description'],
  credito: ['crédito', 'credito', 'credit', 'entrada', 'valor crédito', 'cr'],
  debito: ['débito', 'debito', 'debit', 'saída', 'saida', 'valor débito', 'db'],
  valor: ['valor', 'value', 'amount', 'vlr'],
  saldo: ['saldo', 'balance', 'saldo final'],
  documento: ['documento', 'doc', 'num. documento', 'nº documento'],
};

/**
 * Normaliza texto para comparação (lowercase, sem acentos)
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta qual coluna corresponde a qual campo
 */
function detectColumns(headerRow: string[]): {
  dataCol: number;
  descricaoCol: number;
  creditoCol: number;
  debitoCol: number;
  valorCol: number;
  saldoCol: number;
  documentoCol: number;
} {
  const result = {
    dataCol: -1,
    descricaoCol: -1,
    creditoCol: -1,
    debitoCol: -1,
    valorCol: -1,
    saldoCol: -1,
    documentoCol: -1,
  };

  for (let i = 0; i < headerRow.length; i++) {
    const norm = normalize(String(headerRow[i] || ''));
    if (!norm) continue;

    if (result.dataCol === -1 && HEADER_PATTERNS.data.some(p => norm.includes(p))) {
      result.dataCol = i;
    } else if (result.descricaoCol === -1 && HEADER_PATTERNS.descricao.some(p => norm.includes(p))) {
      result.descricaoCol = i;
    } else if (result.creditoCol === -1 && HEADER_PATTERNS.credito.some(p => norm.includes(p))) {
      result.creditoCol = i;
    } else if (result.debitoCol === -1 && HEADER_PATTERNS.debito.some(p => norm.includes(p))) {
      result.debitoCol = i;
    } else if (result.valorCol === -1 && HEADER_PATTERNS.valor.some(p => norm === p)) {
      result.valorCol = i;
    } else if (result.saldoCol === -1 && HEADER_PATTERNS.saldo.some(p => norm.includes(p))) {
      result.saldoCol = i;
    } else if (result.documentoCol === -1 && HEADER_PATTERNS.documento.some(p => norm.includes(p))) {
      result.documentoCol = i;
    }
  }

  return result;
}

/**
 * Encontra a linha de cabeçalho na planilha
 */
function findHeaderRow(data: unknown[][]): { rowIndex: number; columns: ReturnType<typeof detectColumns> } | null {
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i];
    if (!row || !Array.isArray(row)) continue;

    const rowStr = row.map(c => String(c || ''));
    const columns = detectColumns(rowStr);

    // Precisa ter pelo menos data + descrição + (crédito/débito ou valor)
    if (columns.dataCol >= 0 && columns.descricaoCol >= 0 && (columns.creditoCol >= 0 || columns.valorCol >= 0)) {
      return { rowIndex: i, columns };
    }
  }

  return null;
}

/**
 * Parseia um valor monetário brasileiro (1.234,56 ou -1234.56)
 */
function parseMoneyValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str) return null;

  // Formato BR: 1.234,56 → remover pontos, trocar vírgula por ponto
  let cleaned = str.replace(/[R$\s]/g, '');

  if (cleaned.includes(',')) {
    // Formato brasileiro: pontos como milhares, vírgula como decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parseia uma data do Excel (número serial ou string)
 */
function parseExcelDate(value: unknown): string | null {
  if (!value) return null;

  // Número serial do Excel
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = String(date.y).padStart(4, '0');
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();

  // DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  return null;
}

/**
 * Parseia um arquivo Excel (XLS/XLSX) e retorna os dados estruturados
 */
export function parseXLS(buffer: ArrayBuffer): ParsedBankStatement {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converter para array de arrays
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  // Encontrar cabeçalho
  const header = findHeaderRow(data as unknown[][]);
  if (!header) {
    throw new Error('Não foi possível identificar o cabeçalho do extrato. Verifique se o arquivo contém colunas de Data, Descrição e Valor.');
  }

  const { rowIndex, columns } = header;
  const entries: ParsedBankEntry[] = [];

  // Parsear linhas de dados (após o cabeçalho)
  for (let i = rowIndex + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || !Array.isArray(row)) continue;

    // Parsear data
    const dataTransacao = parseExcelDate(row[columns.dataCol]);
    if (!dataTransacao) continue;

    // Parsear descrição
    const descricao = String(row[columns.descricaoCol] || '').trim();
    if (!descricao) continue;

    // Parsear valor
    let valor: number | null = null;
    let tipo: 'entrada' | 'saida' = 'saida';

    if (columns.creditoCol >= 0 && columns.debitoCol >= 0) {
      // Colunas separadas de crédito/débito
      const credito = parseMoneyValue(row[columns.creditoCol]);
      const debito = parseMoneyValue(row[columns.debitoCol]);

      if (credito && credito > 0) {
        valor = credito;
        tipo = 'entrada';
      } else if (debito) {
        valor = Math.abs(debito);
        tipo = 'saida';
      }
    } else if (columns.valorCol >= 0) {
      // Coluna única de valor (positivo = entrada, negativo = saída)
      const v = parseMoneyValue(row[columns.valorCol]);
      if (v !== null) {
        valor = Math.abs(v);
        tipo = v >= 0 ? 'entrada' : 'saida';
      }
    }

    if (valor === null || valor === 0) continue;

    // Parsear saldo
    const saldoApos = columns.saldoCol >= 0 ? parseMoneyValue(row[columns.saldoCol]) : null;

    // Parsear documento
    const refNum = columns.documentoCol >= 0 ? String(row[columns.documentoCol] || '').trim() || undefined : undefined;

    entries.push({
      data_transacao: dataTransacao,
      descricao_banco: descricao,
      valor,
      tipo,
      saldo_apos: saldoApos,
      ref_num: refNum,
    });
  }

  // Ordenar por data
  entries.sort((a, b) => a.data_transacao.localeCompare(b.data_transacao));

  // Período
  const dates = entries.map(e => e.data_transacao).sort();

  return {
    entries,
    periodo_inicio: dates[0] || '',
    periodo_fim: dates[dates.length - 1] || '',
    saldo_final: entries.length > 0 ? entries[entries.length - 1].saldo_apos ?? undefined : undefined,
  };
}
