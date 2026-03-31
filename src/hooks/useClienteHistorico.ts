import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// Tenant Detection for Public Portal (same pattern as useClienteAuth.ts)
// =============================================================================

function getCurrentTenantSlug(): string {
  const hostname = window.location.hostname;
  const isDev = ['localhost', '127.0.0.1', '192.168.'].some(d => hostname.includes(d));

  if (!isDev) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const sub = parts[0].toLowerCase();
      if (sub !== 'www') return sub;
      if (parts.length >= 4) return parts[1].toLowerCase();
    }
  } else {
    const param = new URLSearchParams(window.location.search).get('tenant');
    if (param) return param.toLowerCase();
  }

  return 'viniun';
}

async function resolveTenantId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (data) return (data as { id: string }).id;

  const hostname = window.location.hostname;
  const { data: domainData } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('dominio_customizado', hostname)
    .eq('is_active', true)
    .maybeSingle();

  if (domainData) return (domainData as { id: string }).id;

  if (hostname.includes('viniun')) {
    const { data: viniunTenant } = await supabase
      .from('mt_tenants')
      .select('id')
      .eq('slug', 'viniun')
      .eq('is_active', true)
      .maybeSingle();
    if (viniunTenant) return (viniunTenant as { id: string }).id;
  }

  return null;
}

interface TreatmentSession {
  id: string;
  numero_sessao: number;
  status: string;
  data_prevista: string | null;
  data_realizada: string | null;
  profissional_nome: string | null;
  observacoes: string | null;
}

interface TreatmentPlan {
  id: string;
  servico_nome: string;
  total_sessoes: number;
  sessoes_concluidas: number;
  proxima_sessao_numero: number;
  status: string;
  created_at: string;
  sessions: TreatmentSession[];
}

interface PresencaRecord {
  id: string;
  data: string;
  tipo: 'presenca' | 'falta' | 'cancelado';
  servico?: string;
  unidade_nome?: string;
}

interface ClienteHistoricoData {
  // Planos de tratamento
  treatmentPlans: TreatmentPlan[];
  totalPlans: number;
  activePlans: number;
  totalSessoesRestantes: number;

  // Presença
  presencas: PresencaRecord[];
  totalPresencas: number;
  totalFaltas: number;
  totalCancelados: number;
  taxaPresenca: number;

  // Cortesias
  cortesias: any[];
  totalCortesias: number;

  // Loading
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export function useClienteHistorico(leadId: string | null): ClienteHistoricoData {
  // Buscar planos de tratamento
  const {
    data: treatmentPlans = [],
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['cliente-treatment-plans', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      // Resolve tenant for defense-in-depth filtering
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      let query = supabase
        .from('mt_treatment_plans')
        .select(`
          id, servico_nome, total_sessoes, sessoes_concluidas,
          proxima_sessao_numero, status, created_at,
          sessions:mt_treatment_sessions(
            id, numero_sessao, status, data_prevista,
            data_realizada, profissional_nome, observacoes
          )
        `)
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as TreatmentPlan[];
    },
    enabled: !!leadId,
  });

  // Buscar todos os agendamentos para montar presença
  const {
    data: allAppointments = [],
    isLoading: isLoadingAppts,
    error: apptsError,
    refetch: refetchAppts,
  } = useQuery({
    queryKey: ['cliente-all-appointments', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      // Resolve tenant for defense-in-depth filtering
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      let query = supabase
        .from('mt_appointments')
        .select(`
          id, data_agendamento, hora_inicio, status, tipo,
          servico_nome, cliente_nome,
          unidade:mt_franchises(nome_fantasia, cidade)
        `)
        .eq('lead_id', leadId)
        .order('data_agendamento', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });

  // Processar presença a partir dos agendamentos
  const presencas: PresencaRecord[] = allAppointments.map(a => {
    let tipo: PresencaRecord['tipo'] = 'presenca';
    if (a.status === 'nao_compareceu') tipo = 'falta';
    else if (a.status === 'cancelado') tipo = 'cancelado';
    else if (!['concluido', 'realizado', 'em_atendimento', 'confirmado'].includes(a.status || '')) {
      // Agendamentos futuros ou pendentes não contam como presença/falta
      return null as any;
    }

    return {
      id: a.id,
      data: a.data_agendamento,
      tipo,
      servico: a.servico_nome || undefined,
      unidade_nome: (a.unidade as any)?.nome_fantasia || undefined,
    };
  }).filter(Boolean);

  // Cortesias
  const cortesias = allAppointments.filter(a => a.tipo === 'cortesia');

  // Métricas
  const totalPresencas = presencas.filter(p => p.tipo === 'presenca').length;
  const totalFaltas = presencas.filter(p => p.tipo === 'falta').length;
  const totalCancelados = presencas.filter(p => p.tipo === 'cancelado').length;
  const totalComparecimentos = totalPresencas + totalFaltas;
  const taxaPresenca = totalComparecimentos > 0 ? Math.round((totalPresencas / totalComparecimentos) * 100) : 100;

  const activePlans = treatmentPlans.filter(p => p.status === 'ativo' || p.status === 'em_andamento').length;
  const totalSessoesRestantes = treatmentPlans
    .filter(p => p.status !== 'concluido' && p.status !== 'cancelado')
    .reduce((sum, p) => sum + (p.total_sessoes - p.sessoes_concluidas), 0);

  const refetch = () => {
    refetchPlans();
    refetchAppts();
  };

  return {
    treatmentPlans,
    totalPlans: treatmentPlans.length,
    activePlans,
    totalSessoesRestantes,
    presencas,
    totalPresencas,
    totalFaltas,
    totalCancelados,
    taxaPresenca,
    cortesias,
    totalCortesias: cortesias.length,
    isLoading: isLoadingPlans || isLoadingAppts,
    error: plansError || apptsError,
    refetch,
  };
}
