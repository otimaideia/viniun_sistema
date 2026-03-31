/**
 * Event Dispatcher para Pipeline Triggers
 *
 * Despacha eventos do funil (entrada em etapa, saída, timeout, etc.)
 * para os workflows configurados na tabela mt_workflows.
 *
 * Respeita: tenant_id, franchise_id, módulos habilitados, permissões.
 */

import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// TIPOS DE EVENTOS
// =============================================================================

export type PipelineEventType =
  | 'lead_entered_stage'     // Lead entrou em uma etapa
  | 'lead_left_stage'        // Lead saiu de uma etapa
  | 'lead_added_to_funnel'   // Lead adicionado ao funil
  | 'lead_timeout'           // Lead excedeu tempo na etapa
  | 'lead_value_changed'     // Valor estimado alterado
  | 'lead_assigned'          // Responsável atribuído
  | 'lead_tags_changed'      // Tags alteradas
  | 'lead_won'               // Lead movido para etapa "ganho"
  | 'lead_lost';             // Lead movido para etapa "perda"

export interface PipelineEvent {
  type: PipelineEventType;
  funilLeadId: string;
  funilId: string;
  leadId: string;
  tenantId: string;
  franchiseId?: string | null;
  stageId: string;
  previousStageId?: string | null;
  data?: Record<string, any>;
  timestamp: string;
}

export interface WorkflowMatch {
  id: string;
  nome: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  template_id: string | null;
  tenant_id: string;
  franchise_id: string | null;
  entity_id: string;
  entity_type: string;
  is_active: boolean;
}

// =============================================================================
// MAPEAMENTO EVENTO → TRIGGER_TYPE
// =============================================================================

const EVENT_TO_TRIGGER_MAP: Record<PipelineEventType, string[]> = {
  lead_entered_stage: ['entrada'],
  lead_left_stage: ['saida'],
  lead_added_to_funnel: ['entrada'],
  lead_timeout: ['tempo'],
  lead_value_changed: ['campo_alterado'],
  lead_assigned: ['campo_alterado'],
  lead_tags_changed: ['campo_alterado'],
  lead_won: ['entrada', 'ganho'],
  lead_lost: ['entrada', 'perda'],
};

// =============================================================================
// EVENT DISPATCHER
// =============================================================================

/**
 * Despacha um evento do pipeline e encontra workflows que devem ser executados.
 * NÃO executa os workflows - apenas retorna os matches para o WorkflowEngine executar.
 */
export async function dispatchPipelineEvent(event: PipelineEvent): Promise<WorkflowMatch[]> {
  const triggerTypes = EVENT_TO_TRIGGER_MAP[event.type];
  if (!triggerTypes || triggerTypes.length === 0) {
    console.warn(`[PipelineTrigger] Tipo de evento não mapeado: ${event.type}`);
    return [];
  }

  try {
    // Buscar workflows ativos para esta etapa com os trigger_types correspondentes
    const { data: workflows, error } = await supabase
      .from('mt_workflows')
      .select('*')
      .eq('entity_type', 'funnel_stage')
      .eq('entity_id', event.stageId)
      .in('trigger_type', triggerTypes)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('[PipelineTrigger] Erro ao buscar workflows:', error);
      return [];
    }

    if (!workflows || workflows.length === 0) {
      return [];
    }

    // Filtrar por tenant (segurança adicional - RLS já filtra, mas double-check)
    const matchedWorkflows = workflows.filter((w) => {
      // Verificar tenant match
      if (w.tenant_id !== event.tenantId) return false;

      // Verificar franchise match (se workflow tem franchise_id, deve bater)
      if (w.franchise_id && w.franchise_id !== event.franchiseId) return false;

      // Verificar condições adicionais do trigger_config
      return evaluateTriggerConditions(w.trigger_config, event);
    });

    return matchedWorkflows as WorkflowMatch[];
  } catch (err) {
    console.error('[PipelineTrigger] Erro no dispatch:', err);
    return [];
  }
}

/**
 * Avalia condições extras do trigger_config contra o evento.
 */
function evaluateTriggerConditions(
  triggerConfig: Record<string, any> | null,
  event: PipelineEvent
): boolean {
  if (!triggerConfig) return true;

  // Verificar condição de tempo (para triggers tipo 'tempo')
  if (triggerConfig.tempo_dias && event.type === 'lead_timeout') {
    const diasMinimos = triggerConfig.tempo_dias;
    const diasNaEtapa = event.data?.diasNaEtapa || 0;
    if (diasNaEtapa < diasMinimos) return false;
  }

  // Verificar condição de valor (ex: só executar se valor > X)
  if (triggerConfig.condicao?.valor_minimo) {
    const valorLead = event.data?.valor_estimado || 0;
    if (valorLead < triggerConfig.condicao.valor_minimo) return false;
  }

  // Verificar condição de tags
  if (triggerConfig.condicao?.tags_requeridas) {
    const tagsLead = event.data?.tags || [];
    const tagsRequeridas = triggerConfig.condicao.tags_requeridas as string[];
    const temTodasTags = tagsRequeridas.every((tag) => tagsLead.includes(tag));
    if (!temTodasTags) return false;
  }

  // Verificar condição de origem específica (só acionar se veio de uma etapa específica)
  if (triggerConfig.condicao?.origem_especifica) {
    const origemId = triggerConfig.condicao.origem_especifica as string;
    if (event.previousStageId && event.previousStageId !== origemId) return false;
  }

  // Verificar condição de responsável (só acionar se lead tem responsável específico)
  if (triggerConfig.condicao?.responsavel_id) {
    const responsavelRequerido = triggerConfig.condicao.responsavel_id as string;
    if (event.data?.responsavel_id && event.data.responsavel_id !== responsavelRequerido) return false;
  }

  return true;
}

/**
 * Helper: cria o evento de "lead entrou na etapa" a partir dos dados do move.
 */
export function createStageEntryEvent(params: {
  funilLeadId: string;
  funilId: string;
  leadId: string;
  tenantId: string;
  franchiseId?: string | null;
  destinationStageId: string;
  sourceStageId?: string | null;
  stageType?: string;
  extraData?: Record<string, any>;
}): PipelineEvent {
  let eventType: PipelineEventType = 'lead_entered_stage';

  // Determinar tipo de evento baseado no tipo da etapa destino
  if (params.stageType === 'ganho') {
    eventType = 'lead_won';
  } else if (params.stageType === 'perda') {
    eventType = 'lead_lost';
  }

  return {
    type: eventType,
    funilLeadId: params.funilLeadId,
    funilId: params.funilId,
    leadId: params.leadId,
    tenantId: params.tenantId,
    franchiseId: params.franchiseId,
    stageId: params.destinationStageId,
    previousStageId: params.sourceStageId,
    data: params.extraData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper: cria o evento de "lead saiu da etapa".
 */
export function createStageExitEvent(params: {
  funilLeadId: string;
  funilId: string;
  leadId: string;
  tenantId: string;
  franchiseId?: string | null;
  sourceStageId: string;
  destinationStageId: string;
  extraData?: Record<string, any>;
}): PipelineEvent {
  return {
    type: 'lead_left_stage',
    funilLeadId: params.funilLeadId,
    funilId: params.funilId,
    leadId: params.leadId,
    tenantId: params.tenantId,
    franchiseId: params.franchiseId,
    stageId: params.sourceStageId,
    previousStageId: null,
    data: {
      ...params.extraData,
      destinationStageId: params.destinationStageId,
    },
    timestamp: new Date().toISOString(),
  };
}
