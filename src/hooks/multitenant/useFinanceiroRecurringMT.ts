import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { FinancialRecurring, FinancialRecurringCreate, RecurringFrequency } from '@/types/financeiro';

/** Avança uma data conforme a frequência */
function advanceDate(date: Date, frequencia: RecurringFrequency): void {
  switch (frequencia) {
    case 'semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'quinzenal':
      date.setDate(date.getDate() + 15);
      break;
    case 'mensal':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'bimestral':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'trimestral':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semestral':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
}

/** Calcula quantas ocorrências serão geradas (para preview) */
export function calcularOcorrencias(
  dataInicio: string,
  dataFim: string | undefined,
  frequencia: RecurringFrequency
): number {
  const end = dataFim
    ? new Date(dataFim + 'T00:00:00')
    : (() => { const d = new Date(dataInicio + 'T00:00:00'); d.setFullYear(d.getFullYear() + 1); return d; })();

  let current = new Date(dataInicio + 'T00:00:00');
  let count = 0;

  while (current <= end) {
    count++;
    advanceDate(current, frequencia);
  }

  return count;
}

export function useFinancialRecurringMT() {
  const [recurrings, setRecurrings] = useState<FinancialRecurring[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchRecurrings = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_financial_recurring')
        .select('*, category:mt_financial_categories(id, nome, codigo, tipo), account:mt_financial_accounts(id, nome, tipo)')
        .is('deleted_at', null)
        .order('descricao', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setRecurrings((data || []) as FinancialRecurring[]);
    } catch (err) {
      console.error('Erro ao carregar recorrentes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  /** Gera TODAS as transações de uma vez até data_fim (ou +12 meses) */
  const generateAllUpfront = useCallback(async (recurring: FinancialRecurring): Promise<number> => {
    const endDate = recurring.data_fim
      ? new Date(recurring.data_fim + 'T00:00:00')
      : (() => { const d = new Date(recurring.data_inicio + 'T00:00:00'); d.setFullYear(d.getFullYear() + 1); return d; })();

    const currentDate = new Date(recurring.data_inicio + 'T00:00:00');
    const transactions: any[] = [];

    while (currentDate <= endDate) {
      transactions.push({
        tenant_id: recurring.tenant_id,
        franchise_id: recurring.franchise_id,
        category_id: recurring.category_id,
        account_id: recurring.account_id,
        tipo: recurring.tipo,
        descricao: recurring.descricao,
        valor: recurring.valor,
        forma_pagamento: recurring.forma_pagamento,
        data_competencia: currentDate.toISOString().split('T')[0],
        data_vencimento: currentDate.toISOString().split('T')[0],
        status: 'pendente',
        recurring_id: recurring.id,
        observacoes: recurring.observacoes,
      });

      advanceDate(currentDate, recurring.frequencia);
    }

    if (transactions.length > 0) {
      const { error } = await supabase
        .from('mt_financial_transactions')
        .insert(transactions);
      if (error) throw error;

      await supabase
        .from('mt_financial_recurring')
        .update({
          total_gerados: transactions.length,
          next_due_date: endDate.toISOString().split('T')[0],
          ultimo_gerado_em: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', recurring.id);
    }

    toast.success(`${transactions.length} lançamento(s) gerado(s) automaticamente`);
    return transactions.length;
  }, []);

  const createRecurring = useCallback(async (data: FinancialRecurringCreate): Promise<FinancialRecurring> => {
    const { data: created, error } = await supabase
      .from('mt_financial_recurring')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-gerar TODAS as transações ao criar
    const rec = created as FinancialRecurring;
    await generateAllUpfront(rec);

    toast.success('Lançamento recorrente criado');
    await fetchRecurrings();
    return rec;
  }, [tenant?.id, franchise?.id, fetchRecurrings, generateAllUpfront]);

  const updateRecurring = useCallback(async (id: string, data: Partial<FinancialRecurringCreate> & { is_active?: boolean }) => {
    const { error } = await supabase
      .from('mt_financial_recurring')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Recorrente atualizado');
    await fetchRecurrings();
  }, [fetchRecurrings]);

  const deleteRecurring = useCallback(async (id: string) => {
    // Soft delete do recorrente
    const { error } = await supabase
      .from('mt_financial_recurring')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // Deletar transações pendentes geradas por este recorrente
    await supabase
      .from('mt_financial_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('recurring_id', id)
      .eq('status', 'pendente');

    toast.success('Recorrente removido e lançamentos pendentes cancelados');
    await fetchRecurrings();
  }, [fetchRecurrings]);

  /** Gera transações pendentes (para recorrentes com next_due_date <= target) */
  const generatePending = useCallback(async (targetDate?: string): Promise<number> => {
    const target = targetDate || new Date().toISOString().split('T')[0];

    let query = supabase
      .from('mt_financial_recurring')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .lte('next_due_date', target);

    if (tenant?.id) query = query.eq('tenant_id', tenant.id);

    const { data: pendentes, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const items = (pendentes || []) as FinancialRecurring[];
    let count = 0;

    for (const rec of items) {
      if (rec.data_fim && rec.next_due_date > rec.data_fim) continue;

      const { error: insertErr } = await supabase
        .from('mt_financial_transactions')
        .insert({
          tenant_id: rec.tenant_id,
          franchise_id: rec.franchise_id,
          category_id: rec.category_id,
          account_id: rec.account_id,
          tipo: rec.tipo,
          descricao: rec.descricao,
          valor: rec.valor,
          forma_pagamento: rec.forma_pagamento,
          data_competencia: rec.next_due_date,
          data_vencimento: rec.next_due_date,
          status: 'pendente',
          recurring_id: rec.id,
          observacoes: rec.observacoes,
        });

      if (insertErr) {
        console.error(`Erro ao gerar transação recorrente ${rec.descricao}:`, insertErr);
        continue;
      }

      const nextDate = new Date(rec.next_due_date + 'T00:00:00');
      advanceDate(nextDate, rec.frequencia);

      await supabase
        .from('mt_financial_recurring')
        .update({
          next_due_date: nextDate.toISOString().split('T')[0],
          total_gerados: (rec.total_gerados || 0) + 1,
          ultimo_gerado_em: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', rec.id);

      count++;
    }

    if (count > 0) {
      toast.success(`${count} lançamento(s) recorrente(s) gerado(s)`);
    } else {
      toast.info('Nenhum lançamento recorrente pendente');
    }

    await fetchRecurrings();
    return count;
  }, [tenant?.id, fetchRecurrings]);

  const generateForMonth = useCallback(async (yearMonth: string): Promise<number> => {
    const [year, month] = yearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const targetDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
    return generatePending(targetDate);
  }, [generatePending]);

  /** Regenera transações para um recorrente existente (ex: após editar) */
  const regenerateForRecurring = useCallback(async (id: string): Promise<number> => {
    // Remover transações pendentes antigas
    await supabase
      .from('mt_financial_transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('recurring_id', id)
      .eq('status', 'pendente');

    // Buscar recorrente atualizado
    const { data, error } = await supabase
      .from('mt_financial_recurring')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    const rec = data as FinancialRecurring;

    // Gerar novas transações
    const count = await generateAllUpfront(rec);
    await fetchRecurrings();
    return count;
  }, [generateAllUpfront, fetchRecurrings]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchRecurrings();
  }, [fetchRecurrings, tenant?.id, accessLevel]);

  return {
    recurrings,
    isLoading,
    refetch: fetchRecurrings,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    generatePending,
    generateForMonth,
    generateAllUpfront,
    regenerateForRecurring,
  };
}
