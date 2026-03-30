/**
 * Pipeline Triggers - Sistema de Automação do Funil de Vendas
 *
 * Exporta todos os módulos necessários para uso no frontend.
 */

export {
  dispatchPipelineEvent,
  createStageEntryEvent,
  createStageExitEvent,
} from './eventDispatcher';

export type {
  PipelineEventType,
  PipelineEvent,
  WorkflowMatch,
} from './eventDispatcher';

export {
  executeWorkflows,
  processPipelineEvent,
  registerStepExecutor,
} from './workflowEngine';

export type {
  ActionType,
  ExecutionResult,
  ExecutionContext,
} from './workflowEngine';
