// =============================================================================
// USE CAPTADORES MT - Hook Multi-Tenant para Captadores de Imóveis
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTCaptador,
  MTCaptadorCreate,
  MTCaptadorUpdate,
} from '@/types/captador-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTCaptadorFilters {
  search?: string;
  status?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-captadores';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useCaptadoresMT(filters?: MTCaptadorFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Captadores
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.search, filters?.status],
    queryFn: async (): Promise<MTCaptador[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_captadores')
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
        console.error('Erro ao buscar captadores MT:', error);
        throw error;
      }

      return (data || []) as MTCaptador[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: MTCaptadorCreate): Promise<MTCaptador> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_captadores')
        .insert({
          ...newItem,
          tenant_id: newItem.tenant_id || tenant!.id,
          franchise_id: newItem.franchise_id || franchise?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar captador MT:', error);
        throw error;
      }

      return data as MTCaptador;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Captador "${data.nome}" cadastrado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cadastrar captador.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTCaptadorUpdate): Promise<MTCaptador> => {
      if (!id) throw new Error('ID do captador é obrigatório.');

      const { data, error } = await supabase
        .from('mt_captadores')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar captador MT:', error);
        throw error;
      }

      return data as MTCaptador;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Captador "${data.nome}" atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar captador.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_captadores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover captador MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Captador removido com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover captador.');
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
