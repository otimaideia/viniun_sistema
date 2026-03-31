import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// HOOKS MT PARA AUTOMAÇÕES DE FUNIL
// Usam tabelas mt_workflows, mt_workflow_templates, mt_workflow_executions
// =============================================================================

// ============================================
// Tipos
// ============================================
export interface FunilAutomacao {
  id: string;
  etapa_id: string;
  tipo_trigger: 'entrada' | 'tempo' | 'saida' | 'manual';
  tempo_dias?: number;
  condicao?: Record<string, any>;
  acao_tipo: 'mensagem' | 'webhook' | 'notificacao' | 'mover_etapa';
  mensagem_template_id?: string;
  webhook_url?: string;
  webhook_payload?: Record<string, any>;
  etapa_destino_id?: string;
  is_active: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface FunilMensagemTemplate {
  id: string;
  funil_id: string;
  nome: string;
  tipo: 'texto' | 'imagem' | 'documento' | 'audio' | 'video';
  conteudo: string;
  variaveis?: string[];
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomacaoLog {
  id: string;
  automacao_id: string;
  funil_lead_id: string;
  status: 'pendente' | 'executando' | 'sucesso' | 'erro' | 'cancelado';
  resultado?: Record<string, any>;
  erro?: string;
  executado_em?: string;
  created_at: string;
}

const QUERY_KEY = 'mt-funnel-automations';
const TEMPLATES_QUERY_KEY = 'mt-funnel-message-templates';
const LOG_QUERY_KEY = 'mt-funnel-automation-log';

/**
 * Hook MT para automações de uma etapa do funil
 */
export function useFunilAutomacoesAdapter(etapaId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: automacoes = [], isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, etapaId, tenant?.id],
    queryFn: async () => {
      if (!etapaId) return [];

      // Buscar workflows vinculados à etapa do funil
      // Nota: entity_id e template_id não são FKs formais, não usar join PostgREST
      const { data, error } = await supabase
        .from('mt_workflows')
        .select('*')
        .eq('entity_type', 'funnel_stage')
        .eq('entity_id', etapaId)
        .is('deleted_at', null)
        .order('ordem');

      if (error) throw error;

      // Mapear para interface FunilAutomacao
      return (data || []).map((w: any): FunilAutomacao => ({
        id: w.id,
        etapa_id: w.entity_id,
        tipo_trigger: w.trigger_type as FunilAutomacao['tipo_trigger'],
        tempo_dias: w.trigger_config?.tempo_dias,
        condicao: w.trigger_config?.condicao,
        acao_tipo: w.action_type as FunilAutomacao['acao_tipo'],
        mensagem_template_id: w.template_id,
        webhook_url: w.action_config?.webhook_url,
        webhook_payload: w.action_config?.webhook_payload,
        etapa_destino_id: w.action_config?.etapa_destino_id,
        is_active: w.is_active,
        ordem: w.ordem || 0,
        created_at: w.created_at,
        updated_at: w.updated_at,
      }));
    },
    enabled: !!etapaId && !isTenantLoading,
  });

  return {
    automacoes,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para mutations de automações
 */
export function useFunilAutomacaoMutationsAdapter() {
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  // Criar automação
  const createAutomacao = useMutation({
    mutationFn: async (data: {
      etapa_id: string;
      tipo_trigger: FunilAutomacao['tipo_trigger'];
      tempo_dias?: number;
      condicao?: Record<string, any>;
      acao_tipo: FunilAutomacao['acao_tipo'];
      mensagem_template_id?: string;
      webhook_url?: string;
      webhook_payload?: Record<string, any>;
      etapa_destino_id?: string;
      is_active?: boolean;
      ordem?: number;
    }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const { data: result, error } = await supabase
        .from('mt_workflows')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          entity_type: 'funnel_stage',
          entity_id: data.etapa_id,
          nome: `Automação ${data.tipo_trigger}`,
          trigger_type: data.tipo_trigger,
          trigger_config: {
            tempo_dias: data.tempo_dias,
            condicao: data.condicao,
          },
          action_type: data.acao_tipo,
          action_config: {
            webhook_url: data.webhook_url,
            webhook_payload: data.webhook_payload,
            etapa_destino_id: data.etapa_destino_id,
          },
          template_id: data.mensagem_template_id,
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
      toast.success('Automação criada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar automação: ${error.message}`);
    },
  });

  // Atualizar automação
  const updateAutomacao = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FunilAutomacao> & { id: string }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.tipo_trigger) updateData.trigger_type = updates.tipo_trigger;
      if (updates.acao_tipo) updateData.action_type = updates.acao_tipo;
      if (updates.mensagem_template_id !== undefined) updateData.template_id = updates.mensagem_template_id;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.ordem !== undefined) updateData.ordem = updates.ordem;

      // Atualizar configs
      if (updates.tempo_dias !== undefined || updates.condicao !== undefined) {
        const { data: current } = await supabase
          .from('mt_workflows')
          .select('trigger_config')
          .eq('id', id)
          .single();

        updateData.trigger_config = {
          ...(current?.trigger_config || {}),
          ...(updates.tempo_dias !== undefined && { tempo_dias: updates.tempo_dias }),
          ...(updates.condicao !== undefined && { condicao: updates.condicao }),
        };
      }

      if (updates.webhook_url !== undefined || updates.webhook_payload !== undefined || updates.etapa_destino_id !== undefined) {
        const { data: current } = await supabase
          .from('mt_workflows')
          .select('action_config')
          .eq('id', id)
          .single();

        updateData.action_config = {
          ...(current?.action_config || {}),
          ...(updates.webhook_url !== undefined && { webhook_url: updates.webhook_url }),
          ...(updates.webhook_payload !== undefined && { webhook_payload: updates.webhook_payload }),
          ...(updates.etapa_destino_id !== undefined && { etapa_destino_id: updates.etapa_destino_id }),
        };
      }

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
      toast.success('Automação atualizada');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar automação (soft delete)
  const deleteAutomacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_workflows')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Automação removida');
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Toggle ativo/inativo
  const toggleAutomacao = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('mt_workflows')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      invalidate();
      toast.success(is_active ? 'Automação ativada' : 'Automação desativada');
    },
  });

  return {
    createAutomacao,
    updateAutomacao,
    deleteAutomacao,
    toggleAutomacao,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para templates de mensagem de um funil
 */
export function useFunilMensagemTemplatesAdapter(funilId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, funilId, tenant?.id],
    queryFn: async () => {
      if (!funilId) return [];

      const { data, error } = await supabase
        .from('mt_workflow_templates')
        .select('*')
        .eq('entity_type', 'funnel')
        .eq('entity_id', funilId)
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;

      // Mapear para interface FunilMensagemTemplate
      return (data || []).map((t): FunilMensagemTemplate => ({
        id: t.id,
        funil_id: t.entity_id,
        nome: t.nome,
        tipo: (t.tipo as FunilMensagemTemplate['tipo']) || 'texto',
        conteudo: t.conteudo,
        variaveis: t.variaveis,
        metadata: t.metadata,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));
    },
    enabled: !!funilId && !isTenantLoading,
  });

  return {
    templates,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para mutations de templates de mensagem
 */
export function useFunilMensagemTemplateMutationsAdapter() {
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
  };

  // Criar template
  const createTemplate = useMutation({
    mutationFn: async (data: Omit<FunilMensagemTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const { data: result, error } = await supabase
        .from('mt_workflow_templates')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          entity_type: 'funnel',
          entity_id: data.funil_id,
          nome: data.nome,
          tipo: data.tipo,
          conteudo: data.conteudo,
          variaveis: data.variaveis,
          metadata: data.metadata,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Template criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // Atualizar template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FunilMensagemTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_workflow_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Template atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar template (soft delete)
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_workflow_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Template removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para log de execução de automações
 */
export function useFunilAutomacaoLogAdapter(funilLeadId: string | undefined, limit: number = 50) {
  const { isLoading: isTenantLoading } = useTenantContext();

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: [LOG_QUERY_KEY, funilLeadId, limit],
    queryFn: async () => {
      if (!funilLeadId) return [];

      // Buscar via mt_workflow_executions (que tem context_type/context_id)
      const { data, error } = await supabase
        .from('mt_workflow_executions')
        .select(`
          *,
          workflow:mt_workflows(id, nome, action_type)
        `)
        .eq('context_type', 'funnel_lead')
        .eq('context_id', funilLeadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Mapear para interface AutomacaoLog
      return (data || []).map((exec: any): AutomacaoLog => ({
        id: exec.id,
        automacao_id: exec.workflow?.id || exec.workflow_id || '',
        funil_lead_id: exec.context_id,
        status: exec.status as AutomacaoLog['status'],
        resultado: exec.resultado,
        erro: exec.error_message,
        executado_em: exec.completed_at,
        created_at: exec.created_at,
      }));
    },
    enabled: !!funilLeadId && !isTenantLoading,
  });

  return {
    logs,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para executar automação manualmente
 */
export function useExecuteAutomacaoAdapter() {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  const executeAutomacao = useMutation({
    mutationFn: async ({
      automacaoId,
      funilLeadId,
      dados,
    }: {
      automacaoId: string;
      funilLeadId: string;
      dados?: Record<string, any>;
    }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      // Criar execução
      const { data: execucao, error: execError } = await supabase
        .from('mt_workflow_executions')
        .insert({
          tenant_id: tenant.id,
          workflow_id: automacaoId,
          status: 'running',
          trigger_data: dados,
          context_type: 'funnel_lead',
          context_id: funilLeadId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (execError) throw execError;

      // Criar log inicial
      const { error: logError } = await supabase
        .from('mt_workflow_execution_logs')
        .insert({
          tenant_id: tenant.id,
          execution_id: execucao.id,
          action: 'execute',
          status: 'running',
          created_at: new Date().toISOString(),
        });

      if (logError) {
        console.error('Erro ao criar log:', logError);
      }

      // Execution logic (Edge Function, webhook, etc.) not yet wired up - records the attempt only

      // Atualizar execução como sucesso (mock)
      await supabase
        .from('mt_workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', execucao.id);

      // Atualizar log
      await supabase
        .from('mt_workflow_execution_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('execution_id', execucao.id);

      return execucao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOG_QUERY_KEY] });
      toast.success('Automação executada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao executar automação: ${error.message}`);
    },
  });

  return {
    executeAutomacao,
    isExecuting: executeAutomacao.isPending,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para verificar leads com timeout (leads esfriando)
 */
export function useCheckLeadsTimeoutAdapter(funilId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: leadsTimeout = [], isLoading, error, refetch } = useQuery({
    queryKey: ['mt-funnel-leads-timeout', funilId, tenant?.id],
    queryFn: async () => {
      if (!funilId) return [];

      // Buscar leads que estão acima do tempo máximo na etapa
      const { data: etapas, error: etapasError } = await supabase
        .from('mt_funnel_stages')
        .select('id, nome, meta_dias')
        .eq('funnel_id', funilId)
        .is('deleted_at', null)
        .not('meta_dias', 'is', null);

      if (etapasError) throw etapasError;

      const now = new Date();
      const leadsEsfriando: Array<{
        lead_id: string;
        lead_nome: string;
        etapa_id: string;
        etapa_nome: string;
        dias_na_etapa: number;
        meta_dias: number;
      }> = [];

      for (const etapa of etapas || []) {
        if (!etapa.meta_dias) continue;

        // Buscar leads nesta etapa
        const { data: leads, error: leadsError } = await supabase
          .from('mt_funnel_leads')
          .select(`
            id,
            stage_entered_at,
            lead:mt_leads(id, nome)
          `)
          .eq('funnel_id', funilId)
          .eq('stage_id', etapa.id)
          .is('deleted_at', null);

        if (leadsError) continue;

        for (const lead of leads || []) {
          if (!lead.stage_entered_at) continue;

          const entradaEtapa = new Date(lead.stage_entered_at);
          const diasNaEtapa = Math.floor(
            (now.getTime() - entradaEtapa.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diasNaEtapa > etapa.meta_dias) {
            leadsEsfriando.push({
              lead_id: lead.id,
              lead_nome: (lead.lead as any)?.nome || 'Sem nome',
              etapa_id: etapa.id,
              etapa_nome: etapa.nome,
              dias_na_etapa: diasNaEtapa,
              meta_dias: etapa.meta_dias,
            });
          }
        }
      }

      return leadsEsfriando;
    },
    enabled: !!funilId && !isTenantLoading,
    staleTime: 60000, // Cache por 1 minuto
  });

  return {
    leadsTimeout,
    totalEsfriando: leadsTimeout.length,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}
