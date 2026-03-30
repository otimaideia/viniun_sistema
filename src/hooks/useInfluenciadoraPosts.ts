import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InfluenciadoraPost, InfluenciadoraPostInsert, InfluenciadoraPostUpdate } from '@/types/influenciadora';

interface PostFilters {
  influenciadoraId?: string;
  status?: string;
  plataforma?: string;
}

interface PostMetrics {
  totalPosts: number;
  postsAprovados: number;
  postsPendentes: number;
  totalViews: number;
  totalLikes: number;
  totalComentarios: number;
  engajamentoMedio: number;
}

/**
 * @deprecated Use useInfluenciadoraPostsAdapter instead for proper multi-tenant isolation.
 */
export function useInfluenciadoraPosts(filters: PostFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar posts
  const {
    data: posts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['influenciadora-posts', filters],
    queryFn: async () => {
      let query = supabase
        .from('mt_influencer_posts')
        .select(`
          *,
          influenciadora:mt_influencers(id, nome_completo, nome_artistico),
          contrato:mt_influencer_contracts(id, numero_contrato, valor_por_post),
          pagamento:mt_influencer_payments(id, status, valor_liquido)
        `)
        .order('data_publicacao', { ascending: false });

      if (filters.influenciadoraId) {
        query = query.eq('influenciadora_id', filters.influenciadoraId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.plataforma) {
        query = query.eq('plataforma', filters.plataforma);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InfluenciadoraPost[];
    },
  });

  // Calcular metricas
  const calcularEngajamento = (post: InfluenciadoraPost) => {
    const totalInteracoes = (post.likes || 0) + (post.comentarios || 0) + (post.compartilhamentos || 0);
    const alcance = post.alcance || post.views || 1;
    return (totalInteracoes / alcance) * 100;
  };

  const metrics: PostMetrics = {
    totalPosts: posts?.length || 0,
    postsAprovados: posts?.filter(p => p.status === 'aprovado').length || 0,
    postsPendentes: posts?.filter(p => p.status === 'pendente').length || 0,
    totalViews: posts?.reduce((acc, p) => acc + (p.views || 0), 0) || 0,
    totalLikes: posts?.reduce((acc, p) => acc + (p.likes || 0), 0) || 0,
    totalComentarios: posts?.reduce((acc, p) => acc + (p.comentarios || 0), 0) || 0,
    engajamentoMedio: posts?.length
      ? posts.reduce((acc, p) => acc + calcularEngajamento(p), 0) / posts.length
      : 0,
  };

  // Criar post
  const createPost = useMutation({
    mutationFn: async (post: InfluenciadoraPostInsert) => {
      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .insert({
          ...post,
          engajamento: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-posts'] });
      toast({
        title: 'Post registrado',
        description: 'O post foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar post
  const updatePost = useMutation({
    mutationFn: async ({ id, ...post }: InfluenciadoraPostUpdate & { id: string }) => {
      // Recalcular engajamento se metricas foram atualizadas
      let engajamento = post.engajamento;
      if (post.views !== undefined || post.likes !== undefined || post.comentarios !== undefined) {
        const totalInteracoes = (post.likes || 0) + (post.comentarios || 0) + (post.compartilhamentos || 0);
        const alcance = post.alcance || post.views || 1;
        engajamento = (totalInteracoes / alcance) * 100;
      }

      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .update({ ...post, engajamento })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-posts'] });
      toast({
        title: 'Post atualizado',
        description: 'O post foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Aprovar post
  const aprovarPost = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-posts'] });
      toast({
        title: 'Post aprovado',
        description: 'O post foi aprovado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Rejeitar post
  const rejeitarPost = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { data, error } = await supabase
        .from('mt_influencer_posts')
        .update({
          status: 'rejeitado',
          observacoes: motivo,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-posts'] });
      toast({
        title: 'Post rejeitado',
        description: 'O post foi rejeitado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao rejeitar post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deletar post
  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_influencer_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influenciadora-posts'] });
      toast({
        title: 'Post removido',
        description: 'O post foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover post',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    posts,
    metrics,
    isLoading,
    error,
    refetch,
    createPost,
    updatePost,
    aprovarPost,
    rejeitarPost,
    deletePost,
  };
}
