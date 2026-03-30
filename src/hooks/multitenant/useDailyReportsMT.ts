import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// TIPOS
// =============================================================================

export interface DailyReportMetrics {
  // Agendamentos
  agendados: number;
  confirmados: number;
  comparecidos: number; // checkin_em != null
  atendidos: number;    // checkout_em != null (concluido)
  nao_compareceu: number;
  cancelados: number;
  remarcados: number;

  // Por tipo
  por_tipo: {
    avaliacao: { agendados: number; comparecidos: number; atendidos: number };
    procedimento_fechado: { agendados: number; comparecidos: number; atendidos: number };
    cortesia: { agendados: number; comparecidos: number; atendidos: number };
  };

  // Auditorias
  auditorias: {
    agendadas: number;
    realizadas: number;
    convertidas: number;
  };

  // Vendas
  vendas: {
    total: number;
    receita: number;
  };

  // NPS
  nps_medio: number | null;
  nps_respostas: number;

  // Funil
  funnel: FunnelStep[];

  // Per-professional breakdown
  por_profissional: ProfissionalMetrics[];

  // Per-consultora breakdown
  por_consultora: ConsultoraMetrics[];

  // Leads do dia
  leads: {
    total: number;
    novos: number;
    items: any[];
  };
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

export interface ProfissionalMetrics {
  id: string;
  nome: string;
  atendimentos: number;
  agendados: number;
  comparecidos: number;
  taxa_ocupacao: number;
  nps_medio: number | null;
}

export interface ConsultoraMetrics {
  id: string;
  nome: string;
  agendamentos: number;
  vendas: number;
  receita: number;
  conversao: number; // %
}

// =============================================================================
// HOOK: useDailyReportsMT
// Computa metricas diarias a partir de dados vivos
// =============================================================================

export function useDailyReportsMT(date: string, franchiseId?: string) {
  const [metrics, setMetrics] = useState<DailyReportMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchMetrics = useCallback(async () => {
    if (!date) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);

    try {
      const effectiveFranchiseId = franchiseId || (accessLevel === 'franchise' ? franchise?.id : undefined);

      // -----------------------------------------------------------------------
      // 1. AGENDAMENTOS do dia
      // -----------------------------------------------------------------------
      let aptQuery = supabase
        .from('mt_appointments')
        .select('*')
        .eq('data_agendamento', date)
        .is('deleted_at', null);

      if (tenant?.id) aptQuery = aptQuery.eq('tenant_id', tenant.id);
      if (effectiveFranchiseId) aptQuery = aptQuery.eq('franchise_id', effectiveFranchiseId);

      const { data: appointmentsRaw } = await aptQuery;
      const appointments = (appointmentsRaw || []) as any[];

      const agendados = appointments.length;
      const confirmados = appointments.filter(a => a.confirmado || a.status === 'confirmado').length;
      const comparecidos = appointments.filter(a => a.checkin_em != null).length;
      const atendidos = appointments.filter(a => a.status === 'concluido' || a.checkout_em != null).length;
      const nao_compareceu = appointments.filter(a => a.status === 'nao_compareceu').length;
      const cancelados = appointments.filter(a => a.status === 'cancelado').length;
      const remarcados = appointments.filter(a => a.status === 'remarcado').length;

      // Por tipo
      const tipos = ['avaliacao', 'procedimento_fechado', 'cortesia'] as const;
      const por_tipo: any = {};
      for (const tipo of tipos) {
        const tipoApts = appointments.filter(a => a.tipo === tipo);
        por_tipo[tipo] = {
          agendados: tipoApts.length,
          comparecidos: tipoApts.filter(a => a.checkin_em != null).length,
          atendidos: tipoApts.filter(a => a.status === 'concluido' || a.checkout_em != null).length,
        };
      }

      // -----------------------------------------------------------------------
      // 2. AUDITORIAS (appointments tipo avaliacao with outcome)
      // -----------------------------------------------------------------------
      const avaliacoes = appointments.filter(a => a.tipo === 'avaliacao');
      const auditorias = {
        agendadas: avaliacoes.length,
        realizadas: avaliacoes.filter(a => a.status === 'concluido' || a.checkout_em != null).length,
        convertidas: 0,
      };

      // Check if any avaliacao lead to a sale (same lead, same day or after)
      if (avaliacoes.length > 0) {
        const leadIds = avaliacoes
          .filter(a => a.lead_id && (a.status === 'concluido' || a.checkout_em != null))
          .map(a => a.lead_id);

        if (leadIds.length > 0) {
          let salesConvQuery = supabase
            .from('mt_sales' as any)
            .select('id, lead_id')
            .in('lead_id', leadIds)
            .gte('created_at', `${date}T00:00:00`)
            .lte('created_at', `${date}T23:59:59`)
            .is('deleted_at', null);

          const { data: convSales } = await salesConvQuery;
          const convertedLeadIds = new Set((convSales || []).map((s: any) => s.lead_id));
          auditorias.convertidas = convertedLeadIds.size;
        }
      }

      // -----------------------------------------------------------------------
      // 3. VENDAS do dia
      // -----------------------------------------------------------------------
      let salesQuery = supabase
        .from('mt_sales' as any)
        .select('id, valor_total, profissional_id, lead_id, created_by')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .is('deleted_at', null)
        .not('status', 'eq', 'cancelada');

      if (tenant?.id) salesQuery = salesQuery.eq('tenant_id', tenant.id);
      if (effectiveFranchiseId) salesQuery = salesQuery.eq('franchise_id', effectiveFranchiseId);

      const { data: salesData } = await salesQuery;
      const sales = (salesData || []) as any[];
      const vendasTotal = sales.length;
      const vendasReceita = sales.reduce((sum, s) => sum + (s.valor_total || 0), 0);

      // -----------------------------------------------------------------------
      // 4. NPS do dia
      // -----------------------------------------------------------------------
      let nps_medio: number | null = null;
      let nps_respostas = 0;

      try {
        let npsQuery = supabase
          .from('mt_nps_responses' as any)
          .select('nps_score')
          .gte('created_at', `${date}T00:00:00`)
          .lte('created_at', `${date}T23:59:59`);

        if (tenant?.id) npsQuery = npsQuery.eq('tenant_id', tenant.id);
        if (effectiveFranchiseId) npsQuery = npsQuery.eq('franchise_id', effectiveFranchiseId);

        const { data: npsData } = await npsQuery;
        const npsResponses = (npsData || []) as any[];
        nps_respostas = npsResponses.length;
        if (npsResponses.length > 0) {
          nps_medio = Math.round(
            npsResponses.reduce((sum, r) => sum + (r.nps_score || 0), 0) / npsResponses.length * 10
          ) / 10;
        }
      } catch {
        // Table may not exist yet
      }

      // -----------------------------------------------------------------------
      // 6. POR PROFISSIONAL
      // -----------------------------------------------------------------------
      const profMap = new Map<string, ProfissionalMetrics>();
      for (const apt of appointments) {
        if (!apt.profissional_id) continue;
        let prof = profMap.get(apt.profissional_id);
        if (!prof) {
          prof = {
            id: apt.profissional_id,
            nome: apt.profissional_nome || 'Sem nome',
            atendimentos: 0,
            agendados: 0,
            comparecidos: 0,
            taxa_ocupacao: 0,
            nps_medio: null,
          };
          profMap.set(apt.profissional_id, prof);
        }
        prof.agendados++;
        if (apt.checkin_em) prof.comparecidos++;
        if (apt.status === 'concluido' || apt.checkout_em) prof.atendimentos++;
      }

      const por_profissional = Array.from(profMap.values()).map(p => ({
        ...p,
        taxa_ocupacao: p.agendados > 0 ? Math.round(p.atendimentos / p.agendados * 100) : 0,
      }));

      // -----------------------------------------------------------------------
      // 7. POR CONSULTORA
      // -----------------------------------------------------------------------
      const consultMap = new Map<string, ConsultoraMetrics>();

      // Count appointments created by consultora
      for (const apt of appointments) {
        const cId = apt.consultora_id || apt.created_by;
        const cNome = apt.consultora_nome || 'Sem consultora';
        if (!cId) continue;
        let c = consultMap.get(cId);
        if (!c) {
          c = { id: cId, nome: cNome, agendamentos: 0, vendas: 0, receita: 0, conversao: 0 };
          consultMap.set(cId, c);
        }
        c.agendamentos++;
      }

      // Count sales by creator (created_by)
      for (const sale of sales) {
        const cId = sale.created_by;
        if (!cId) continue;
        let c = consultMap.get(cId);
        if (!c) {
          c = { id: cId, nome: 'Consultora', agendamentos: 0, vendas: 0, receita: 0, conversao: 0 };
          consultMap.set(cId, c);
        }
        c.vendas++;
        c.receita += sale.valor_total || 0;
      }

      const por_consultora = Array.from(consultMap.values()).map(c => ({
        ...c,
        conversao: c.agendamentos > 0 ? Math.round(c.vendas / c.agendamentos * 100) : 0,
      }));

      // -----------------------------------------------------------------------
      // 8. LEADS do dia
      // -----------------------------------------------------------------------
      let leadsQuery = supabase
        .from('mt_leads')
        .select('id, nome, telefone, email, canal_entrada, origem, status, servico_interesse, created_at')
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenant?.id) leadsQuery = leadsQuery.eq('tenant_id', tenant.id);
      if (effectiveFranchiseId) leadsQuery = leadsQuery.eq('franchise_id', effectiveFranchiseId);

      const { data: leadsData } = await leadsQuery;
      const leadsItems = (leadsData || []) as any[];
      const leadsNovos = leadsItems.filter(l => l.status === 'novo').length;

      // -----------------------------------------------------------------------
      // 9. FUNIL (após leads para ter leadsItems disponível)
      // -----------------------------------------------------------------------
      const funnelBase = leadsItems.length || agendados || 1;
      const funnel: FunnelStep[] = [
        { step: 'Leads', count: leadsItems.length, percentage: 100 },
        { step: 'Agendados', count: agendados, percentage: Math.round(agendados / funnelBase * 100) },
        { step: 'Confirmados', count: confirmados, percentage: Math.round(confirmados / funnelBase * 100) },
        { step: 'Compareceram', count: comparecidos, percentage: Math.round(comparecidos / funnelBase * 100) },
        { step: 'Atendidos', count: atendidos, percentage: Math.round(atendidos / funnelBase * 100) },
        { step: 'Vendas', count: vendasTotal, percentage: Math.round(vendasTotal / funnelBase * 100) },
      ];

      // -----------------------------------------------------------------------
      // RESULTADO FINAL
      // -----------------------------------------------------------------------
      setMetrics({
        agendados,
        confirmados,
        comparecidos,
        atendidos,
        nao_compareceu,
        cancelados,
        remarcados,
        por_tipo,
        auditorias,
        vendas: { total: vendasTotal, receita: vendasReceita },
        nps_medio,
        nps_respostas,
        funnel,
        por_profissional,
        por_consultora,
        leads: {
          total: leadsItems.length,
          novos: leadsNovos,
          items: leadsItems,
        },
      });
    } catch (err) {
      console.error('Erro ao calcular relatório diário:', err);
      setError(err instanceof Error ? err : new Error('Erro ao calcular relatório'));
    } finally {
      setIsLoading(false);
    }
  }, [date, franchiseId, tenant?.id, franchise?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id && date) {
      fetchMetrics();
    } else {
      setIsLoading(false);
    }
  }, [fetchMetrics, tenant?.id, date]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}

export default useDailyReportsMT;
