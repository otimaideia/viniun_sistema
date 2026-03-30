import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AIDocumentEmbedding } from '@/types/ai-sales-assistant';

interface DocumentFilters {
  file_type?: string;
  categoria?: string;
  search?: string;
  isActive?: boolean;
}

export function useAIDocumentsMT(filters?: DocumentFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const documents = useQuery({
    queryKey: ['mt-ai-documents', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_document_embeddings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.file_type) query = query.eq('document_type', filters.file_type);
      if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
      if (filters?.categoria) {
        query = query.contains('metadata', { categoria: filters.categoria });
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIDocumentEmbedding[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (doc: Partial<AIDocumentEmbedding>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_document_embeddings')
        .insert({
          ...doc,
          tenant_id: tenant.id,
          is_active: true,
          chunk_index: doc.chunk_index ?? 0,
          total_chunks: doc.total_chunks ?? 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIDocumentEmbedding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-documents'] });
      toast.success('Documento adicionado');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar documento: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { error } = await (supabase as any)
        .from('mt_ai_document_embeddings')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-documents'] });
      toast.success('Documento removido');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_document_embeddings')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AIDocumentEmbedding;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-documents'] });
      toast.success(data.is_active ? 'Documento ativado' : 'Documento desativado');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    documents: documents.data || [],
    isLoading: documents.isLoading || isTenantLoading,
    error: documents.error,
    create,
    remove,
    toggleActive,
    refetch: documents.refetch,
  };
}
