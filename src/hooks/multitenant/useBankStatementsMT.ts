import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { BankStatement, BankStatementCreate, BankStatementFilters, BankStatementStatus } from '@/types/conciliacao';

export function useBankStatementsMT(filters?: BankStatementFilters) {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchStatements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
        .from('mt_bank_statements')
        .select('*, account:mt_financial_accounts(id, nome, tipo, banco, agencia, conta)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.account_id) query = query.eq('account_id', filters.account_id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.date_from) query = query.gte('periodo_inicio', filters.date_from);
      if (filters?.date_to) query = query.lte('periodo_fim', filters.date_to);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setStatements((data || []) as BankStatement[]);
    } catch (err) {
      console.error('Erro ao carregar extratos:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar extratos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.account_id, filters?.status, filters?.date_from, filters?.date_to]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') {
      fetchStatements();
    }
  }, [fetchStatements, tenant?.id, accessLevel]);

  const createStatement = useCallback(async (data: BankStatementCreate): Promise<BankStatement> => {
    const { data: created, error } = await (supabase as any)
      .from('mt_bank_statements')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        ...data,
      })
      .select('*, account:mt_financial_accounts(id, nome, tipo, banco, agencia, conta)')
      .single();

    if (error) throw error;
    setStatements(prev => [created as BankStatement, ...prev]);
    return created as BankStatement;
  }, [tenant?.id, franchise?.id]);

  const deleteStatement = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from('mt_bank_statements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    setStatements(prev => prev.filter(s => s.id !== id));
    toast.success('Extrato removido');
  }, []);

  const updateStatus = useCallback(async (id: string, status: BankStatementStatus) => {
    const { error } = await (supabase as any)
      .from('mt_bank_statements')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    setStatements(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  return {
    statements,
    isLoading,
    error,
    refetch: fetchStatements,
    createStatement,
    deleteStatement,
    updateStatus,
  };
}
