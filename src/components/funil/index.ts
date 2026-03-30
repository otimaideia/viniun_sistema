// Componentes do Funil de Vendas

// Kanban
export { KanbanBoard } from './KanbanBoard';
export { KanbanColumn } from './KanbanColumn';
export { KanbanCard, KanbanCardOverlay } from './KanbanCard';
export { KanbanCardDetail } from './KanbanCardDetail';

// Seletores e Formulários
export { FunilSelector } from './FunilSelector';

// Ações e Dialogs
export { LeadQuickActions } from './LeadQuickActions';
export { LeadAssignDialog } from './LeadAssignDialog';
export { LeadValorDialog } from './LeadValorDialog';
export { LeadTagDialog } from './LeadTagDialog';

// Automações
export { AutomacaoConfig } from './AutomacaoConfig';
export { MensagemTemplateEditor } from './MensagemTemplateEditor';

// Pipeline Triggers
export { PipelineTriggersConfig } from './PipelineTriggersConfig';
export { TriggerExecutionLog } from './TriggerExecutionLog';

// Métricas e Gráficos
export { FunilMetrics, EtapaMetricsBar } from './FunilMetrics';
export {
  FunilChart,
  ValorPorEtapaChart,
  TempoPorEtapaChart,
  ConversaoChart,
  ResponsavelChart,
} from './FunilMetricsChart';
