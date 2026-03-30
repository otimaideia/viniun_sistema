// =============================================================================
// USE FRANCHISE DEFAULT FUNNEL MT - Funil padrão por franquia
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FranchiseDefaultFunnel {
  id: string;
  tenant_id: string;
  franchise_id: string;
  funnel_id: string;
  is_active: boolean;
  notes?: string | null;
  set_by?: string | null;
  set_at: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  franchise?: { id: string; nome: string } | null;
  funnel?: { id: string; nome: string } | null;
  setter?: { id: string; nome: string } | null;
}

const QUERY_KEY = 'mt-franchise-default-funnels';

// -----------------------------------------------------------------------------
// Hook: Obter funil padrão da franquia atual
// -----------------------------------------------------------------------------

export function useFranchiseDefaultFunnelMT() {
  const { tenant, franchise, user, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, franchise?.id],
    queryFn: async (): Promise<FranchiseDefaultFunnel | null> => {
      if (!franchise?.id) return null;

      const { data, error } = await supabase
        .from('mt_franchise_default_funnels')
        .select(`
          *,
          funnel:mt_funnels(id, nome),
          setter:mt_users!set_by(id, nome)
        `)
        .eq('franchise_id', franchise.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        funnel: Array.isArray(data.funnel) ? data.funnel[0] : data.funnel,
        setter: Array.isArray(data.setter) ? data.setter[0] : data.setter,
      } as FranchiseDefaultFunnel;
    },
    enabled: !isTenantLoading && !!franchise?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Definir funil padrão
  const setDefaultFunnel = useMutation({
    mutationFn: async ({
      franchiseId,
      funnelId,
      notes,
    }: {
      franchiseId: string;
      funnelId: string;
      notes?: string;
    }) => {
      if (!tenant) throw new Error('Tenant não definido');

      // Upsert - UNIQUE(franchise_id) garante apenas um por franquia
      const { data, error } = await supabase
        .from('mt_franchise_default_funnels')
        .upsert(
          {
            tenant_id: tenant.id,
            franchise_id: franchiseId,
            funnel_id: funnelId,
            is_active: true,
            notes: notes || null,
            set_by: user?.id || null,
            set_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'franchise_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil padrão definido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao definir funil padrão: ${error.message}`);
    },
  });

  // Remover funil padrão
  const removeDefaultFunnel = useMutation({
    mutationFn: async (franchiseId: string) => {
      const { error } = await supabase
        .from('mt_franchise_default_funnels')
        .delete()
        .eq('franchise_id', franchiseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil padrão removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover funil padrão: ${error.message}`);
    },
  });

  return {
    defaultFunnel: query.data,
    defaultFunnelId: query.data?.funnel_id || null,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    setDefaultFunnel,
    removeDefaultFunnel,
    canSetDefault: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
  };
}

// -----------------------------------------------------------------------------
// Hook: Listar todas as configurações de funis padrão (admin)
// -----------------------------------------------------------------------------

export function useAllFranchiseDefaultFunnelsMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'all', tenant?.id],
    queryFn: async (): Promise<FranchiseDefaultFunnel[]> => {
      let q = supabase
        .from('mt_franchise_default_funnels')
        .select(`
          *,
          franchise:mt_franchises(id, nome),
          funnel:mt_funnels(id, nome),
          setter:mt_users!set_by(id, nome)
        `)
        .order('created_at', { ascending: true });

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        franchise: Array.isArray(item.franchise) ? item.franchise[0] : item.franchise,
        funnel: Array.isArray(item.funnel) ? item.funnel[0] : item.funnel,
        setter: Array.isArray(item.setter) ? item.setter[0] : item.setter,
      })) as FranchiseDefaultFunnel[];
    },
    enabled: !isTenantLoading && (accessLevel === 'platform' || accessLevel === 'tenant'),
  });
}
