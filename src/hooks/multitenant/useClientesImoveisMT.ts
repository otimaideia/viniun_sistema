// =============================================================================
// USE CLIENTES IMOVEIS MT - Hook Multi-Tenant para Clientes de Imóveis
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPropertyClient } from '@/types/cliente-imovel-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTClienteImovelFilters {
  search?: string;
  status?: string;
  grupo?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-clients';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useClientesImoveisMT(filters?: MTClienteImovelFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Clientes
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.search, filters?.status, filters?.grupo],
    queryFn: async (): Promise<MTPropertyClient[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_clients')
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

      if (filters?.grupo) {
        q = q.eq('grupo', filters.grupo);
      }

      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`nome.ilike.${s},email.ilike.${s},telefone.ilike.${s},celular.ilike.${s},cpf_cnpj.ilike.${s}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar clientes imóveis MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyClient[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTPropertyClient>): Promise<MTPropertyClient> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_clients')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          franchise_id: franchise?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar cliente imóvel MT:', error);
        throw error;
      }

      return data as MTPropertyClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Cliente "${data.nome}" cadastrado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cadastrar cliente.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTPropertyClient>): Promise<MTPropertyClient> => {
      if (!id) throw new Error('ID do cliente é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar cliente imóvel MT:', error);
        throw error;
      }

      return data as MTPropertyClient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Cliente "${data.nome}" atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar cliente.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover cliente imóvel MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Cliente removido com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover cliente.');
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
