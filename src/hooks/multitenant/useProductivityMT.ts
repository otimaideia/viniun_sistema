import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { ProductivityDaily, ProductivityMonthly, ProductivityStatus } from '@/types/produtividade';

// =============================================================================
// HOOK: useProductivityDailyMT
// =============================================================================

export function useProductivityDailyMT(userId?: string, yearMonth?: string) {
  const [dailyRecords, setDailyRecords] = useState<ProductivityDaily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchDaily = useCallback(async () => {
    if (!userId || !yearMonth) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const from = `${yearMonth}-01`;
      const to = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      let query = supabase
        .from('mt_productivity_daily')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('data', from)
        .lte('data', to)
        .order('data', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setDailyRecords((data || []) as ProductivityDaily[]);
    } catch (err) {
      console.error('Erro ao carregar produtividade diária:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, yearMonth, tenant?.id]);

  /**
   * Generates daily productivity records by crossing:
   * 1. Attendance (present days) from mt_professional_attendance
   * 2. Commissions from mt_commissions (grouped by date)
   * 3. Daily minimum from mt_payroll_employees
   *
   * Formula: valor_pago = presente ? MAX(diaria_minima, total_comissoes) : 0
   */
  const generateProductivity = useCallback(async (
    targetUserId: string,
    targetYearMonth: string
  ): Promise<number> => {
    if (!tenant?.id) throw new Error('Tenant não definido');

    const [year, month] = targetYearMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const from = `${targetYearMonth}-01`;
    const to = `${targetYearMonth}-${String(lastDay).padStart(2, '0')}`;

    // 1. Get attendance records (present days)
    const { data: attendanceData } = await supabase
      .from('mt_professional_attendance')
      .select('data, status')
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenant.id)
      .gte('data', from)
      .lte('data', to);

    const attendanceMap = new Map<string, string>();
    (attendanceData || []).forEach((a: any) => {
      attendanceMap.set(a.data, a.status);
    });

    // 2. Get commissions for the period
    const { data: commissionsData } = await supabase
      .from('mt_commissions')
      .select('valor, data_referencia, created_at')
      .eq('profissional_id', targetUserId)
      .eq('tenant_id', tenant.id)
      .in('status', ['aprovado', 'pago']);

    // Group commissions by date
    const commissionsByDate = new Map<string, number>();
    const commissionCountByDate = new Map<string, number>();
    (commissionsData || []).forEach((c: any) => {
      // Use data_referencia if available, otherwise extract date from created_at
      const date = c.data_referencia || c.created_at?.split('T')[0];
      if (date && date >= from && date <= to) {
        commissionsByDate.set(date, (commissionsByDate.get(date) || 0) + (c.valor || 0));
        commissionCountByDate.set(date, (commissionCountByDate.get(date) || 0) + 1);
      }
    });

    // 3. Get daily minimum from payroll employee
    const { data: empData } = await supabase
      .from('mt_payroll_employees')
      .select('salario_base, tipo_salario')
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .single();

    const diariaMinima = empData?.tipo_salario === 'diaria' ? (empData?.salario_base || 100) : 100;

    // 4. Generate daily records
    const records: Array<{
      tenant_id: string;
      franchise_id: string | undefined;
      user_id: string;
      data: string;
      presente: boolean;
      diaria_minima: number;
      total_comissoes: number;
      total_servicos: number;
      valor_pago: number;
      tipo_pagamento: string;
    }> = [];

    let count = 0;

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendanceStatus = attendanceMap.get(dateStr);
      const presente = attendanceStatus === 'presente';
      const comissoes = commissionsByDate.get(dateStr) || 0;
      const servicos = commissionCountByDate.get(dateStr) || 0;

      let valorPago = 0;
      let tipoPagamento = 'ausente';

      if (presente) {
        if (comissoes > diariaMinima) {
          valorPago = comissoes;
          tipoPagamento = 'comissao';
        } else {
          valorPago = diariaMinima;
          tipoPagamento = 'diaria';
        }
        count++;
      }

      // Only create records for days that have attendance or commissions
      if (attendanceStatus || comissoes > 0) {
        records.push({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          user_id: targetUserId,
          data: dateStr,
          presente,
          diaria_minima: diariaMinima,
          total_comissoes: comissoes,
          total_servicos: servicos,
          valor_pago: valorPago,
          tipo_pagamento: tipoPagamento,
        });
      }
    }

    if (records.length > 0) {
      const { error } = await supabase
        .from('mt_productivity_daily')
        .upsert(records, { onConflict: 'tenant_id,user_id,data' });

      if (error) throw error;
    }

    toast.success(`Produtividade calculada: ${count} dias trabalhados`);
    await fetchDaily();
    return count;
  }, [tenant?.id, franchise?.id, fetchDaily]);

  const updateDaily = useCallback(async (id: string, data: { observacoes?: string }) => {
    const { error } = await supabase
      .from('mt_productivity_daily')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchDaily();
  }, [fetchDaily]);

  useEffect(() => {
    if (userId && yearMonth && (tenant?.id || accessLevel === 'platform')) fetchDaily();
  }, [fetchDaily, userId, yearMonth, tenant?.id, accessLevel]);

  return {
    dailyRecords,
    isLoading,
    refetch: fetchDaily,
    generateProductivity,
    updateDaily,
  };
}

// =============================================================================
// HOOK: useProductivityMonthlyMT
// =============================================================================

export function useProductivityMonthlyMT(filters?: { competencia?: string; userId?: string; status?: ProductivityStatus }) {
  const [monthlySummaries, setMonthlySummaries] = useState<ProductivityMonthly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchMonthly = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_productivity_monthly')
        .select('*, user:mt_users(id, nome, cargo)')
        .is('deleted_at', null)
        .order('competencia', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.competencia) query = query.eq('competencia', filters.competencia);
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      setMonthlySummaries((data || []) as ProductivityMonthly[]);
    } catch (err) {
      console.error('Erro ao carregar resumos mensais:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.competencia, filters?.userId, filters?.status]);

  const generateMonthlySummary = useCallback(async (
    targetUserId: string,
    targetCompetencia: string
  ): Promise<ProductivityMonthly> => {
    if (!tenant?.id) throw new Error('Tenant não definido');

    const [year, month] = targetCompetencia.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const from = `${targetCompetencia}-01`;
    const to = `${targetCompetencia}-${String(lastDay).padStart(2, '0')}`;

    // Get daily records
    const { data: dailyData } = await supabase
      .from('mt_productivity_daily')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null)
      .gte('data', from)
      .lte('data', to);

    const daily = (dailyData || []) as ProductivityDaily[];

    let diasTrabalhados = 0;
    let diasDiaria = 0;
    let diasComissao = 0;
    let totalDiarias = 0;
    let totalComissoes = 0;
    let totalPago = 0;
    let diariaMinima = 100;

    for (const d of daily) {
      if (d.presente) {
        diasTrabalhados++;
        diariaMinima = d.diaria_minima;
        if (d.tipo_pagamento === 'comissao') {
          diasComissao++;
          totalComissoes += d.total_comissoes;
        } else {
          diasDiaria++;
          totalDiarias += d.diaria_minima;
        }
        totalPago += d.valor_pago;
      }
    }

    const record = {
      tenant_id: tenant.id,
      franchise_id: franchise?.id,
      user_id: targetUserId,
      competencia: targetCompetencia,
      dias_trabalhados: diasTrabalhados,
      dias_diaria: diasDiaria,
      dias_comissao: diasComissao,
      total_diarias: totalDiarias,
      total_comissoes: totalComissoes,
      total_pago: totalPago,
      diaria_minima_usada: diariaMinima,
      status: 'aberto' as const,
    };

    const { data: created, error } = await supabase
      .from('mt_productivity_monthly')
      .upsert(record, { onConflict: 'tenant_id,user_id,competencia' })
      .select('*, user:mt_users(id, nome, cargo)')
      .single();

    if (error) throw error;
    toast.success(`Resumo gerado: ${diasTrabalhados} dias, R$ ${totalPago.toFixed(2)}`);
    await fetchMonthly();
    return created as ProductivityMonthly;
  }, [tenant?.id, franchise?.id, fetchMonthly]);

  const closeMonth = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_productivity_monthly')
      .update({
        status: 'fechado',
        fechado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    toast.success('Mês fechado');
    await fetchMonthly();
  }, [fetchMonthly]);

  const markAsPaid = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_productivity_monthly')
      .update({
        status: 'pago',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    toast.success('Marcado como pago');
    await fetchMonthly();
  }, [fetchMonthly]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchMonthly();
  }, [fetchMonthly, tenant?.id, accessLevel]);

  return {
    monthlySummaries,
    isLoading,
    refetch: fetchMonthly,
    generateMonthlySummary,
    closeMonth,
    markAsPaid,
  };
}

// =============================================================================
// HOOK: useProductivityProfessionalsMT
// =============================================================================

export function useProductivityProfessionalsMT(filter: 'mei' | 'clt' | 'all' = 'mei') {
  const [professionals, setProfessionals] = useState<Array<{
    id: string;
    user_id: string;
    nome: string;
    cargo: string;
    salario_base: number;
    tipo_salario: string;
    tipo_contratacao: string;
    comissao_valor: number;
    jornada_semanal: number;
    horario_entrada: string;
    horario_saida: string;
    user_nome?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchProfessionals = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_payroll_employees')
        .select('id, user_id, nome, cargo, salario_base, tipo_salario, tipo_contratacao, comissao_valor, jornada_semanal, horario_entrada, horario_saida')
        .is('deleted_at', null)
        .eq('is_active', true)
        .not('user_id', 'is', null)
        .order('nome', { ascending: true });

      // Filtro por tipo
      if (filter === 'mei') {
        query = query.in('tipo_salario', ['diaria', 'comissao']);
      } else if (filter === 'clt') {
        query = query.eq('tipo_contratacao', 'clt');
      }
      // 'all' = sem filtro de tipo

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setProfessionals((data || []) as any[]);
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filter]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchProfessionals();
  }, [fetchProfessionals, tenant?.id, accessLevel]);

  return { professionals, isLoading, refetch: fetchProfessionals };
}
