// =============================================================================
// USE CLIENTE IMOVEL MT - Hook Multi-Tenant para Cliente Individual
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTPropertyClient } from '@/types/cliente-imovel-mt';

const QUERY_KEY = 'mt-property-client';

export function useClienteImovelMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, id, tenant?.id],
    queryFn: async (): Promise<MTPropertyClient | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_property_clients')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar cliente imóvel MT:', error);
        throw error;
      }

      return data as MTPropertyClient;
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
