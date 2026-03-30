/**
 * Parser para arquivos OFX (Open Financial Exchange)
 * OFX é um formato SGML/XML usado por bancos (Santander, Bradesco, Itaú, etc.)
 */

import type { ParsedBankStatement, ParsedBankEntry } from '@/types/conciliacao';

/**
 * Converte data OFX (YYYYMMDDHHMMSS ou YYYYMMDD) para ISO date string
 */
function parseOFXDate(dateStr: string): string {
  const clean = dateStr.replace(/\[.*\]/, '').trim();
  const year = clean.substring(0, 4);
  const month = clean.substring(4, 6);
  const day = clean.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Extrai o valor de uma tag OFX
 */
function extractTag(content: string, tagName: string): string | null {
  // OFX usa tags sem fechamento: <TAG>value\n
  const regex = new RegExp(`<${tagName}>([^<\\n]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extrai todos os blocos de transação do OFX
 */
function extractTransactions(content: string): string[] {
  const blocks: string[] = [];
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  // Fallback: OFX sem tags de fechamento (SGML puro)
  if (blocks.length === 0) {
    const parts = content.split(/<STMTTRN>/i);
    for (let i = 1; i < parts.length; i++) {
      const end = parts[i].search(/<\/?STMTTRN>|<\/STMTTRNRS>/i);
      blocks.push(end > 0 ? parts[i].substring(0, end) : parts[i]);
    }
  }

  return blocks;
}

/**
 * Parseia um arquivo OFX e retorna os dados estruturados
 */
export function parseOFX(content: string): ParsedBankStatement {
  const entries: ParsedBankEntry[] = [];

  // Extrair período
  const dtStart = extractTag(content, 'DTSTART');
  const dtEnd = extractTag(content, 'DTEND');

  // Extrair saldos
  const ledgerBal = extractTag(content, 'BALAMT');
  const availBal = extractTag(content, 'AVAILBAL');

  // Extrair info do banco
  const bankId = extractTag(content, 'BANKID');
  const acctId = extractTag(content, 'ACCTID');

  // Parsear transações
  const blocks = extractTransactions(content);

  for (const block of blocks) {
    const trnType = extractTag(block, 'TRNTYPE');
    const dtPosted = extractTag(block, 'DTPOSTED');
    const trnAmt = extractTag(block, 'TRNAMT');
    const fitid = extractTag(block, 'FITID');
    const name = extractTag(block, 'NAME');
    const memo = extractTag(block, 'MEMO');
    const refNum = extractTag(block, 'REFNUM') || extractTag(block, 'CHECKNUM');

    if (!dtPosted || !trnAmt) continue;

    // Handle Brazilian format: dots as thousands, comma as decimal
    const cleanAmt = trnAmt.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(cleanAmt);
    if (isNaN(amount) || amount === 0) continue;

    const descricao = [name, memo].filter(Boolean).join(' - ') || trnType || 'Sem descrição';

    entries.push({
      data_transacao: parseOFXDate(dtPosted),
      descricao_banco: descricao.trim(),
      valor: Math.abs(amount),
      tipo: amount >= 0 ? 'entrada' : 'saida',
      fitid: fitid || undefined,
      ref_num: refNum || undefined,
      memo: memo || undefined,
    });
  }

  // Ordenar por data
  entries.sort((a, b) => a.data_transacao.localeCompare(b.data_transacao));

  // Determinar período
  const dates = entries.map(e => e.data_transacao).sort();
  const periodo_inicio = dtStart ? parseOFXDate(dtStart) : dates[0] || '';
  const periodo_fim = dtEnd ? parseOFXDate(dtEnd) : dates[dates.length - 1] || '';

  return {
    entries,
    periodo_inicio,
    periodo_fim,
    saldo_final: ledgerBal ? parseFloat(ledgerBal.replace(/\./g, '').replace(',', '.')) : undefined,
    bank_name: bankId ? `Banco ${bankId}` : undefined,
    account_info: acctId || undefined,
  };
}
