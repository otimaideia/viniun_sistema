/**
 * Workflow Engine para Pipeline Triggers
 *
 * Executa workflows matched pelo Event Dispatcher.
 * Cada action_type tem seu Step Executor correspondente.
 *
 * Fluxo: Event → Dispatch → Match → Execute → Log
 */

import { supabase } from '@/integrations/supabase/client';
import type { PipelineEvent, WorkflowMatch } from './eventDispatcher';

// =============================================================================
// TIPOS
// =============================================================================

export type ActionType =
  | 'mover_etapa'
  | 'mensagem'
  | 'webhook'
  | 'notificacao'
  | 'criar_tarefa'
  | 'atribuir_usuario'
  | 'alterar_campo'
  | 'adicionar_tag';

export interface ExecutionResult {
  workflowId: string;
  workflowName: string;
  actionType: string;
  status: 'sucesso' | 'erro' | 'ignorado';
  message?: string;
  data?: Record<string, any>;
  durationMs?: number;
}

export interface ExecutionContext {
  event: PipelineEvent;
  workflow: WorkflowMatch;
  leadData?: Record<string, any>;
}

// Configs tipados para cada action_type
export interface MoverEtapaConfig {
  etapa_destino_id: string;
}

export interface MensagemConfig {
  mensagem_direta?: string;
  session_id?: string;
  session_name?: string;
}

export interface WebhookConfig {
  webhook_url: string;
  webhook_method?: 'POST' | 'PUT';
  webhook_headers?: Record<string, string>;
  webhook_payload?: Record<string, any>;
}

export interface NotificacaoConfig {
  user_id?: string;
  titulo?: string;
  mensagem?: string;
  tipo_notificacao?: string;
}

export interface AdicionarTagConfig {
  tags: string[];
}

export interface AtribuirUsuarioConfig {
  user_id: string;
}

// =============================================================================
// STEP EXECUTORS
// =============================================================================

type StepExecutor = (ctx: ExecutionContext) => Promise<ExecutionResult>;

const stepExecutors: Record<string, StepExecutor> = {};

/**
 * Registra um Step Executor para um action_type.
 */
export function registerStepExecutor(actionType: string, executor: StepExecutor) {
  stepExecutors[actionType] = executor;
}

/**
 * Helper: cria ExecutionResult padrão para reduzir boilerplate.
 */
function makeResult(
  ctx: ExecutionContext,
  status: ExecutionResult['status'],
  message?: string,
  data?: Record<string, any>
): ExecutionResult {
  return {
    workflowId: ctx.workflow.id,
    workflowName: ctx.workflow.nome,
    actionType: ctx.workflow.action_type,
    status,
    message,
    data,
  };
}

/**
 * Wrapper com retry para executors que fazem chamadas externas.
 * Tenta até maxRetries vezes com delay progressivo.
 */
async function withRetry(
  fn: () => Promise<ExecutionResult>,
  maxRetries = 2,
  delayMs = 1000
): Promise<ExecutionResult> {
  let lastResult: ExecutionResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await fn();

    // Sucesso ou ignorado: retornar imediatamente
    if (lastResult.status !== 'erro') return lastResult;

    // Última tentativa: retornar erro
    if (attempt === maxRetries) break;

    // Esperar antes de retry (delay progressivo)
    await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    console.log(`[WorkflowEngine] Retry ${attempt + 1}/${maxRetries}: ${lastResult.message}`);
  }

  return lastResult!;
}

// =============================================================================
// EXECUTOR: MOVER ETAPA
// =============================================================================

registerStepExecutor('mover_etapa', async (ctx) => {
  const { event, workflow } = ctx;
  const config = workflow.action_config as MoverEtapaConfig;

  if (!config?.etapa_destino_id) {
    return makeResult(ctx, 'erro', 'etapa_destino_id não configurado');
  }

  // Evitar loop: não mover se já está na etapa destino
  if (event.stageId === config.etapa_destino_id) {
    return makeResult(ctx, 'ignorado', 'Lead já está na etapa destino');
  }

  try {
    const { error } = await supabase
      .from('mt_funnel_leads')
      .update({
        stage_id: config.etapa_destino_id,
        data_etapa: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.funilLeadId);

    if (error) throw error;

    // Fechar etapa anterior no histórico
    const { data: currentEntry } = await supabase
      .from('mt_funnel_stage_history')
      .select('id, entered_at')
      .eq('funnel_lead_id', event.funilLeadId)
      .eq('stage_id', event.stageId)
      .is('exited_at', null)
      .order('entered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentEntry) {
      const exitedAt = new Date();
      const enteredAt = new Date(currentEntry.entered_at);
      const durationSeconds = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000);

      await supabase
        .from('mt_funnel_stage_history')
        .update({
          exited_at: exitedAt.toISOString(),
          duration_seconds: durationSeconds,
          next_stage_id: config.etapa_destino_id,
          move_reason: `Automação: ${workflow.nome}`,
        })
        .eq('id', currentEntry.id);
    }

    // Registrar entrada na nova etapa
    await supabase.from('mt_funnel_stage_history').insert({
      tenant_id: event.tenantId,
      funnel_lead_id: event.funilLeadId,
      lead_id: event.leadId,
      funnel_id: event.funilId,
      stage_id: config.etapa_destino_id,
      entered_at: new Date().toISOString(),
      move_reason: `Automação: ${workflow.nome}`,
    });

    return makeResult(ctx, 'sucesso', `Lead movido para etapa ${config.etapa_destino_id}`, { etapaDestinoId: config.etapa_destino_id });
  } catch (err: any) {
    return makeResult(ctx, 'erro', err.message);
  }
});

// =============================================================================
// EXECUTOR: NOTIFICAÇÃO
// =============================================================================

registerStepExecutor('notificacao', async (ctx) => {
  const { event, workflow } = ctx;
  const config = (workflow.action_config || {}) as NotificacaoConfig;

  try {
    await supabase.from('mt_notifications').insert({
      tenant_id: event.tenantId,
      user_id: config.user_id || null,
      titulo: config.titulo || `Automação: ${workflow.nome}`,
      mensagem: config.mensagem || `Lead ${event.leadId} acionou automação "${workflow.nome}"`,
      tipo: config.tipo_notificacao || 'info',
      link: `/funil?lead=${event.funilLeadId}`,
      lida: false,
    });

    return makeResult(ctx, 'sucesso', 'Notificação criada');
  } catch (err: any) {
    return makeResult(ctx, 'erro', err.message);
  }
});

// =============================================================================
// EXECUTOR: WEBHOOK
// =============================================================================

registerStepExecutor('webhook', async (ctx) => {
  const { event, workflow } = ctx;
  const config = (workflow.action_config || {}) as WebhookConfig;

  if (!config.webhook_url) {
    return makeResult(ctx, 'erro', 'webhook_url não configurada');
  }

  // Validar URL (apenas HTTPS em produção, HTTP permitido em localhost)
  try {
    const parsedUrl = new URL(config.webhook_url);
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    if (!isLocalhost && parsedUrl.protocol !== 'https:') {
      return makeResult(ctx, 'erro', 'Webhook URL deve usar HTTPS');
    }
    // Bloquear IPs privados (prevenção SSRF)
    const blockedPatterns = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.2', '172.3', '192.168.', '169.254.'];
    if (!isLocalhost && blockedPatterns.some(p => parsedUrl.hostname.startsWith(p))) {
      return makeResult(ctx, 'erro', 'Webhook URL não pode apontar para endereço interno');
    }
  } catch {
    return makeResult(ctx, 'erro', 'webhook_url inválida');
  }

  // Webhook com retry (chamadas externas podem ter falhas transientes)
  return withRetry(async () => {
    try {
      // Buscar dados do lead para enviar no payload (apenas campos seguros)
      const { data: leadData } = await supabase
        .from('mt_leads')
        .select('id, nome, telefone, email, cidade, estado, status')
        .eq('id', event.leadId)
        .single();

      const body = {
        event: event.type,
        timestamp: event.timestamp,
        lead: leadData || { id: event.leadId },
        funnel_lead_id: event.funilLeadId,
        stage_id: event.stageId,
        previous_stage_id: event.previousStageId,
        workflow: {
          id: workflow.id,
          nome: workflow.nome,
        },
      };

      // Sanitizar headers - remover headers sensíveis fornecidos pelo usuário
      const userHeaders = config.webhook_headers || {};
      const blockedHeaders = ['authorization', 'cookie', 'set-cookie', 'host', 'origin', 'referer'];
      const safeHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(userHeaders)) {
        if (!blockedHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
          safeHeaders[key] = value;
        }
      }

      const response = await fetch(config.webhook_url, {
        method: config.webhook_method === 'PUT' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...safeHeaders,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      return makeResult(
        ctx,
        response.ok ? 'sucesso' : 'erro',
        response.ok ? `Webhook enviado (${response.status})` : `Webhook falhou (${response.status})`,
        { statusCode: response.status, url: config.webhook_url }
      );
    } catch (err: any) {
      return makeResult(ctx, 'erro', err.message);
    }
  });
});

// =============================================================================
// EXECUTOR: MENSAGEM (WhatsApp via WAHA)
// =============================================================================

registerStepExecutor('mensagem', async (ctx) => {
  const { event, workflow } = ctx;
  const config = (workflow.action_config || {}) as MensagemConfig;
  const templateId = workflow.template_id;

  try {
    // 1. Buscar dados do lead (telefone é obrigatório)
    const { data: leadData } = await supabase
      .from('mt_leads')
      .select('id, nome, telefone, whatsapp, email')
      .eq('id', event.leadId)
      .single();

    if (!leadData?.telefone && !leadData?.whatsapp) {
      return makeResult(ctx, 'erro', 'Lead sem telefone/WhatsApp');
    }

    // 2. Buscar template se configurado
    let mensagem = config.mensagem_direta || '';

    if (templateId) {
      const { data: template } = await supabase
        .from('mt_workflow_templates')
        .select('conteudo, variaveis')
        .eq('id', templateId)
        .single();

      if (template?.conteudo) {
        mensagem = template.conteudo;
      }
    }

    if (!mensagem) {
      return makeResult(ctx, 'erro', 'Sem mensagem ou template configurado');
    }

    // 3. Substituir variáveis no template
    const { data: etapaData } = await supabase
      .from('mt_funnel_stages')
      .select('nome')
      .eq('id', event.stageId)
      .single();

    mensagem = mensagem
      .replace(/\{\{nome\}\}/g, leadData.nome || '')
      .replace(/\{\{telefone\}\}/g, leadData.telefone || '')
      .replace(/\{\{email\}\}/g, leadData.email || '')
      .replace(/\{\{etapa\}\}/g, etapaData?.nome || '')
      .replace(/\{\{data\}\}/g, new Date().toLocaleDateString('pt-BR'));

    // 4. Buscar sessão WAHA ativa para este tenant
    const { data: sessions } = await supabase
      .from('mt_whatsapp_sessions')
      .select('id, session_name')
      .eq('tenant_id', event.tenantId)
      .eq('status', 'WORKING')
      .limit(1);

    const session = (config.session_id && config.session_name)
      ? { id: config.session_id, session_name: config.session_name }
      : sessions?.[0];

    if (!session) {
      return makeResult(ctx, 'erro', 'Nenhuma sessão WAHA ativa');
    }

    // 5. Buscar config WAHA (SOMENTE de mt_tenant_settings - multi-tenant safe)
    const { data: wahaConfig } = await supabase
      .from('mt_tenant_settings')
      .select('value')
      .eq('tenant_id', event.tenantId)
      .eq('key', 'waha_config')
      .single();

    // Sem fallback para tabelas não-MT por segurança de isolamento
    if (!wahaConfig?.value?.url) {
      return makeResult(ctx, 'erro', 'WAHA não configurado em mt_tenant_settings para este tenant');
    }

    // 6. Enviar via WAHA (via Edge Function - não expõe API key no frontend)
    const telefone = (leadData.whatsapp || leadData.telefone || '').replace(/\D/g, '');
    const chatId = `${telefone}@c.us`;

    const { error: funcError } = await supabase.functions.invoke('waha-proxy', {
      body: {
        action: 'send-text',
        session: session.session_name,
        chatId,
        text: mensagem,
      },
    });

    if (funcError) {
      return makeResult(ctx, 'erro', `Erro WAHA: ${funcError.message}`);
    }

    return makeResult(ctx, 'sucesso', `Mensagem enviada para ${telefone}`, { telefone, sessionName: session.session_name });
  } catch (err: any) {
    return makeResult(ctx, 'erro', err.message);
  }
});

// =============================================================================
// EXECUTOR: ADICIONAR TAG
// =============================================================================

registerStepExecutor('adicionar_tag', async (ctx) => {
  const { event } = ctx;
  const config = (ctx.workflow.action_config || {}) as AdicionarTagConfig;

  if (!config.tags || config.tags.length === 0) {
    return makeResult(ctx, 'erro', 'Nenhuma tag configurada');
  }

  try {
    const { data: currentLead } = await supabase
      .from('mt_funnel_leads')
      .select('tags')
      .eq('id', event.funilLeadId)
      .single();

    const tagsAtuais = (currentLead?.tags as string[]) || [];
    const tagsUnidas = [...new Set([...tagsAtuais, ...config.tags])];

    await supabase
      .from('mt_funnel_leads')
      .update({ tags: tagsUnidas, updated_at: new Date().toISOString() })
      .eq('id', event.funilLeadId);

    return makeResult(ctx, 'sucesso', `Tags adicionadas: ${config.tags.join(', ')}`, { tags: tagsUnidas });
  } catch (err: any) {
    return makeResult(ctx, 'erro', err.message);
  }
});

// =============================================================================
// EXECUTOR: ATRIBUIR USUÁRIO
// =============================================================================

registerStepExecutor('atribuir_usuario', async (ctx) => {
  const { event } = ctx;
  const config = (ctx.workflow.action_config || {}) as AtribuirUsuarioConfig;

  if (!config.user_id) {
    return makeResult(ctx, 'erro', 'user_id não configurado');
  }

  try {
    await supabase
      .from('mt_funnel_leads')
      .update({
        responsavel_id: config.user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.funilLeadId);

    return makeResult(ctx, 'sucesso', `Responsável atribuído: ${config.user_id}`, { userId: config.user_id });
  } catch (err: any) {
    return makeResult(ctx, 'erro', err.message);
  }
});

// =============================================================================
// WORKFLOW ENGINE - PRINCIPAL
// =============================================================================

/**
 * Executa todos os workflows matched para um evento.
 * Registra execuções e logs no banco.
 */
export async function executeWorkflows(
  event: PipelineEvent,
  workflows: WorkflowMatch[]
): Promise<ExecutionResult[]> {
  if (workflows.length === 0) return [];

  const results: ExecutionResult[] = [];

  for (const workflow of workflows) {
    const startTime = Date.now();
    const executor = stepExecutors[workflow.action_type];

    // Criar registro de execução
    const { data: execution } = await supabase
      .from('mt_workflow_executions')
      .insert({
        tenant_id: event.tenantId,
        workflow_id: workflow.id,
        status: 'executando',
        input_data: {
          event_type: event.type,
          funnel_lead_id: event.funilLeadId,
          stage_id: event.stageId,
          previous_stage_id: event.previousStageId,
        },
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    let result: ExecutionResult;

    if (!executor) {
      result = {
        workflowId: workflow.id,
        workflowName: workflow.nome,
        actionType: workflow.action_type,
        status: 'erro',
        message: `Executor não registrado para action_type: ${workflow.action_type}`,
      };
    } else {
      try {
        result = await executor({ event, workflow });
      } catch (err: any) {
        result = {
          workflowId: workflow.id,
          workflowName: workflow.nome,
          actionType: workflow.action_type,
          status: 'erro',
          message: `Erro inesperado: ${err.message}`,
        };
      }
    }

    result.durationMs = Date.now() - startTime;

    // Atualizar registro de execução
    if (execution?.id) {
      await supabase
        .from('mt_workflow_executions')
        .update({
          status: result.status,
          resultado: result.data || null,
          erro: result.status === 'erro' ? result.message : null,
          finished_at: new Date().toISOString(),
          duration_ms: result.durationMs,
        })
        .eq('id', execution.id);

      // Criar log detalhado
      await supabase.from('mt_workflow_execution_logs').insert({
        tenant_id: event.tenantId,
        execution_id: execution.id,
        entity_type: 'funnel_lead',
        entity_id: event.funilLeadId,
        status: result.status,
        resultado: result.data || null,
        erro: result.status === 'erro' ? result.message : null,
        executado_em: new Date().toISOString(),
      });
    }

    results.push(result);

    console.log(
      `[WorkflowEngine] ${workflow.nome} (${workflow.action_type}): ${result.status}` +
      (result.message ? ` - ${result.message}` : '') +
      ` (${result.durationMs}ms)`
    );
  }

  return results;
}

/**
 * Processa um evento completo: dispatch + execute.
 * Este é o ponto de entrada principal.
 */
export async function processPipelineEvent(event: PipelineEvent): Promise<ExecutionResult[]> {
  const { dispatchPipelineEvent } = await import('./eventDispatcher');

  // 1. Encontrar workflows que devem ser executados
  const matchedWorkflows = await dispatchPipelineEvent(event);

  if (matchedWorkflows.length === 0) return [];

  // 2. Executar os workflows
  return executeWorkflows(event, matchedWorkflows);
}
