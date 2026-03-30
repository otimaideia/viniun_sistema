import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  TreatmentPlan, TreatmentPlanCreate, TreatmentPlanUpdate, TreatmentPlanFilters,
  TreatmentSession, TreatmentSessionSchedule, TreatmentDashboardMetrics,
  RecurrenceType,
} from '@/types/treatment-plan';

// =============================================================================
// UTILS: Cálculo de próxima sessão
// =============================================================================

function calculateNextSessionDate(
  lastDate: Date,
  recorrenciaTipo: RecurrenceType,
  intervaloDias: number,
  diaPreferencial?: number | null,
): Date {
  const next = new Date(lastDate);

  switch (recorrenciaTipo) {
    case 'mensal':
      next.setMonth(next.getMonth() + 1);
      if (diaPreferencial) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(diaPreferencial, maxDay));
      }
      break;
    case 'quinzenal':
      next.setDate(next.getDate() + 14);
      break;
    case 'semanal':
      next.setDate(next.getDate() + 7);
      break;
    case 'custom':
      next.setDate(next.getDate() + (intervaloDias || 30));
      break;
  }

  return next;
}

// =============================================================================
// HOOK: useTreatmentPlansMT
// Lista e CRUD de planos de tratamento
// =============================================================================

export function useTreatmentPlansMT(filters?: TreatmentPlanFilters) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_treatment_plans')
        .select(`
          *,
          service:mt_services(id, nome, duracao_minutos),
          sale:mt_sales(id, numero_venda, status)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.service_id) query = query.eq('service_id', filters.service_id);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);
      if (filters?.pagamento_em_dia !== undefined) query = query.eq('pagamento_em_dia', filters.pagamento_em_dia);
      if (filters?.search) query = query.ilike('cliente_nome', `%${filters.search}%`);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setPlans((data || []) as TreatmentPlan[]);
    } catch (err) {
      console.error('Erro ao carregar planos de tratamento:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar planos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.status, filters?.service_id, filters?.franchise_id, filters?.pagamento_em_dia, filters?.search]);

  const createPlan = useCallback(async (data: TreatmentPlanCreate): Promise<TreatmentPlan> => {
    const { data: created, error: createError } = await supabase
      .from('mt_treatment_plans')
      .insert({
        tenant_id: tenant?.id,
        ...data,
      })
      .select()
      .single();

    if (createError) throw createError;
    const plan = created as TreatmentPlan;

    // Criar sessões pendentes
    const sessions = [];
    let prevDate = new Date();

    for (let i = 1; i <= data.total_sessoes; i++) {
      const dataPrevista = i === 1
        ? (data.data_proximo_pagamento ? new Date(data.data_proximo_pagamento) : new Date())
        : calculateNextSessionDate(prevDate, data.recorrencia_tipo || 'mensal', data.recorrencia_intervalo_dias || 30, data.dia_preferencial);

      sessions.push({
        tenant_id: tenant?.id,
        treatment_plan_id: plan.id,
        numero_sessao: i,
        data_prevista: dataPrevista.toISOString().split('T')[0],
        status: 'pendente',
        profissional_id: data.profissional_preferencial_id || null,
      });

      prevDate = dataPrevista;
    }

    if (sessions.length > 0) {
      const { error: sessionsError } = await supabase
        .from('mt_treatment_sessions')
        .insert(sessions);

      if (sessionsError) console.error('Erro ao criar sessões:', sessionsError);
    }

    toast.success('Plano de tratamento criado');
    await fetchPlans();
    return plan;
  }, [tenant?.id, fetchPlans]);

  const updatePlan = useCallback(async (data: TreatmentPlanUpdate): Promise<TreatmentPlan> => {
    const { id, ...updates } = data;
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Adicionar timestamps de status
    if (updates.status === 'pausado') {
      updateData.pausado_em = new Date().toISOString();
    } else if (updates.status === 'cancelado') {
      updateData.cancelado_em = new Date().toISOString();
    } else if (updates.status === 'concluido') {
      updateData.concluido_em = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_treatment_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    toast.success('Plano atualizado');
    await fetchPlans();
    return updated as TreatmentPlan;
  }, [fetchPlans]);

  const pausePlan = useCallback(async (id: string, motivo?: string) => {
    return updatePlan({ id, status: 'pausado', pausado_motivo: motivo });
  }, [updatePlan]);

  const resumePlan = useCallback(async (id: string) => {
    return updatePlan({ id, status: 'ativo' });
  }, [updatePlan]);

  const cancelPlan = useCallback(async (id: string, motivo?: string) => {
    return updatePlan({ id, status: 'cancelado', cancelado_motivo: motivo });
  }, [updatePlan]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchPlans();
  }, [fetchPlans, tenant?.id, accessLevel]);

  return {
    plans, isLoading, error,
    refetch: fetchPlans,
    createPlan, updatePlan, pausePlan, resumePlan, cancelPlan,
  };
}

// =============================================================================
// HOOK: useTreatmentPlanMT (singular)
// Detalhe de um plano com sessões
// =============================================================================

export function useTreatmentPlanMT(planId?: string) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [sessions, setSessions] = useState<TreatmentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!planId) { setPlan(null); setSessions([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [planRes, sessionsRes] = await Promise.all([
        supabase
          .from('mt_treatment_plans')
          .select('*, service:mt_services(id, nome, duracao_minutos), sale:mt_sales(id, numero_venda, status)')
          .eq('id', planId)
          .single(),
        supabase
          .from('mt_treatment_sessions')
          .select('*')
          .eq('treatment_plan_id', planId)
          .order('numero_sessao', { ascending: true }),
      ]);

      if (planRes.error) throw planRes.error;
      setPlan(planRes.data as TreatmentPlan);
      setSessions((sessionsRes.data || []) as TreatmentSession[]);
    } catch (err) {
      console.error('Erro ao carregar plano:', err);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  return { plan, sessions, isLoading, refetch: fetchPlan };
}

// =============================================================================
// HOOK: useTreatmentSessionsMT
// Gerencia sessões de um plano (agendar, completar, reagendar)
// =============================================================================

export function useTreatmentSessionsMT(planId?: string) {
  const { tenant, franchise } = useTenantContext();

  // Agendar sessão → cria agendamento
  const scheduleSession = useCallback(async (data: TreatmentSessionSchedule): Promise<void> => {
    // 1. Verificar inadimplência
    const { data: plan } = await supabase
      .from('mt_treatment_plans')
      .select('pagamento_em_dia, bloquear_se_inadimplente, service_id, cliente_nome, cliente_telefone, lead_id, franchise_id')
      .eq('id', planId!)
      .single();

    if (plan?.bloquear_se_inadimplente && !plan?.pagamento_em_dia) {
      throw new Error('Cliente inadimplente - agendamento bloqueado');
    }

    // 2. Buscar duração do serviço
    const { data: service } = await supabase
      .from('mt_services')
      .select('nome, duracao_minutos')
      .eq('id', plan?.service_id)
      .single();

    const duracaoMinutos = service?.duracao_minutos || 60;
    const horaFim = data.hora_fim || calcularHoraFim(data.hora_inicio, duracaoMinutos);

    // 3. Criar agendamento
    const { data: appointment, error: aptError } = await supabase
      .from('mt_appointments')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: plan?.franchise_id || franchise?.id,
        lead_id: plan?.lead_id,
        cliente_nome: plan?.cliente_nome || '',
        cliente_telefone: plan?.cliente_telefone,
        servico_id: plan?.service_id,
        servico_nome: service?.nome,
        profissional_id: data.profissional_id,
        profissional_nome: data.profissional_nome,
        data_agendamento: data.data_agendamento,
        hora_inicio: data.hora_inicio,
        hora_fim: horaFim,
        duracao_minutos: duracaoMinutos,
        status: 'pendente',
        is_recorrente: true,
        recorrencia_id: planId,
        recorrencia_config: {
          treatment_session_id: data.treatment_session_id,
        },
        origem: 'tratamento',
      })
      .select()
      .single();

    if (aptError) throw aptError;

    // 4. Atualizar sessão do tratamento
    const { error: sessionError } = await supabase
      .from('mt_treatment_sessions')
      .update({
        appointment_id: appointment.id,
        profissional_id: data.profissional_id,
        profissional_nome: data.profissional_nome,
        data_prevista: data.data_agendamento,
        hora_inicio: data.hora_inicio,
        hora_fim: horaFim,
        status: 'agendado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.treatment_session_id);

    if (sessionError) throw sessionError;

    toast.success('Sessão agendada com sucesso');
  }, [planId, tenant?.id, franchise?.id]);

  // Completar sessão (chamado pelo checkOut do agendamento)
  const completeSession = useCallback(async (treatmentSessionId: string): Promise<void> => {
    // Atualizar sessão
    const { error: sessionError } = await supabase
      .from('mt_treatment_sessions')
      .update({
        status: 'concluido',
        data_realizada: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', treatmentSessionId);

    if (sessionError) throw sessionError;

    // Atualizar contadores do plano
    if (planId) {
      const { data: currentPlan } = await supabase
        .from('mt_treatment_plans')
        .select('sessoes_concluidas, total_sessoes, proxima_sessao_numero')
        .eq('id', planId)
        .single();

      if (currentPlan) {
        const newConcluidas = (currentPlan.sessoes_concluidas || 0) + 1;
        const updateData: Record<string, unknown> = {
          sessoes_concluidas: newConcluidas,
          proxima_sessao_numero: (currentPlan.proxima_sessao_numero || 1) + 1,
          updated_at: new Date().toISOString(),
        };

        // Se todas concluídas, marcar plano como concluído
        if (newConcluidas >= currentPlan.total_sessoes) {
          updateData.status = 'concluido';
          updateData.concluido_em = new Date().toISOString();
        }

        await supabase
          .from('mt_treatment_plans')
          .update(updateData)
          .eq('id', planId);
      }

      // Auto-criar comissão de produtividade
      try {
        const { data: sessionData } = await supabase
          .from('mt_treatment_sessions')
          .select('profissional_id, numero_sessao')
          .eq('id', treatmentSessionId)
          .single();

        if (sessionData?.profissional_id) {
          const { data: planData } = await supabase
            .from('mt_treatment_plans')
            .select('sale_id, sale_item_id, franchise_id, tenant_id')
            .eq('id', planId)
            .single();

          if (planData?.sale_item_id) {
            const { data: saleItem } = await supabase
              .from('mt_sale_items')
              .select('preco_unitario')
              .eq('id', planData.sale_item_id)
              .single();

            if (saleItem) {
              // Buscar regras de comissão
              const { data: commRules } = await supabase
                .from('mt_commission_rules')
                .select('percentual_produtividade')
                .eq('tenant_id', planData.tenant_id)
                .eq('franchise_id', planData.franchise_id)
                .eq('is_active', true)
                .maybeSingle();

              const pct = commRules?.percentual_produtividade || 10;
              const valor = saleItem.preco_unitario * (pct / 100);

              if (valor > 0) {
                await supabase.from('mt_commissions').insert({
                  tenant_id: planData.tenant_id,
                  franchise_id: planData.franchise_id,
                  profissional_id: sessionData.profissional_id,
                  sale_id: planData.sale_id,
                  sale_item_id: planData.sale_item_id,
                  treatment_plan_id: planId,
                  treatment_session_id: treatmentSessionId,
                  numero_sessao: sessionData.numero_sessao || null,
                  categoria: 'produtividade',
                  tipo: 'percentual',
                  percentual: pct,
                  valor: Math.round(valor * 100) / 100,
                  valor_base_calculo: saleItem.preco_unitario,
                  data_referencia: new Date().toISOString().split('T')[0],
                  commission_role: 'aplicadora',
                  status: 'pendente',
                  observacoes: `Produtividade ${pct}% sessão ${sessionData.numero_sessao || '-'}`,
                });
              }
            }
          }
        }
      } catch (commErr) {
        console.error('Erro ao criar comissão de produtividade (não bloqueante):', commErr);
      }
    }
  }, [planId]);

  // Reagendar sessão
  const rescheduleSession = useCallback(async (
    sessionId: string,
    newDate: string,
    newTime: string,
    profissionalId?: string,
    profissionalNome?: string,
  ): Promise<void> => {
    const { data: session } = await supabase
      .from('mt_treatment_sessions')
      .select('appointment_id')
      .eq('id', sessionId)
      .single();

    // Atualizar agendamento se existir
    if (session?.appointment_id) {
      await supabase
        .from('mt_appointments')
        .update({
          data_agendamento: newDate,
          hora_inicio: newTime,
          status: 'pendente',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.appointment_id);
    }

    // Atualizar sessão
    const updates: Record<string, unknown> = {
      data_prevista: newDate,
      hora_inicio: newTime,
      status: 'agendado',
      updated_at: new Date().toISOString(),
    };

    if (profissionalId) updates.profissional_id = profissionalId;
    if (profissionalNome) updates.profissional_nome = profissionalNome;

    await supabase
      .from('mt_treatment_sessions')
      .update(updates)
      .eq('id', sessionId);

    toast.success('Sessão reagendada');
  }, []);

  // Cancelar sessão
  const cancelSession = useCallback(async (sessionId: string): Promise<void> => {
    const { data: session } = await supabase
      .from('mt_treatment_sessions')
      .select('appointment_id, treatment_plan_id')
      .eq('id', sessionId)
      .single();

    // Cancelar agendamento se existir
    if (session?.appointment_id) {
      await supabase
        .from('mt_appointments')
        .update({ status: 'cancelado', cancelado_em: new Date().toISOString() })
        .eq('id', session.appointment_id);
    }

    // Atualizar sessão
    await supabase
      .from('mt_treatment_sessions')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Incrementar contador de canceladas no plano
    if (session?.treatment_plan_id) {
      const { data: plan } = await supabase
        .from('mt_treatment_plans')
        .select('sessoes_canceladas')
        .eq('id', session.treatment_plan_id)
        .single();

      await supabase
        .from('mt_treatment_plans')
        .update({
          sessoes_canceladas: (plan?.sessoes_canceladas || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.treatment_plan_id);
    }

    toast.success('Sessão cancelada');
  }, []);

  return { scheduleSession, completeSession, rescheduleSession, cancelSession };
}

// =============================================================================
// HOOK: useTreatmentDashboardMT
// KPIs de tratamentos
// =============================================================================

export function useTreatmentDashboardMT() {
  const [metrics, setMetrics] = useState<TreatmentDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_treatment_plans')
        .select('status, total_sessoes, sessoes_concluidas, pagamento_em_dia')
        .is('deleted_at', null);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data: plans } = await query;
      const allPlans = (plans || []) as any[];

      // Sessões pendentes da semana
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      let sessionsQuery = supabase
        .from('mt_treatment_sessions')
        .select('status, data_prevista')
        .eq('status', 'pendente')
        .gte('data_prevista', now.toISOString().split('T')[0])
        .lte('data_prevista', endOfWeek.toISOString().split('T')[0]);

      if (tenant?.id) sessionsQuery = sessionsQuery.eq('tenant_id', tenant.id);

      const { data: weekSessions } = await sessionsQuery;

      // Sessões atrasadas
      let overdueQuery = supabase
        .from('mt_treatment_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .lt('data_prevista', now.toISOString().split('T')[0]);

      if (tenant?.id) overdueQuery = overdueQuery.eq('tenant_id', tenant.id);

      const { count: overdue } = await overdueQuery;

      const ativos = allPlans.filter(p => p.status === 'ativo');
      const totalSessoes = ativos.reduce((sum: number, p: any) => sum + (p.total_sessoes || 0), 0);
      const concluidas = ativos.reduce((sum: number, p: any) => sum + (p.sessoes_concluidas || 0), 0);

      setMetrics({
        planos_ativos: ativos.length,
        planos_concluidos: allPlans.filter(p => p.status === 'concluido').length,
        planos_pausados: allPlans.filter(p => p.status === 'pausado').length,
        sessoes_pendentes_semana: (weekSessions || []).length,
        sessoes_atrasadas: overdue || 0,
        taxa_conclusao: totalSessoes > 0 ? (concluidas / totalSessoes) * 100 : 0,
        inadimplentes: allPlans.filter(p => p.status === 'ativo' && !p.pagamento_em_dia).length,
        media_progresso: ativos.length > 0
          ? ativos.reduce((sum: number, p: any) => sum + ((p.sessoes_concluidas || 0) / (p.total_sessoes || 1)) * 100, 0) / ativos.length
          : 0,
      });
    } catch (err) {
      console.error('Erro ao carregar métricas de tratamentos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchMetrics();
  }, [fetchMetrics, tenant?.id, accessLevel]);

  return { metrics, isLoading, refetch: fetchMetrics };
}

// =============================================================================
// UTIL: Calcular hora fim
// =============================================================================

function calcularHoraFim(horaInicio: string, duracaoMinutos: number): string {
  const [h, m] = horaInicio.split(':').map(Number);
  const totalMinutos = h * 60 + m + duracaoMinutos;
  const hFim = Math.floor(totalMinutos / 60);
  const mFim = totalMinutos % 60;
  return `${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`;
}
