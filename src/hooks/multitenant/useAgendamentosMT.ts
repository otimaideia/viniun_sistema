import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logLeadActivity } from '@/utils/leadActivityLogger';
import type { AppointmentType, AgendamentoStatus } from '@/types/agendamento';

// =============================================================================
// TIPOS
// =============================================================================

export type { AppointmentType, AgendamentoStatus };

// Re-export para backward compat
export type AppointmentStatus = AgendamentoStatus;

export interface Appointment {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  lead_id?: string;

  // Tipo de agendamento
  tipo: AppointmentType;

  // Dados do cliente
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_email?: string;

  // Servico
  servico_id?: string;
  servico_nome?: string;
  valor?: number;

  // Profissional
  profissional_id?: string;
  profissional_nome?: string;

  // Data/Hora
  data_agendamento: string;
  hora_inicio: string;
  hora_fim?: string;
  duracao_minutos?: number;

  // Status
  status: AgendamentoStatus;
  confirmado: boolean;
  confirmado_em?: string;
  confirmado_via?: string;
  checkin_em?: string;
  checkout_em?: string;
  cancelado_em?: string;
  cancelado_por?: string;
  motivo_cancelamento?: string;

  // Observacoes
  observacoes?: string;
  observacoes_internas?: string;

  // Recorrencia / Plano de Tratamento
  is_recorrente: boolean;
  recorrencia_id?: string;
  recorrencia_config?: Record<string, unknown>;

  // Vinculo com Venda/Plano de Tratamento (procedimento_fechado)
  venda_id?: string;
  treatment_session_id?: string;

  // Cortesia
  cortesia_motivo?: string;
  cortesia_aprovada_por?: string;
  cortesia_aprovada_em?: string;

  // Origem
  origem?: string;
  external_id?: string;
  external_source?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;

  // Relacionamentos (joins)
  franchise?: {
    id: string;
    codigo: string;
    nome: string;
  };
  lead?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
  };
  venda?: {
    id: string;
    numero_venda: string;
    status: string;
  };
  treatment_session?: {
    id: string;
    numero_sessao: number;
    treatment_plan_id: string;
  };
  cortesia_aprovador?: {
    id: string;
    full_name: string;
  };
}

export interface AppointmentStats {
  total: number;
  pendentes: number;
  confirmados: number;
  em_atendimento: number;
  concluidos: number;
  cancelados: number;
  nao_compareceu: number;
  remarcados: number;
  valor_total: number;
  taxa_comparecimento: number;
  // Por tipo
  avaliacoes: number;
  procedimentos: number;
  cortesias: number;
  cortesias_pendentes: number;
}

// =============================================================================
// HOOK: useAgendamentosMT
// Gerencia agendamentos com suporte multi-tenant
// =============================================================================

interface UseAgendamentosMTOptions {
  franchiseId?: string;
  startDate?: string;
  endDate?: string;
  status?: AgendamentoStatus | AgendamentoStatus[];
  tipo?: AppointmentType;
  profissionalId?: string;
  cortesiaPendente?: boolean;
}

export function useAgendamentosMT(options: UseAgendamentosMTOptions = {}) {
  const { franchiseId, startDate, endDate, status, tipo, profissionalId, cortesiaPendente } = options;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { user: authUser } = useAuth();

  // Carregar agendamentos
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_appointments')
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome),
          lead:mt_leads(id, nome, telefone, email)
        `)
        .is('deleted_at', null)
        .order('data_agendamento', { ascending: true })
        .order('hora_inicio', { ascending: true });

      // Filtrar por tenant
      const tenantId = tenant?.id;
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Filtrar por franquia
      const currentFranchiseId = franchiseId || franchise?.id;
      if (currentFranchiseId && accessLevel === 'franchise') {
        query = query.eq('franchise_id', currentFranchiseId);
      }

      // Filtrar por data
      if (startDate) {
        query = query.gte('data_agendamento', startDate);
      }
      if (endDate) {
        query = query.lte('data_agendamento', endDate);
      }

      // Filtrar por status
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      // Filtrar por tipo
      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      // Filtrar por profissional
      if (profissionalId) {
        query = query.eq('profissional_id', profissionalId);
      }

      // Filtrar cortesias pendentes de aprovacao
      if (cortesiaPendente) {
        query = query
          .eq('tipo', 'cortesia')
          .eq('status', 'pendente')
          .is('cortesia_aprovada_por', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setAppointments((data || []) as Appointment[]);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar agendamentos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, franchiseId, accessLevel, startDate, endDate, status, tipo, profissionalId, cortesiaPendente]);

  // Verificar double-booking
  const checkDoubleBooking = useCallback(async (
    data_agendamento: string,
    hora_inicio: string,
    profissional_id: string,
    duracao_minutos: number = 60,
    excludeId?: string
  ): Promise<boolean> => {
    // Calcular hora_fim
    const [h, m] = hora_inicio.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + duracao_minutos;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const hora_fim = `${endH}:${endM}`;

    let query = supabase
      .from('mt_appointments')
      .select('id, hora_inicio, hora_fim, duracao_minutos, cliente_nome')
      .eq('data_agendamento', data_agendamento)
      .eq('profissional_id', profissional_id)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelado","remarcado")');

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existing } = await query;

    if (!existing || existing.length === 0) return false;

    // Checar sobreposicao de horarios
    for (const apt of existing) {
      const aptStart = apt.hora_inicio;
      const aptDuration = apt.duracao_minutos || 60;
      const [aH, aM] = aptStart.split(':').map(Number);
      const aptStartMin = aH * 60 + aM;
      const aptEndMin = aptStartMin + aptDuration;

      // Sobreposicao: novo inicio < existente fim E novo fim > existente inicio
      if (startMinutes < aptEndMin && endMinutes > aptStartMin) {
        return true; // Conflito encontrado
      }
    }

    return false;
  }, []);

  // Criar agendamento
  const createAppointment = useCallback(async (data: Partial<Appointment>): Promise<Appointment> => {
    const appointmentType = data.tipo || 'avaliacao';

    // Verificar double-booking se tem profissional
    if (data.profissional_id && data.data_agendamento && data.hora_inicio) {
      const hasConflict = await checkDoubleBooking(
        data.data_agendamento,
        data.hora_inicio,
        data.profissional_id,
        data.duracao_minutos || 60
      );
      if (hasConflict) {
        throw new Error('Conflito de horario: este profissional ja tem agendamento neste horario');
      }
    }

    // Cortesia: status inicial sempre pendente (aguardando aprovacao)
    const initialStatus = appointmentType === 'cortesia' ? 'pendente' : (data.status || 'pendente');

    const { data: created, error: createError } = await supabase
      .from('mt_appointments')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        lead_id: data.lead_id || null,
        tipo: appointmentType,
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone || null,
        cliente_email: data.cliente_email || null,
        servico_id: data.servico_id || null,
        servico_nome: data.servico_nome || null,
        valor: data.valor || null,
        profissional_id: data.profissional_id || null,
        profissional_nome: data.profissional_nome || null,
        data_agendamento: data.data_agendamento,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim || null,
        duracao_minutos: data.duracao_minutos || 60,
        status: initialStatus,
        confirmado: data.confirmado ?? false,
        observacoes: data.observacoes || null,
        observacoes_internas: data.observacoes_internas || null,
        is_recorrente: data.is_recorrente ?? false,
        recorrencia_config: data.recorrencia_config || null,
        origem: data.origem || 'painel',
        // Procedimento fechado
        venda_id: data.venda_id || null,
        treatment_session_id: data.treatment_session_id || null,
        // Cortesia
        cortesia_motivo: data.cortesia_motivo || null,
        // Consultora e sessão
        consultora_id: data.consultora_id || null,
        consultora_nome: data.consultora_nome || null,
        sessao_numero: data.sessao_numero || null,
        total_sessoes: data.total_sessoes || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Se procedimento_fechado com treatment_session_id, atualizar sessao para 'agendado'
    if (appointmentType === 'procedimento_fechado' && data.treatment_session_id) {
      await supabase
        .from('mt_treatment_sessions')
        .update({
          status: 'agendado',
          appointment_id: (created as Appointment).id,
          data_prevista: data.data_agendamento,
          hora_inicio: data.hora_inicio,
          hora_fim: data.hora_fim || null,
          profissional_id: data.profissional_id || null,
          profissional_nome: data.profissional_nome || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.treatment_session_id);
    }

    const apt = created as Appointment;

    // Log atividade no lead vinculado
    if (apt.lead_id && apt.tenant_id) {
      logLeadActivity({
        tenantId: apt.tenant_id,
        leadId: apt.lead_id,
        tipo: 'agendamento',
        titulo: 'Agendamento Criado',
        descricao: `Agendamento ${apt.tipo === 'cortesia' ? 'de cortesia ' : apt.tipo === 'procedimento_fechado' ? 'de procedimento ' : ''}criado para ${apt.data_agendamento} às ${apt.hora_inicio}${apt.servico_nome ? ` - ${apt.servico_nome}` : ''}${apt.profissional_nome ? ` com ${apt.profissional_nome}` : ''}`,
        dados: {
          appointment_id: apt.id,
          tipo: apt.tipo,
          data: apt.data_agendamento,
          hora: apt.hora_inicio,
          servico: apt.servico_nome,
          profissional: apt.profissional_nome,
          valor: apt.valor,
          status: apt.status,
        },
        userId: authUser?.id,
        userNome: authUser?.email || 'Sistema',
      });
    }

    await fetchAppointments();
    return apt;
  }, [fetchAppointments, tenant?.id, franchise?.id, checkDoubleBooking, authUser]);

  // Atualizar agendamento
  const updateAppointment = useCallback(async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Campos atualizaveis
    const fields = [
      'tipo', 'cliente_nome', 'cliente_telefone', 'cliente_email',
      'servico_id', 'servico_nome', 'valor',
      'profissional_id', 'profissional_nome',
      'consultora_id', 'consultora_nome',
      'sessao_numero', 'total_sessoes',
      'data_agendamento', 'hora_inicio', 'hora_fim', 'duracao_minutos',
      'observacoes', 'observacoes_internas',
      'venda_id', 'treatment_session_id',
      'cortesia_motivo',
    ] as const;

    for (const field of fields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Verificar double-booking se mudou data/hora/profissional
    if (data.profissional_id && data.data_agendamento && data.hora_inicio) {
      const hasConflict = await checkDoubleBooking(
        data.data_agendamento,
        data.hora_inicio,
        data.profissional_id,
        data.duracao_minutos || 60,
        id // excluir o proprio agendamento
      );
      if (hasConflict) {
        throw new Error('Conflito de horario: este profissional ja tem agendamento neste horario');
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchAppointments();
    return updated as Appointment;
  }, [fetchAppointments, checkDoubleBooking]);

  // Atualizar status
  const updateStatus = useCallback(async (id: string, newStatus: AgendamentoStatus, extras?: {
    motivo_cancelamento?: string;
    cancelado_por?: string;
  }): Promise<Appointment> => {
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    switch (newStatus) {
      case 'confirmado':
        updateData.confirmado = true;
        updateData.confirmado_em = new Date().toISOString();
        updateData.confirmado_via = 'painel';
        break;
      case 'em_atendimento':
        updateData.checkin_em = new Date().toISOString();
        break;
      case 'concluido':
        updateData.checkout_em = new Date().toISOString();
        break;
      case 'cancelado':
        updateData.cancelado_em = new Date().toISOString();
        if (extras?.motivo_cancelamento) {
          updateData.motivo_cancelamento = extras.motivo_cancelamento;
        }
        if (extras?.cancelado_por) {
          updateData.cancelado_por = extras.cancelado_por;
        }
        break;
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const apt = updated as Appointment;

    // Se concluiu agendamento de plano de tratamento, atualizar sessao e plano
    if (newStatus === 'concluido' && apt.treatment_session_id) {
      try {
        // Marcar sessao como concluida (usa FK direto em vez de parsear JSONB)
        await supabase
          .from('mt_treatment_sessions')
          .update({
            status: 'concluido',
            data_realizada: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', apt.treatment_session_id);

        // Buscar plano para atualizar contadores
        const { data: session } = await supabase
          .from('mt_treatment_sessions')
          .select('treatment_plan_id')
          .eq('id', apt.treatment_session_id)
          .single();

        if (session?.treatment_plan_id) {
          const { data: plan } = await supabase
            .from('mt_treatment_plans')
            .select('sessoes_concluidas, total_sessoes, proxima_sessao_numero')
            .eq('id', session.treatment_plan_id)
            .single();

          if (plan) {
            const newConcluidas = (plan.sessoes_concluidas || 0) + 1;
            const planUpdate: Record<string, unknown> = {
              sessoes_concluidas: newConcluidas,
              proxima_sessao_numero: (plan.proxima_sessao_numero || 1) + 1,
              updated_at: new Date().toISOString(),
            };

            if (newConcluidas >= plan.total_sessoes) {
              planUpdate.status = 'concluido';
              planUpdate.concluido_em = new Date().toISOString();
            }

            await supabase
              .from('mt_treatment_plans')
              .update(planUpdate)
              .eq('id', session.treatment_plan_id);
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar plano de tratamento:', err);
      }
    }
    // Fallback: compatibilidade com recorrencia_config antigo
    else if (newStatus === 'concluido' && apt.recorrencia_id && apt.is_recorrente && !apt.treatment_session_id) {
      try {
        const config = apt.recorrencia_config as Record<string, unknown> | null;
        const treatmentSessionId = config?.treatment_session_id as string | undefined;

        if (treatmentSessionId) {
          await supabase
            .from('mt_treatment_sessions')
            .update({
              status: 'concluido',
              data_realizada: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            })
            .eq('id', treatmentSessionId);

          const { data: plan } = await supabase
            .from('mt_treatment_plans')
            .select('sessoes_concluidas, total_sessoes, proxima_sessao_numero')
            .eq('id', apt.recorrencia_id)
            .single();

          if (plan) {
            const newConcluidas = (plan.sessoes_concluidas || 0) + 1;
            const planUpdate: Record<string, unknown> = {
              sessoes_concluidas: newConcluidas,
              proxima_sessao_numero: (plan.proxima_sessao_numero || 1) + 1,
              updated_at: new Date().toISOString(),
            };

            if (newConcluidas >= plan.total_sessoes) {
              planUpdate.status = 'concluido';
              planUpdate.concluido_em = new Date().toISOString();
            }

            await supabase
              .from('mt_treatment_plans')
              .update(planUpdate)
              .eq('id', apt.recorrencia_id);
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar plano de tratamento (legacy):', err);
      }
    }

    // =========================================================================
    // AUTOMAÇÃO PÓS-CHECKOUT: Auditoria + NPS
    // =========================================================================
    if (newStatus === 'concluido' && apt.lead_id && apt.tenant_id) {
      // --- Melhoria 1: Auto-criar Auditoria (2ª+ sessão) ---
      if (apt.sessao_numero && apt.sessao_numero >= 2) {
        try {
          const { data: audConfig } = await supabase
            .from('mt_auditoria_config' as any)
            .select('sessao_minima, auto_create')
            .eq('tenant_id', apt.tenant_id)
            .maybeSingle();

          const sessaoMinima = audConfig?.sessao_minima ?? 2;
          const autoCreate = audConfig?.auto_create ?? true;

          if (autoCreate && apt.sessao_numero >= sessaoMinima) {
            // Verificar se já existe auditoria para este lead + appointment
            const { data: existing } = await supabase
              .from('mt_auditorias' as any)
              .select('id')
              .eq('lead_id', apt.lead_id)
              .eq('appointment_id', id)
              .maybeSingle();

            if (!existing) {
              await supabase.from('mt_auditorias' as any).insert({
                tenant_id: apt.tenant_id,
                franchise_id: apt.franchise_id,
                lead_id: apt.lead_id,
                appointment_id: id,
                treatment_plan_id: apt.treatment_session_id ? undefined : undefined,
                status: 'pendente',
                tipo: 'upsell',
                sessao_numero: apt.sessao_numero,
                total_sessoes: apt.total_sessoes,
                servico_atual: apt.servico_nome,
              });
              console.log(`[Auditoria] Auto-criada para lead ${apt.lead_id}, sessão ${apt.sessao_numero}`);
            }
          }
        } catch (err) {
          console.error('Erro ao auto-criar auditoria:', err);
        }
      }

      // --- Melhoria 2: Criar registros NPS pendentes ---
      try {
        const { isNotificationEnabled } = await import('./useAppointmentNotificationsMT');

        const googleEnabled = await isNotificationEnabled(supabase, apt.tenant_id, 'pos_google_review', apt.franchise_id);
        const npsEnabled = await isNotificationEnabled(supabase, apt.tenant_id, 'pos_nps', apt.franchise_id);

        if (googleEnabled) {
          await supabase.from('mt_appointment_notifications' as any).insert({
            tenant_id: apt.tenant_id,
            franchise_id: apt.franchise_id,
            appointment_id: id,
            notification_type: 'pos_google_review',
            channel: 'whatsapp',
            status: 'pendente',
          });
        }

        if (npsEnabled) {
          // Gerar token único para o NPS público
          const npsToken = crypto.randomUUID();
          await supabase.from('mt_nps_responses' as any).insert({
            tenant_id: apt.tenant_id,
            franchise_id: apt.franchise_id,
            appointment_id: id,
            lead_id: apt.lead_id,
            token: npsToken,
            status: 'pendente',
          });

          await supabase.from('mt_appointment_notifications' as any).insert({
            tenant_id: apt.tenant_id,
            franchise_id: apt.franchise_id,
            appointment_id: id,
            notification_type: 'pos_nps',
            channel: 'whatsapp',
            status: 'pendente',
            metadata: { nps_token: npsToken },
          });
        }
      } catch (err) {
        console.error('Erro ao criar registros NPS:', err);
      }
    }

    // Log atividade no lead vinculado (cobre: confirmar, checkin, checkout, cancelar, nao_compareceu)
    if (apt.lead_id && apt.tenant_id) {
      const statusLabels: Record<string, string> = {
        confirmado: 'Agendamento Confirmado',
        em_atendimento: 'Check-in Realizado',
        concluido: 'Atendimento Concluído',
        cancelado: 'Agendamento Cancelado',
        nao_compareceu: 'Não Compareceu',
        remarcado: 'Agendamento Remarcado',
        pendente: 'Agendamento Pendente',
        agendado: 'Agendamento Confirmado',
      };
      const descParts = [`${statusLabels[newStatus] || `Status: ${newStatus}`} - ${apt.data_agendamento} às ${apt.hora_inicio}`];
      if (apt.servico_nome) descParts.push(apt.servico_nome);
      if (newStatus === 'cancelado' && extras?.motivo_cancelamento) descParts.push(`Motivo: ${extras.motivo_cancelamento}`);

      logLeadActivity({
        tenantId: apt.tenant_id,
        leadId: apt.lead_id,
        tipo: 'agendamento',
        titulo: statusLabels[newStatus] || 'Agendamento Atualizado',
        descricao: descParts.join(' | '),
        dados: {
          appointment_id: id,
          status_novo: newStatus,
          data: apt.data_agendamento,
          hora: apt.hora_inicio,
          servico: apt.servico_nome,
          motivo_cancelamento: extras?.motivo_cancelamento,
        },
        userId: authUser?.id,
        userNome: authUser?.email || 'Sistema',
      });
    }

    await fetchAppointments();
    return apt;
  }, [fetchAppointments, authUser]);

  // Soft delete agendamento
  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('mt_appointments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchAppointments();
  }, [fetchAppointments]);

  // Aprovar cortesia
  const approveCortesia = useCallback(async (
    id: string,
    aprovadoPor: string,
    aprovadorNome?: string
  ): Promise<Appointment> => {
    const { data: updated, error: updateError } = await supabase
      .from('mt_appointments')
      .update({
        status: 'agendado',
        cortesia_aprovada_por: aprovadoPor,
        cortesia_aprovada_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tipo', 'cortesia')
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchAppointments();
    return updated as Appointment;
  }, [fetchAppointments]);

  // Rejeitar cortesia
  const rejectCortesia = useCallback(async (
    id: string,
    motivo?: string,
    rejeitadoPor?: string
  ): Promise<Appointment> => {
    return updateStatus(id, 'cancelado', {
      motivo_cancelamento: motivo || 'Cortesia nao aprovada',
      cancelado_por: rejeitadoPor,
    });
  }, [updateStatus]);

  // Confirmar agendamento
  const confirmAppointment = useCallback(async (id: string, via: string = 'painel'): Promise<Appointment> => {
    const { data: updated, error } = await supabase
      .from('mt_appointments')
      .update({
        confirmado: true,
        confirmado_em: new Date().toISOString(),
        confirmado_via: via,
        status: 'confirmado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchAppointments();
    return updated as Appointment;
  }, [fetchAppointments]);

  // Cancelar agendamento
  const cancelAppointment = useCallback(async (
    id: string,
    motivo?: string,
    canceladoPor?: string
  ): Promise<Appointment> => {
    return updateStatus(id, 'cancelado', {
      motivo_cancelamento: motivo,
      cancelado_por: canceladoPor,
    });
  }, [updateStatus]);

  // Check-in
  const checkIn = useCallback(async (id: string): Promise<Appointment> => {
    return updateStatus(id, 'em_atendimento');
  }, [updateStatus]);

  // Check-out
  const checkOut = useCallback(async (id: string): Promise<Appointment> => {
    return updateStatus(id, 'concluido');
  }, [updateStatus]);

  // Marcar como nao compareceu
  const markAsNoShow = useCallback(async (id: string): Promise<Appointment> => {
    return updateStatus(id, 'nao_compareceu');
  }, [updateStatus]);

  // Remarcar
  const reschedule = useCallback(async (
    id: string,
    novaData: string,
    novaHora: string,
    novaHoraFim?: string
  ): Promise<Appointment> => {
    // Marcar atual como remarcado
    await supabase
      .from('mt_appointments')
      .update({
        status: 'remarcado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Buscar dados do agendamento original
    const { data: original } = await supabase
      .from('mt_appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (!original) throw new Error('Agendamento original nao encontrado');

    // Criar novo agendamento com os mesmos dados
    const { data: novo, error: createError } = await supabase
      .from('mt_appointments')
      .insert({
        ...original,
        id: undefined,
        data_agendamento: novaData,
        hora_inicio: novaHora,
        hora_fim: novaHoraFim || null,
        status: 'agendado',
        confirmado: false,
        confirmado_em: null,
        confirmado_via: null,
        checkin_em: null,
        checkout_em: null,
        cancelado_em: null,
        cancelado_por: null,
        motivo_cancelamento: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        observacoes_internas: `Remarcado do agendamento ${id}`,
      })
      .select()
      .single();

    if (createError) throw createError;

    const novoApt = novo as Appointment;

    // Log atividade no lead vinculado
    if (original.lead_id && original.tenant_id) {
      logLeadActivity({
        tenantId: original.tenant_id,
        leadId: original.lead_id,
        tipo: 'agendamento',
        titulo: 'Agendamento Remarcado',
        descricao: `Agendamento remarcado de ${original.data_agendamento} ${original.hora_inicio} para ${novaData} ${novaHora}${original.servico_nome ? ` - ${original.servico_nome}` : ''}`,
        dados: {
          appointment_id_antigo: id,
          appointment_id_novo: novoApt.id,
          data_anterior: original.data_agendamento,
          hora_anterior: original.hora_inicio,
          data_nova: novaData,
          hora_nova: novaHora,
          servico: original.servico_nome,
        },
        userId: authUser?.id,
        userNome: authUser?.email || 'Sistema',
      });
    }

    await fetchAppointments();
    return novoApt;
  }, [fetchAppointments, authUser]);

  // Carregar ao montar
  useEffect(() => {
    if (tenant?.id) {
      fetchAppointments();
    } else {
      setIsLoading(false);
      setAppointments([]);
    }
  }, [fetchAppointments, tenant?.id]);

  // Calcular estatisticas
  const stats: AppointmentStats = {
    total: appointments.length,
    pendentes: appointments.filter(a => a.status === 'pendente').length,
    confirmados: appointments.filter(a => a.status === 'confirmado').length,
    em_atendimento: appointments.filter(a => a.status === 'em_atendimento').length,
    concluidos: appointments.filter(a => a.status === 'concluido').length,
    cancelados: appointments.filter(a => a.status === 'cancelado').length,
    nao_compareceu: appointments.filter(a => a.status === 'nao_compareceu').length,
    remarcados: appointments.filter(a => a.status === 'remarcado').length,
    valor_total: appointments
      .filter(a => a.status === 'concluido')
      .reduce((acc, a) => acc + (a.valor || 0), 0),
    taxa_comparecimento: appointments.length > 0
      ? (appointments.filter(a => ['concluido', 'em_atendimento'].includes(a.status)).length /
         appointments.filter(a => !['pendente', 'remarcado'].includes(a.status)).length) * 100 || 0
      : 0,
    // Por tipo
    avaliacoes: appointments.filter(a => a.tipo === 'avaliacao').length,
    procedimentos: appointments.filter(a => a.tipo === 'procedimento_fechado').length,
    cortesias: appointments.filter(a => a.tipo === 'cortesia').length,
    cortesias_pendentes: appointments.filter(a => a.tipo === 'cortesia' && a.status === 'pendente' && !a.cortesia_aprovada_por).length,
  };

  // Agrupar por dia (para calendario)
  const appointmentsByDay = appointments.reduce((acc, apt) => {
    const date = apt.data_agendamento;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  return {
    appointments,
    appointmentsByDay,
    stats,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    updateStatus,
    deleteAppointment,
    confirmAppointment,
    cancelAppointment,
    checkIn,
    checkOut,
    markAsNoShow,
    reschedule,
    approveCortesia,
    rejectCortesia,
    checkDoubleBooking,
    refetch: fetchAppointments,
  };
}

// =============================================================================
// HOOK: useAgendamentoMT (singular)
// Carrega um agendamento especifico por ID
// =============================================================================

export function useAgendamentoMT(appointmentId: string | undefined) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) {
      setAppointment(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_appointments')
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome),
          lead:mt_leads(id, nome, telefone, email),
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .eq('id', appointmentId)
        .is('deleted_at', null)
        .single();

      if (fetchError) throw fetchError;

      setAppointment(data as Appointment);
    } catch (err) {
      console.error('Erro ao carregar agendamento:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar agendamento'));
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  return { appointment, isLoading, error, refetch: fetchAppointment };
}

// =============================================================================
// HOOK: useDisponibilidade
// Verifica horarios disponiveis para agendamento
// =============================================================================

interface TimeSlot {
  hora: string;
  disponivel: boolean;
}

export function useDisponibilidade(
  franchiseId: string | undefined,
  date: string | undefined,
  profissionalId?: string,
  horarioFuncionamento?: Record<string, { abre: string; fecha: string } | null> | null
) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!franchiseId || !date) {
      setSlots([]);
      return;
    }

    setIsLoading(true);

    try {
      // Determinar horário de abertura/fechamento baseado no dia da semana
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const dayName = dayNames[dayOfWeek];
      const daySchedule = horarioFuncionamento?.[dayName];

      // Se dia está fechado (null), retornar vazio
      if (horarioFuncionamento && daySchedule === null) {
        setSlots([]);
        setIsLoading(false);
        return;
      }

      const openHour = daySchedule ? parseInt(daySchedule.abre.split(':')[0]) : 8;
      const openMinute = daySchedule ? parseInt(daySchedule.abre.split(':')[1]) : 0;
      const closeHour = daySchedule ? parseInt(daySchedule.fecha.split(':')[0]) : 20;
      const closeMinute = daySchedule ? parseInt(daySchedule.fecha.split(':')[1]) : 0;

      // Gerar slots de 30 em 30 minutos no horário de funcionamento
      const allSlots: TimeSlot[] = [];
      let currentMinutes = openHour * 60 + openMinute;
      const endMinutes = closeHour * 60 + closeMinute;

      while (currentMinutes < endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        allSlots.push({ hora: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, disponivel: true });
        currentMinutes += 30;
      }

      // Buscar agendamentos do dia (excluir deletados e cancelados)
      let query = supabase
        .from('mt_appointments')
        .select('hora_inicio, hora_fim, duracao_minutos')
        .eq('franchise_id', franchiseId)
        .eq('data_agendamento', date)
        .is('deleted_at', null)
        .not('status', 'in', '("cancelado","remarcado")');

      if (profissionalId) {
        query = query.eq('profissional_id', profissionalId);
      }

      const { data: existingAppointments } = await query;

      // Marcar slots ocupados
      existingAppointments?.forEach(apt => {
        const startHour = parseInt(apt.hora_inicio.split(':')[0]);
        const startMinute = parseInt(apt.hora_inicio.split(':')[1]);
        const duration = apt.duracao_minutos || 60;

        let currentMinutes = startHour * 60 + startMinute;
        const endMinutes = currentMinutes + duration;

        while (currentMinutes < endMinutes) {
          const slotHour = Math.floor(currentMinutes / 60);
          const slotMinute = currentMinutes % 60;
          const slotTime = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;

          const slotIndex = allSlots.findIndex(s => s.hora === slotTime);
          if (slotIndex >= 0) {
            allSlots[slotIndex].disponivel = false;
          }

          currentMinutes += 30;
        }
      });

      setSlots(allSlots);
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err);
    } finally {
      setIsLoading(false);
    }
  }, [franchiseId, date, profissionalId, horarioFuncionamento]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, isLoading, refetch: fetchSlots };
}

export default useAgendamentosMT;
