// =============================================================================
// USE IMOVEL FEATURES MT - Hook Multi-Tenant para Características de Imóvel
// =============================================================================
//
// Este hook fornece CRUD para mt_property_features (catálogo)
// e mt_property_feature_links (vínculo feature ↔ imóvel)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyFeature, FeatureCategoria } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-features';
const LINKS_KEY = 'mt-property-feature-links';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTPropertyFeatureCreate {
  tenant_id?: string;
  categoria: FeatureCategoria;
  nome: string;
  icone?: string;
  ordem?: number;
}

export interface MTPropertyFeatureUpdate extends Partial<MTPropertyFeatureCreate> {
  id: string;
}

export interface MTPropertyFeatureLink {
  id: string;
  property_id: string;
  feature_id: string;
  tenant_id: string;
  valor: string | null;
  created_at: string;
  feature?: MTPropertyFeature;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  const pgCode = error?.code;
  if (pgCode === '23505') return 'Esta característica já está vinculada.';
  if (pgCode === '42501') return 'Você não tem permissão para realizar esta ação.';
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook: Catálogo de Features
// -----------------------------------------------------------------------------

export function useImovelFeaturesMT(filters?: { categoria?: FeatureCategoria }) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Features do catálogo
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, accessLevel, filters?.categoria],
    queryFn: async (): Promise<MTPropertyFeature[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_features')
        .select('*')
        .eq('is_active', true)
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.categoria) {
        q = q.eq('categoria', filters.categoria);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Erro ao buscar features MT:', error);
        throw error;
      }
      return (data || []) as MTPropertyFeature[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 30,
  });

  // Helper: agrupar por categoria
  const featuresByCategoria = (query.data || []).reduce<Record<FeatureCategoria, MTPropertyFeature[]>>(
    (acc, f) => {
      if (!acc[f.categoria]) acc[f.categoria] = [];
      acc[f.categoria].push(f);
      return acc;
    },
    {} as Record<FeatureCategoria, MTPropertyFeature[]>
  );

  // ---------------------------------------------------------------------------
  // Mutation: Criar Feature no catálogo
  // ---------------------------------------------------------------------------

  const createFeature = useMutation({
    mutationFn: async (newFeature: MTPropertyFeatureCreate): Promise<MTPropertyFeature> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const featureData = {
        ...newFeature,
        tenant_id: newFeature.tenant_id || tenant!.id,
        is_active: true,
        ordem: newFeature.ordem ?? 0,
      };

      const { data, error } = await supabase
        .from('mt_property_features')
        .insert(featureData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar feature MT:', error);
        throw error;
      }
      return data as MTPropertyFeature;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Característica "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Feature
  // ---------------------------------------------------------------------------

  const updateFeature = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyFeatureUpdate): Promise<MTPropertyFeature> => {
      if (!id) throw new Error('ID da feature é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_features')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar feature MT:', error);
        throw error;
      }
      return data as MTPropertyFeature;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Característica "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Feature (desativar)
  // ---------------------------------------------------------------------------

  const deleteFeature = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID da feature é obrigatório.');

      const { error } = await supabase
        .from('mt_property_features')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao desativar feature MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Característica removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    features: query.data ?? [],
    featuresByCategoria,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createFeature: {
      mutate: createFeature.mutate,
      mutateAsync: createFeature.mutateAsync,
      isPending: createFeature.isPending,
    },
    updateFeature: {
      mutate: updateFeature.mutate,
      mutateAsync: updateFeature.mutateAsync,
      isPending: updateFeature.isPending,
    },
    deleteFeature: {
      mutate: deleteFeature.mutate,
      mutateAsync: deleteFeature.mutateAsync,
      isPending: deleteFeature.isPending,
    },

    isCreating: createFeature.isPending,
    isUpdating: updateFeature.isPending,
    isDeleting: deleteFeature.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Features vinculadas a um Imóvel específico
// -----------------------------------------------------------------------------

export function useImovelFeatureLinksMT(propertyId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Features vinculadas ao imóvel
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [LINKS_KEY, propertyId, tenant?.id],
    queryFn: async (): Promise<MTPropertyFeatureLink[]> => {
      if (!propertyId) return [];

      const { data, error } = await supabase
        .from('mt_property_feature_links')
        .select(`
          *,
          feature:mt_property_features (id, categoria, nome, icone, ordem)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar feature links MT:', error);
        throw error;
      }
      return (data || []) as MTPropertyFeatureLink[];
    },
    enabled: !!propertyId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Feature IDs vinculados (para uso em checkboxes)
  const linkedFeatureIds = (query.data || []).map(link => link.feature_id);

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar Feature ao Imóvel
  // ---------------------------------------------------------------------------

  const addFeature = useMutation({
    mutationFn: async ({ featureId, valor }: { featureId: string; valor?: string }): Promise<MTPropertyFeatureLink> => {
      if (!propertyId) throw new Error('ID do imóvel é obrigatório.');
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const { data, error } = await supabase
        .from('mt_property_feature_links')
        .insert({
          property_id: propertyId,
          feature_id: featureId,
          tenant_id: tenant!.id,
          valor: valor || null,
        })
        .select(`
          *,
          feature:mt_property_features (id, categoria, nome, icone, ordem)
        `)
        .single();

      if (error) {
        console.error('Erro ao vincular feature MT:', error);
        throw error;
      }
      return data as MTPropertyFeatureLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LINKS_KEY, propertyId] });
      toast.success('Característica adicionada ao imóvel!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover Feature do Imóvel
  // ---------------------------------------------------------------------------

  const removeFeature = useMutation({
    mutationFn: async (featureId: string): Promise<void> => {
      if (!propertyId) throw new Error('ID do imóvel é obrigatório.');

      const { error } = await supabase
        .from('mt_property_feature_links')
        .delete()
        .eq('property_id', propertyId)
        .eq('feature_id', featureId);

      if (error) {
        console.error('Erro ao remover feature link MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LINKS_KEY, propertyId] });
      toast.success('Característica removida do imóvel!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Toggle Feature (add/remove)
  // ---------------------------------------------------------------------------

  const toggleFeature = useMutation({
    mutationFn: async (featureId: string): Promise<void> => {
      if (linkedFeatureIds.includes(featureId)) {
        await removeFeature.mutateAsync(featureId);
      } else {
        await addFeature.mutateAsync({ featureId });
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    featureLinks: query.data ?? [],
    linkedFeatureIds,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    addFeature: {
      mutate: addFeature.mutate,
      mutateAsync: addFeature.mutateAsync,
      isPending: addFeature.isPending,
    },
    removeFeature: {
      mutate: removeFeature.mutate,
      mutateAsync: removeFeature.mutateAsync,
      isPending: removeFeature.isPending,
    },
    toggleFeature: {
      mutate: toggleFeature.mutate,
      mutateAsync: toggleFeature.mutateAsync,
      isPending: toggleFeature.isPending,
    },

    isAdding: addFeature.isPending,
    isRemoving: removeFeature.isPending,
    isToggling: toggleFeature.isPending,
  };
}

export default useImovelFeaturesMT;
