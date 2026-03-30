// =============================================================================
// USE MARKETING ASSETS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para assets de marketing usando tabela MT
// SISTEMA 100% MT - Usa mt_marketing_assets com isolamento por tenant
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MarketingAsset, MarketingAssetFormData } from '@/types/marketing';

// =============================================================================
// Types MT
// =============================================================================

interface MTMarketingAsset {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  campaign_id: string | null;
  asset_type: string | null;
  name: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  dimensions: Record<string, unknown> | null;
  tags: string[] | null;
  category: string | null;
  status: string;
  is_public: boolean;
  download_count: number;
  view_count: number;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    id: string;
    nome_fantasia: string;
  };
  campaign?: {
    id: string;
    nome: string;
  };
}

export interface MarketingAssetAdaptada extends MarketingAsset {
  tenant_id?: string;
  franchise_id?: string | null;
}

// =============================================================================
// Helper: Mapear MT para Legacy
// =============================================================================

function mapMTToLegacy(mtAsset: MTMarketingAsset): MarketingAssetAdaptada {
  return {
    id: mtAsset.id,
    nome: mtAsset.name,
    descricao: mtAsset.description || undefined,
    tipo: mtAsset.asset_type || 'imagem',
    categoria: mtAsset.category || undefined,
    unidade_id: mtAsset.franchise_id,
    campanha_id: mtAsset.campaign_id,
    file_url: mtAsset.file_url || '',
    file_size: mtAsset.file_size || undefined,
    file_type: mtAsset.file_type || undefined,
    tags: mtAsset.tags || [],
    dimensoes: mtAsset.dimensions || {},
    ativo: mtAsset.status === 'active',
    created_at: mtAsset.created_at,
    updated_at: mtAsset.updated_at,
    tenant_id: mtAsset.tenant_id,
    franchise_id: mtAsset.franchise_id,
    // Relacionamentos MT
    franquia: mtAsset.franchise
      ? {
          id: mtAsset.franchise.id,
          nome_fantasia: mtAsset.franchise.nome_fantasia,
        }
      : undefined,
    campanha: mtAsset.campaign
      ? {
          id: mtAsset.campaign.id,
          nome: mtAsset.campaign.nome,
        }
      : undefined,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-marketing-assets';

// =============================================================================
// Hook Principal
// =============================================================================

export function useMarketingAssetsAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Assets
  // ==========================================================================
  const {
    data: assetsRaw = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let query = supabase
        .from('mt_marketing_assets')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia),
          campaign:mt_campaigns(id, nome)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform') {
        // Usuário comum - filtrar por tenant
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar assets:', error);
        throw error;
      }

      return (data || []) as MTMarketingAsset[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mapear para formato legacy
  const assets: MarketingAssetAdaptada[] = assetsRaw.map(mapMTToLegacy);

  // ==========================================================================
  // Mutation: Criar Asset
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: MarketingAssetFormData) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const mtData = {
        tenant_id: tenant?.id,
        franchise_id: data.unidade_id || franchise?.id || null,
        campaign_id: data.campanha_id || null,
        asset_type: data.tipo || 'imagem',
        name: data.nome,
        description: data.descricao || null,
        file_url: data.file_url || null,
        file_type: data.file_type || null,
        file_size: data.file_size || null,
        dimensions: data.dimensoes || null,
        tags: data.tags || [],
        category: data.categoria || null,
        status: data.ativo !== false ? 'active' : 'inactive',
        is_public: false,
      };

      const { data: created, error } = await supabase
        .from('mt_marketing_assets')
        .insert(mtData)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia),
          campaign:mt_campaigns(id, nome)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao criar asset:', error);
        throw error;
      }

      return mapMTToLegacy(created as MTMarketingAsset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Asset criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar asset: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Asset
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketingAssetFormData> }) => {
      const mtData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Mapear campos legacy para MT
      if (data.nome !== undefined) mtData.name = data.nome;
      if (data.descricao !== undefined) mtData.description = data.descricao;
      if (data.tipo !== undefined) mtData.asset_type = data.tipo;
      if (data.categoria !== undefined) mtData.category = data.categoria;
      if (data.unidade_id !== undefined) mtData.franchise_id = data.unidade_id;
      if (data.campanha_id !== undefined) mtData.campaign_id = data.campanha_id;
      if (data.file_url !== undefined) mtData.file_url = data.file_url;
      if (data.file_type !== undefined) mtData.file_type = data.file_type;
      if (data.file_size !== undefined) mtData.file_size = data.file_size;
      if (data.dimensoes !== undefined) mtData.dimensions = data.dimensoes;
      if (data.tags !== undefined) mtData.tags = data.tags;
      if (data.ativo !== undefined) mtData.status = data.ativo ? 'active' : 'inactive';

      const { data: updated, error } = await supabase
        .from('mt_marketing_assets')
        .update(mtData)
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia),
          campaign:mt_campaigns(id, nome)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar asset:', error);
        throw error;
      }

      return mapMTToLegacy(updated as MTMarketingAsset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Asset atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar asset: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Asset
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_marketing_assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar asset:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Asset excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir asset: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Upload de Arquivo
  // ==========================================================================
  const uploadMutation = useMutation({
    mutationFn: async ({ file, bucket = 'marketing-assets', fileName }: { file: File; bucket?: string; fileName?: string }) => {
      const finalFileName = fileName || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[MT] Erro no upload:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(finalFileName);

      return publicUrl;
    },
    onError: (error: Error) => {
      toast.error(`Erro no upload: ${error.message}`);
    },
  });

  // ==========================================================================
  // Upload Múltiplos Assets
  // ==========================================================================
  const uploadMultipleAssets = async (
    files: File[],
    baseData: Partial<MarketingAssetFormData>,
    onProgress?: (completed: number, total: number, fileName: string) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    const uploadPromises = files.map(async (file) => {
      try {
        // Upload do arquivo
        const fileUrl = await uploadMutation.mutateAsync({ file });

        // Obter dimensões da imagem se for imagem
        let dimensoes = {};
        if (file.type.startsWith('image/')) {
          dimensoes = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = URL.createObjectURL(file);
          });
        }

        // Criar o asset
        await createMutation.mutateAsync({
          nome: file.name.split('.')[0],
          tipo: baseData.tipo || 'imagem',
          categoria: baseData.categoria,
          unidade_id: baseData.unidade_id || franchise?.id,
          campanha_id: baseData.campanha_id,
          file_url: fileUrl,
          file_size: file.size,
          file_type: file.type,
          tags: baseData.tags || [],
          dimensoes,
          ativo: baseData.ativo ?? true,
        });

        results.success++;
        onProgress?.(results.success + results.failed, files.length, file.name);
      } catch (error) {
        results.failed++;
        results.errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        onProgress?.(results.success + results.failed, files.length, file.name);
      }
    });

    await Promise.all(uploadPromises);

    // Invalidar cache após uploads
    if (results.success > 0) {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    }

    return results;
  };

  // ==========================================================================
  // Stats Computados
  // ==========================================================================
  const stats = {
    total: assets.length,
    imagens: assets.filter((a) => a.tipo === 'imagem').length,
    videos: assets.filter((a) => a.tipo === 'video').length,
    banners: assets.filter((a) => a.tipo === 'banner').length,
    logos: assets.filter((a) => a.tipo === 'logo').length,
    artesSociais: assets.filter((a) => a.tipo === 'arte_social').length,
  };

  return {
    assets,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    stats,
    createAsset: createMutation.mutateAsync,
    updateAsset: (id: string, data: Partial<MarketingAssetFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteAsset: deleteMutation.mutateAsync,
    uploadFile: uploadMutation.mutateAsync,
    uploadMultipleAssets,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploading: uploadMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getMarketingAssetsMode(): 'mt' {
  return 'mt';
}

export default useMarketingAssetsAdapter;
