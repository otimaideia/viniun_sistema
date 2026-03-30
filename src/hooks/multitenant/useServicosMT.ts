// =============================================================================
// USE SERVICOS MT - Hook Multi-Tenant para Gerenciamento de Servicos
// =============================================================================
//
// Este hook fornece CRUD completo para mt_services
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTServiceTipo = 'servico' | 'produto';
export type MTServiceDisponibilidade = 'in_stock' | 'out_of_stock' | 'preorder';
export type MTServiceCondicao = 'new' | 'refurbished' | 'used';

export interface MTService {
  id: string;
  tenant_id: string;
  codigo: string | null;
  nome: string;
  nome_curto: string | null;
  descricao: string | null;
  descricao_curta: string | null;
  categoria: string | null;
  subcategoria: string | null;
  preco: number | null;
  preco_promocional: number | null;
  moeda: string;
  duracao_minutos: number | null;
  imagem_url: string | null;
  galeria: string[] | null;
  disponivel_online: boolean;
  disponivel_agendamento: boolean;
  requer_avaliacao: boolean;
  tags: string[] | null;
  palavras_chave: string[] | null;
  is_active: boolean;
  ordem: number;
  destaque: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Tipo: servico ou produto
  tipo: MTServiceTipo;
  // Campos Meta Commerce (WhatsApp Catalog) + Google Business Profile
  sku: string | null;
  marca: string | null;
  url: string | null;
  disponibilidade: MTServiceDisponibilidade;
  condicao: MTServiceCondicao;
  gtin: string | null;
  meta_catalog_id: string | null;
  google_category: string | null;
  // Campos de área corporal (laser)
  area_corporal: string | null;
  tamanho_area: string | null; // P, M, G
  sessoes_protocolo: number | null;
  preco_por_sessao: number | null;
  // Precos de referencia e custo de insumos (ficha tecnica)
  preco_tabela_maior: number | null;
  preco_tabela_menor: number | null;
  custo_insumos: number | null;
  custo_mao_obra: number | null;
  custo_fixo_rateado: number | null;
  custo_total_sessao: number | null;
  margem_maior: number | null;
  margem_menor: number | null;
  // Campos de precificacao unificada (migrados de mt_price_tables)
  preco_desconto: number | null;
  preco_volume: number | null;
  volume_minimo: number | null;
  preco_piso: number | null;
  custo_pix: number | null;
  custo_cartao: number | null;
  numero_sessoes: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
}

export interface MTServiceCreate {
  nome: string;
  tenant_id?: string;
  codigo?: string;
  nome_curto?: string;
  descricao?: string;
  descricao_curta?: string;
  categoria?: string;
  subcategoria?: string;
  preco?: number;
  preco_promocional?: number;
  moeda?: string;
  duracao_minutos?: number;
  imagem_url?: string;
  galeria?: string[];
  disponivel_online?: boolean;
  disponivel_agendamento?: boolean;
  requer_avaliacao?: boolean;
  tags?: string[];
  palavras_chave?: string[];
  is_active?: boolean;
  ordem?: number;
  destaque?: boolean;
  // Tipo e campos Meta Commerce / Google Business
  tipo?: MTServiceTipo;
  sku?: string;
  marca?: string;
  url?: string;
  disponibilidade?: MTServiceDisponibilidade;
  condicao?: MTServiceCondicao;
  gtin?: string;
  meta_catalog_id?: string;
  google_category?: string;
  // Campos de área corporal
  area_corporal?: string;
  tamanho_area?: string;
  sessoes_protocolo?: number;
  preco_por_sessao?: number;
  // Precos de referencia
  preco_tabela_maior?: number;
  preco_tabela_menor?: number;
  // Precificacao unificada
  preco_desconto?: number;
  preco_volume?: number;
  volume_minimo?: number;
  preco_piso?: number;
  custo_pix?: number;
  custo_cartao?: number;
  numero_sessoes?: number;
  vigencia_inicio?: string;
  vigencia_fim?: string;
}

export interface MTServiceUpdate extends Partial<MTServiceCreate> {
  id: string;
}

export interface MTServiceFilters {
  categoria?: string;
  tipo?: MTServiceTipo;
  is_active?: boolean;
  destaque?: boolean;
  search?: string;
}

// Tabela de relacionamento: serviços por franquia
export interface MTFranchiseService {
  id: string;
  franchise_id: string;
  service_id: string;
  tenant_id: string;
  is_active: boolean;
  preco_customizado: number | null;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-services';
const FRANCHISE_SERVICES_KEY = 'mt-franchise-services';

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
        return 'Este serviço já existe.';
      case '23503':
        return 'Este serviço está vinculado a outros dados.';
      case '23502':
        return 'Preencha todos os campos obrigatórios.';
      case '42501':
        return 'Você não tem permissão para realizar esta ação.';
      default:
        break;
    }
  }

  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useServicosMT(filters?: MTServiceFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Servicos
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters?.tipo, filters?.categoria, filters?.is_active, filters?.search],
    queryFn: async (): Promise<MTService[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      // Franchise admin: buscar apenas serviços vinculados à franquia
      if (accessLevel === 'franchise' && franchise) {
        const { data: franchiseLinks } = await supabase
          .from('mt_franchise_services')
          .select('service_id')
          .eq('franchise_id', franchise.id)
          .eq('is_active', true);

        const serviceIds = (franchiseLinks || []).map(fl => fl.service_id);
        if (serviceIds.length === 0) return [];

        let q = supabase
          .from('mt_services')
          .select(`
            *,
            tenant:mt_tenants (id, slug, nome_fantasia)
          `)
          .in('id', serviceIds)
          .order('ordem', { ascending: true })
          .order('nome', { ascending: true });

        // Filtros opcionais
        if (filters?.tipo) q = q.eq('tipo', filters.tipo);
        if (filters?.categoria) q = q.eq('categoria', filters.categoria);
        if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
        if (filters?.destaque !== undefined) q = q.eq('destaque', filters.destaque);
        if (filters?.search) {
          const searchTerm = `%${filters.search}%`;
          q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm},codigo.ilike.${searchTerm}`);
        }

        const { data, error } = await q;
        if (error) { console.error('Erro ao buscar servicos MT (franchise):', error); throw error; }
        return (data || []) as MTService[];
      }

      // Platform/Tenant admin: buscar todos os serviços do tenant
      let q = supabase
        .from('mt_services')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }

      if (filters?.categoria) {
        q = q.eq('categoria', filters.categoria);
      }

      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      if (filters?.destaque !== undefined) {
        q = q.eq('destaque', filters.destaque);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm},codigo.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar servicos MT:', error);
        throw error;
      }

      return (data || []) as MTService[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: Servicos por Franquia
  // ---------------------------------------------------------------------------

  const franchiseServicesQuery = useQuery({
    queryKey: [FRANCHISE_SERVICES_KEY, tenant?.id],
    queryFn: async (): Promise<MTFranchiseService[]> => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let q = supabase
        .from('mt_franchise_services')
        .select('*');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        // Tabela pode não existir ainda
        if (error.code === '42P01') {
          console.warn('Tabela mt_franchise_services não existe');
          return [];
        }
        console.error('Erro ao buscar franchise services:', error);
        return [];
      }

      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Servico
  // ---------------------------------------------------------------------------

  const createService = useMutation({
    mutationFn: async (newService: MTServiceCreate): Promise<MTService> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const serviceData = {
        ...newService,
        tenant_id: newService.tenant_id || tenant!.id,
        tipo: newService.tipo || 'servico',
        is_active: newService.is_active ?? true,
        disponivel_online: newService.disponivel_online ?? true,
        disponivel_agendamento: newService.disponivel_agendamento ?? true,
        requer_avaliacao: newService.requer_avaliacao ?? false,
        destaque: newService.destaque ?? false,
        ordem: newService.ordem ?? 0,
        moeda: newService.moeda || 'BRL',
        disponibilidade: newService.disponibilidade || 'in_stock',
        condicao: newService.condicao || 'new',
      };

      const { data, error } = await supabase
        .from('mt_services')
        .insert(serviceData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar servico MT:', error);
        throw error;
      }

      // Se franchise admin, vincular automaticamente à franquia
      if (franchise && data) {
        const { error: linkError } = await supabase
          .from('mt_franchise_services')
          .insert({
            franchise_id: franchise.id,
            service_id: data.id,
            tenant_id: data.tenant_id,
            is_active: true,
          });

        if (linkError) {
          console.warn('Erro ao vincular serviço à franquia:', linkError);
          // Não falha a criação, apenas avisa
        }
      }

      return data as MTService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [FRANCHISE_SERVICES_KEY] });
      toast.success(`Serviço "${data.nome}" criado com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Servico
  // ---------------------------------------------------------------------------

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: MTServiceUpdate): Promise<MTService> => {
      if (!id) {
        throw new Error('ID do serviço é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_services')
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
        console.error('Erro ao atualizar servico MT:', error);
        throw error;
      }

      return data as MTService;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Serviço "${data.nome}" atualizado!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Servico
  // ---------------------------------------------------------------------------

  const deleteService = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID do serviço é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar servico MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Serviço removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Vínculos Franquia-Serviço
  // ---------------------------------------------------------------------------

  const updateFranchiseServices = useMutation({
    mutationFn: async ({ franchiseId, serviceIds }: { franchiseId: string; serviceIds: string[] }): Promise<void> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const tenantId = tenant!.id;

      // 1. Deletar vínculos existentes dessa franquia
      const { error: deleteError } = await supabase
        .from('mt_franchise_services')
        .delete()
        .eq('franchise_id', franchiseId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        // Tabela pode não existir
        if (deleteError.code !== '42P01') {
          console.error('Erro ao deletar vínculos existentes:', deleteError);
          throw deleteError;
        }
      }

      // 2. Inserir novos vínculos
      if (serviceIds.length > 0) {
        const novosVinculos = serviceIds.map(serviceId => ({
          franchise_id: franchiseId,
          service_id: serviceId,
          tenant_id: tenantId,
          is_active: true,
        }));

        const { error: insertError } = await supabase
          .from('mt_franchise_services')
          .insert(novosVinculos);

        if (insertError) {
          console.error('Erro ao criar novos vínculos:', insertError);
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FRANCHISE_SERVICES_KEY] });
      toast.success('Vínculos de serviços atualizados!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helper: Obter serviços de uma franquia
  // ---------------------------------------------------------------------------

  const getServicesByFranchise = (franchiseId: string): MTService[] => {
    const vinculos = franchiseServicesQuery.data || [];
    const serviceIds = vinculos
      .filter(v => v.franchise_id === franchiseId && v.is_active)
      .map(v => v.service_id);

    return (query.data || []).filter(s => serviceIds.includes(s.id));
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    servicos: query.data ?? [],
    franchiseServices: franchiseServicesQuery.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: () => {
      query.refetch();
      franchiseServicesQuery.refetch();
    },

    createServico: {
      mutate: createService.mutate,
      mutateAsync: createService.mutateAsync,
      isPending: createService.isPending,
    },
    updateServico: {
      mutate: updateService.mutate,
      mutateAsync: updateService.mutateAsync,
      isPending: updateService.isPending,
    },
    deleteServico: {
      mutate: deleteService.mutate,
      mutateAsync: deleteService.mutateAsync,
      isPending: deleteService.isPending,
    },

    getServicesByFranchise,

    updateFranchiseServices: {
      mutate: updateFranchiseServices.mutate,
      mutateAsync: updateFranchiseServices.mutateAsync,
      isPending: updateFranchiseServices.isPending,
    },

    isCreating: createService.isPending,
    isUpdating: updateService.isPending,
    isDeleting: deleteService.isPending,
    isUpdatingFranchiseServices: updateFranchiseServices.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Servico por ID
// -----------------------------------------------------------------------------

export function useServicoMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTService | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_services')
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

      return data as MTService;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useServicosMT;
