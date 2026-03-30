// =============================================================================
// USE FRANCHISES MT - Hook Multi-Tenant para Gerenciamento de Franquias
// =============================================================================
//
// Este hook fornece CRUD completo para mt_franchises, substituindo useFranqueados
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTFranchise {
  id: string;
  tenant_id: string;
  codigo: string | null;
  nome: string;
  nome_curto: string | null;
  tipo: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  pais: string;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  telefone_secundario: string | null;
  whatsapp: string | null;
  email: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  responsavel_email: string | null;
  horario_funcionamento: Record<string, any> | null;
  capacidade_atendimento: number | null;
  api_token: string | null;
  external_id: string | null;
  status: string;
  data_inauguracao: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
}

export interface MTFranchiseCreate {
  nome: string;
  cidade: string;
  estado: string;
  tenant_id?: string;
  codigo?: string;
  nome_curto?: string;
  tipo?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  pais?: string;
  latitude?: number;
  longitude?: number;
  telefone?: string;
  telefone_secundario?: string;
  whatsapp?: string;
  email?: string;
  responsavel_nome?: string;
  responsavel_telefone?: string;
  responsavel_email?: string;
  horario_funcionamento?: Record<string, any>;
  capacidade_atendimento?: number;
  external_id?: string;
  status?: string;
  data_inauguracao?: string;
}

export interface MTFranchiseUpdate extends Partial<MTFranchiseCreate> {
  id: string;
}

export interface MTFranchiseFilters {
  status?: string | string[];
  cidade?: string;
  estado?: string;
  search?: string;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-franchises';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Esta franquia já existe. Verifique se não há duplicidade.';
      case '23503':
        return 'Esta franquia está vinculada a outros dados.';
      case '23502':
        const column = error?.details?.match(/column "(\w+)"/)?.[1];
        return column ? `O campo "${column}" é obrigatório.` : 'Preencha todos os campos obrigatórios.';
      case '42501':
        return 'Você não tem permissão para realizar esta ação.';
      default:
        break;
    }
  }

  if (error?.message) {
    return error.message;
  }

  return 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useFranchisesMT(filters?: MTFranchiseFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Franchises
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.status, filters?.cidade, filters?.estado, filters?.search],
    queryFn: async (): Promise<MTFranchise[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_franchises')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .order('nome', { ascending: true });

      // Filtro por tenant (platform admin pode ver todas)
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          q = q.in('status', filters.status);
        } else {
          q = q.eq('status', filters.status);
        }
      }

      if (filters?.cidade) {
        q = q.eq('cidade', filters.cidade);
      }

      if (filters?.estado) {
        q = q.eq('estado', filters.estado);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},codigo.ilike.${searchTerm},cidade.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar franchises MT:', error);
        throw error;
      }

      return (data || []) as MTFranchise[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Franchise
  // ---------------------------------------------------------------------------

  const createFranchise = useMutation({
    mutationFn: async (newFranchise: MTFranchiseCreate): Promise<MTFranchise> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const franchiseData = {
        ...newFranchise,
        tenant_id: newFranchise.tenant_id || tenant!.id,
        status: newFranchise.status || 'ativo',
        pais: newFranchise.pais || 'Brasil',
        tipo: newFranchise.tipo || 'franquia',
      };

      const { data, error } = await supabase
        .from('mt_franchises')
        .insert(franchiseData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar franchise MT:', error);
        throw error;
      }

      return data as MTFranchise;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Franquia "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Franchise
  // ---------------------------------------------------------------------------

  const updateFranchise = useMutation({
    mutationFn: async ({ id, ...updates }: MTFranchiseUpdate): Promise<MTFranchise> => {
      if (!id) {
        throw new Error('ID da franquia é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_franchises')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar franchise MT:', error);
        throw error;
      }

      return data as MTFranchise;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Franquia "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Franchise
  // ---------------------------------------------------------------------------

  const deleteFranchise = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da franquia é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_franchises')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar franchise MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Franquia removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Gerar Token de API
  // ---------------------------------------------------------------------------

  const generateToken = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();

      const { error } = await supabase
        .from('mt_franchises')
        .update({
          api_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Token de integração gerado com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    franchises: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createFranchise: {
      mutate: createFranchise.mutate,
      mutateAsync: createFranchise.mutateAsync,
      isPending: createFranchise.isPending,
    },
    updateFranchise: {
      mutate: updateFranchise.mutate,
      mutateAsync: updateFranchise.mutateAsync,
      isPending: updateFranchise.isPending,
    },
    deleteFranchise: {
      mutate: deleteFranchise.mutate,
      mutateAsync: deleteFranchise.mutateAsync,
      isPending: deleteFranchise.isPending,
    },
    generateToken: {
      mutate: generateToken.mutate,
      mutateAsync: generateToken.mutateAsync,
      isPending: generateToken.isPending,
    },

    isCreating: createFranchise.isPending,
    isUpdating: updateFranchise.isPending,
    isDeleting: deleteFranchise.isPending,
    isGeneratingToken: generateToken.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Franchise por ID
// -----------------------------------------------------------------------------

export function useFranchiseMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTFranchise | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_franchises')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTFranchise;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useFranchisesMT;
