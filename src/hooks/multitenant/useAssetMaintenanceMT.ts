// =============================================================================
// USE ASSET MAINTENANCE MT - Hook Multi-Tenant para Manutenções de Ativos
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { MTAssetMaintenance, MTAssetMaintenanceCreate, MTAssetMaintenanceUpdate } from '@/types/patrimonio';

const QUERY_KEY = 'mt-asset-maintenance';

export function useAssetMaintenanceMT(assetId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, assetId],
    queryFn: async (): Promise<MTAssetMaintenance[]> => {
      let q = supabase
        .from('mt_asset_maintenance')
        .select('*, asset:mt_assets(id, codigo, nome)')
        .is('deleted_at', null)
        .order('data_agendada', { ascending: false });

      if (assetId) {
        q = q.eq('asset_id', assetId);
      }

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTAssetMaintenance[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  const createMaintenance = useMutation({
    mutationFn: async (item: MTAssetMaintenanceCreate) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const { data, error } = await supabase
        .from('mt_asset_maintenance')
        .insert({
          ...item,
          tenant_id: tenant!.id,
          status: item.status || 'scheduled',
          custo: item.custo || 0,
        })
        .select('*, asset:mt_assets(id, codigo, nome)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Manutenção registrada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao registrar manutenção.'),
  });

  const updateMaintenance = useMutation({
    mutationFn: async ({ id, ...updates }: MTAssetMaintenanceUpdate) => {
      const { data, error } = await supabase
        .from('mt_asset_maintenance')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, asset:mt_assets(id, codigo, nome)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Manutenção atualizada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao atualizar manutenção.'),
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_asset_maintenance')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Manutenção removida!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao remover manutenção.'),
  });

  return {
    maintenances: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: () => query.refetch(),

    createMaintenance: { mutate: createMaintenance.mutate, mutateAsync: createMaintenance.mutateAsync, isPending: createMaintenance.isPending },
    updateMaintenance: { mutate: updateMaintenance.mutate, mutateAsync: updateMaintenance.mutateAsync, isPending: updateMaintenance.isPending },
    deleteMaintenance: { mutate: deleteMaintenance.mutate, mutateAsync: deleteMaintenance.mutateAsync, isPending: deleteMaintenance.isPending },
  };
}

export default useAssetMaintenanceMT;
