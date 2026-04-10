// =============================================================================
// USE NOTICIAS IMOVEIS MT - Hook Multi-Tenant para Notícias/Blog
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyNews } from '@/types/conteudo-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-news';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useNoticiasImoveisMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Notícias
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTPropertyNews[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_news')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar notícias MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyNews[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTPropertyNews>): Promise<MTPropertyNews> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_news')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          status: newItem.status || 'rascunho',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar notícia MT:', error);
        throw error;
      }

      return data as MTPropertyNews;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Notícia "${data.titulo}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar notícia.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTPropertyNews>): Promise<MTPropertyNews> => {
      if (!id) throw new Error('ID da notícia é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_news')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar notícia MT:', error);
        throw error;
      }

      return data as MTPropertyNews;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Notícia "${data.titulo}" atualizada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar notícia.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_news')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover notícia MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Notícia removida com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover notícia.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Publicar / Despublicar
  // ---------------------------------------------------------------------------

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }): Promise<MTPropertyNews> => {
      const updateData: Record<string, unknown> = {
        status: publish ? 'publicado' : 'rascunho',
        updated_at: new Date().toISOString(),
      };

      if (publish) {
        updateData.publicado_em = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('mt_property_news')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao publicar/despublicar notícia MT:', error);
        throw error;
      }

      return data as MTPropertyNews;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(data.status === 'publicado' ? 'Notícia publicada!' : 'Notícia despublicada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao alterar publicação.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    togglePublish,
  };
}
