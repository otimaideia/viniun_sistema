// =============================================================================
// USE AGENDAMENTO METRICS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para métricas de agendamentos
// SISTEMA 100% MT - Usa mt_appointments diretamente
//
// =============================================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  addDays,
} from 'date-fns';

// =============================================================================
// Types
// =============================================================================

export interface AgendamentoMetrics {
  // Totais
  total: number;
  hoje: number;
  proximos7Dias: number;
  semana: number;
  mes: number;

  // Por status (geral)
  agendados: number;
  confirmados: number;
  realizados: number;
  cancelados: number;
  naoCompareceu: number;

  // Por status (hoje)
  hojeAgendados: number;
  hojeConfirmados: number;
  hojeRealizados: number;

  // Taxas
  taxaRealizacao: number;
  taxaComparecimento: number;
}

interface MTAppointment {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  data_agendamento: string;
  status: string;
}

// =============================================================================
// Query Key
// =============================================================================

const QUERY_KEY = 'mt-agendamento-metrics';

// =============================================================================
// Hook Principal
// =============================================================================

export function useAgendamentoMetricsAdapter(franqueadoId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ==========================================================================
  // Query: Buscar Agendamentos
  // ==========================================================================
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, franqueadoId, accessLevel],
    queryFn: async (): Promise<MTAppointment[]> => {
      let queryBuilder = supabase
        .from('mt_appointments')
        .select('id, tenant_id, franchise_id, data_agendamento, status');

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        queryBuilder = queryBuilder.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        queryBuilder = queryBuilder.eq('franchise_id', franchise.id);
      }
      // Platform admin vê todos

      // Filtrar por franqueado específico se fornecido
      if (franqueadoId) {
        queryBuilder = queryBuilder.eq('franchise_id', franqueadoId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[MT] Erro ao buscar agendamentos para métricas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Calcular Métricas
  // ==========================================================================
  const metrics = useMemo((): AgendamentoMetrics => {
    const agendamentos = query.data || [];
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const next7DaysEnd = addDays(today, 7);

    // Filtrar agendamentos por período
    const agendamentosHoje = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const agendamentosProximos7Dias = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: todayStart, end: next7DaysEnd });
    });

    const agendamentosSemana = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    const agendamentosMes = agendamentos.filter((a) => {
      const date = parseISO(a.data_agendamento);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Contagens por status (mapeando status MT para legado)
    const countByStatus = (list: MTAppointment[], status: string) => {
      // Mapeamento de status MT para legado
      const statusMap: Record<string, string[]> = {
        agendado: ['scheduled', 'pending', 'agendado'],
        confirmado: ['confirmed', 'confirmado'],
        realizado: ['completed', 'done', 'realizado'],
        cancelado: ['cancelled', 'canceled', 'cancelado'],
        nao_compareceu: ['no_show', 'nao_compareceu'],
      };
      const validStatuses = statusMap[status] || [status];
      return list.filter((a) => validStatuses.includes(a.status.toLowerCase())).length;
    };

    // Métricas
    return {
      // Totais
      total: agendamentos.length,
      hoje: agendamentosHoje.length,
      proximos7Dias: agendamentosProximos7Dias.length,
      semana: agendamentosSemana.length,
      mes: agendamentosMes.length,

      // Por status (geral)
      agendados: countByStatus(agendamentos, 'agendado'),
      confirmados: countByStatus(agendamentos, 'confirmado'),
      realizados: countByStatus(agendamentos, 'realizado'),
      cancelados: countByStatus(agendamentos, 'cancelado'),
      naoCompareceu: countByStatus(agendamentos, 'nao_compareceu'),

      // Por status (hoje)
      hojeAgendados: countByStatus(agendamentosHoje, 'agendado'),
      hojeConfirmados: countByStatus(agendamentosHoje, 'confirmado'),
      hojeRealizados: countByStatus(agendamentosHoje, 'realizado'),

      // Taxas
      taxaRealizacao:
        agendamentos.length > 0
          ? Math.round((countByStatus(agendamentos, 'realizado') / agendamentos.length) * 100)
          : 0,
      taxaComparecimento:
        agendamentos.length > 0
          ? Math.round(
              ((countByStatus(agendamentos, 'realizado') + countByStatus(agendamentos, 'confirmado')) /
                (agendamentos.length - countByStatus(agendamentos, 'agendado'))) *
                100
            ) || 0
          : 0,
    };
  }, [query.data]);

  return {
    metrics,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getAgendamentoMetricsMode(): 'mt' {
  return 'mt';
}

export default useAgendamentoMetricsAdapter;
