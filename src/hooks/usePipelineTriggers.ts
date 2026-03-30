/**
 * Hook: usePipelineTriggers
 *
 * Hook principal para gerenciar Pipeline Triggers (automações de funil).
 * Usa tabelas mt_workflows e respeita tenant/franchise context.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  processPipelineEvent,
  createStageEntryEvent,
  createStageExitEvent,
} from '@/services/pipelineTriggers';
import type { PipelineEvent, ExecutionResult } from '@/services/pipelineTriggers';

// =============================================================================
// TIPOS
// =============================================================================

export interface PipelineTrigger {
  id: string;
  etapa_id: string;
  nome: string;
  trigger_type: 'entrada' | 'saida' | 'tempo' | 'manual' | 'campo_alterado' | 'ganho' | 'perda';
  trigger_config: Record<string, any>;
  action_type: 'mover_etapa' | 'mensagem' | 'webhook' | 'notificacao' | 'adicionar_tag' | 'atribuir_usuario';
  action_config: Record<string, any>;
  template_id: string | null;
  is_active: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineTriggerCreate {
  etapa_id: string;
  nome: string;
  trigger_type: PipelineTrigger['trigger_type'];
  trigger_config?: Record<string, any>;
  action_type: PipelineTrigger['action_type'];
  action_config?: Record<string, any>;
  template_id?: string | null;
  is_active?: boolean;
  ordem?: number;
}

export interface PipelineTriggerUpdate {
  nome?: string;
  trigger_type?: PipelineTrigger['trigger_type'];
  trigger_config?: Record<string, any>;
  action_type?: PipelineTrigger['action_type'];
  action_config?: Record<string, any>;
  template_id?: string | null;
  is_active?: boolean;
  ordem?: number;
}

export interface TriggerExecution {
  id: string;
  workflow_id: string;
  status: string;
  trigger_data?: Record<string, any>;
  resultado?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  workflow?: { nome: string; action_type: string };
}

const TRIGGERS_KEY = 'pipeline-triggers';
const EXECUTIONS_KEY = 'pipeline-trigger-executions';

// =============================================================================
// HOOK: usePipelineTriggers (listar triggers de uma etapa)
// =============================================================================

export function usePipelineTriggers(etapaId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: triggers = [], isLoading, error, refetch } = useQuery({
    queryKey: [TRIGGERS_KEY, etapaId, tenant?.id],
    queryFn: async () => {
      if (!etapaId) return [];

      // entity_id e template_id não são FKs formais, não usar join PostgREST
      const { data, error } = await supabase
        .from('mt_workflows')
        .select('*')
        .eq('entity_type', 'funnel_stage')
        .eq('entity_id', etapaId)
        .is('deleted_at', null)
        .order('ordem');

      if (error) throw error;

      return (data || []).map((w: any): PipelineTrigger => ({
        id: w.id,
        etapa_id: w.entity_id,
        nome: w.nome,
        trigger_type: w.trigger_type,
        trigger_config: w.trigger_config || {},
        action_type: w.action_type,
        action_config: w.action_config || {},
        template_id: w.template_id,
        is_active: w.is_active,
        ordem: w.ordem || 0,
        created_at: w.created_at,
        updated_at: w.updated_at,
      }));
    },
    enabled: !!etapaId && !isTenantLoading,
  });

  return {
    triggers,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
  };
}

// =============================================================================
// HOOK: usePipelineTriggersByFunnel (todos os triggers de um funil)
// =============================================================================

export function usePipelineTriggersByFunnel(funilId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: triggers = [], isLoading, error, refetch } = useQuery({
    queryKey: [TRIGGERS_KEY, 'by-funnel', funilId, tenant?.id],
    queryFn: async () => {
      if (!funilId) return [];

      // Buscar todas as etapas do funil
      const { data: etapas } = await supabase
        .from('mt_funnel_stages')
        .select('id')
        .eq('funnel_id', funilId)
        .is('deleted_at', null);

      if (!etapas || etapas.length === 0) return [];

      const etapaIds = etapas.map((e) => e.id);

      const { data, error } = await supabase
        .from('mt_workflows')
        .select('*')
        .eq('entity_type', 'funnel_stage')
        .in('entity_id', etapaIds)
        .is('deleted_at', null)
        .order('ordem');

      if (error) throw error;

      return (data || []).map((w: any): PipelineTrigger => ({
        id: w.id,
        etapa_id: w.entity_id,
        nome: w.nome,
        trigger_type: w.trigger_type,
        trigger_config: w.trigger_config || {},
        action_type: w.action_type,
        action_config: w.action_config || {},
        template_id: w.template_id,
        is_active: w.is_active,
        ordem: w.ordem || 0,
        created_at: w.created_at,
        updated_at: w.updated_at,
      }));
    },
    enabled: !!funilId && !isTenantLoading,
  });

  return {
    triggers,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
  };
}

// =============================================================================
// HOOK: usePipelineTriggerMutations
// =============================================================================

export function usePipelineTriggerMutations() {
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [TRIGGERS_KEY] });
  };

  // Criar trigger
  const createTrigger = useMutation({
    mutationFn: async (data: PipelineTriggerCreate) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const { data: result, error } = await supabase
        .from('mt_workflows')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          entity_type: 'funnel_stage',
          entity_id: data.etapa_id,
          nome: data.nome,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config || {},
          action_type: data.action_type,
          action_config: data.action_config || {},
          template_id: data.template_id || null,
          is_active: data.is_active ?? true,
          ordem: data.ordem ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Trigger criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar trigger: ${error.message}`);
    },
  });

  // Atualizar trigger
  const updateTrigger = useMutation({
    mutationFn: async ({ id, ...updates }: PipelineTriggerUpdate & { id: string }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.trigger_type !== undefined) updateData.trigger_type = updates.trigger_type;
      if (updates.trigger_config !== undefined) updateData.trigger_config = updates.trigger_config;
      if (updates.action_type !== undefined) updateData.action_type = updates.action_type;
      if (updates.action_config !== undefined) updateData.action_config = updates.action_config;
      if (updates.template_id !== undefined) updateData.template_id = updates.template_id;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.ordem !== undefined) updateData.ordem = updates.ordem;

      const { data, error } = await supabase
        .from('mt_workflows')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Trigger atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar (soft delete)
  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_workflows')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Trigger removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Toggle ativo (com optimistic update para UX instantânea)
  const toggleTrigger = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('mt_workflows')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: [TRIGGERS_KEY] });
      // Snapshot do estado anterior
      const previousData = queryClient.getQueriesData({ queryKey: [TRIGGERS_KEY] });
      // Optimistic update em todas as queries de triggers
      queryClient.setQueriesData<PipelineTrigger[]>(
        { queryKey: [TRIGGERS_KEY] },
        (old) => old?.map((t) => (t.id === id ? { ...t, is_active } : t))
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback em caso de erro
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Erro ao alterar status do trigger');
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? 'Trigger ativado' : 'Trigger desativado');
    },
    onSettled: () => {
      invalidate();
    },
  });

  return {
    createTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
  };
}

// =============================================================================
// HOOK: useTriggerExecutions (histórico de execuções)
// =============================================================================

export function useTriggerExecutions(funilId: string | undefined, limit = 50) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: executions = [], isLoading, error, refetch } = useQuery({
    queryKey: [EXECUTIONS_KEY, funilId, tenant?.id, limit],
    queryFn: async () => {
      if (!funilId) return [];

      // Buscar etapas do funil
      const { data: etapas } = await supabase
        .from('mt_funnel_stages')
        .select('id')
        .eq('funnel_id', funilId)
        .is('deleted_at', null);

      if (!etapas || etapas.length === 0) return [];

      const etapaIds = etapas.map((e) => e.id);

      // Buscar workflows deste funil
      const { data: workflows } = await supabase
        .from('mt_workflows')
        .select('id')
        .eq('entity_type', 'funnel_stage')
        .in('entity_id', etapaIds);

      if (!workflows || workflows.length === 0) return [];

      const workflowIds = workflows.map((w) => w.id);

      // Buscar execuções
      const { data, error } = await supabase
        .from('mt_workflow_executions')
        .select(`
          *,
          workflow:mt_workflows(nome, action_type)
        `)
        .in('workflow_id', workflowIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as TriggerExecution[];
    },
    enabled: !!funilId && !isTenantLoading,
    staleTime: 30000,
  });

  return {
    executions,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
  };
}

// =============================================================================
// HOOK: useDispatchPipelineEvent (disparar evento manualmente)
// =============================================================================

export function useDispatchPipelineEvent() {
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();

  const dispatch = useMutation({
    mutationFn: async (params: {
      funilLeadId: string;
      funilId: string;
      leadId: string;
      destinationStageId: string;
      sourceStageId?: string | null;
      stageType?: string;
      extraData?: Record<string, any>;
    }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const results: ExecutionResult[] = [];

      // 1. Evento de saída da etapa anterior
      if (params.sourceStageId && params.sourceStageId !== params.destinationStageId) {
        const exitEvent = createStageExitEvent({
          funilLeadId: params.funilLeadId,
          funilId: params.funilId,
          leadId: params.leadId,
          tenantId: tenant.id,
          franchiseId: franchise?.id,
          sourceStageId: params.sourceStageId,
          destinationStageId: params.destinationStageId,
          extraData: params.extraData,
        });

        const exitResults = await processPipelineEvent(exitEvent);
        results.push(...exitResults);
      }

      // 2. Evento de entrada na nova etapa
      const entryEvent = createStageEntryEvent({
        funilLeadId: params.funilLeadId,
        funilId: params.funilId,
        leadId: params.leadId,
        tenantId: tenant.id,
        franchiseId: franchise?.id,
        destinationStageId: params.destinationStageId,
        sourceStageId: params.sourceStageId,
        stageType: params.stageType,
        extraData: params.extraData,
      });

      const entryResults = await processPipelineEvent(entryEvent);
      results.push(...entryResults);

      return results;
    },
    onSuccess: (results) => {
      // Invalidar queries relevantes se algum workflow mudou dados
      const hasDataChange = results.some(
        (r) => r.status === 'sucesso' && ['mover_etapa', 'adicionar_tag', 'atribuir_usuario'].includes(r.actionType)
      );

      if (hasDataChange) {
        queryClient.invalidateQueries({ queryKey: ['funil_leads'] });
      }

      queryClient.invalidateQueries({ queryKey: [EXECUTIONS_KEY] });

      // Log de resultados
      const sucesso = results.filter((r) => r.status === 'sucesso').length;
      const erros = results.filter((r) => r.status === 'erro').length;

      if (erros > 0) {
        console.warn(`[PipelineTrigger] ${sucesso} sucesso, ${erros} erro(s)`, results);
      }
    },
    onError: (error) => {
      console.error('[PipelineTrigger] Erro ao despachar evento:', error);
    },
  });

  return {
    dispatchEvent: dispatch,
    isDispatching: dispatch.isPending,
  };
}
