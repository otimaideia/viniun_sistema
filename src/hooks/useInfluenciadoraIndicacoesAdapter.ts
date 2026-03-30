// =============================================================================
// USE INFLUENCIADORA INDICACOES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para indicações de influenciadoras usando tabelas MT
// SISTEMA 100% MT - Usa mt_influencer_referrals diretamente
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { IndicacaoStatus, InfluenciadoraIndicacao } from '@/types/influenciadora';

// =============================================================================
// Types
// =============================================================================

export interface IndicacaoAdaptada {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  influenciadora_id: string;
  lead_id: string | null;
  codigo_usado: string | null;
  campanha: string | null;
  landing_page: string | null;
  status: IndicacaoStatus;
  data_indicacao: string;
  data_conversao: string | null;
  valor_comissao: number | null;
  observacoes: string | null;
  created_at: string;
  // Relacionamentos
  influenciadora?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    codigo: string | null;
    foto_perfil: string | null;
  } | null;
  lead?: {
    id: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    status: string | null;
  } | null;
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
}

interface MTReferral {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  influencer_id: string;
  lead_id: string | null;
  codigo_usado: string | null;
  status: string;
  valor_servico: number | null;
  comissao: number | null;
  data_conversao: string | null;
  created_at: string;
  // Relacionamentos
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    codigo: string | null;
    foto_perfil: string | null;
  } | null;
  lead?: {
    id: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
    status: string | null;
  } | null;
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
}

export interface IndicacaoCreateInput {
  influenciadora_id: string;
  lead_id?: string | null;
  codigo_usado?: string | null;
  campanha?: string | null;
  landing_page?: string | null;
  status?: IndicacaoStatus;
  data_indicacao?: string;
  valor_comissao?: number | null;
  observacoes?: string | null;
}

export interface IndicacaoUpdateInput extends Partial<IndicacaoCreateInput> {
  id: string;
}

export interface IndicacaoFilters {
  influenciadoraId?: string;
  status?: IndicacaoStatus;
  campanha?: string;
  dataInicio?: string;
  dataFim?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-influenciadora-indicacoes';

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTStatusToLegacy(mtStatus: string): IndicacaoStatus {
  const statusMap: Record<string, IndicacaoStatus> = {
    pending: 'pendente',
    converted: 'convertido',
    lost: 'perdido',
    cancelled: 'cancelado',
    // Manter compatibilidade se já vier em português
    pendente: 'pendente',
    convertido: 'convertido',
    perdido: 'perdido',
    cancelado: 'cancelado',
  };
  return statusMap[mtStatus] || 'pendente';
}

function mapLegacyStatusToMT(legacyStatus: IndicacaoStatus): string {
  const statusMap: Record<IndicacaoStatus, string> = {
    pendente: 'pending',
    convertido: 'converted',
    perdido: 'lost',
    cancelado: 'cancelled',
  };
  return statusMap[legacyStatus] || 'pending';
}

function mapMTToAdaptado(referral: MTReferral): IndicacaoAdaptada {
  return {
    id: referral.id,
    tenant_id: referral.tenant_id,
    franchise_id: referral.franchise_id,
    influenciadora_id: referral.influencer_id,
    lead_id: referral.lead_id,
    codigo_usado: referral.codigo_usado,
    campanha: null,
    landing_page: null,
    status: mapMTStatusToLegacy(referral.status),
    data_indicacao: referral.created_at,
    data_conversao: referral.data_conversao,
    valor_comissao: referral.comissao,
    observacoes: null,
    created_at: referral.created_at,
    influenciadora: referral.influencer
      ? {
          id: referral.influencer.id,
          nome: referral.influencer.nome,
          nome_artistico: referral.influencer.nome_artistico,
          codigo: referral.influencer.codigo,
          foto_perfil: referral.influencer.foto_perfil,
        }
      : null,
    lead: referral.lead
      ? {
          id: referral.lead.id,
          nome: referral.lead.nome,
          email: referral.lead.email,
          telefone: referral.lead.telefone,
          status: referral.lead.status,
        }
      : null,
    tenant: referral.tenant,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useInfluenciadoraIndicacoesAdapter(filters: IndicacaoFilters = {}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Indicações
  // ==========================================================================
  const {
    data: indicacoesRaw = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async (): Promise<MTReferral[]> => {
      let query = supabase
        .from('mt_influencer_referrals')
        .select(`
          *,
          influencer:mt_influencers(id, nome, nome_artistico, codigo, foto_perfil),
          lead:mt_leads(id, nome, email, telefone, status),
          tenant:mt_tenants(slug, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('tenant_id', tenant!.id);
        query = query.eq('franchise_id', franchise.id);
      }
      // Platform admin vê todos

      // Filtros adicionais
      if (filters.influenciadoraId) {
        query = query.eq('influencer_id', filters.influenciadoraId);
      }
      if (filters.status) {
        query = query.eq('status', mapLegacyStatusToMT(filters.status));
      }
      if (filters.campanha) {
        query = query.eq('campaign', filters.campanha);
      }
      if (filters.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte('created_at', filters.dataFim);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        if (fetchError.code === '42P01') {
          console.warn('[MT] mt_influencer_referrals table not found');
          return [];
        }
        throw fetchError;
      }

      return (data || []) as MTReferral[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Query: Métricas de Indicações
  // ==========================================================================
  const { data: metricas } = useQuery({
    queryKey: [QUERY_KEY, 'metricas', tenant?.id, franchise?.id, accessLevel, filters.influenciadoraId],
    queryFn: async () => {
      let query = supabase
        .from('mt_influencer_referrals')
        .select('status, comissao');

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('tenant_id', tenant!.id);
        query = query.eq('franchise_id', franchise.id);
      }

      if (filters.influenciadoraId) {
        query = query.eq('influencer_id', filters.influenciadoraId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError || !data) {
        return {
          total: 0,
          pendentes: 0,
          convertidas: 0,
          perdidas: 0,
          taxaConversao: 0,
          totalComissoes: 0,
        };
      }

      const total = data.length;
      const pendentes = data.filter((i) => i.status === 'pending' || i.status === 'pendente').length;
      const convertidas = data.filter((i) => i.status === 'converted' || i.status === 'convertido').length;
      const perdidas = data.filter((i) => i.status === 'lost' || i.status === 'perdido').length;
      const totalComissoes = data
        .filter((i) => i.status === 'converted' || i.status === 'convertido')
        .reduce((acc, i) => acc + (i.comissao || 0), 0);

      return {
        total,
        pendentes,
        convertidas,
        perdidas,
        taxaConversao: total > 0 ? Math.round((convertidas / total) * 100) : 0,
        totalComissoes,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Criar Indicação
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (input: IndicacaoCreateInput) => {
      const { data, error: createError } = await supabase
        .from('mt_influencer_referrals')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || null,
          influencer_id: input.influenciadora_id,
          lead_id: input.lead_id || null,
          codigo_usado: input.codigo_usado || null,
          status: input.status ? mapLegacyStatusToMT(input.status) : 'pending',
          comissao: input.valor_comissao || null,
        })
        .select(`
          *,
          influencer:mt_influencers(id, nome, nome_artistico, codigo, foto_perfil),
          lead:mt_leads(id, nome, email, telefone, status),
          tenant:mt_tenants(slug, nome_fantasia)
        `)
        .single();

      if (createError) throw createError;
      return data as MTReferral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Indicação registrada com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao registrar indicação: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Indicação
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async (input: IndicacaoUpdateInput) => {
      const updates: Record<string, unknown> = {};

      if (input.influenciadora_id !== undefined) updates.influencer_id = input.influenciadora_id;
      if (input.lead_id !== undefined) updates.lead_id = input.lead_id;
      if (input.codigo_usado !== undefined) updates.codigo_usado = input.codigo_usado;
      if (input.status !== undefined) updates.status = mapLegacyStatusToMT(input.status);
      if (input.valor_comissao !== undefined) updates.comissao = input.valor_comissao;

      const { data, error: updateError } = await supabase
        .from('mt_influencer_referrals')
        .update(updates)
        .eq('id', input.id)
        .select(`
          *,
          influencer:mt_influencers(id, nome, nome_artistico, codigo, foto_perfil),
          lead:mt_leads(id, nome, email, telefone, status),
          tenant:mt_tenants(slug, nome_fantasia)
        `)
        .single();

      if (updateError) throw updateError;
      return data as MTReferral;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Indicação atualizada com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar indicação: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Status
  // ==========================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IndicacaoStatus }) => {
      const updates: Record<string, unknown> = {
        status: mapLegacyStatusToMT(status),
      };

      // Se convertido, registrar data de conversão
      if (status === 'convertido') {
        updates.data_conversao = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('mt_influencer_referrals')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-influenciadoras'] }); // Atualizar contadores
      toast.success('Status atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Converter Indicação
  // ==========================================================================
  const converterMutation = useMutation({
    mutationFn: async ({ id, valorComissao }: { id: string; valorComissao?: number }) => {
      const { error: updateError } = await supabase
        .from('mt_influencer_referrals')
        .update({
          status: 'converted',
          data_conversao: new Date().toISOString(),
          comissao: valorComissao || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Atualizar contador na influenciadora
      // O trigger no banco deve fazer isso automaticamente, mas podemos forçar aqui se necessário
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-influenciadoras'] });
      toast.success('Indicação convertida com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao converter indicação: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Indicação
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase
        .from('mt_influencer_referrals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-influenciadoras'] });
      toast.success('Indicação excluída com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir indicação: ${err.message}`);
    },
  });

  // ==========================================================================
  // Helper: Buscar por código
  // ==========================================================================
  const buscarPorCodigo = async (codigo: string): Promise<IndicacaoAdaptada[]> => {
    const { data, error } = await supabase
      .from('mt_influencer_referrals')
      .select(`
        *,
        influencer:mt_influencers(id, nome, nome_artistico, codigo, foto_perfil),
        lead:mt_leads(id, nome, email, telefone, status),
        tenant:mt_tenants(slug, nome_fantasia)
      `)
      .eq('codigo_usado', codigo)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as MTReferral[]).map(mapMTToAdaptado);
  };

  // Mapear para formato adaptado
  const indicacoes = indicacoesRaw.map(mapMTToAdaptado);

  return {
    indicacoes,
    metricas,
    isLoading: isLoading || isTenantLoading,
    isFetching,
    error,
    refetch,

    createIndicacao: createMutation.mutate,
    updateIndicacao: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    converter: converterMutation.mutate,
    deleteIndicacao: deleteMutation.mutate,

    buscarPorCodigo,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isConverting: converterMutation.isPending,
    isDeleting: deleteMutation.isPending,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { IndicacaoStatus, InfluenciadoraIndicacao } from '@/types/influenciadora';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getInfluenciadoraIndicacoesMode(): 'mt' {
  return 'mt';
}

export default useInfluenciadoraIndicacoesAdapter;
