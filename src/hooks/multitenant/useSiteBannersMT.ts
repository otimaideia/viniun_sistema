// =============================================================================
// USE SITE BANNERS MT - Hook Multi-Tenant para Banners do Site
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BannerPosicao = 'hero' | 'lateral' | 'footer' | 'popup' | 'categoria';

export interface MTSiteBanner {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  titulo: string;
  subtitulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  link_url: string | null;
  link_texto: string | null;
  posicao: string;
  cor_fundo: string | null;
  cor_texto: string | null;
  ordem: number;
  is_active: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTSiteBannerCreate {
  titulo: string;
  subtitulo?: string | null;
  imagem_url: string;
  imagem_mobile_url?: string | null;
  link_url?: string | null;
  link_texto?: string | null;
  posicao: string;
  cor_fundo?: string | null;
  cor_texto?: string | null;
  ordem?: number;
  is_active?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface MTSiteBannerUpdate extends Partial<MTSiteBannerCreate> {
  id: string;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useSiteBannersMT(posicaoFilter?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query principal
  const query = useQuery({
    queryKey: ['mt-site-banners', tenant?.id, franchise?.id, posicaoFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from('mt_site_banners')
        .select('*')
        .is('deleted_at', null)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (posicaoFilter) {
        q = q.eq('posicao', posicaoFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTSiteBanner[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 2 * 60 * 1000,
  });

  // Buscar banner por ID
  const useBanner = (id?: string) => {
    return useQuery({
      queryKey: ['mt-site-banner', id],
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await (supabase as any)
          .from('mt_site_banners')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single();

        if (error) throw error;
        return data as MTSiteBanner;
      },
      enabled: !!id,
    });
  };

  // Mutation: Criar
  const create = useMutation({
    mutationFn: async (newBanner: MTSiteBannerCreate) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase as any)
        .from('mt_site_banners')
        .insert({
          ...newBanner,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTSiteBanner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-site-banners'] });
      toast.success('Banner criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar banner: ${error.message}`);
    },
  });

  // Mutation: Atualizar
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTSiteBannerUpdate) => {
      const { data, error } = await (supabase as any)
        .from('mt_site_banners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTSiteBanner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-site-banners'] });
      queryClient.invalidateQueries({ queryKey: ['mt-site-banner'] });
      toast.success('Banner atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar banner: ${error.message}`);
    },
  });

  // Mutation: Deletar (soft delete)
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_site_banners')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-site-banners'] });
      toast.success('Banner removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover banner: ${error.message}`);
    },
  });

  return {
    banners: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    useBanner,
    create,
    update,
    remove,
  };
}
