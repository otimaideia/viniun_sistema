// =============================================================================
// USE PROPRIETARIO MT - Hook Multi-Tenant para Proprietário Individual
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTPropertyOwner } from '@/types/proprietario-mt';

const QUERY_KEY = 'mt-property-owner';

export function useProprietarioMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, id, tenant?.id],
    queryFn: async (): Promise<MTPropertyOwner | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_property_owners')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar proprietário MT:', error);
        throw error;
      }

      return data as MTPropertyOwner;
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
