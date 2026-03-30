// =============================================================================
// USE PARCERIAS MT - Hook Multi-Tenant para Gerenciamento de Parcerias
// =============================================================================
//
// Este hook fornece CRUD completo para mt_partnerships
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTPartnershipStatus = 'ativo' | 'inativo' | 'pendente' | 'suspenso';
export type MTPartnershipType = 'comercial' | 'permuta' | 'indicacao' | 'franquia' | 'outro';

export interface MTPartnership {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  codigo: string | null;
  nome_empresa: string;
  nome_fantasia: string | null;
  cnpj: string | null;

  // Contato
  contato_nome: string | null;
  contato_cargo: string | null;
  contato_telefone: string | null;
  contato_email: string | null;

  // Endereço
  cidade: string | null;
  estado: string | null;

  // Tipo de parceria
  tipo: MTPartnershipType | null;
  segmento: string | null;

  // Benefícios
  desconto_percentual: number | null;
  desconto_valor_fixo: number | null;
  beneficios_extras: string | null;

  // Métricas
  total_indicacoes: number;
  total_conversoes: number;
  valor_gerado: number;

  // QR Code
  qr_code_url: string | null;
  qr_code_acessos: number;

  // Portal
  portal_usuario: string | null;
  portal_senha_hash: string | null;
  ultimo_login: string | null;

  // Mídia
  logo_url: string | null;
  website: string | null;
  descricao: string | null;

  // Status
  status: MTPartnershipStatus;
  is_active: boolean;
  notas: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Consultora responsável
  responsavel_id: string | null;
  responsavel?: {
    id: string;
    nome: string;
    cargo: string | null;
  } | null;

  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface MTPartnershipCreate {
  nome_empresa: string;
  tenant_id?: string;
  franchise_id?: string | null;
  codigo?: string;
  nome_fantasia?: string;
  cnpj?: string;
  contato_nome?: string;
  contato_cargo?: string;
  contato_telefone?: string;
  contato_email?: string;
  cidade?: string;
  estado?: string;
  tipo?: MTPartnershipType;
  segmento?: string;
  desconto_percentual?: number;
  desconto_valor_fixo?: number;
  beneficios_extras?: string;
  logo_url?: string;
  website?: string;
  descricao?: string;
  status?: MTPartnershipStatus;
  is_active?: boolean;
  notas?: string;
  responsavel_id?: string | null;
}

export interface MTPartnershipUpdate extends Partial<MTPartnershipCreate> {
  id: string;
}

export interface MTPartnershipFilters {
  search?: string;
  status?: MTPartnershipStatus;
  tipo?: MTPartnershipType;
  segmento?: string;
  is_active?: boolean;
  franchise_id?: string;
  cidade?: string;
  estado?: string;
}

export interface MTPartnershipKPIs {
  total_parcerias: number;
  parcerias_ativas: number;
  parcerias_inativas: number;
  parcerias_pendentes: number;
  total_indicacoes: number;
  total_conversoes: number;
  taxa_conversao: number;
  valor_gerado_total: number;
}

export interface MTPartnershipRanking {
  posicao: number;
  parceria_id: string;
  nome_fantasia: string | null;
  codigo: string | null;
  logo_url: string | null;
  total_indicacoes: number;
  total_conversoes: number;
  taxa_conversao: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-partnerships';
const KPI_QUERY_KEY = 'mt-partnerships-kpis';
const RANKING_QUERY_KEY = 'mt-partnerships-ranking';

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
        if (error?.message?.includes('cnpj')) {
          return 'CNPJ já cadastrado em outra parceria.';
        }
        return 'Este código de parceria já existe.';
      case '23503':
        return 'Esta parceria está vinculada a outros dados.';
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

export function useParceriasMT(filters?: MTPartnershipFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Parcerias
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.status, filters?.is_active, filters?.search, filters?.tipo, filters?.segmento],
    queryFn: async (): Promise<MTPartnership[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_partnerships')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }

      if (filters?.segmento) {
        q = q.eq('segmento', filters.segmento);
      }

      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      if (filters?.cidade) {
        q = q.ilike('cidade', `%${filters.cidade}%`);
      }

      if (filters?.estado) {
        q = q.eq('estado', filters.estado);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome_empresa.ilike.${searchTerm},nome_fantasia.ilike.${searchTerm},cnpj.ilike.${searchTerm},codigo.ilike.${searchTerm},contato_nome.ilike.${searchTerm},contato_email.ilike.${searchTerm},cidade.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar parcerias MT:', error);
        throw error;
      }

      return (data || []) as MTPartnership[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: KPIs de Parcerias
  // ---------------------------------------------------------------------------

  const kpisQuery = useQuery({
    queryKey: [KPI_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTPartnershipKPIs> => {
      if (!tenant && accessLevel !== 'platform') {
        return {
          total_parcerias: 0,
          parcerias_ativas: 0,
          parcerias_inativas: 0,
          parcerias_pendentes: 0,
          total_indicacoes: 0,
          total_conversoes: 0,
          taxa_conversao: 0,
          valor_gerado_total: 0,
        };
      }

      let q = supabase
        .from('mt_partnerships')
        .select('id, status, is_active, total_indicacoes, total_conversoes, valor_gerado');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar KPIs:', error);
        throw error;
      }

      const parcerias = data || [];
      const total = parcerias.length;
      const ativas = parcerias.filter((p) => p.status === 'ativo' && p.is_active).length;
      const inativas = parcerias.filter((p) => p.status === 'inativo' || !p.is_active).length;
      const pendentes = parcerias.filter((p) => p.status === 'pendente').length;
      const totalIndicacoes = parcerias.reduce((sum, p) => sum + (p.total_indicacoes || 0), 0);
      const totalConversoes = parcerias.reduce((sum, p) => sum + (p.total_conversoes || 0), 0);
      const valorGeradoTotal = parcerias.reduce((sum, p) => sum + (p.valor_gerado || 0), 0);

      const taxaConversao = totalIndicacoes > 0 ? (totalConversoes / totalIndicacoes) * 100 : 0;

      return {
        total_parcerias: total,
        parcerias_ativas: ativas,
        parcerias_inativas: inativas,
        parcerias_pendentes: pendentes,
        total_indicacoes: totalIndicacoes,
        total_conversoes: totalConversoes,
        taxa_conversao: Math.round(taxaConversao * 10) / 10,
        valor_gerado_total: valorGeradoTotal,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Query: Ranking
  // ---------------------------------------------------------------------------

  const rankingQuery = useQuery({
    queryKey: [RANKING_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTPartnershipRanking[]> => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let q = supabase
        .from('mt_partnerships')
        .select(`
          id,
          nome_fantasia,
          codigo,
          logo_url,
          total_indicacoes,
          total_conversoes
        `)
        .eq('status', 'ativo')
        .eq('is_active', true)
        .gt('total_indicacoes', 0)
        .order('total_indicacoes', { ascending: false })
        .limit(10);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar ranking:', error);
        return [];
      }

      return (data || []).map((p, index) => {
        const taxaConversao =
          p.total_indicacoes > 0
            ? (p.total_conversoes / p.total_indicacoes) * 100
            : 0;

        return {
          posicao: index + 1,
          parceria_id: p.id,
          nome_fantasia: p.nome_fantasia,
          codigo: p.codigo,
          logo_url: p.logo_url,
          total_indicacoes: p.total_indicacoes || 0,
          total_conversoes: p.total_conversoes || 0,
          taxa_conversao: Math.round(taxaConversao * 10) / 10,
        };
      });
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Parceria
  // ---------------------------------------------------------------------------

  const createPartnership = useMutation({
    mutationFn: async (newPartnership: MTPartnershipCreate): Promise<MTPartnership> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const partnershipData = {
        ...newPartnership,
        tenant_id: newPartnership.tenant_id || tenant!.id,
        is_active: newPartnership.is_active ?? true,
        status: newPartnership.status ?? 'pendente',
        total_indicacoes: 0,
        total_conversoes: 0,
        valor_gerado: 0,
        qr_code_acessos: 0,
      };

      const { data, error } = await supabase
        .from('mt_partnerships')
        .insert(partnershipData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar parceria MT:', error);
        throw error;
      }

      return data as MTPartnership;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      toast.success(`Parceria "${data.nome_empresa}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Parceria
  // ---------------------------------------------------------------------------

  const updatePartnership = useMutation({
    mutationFn: async ({ id, ...updates }: MTPartnershipUpdate): Promise<MTPartnership> => {
      if (!id) {
        throw new Error('ID da parceria é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_partnerships')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar parceria MT:', error);
        throw error;
      }

      return data as MTPartnership;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RANKING_QUERY_KEY] });
      toast.success(`Parceria "${data.nome_empresa}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTPartnershipStatus }): Promise<void> => {
      const { error } = await supabase
        .from('mt_partnerships')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Parceria
  // ---------------------------------------------------------------------------

  const deletePartnership = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da parceria é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_partnerships')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar parceria MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RANKING_QUERY_KEY] });
      toast.success('Parceria removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getParceria = async (id: string): Promise<MTPartnership | null> => {
    const { data, error } = await supabase
      .from('mt_partnerships')
      .select(`
        *,
        tenant:mt_tenants (id, slug, nome_fantasia),
        franchise:mt_franchises (id, nome_fantasia)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar parceria:', error);
      return null;
    }

    return data as MTPartnership | null;
  };

  const getParceriaByCodigo = async (codigo: string): Promise<MTPartnership | null> => {
    let q = supabase
      .from('mt_partnerships')
      .select(`
        *,
        tenant:mt_tenants (id, slug, nome_fantasia),
        franchise:mt_franchises (id, nome_fantasia)
      `)
      .eq('codigo', codigo.toUpperCase())
      .eq('status', 'ativo');

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data, error } = await q.maybeSingle();

    if (error) {
      console.error('Erro ao buscar parceria pelo código:', error);
      return null;
    }

    return data as MTPartnership | null;
  };

  const checkCNPJExists = async (cnpj: string, excludeId?: string): Promise<boolean> => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    let q = supabase
      .from('mt_partnerships')
      .select('id')
      .eq('cnpj', cleanCNPJ);

    if (excludeId) {
      q = q.neq('id', excludeId);
    }

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data } = await q.maybeSingle();
    return !!data;
  };

  const checkCodigoExists = async (codigo: string, excludeId?: string): Promise<boolean> => {
    let q = supabase
      .from('mt_partnerships')
      .select('id')
      .eq('codigo', codigo.toUpperCase());

    if (excludeId) {
      q = q.neq('id', excludeId);
    }

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data } = await q.maybeSingle();
    return !!data;
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    parcerias: query.data ?? [],
    kpis: kpisQuery.data,
    ranking: rankingQuery.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: () => {
      query.refetch();
      kpisQuery.refetch();
      rankingQuery.refetch();
    },

    // Mutations
    createParceria: {
      mutate: createPartnership.mutate,
      mutateAsync: createPartnership.mutateAsync,
      isPending: createPartnership.isPending,
    },
    updateParceria: {
      mutate: updatePartnership.mutate,
      mutateAsync: updatePartnership.mutateAsync,
      isPending: updatePartnership.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    deleteParceria: {
      mutate: deletePartnership.mutate,
      mutateAsync: deletePartnership.mutateAsync,
      isPending: deletePartnership.isPending,
    },

    // Helpers
    getParceria,
    getParceriaByCodigo,
    checkCNPJExists,
    checkCodigoExists,

    isCreating: createPartnership.isPending,
    isUpdating: updatePartnership.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isDeleting: deletePartnership.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Parceria por ID
// -----------------------------------------------------------------------------

export function useParceriaMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPartnership | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_partnerships')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTPartnership;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Buscar Parceria por Código (público)
// -----------------------------------------------------------------------------

export function useParceriaByCodigo(codigo: string | null) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'codigo', codigo, tenant?.id],
    queryFn: async (): Promise<MTPartnership | null> => {
      if (!codigo) return null;

      let q = supabase
        .from('mt_partnerships')
        .select(`
          id,
          nome_empresa,
          nome_fantasia,
          codigo,
          logo_url,
          descricao,
          website,
          desconto_percentual,
          desconto_valor_fixo,
          beneficios_extras
        `)
        .eq('codigo', codigo.toUpperCase())
        .eq('status', 'ativo')
        .eq('is_active', true);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.maybeSingle();

      if (error) {
        console.error('Erro ao buscar parceria por código:', error);
        return null;
      }

      return data as MTPartnership | null;
    },
    enabled: !!codigo && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useParceriasMT;
