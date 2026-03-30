import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { Appointment } from '@/hooks/multitenant/useAgendamentosMT';

// =============================================================================
// TIPOS
// =============================================================================

export interface QueueAppointment extends Appointment {
  // Joined lead data
  lead?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
    data_nascimento?: string;
    instagram_id?: string;
    redes_sociais?: Record<string, string>;
    temperatura?: string;
    origem?: string;
  };
  // Treatment session info
  treatment_session?: {
    id: string;
    numero_sessao: number;
    total_sessoes?: number;
    servico_nome?: string;
    status?: string;
    treatment_plan_id?: string;
  };
}

export interface QueueStats {
  total: number;
  aguardando: number;
  em_atendimento: number;
  concluidos: number;
}

// =============================================================================
// HOOK: useTabletQueueMT
// Fetches today's appointments for the logged-in professional
// =============================================================================

export function useTabletQueueMT() {
  const { tenant, franchise, user, isLoading: isTenantLoading } = useTenantContext();

  // Get today's date in local timezone (Brazil UTC-3)
  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  // Fetch today's appointments for current professional
  const query = useQuery({
    queryKey: ['mt-tablet-queue', user?.id, today, tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuario nao carregado');

      let q = (supabase
        .from('mt_appointments') as any)
        .select(`
          *,
          lead:mt_leads(
            id, nome, telefone, email, data_nascimento,
            instagram_id, temperatura, origem
          ),
          treatment_session:mt_treatment_sessions!mt_appointments_treatment_session_id_fkey(
            id, numero_sessao, status, treatment_plan_id,
            profissional_nome, data_prevista
          ),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('data_agendamento', today)
        .eq('profissional_id', user.id)
        .is('deleted_at', null)
        .not('status', 'in', '("cancelado","remarcado")')
        .order('hora_inicio', { ascending: true });

      // Tenant filter
      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as QueueAppointment[];
    },
    enabled: !isTenantLoading && !!user?.id,
    refetchInterval: 30000, // Refetch every 30s for real-time feel
  });

  // Real-time subscription for appointment changes
  useEffect(() => {
    if (!user?.id || !tenant?.id) return;

    const channel = supabase
      .channel('tablet-queue-realtime')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'mt_appointments',
          filter: `profissional_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any change to this professional's appointments
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, tenant?.id]);

  // Calculate stats
  const appointments = query.data || [];
  const stats: QueueStats = {
    total: appointments.length,
    aguardando: appointments.filter(a =>
      ['pendente', 'agendado', 'confirmado'].includes(a.status)
    ).length,
    em_atendimento: appointments.filter(a => a.status === 'em_atendimento').length,
    concluidos: appointments.filter(a => a.status === 'concluido').length,
  };

  return {
    appointments,
    stats,
    today,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    profissionalNome: user?.nome || '',
    franchiseNome: franchise?.nome || '',
  };
}

export default useTabletQueueMT;
