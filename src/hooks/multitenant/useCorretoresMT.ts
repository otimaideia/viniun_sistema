// =============================================================================
// USE CORRETORES MT - Hook Multi-Tenant para Corretores de Imóveis
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTCorretor,
  MTCorretorCreate,
  MTCorretorUpdate,
} from '@/types/corretor-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTCorretorFilters {
  search?: string;
  status?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-corretores';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useCorretoresMT(filters?: MTCorretorFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Corretores
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.search, filters?.status],
    queryFn: async (): Promise<MTCorretor[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_corretores')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`nome.ilike.${s},email.ilike.${s},telefone.ilike.${s},celular.ilike.${s},creci.ilike.${s}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar corretores MT:', error);
        throw error;
      }

      return (data || []) as MTCorretor[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: MTCorretorCreate): Promise<MTCorretor> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_corretores')
        .insert({
          ...newItem,
          tenant_id: newItem.tenant_id || tenant!.id,
          franchise_id: newItem.franchise_id || franchise?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar corretor MT:', error);
        throw error;
      }

      return data as MTCorretor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Corretor "${data.nome}" cadastrado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cadastrar corretor.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTCorretorUpdate): Promise<MTCorretor> => {
      if (!id) throw new Error('ID do corretor é obrigatório.');

      const { data, error } = await supabase
        .from('mt_corretores')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar corretor MT:', error);
        throw error;
      }

      return data as MTCorretor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Corretor "${data.nome}" atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar corretor.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_corretores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover corretor MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Corretor removido com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover corretor.');
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
  };
}
