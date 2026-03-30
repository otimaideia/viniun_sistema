// =============================================================================
// USE INFLUENCIADORAS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para influenciadoras usando tabelas MT
// SISTEMA 100% MT - Usa mt_influencers diretamente
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  InfluenciadoraStatus,
  InfluenciadoraTipo,
  InfluenciadoraTamanho,
  InfluenciadoraFormData,
  InfluenciadoraFilters,
  InfluenciadoraKPIs,
  InfluenciadoraRanking,
} from '@/types/influenciadora';

// =============================================================================
// Types
// =============================================================================

export interface InfluenciadoraAdaptada {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Dados Pessoais
  nome_completo: string;
  nome_artistico: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string;
  cpf: string | null;
  data_nascimento: string | null;
  genero: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  foto_perfil: string | null;
  biografia: string | null;
  tipo: InfluenciadoraTipo;
  tamanho: InfluenciadoraTamanho | null;

  // Código de indicação
  codigo_indicacao: string | null;
  quantidade_indicacoes: number;

  // Métricas
  total_seguidores: number;
  taxa_engajamento_media: number;

  // Status
  status: InfluenciadoraStatus;
  ativo: boolean;

  // Redes sociais
  instagram: string | null;
  instagram_seguidores: number | null;
  tiktok: string | null;
  tiktok_seguidores: number | null;
  youtube: string | null;
  youtube_inscritos: number | null;

  // Valores
  valor_post: number | null;
  valor_story: number | null;
  valor_reels: number | null;
  aceita_permuta: boolean;
  valor_gerado: number | string | null;
  nichos: string[] | null;
  publico_alvo: string | null;

  // Relacionamentos
  franqueado_id: string | null;
  unidade_id: string | null;
  franqueado?: {
    id: string;
    nome_fantasia?: string;
    nome_franquia?: string;
  };

  // Timestamps
  created_at: string;
  updated_at: string;

  // Onboarding
  onboarding_completed: boolean;
  aceite_termos: boolean;
  aceite_termos_at: string | null;

  // Extras
  notas: string | null;
  responsavel_id: string | null;
  responsavel?: {
    id: string;
    nome: string;
    cargo: string | null;
  } | null;

  // Dados Pessoais Adicionais (para contrato)
  rg?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  naturalidade?: string | null;

  // Redes sociais expandidas (da tabela mt_influencer_social_networks)
  redes_sociais?: {
    id: string;
    plataforma: string;
    username: string | null;
    url: string | null;
    seguidores: number;
    taxa_engajamento: number;
    verificado: boolean;
  }[];
}

interface MTInfluencerSocialNetwork {
  id: string;
  influencer_id: string;
  plataforma: string;
  usuario: string | null;
  url: string | null;
  seguidores: number | null;
  engajamento: number | null;
  verificado: boolean;
  created_at: string;
  updated_at: string;
}

interface MTInfluencer {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  nome_artistico: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  genero: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  foto_perfil: string | null;
  biografia: string | null;
  tipo: string | null;
  tamanho: string | null;
  codigo: string | null;
  total_indicacoes: number;
  total_conversoes: number;
  status: string;
  is_active: boolean;
  instagram: string | null;
  instagram_seguidores: number | null;
  tiktok: string | null;
  tiktok_seguidores: number | null;
  youtube: string | null;
  youtube_inscritos: number | null;
  valor_post: number | null;
  valor_story: number | null;
  valor_reels: number | null;
  aceita_permuta: boolean;
  valor_gerado: number | string | null;
  nichos: string[] | null;
  publico_alvo: string | null;
  notas: string | null;
  responsavel_id: string | null;
  // Dados Pessoais Adicionais
  rg?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  naturalidade?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  franchise?: {
    id: string;
    nome: string;
    nome_fantasia: string;
  } | null;
  responsavel?: {
    id: string;
    nome: string;
    cargo: string | null;
  } | null;
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
  // Redes sociais da tabela mt_influencer_social_networks
  social_networks?: MTInfluencerSocialNetwork[] | null;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-influenciadoras';

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTStatusToLegacy(mtStatus: string): InfluenciadoraStatus {
  const statusMap: Record<string, InfluenciadoraStatus> = {
    pending: 'pendente',
    approved: 'aprovado',
    rejected: 'rejeitado',
    suspended: 'suspenso',
    // Manter compatibilidade se já vier em português
    pendente: 'pendente',
    aprovado: 'aprovado',
    rejeitado: 'rejeitado',
    suspenso: 'suspenso',
  };
  return statusMap[mtStatus] || 'pendente';
}

function mapLegacyStatusToMT(legacyStatus: InfluenciadoraStatus): string {
  const statusMap: Record<InfluenciadoraStatus, string> = {
    pendente: 'pending',
    aprovado: 'approved',
    rejeitado: 'rejected',
    suspenso: 'suspended',
  };
  return statusMap[legacyStatus] || 'pending';
}

function mapMTToAdaptado(influencer: MTInfluencer): InfluenciadoraAdaptada {
  const totalSeguidores =
    (influencer.instagram_seguidores || 0) +
    (influencer.tiktok_seguidores || 0) +
    (influencer.youtube_inscritos || 0);

  return {
    id: influencer.id,
    tenant_id: influencer.tenant_id,
    franchise_id: influencer.franchise_id,

    // Dados Pessoais
    nome_completo: influencer.nome,
    nome_artistico: influencer.nome_artistico,
    email: influencer.email,
    telefone: influencer.telefone,
    whatsapp: influencer.whatsapp || '',
    cpf: influencer.cpf,
    data_nascimento: influencer.data_nascimento,
    genero: influencer.genero,
    cep: influencer.cep,
    endereco: influencer.endereco,
    numero: influencer.numero,
    complemento: influencer.complemento,
    bairro: influencer.bairro,
    cidade: influencer.cidade,
    estado: influencer.estado,
    pais: influencer.pais,
    foto_perfil: influencer.foto_perfil,
    biografia: influencer.biografia,
    tipo: (influencer.tipo as InfluenciadoraTipo) || 'influenciador',
    tamanho: influencer.tamanho as InfluenciadoraTamanho | null,

    // Código de indicação
    codigo_indicacao: influencer.codigo,
    quantidade_indicacoes: influencer.total_indicacoes || 0,

    // Métricas
    total_seguidores: totalSeguidores,
    taxa_engajamento_media: 0,

    // Status
    status: mapMTStatusToLegacy(influencer.status),
    ativo: influencer.is_active,

    // Redes sociais
    instagram: influencer.instagram,
    instagram_seguidores: influencer.instagram_seguidores,
    tiktok: influencer.tiktok,
    tiktok_seguidores: influencer.tiktok_seguidores,
    youtube: influencer.youtube,
    youtube_inscritos: influencer.youtube_inscritos,

    // Valores
    valor_post: influencer.valor_post,
    valor_story: influencer.valor_story,
    valor_reels: influencer.valor_reels,
    aceita_permuta: influencer.aceita_permuta || false,
    valor_gerado: influencer.valor_gerado ?? null,
    nichos: influencer.nichos ?? null,
    publico_alvo: influencer.publico_alvo ?? null,

    // Relacionamentos
    franqueado_id: influencer.franchise_id,
    unidade_id: influencer.franchise_id,
    franqueado: influencer.franchise
      ? {
          id: influencer.franchise.id,
          nome_fantasia: influencer.franchise.nome_fantasia,
          nome_franquia: influencer.franchise.nome_fantasia,
        }
      : undefined,

    // Timestamps
    created_at: influencer.created_at,
    updated_at: influencer.updated_at,

    // Onboarding
    onboarding_completed: influencer.onboarding_completed ?? false,
    aceite_termos: influencer.aceite_termos || false,
    aceite_termos_at: influencer.aceite_termos_at || null,

    // Extras
    notas: influencer.notas,
    responsavel_id: influencer.responsavel_id,
    responsavel: influencer.responsavel || null,

    // Dados Pessoais Adicionais
    rg: influencer.rg || null,
    estado_civil: influencer.estado_civil || null,
    profissao: influencer.profissao || null,
    naturalidade: influencer.naturalidade || null,

    // Redes sociais expandidas
    redes_sociais: influencer.social_networks?.map((sn) => ({
      id: sn.id,
      plataforma: sn.plataforma,
      username: sn.usuario,
      url: sn.url,
      seguidores: sn.seguidores || 0,
      taxa_engajamento: sn.engajamento ? Number(sn.engajamento) : 0,
      verificado: sn.verificado || false,
    })) || [],
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useInfluenciadorasAdapter(filtros: InfluenciadoraFilters = {}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Influenciadoras
  // ==========================================================================
  const {
    data: influenciadorasRaw = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filtros],
    queryFn: async (): Promise<MTInfluencer[]> => {
      let query = supabase
        .from('mt_influencers')
        .select(`
          *,
          franchise:mt_franchises(id, nome, nome_fantasia),
          tenant:mt_tenants(slug, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo),
          social_networks:mt_influencer_social_networks(id, plataforma, usuario, url, seguidores, engajamento, verificado, created_at, updated_at)
        `)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('tenant_id', tenant!.id);
        // Mostrar influenciadoras da franquia + sem franquia (novas cadastradas)
        query = query.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }
      // Platform admin vê todos

      // Filtros adicionais
      if (filtros.search) {
        query = query.or(`nome.ilike.%${filtros.search}%,nome_artistico.ilike.%${filtros.search}%,email.ilike.%${filtros.search}%`);
      }
      if (filtros.status) {
        query = query.eq('status', mapLegacyStatusToMT(filtros.status));
      }
      if (filtros.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros.tamanho) {
        query = query.eq('tamanho', filtros.tamanho);
      }
      if (filtros.ativo !== undefined) {
        query = query.eq('is_active', filtros.ativo);
      }
      if (filtros.franqueado_id || filtros.unidade_id) {
        query = query.eq('franchise_id', filtros.franqueado_id || filtros.unidade_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        if (fetchError.code === '42P01') {
          console.warn('[MT] mt_influencers table not found');
          return [];
        }
        throw fetchError;
      }

      return (data || []) as MTInfluencer[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Query: KPIs
  // ==========================================================================
  const { data: kpis } = useQuery({
    queryKey: [QUERY_KEY, 'kpis', tenant?.id, franchise?.id, accessLevel],
    queryFn: async (): Promise<InfluenciadoraKPIs> => {
      let query = supabase.from('mt_influencers').select('status, is_active, total_indicacoes, total_conversoes, instagram_seguidores, tiktok_seguidores, youtube_inscritos');

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('tenant_id', tenant!.id);
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError || !data) {
        return {
          total_influenciadoras: 0,
          influenciadoras_ativas: 0,
          influenciadoras_pendentes: 0,
          total_indicacoes: 0,
          indicacoes_convertidas: 0,
          taxa_conversao: 0,
          total_seguidores: 0,
          engajamento_medio: 0,
        };
      }

      const total = data.length;
      const ativas = data.filter((i) => i.is_active).length;
      const pendentes = data.filter((i) => i.status === 'pending' || i.status === 'pendente').length;
      const totalIndicacoes = data.reduce((acc, i) => acc + (i.total_indicacoes || 0), 0);
      const totalConversoes = data.reduce((acc, i) => acc + (i.total_conversoes || 0), 0);
      const totalSeguidores = data.reduce(
        (acc, i) =>
          acc + (i.instagram_seguidores || 0) + (i.tiktok_seguidores || 0) + (i.youtube_inscritos || 0),
        0
      );

      return {
        total_influenciadoras: total,
        influenciadoras_ativas: ativas,
        influenciadoras_pendentes: pendentes,
        total_indicacoes: totalIndicacoes,
        indicacoes_convertidas: totalConversoes,
        taxa_conversao: totalIndicacoes > 0 ? Math.round((totalConversoes / totalIndicacoes) * 100) : 0,
        total_seguidores: totalSeguidores,
        engajamento_medio: 0,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Query: Ranking
  // ==========================================================================
  const { data: ranking = [] } = useQuery({
    queryKey: [QUERY_KEY, 'ranking', tenant?.id, franchise?.id, accessLevel],
    queryFn: async (): Promise<InfluenciadoraRanking[]> => {
      let query = supabase
        .from('mt_influencers')
        .select('id, nome, nome_artistico, foto_perfil, codigo, total_indicacoes, total_conversoes, instagram_seguidores, tiktok_seguidores, youtube_inscritos')
        .eq('is_active', true)
        .order('total_indicacoes', { ascending: false })
        .limit(10);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('tenant_id', tenant!.id);
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError || !data) return [];

      return data.map((item, index) => {
        const totalSeguidores =
          (item.instagram_seguidores || 0) + (item.tiktok_seguidores || 0) + (item.youtube_inscritos || 0);

        return {
          posicao: index + 1,
          influenciadora_id: item.id,
          nome_completo: item.nome,
          nome_artistico: item.nome_artistico || undefined,
          foto_perfil: item.foto_perfil || undefined,
          codigo_indicacao: item.codigo || undefined,
          total_indicacoes: item.total_indicacoes || 0,
          indicacoes_convertidas: item.total_conversoes || 0,
          taxa_conversao:
            item.total_indicacoes > 0
              ? Math.round(((item.total_conversoes || 0) / item.total_indicacoes) * 100)
              : 0,
          total_seguidores: totalSeguidores,
        };
      });
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Criar Influenciadora
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (input: InfluenciadoraFormData) => {
      const { data, error: createError } = await supabase
        .from('mt_influencers')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: input.franqueado_id || input.unidade_id || franchise?.id || null,
          nome: input.nome_completo,
          nome_artistico: input.nome_artistico || null,
          email: input.email || null,
          telefone: input.telefone || null,
          whatsapp: input.whatsapp || null,
          cpf: input.cpf || null,
          data_nascimento: input.data_nascimento || null,
          genero: input.genero || null,
          cep: input.cep || null,
          endereco: input.endereco || null,
          numero: input.numero || null,
          complemento: input.complemento || null,
          bairro: input.bairro || null,
          cidade: input.cidade || null,
          estado: input.estado || null,
          pais: input.pais || 'Brasil',
          foto_perfil: input.foto_perfil || null,
          biografia: input.biografia || null,
          tipo: input.tipo || 'influenciador',
          tamanho: input.tamanho || null,
          responsavel_id: input.responsavel_id || null,
          status: 'pending',
          is_active: true,
        })
        .select(`
          *,
          franchise:mt_franchises(id, nome, nome_fantasia),
          tenant:mt_tenants(slug, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .single();

      if (createError) throw createError;
      return data as MTInfluencer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Influenciadora cadastrada com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao cadastrar influenciadora: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Influenciadora
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: Partial<InfluenciadoraFormData> }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.nome_completo !== undefined) updates.nome = input.nome_completo;
      if (input.nome_artistico !== undefined) updates.nome_artistico = input.nome_artistico;
      if (input.email !== undefined) updates.email = input.email;
      if (input.telefone !== undefined) updates.telefone = input.telefone;
      if (input.whatsapp !== undefined) updates.whatsapp = input.whatsapp;
      if (input.cpf !== undefined) updates.cpf = input.cpf;
      if (input.data_nascimento !== undefined) updates.data_nascimento = input.data_nascimento;
      if (input.genero !== undefined) updates.genero = input.genero || null;
      if (input.cep !== undefined) updates.cep = input.cep || null;
      if (input.endereco !== undefined) updates.endereco = input.endereco || null;
      if (input.numero !== undefined) updates.numero = input.numero || null;
      if (input.complemento !== undefined) updates.complemento = input.complemento || null;
      if (input.bairro !== undefined) updates.bairro = input.bairro || null;
      if (input.cidade !== undefined) updates.cidade = input.cidade || null;
      if (input.estado !== undefined) updates.estado = input.estado || null;
      if (input.pais !== undefined) updates.pais = input.pais || 'Brasil';
      if (input.foto_perfil !== undefined) updates.foto_perfil = input.foto_perfil;
      if (input.biografia !== undefined) updates.biografia = input.biografia;
      if (input.tipo !== undefined) updates.tipo = input.tipo;
      if (input.tamanho !== undefined) updates.tamanho = input.tamanho;
      if (input.franqueado_id !== undefined || input.unidade_id !== undefined) {
        updates.franchise_id = input.franqueado_id || input.unidade_id;
      }
      if (input.responsavel_id !== undefined) {
        updates.responsavel_id = input.responsavel_id || null;
      }

      const { data, error: updateError } = await supabase
        .from('mt_influencers')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          franchise:mt_franchises(id, nome, nome_fantasia),
          tenant:mt_tenants(slug, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo)
        `)
        .single();

      if (updateError) throw updateError;
      return data as MTInfluencer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Influenciadora atualizada com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar influenciadora: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Status
  // ==========================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InfluenciadoraStatus }) => {
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({
          status: mapLegacyStatusToMT(status),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Toggle Ativo
  // ==========================================================================
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({
          is_active: ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(ativo ? 'Influenciadora ativada' : 'Influenciadora desativada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Influenciadora
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from('mt_influencers').delete().eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Influenciadora excluída com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir influenciadora: ${err.message}`);
    },
  });

  // ==========================================================================
  // Helpers
  // ==========================================================================
  const getInfluenciadora = async (id: string): Promise<InfluenciadoraAdaptada | null> => {
    const { data, error } = await supabase
      .from('mt_influencers')
      .select(`
        *,
        franchise:mt_franchises(id, nome, nome_fantasia),
        tenant:mt_tenants(slug, nome_fantasia),
        social_networks:mt_influencer_social_networks(id, plataforma, usuario, url, seguidores, engajamento, verificado, created_at, updated_at)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapMTToAdaptado(data as MTInfluencer);
  };

  const getInfluenciadoraByCodigo = async (codigo: string): Promise<InfluenciadoraAdaptada | null> => {
    const { data, error } = await supabase
      .from('mt_influencers')
      .select(`
        *,
        franchise:mt_franchises(id, nome, nome_fantasia),
        tenant:mt_tenants(slug, nome_fantasia),
        social_networks:mt_influencer_social_networks(id, plataforma, usuario, url, seguidores, engajamento, verificado, created_at, updated_at)
      `)
      .eq('codigo', codigo)
      .single();

    if (error || !data) return null;
    return mapMTToAdaptado(data as MTInfluencer);
  };

  const checkWhatsAppExists = async (whatsapp: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from('mt_influencers').select('id').eq('whatsapp', whatsapp);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    if (tenant) {
      query = query.eq('tenant_id', tenant.id);
    }

    const { data } = await query.limit(1);
    return (data?.length || 0) > 0;
  };

  const checkEmailExists = async (email: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from('mt_influencers').select('id').eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    if (tenant) {
      query = query.eq('tenant_id', tenant.id);
    }

    const { data } = await query.limit(1);
    return (data?.length || 0) > 0;
  };

  const checkCPFExists = async (cpf: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from('mt_influencers').select('id').eq('cpf', cpf);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    if (tenant) {
      query = query.eq('tenant_id', tenant.id);
    }

    const { data } = await query.limit(1);
    return (data?.length || 0) > 0;
  };

  // Mapear para formato adaptado
  const influenciadoras = influenciadorasRaw.map(mapMTToAdaptado);

  return {
    influenciadoras,
    kpis,
    ranking,
    isLoading: isLoading || isTenantLoading,
    isFetching,
    error,
    refetch,

    // Mutations
    create: (data: InfluenciadoraFormData) => createMutation.mutate(data),
    createAsync: async (data: InfluenciadoraFormData) => {
      const result = await createMutation.mutateAsync(data);
      return mapMTToAdaptado(result);
    },
    update: (params: { id: string; data: Partial<InfluenciadoraFormData> }) => updateMutation.mutate(params),
    updateAsync: async (params: { id: string; data: Partial<InfluenciadoraFormData> }) => {
      const result = await updateMutation.mutateAsync(params);
      return mapMTToAdaptado(result);
    },
    updateStatus: (params: { id: string; status: InfluenciadoraStatus }) => updateStatusMutation.mutate(params),
    toggleAtivo: (params: { id: string; ativo: boolean }) => toggleAtivoMutation.mutate(params),
    delete: (id: string) => deleteMutation.mutate(id),

    // Helpers
    getInfluenciadora,
    getInfluenciadoraByCodigo,
    checkWhatsAppExists,
    checkEmailExists,
    checkCPFExists,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isTogglingAtivo: toggleAtivoMutation.isPending,
    isDeleting: deleteMutation.isPending,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Influenciadora Individual
// =============================================================================

export function useInfluenciadoraAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: influenciadoraRaw,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'single', id, tenant?.id],
    queryFn: async (): Promise<MTInfluencer | null> => {
      if (!id) return null;

      const { data, error: fetchError } = await supabase
        .from('mt_influencers')
        .select(`
          *,
          franchise:mt_franchises(id, nome, nome_fantasia),
          tenant:mt_tenants(slug, nome_fantasia),
          responsavel:mt_users!responsavel_id(id, nome, cargo),
          social_networks:mt_influencer_social_networks(id, plataforma, usuario, url, seguidores, engajamento, verificado, created_at, updated_at)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return null;
        throw fetchError;
      }

      return data as MTInfluencer;
    },
    enabled: !isTenantLoading && !!id && (!!tenant || accessLevel === 'platform'),
  });

  return {
    influenciadora: influenciadoraRaw ? mapMTToAdaptado(influenciadoraRaw) : null,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type {
  InfluenciadoraStatus,
  InfluenciadoraTipo,
  InfluenciadoraTamanho,
  InfluenciadoraFormData,
  InfluenciadoraFilters,
  InfluenciadoraKPIs,
  InfluenciadoraRanking,
} from '@/types/influenciadora';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getInfluenciadoraMode(): 'mt' {
  return 'mt';
}

export default useInfluenciadorasAdapter;
