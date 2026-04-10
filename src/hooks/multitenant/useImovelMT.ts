// =============================================================================
// USE IMOVEL MT - Hook Multi-Tenant para Buscar Imóvel por ID (com full joins)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTProperty } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-properties';

// -----------------------------------------------------------------------------
// Hook: Buscar Imóvel por ID com todos os relacionamentos
// -----------------------------------------------------------------------------

export function useImovelMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTProperty | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_properties')
        .select(`
          *,
          property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
          property_subtype:mt_property_types!mt_properties_property_subtype_id_fkey (id, nome, codigo, icone),
          purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
          owner:mt_proprietarios!mt_properties_owner_id_fkey (id, nome),
          captador:mt_captadores!mt_properties_captador_id_fkey (id, nome),
          corretor:mt_corretores!mt_properties_corretor_id_fkey (id, nome),
          building:mt_buildings!mt_properties_building_id_fkey (id, nome),
          location_estado:mt_locations!mt_properties_location_estado_id_fkey (id, nome, uf),
          location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
          location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome),
          photos:mt_property_photos (id, url, thumbnail_url, descricao, album, ordem, is_destaque, mime_type, tamanho_bytes, largura, altura, created_at)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Erro ao buscar imóvel MT:', error);
        throw error;
      }

      // Ordenar fotos por ordem
      if (data?.photos) {
        data.photos.sort((a: any, b: any) => (a.ordem ?? 999) - (b.ordem ?? 999));
      }

      return data as MTProperty;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    imovel: query.data ?? null,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export default useImovelMT;
