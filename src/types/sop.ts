// Tipos para o módulo de Processos e Procedimentos (SOPs)

export interface MTSOPCategory {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  parent_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  children?: MTSOPCategory[];
  sops_count?: number;
  parent?: MTSOPCategory;
}

export type SOPStatus = 'rascunho' | 'em_revisao' | 'aprovado' | 'publicado' | 'arquivado';
export type SOPPrioridade = 'baixa' | 'normal' | 'alta' | 'critica';
export type SOPStepTipo = 'acao' | 'decisao' | 'espera' | 'verificacao' | 'registro';
export type SOPExecutionStatus = 'em_andamento' | 'concluido' | 'cancelado' | 'pausado';
export type SOPExecutionStepStatus = 'pendente' | 'em_andamento' | 'concluido' | 'pulado' | 'nao_aplicavel';

export interface MTSOP {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  category_id: string | null;
  department_id: string | null;
  codigo: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  escopo: string | null;
  versao: number;
  versao_label: string;
  status: SOPStatus;
  prioridade: SOPPrioridade;
  responsavel_id: string | null;
  aprovador_id: string | null;
  aprovado_em: string | null;
  publicado_em: string | null;
  revisao_proxima: string | null;
  tempo_estimado_min: number | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  is_template: boolean;
  parent_sop_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  category?: MTSOPCategory;
  department?: { id: string; nome: string };
  responsavel?: { id: string; nome: string };
  aprovador?: { id: string; nome: string };
  steps?: MTSOPStep[];
  steps_count?: number;
  executions_count?: number;
}

export interface MTSOPStep {
  id: string;
  tenant_id: string;
  sop_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  tipo: SOPStepTipo;
  instrucoes: string | null;
  responsavel_role: string | null;
  tempo_estimado_min: number | null;
  is_obrigatorio: boolean;
  has_checklist: boolean;
  imagem_url: string | null;
  video_url: string | null;
  documento_url: string | null;
  position_x?: number;
  position_y?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  checklist_items?: MTSOPStepChecklist[];
}

export interface MTSOPStepChecklist {
  id: string;
  tenant_id: string;
  step_id: string;
  ordem: number;
  descricao: string;
  is_obrigatorio: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface MTSOPRole {
  id: string;
  tenant_id: string;
  sop_id: string;
  role: string;
  can_view: boolean;
  can_execute: boolean;
  can_edit: boolean;
  created_at: string;
}

export interface MTSOPExecution {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  sop_id: string;
  user_id: string;
  status: SOPExecutionStatus;
  started_at: string;
  completed_at: string | null;
  tempo_gasto_min: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  sop?: MTSOP;
  user?: { id: string; nome: string };
  steps?: MTSOPExecutionStep[];
}

export interface MTSOPExecutionStep {
  id: string;
  tenant_id: string;
  execution_id: string;
  step_id: string;
  status: SOPExecutionStepStatus;
  completed_at: string | null;
  completed_by: string | null;
  observacoes: string | null;
  evidencia_url: string | null;
  created_at: string;
  // Joins
  step?: MTSOPStep;
  checklist?: MTSOPExecutionChecklist[];
}

export interface MTSOPExecutionChecklist {
  id: string;
  tenant_id: string;
  execution_step_id: string;
  checklist_item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  created_at: string;
}

export interface MTSOPFlowConnection {
  id: string;
  tenant_id: string;
  sop_id: string;
  from_step_id: string;
  to_step_id: string;
  condition_label: string | null;
  is_default: boolean;
  created_at: string;
}

export interface SOPFilters {
  search?: string;
  status?: SOPStatus;
  category_id?: string;
  department_id?: string;
  prioridade?: SOPPrioridade;
  responsavel_id?: string;
  is_template?: boolean;
}

export interface SOPMetrics {
  total_sops: number;
  publicados: number;
  em_revisao: number;
  rascunhos: number;
  total_execucoes: number;
  execucoes_concluidas: number;
  taxa_conclusao: number;
  tempo_medio_min: number;
  sops_mais_executados: { sop_id: string; titulo: string; count: number }[];
}

// Status labels e cores
export const SOP_STATUS_CONFIG: Record<SOPStatus, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  em_revisao: { label: 'Em Revisão', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  publicado: { label: 'Publicado', color: 'text-green-600', bgColor: 'bg-green-100' },
  arquivado: { label: 'Arquivado', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const SOP_PRIORIDADE_CONFIG: Record<SOPPrioridade, { label: string; color: string; bgColor: string }> = {
  baixa: { label: 'Baixa', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  alta: { label: 'Alta', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critica: { label: 'Crítica', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const SOP_STEP_TIPO_CONFIG: Record<SOPStepTipo, { label: string; icon: string; color: string }> = {
  acao: { label: 'Ação', icon: 'Play', color: '#4CAF50' },
  decisao: { label: 'Decisão', icon: 'GitBranch', color: '#FF9800' },
  espera: { label: 'Espera', icon: 'Clock', color: '#9E9E9E' },
  verificacao: { label: 'Verificação', icon: 'CheckCircle', color: '#2196F3' },
  registro: { label: 'Registro', icon: 'FileText', color: '#9C27B0' },
};
