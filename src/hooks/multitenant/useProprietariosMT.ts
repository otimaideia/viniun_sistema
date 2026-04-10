// =============================================================================
// USE PROPRIETARIOS MT - Hook Multi-Tenant para Proprietários de Imóveis
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyOwner,
  MTPropertyOwnerCreate,
  MTPropertyOwnerUpdate,
} from '@/types/proprietario-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTProprietarioFilters {
  search?: string;
  status?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-owners';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useProprietariosMT(filters?: MTProprietarioFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Proprietários
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.search, filters?.status],
    queryFn: async (): Promise<MTPropertyOwner[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_owners')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nível de acesso
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
        q = q.or(`nome.ilike.${s},email.ilike.${s},telefone.ilike.${s},celular.ilike.${s},cpf_cnpj.ilike.${s}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar proprietários MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyOwner[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: MTPropertyOwnerCreate): Promise<MTPropertyOwner> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_owners')
        .insert({
          ...newItem,
          tenant_id: newItem.tenant_id || tenant!.id,
          franchise_id: newItem.franchise_id || franchise?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar proprietário MT:', error);
        throw error;
      }

      return data as MTPropertyOwner;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Proprietário "${data.nome}" cadastrado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cadastrar proprietário.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyOwnerUpdate): Promise<MTPropertyOwner> => {
      if (!id) throw new Error('ID do proprietário é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_owners')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar proprietário MT:', error);
        throw error;
      }

      return data as MTPropertyOwner;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Proprietário "${data.nome}" atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar proprietário.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_owners')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover proprietário MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Proprietário removido com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover proprietário.');
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
