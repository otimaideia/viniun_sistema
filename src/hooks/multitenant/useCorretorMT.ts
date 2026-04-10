// =============================================================================
// USE CORRETOR MT - Hook Multi-Tenant para Corretor Individual
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTCorretor } from '@/types/corretor-mt';

const QUERY_KEY = 'mt-corretor';

export function useCorretorMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, id, tenant?.id],
    queryFn: async (): Promise<MTCorretor | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_corretores')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar corretor MT:', error);
        throw error;
      }

      return data as MTCorretor;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
