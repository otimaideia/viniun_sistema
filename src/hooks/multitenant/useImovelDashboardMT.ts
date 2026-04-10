// =============================================================================
// USE IMOVEL DASHBOARD MT - Hook Multi-Tenant para Dashboard de Imóveis
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ImovelDashboardData {
  totalImoveis: number;
  disponiveis: number;
  vendidos: number;
  alugados: number;
  porTipo: { tipo: string; count: number }[];
  porSituacao: { situacao: string; count: number }[];
  consultasRecentes: number;
  viewsRecentes: number;
  recentInquiries: {
    id: string;
    nome: string;
    tipo: string;
    created_at: string;
    property_titulo: string;
  }[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-imoveis-dashboard';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useImovelDashboardMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id],
    queryFn: async (): Promise<ImovelDashboardData> => {
      const tenantFilter = accessLevel !== 'platform' && tenant ? { tenant_id: tenant.id } : {};
      const franchiseFilter = accessLevel === 'franchise' && franchise ? { franchise_id: franchise.id } : {};

      // -----------------------------------------------------------------------
      // Total por situação
      // -----------------------------------------------------------------------

      let qProps = supabase
        .from('mt_properties')
        .select('situacao')
        .is('deleted_at', null);

      if (tenantFilter.tenant_id) qProps = qProps.eq('tenant_id', tenantFilter.tenant_id);
      if (franchiseFilter.franchise_id) qProps = qProps.eq('franchise_id', franchiseFilter.franchise_id);

      const { data: props } = await qProps;

      const totalImoveis = props?.length || 0;
      const disponiveis = props?.filter((p) => p.situacao === 'disponivel').length || 0;
      const vendidos = props?.filter((p) => p.situacao === 'vendido').length || 0;
      const alugados = props?.filter((p) => p.situacao === 'alugado').length || 0;

      // Agrupar por situação
      const situacaoMap = new Map<string, number>();
      props?.forEach((p) => {
        const sit = p.situacao || 'indefinido';
        situacaoMap.set(sit, (situacaoMap.get(sit) || 0) + 1);
      });
      const porSituacao = Array.from(situacaoMap.entries()).map(([situacao, count]) => ({ situacao, count }));

      // -----------------------------------------------------------------------
      // Total por tipo
      // -----------------------------------------------------------------------

      let qType = supabase
        .from('mt_properties')
        .select('property_type_id, mt_property_types(nome)')
        .is('deleted_at', null);

      if (tenantFilter.tenant_id) qType = qType.eq('tenant_id', tenantFilter.tenant_id);
      if (franchiseFilter.franchise_id) qType = qType.eq('franchise_id', franchiseFilter.franchise_id);

      const { data: byType } = await qType;

      const typeMap = new Map<string, number>();
      byType?.forEach((p: any) => {
        const nome = p.mt_property_types?.nome || 'Sem tipo';
        typeMap.set(nome, (typeMap.get(nome) || 0) + 1);
      });
      const porTipo = Array.from(typeMap.entries()).map(([tipo, count]) => ({ tipo, count }));

      // -----------------------------------------------------------------------
      // Consultas últimos 30 dias
      // -----------------------------------------------------------------------

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      let qInquiries = supabase
        .from('mt_property_inquiries')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo)
        .is('deleted_at', null);

      if (tenantFilter.tenant_id) qInquiries = qInquiries.eq('tenant_id', tenantFilter.tenant_id);
      if (franchiseFilter.franchise_id) qInquiries = qInquiries.eq('franchise_id', franchiseFilter.franchise_id);

      const { count: consultasRecentes } = await qInquiries;

      // -----------------------------------------------------------------------
      // Views últimos 30 dias
      // -----------------------------------------------------------------------

      let qViews = supabase
        .from('mt_property_views')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', thirtyDaysAgo);

      if (tenantFilter.tenant_id) qViews = qViews.eq('tenant_id', tenantFilter.tenant_id);

      const { count: viewsRecentes } = await qViews;

      // -----------------------------------------------------------------------
      // Últimas 10 consultas
      // -----------------------------------------------------------------------

      let qRecent = supabase
        .from('mt_property_inquiries')
        .select('id, nome, tipo, created_at, mt_properties(titulo)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (tenantFilter.tenant_id) qRecent = qRecent.eq('tenant_id', tenantFilter.tenant_id);
      if (franchiseFilter.franchise_id) qRecent = qRecent.eq('franchise_id', franchiseFilter.franchise_id);

      const { data: recent } = await qRecent;

      const recentInquiries = (recent || []).map((r: any) => ({
        id: r.id,
        nome: r.nome || 'Anônimo',
        tipo: r.tipo,
        created_at: r.created_at,
        property_titulo: r.mt_properties?.titulo || '-',
      }));

      return {
        totalImoveis,
        disponiveis,
        vendidos,
        alugados,
        porTipo,
        porSituacao,
        consultasRecentes: consultasRecentes || 0,
        viewsRecentes: viewsRecentes || 0,
        recentInquiries,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
