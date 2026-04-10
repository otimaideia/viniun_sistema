// =============================================================================
// USE IMOVEIS MT - Hook Multi-Tenant para Gerenciamento de Imóveis
// =============================================================================
//
// Este hook fornece CRUD completo para mt_properties
// Com filtros avançados, paginação e ordenação
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTProperty,
  MTPropertyCreate,
  MTPropertyUpdate,
  MTPropertyFilters,
} from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-properties';
const DEFAULT_PER_PAGE = 20;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PaginatedProperties {
  data: MTProperty[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

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
      case '23505': return 'Este imóvel já existe.';
      case '23503': return 'Este imóvel está vinculado a outros dados.';
      case '23502': return 'Preencha todos os campos obrigatórios.';
      case '42501': return 'Você não tem permissão para realizar esta ação.';
      default: break;
    }
  }
  return error?.message || 'Erro desconhecido. Tente novamente.';
}

function applySorting(q: any, sortBy?: MTPropertyFilters['sort_by']) {
  switch (sortBy) {
    case 'preco_asc':
      return q.order('valor_venda', { ascending: true, nullsFirst: false });
    case 'preco_desc':
      return q.order('valor_venda', { ascending: false, nullsFirst: false });
    case 'area_asc':
      return q.order('area_total', { ascending: true, nullsFirst: false });
    case 'area_desc':
      return q.order('area_total', { ascending: false, nullsFirst: false });
    case 'updated':
      return q.order('updated_at', { ascending: false });
    case 'recent':
    default:
      return q.order('created_at', { ascending: false });
  }
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useImoveisMT(filters?: MTPropertyFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const page = filters?.page || 1;
  const perPage = filters?.per_page || DEFAULT_PER_PAGE;

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Imóveis com Paginação
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async (): Promise<PaginatedProperties> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_properties')
        .select(`
          *,
          property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
          purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
          location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
          location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome)
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // --- Filtros avançados ---

      if (filters?.property_type_id) {
        q = q.eq('property_type_id', filters.property_type_id);
      }
      if (filters?.property_subtype_id) {
        q = q.eq('property_subtype_id', filters.property_subtype_id);
      }
      if (filters?.purpose_id) {
        q = q.eq('purpose_id', filters.purpose_id);
      }
      if (filters?.location_estado_id) {
        q = q.eq('location_estado_id', filters.location_estado_id);
      }
      if (filters?.location_cidade_id) {
        q = q.eq('location_cidade_id', filters.location_cidade_id);
      }
      if (filters?.location_bairro_id) {
        q = q.eq('location_bairro_id', filters.location_bairro_id);
      }
      if (filters?.building_id) {
        q = q.eq('building_id', filters.building_id);
      }
      if (filters?.situacao) {
        q = q.eq('situacao', filters.situacao);
      }
      if (filters?.destaque !== undefined) {
        q = q.eq('destaque', filters.destaque);
      }
      if (filters?.lancamento !== undefined) {
        q = q.eq('lancamento', filters.lancamento);
      }
      if (filters?.aceita_financiamento !== undefined) {
        q = q.eq('aceita_financiamento', filters.aceita_financiamento);
      }
      if (filters?.mobiliado !== undefined) {
        q = q.eq('mobiliado', filters.mobiliado);
      }

      // Dormitorios range
      if (filters?.dormitorios_min !== undefined) {
        q = q.gte('dormitorios', filters.dormitorios_min);
      }
      if (filters?.dormitorios_max !== undefined) {
        q = q.lte('dormitorios', filters.dormitorios_max);
      }

      // Valor range (usa valor_venda como referência)
      if (filters?.valor_min !== undefined) {
        q = q.gte('valor_venda', filters.valor_min);
      }
      if (filters?.valor_max !== undefined) {
        q = q.lte('valor_venda', filters.valor_max);
      }

      // Área range
      if (filters?.area_min !== undefined) {
        q = q.gte('area_total', filters.area_min);
      }
      if (filters?.area_max !== undefined) {
        q = q.lte('area_total', filters.area_max);
      }

      // Full-text search
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`titulo.ilike.${searchTerm},endereco.ilike.${searchTerm},ref_code.ilike.${searchTerm},descricao.ilike.${searchTerm}`);
      }

      // Ordenação
      q = applySorting(q, filters?.sort_by);

      // Paginação
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;

      if (error) {
        console.error('Erro ao buscar imóveis MT:', error);
        throw error;
      }

      const total = count || 0;

      return {
        data: (data || []) as MTProperty[],
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 2,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Imóvel
  // ---------------------------------------------------------------------------

  const createImovel = useMutation({
    mutationFn: async (newImovel: MTPropertyCreate): Promise<MTProperty> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const imovelData = {
        ...newImovel,
        tenant_id: newImovel.tenant_id || tenant!.id,
        franchise_id: newImovel.franchise_id || franchise?.id || null,
        situacao: newImovel.situacao || 'disponivel',
        dormitorios: newImovel.dormitorios ?? 0,
        suites: newImovel.suites ?? 0,
        banheiros: newImovel.banheiros ?? 0,
        salas: newImovel.salas ?? 0,
        cozinhas: newImovel.cozinhas ?? 0,
        garagens: newImovel.garagens ?? 0,
        dep_empregada: newImovel.dep_empregada ?? 0,
        destaque: newImovel.destaque ?? false,
        destaque_semana: newImovel.destaque_semana ?? false,
        lancamento: newImovel.lancamento ?? false,
        aceita_financiamento: newImovel.aceita_financiamento ?? false,
        financiamento_caixa: newImovel.financiamento_caixa ?? false,
        financiamento_construtora: newImovel.financiamento_construtora ?? false,
        mobiliado: newImovel.mobiliado ?? false,
        semimobiliado: newImovel.semimobiliado ?? false,
        portal_export: newImovel.portal_export ?? false,
        total_visualizacoes: 0,
        total_consultas: 0,
        total_favoritos: 0,
        metadata: {},
        portal_metadata: {},
      };

      const { data, error } = await supabase
        .from('mt_properties')
        .insert(imovelData)
        .select(`
          *,
          property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
          purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
          location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
          location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar imóvel MT:', error);
        throw error;
      }
      return data as MTProperty;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Imóvel "${data.titulo || data.ref_code || 'Novo'}" criado com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Imóvel
  // ---------------------------------------------------------------------------

  const updateImovel = useMutation({
    mutationFn: async ({ id, ...updates }: MTPropertyUpdate): Promise<MTProperty> => {
      if (!id) throw new Error('ID do imóvel é obrigatório.');

      const { data, error } = await supabase
        .from('mt_properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
          purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
          location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
          location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar imóvel MT:', error);
        throw error;
      }
      return data as MTProperty;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Imóvel "${data.titulo || data.ref_code || ''}" atualizado!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Imóvel
  // ---------------------------------------------------------------------------

  const deleteImovel = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) throw new Error('ID do imóvel é obrigatório.');

      const { error } = await supabase
        .from('mt_properties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar imóvel MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Imóvel removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    imoveis: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    perPage: query.data?.per_page ?? perPage,
    totalPages: query.data?.total_pages ?? 0,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createImovel: {
      mutate: createImovel.mutate,
      mutateAsync: createImovel.mutateAsync,
      isPending: createImovel.isPending,
    },
    updateImovel: {
      mutate: updateImovel.mutate,
      mutateAsync: updateImovel.mutateAsync,
      isPending: updateImovel.isPending,
    },
    deleteImovel: {
      mutate: deleteImovel.mutate,
      mutateAsync: deleteImovel.mutateAsync,
      isPending: deleteImovel.isPending,
    },

    isCreating: createImovel.isPending,
    isUpdating: updateImovel.isPending,
    isDeleting: deleteImovel.isPending,
  };
}

export default useImoveisMT;
