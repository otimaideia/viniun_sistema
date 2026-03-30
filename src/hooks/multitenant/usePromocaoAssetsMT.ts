// =============================================================================
// USE PROMOCAO ASSETS MT - Hook Multi-Tenant para Assets/Mídia de Promoção
// =============================================================================
//
// Upload, listagem e gerenciamento de mídia para mt_promotion_assets
// Usa Supabase Storage bucket 'promotion-assets'
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPromotionAsset, MTPromotionAssetTipo } from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-promocao-assets';
const PARENT_QUERY_KEY = 'mt-promocoes';
const STORAGE_BUCKET = 'promotion-assets';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePromocaoAssetsMT(promotionId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Assets
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, promotionId],
    queryFn: async (): Promise<MTPromotionAsset[]> => {
      if (!promotionId) return [];

      const { data, error } = await supabase
        .from('mt_promotion_assets')
        .select('*')
        .eq('promotion_id', promotionId)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar assets da promoção:', error);
        throw error;
      }

      return (data || []) as MTPromotionAsset[];
    },
    enabled: !!promotionId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Upload Asset
  // ---------------------------------------------------------------------------

  const uploadAsset = useMutation({
    mutationFn: async ({
      promotionId: promoId,
      file,
      tipo,
      titulo,
    }: {
      promotionId: string;
      file: File;
      tipo: MTPromotionAssetTipo;
      titulo?: string;
    }): Promise<MTPromotionAsset> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // 1. Upload para Supabase Storage
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${tenant!.id}/${promoId}/${timestamp}_${sanitizedName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // 3. Determinar ordem (último + 1)
      const { count } = await supabase
        .from('mt_promotion_assets')
        .select('id', { count: 'exact', head: true })
        .eq('promotion_id', promoId);

      const ordem = (count || 0) + 1;

      // 4. Criar registro no banco
      const { data, error } = await supabase
        .from('mt_promotion_assets')
        .insert({
          promotion_id: promoId,
          tenant_id: tenant!.id,
          tipo,
          titulo: titulo || file.name,
          url: publicUrl,
          storage_path: uploadData.path,
          mime_type: file.type,
          tamanho_bytes: file.size,
          ordem,
        })
        .select('*')
        .single();

      if (error) {
        // Rollback: remover arquivo do storage
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadData.path]);
        console.error('Erro ao registrar asset:', error);
        throw error;
      }

      return data as MTPromotionAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Arquivo enviado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao enviar arquivo.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Asset
  // ---------------------------------------------------------------------------

  const deleteAsset = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // 1. Buscar o asset para pegar o storage_path
      const { data: asset, error: fetchError } = await supabase
        .from('mt_promotion_assets')
        .select('storage_path')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar asset:', fetchError);
        throw fetchError;
      }

      // 2. Remover do storage (se tiver path)
      if (asset?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([asset.storage_path]);

        if (storageError) {
          console.warn('Aviso: erro ao remover do storage:', storageError);
          // Continua mesmo com erro no storage
        }
      }

      // 3. Remover do banco
      const { error } = await supabase
        .from('mt_promotion_assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar asset:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Arquivo removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover arquivo.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Reordenar Assets
  // ---------------------------------------------------------------------------

  const reorderAssets = useMutation({
    mutationFn: async ({
      promotionId: promoId,
      orderedIds,
    }: {
      promotionId: string;
      orderedIds: string[];
    }): Promise<void> => {
      // Atualizar a ordem de cada asset
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('mt_promotion_assets')
          .update({ ordem: index + 1 })
          .eq('id', id)
          .eq('promotion_id', promoId)
      );

      const results = await Promise.all(updates);

      const hasError = results.find((r) => r.error);
      if (hasError?.error) {
        console.error('Erro ao reordenar assets:', hasError.error);
        throw hasError.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      toast.success('Ordem atualizada!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao reordenar.');
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    assets: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    uploadAsset: {
      mutate: uploadAsset.mutate,
      mutateAsync: uploadAsset.mutateAsync,
      isPending: uploadAsset.isPending,
    },
    deleteAsset: {
      mutate: deleteAsset.mutate,
      mutateAsync: deleteAsset.mutateAsync,
      isPending: deleteAsset.isPending,
    },
    reorderAssets: {
      mutate: reorderAssets.mutate,
      mutateAsync: reorderAssets.mutateAsync,
      isPending: reorderAssets.isPending,
    },

    isUploading: uploadAsset.isPending,
    isDeleting: deleteAsset.isPending,
    isReordering: reorderAssets.isPending,
  };
}

export default usePromocaoAssetsMT;
