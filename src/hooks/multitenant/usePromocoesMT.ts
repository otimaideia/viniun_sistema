// =============================================================================
// USE PROMOCOES MT - Hook Multi-Tenant para Gerenciamento de Promoções
// =============================================================================
//
// CRUD completo para mt_promotions com stats e status management
//
// =============================================================================

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPromotion,
  MTPromotionStatus,
  MTPromotionFilters,
  MTPromotionStats,
  CreatePromotionData,
  UpdatePromotionData,
} from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-promocoes';
const STATS_QUERY_KEY = 'mt-promocoes-stats';

const SELECT_WITH_RELATIONS = `
  *,
  tenant:mt_tenants (slug, nome_fantasia),
  services:mt_promotion_services (
    *,
    service:mt_services (id, nome, preco, categoria)
  ),
  subscriptions:mt_promotion_subscriptions (
    id,
    influencer_id,
    status,
    link_gerado,
    aderiu_at,
    total_cliques,
    total_leads,
    total_vendas,
    valor_vendas,
    influencer:mt_influencers (id, nome, telefone, codigo, instagram)
  ),
  uses:mt_promotion_uses (
    id,
    lead_id,
    subscription_id,
    desconto_aplicado,
    source,
    created_at,
    lead:mt_leads (id, nome, telefone)
  )
`;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Já existe uma promoção com este código.';
      case '23503':
        return 'Esta promoção está vinculada a outros dados.';
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

function generateCodigo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePromocoesMT(filters?: MTPromotionFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Promoções
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.status, filters?.tipo, filters?.search, filters?.publico_alvo, filters?.franchise_id],
    queryFn: async (): Promise<MTPromotion[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_promotions')
        .select(SELECT_WITH_RELATIONS)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nível de acesso
      // Promoções são do tenant (não por franquia), então franchise users veem promoções do tenant
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }

      if (filters?.publico_alvo) {
        q = q.eq('publico_alvo', filters.publico_alvo);
      }

      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      if (filters?.ativa_em) {
        q = q
          .lte('data_inicio', filters.ativa_em)
          .gte('data_fim', filters.ativa_em);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`titulo.ilike.${searchTerm},codigo.ilike.${searchTerm},descricao.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar promoções MT:', error);
        throw error;
      }

      return (data || []) as MTPromotion[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Effect: Auto-expirar promoções ativas cuja data_fim já passou
  // ---------------------------------------------------------------------------
  // Separated from queryFn to keep queries idempotent (no side effects).
  // Runs once after data is fetched; uses a ref to avoid repeated calls for
  // the same set of expired IDs.

  const expiredIdsRef = useRef<string>('');

  const expirePromotions = useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('mt_promotions')
        .update({ status: 'expirada', updated_at: now })
        .in('id', ids);

      if (error) {
        console.error('Erro ao auto-expirar promoções:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
    },
  });

  useEffect(() => {
    if (!query.data || query.data.length === 0) return;

    const now = new Date().toISOString();
    const toExpire = query.data.filter(
      (p) => p.status === 'ativa' && p.data_fim && p.data_fim < now
    );

    if (toExpire.length === 0) return;

    const ids = toExpire.map((p) => p.id);
    const idsKey = ids.sort().join(',');

    // Skip if we already triggered expiration for these exact IDs
    if (expiredIdsRef.current === idsKey) return;
    expiredIdsRef.current = idsKey;

    expirePromotions.mutate(ids);
  }, [query.data]);

  // ---------------------------------------------------------------------------
  // Query: Estatísticas
  // ---------------------------------------------------------------------------

  const statsQuery = useQuery({
    queryKey: [STATS_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTPromotionStats> => {
      if (!tenant && accessLevel !== 'platform') {
        return { total: 0, rascunho: 0, ativas: 0, pausadas: 0, expiradas: 0, canceladas: 0, usos_total: 0, leads_gerados: 0, influenciadoras_aderidas: 0 };
      }

      let q = supabase
        .from('mt_promotions')
        .select('id, status, usos_count')
        .is('deleted_at', null);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar stats promoções:', error);
        throw error;
      }

      const promotions = data || [];

      // Buscar contadores adicionais
      let subsQuery = supabase
        .from('mt_promotion_subscriptions')
        .select('id, total_leads', { count: 'exact' })
        .eq('status', 'aderido');

      if (accessLevel !== 'platform' && tenant) {
        subsQuery = subsQuery.eq('tenant_id', tenant.id);
      }

      const { data: subsData, count: subsCount } = await subsQuery;
      const leadsGerados = (subsData || []).reduce((sum, s) => sum + (s.total_leads || 0), 0);

      return {
        total: promotions.length,
        rascunho: promotions.filter((p) => p.status === 'rascunho').length,
        ativas: promotions.filter((p) => p.status === 'ativa').length,
        pausadas: promotions.filter((p) => p.status === 'pausada').length,
        expiradas: promotions.filter((p) => p.status === 'expirada').length,
        canceladas: promotions.filter((p) => p.status === 'cancelada').length,
        usos_total: promotions.reduce((sum, p) => sum + (p.usos_count || 0), 0),
        leads_gerados: leadsGerados,
        influenciadoras_aderidas: subsCount || 0,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Promoção
  // ---------------------------------------------------------------------------

  const createPromotion = useMutation({
    mutationFn: async (newPromotion: CreatePromotionData): Promise<MTPromotion> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const codigo = newPromotion.codigo || generateCodigo(newPromotion.titulo);

      const promotionData = {
        ...newPromotion,
        codigo,
        tenant_id: newPromotion.tenant_id || tenant!.id,
        franchise_id: newPromotion.franchise_id ?? franchise?.id ?? null,
        status: newPromotion.status ?? 'rascunho',
        tipo: newPromotion.tipo ?? 'desconto',
        publico_alvo: newPromotion.publico_alvo ?? 'todos',
        is_public: newPromotion.is_public ?? false,
        usos_count: 0,
        metadata: newPromotion.metadata ?? {},
      };

      const { data, error } = await supabase
        .from('mt_promotions')
        .insert(promotionData)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar promoção MT:', error);
        throw error;
      }

      return data as MTPromotion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success(`Promoção "${data.titulo}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Promoção
  // ---------------------------------------------------------------------------

  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePromotionData): Promise<MTPromotion> => {
      if (!id) {
        throw new Error('ID da promoção é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_promotions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar promoção MT:', error);
        throw error;
      }

      return data as MTPromotion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success(`Promoção "${data.titulo}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTPromotionStatus }): Promise<void> => {
      const { error } = await supabase
        .from('mt_promotions')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status promoção:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success('Status da promoção atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const softDelete = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da promoção é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_promotions')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'cancelada' as MTPromotionStatus,
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover promoção MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success('Promoção removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Duplicar Promoção
  // ---------------------------------------------------------------------------

  const duplicatePromotion = useMutation({
    mutationFn: async (sourceId: string): Promise<MTPromotion> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Buscar promoção original com serviços
      const { data: original, error: fetchError } = await supabase
        .from('mt_promotions')
        .select('*, services:mt_promotion_services(service_id, preco_promocional, desconto_tipo, desconto_valor)')
        .eq('id', sourceId)
        .single();

      if (fetchError || !original) {
        throw new Error('Promoção original não encontrada.');
      }

      // Criar cópia com novo código
      const newCodigo = `${original.codigo || 'PROMO'}_COPIA_${Date.now().toString(36).toUpperCase()}`.substring(0, 30);
      const { id: _id, created_at: _ca, updated_at: _ua, deleted_at: _da, usos_count: _uc, services: originalServices, tenant: _t, subscriptions: _s, uses: _u, ...copyData } = original;

      const { data: created, error: createError } = await supabase
        .from('mt_promotions')
        .insert({
          ...copyData,
          titulo: `${original.titulo} (Cópia)`,
          codigo: newCodigo,
          status: 'rascunho',
          usos_count: 0,
        })
        .select('*')
        .single();

      if (createError) throw createError;

      // Copiar serviços vinculados
      if (originalServices && originalServices.length > 0) {
        const serviceCopies = originalServices.map((s: any) => ({
          promotion_id: created.id,
          service_id: s.service_id,
          tenant_id: original.tenant_id,
          preco_promocional: s.preco_promocional,
          desconto_tipo: s.desconto_tipo,
          desconto_valor: s.desconto_valor,
        }));

        await supabase.from('mt_promotion_services').insert(serviceCopies);
      }

      return created as MTPromotion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] });
      toast.success(`Promoção duplicada! "${data.titulo}" criada como rascunho.`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Helper: Buscar por ID
  // ---------------------------------------------------------------------------

  const getPromocao = async (id: string): Promise<MTPromotion | null> => {
    const { data, error } = await supabase
      .from('mt_promotions')
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar promoção:', error);
      return null;
    }

    return data as MTPromotion | null;
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    promocoes: query.data ?? [],
    stats: statsQuery.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: () => {
      query.refetch();
      statsQuery.refetch();
    },

    // Mutations
    createPromocao: {
      mutate: createPromotion.mutate,
      mutateAsync: createPromotion.mutateAsync,
      isPending: createPromotion.isPending,
    },
    updatePromocao: {
      mutate: updatePromotion.mutate,
      mutateAsync: updatePromotion.mutateAsync,
      isPending: updatePromotion.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    softDelete: {
      mutate: softDelete.mutate,
      mutateAsync: softDelete.mutateAsync,
      isPending: softDelete.isPending,
    },
    duplicatePromocao: {
      mutate: duplicatePromotion.mutate,
      mutateAsync: duplicatePromotion.mutateAsync,
      isPending: duplicatePromotion.isPending,
    },

    // Helpers
    getPromocao,

    isCreating: createPromotion.isPending,
    isUpdating: updatePromotion.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isDeleting: softDelete.isPending,
    isDuplicating: duplicatePromotion.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Promoção por ID
// -----------------------------------------------------------------------------

export function usePromocaoMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPromotion | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_promotions')
        .select(SELECT_WITH_RELATIONS)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTPromotion;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: ROI de uma Promocao (receita via mt_sales.promotion_id)
// -----------------------------------------------------------------------------

export interface PromocaoROI {
  total_vendas: number;
  receita_total: number;
  ticket_medio: number;
  leads_gerados: number;
  taxa_conversao: number; // leads → vendas (%)
  roi_percentual: number; // (receita - investimento) / investimento * 100
}

export function usePromocaoROIMT(promotionId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-promocao-roi', promotionId],
    queryFn: async (): Promise<PromocaoROI> => {
      if (!promotionId) {
        return { total_vendas: 0, receita_total: 0, ticket_medio: 0, leads_gerados: 0, taxa_conversao: 0, roi_percentual: 0 };
      }

      // Buscar vendas vinculadas a esta promocao
      const { data: vendas, error: vendasError } = await supabase
        .from('mt_sales')
        .select('id, valor_total')
        .eq('promotion_id', promotionId)
        .is('deleted_at', null);

      if (vendasError) throw vendasError;

      // Buscar leads gerados (via mt_promotion_uses)
      const { count: leadsCount } = await supabase
        .from('mt_promotion_uses')
        .select('id', { count: 'exact', head: true })
        .eq('promotion_id', promotionId);

      // Buscar investimento da promocao
      const { data: promo } = await supabase
        .from('mt_promotions')
        .select('investimento')
        .eq('id', promotionId)
        .single();

      const totalVendas = vendas?.length || 0;
      const receitaTotal = (vendas || []).reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0;
      const leadsGerados = leadsCount || 0;
      const taxaConversao = leadsGerados > 0 ? (totalVendas / leadsGerados) * 100 : 0;
      const investimento = (promo as any)?.investimento || 0;
      const roiPercentual = investimento > 0 ? ((receitaTotal - investimento) / investimento) * 100 : 0;

      return {
        total_vendas: totalVendas,
        receita_total: receitaTotal,
        ticket_medio: ticketMedio,
        leads_gerados: leadsGerados,
        taxa_conversao: taxaConversao,
        roi_percentual: roiPercentual,
      };
    },
    enabled: !!promotionId && !isTenantLoading,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export default usePromocoesMT;
