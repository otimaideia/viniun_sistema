// =============================================================================
// USE INFLUENCIADORAS MT - Hook Multi-Tenant para Gerenciamento de Influenciadoras
// =============================================================================
//
// Este hook fornece CRUD completo para mt_influencers
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTInfluencerStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso';
export type MTInfluencerTipo = 'influenciador' | 'ugc_creator' | 'ambos';
export type MTInfluencerTamanho = 'nano' | 'micro' | 'medio' | 'macro' | 'mega';

export interface MTInfluencer {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  codigo: string | null;
  nome: string;
  nome_artistico: string | null;
  email: string | null;

  // Contato
  telefone: string | null;
  whatsapp: string | null;

  // Documentos
  cpf: string | null;
  data_nascimento: string | null;

  // Endereço
  cidade: string | null;
  estado: string | null;

  // Redes Sociais
  instagram: string | null;
  instagram_seguidores: number | null;
  tiktok: string | null;
  tiktok_seguidores: number | null;
  youtube: string | null;
  youtube_inscritos: number | null;

  // Nicho
  nichos: string[] | null;
  publico_alvo: string | null;

  // Valores
  valor_post: number | null;
  valor_story: number | null;
  valor_reels: number | null;
  aceita_permuta: boolean;

  // Métricas
  total_indicacoes: number;
  total_conversoes: number;
  valor_gerado: number;

  // Avaliação
  rating: number | null;
  total_avaliacoes: number;

  // Status
  status: MTInfluencerStatus;
  is_active: boolean;
  notas: string | null;

  // Perfil extra
  tipo: MTInfluencerTipo | null;
  tamanho: MTInfluencerTamanho | null;
  foto_perfil: string | null;
  biografia: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;

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

export interface MTInfluencerCreate {
  nome: string;
  tenant_id?: string;
  franchise_id?: string | null;
  codigo?: string;
  nome_artistico?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cpf?: string;
  data_nascimento?: string;
  cidade?: string;
  estado?: string;
  instagram?: string;
  instagram_seguidores?: number;
  tiktok?: string;
  tiktok_seguidores?: number;
  youtube?: string;
  youtube_inscritos?: number;
  nichos?: string[];
  publico_alvo?: string;
  valor_post?: number;
  valor_story?: number;
  valor_reels?: number;
  aceita_permuta?: boolean;
  status?: MTInfluencerStatus;
  is_active?: boolean;
  tipo?: MTInfluencerTipo;
  tamanho?: MTInfluencerTamanho;
  foto_perfil?: string;
  biografia?: string;
  notas?: string;
}

export interface MTInfluencerUpdate extends Partial<MTInfluencerCreate> {
  id: string;
}

export interface MTInfluencerFilters {
  search?: string;
  status?: MTInfluencerStatus;
  tipo?: MTInfluencerTipo;
  tamanho?: MTInfluencerTamanho;
  is_active?: boolean;
  franchise_id?: string;
}

export interface MTInfluencerKPIs {
  total_influenciadoras: number;
  influenciadoras_ativas: number;
  influenciadoras_pendentes: number;
  total_indicacoes: number;
  total_conversoes: number;
  taxa_conversao: number;
  total_seguidores: number;
  valor_gerado_total: number;
}

export interface MTInfluencerRanking {
  posicao: number;
  influenciadora_id: string;
  nome: string;
  nome_artistico: string | null;
  foto_perfil: string | null;
  codigo: string | null;
  total_indicacoes: number;
  total_conversoes: number;
  taxa_conversao: number;
  total_seguidores: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-influencers';
const KPI_QUERY_KEY = 'mt-influencers-kpis';
const RANKING_QUERY_KEY = 'mt-influencers-ranking';

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
        return 'Este código de influenciadora já existe.';
      case '23503':
        return 'Esta influenciadora está vinculada a outros dados.';
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

function calculateTotalFollowers(influencer: MTInfluencer): number {
  return (
    (influencer.instagram_seguidores || 0) +
    (influencer.tiktok_seguidores || 0) +
    (influencer.youtube_inscritos || 0)
  );
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useInfluenciadorasMT(filters?: MTInfluencerFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Influenciadoras
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.status, filters?.is_active, filters?.search, filters?.tipo, filters?.tamanho],
    queryFn: async (): Promise<MTInfluencer[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_influencers')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
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

      if (filters?.tamanho) {
        q = q.eq('tamanho', filters.tamanho);
      }

      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},nome_artistico.ilike.${searchTerm},email.ilike.${searchTerm},codigo.ilike.${searchTerm},whatsapp.ilike.${searchTerm},cidade.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar influenciadoras MT:', error);
        throw error;
      }

      return (data || []) as MTInfluencer[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: KPIs de Influenciadoras
  // ---------------------------------------------------------------------------

  const kpisQuery = useQuery({
    queryKey: [KPI_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTInfluencerKPIs> => {
      if (!tenant && accessLevel !== 'platform') {
        return {
          total_influenciadoras: 0,
          influenciadoras_ativas: 0,
          influenciadoras_pendentes: 0,
          total_indicacoes: 0,
          total_conversoes: 0,
          taxa_conversao: 0,
          total_seguidores: 0,
          valor_gerado_total: 0,
        };
      }

      let q = supabase
        .from('mt_influencers')
        .select('id, status, is_active, total_indicacoes, total_conversoes, valor_gerado, instagram_seguidores, tiktok_seguidores, youtube_inscritos');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar KPIs:', error);
        throw error;
      }

      const infs = data || [];
      const total = infs.length;
      const ativas = infs.filter((i) => i.is_active && i.status === 'aprovado').length;
      const pendentes = infs.filter((i) => i.status === 'pendente').length;
      const totalIndicacoes = infs.reduce((sum, i) => sum + (i.total_indicacoes || 0), 0);
      const totalConversoes = infs.reduce((sum, i) => sum + (i.total_conversoes || 0), 0);
      const valorGeradoTotal = infs.reduce((sum, i) => sum + (i.valor_gerado || 0), 0);
      const totalSeguidores = infs.reduce((sum, i) => (
        sum +
        (i.instagram_seguidores || 0) +
        (i.tiktok_seguidores || 0) +
        (i.youtube_inscritos || 0)
      ), 0);

      const taxaConversao = totalIndicacoes > 0 ? (totalConversoes / totalIndicacoes) * 100 : 0;

      return {
        total_influenciadoras: total,
        influenciadoras_ativas: ativas,
        influenciadoras_pendentes: pendentes,
        total_indicacoes: totalIndicacoes,
        total_conversoes: totalConversoes,
        taxa_conversao: Math.round(taxaConversao * 10) / 10,
        total_seguidores: totalSeguidores,
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
    queryFn: async (): Promise<MTInfluencerRanking[]> => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let q = supabase
        .from('mt_influencers')
        .select(`
          id,
          nome,
          nome_artistico,
          foto_perfil,
          codigo,
          total_indicacoes,
          total_conversoes,
          instagram_seguidores,
          tiktok_seguidores,
          youtube_inscritos
        `)
        .eq('status', 'aprovado')
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

      return (data || []).map((inf, index) => {
        const totalSeguidores =
          (inf.instagram_seguidores || 0) +
          (inf.tiktok_seguidores || 0) +
          (inf.youtube_inscritos || 0);

        const taxaConversao =
          inf.total_indicacoes > 0
            ? (inf.total_conversoes / inf.total_indicacoes) * 100
            : 0;

        return {
          posicao: index + 1,
          influenciadora_id: inf.id,
          nome: inf.nome,
          nome_artistico: inf.nome_artistico,
          foto_perfil: inf.foto_perfil,
          codigo: inf.codigo,
          total_indicacoes: inf.total_indicacoes || 0,
          total_conversoes: inf.total_conversoes || 0,
          taxa_conversao: Math.round(taxaConversao * 10) / 10,
          total_seguidores: totalSeguidores,
        };
      });
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Influenciadora
  // ---------------------------------------------------------------------------

  const createInfluencer = useMutation({
    mutationFn: async (newInfluencer: MTInfluencerCreate): Promise<MTInfluencer> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const influencerData = {
        ...newInfluencer,
        tenant_id: newInfluencer.tenant_id || tenant!.id,
        is_active: newInfluencer.is_active ?? true,
        status: newInfluencer.status ?? 'pendente',
        aceita_permuta: newInfluencer.aceita_permuta ?? true,
        total_indicacoes: 0,
        total_conversoes: 0,
        valor_gerado: 0,
        total_avaliacoes: 0,
      };

      const { data, error } = await supabase
        .from('mt_influencers')
        .insert(influencerData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar influenciadora MT:', error);
        throw error;
      }

      return data as MTInfluencer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      toast.success(`Influenciadora "${data.nome}" cadastrada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Influenciadora
  // ---------------------------------------------------------------------------

  const updateInfluencer = useMutation({
    mutationFn: async ({ id, ...updates }: MTInfluencerUpdate): Promise<MTInfluencer> => {
      if (!id) {
        throw new Error('ID da influenciadora é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_influencers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar influenciadora MT:', error);
        throw error;
      }

      return data as MTInfluencer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RANKING_QUERY_KEY] });
      toast.success(`Influenciadora "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTInfluencerStatus }): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencers')
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
  // Mutation: Toggle Ativo
  // ---------------------------------------------------------------------------

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencers')
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao alterar status ativo:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      toast.success(variables.is_active ? 'Influenciadora ativada!' : 'Influenciadora desativada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Influenciadora
  // ---------------------------------------------------------------------------

  const deleteInfluencer = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da influenciadora é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_influencers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar influenciadora MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KPI_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RANKING_QUERY_KEY] });
      toast.success('Influenciadora removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getInfluenciadora = async (id: string): Promise<MTInfluencer | null> => {
    const { data, error } = await supabase
      .from('mt_influencers')
      .select(`
        *,
        tenant:mt_tenants (id, slug, nome_fantasia),
        franchise:mt_franchises (id, nome_fantasia)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar influenciadora:', error);
      return null;
    }

    return data as MTInfluencer | null;
  };

  const getInfluenciadoraByCodigo = async (codigo: string): Promise<MTInfluencer | null> => {
    const { data, error } = await supabase
      .from('mt_influencers')
      .select(`
        *,
        tenant:mt_tenants (id, slug, nome_fantasia),
        franchise:mt_franchises (id, nome_fantasia)
      `)
      .eq('codigo', codigo.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar influenciadora pelo código:', error);
      return null;
    }

    return data as MTInfluencer | null;
  };

  const checkWhatsAppExists = async (whatsapp: string, excludeId?: string): Promise<boolean> => {
    const cleanWhatsApp = whatsapp.replace(/\D/g, '');

    let q = supabase
      .from('mt_influencers')
      .select('id')
      .eq('whatsapp', cleanWhatsApp);

    if (excludeId) {
      q = q.neq('id', excludeId);
    }

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data } = await q;
    return (data?.length || 0) > 0;
  };

  const checkEmailExists = async (email: string, excludeId?: string): Promise<boolean> => {
    let q = supabase
      .from('mt_influencers')
      .select('id')
      .eq('email', email.toLowerCase());

    if (excludeId) {
      q = q.neq('id', excludeId);
    }

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data } = await q;
    return (data?.length || 0) > 0;
  };

  const checkCodigoExists = async (codigo: string, excludeId?: string): Promise<boolean> => {
    let q = supabase
      .from('mt_influencers')
      .select('id')
      .eq('codigo', codigo.toUpperCase());

    if (excludeId) {
      q = q.neq('id', excludeId);
    }

    if (accessLevel !== 'platform' && tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data } = await q;
    return (data?.length || 0) > 0;
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    influenciadoras: query.data ?? [],
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
    createInfluenciadora: {
      mutate: createInfluencer.mutate,
      mutateAsync: createInfluencer.mutateAsync,
      isPending: createInfluencer.isPending,
    },
    updateInfluenciadora: {
      mutate: updateInfluencer.mutate,
      mutateAsync: updateInfluencer.mutateAsync,
      isPending: updateInfluencer.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    toggleAtivo: {
      mutate: toggleAtivo.mutate,
      mutateAsync: toggleAtivo.mutateAsync,
      isPending: toggleAtivo.isPending,
    },
    deleteInfluenciadora: {
      mutate: deleteInfluencer.mutate,
      mutateAsync: deleteInfluencer.mutateAsync,
      isPending: deleteInfluencer.isPending,
    },

    // Helpers
    getInfluenciadora,
    getInfluenciadoraByCodigo,
    checkWhatsAppExists,
    checkEmailExists,
    checkCodigoExists,

    isCreating: createInfluencer.isPending,
    isUpdating: updateInfluencer.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isTogglingAtivo: toggleAtivo.isPending,
    isDeleting: deleteInfluencer.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Influenciadora por ID
// -----------------------------------------------------------------------------

export function useInfluenciadoraMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTInfluencer | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_influencers')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTInfluencer;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useInfluenciadorasMT;
