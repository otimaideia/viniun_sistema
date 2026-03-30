// =============================================================================
// USE METAS ADAPTER - Hook Multi-Tenant com Inteligência Reativa
// =============================================================================
//
// Sistema de metas 100% dinâmico e reativo:
//
// BANCO DE DADOS:
//   - mt_goal_type_sources: Mapeamento dinâmico tipo→query (extensível via INSERT)
//   - calculate_goal_value(goal_id) → executa query dinâmica da tabela de mapeamento
//   - sync_goal_progress(goal_id) → calcula valor + percentual + status + alertas
//   - recalculate_all_goals(tenant_id?) → recalcula batch
//   - get_goal_analytics(tenant_id, franchise_id?) → dados para AI com projeção
//   - batch_recalculate_goals() → recalcula todos os tenants
//   - trigger_recalculate_goals() → trigger REATIVO em 8 tabelas fonte
//
// TRIGGERS REATIVOS (recalcula metas automaticamente quando dados mudam):
//   - mt_leads (INSERT/UPDATE status,valor/DELETE)
//   - mt_appointments (INSERT/UPDATE status/DELETE)
//   - mt_form_submissions (INSERT/DELETE)
//   - mt_influencer_referrals (INSERT/DELETE)
//   - mt_whatsapp_messages (INSERT)
//   - mt_whatsapp_conversations (INSERT)
//   - mt_services (INSERT/UPDATE is_active/DELETE)
//   - mt_franchises (INSERT/UPDATE is_active/DELETE)
//
// FRONTEND:
//   - Auto-refresh a cada 5 minutos (garante sincronização)
//   - Tipos auto-calculáveis lidos da tabela mt_goal_type_sources (dinâmico)
//   - Projeção e tendência disponíveis via getAnalytics()
//
// =============================================================================

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Meta, MetaFormData, MetaHistorico, MetaStats, MetaStatus } from '@/types/meta';

// =============================================================================
// Types
// =============================================================================

export interface MetaAdaptada extends Meta {
  tenant_id?: string;
  franchise_id?: string;
  // Campos do DB (calculados pela função SQL)
  alerta_50?: boolean;
  alerta_80?: boolean;
  alerta_100?: boolean;
  auto_calculated?: boolean;
}

export interface RecalculateResult {
  total_goals: number;
  goals_changed: number;
  calculated_at: string;
  details: Array<{
    goal_id: string;
    tipo: string;
    valor_anterior: number;
    valor_atual: number;
    meta_valor: number;
    percentual: number;
    status: string;
    changed: boolean;
  }>;
}

export interface GoalProjection {
  dias_passados: number;
  dias_restantes: number;
  dias_total: number;
  velocidade_diaria: number;
  valor_restante: number;
  data_projetada: string | null;
  vai_atingir: boolean;
  tendencia: 'inicio' | 'acelerando' | 'estavel' | 'desacelerando';
  percentual_tempo: number;
  percentual_meta: number;
  ritmo: 'sem_dados' | 'adiantado' | 'no_ritmo' | 'atrasado';
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-goals';
const TYPES_QUERY_KEY = 'mt-goal-type-sources';

// =============================================================================
// Auto-refresh interval (5 minutos)
// =============================================================================

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

// =============================================================================
// Tipos auto-calculáveis - Cache local + leitura dinâmica do DB
// =============================================================================

// Cache local para lookup rápido (atualizado pela query)
let _tiposAutoCache = new Set([
  'leads', 'conversoes', 'receita', 'ticket_medio', 'taxa_conversao',
  'pipeline', 'recompra', 'agendamentos', 'atendimentos', 'comparecimento',
  'no_show', 'formularios', 'indicacoes', 'mensagens', 'conversas',
  'servicos_vendidos', 'franquias_novas',
]);

export function isTipoAutoCalculavel(tipo: string): boolean {
  return _tiposAutoCache.has(tipo);
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useMetasAdapter(franqueadoId?: string) {
  const { tenant, franchise, accessLevel, user: mtUser, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ==========================================================================
  // Query: Tipos auto-calculáveis (lê do DB - extensível via INSERT)
  // ==========================================================================
  useQuery({
    queryKey: [TYPES_QUERY_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from('mt_goal_type_sources')
        .select('tipo')
        .eq('is_active', true);

      if (data && data.length > 0) {
        _tiposAutoCache = new Set(data.map((d: { tipo: string }) => d.tipo));
      }
      return data;
    },
    staleTime: 10 * 60 * 1000, // Cache por 10 min
    refetchOnWindowFocus: false,
  });

  // ==========================================================================
  // Real-time: Escutar mudanças em mt_goals via Supabase subscription
  // ==========================================================================
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!tenant?.id && accessLevel !== 'platform') return;

    // Subscrever mudanças em mt_goals
    const channel = supabase
      .channel('mt_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_goals',
          ...(tenant?.id ? { filter: `tenant_id=eq.${tenant.id}` } : {}),
        },
        () => {
          // Invalidar cache quando meta muda (trigger reativo atualizou)
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [tenant?.id, accessLevel, queryClient]);

  // ==========================================================================
  // Query: Listar Metas (lê status/percentual/alertas do DB)
  // Auto-refresh a cada 5 minutos como garantia adicional
  // ==========================================================================
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, franqueadoId, accessLevel],
    refetchInterval: AUTO_REFRESH_INTERVAL,
    queryFn: async (): Promise<MetaAdaptada[]> => {
      let queryBuilder = supabase
        .from('mt_goals')
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome_fantasia),
          department:mt_departments(id, nome, codigo),
          team:mt_teams(id, nome, codigo),
          assigned_user:mt_users!mt_goals_assigned_to_fkey(id, nome, email)
        `)
        .is('deleted_at', null)
        .order('data_fim', { ascending: true });

      // Filtrar por nível de acesso
      const franchiseId = franqueadoId || franchise?.id;
      const tenantId = tenant?.id;

      if (accessLevel === 'franchise' && franchiseId) {
        queryBuilder = queryBuilder.eq('franchise_id', franchiseId);
      } else if (accessLevel === 'tenant' && tenantId) {
        queryBuilder = queryBuilder.eq('tenant_id', tenantId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[MT] Erro ao buscar metas:', error);
        throw error;
      }

      return (data || []).map((meta) => {
        // Usar percentual e status do DB (calculados pela função SQL)
        const percentual = meta.percentual_atingido != null && meta.percentual_atingido > 0
          ? Number(meta.percentual_atingido)
          : (meta.meta_valor > 0 ? Math.round((meta.valor_atual / meta.meta_valor) * 100) : 0);

        const dbStatus = meta.status as MetaStatus;
        // Fallback: recalcular no front se DB não atualizou ainda
        const status: MetaStatus = dbStatus && dbStatus !== 'em_andamento'
          ? dbStatus
          : (percentual >= 100 ? 'atingida'
            : new Date(meta.data_fim) < new Date() ? 'expirada'
            : percentual >= 80 ? 'proxima'
            : 'em_andamento');

        return {
          id: meta.id,
          tenant_id: meta.tenant_id,
          franchise_id: meta.franchise_id,
          titulo: meta.titulo,
          tipo: meta.tipo || 'custom',
          valor_meta: meta.meta_valor,
          valor_atual: meta.valor_atual,
          data_inicio: meta.data_inicio,
          data_fim: meta.data_fim,
          usuario_id: meta.user_id,
          franqueado_id: meta.franchise_id,
          descricao: meta.descricao || null,
          periodo: meta.periodo || null,
          meta_unidade: meta.meta_unidade || null,
          // Vinculação multi-nível
          department_id: meta.department_id || null,
          team_id: meta.team_id || null,
          assigned_to: meta.assigned_to || null,
          department_nome: meta.department?.nome || null,
          team_nome: meta.team?.nome || null,
          assigned_to_nome: meta.assigned_user?.nome || null,
          percentual,
          status,
          alerta_50: meta.alerta_50 || false,
          alerta_80: meta.alerta_80 || false,
          alerta_100: meta.alerta_100 || false,
          auto_calculated: _tiposAutoCache.has(meta.tipo || ''),
          franqueado_nome: meta.franchise?.nome_fantasia || null,
          created_at: meta.created_at,
          updated_at: meta.updated_at,
        } as MetaAdaptada;
      });
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Recalcular Metas (chama função SQL no banco)
  // ==========================================================================
  const recalcularMetas = useCallback(async (): Promise<RecalculateResult | null> => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.rpc('recalculate_all_goals', {
        p_tenant_id: tenant?.id || null,
      });

      if (error) {
        console.error('[MT] Erro ao recalcular metas:', error);
        toast.error('Erro ao recalcular metas');
        return null;
      }

      const result = data as RecalculateResult;

      // Invalidar cache para recarregar dados atualizados
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

      if (result.goals_changed > 0) {
        toast.success(`${result.goals_changed} meta(s) atualizada(s) automaticamente!`);
      } else {
        toast.info('Todas as metas estão atualizadas.');
      }

      return result;
    } finally {
      setIsRecalculating(false);
    }
  }, [tenant?.id, queryClient]);

  // ==========================================================================
  // Recalcular uma meta específica
  // ==========================================================================
  const recalcularMeta = useCallback(async (goalId: string) => {
    const { data, error } = await supabase.rpc('sync_goal_progress', {
      p_goal_id: goalId,
    });

    if (error) {
      console.error('[MT] Erro ao recalcular meta:', error);
      toast.error('Erro ao recalcular meta');
      return null;
    }

    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    return data;
  }, [queryClient]);

  // ==========================================================================
  // Analytics para AI (chama função SQL)
  // ==========================================================================
  const getAnalytics = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_goal_analytics', {
      p_tenant_id: tenant?.id,
      p_franchise_id: franchise?.id || null,
    });

    if (error) {
      console.error('[MT] Erro ao buscar analytics:', error);
      return null;
    }

    return data;
  }, [tenant?.id, franchise?.id]);

  // ==========================================================================
  // Mutation: Criar Meta (com recálculo automático após criação)
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: MetaFormData) => {
      const { data: created, error } = await supabase
        .from('mt_goals')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: data.franqueado_id || franchise?.id || null,
          titulo: data.titulo,
          tipo: data.tipo,
          meta_valor: data.valor_meta,
          valor_atual: 0,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          descricao: data.descricao || null,
          periodo: data.periodo || null,
          meta_unidade: data.meta_unidade || null,
          user_id: mtUser?.id || null,
          created_by: mtUser?.id || null,
          // Vinculação multi-nível
          department_id: data.department_id || null,
          team_id: data.team_id || null,
          assigned_to: data.assigned_to || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar meta:', error);
        throw error;
      }

      // Auto-calcular valor se tipo é auto-calculável
      if (created && _tiposAutoCache.has(data.tipo)) {
        await supabase.rpc('sync_goal_progress', { p_goal_id: created.id });
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Meta
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MetaFormData> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.titulo !== undefined) updateData.titulo = data.titulo;
      if (data.tipo !== undefined) updateData.tipo = data.tipo;
      if (data.valor_meta !== undefined) updateData.meta_valor = data.valor_meta;
      if (data.data_inicio !== undefined) updateData.data_inicio = data.data_inicio;
      if (data.data_fim !== undefined) updateData.data_fim = data.data_fim;
      if (data.franqueado_id !== undefined) updateData.franchise_id = data.franqueado_id;
      if (data.descricao !== undefined) updateData.descricao = data.descricao || null;
      if (data.periodo !== undefined) updateData.periodo = data.periodo || null;
      if (data.meta_unidade !== undefined) updateData.meta_unidade = data.meta_unidade || null;
      // Vinculação multi-nível
      if (data.department_id !== undefined) updateData.department_id = data.department_id || null;
      if (data.team_id !== undefined) updateData.team_id = data.team_id || null;
      if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to || null;

      const { error } = await supabase
        .from('mt_goals')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao atualizar meta:', error);
        throw error;
      }

      // Recalcular após atualizar (tipo/datas podem ter mudado)
      const tipo = data.tipo;
      if (tipo && _tiposAutoCache.has(tipo)) {
        await supabase.rpc('sync_goal_progress', { p_goal_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Meta
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar meta:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Meta removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover meta: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Progresso Manual (para tipos custom)
  // ==========================================================================
  const atualizarProgressoMutation = useMutation({
    mutationFn: async ({ id, novoValor }: { id: string; novoValor: number }) => {
      // Buscar meta para pegar dados atuais
      const { data: metaAtual } = await supabase
        .from('mt_goals')
        .select('valor_atual, meta_valor, tenant_id, franchise_id')
        .eq('id', id)
        .single();

      // Calcular percentual e status
      const pct = metaAtual?.meta_valor > 0
        ? Math.round((novoValor / metaAtual.meta_valor) * 100)
        : 0;
      const hoje = new Date().toISOString().slice(0, 10);
      let status: MetaStatus = 'em_andamento';
      if (pct >= 100) status = 'atingida';
      else if (pct >= 80) status = 'proxima';

      // Registrar no histórico
      await supabase.from('mt_goals_history').insert({
        goal_id: id,
        tenant_id: metaAtual?.tenant_id || tenant?.id,
        franchise_id: metaAtual?.franchise_id || null,
        recorded_date: hoje,
        current_value: novoValor,
        target_value: metaAtual?.meta_valor || 0,
        progress_percentage: pct,
        notes: 'Atualização manual',
        metadata: {
          old_value: metaAtual?.valor_atual || 0,
          new_value: novoValor,
          status,
        },
      });

      // Atualizar meta com todos os campos calculados
      const { error } = await supabase
        .from('mt_goals')
        .update({
          valor_atual: novoValor,
          percentual_atingido: pct,
          status,
          alerta_50: pct >= 50,
          alerta_80: pct >= 80,
          alerta_100: pct >= 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao atualizar progresso:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Progresso atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar progresso: ${error.message}`);
    },
  });

  // ==========================================================================
  // Buscar histórico de uma meta
  // ==========================================================================
  const getHistorico = async (metaId: string): Promise<MetaHistorico[]> => {
    const { data, error } = await supabase
      .from('mt_goals_history')
      .select('*')
      .eq('goal_id', metaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MT] Erro ao buscar histórico:', error);
      return [];
    }

    return (data || []).map((h) => ({
      id: h.id,
      meta_id: h.goal_id,
      valor_anterior: h.metadata?.old_value ?? h.current_value,
      valor_novo: h.current_value,
      usuario_id: null,
      created_at: h.created_at,
    }));
  };

  // ==========================================================================
  // Calcular estatísticas (memoizado para evitar recálculo a cada render)
  // ==========================================================================
  const stats = useMemo((): MetaStats => {
    const metas = query.data || [];
    const atingidas = metas.filter((m) => m.status === 'atingida').length;
    const emAndamento = metas.filter(
      (m) => m.status === 'em_andamento' || m.status === 'proxima'
    ).length;

    const totalPercentual = metas.reduce((acc, m) => acc + (m.percentual || 0), 0);
    const progressoMedio = metas.length > 0 ? Math.round(totalPercentual / metas.length) : 0;

    return {
      total: metas.length,
      atingidas,
      em_andamento: emAndamento,
      progresso_medio: progressoMedio,
    };
  }, [query.data]);

  return {
    metas: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    stats,

    createMeta: createMutation.mutate,
    updateMeta: updateMutation.mutate,
    deleteMeta: deleteMutation.mutate,
    atualizarProgresso: atualizarProgressoMutation.mutate,
    getHistorico,

    // Novas funcionalidades dinâmicas
    recalcularMetas,
    recalcularMeta,
    getAnalytics,
    isRecalculating,
    isTipoAutoCalculavel,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getMetasMode(): 'mt' {
  return 'mt';
}

export { isTipoAutoCalculavel as isAutoCalculavel };

export default useMetasAdapter;
