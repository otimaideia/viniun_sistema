// =============================================================================
// USE IMOVEL ANALYTICS MT - Hook Multi-Tenant para Views e Favoritos
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyView,
  MTPropertyFavorite,
} from '@/types/consulta-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const VIEWS_KEY = 'mt-property-views';
const FAVORITES_KEY = 'mt-property-favorites';

// -----------------------------------------------------------------------------
// Hook: Views de Imóveis
// -----------------------------------------------------------------------------

export function useImovelViewsMT(propertyId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Contar views de um imóvel
  const viewsCount = useQuery({
    queryKey: [VIEWS_KEY, 'count', propertyId, tenant?.id],
    queryFn: async (): Promise<number> => {
      if (!propertyId) return 0;

      let q = supabase
        .from('mt_property_views')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { count, error } = await q;

      if (error) {
        console.error('Erro ao contar views MT:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: !!propertyId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Registrar view
  const registerView = useMutation({
    mutationFn: async (params: {
      property_id: string;
      lead_id?: string;
      visitor_session?: string;
      ip_address?: string;
      user_agent?: string;
      referrer?: string;
      source?: string;
      duracao_segundos?: number;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_views')
        .insert({
          tenant_id: tenant!.id,
          property_id: params.property_id,
          lead_id: params.lead_id || null,
          visitor_session: params.visitor_session || null,
          ip_address: params.ip_address || null,
          user_agent: params.user_agent || null,
          referrer: params.referrer || null,
          source: params.source || null,
          duracao_segundos: params.duracao_segundos || null,
          viewed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar view MT:', error);
        throw error;
      }

      return data as MTPropertyView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VIEWS_KEY] });
    },
  });

  return {
    viewsCount: viewsCount.data ?? 0,
    isLoading: viewsCount.isLoading || isTenantLoading,
    registerView,
  };
}

// -----------------------------------------------------------------------------
// Hook: Favoritos de Imóveis
// -----------------------------------------------------------------------------

export function useImovelFavoritosMT(params?: { lead_id?: string; user_id?: string }) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Listar favoritos do lead/user
  const query = useQuery({
    queryKey: [FAVORITES_KEY, tenant?.id, params?.lead_id, params?.user_id],
    queryFn: async (): Promise<MTPropertyFavorite[]> => {
      if (!params?.lead_id && !params?.user_id) return [];

      let q = supabase
        .from('mt_property_favorites')
        .select('*')
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (params?.lead_id) {
        q = q.eq('lead_id', params.lead_id);
      }

      if (params?.user_id) {
        q = q.eq('user_id', params.user_id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar favoritos MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyFavorite[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && (!!params?.lead_id || !!params?.user_id),
  });

  // Toggle favorito
  const toggleFavorite = useMutation({
    mutationFn: async (params: { property_id: string; lead_id?: string; user_id?: string; session_id?: string }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Verificar se já é favorito
      let checkQuery = supabase
        .from('mt_property_favorites')
        .select('id')
        .eq('tenant_id', tenant!.id)
        .eq('property_id', params.property_id);

      if (params.lead_id) {
        checkQuery = checkQuery.eq('lead_id', params.lead_id);
      } else if (params.user_id) {
        checkQuery = checkQuery.eq('user_id', params.user_id);
      } else if (params.session_id) {
        checkQuery = checkQuery.eq('session_id', params.session_id);
      }

      const { data: existing } = await checkQuery;

      if (existing && existing.length > 0) {
        // Remover favorito
        const { error } = await supabase
          .from('mt_property_favorites')
          .delete()
          .eq('id', existing[0].id);

        if (error) throw error;
        return { action: 'removed' as const };
      } else {
        // Adicionar favorito
        const { error } = await supabase
          .from('mt_property_favorites')
          .insert({
            tenant_id: tenant!.id,
            property_id: params.property_id,
            lead_id: params.lead_id || null,
            user_id: params.user_id || null,
            session_id: params.session_id || null,
          });

        if (error) throw error;
        return { action: 'added' as const };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_KEY] });
      toast.success(result.action === 'added' ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar favorito.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    toggleFavorite,
    isFavorite: (propertyId: string) => query.data?.some((f) => f.property_id === propertyId) ?? false,
  };
}
