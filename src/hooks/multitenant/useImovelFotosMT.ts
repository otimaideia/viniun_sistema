// =============================================================================
// USE IMOVEL FOTOS MT - Hook Multi-Tenant para Fotos de Imóvel
// =============================================================================
//
// Este hook fornece CRUD para mt_property_photos
// Com upload para Supabase Storage (bucket: property-photos)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyPhoto } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-photos';
const STORAGE_BUCKET = 'property-photos';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UploadPhotoParams {
  file: File;
  descricao?: string;
  album?: string;
  ordem?: number;
  is_destaque?: boolean;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  if (error?.message?.includes('Payload too large') || error?.message?.includes('413')) {
    return 'Arquivo muito grande. Máximo permitido: 10MB.';
  }
  if (error?.message?.includes('mime')) {
    return 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.';
  }
  const pgCode = error?.code;
  if (pgCode === '42501') return 'Você não tem permissão para realizar esta ação.';
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useImovelFotosMT(propertyId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Fotos do Imóvel
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, propertyId, tenant?.id],
    queryFn: async (): Promise<MTPropertyPhoto[]> => {
      if (!propertyId) return [];

      const { data, error } = await supabase
        .from('mt_property_photos')
        .select('*')
        .eq('property_id', propertyId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fotos MT:', error);
        throw error;
      }
      return (data || []) as MTPropertyPhoto[];
    },
    enabled: !!propertyId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Foto destaque
  const fotoDestaque = (query.data || []).find(f => f.is_destaque) || (query.data || [])[0] || null;

  // ---------------------------------------------------------------------------
  // Mutation: Upload de Foto
  // ---------------------------------------------------------------------------

  const uploadPhoto = useMutation({
    mutationFn: async (params: UploadPhotoParams): Promise<MTPropertyPhoto> => {
      if (!propertyId) throw new Error('ID do imóvel é obrigatório.');
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido.');

      const tenantId = tenant!.id;
      const file = params.file;

      // Gerar nome único para o arquivo
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const filename = `${timestamp}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const storagePath = `${tenantId}/${propertyId}/${filename}`;

      // 1. Upload para Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Erro no upload do arquivo:', uploadError);
        throw uploadError;
      }

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const url = urlData.publicUrl;

      // 3. Obter dimensões se for imagem (browser only)
      let largura: number | null = null;
      let altura: number | null = null;

      if (file.type.startsWith('image/')) {
        try {
          const img = new Image();
          const dimensionPromise = new Promise<{ w: number; h: number }>((resolve) => {
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 0, h: 0 });
          });
          img.src = URL.createObjectURL(file);
          const dims = await dimensionPromise;
          largura = dims.w || null;
          altura = dims.h || null;
          URL.revokeObjectURL(img.src);
        } catch {
          // Dimensões opcionais, não falhar
        }
      }

      // 4. Calcular próxima ordem
      const currentPhotos = query.data || [];
      const maxOrdem = currentPhotos.reduce((max, p) => Math.max(max, p.ordem), 0);

      // 5. Salvar registro no banco
      const { data, error } = await supabase
        .from('mt_property_photos')
        .insert({
          tenant_id: tenantId,
          property_id: propertyId,
          url,
          storage_path: storagePath,
          descricao: params.descricao || null,
          album: params.album || null,
          ordem: params.ordem ?? (maxOrdem + 1),
          is_destaque: params.is_destaque ?? false,
          mime_type: file.type,
          tamanho_bytes: file.size,
          largura,
          altura,
        })
        .select('*')
        .single();

      if (error) {
        // Se falhou no banco, tentar remover do storage
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        console.error('Erro ao salvar foto no banco MT:', error);
        throw error;
      }

      return data as MTPropertyPhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, propertyId] });
      toast.success('Foto enviada com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Definir como Destaque
  // ---------------------------------------------------------------------------

  const setDestaque = useMutation({
    mutationFn: async (photoId: string): Promise<void> => {
      if (!propertyId) throw new Error('ID do imóvel é obrigatório.');

      // 1. Remover destaque de todas as fotos deste imóvel
      const { error: clearError } = await supabase
        .from('mt_property_photos')
        .update({ is_destaque: false })
        .eq('property_id', propertyId);

      if (clearError) {
        console.error('Erro ao limpar destaque:', clearError);
        throw clearError;
      }

      // 2. Definir a foto selecionada como destaque
      const { error: setError } = await supabase
        .from('mt_property_photos')
        .update({ is_destaque: true })
        .eq('id', photoId);

      if (setError) {
        console.error('Erro ao definir destaque MT:', setError);
        throw setError;
      }

      // 3. Atualizar foto_destaque_url no imóvel
      const foto = (query.data || []).find(f => f.id === photoId);
      if (foto) {
        await supabase
          .from('mt_properties')
          .update({
            foto_destaque_url: foto.url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', propertyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['mt-properties'] });
      toast.success('Foto definida como destaque!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Reordenar Fotos
  // ---------------------------------------------------------------------------

  const reorderPhotos = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      // Atualizar ordem de cada foto em batch
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('mt_property_photos')
          .update({ ordem: index + 1 })
          .eq('id', id)
      );

      const results = await Promise.all(updates);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Erros ao reordenar fotos:', errors.map(e => e.error));
        throw new Error('Erro ao reordenar algumas fotos.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, propertyId] });
      toast.success('Ordem das fotos atualizada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Foto (remove do storage + banco)
  // ---------------------------------------------------------------------------

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string): Promise<void> => {
      if (!photoId) throw new Error('ID da foto é obrigatório.');

      // 1. Buscar dados da foto para obter storage_path
      const foto = (query.data || []).find(f => f.id === photoId);

      // 2. Remover do storage (se tiver path)
      if (foto?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([foto.storage_path]);

        if (storageError) {
          console.warn('Aviso: Não foi possível remover arquivo do storage:', storageError);
          // Não falha, continua para deletar do banco
        }
      }

      // 3. Deletar registro do banco
      const { error } = await supabase
        .from('mt_property_photos')
        .delete()
        .eq('id', photoId);

      if (error) {
        console.error('Erro ao deletar foto MT:', error);
        throw error;
      }

      // 4. Se era a foto destaque, limpar do imóvel
      if (foto?.is_destaque && propertyId) {
        await supabase
          .from('mt_properties')
          .update({
            foto_destaque_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', propertyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, propertyId] });
      queryClient.invalidateQueries({ queryKey: ['mt-properties'] });
      toast.success('Foto removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar descrição/album de uma foto
  // ---------------------------------------------------------------------------

  const updatePhoto = useMutation({
    mutationFn: async ({ id, descricao, album }: { id: string; descricao?: string; album?: string }): Promise<MTPropertyPhoto> => {
      if (!id) throw new Error('ID da foto é obrigatório.');

      const updates: Record<string, unknown> = {};
      if (descricao !== undefined) updates.descricao = descricao;
      if (album !== undefined) updates.album = album;

      const { data, error } = await supabase
        .from('mt_property_photos')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar foto MT:', error);
        throw error;
      }
      return data as MTPropertyPhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, propertyId] });
      toast.success('Foto atualizada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    fotos: query.data ?? [],
    fotoDestaque,
    totalFotos: (query.data || []).length,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    uploadPhoto: {
      mutate: uploadPhoto.mutate,
      mutateAsync: uploadPhoto.mutateAsync,
      isPending: uploadPhoto.isPending,
    },
    setDestaque: {
      mutate: setDestaque.mutate,
      mutateAsync: setDestaque.mutateAsync,
      isPending: setDestaque.isPending,
    },
    reorderPhotos: {
      mutate: reorderPhotos.mutate,
      mutateAsync: reorderPhotos.mutateAsync,
      isPending: reorderPhotos.isPending,
    },
    deletePhoto: {
      mutate: deletePhoto.mutate,
      mutateAsync: deletePhoto.mutateAsync,
      isPending: deletePhoto.isPending,
    },
    updatePhoto: {
      mutate: updatePhoto.mutate,
      mutateAsync: updatePhoto.mutateAsync,
      isPending: updatePhoto.isPending,
    },

    isUploading: uploadPhoto.isPending,
    isSettingDestaque: setDestaque.isPending,
    isReordering: reorderPhotos.isPending,
    isDeleting: deletePhoto.isPending,
    isUpdating: updatePhoto.isPending,
  };
}

export default useImovelFotosMT;
