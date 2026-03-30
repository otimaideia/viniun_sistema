import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTFAQ, FAQFilters } from '@/types/faq';

export function useFAQsMT(filters?: FAQFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-faqs', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase
        .from('mt_faqs') as any)
        .select(`
          *,
          category:mt_faq_categories(id, nome, icone, cor),
          department:mt_departments(id, nome),
          sop:mt_sops(id, codigo, titulo)
        `)
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.search) {
        q = q.or(`pergunta.ilike.%${filters.search}%,resposta.ilike.%${filters.search}%`);
      }
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      if (filters?.department_id) q = q.eq('department_id', filters.department_id);
      if (filters?.sop_id) q = q.eq('sop_id', filters.sop_id);
      if (filters?.is_published !== undefined) q = q.eq('is_published', filters.is_published);
      if (filters?.is_pinned !== undefined) q = q.eq('is_pinned', filters.is_pinned);
      if (filters?.tags && filters.tags.length > 0) {
        q = q.overlaps('tags', filters.tags);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTFAQ[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newFAQ: Partial<MTFAQ>) => {
      const { data, error } = await (supabase
        .from('mt_faqs') as any)
        .insert({
          ...newFAQ,
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-faqs'] });
      toast.success('FAQ criada com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao criar FAQ: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTFAQ> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_faqs') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-faqs'] });
      toast.success('FAQ atualizada com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao atualizar FAQ: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('mt_faqs') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-faqs'] });
      toast.success('FAQ removida com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao remover FAQ: ${error.message}`),
  });

  const voteHelpful = useMutation({
    mutationFn: async ({ faq_id, is_helpful }: { faq_id: string; is_helpful: boolean }) => {
      // Upsert the vote
      const { data: vote, error: voteError } = await (supabase
        .from('mt_faq_votes') as any)
        .upsert(
          {
            tenant_id: tenant?.id,
            faq_id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            is_helpful,
          },
          { onConflict: 'faq_id,user_id' }
        )
        .select()
        .single();
      if (voteError) throw voteError;

      // Recalculate counts
      const { count: helpfulCount } = await (supabase
        .from('mt_faq_votes') as any)
        .select('*', { count: 'exact', head: true })
        .eq('faq_id', faq_id)
        .eq('is_helpful', true);

      const { count: notHelpfulCount } = await (supabase
        .from('mt_faq_votes') as any)
        .select('*', { count: 'exact', head: true })
        .eq('faq_id', faq_id)
        .eq('is_helpful', false);

      // Update counts on the FAQ
      const { error: updateError } = await (supabase
        .from('mt_faqs') as any)
        .update({
          helpful_count: helpfulCount || 0,
          not_helpful_count: notHelpfulCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', faq_id);
      if (updateError) throw updateError;

      return vote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['mt-faq'] });
      toast.success('Voto registrado');
    },
    onError: (error: any) => toast.error(`Erro ao votar: ${error.message}`),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    voteHelpful,
  };
}

export function useFAQMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-faq', id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('mt_faqs') as any)
        .select(`
          *,
          category:mt_faq_categories(id, nome, icone, cor),
          department:mt_departments(id, nome),
          sop:mt_sops(id, codigo, titulo)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;

      // Register view
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await (supabase
        .from('mt_faq_views') as any)
        .insert({
          tenant_id: data.tenant_id,
          faq_id: id,
          user_id: userId || null,
        });

      // Increment views_count on the FAQ
      await (supabase
        .from('mt_faqs') as any)
        .update({
          views_count: (data.views_count || 0) + 1,
        })
        .eq('id', id);

      return data as MTFAQ;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
