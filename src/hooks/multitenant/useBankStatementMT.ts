import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { runAutoMatch as runAutoMatchAlgorithm } from '@/lib/reconciliation/autoMatcher';
import type {
  BankStatement,
  BankStatementEntry,
  BankStatementEntryCreate,
  EntryMatchStatus,
  ReconciliationSummary,
} from '@/types/conciliacao';
import type { FinancialTransaction } from '@/types/financeiro';

export function useBankStatementMT(statementId: string | undefined) {
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [entries, setEntries] = useState<BankStatementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, accessLevel } = useTenantContext();

  // Fetch statement + entries
  const fetchData = useCallback(async () => {
    if (!statementId) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch statement
      const { data: stmt, error: stmtErr } = await (supabase as any)
        .from('mt_bank_statements')
        .select('*, account:mt_financial_accounts(id, nome, tipo, banco, agencia, conta)')
        .eq('id', statementId)
        .single();

      if (stmtErr) throw stmtErr;
      setStatement(stmt as BankStatement);

      // Fetch entries with linked transactions
      const { data: ents, error: entsErr } = await (supabase as any)
        .from('mt_bank_statement_entries')
        .select('*, transaction:mt_financial_transactions(id, descricao, valor, tipo, status, data_competencia, data_pagamento)')
        .eq('statement_id', statementId)
        .order('data_transacao', { ascending: true });

      if (entsErr) throw entsErr;
      setEntries((ents || []) as BankStatementEntry[]);
    } catch (err) {
      console.error('Erro ao carregar extrato:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar extrato'));
    } finally {
      setIsLoading(false);
    }
  }, [statementId]);

  useEffect(() => {
    if (statementId && (tenant?.id || accessLevel === 'platform')) {
      fetchData();
    }
  }, [fetchData, statementId, tenant?.id, accessLevel]);

  // Import entries (batch insert)
  const importEntries = useCallback(async (newEntries: BankStatementEntryCreate[]) => {
    if (!statementId || !tenant?.id) throw new Error('Statement ou tenant não definido');

    const rows = newEntries.map(e => ({
      ...e,
      tenant_id: tenant.id,
      statement_id: statementId,
    }));

    // Batch insert in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await (supabase as any)
        .from('mt_bank_statement_entries')
        .insert(chunk);

      if (error) throw error;
    }

    // Update statement totals
    const totalEntradas = newEntries.filter(e => e.tipo === 'entrada').reduce((s, e) => s + e.valor, 0);
    const totalSaidas = newEntries.filter(e => e.tipo === 'saida').reduce((s, e) => s + e.valor, 0);

    await (supabase as any)
      .from('mt_bank_statements')
      .update({
        total_entries: newEntries.length,
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        entries_unmatched: newEntries.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    await fetchData();
  }, [statementId, tenant?.id, fetchData]);

  // Match an entry to a transaction
  const matchEntry = useCallback(async (
    entryId: string,
    transactionId: string,
    confidence: number,
    matchType: EntryMatchStatus = 'manual_matched'
  ) => {
    const { error } = await (supabase as any)
      .from('mt_bank_statement_entries')
      .update({
        match_status: matchType,
        match_confidence: confidence,
        transaction_id: transactionId,
        matched_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) throw error;

    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, match_status: matchType, match_confidence: confidence, transaction_id: transactionId, matched_at: new Date().toISOString() }
        : e
    ));

    await updateStatementCounts();
  }, [statementId]);

  // Unmatch an entry
  const unmatchEntry = useCallback(async (entryId: string) => {
    const { error } = await (supabase as any)
      .from('mt_bank_statement_entries')
      .update({
        match_status: 'pendente',
        match_confidence: null,
        transaction_id: null,
        matched_at: null,
        matched_by: null,
      })
      .eq('id', entryId);

    if (error) throw error;

    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, match_status: 'pendente' as EntryMatchStatus, match_confidence: null, transaction_id: null, matched_at: null }
        : e
    ));

    await updateStatementCounts();
  }, [statementId]);

  // Ignore an entry
  const ignoreEntry = useCallback(async (entryId: string) => {
    const { error } = await (supabase as any)
      .from('mt_bank_statement_entries')
      .update({
        match_status: 'ignored',
        matched_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) throw error;

    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, match_status: 'ignored' as EntryMatchStatus, matched_at: new Date().toISOString() }
        : e
    ));

    await updateStatementCounts();
  }, [statementId]);

  // Create a new transaction from a bank entry
  const createTransactionFromEntry = useCallback(async (
    entryId: string,
    txData: {
      descricao: string;
      category_id?: string;
      franchise_id: string | null;
      forma_pagamento?: string;
    }
  ) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) throw new Error('Entry não encontrada');

    // Create financial transaction
    const { data: created, error: createErr } = await (supabase as any)
      .from('mt_financial_transactions')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: txData.franchise_id || null,
        account_id: statement?.account_id,
        category_id: txData.category_id || null,
        tipo: entry.tipo === 'entrada' ? 'receita' : 'despesa',
        descricao: txData.descricao,
        valor: entry.valor,
        data_competencia: entry.data_transacao,
        data_pagamento: entry.data_transacao,
        status: 'pago',
        forma_pagamento: txData.forma_pagamento || null,
        documento: entry.fitid || entry.ref_num || null,
      })
      .select()
      .single();

    if (createErr) throw createErr;

    // Link entry to created transaction
    const { error: linkErr } = await (supabase as any)
      .from('mt_bank_statement_entries')
      .update({
        match_status: 'created',
        match_confidence: 1.0,
        transaction_id: created.id,
        matched_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (linkErr) throw linkErr;

    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, match_status: 'created' as EntryMatchStatus, match_confidence: 1.0, transaction_id: created.id, transaction: created }
        : e
    ));

    await updateStatementCounts();
    toast.success('Lançamento criado e vinculado');
    return created;
  }, [entries, statement, tenant?.id, statementId]);

  // Run auto-matching algorithm
  const runAutoMatch = useCallback(async (): Promise<{ matched: number; suggestions: number }> => {
    if (!statement) throw new Error('Statement não carregado');

    // Update status
    await (supabase as any)
      .from('mt_bank_statements')
      .update({ status: 'em_conciliacao', updated_at: new Date().toISOString() })
      .eq('id', statementId);

    // Fetch system transactions for same account + period
    let txQuery = (supabase as any)
      .from('mt_financial_transactions')
      .select('*')
      .is('deleted_at', null)
      .neq('status', 'cancelado');

    if (tenant?.id) txQuery = txQuery.eq('tenant_id', tenant.id);
    // Don't filter by account_id - vendas receitas may not have account_id set

    // Expand date range for fuzzy matching
    if (statement.periodo_inicio) {
      const start = new Date(statement.periodo_inicio);
      start.setDate(start.getDate() - 5);
      txQuery = txQuery.gte('data_competencia', start.toISOString().split('T')[0]);
    }
    if (statement.periodo_fim) {
      const end = new Date(statement.periodo_fim);
      end.setDate(end.getDate() + 5);
      txQuery = txQuery.lte('data_competencia', end.toISOString().split('T')[0]);
    }

    const { data: transactions, error: txErr } = await txQuery;
    if (txErr) throw txErr;

    // Run matching algorithm
    const pendingEntries = entries.filter(e => e.match_status === 'pendente');
    const result = runAutoMatchAlgorithm(pendingEntries, (transactions || []) as FinancialTransaction[]);

    // Apply auto-matches (confidence >= 0.70)
    for (const match of result.matched) {
      await (supabase as any)
        .from('mt_bank_statement_entries')
        .update({
          match_status: 'auto_matched',
          match_confidence: match.confidence,
          transaction_id: match.transactionId,
          matched_at: new Date().toISOString(),
        })
        .eq('id', match.entryId);
    }

    // Mark suggestions but keep as pendente
    for (const suggestion of result.suggestions) {
      await (supabase as any)
        .from('mt_bank_statement_entries')
        .update({
          match_confidence: suggestion.confidence,
          transaction_id: suggestion.transactionId,
        })
        .eq('id', suggestion.entryId);
    }

    await fetchData();

    const matchedCount = result.matched.length;
    const suggestionsCount = result.suggestions.length;

    toast.success(`${matchedCount} conciliados automaticamente${suggestionsCount > 0 ? `, ${suggestionsCount} sugestões` : ''}`);
    return { matched: matchedCount, suggestions: suggestionsCount };
  }, [statement, statementId, entries, tenant?.id, fetchData]);

  // Finalize reconciliation
  const finalizeReconciliation = useCallback(async () => {
    const pending = entries.filter(e => e.match_status === 'pendente');
    if (pending.length > 0) {
      toast.error(`Ainda há ${pending.length} lançamentos pendentes`);
      return;
    }

    const { error } = await (supabase as any)
      .from('mt_bank_statements')
      .update({
        status: 'conciliado',
        conciliado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    if (error) throw error;

    setStatement(prev => prev ? { ...prev, status: 'conciliado' } : null);
    toast.success('Conciliação finalizada!');
  }, [statementId, entries]);

  // Helper: update statement match counts
  const updateStatementCounts = useCallback(async () => {
    if (!statementId) return;

    // Re-fetch entries to get fresh counts
    const { data: freshEntries } = await (supabase as any)
      .from('mt_bank_statement_entries')
      .select('match_status')
      .eq('statement_id', statementId);

    if (!freshEntries) return;

    const matched = freshEntries.filter((e: any) => ['auto_matched', 'manual_matched'].includes(e.match_status)).length;
    const created = freshEntries.filter((e: any) => e.match_status === 'created').length;
    const ignored = freshEntries.filter((e: any) => e.match_status === 'ignored').length;
    const unmatched = freshEntries.filter((e: any) => e.match_status === 'pendente').length;

    await (supabase as any)
      .from('mt_bank_statements')
      .update({
        entries_matched: matched,
        entries_created: created,
        entries_unmatched: unmatched,
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    setStatement(prev => prev ? { ...prev, entries_matched: matched, entries_created: created, entries_unmatched: unmatched } : null);
  }, [statementId]);

  // Summary computed from entries
  const summary: ReconciliationSummary = {
    total: entries.length,
    matched: entries.filter(e => ['auto_matched', 'manual_matched'].includes(e.match_status)).length,
    suggestions: entries.filter(e => e.match_status === 'pendente' && e.match_confidence !== null && e.match_confidence > 0).length,
    pending: entries.filter(e => e.match_status === 'pendente' && (e.match_confidence === null || e.match_confidence === 0)).length,
    created: entries.filter(e => e.match_status === 'created').length,
    ignored: entries.filter(e => e.match_status === 'ignored').length,
  };

  return {
    statement,
    entries,
    summary,
    isLoading,
    error,
    refetch: fetchData,
    importEntries,
    matchEntry,
    unmatchEntry,
    ignoreEntry,
    createTransactionFromEntry,
    runAutoMatch,
    finalizeReconciliation,
  };
}
