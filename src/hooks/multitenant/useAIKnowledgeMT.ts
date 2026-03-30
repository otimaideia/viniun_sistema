import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface KnowledgeFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
}

interface KnowledgeItem {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  categoria: string;
  titulo: string;
  conteudo: string;
  source: string | null;
  metadata: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useAIKnowledgeMT(filters?: KnowledgeFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const items = useQuery({
    queryKey: ['mt-ai-knowledge', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_chatbot_knowledge')
        .select('*')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.category) query = query.eq('categoria', filters.category);
      if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
      if (filters?.search) {
        query = query.or(`titulo.ilike.%${filters.search}%,conteudo.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeItem[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<KnowledgeItem>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_chatbot_knowledge')
        .insert({ ...item, tenant_id: tenant.id })
        .select()
        .single();
      if (error) throw error;
      return data as KnowledgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-knowledge'] });
      toast.success('Conhecimento adicionado');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeItem> & { id: string }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_chatbot_knowledge')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as KnowledgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-knowledge'] });
      toast.success('Conhecimento atualizado');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { error } = await (supabase as any)
        .from('mt_chatbot_knowledge')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-knowledge'] });
      toast.success('Conhecimento removido');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    items: items.data || [],
    isLoading: items.isLoading || isTenantLoading,
    error: items.error,
    create,
    update,
    remove,
    refetch: items.refetch,
  };
}
