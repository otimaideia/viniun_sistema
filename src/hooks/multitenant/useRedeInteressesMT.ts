// =============================================================================
// USE REDE INTERESSES MT - Hook Multi-Tenant para Interesses na Rede
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTNetworkInterest, InterestStatus, NetworkInterestFilters } from '@/types/rede-imoveis-mt';

const INTERESTS_KEY = 'mt-network-interests';

export function useRedeInteressesMT(filters?: NetworkInterestFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [INTERESTS_KEY, tenant?.id, filters],
    queryFn: async (): Promise<MTNetworkInterest[]> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não carregado.');

      let q = supabase
        .from('mt_network_interests' as any)
        .select(`
          *,
          tenant:mt_tenants!mt_network_interests_tenant_id_fkey(slug, nome_fantasia),
          property:mt_properties!mt_network_interests_property_id_fkey(id, titulo, ref_code, foto_destaque_url)
        `)
        .order('created_at', { ascending: false });

      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.propertyId) q = q.eq('property_id', filters.propertyId);
      if (filters?.tableId) q = q.eq('table_id', filters.tableId);

      const { data, error } = await (q as any);
      if (error) throw error;
      return (data || []) as MTNetworkInterest[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Manifestar interesse
  const manifestar = useMutation({
    mutationFn: async (params: {
      property_id: string;
      table_id?: string;
      table_item_id?: string;
      tipo?: 'consulta' | 'proposta' | 'reserva' | 'visita';
      valor_proposta?: number;
      observacoes?: string;
      contato_nome?: string;
      contato_telefone?: string;
      contato_email?: string;
    }) => {
      if (!tenant) throw new Error('Tenant não definido.');

      const { data, error } = await (supabase
        .from('mt_network_interests' as any)
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          ...params,
          tipo: params.tipo || 'consulta',
          status: 'novo',
        })
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkInterest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERESTS_KEY] });
      toast.success('Interesse registrado!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao registrar interesse.');
    },
  });

  // Atualizar status do interesse
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: InterestStatus; observacoes?: string }) => {
      const { data, error } = await (supabase
        .from('mt_network_interests' as any)
        .update({
          status,
          observacoes: observacoes || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkInterest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERESTS_KEY] });
      toast.success('Status atualizado.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar status.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    manifestar,
    updateStatus,
  };
}
