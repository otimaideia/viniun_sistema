// =============================================================================
// USE INFLUENCER POSTS MT - Hook Multi-Tenant para Posts de Influenciadoras
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTPostPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook';
export type MTPostType = 'post_feed' | 'stories' | 'reels' | 'video' | 'live' | 'carrossel';
export type MTPostStatus = 'pendente' | 'publicado' | 'aprovado' | 'rejeitado';

export interface MTInfluencerPost {
  id: string;
  tenant_id: string;
  influencer_id: string;
  contract_id: string | null;
  campaign_id: string | null;

  // Detalhes
  platform: MTPostPlatform;
  post_type: MTPostType;
  post_url: string | null;
  content: string | null;
  hashtags: string[] | null;
  media_urls: string[] | null;

  // Datas
  scheduled_date: string | null;
  published_at: string | null;

  // Métricas
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  engagement_rate: number | null;

  // Status
  status: MTPostStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  // Metadata
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Relations
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    foto_perfil: string | null;
  };
  contract?: {
    id: string;
    tipo: string;
    status: string;
  };
}

export interface MTPostCreate {
  influencer_id: string;
  contract_id?: string | null;
  campaign_id?: string | null;
  platform: MTPostPlatform;
  post_type: MTPostType;
  post_url?: string;
  content?: string;
  hashtags?: string[];
  media_urls?: string[];
  scheduled_date?: string;
  published_at?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  status?: MTPostStatus;
  metadata?: Record<string, any>;
}

export interface MTPostUpdate extends Partial<MTPostCreate> {
  id: string;
}

export interface MTPostFilters {
  influencer_id?: string;
  contract_id?: string;
  status?: MTPostStatus;
  platform?: MTPostPlatform;
  post_type?: MTPostType;
  period_start?: string;
  period_end?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-influencer-posts';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  const pgCode = error?.code;
  if (pgCode === '23503') {
    return 'Influenciadora ou contrato não encontrado.';
  }

  return error?.message || 'Erro desconhecido.';
}

function calculateEngagementRate(likes: number, comments: number, shares: number, views: number): number {
  if (views === 0) return 0;
  const totalInteractions = likes + comments + shares;
  return Number(((totalInteractions / views) * 100).toFixed(2));
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useInfluencerPostsMT(filters?: MTPostFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Posts
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.influencer_id, filters?.status],
    queryFn: async (): Promise<MTInfluencerPost[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_influencer_posts')
        .select(`
          *,
          influencer:mt_influencers!inner (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.influencer_id) {
        q = q.eq('influencer_id', filters.influencer_id);
      }
      if (filters?.contract_id) {
        q = q.eq('contract_id', filters.contract_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.platform) {
        q = q.eq('platform', filters.platform);
      }
      if (filters?.post_type) {
        q = q.eq('post_type', filters.post_type);
      }
      if (filters?.period_start) {
        q = q.gte('published_at', filters.period_start);
      }
      if (filters?.period_end) {
        q = q.lte('published_at', filters.period_end);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar posts MT:', error);
        throw error;
      }

      return (data || []) as MTInfluencerPost[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Post
  // ---------------------------------------------------------------------------

  const createPost = useMutation({
    mutationFn: async (newPost: MTPostCreate): Promise<MTInfluencerPost> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const engagement_rate = calculateEngagementRate(
        newPost.likes_count || 0,
        newPost.comments_count || 0,
        newPost.shares_count || 0,
        newPost.views_count || 0
      );

      const postData = {
        ...newPost,
        tenant_id: tenant!.id,
        status: newPost.status || 'pendente',
        engagement_rate,
        likes_count: newPost.likes_count || 0,
        comments_count: newPost.comments_count || 0,
        shares_count: newPost.shares_count || 0,
        views_count: newPost.views_count || 0,
      };

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .insert(postData)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar post MT:', error);
        throw error;
      }

      return data as MTInfluencerPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Post criado com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Post
  // ---------------------------------------------------------------------------

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: MTPostUpdate): Promise<MTInfluencerPost> => {
      if (!id) {
        throw new Error('ID do post é obrigatório.');
      }

      // Recalcular engagement se métricas foram atualizadas
      let engagement_rate: number | undefined;
      if (updates.likes_count !== undefined || updates.comments_count !== undefined ||
          updates.shares_count !== undefined || updates.views_count !== undefined) {

        // Buscar dados atuais
        const { data: currentPost } = await supabase
          .from('mt_influencer_posts')
          .select('likes_count, comments_count, shares_count, views_count')
          .eq('id', id)
          .single();

        if (currentPost) {
          engagement_rate = calculateEngagementRate(
            updates.likes_count ?? currentPost.likes_count,
            updates.comments_count ?? currentPost.comments_count,
            updates.shares_count ?? currentPost.shares_count,
            updates.views_count ?? currentPost.views_count
          );
        }
      }

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .update({
          ...updates,
          ...(engagement_rate !== undefined && { engagement_rate }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar post MT:', error);
        throw error;
      }

      return data as MTInfluencerPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Post atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Aprovar Post
  // ---------------------------------------------------------------------------

  const approvePost = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_posts')
        .update({
          status: 'aprovado',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao aprovar post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Post aprovado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Rejeitar Post
  // ---------------------------------------------------------------------------

  const rejectPost = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_posts')
        .update({
          status: 'rejeitado',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao rejeitar post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Post rejeitado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Post
  // ---------------------------------------------------------------------------

  const deletePost = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar post MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Post removido!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getTotalPosts = () => query.data?.length || 0;
  const getTotalPublished = () => query.data?.filter(p => p.status === 'publicado' || p.status === 'aprovado').length || 0;
  const getTotalLikes = () => query.data?.reduce((sum, p) => sum + p.likes_count, 0) || 0;
  const getAvgEngagement = () => {
    const posts = query.data?.filter(p => p.engagement_rate) || [];
    if (posts.length === 0) return 0;
    const sum = posts.reduce((acc, p) => acc + (p.engagement_rate || 0), 0);
    return Number((sum / posts.length).toFixed(2));
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    stats: {
      totalPosts: getTotalPosts(),
      totalPublished: getTotalPublished(),
      totalLikes: getTotalLikes(),
      avgEngagement: getAvgEngagement(),
    },

    createPost: {
      mutate: createPost.mutate,
      mutateAsync: createPost.mutateAsync,
      isPending: createPost.isPending,
    },
    updatePost: {
      mutate: updatePost.mutate,
      mutateAsync: updatePost.mutateAsync,
      isPending: updatePost.isPending,
    },
    approvePost: {
      mutate: approvePost.mutate,
      mutateAsync: approvePost.mutateAsync,
      isPending: approvePost.isPending,
    },
    rejectPost: {
      mutate: rejectPost.mutate,
      mutateAsync: rejectPost.mutateAsync,
      isPending: rejectPost.isPending,
    },
    deletePost: {
      mutate: deletePost.mutate,
      mutateAsync: deletePost.mutateAsync,
      isPending: deletePost.isPending,
    },
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Post por ID
// -----------------------------------------------------------------------------

export function useInfluencerPostMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTInfluencerPost | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          contract:mt_influencer_contracts (id, tipo, status)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTInfluencerPost;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useInfluencerPostsMT;
