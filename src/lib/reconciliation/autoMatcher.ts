/**
 * Algoritmo de conciliação automática
 * Faz matching entre entradas do extrato bancário e lançamentos do sistema
 */

import type { BankStatementEntry } from '@/types/conciliacao';
import type { FinancialTransaction } from '@/types/financeiro';

export interface MatchResult {
  entryId: string;
  transactionId: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy_date' | 'description';
}

export interface AutoMatchSummary {
  matched: MatchResult[];      // Confiança >= 0.70 (auto-match)
  suggestions: MatchResult[];  // Confiança 0.50-0.69 (sugestão)
}

/**
 * Calcula diferença em dias entre duas datas ISO
 */
function daysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Tokeniza uma string para comparação
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[\s\-\/\.\,\;\:\(\)]+/)
      .filter(t => t.length > 2)
  );
}

/**
 * Calcula similaridade entre dois conjuntos de tokens (Jaccard)
 */
function tokenSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  const union = tokens1.size + tokens2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Verifica se tipo do entry é compatível com tipo da transaction
 * entrada (extrato) = receita (sistema), saida (extrato) = despesa (sistema)
 */
function isTypeCompatible(entryTipo: 'entrada' | 'saida', txTipo: string): boolean {
  return (entryTipo === 'entrada' && txTipo === 'receita') ||
         (entryTipo === 'saida' && txTipo === 'despesa');
}

/**
 * Executa auto-matching em 3 passes
 *
 * @param entries - Entries do extrato (apenas pendentes)
 * @param transactions - Lançamentos do sistema (mesma conta + período)
 * @returns Matches automáticos e sugestões
 */
export function runAutoMatch(
  entries: BankStatementEntry[],
  transactions: FinancialTransaction[]
): AutoMatchSummary {
  const matched: MatchResult[] = [];
  const suggestions: MatchResult[] = [];

  // Sets para rastrear IDs já vinculados (1:1)
  const matchedEntryIds = new Set<string>();
  const matchedTxIds = new Set<string>();

  const pendingEntries = entries.filter(e => e.match_status === 'pendente');
  // Apenas transações pagas ou pendentes (não canceladas)
  const availableTx = transactions.filter(t => t.status !== 'cancelado');

  // =========================================================================
  // PASS 1: Match Exato (confiança 0.95-1.00)
  // data == data_competencia AND valor == valor AND tipo compatível
  // =========================================================================
  for (const entry of pendingEntries) {
    if (matchedEntryIds.has(entry.id)) continue;

    const candidates: { tx: FinancialTransaction; confidence: number }[] = [];

    for (const tx of availableTx) {
      if (matchedTxIds.has(tx.id)) continue;
      if (!isTypeCompatible(entry.tipo, tx.tipo)) continue;
      if (Math.abs(entry.valor - tx.valor) > 0.01) continue;

      // Match por FITID (OFX) com documento
      if (entry.fitid && tx.documento && entry.fitid === tx.documento) {
        candidates.push({ tx, confidence: 1.00 });
        continue;
      }

      // Match por data exata
      const txDate = tx.data_pagamento || tx.data_competencia;
      if (entry.data_transacao === txDate) {
        candidates.push({ tx, confidence: 0.95 });
      }
    }

    if (candidates.length === 1) {
      const best = candidates[0];
      matched.push({
        entryId: entry.id,
        transactionId: best.tx.id,
        confidence: best.confidence,
        matchType: 'exact',
      });
      matchedEntryIds.add(entry.id);
      matchedTxIds.add(best.tx.id);
    } else if (candidates.length > 1) {
      // Múltiplos candidatos exatos → pegar o de maior confiança
      candidates.sort((a, b) => b.confidence - a.confidence);
      const best = candidates[0];
      if (best.confidence >= 0.95) {
        matched.push({
          entryId: entry.id,
          transactionId: best.tx.id,
          confidence: best.confidence,
          matchType: 'exact',
        });
        matchedEntryIds.add(entry.id);
        matchedTxIds.add(best.tx.id);
      }
    }
  }

  // =========================================================================
  // PASS 2: Data Fuzzy (confiança 0.70-0.85)
  // |data_diff| <= 3 dias AND valor == valor AND tipo compatível
  // =========================================================================
  for (const entry of pendingEntries) {
    if (matchedEntryIds.has(entry.id)) continue;

    let bestCandidate: { tx: FinancialTransaction; confidence: number } | null = null;

    for (const tx of availableTx) {
      if (matchedTxIds.has(tx.id)) continue;
      if (!isTypeCompatible(entry.tipo, tx.tipo)) continue;
      if (Math.abs(entry.valor - tx.valor) > 0.01) continue;

      const txDate = tx.data_pagamento || tx.data_competencia;
      const diff = daysDiff(entry.data_transacao, txDate);

      if (diff >= 1 && diff <= 3) {
        const confidence = diff === 1 ? 0.85 : diff === 2 ? 0.80 : 0.70;
        if (!bestCandidate || confidence > bestCandidate.confidence) {
          bestCandidate = { tx, confidence };
        }
      }
    }

    if (bestCandidate) {
      const result: MatchResult = {
        entryId: entry.id,
        transactionId: bestCandidate.tx.id,
        confidence: bestCandidate.confidence,
        matchType: 'fuzzy_date',
      };

      if (bestCandidate.confidence >= 0.70) {
        matched.push(result);
        matchedEntryIds.add(entry.id);
        matchedTxIds.add(bestCandidate.tx.id);
      } else {
        suggestions.push(result);
      }
    }
  }

  // =========================================================================
  // PASS 3: Descrição Similar (confiança 0.50-0.65)
  // |data_diff| <= 5 dias AND |valor_diff| <= 0.05 AND tokens similares
  // =========================================================================
  for (const entry of pendingEntries) {
    if (matchedEntryIds.has(entry.id)) continue;

    const entryTokens = tokenize(entry.descricao_banco);
    let bestCandidate: { tx: FinancialTransaction; confidence: number } | null = null;

    for (const tx of availableTx) {
      if (matchedTxIds.has(tx.id)) continue;
      if (!isTypeCompatible(entry.tipo, tx.tipo)) continue;
      if (Math.abs(entry.valor - tx.valor) > 0.05) continue;

      const txDate = tx.data_pagamento || tx.data_competencia;
      const diff = daysDiff(entry.data_transacao, txDate);
      if (diff > 5) continue;

      const txTokens = tokenize(tx.descricao);
      const similarity = tokenSimilarity(entryTokens, txTokens);

      if (similarity > 0.2) {
        const confidence = Math.min(0.65, 0.50 + similarity * 0.3);
        if (!bestCandidate || confidence > bestCandidate.confidence) {
          bestCandidate = { tx, confidence };
        }
      }
    }

    if (bestCandidate) {
      suggestions.push({
        entryId: entry.id,
        transactionId: bestCandidate.tx.id,
        confidence: bestCandidate.confidence,
        matchType: 'description',
      });
    }
  }

  return { matched, suggestions };
}
