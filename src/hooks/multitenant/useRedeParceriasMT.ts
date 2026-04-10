// =============================================================================
// USE REDE PARCERIAS MT - Hook Multi-Tenant para Parcerias da Rede
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTNetworkPartnership, PartnershipStatus } from '@/types/rede-imoveis-mt';

const PARTNERSHIPS_KEY = 'mt-network-partnerships';

export function useRedeParceriasMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Listar parcerias do tenant
  const query = useQuery({
    queryKey: [PARTNERSHIPS_KEY, tenant?.id],
    queryFn: async (): Promise<MTNetworkPartnership[]> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não carregado.');

      let q = supabase
        .from('mt_network_partnerships' as any)
        .select(`
          *,
          tenant_origin:mt_tenants!mt_network_partnerships_tenant_origin_id_fkey(slug, nome_fantasia),
          tenant_partner:mt_tenants!mt_network_partnerships_tenant_partner_id_fkey(slug, nome_fantasia)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data, error } = await (q as any);
      if (error) throw error;
      return (data || []) as MTNetworkPartnership[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Solicitar parceria
  const solicitar = useMutation({
    mutationFn: async (params: {
      tenant_partner_id: string;
      tipo?: 'bilateral' | 'unilateral';
      comissao_padrao?: number;
      termos?: string;
    }) => {
      if (!tenant) throw new Error('Tenant não definido.');

      const { data, error } = await (supabase
        .from('mt_network_partnerships' as any)
        .insert({
          tenant_origin_id: tenant.id,
          tenant_partner_id: params.tenant_partner_id,
          tipo: params.tipo || 'bilateral',
          comissao_padrao: params.comissao_padrao || 0,
          termos: params.termos,
          status: 'pendente',
        })
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkPartnership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PARTNERSHIPS_KEY] });
      toast.success('Solicitação de parceria enviada!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao solicitar parceria.');
    },
  });

  // Atualizar status (aceitar, recusar, suspender, encerrar)
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PartnershipStatus }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'ativa') {
        updates.approved_at = new Date().toISOString();
      }

      const { data, error } = await (supabase
        .from('mt_network_partnerships' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()) as any;

      if (error) throw error;
      return data as MTNetworkPartnership;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PARTNERSHIPS_KEY] });
      const msgs: Record<string, string> = {
        ativa: 'Parceria aceita!',
        recusada: 'Parceria recusada.',
        suspensa: 'Parceria suspensa.',
        encerrada: 'Parceria encerrada.',
      };
      toast.success(msgs[data.status] || 'Parceria atualizada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar parceria.');
    },
  });

  // Soft delete
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_network_partnerships' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)) as any;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PARTNERSHIPS_KEY] });
      toast.success('Parceria removida.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover parceria.');
    },
  });

  // Tenants disponíveis para parceria
  const tenantsDisponiveis = useQuery({
    queryKey: ['mt-tenants-rede', tenant?.id],
    queryFn: async () => {
      if (!tenant) return [];

      const { data, error } = await supabase
        .from('mt_tenants')
        .select('id, slug, nome_fantasia')
        .eq('is_active', true)
        .neq('id', tenant.id)
        .order('nome_fantasia');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant,
  });

  return {
    data: query.data,
    tenantsDisponiveis: tenantsDisponiveis.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    solicitar,
    updateStatus,
    remove,
  };
}
