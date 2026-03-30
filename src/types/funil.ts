// Tipos para o Módulo de Funil de Vendas

// =============================================================================
// FUNIL
// =============================================================================

export interface Funil {
  id: string;
  nome: string;
  descricao: string | null;
  franqueado_id: string | null; // NULL = template global
  is_template: boolean;
  template_origem_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FunilCreate {
  nome: string;
  descricao?: string;
  franqueado_id?: string | null;
  is_template?: boolean;
  template_origem_id?: string | null;
}

export interface FunilUpdate {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
}

// =============================================================================
// ETAPAS DO FUNIL
// =============================================================================

export type EtapaTipo = 'ativa' | 'ganho' | 'perda';

export interface FunilEtapa {
  id: string;
  funil_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  tipo: EtapaTipo;
  meta_dias: number | null; // Dias máximo nesta etapa (alerta)
  automacao_dias: number | null; // Mover automaticamente após X dias
  automacao_destino_id: string | null;
  created_at: string;
}

export interface FunilEtapaCreate {
  funil_id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  ordem: number;
  tipo?: EtapaTipo;
  meta_dias?: number | null;
  automacao_dias?: number | null;
  automacao_destino_id?: string | null;
}

export interface FunilEtapaUpdate {
  nome?: string;
  descricao?: string | null;
  cor?: string;
  icone?: string;
  ordem?: number;
  tipo?: EtapaTipo;
  meta_dias?: number | null;
  automacao_dias?: number | null;
  automacao_destino_id?: string | null;
}

// =============================================================================
// LEADS NO FUNIL
// =============================================================================

export interface FunilLead {
  id: string;
  funil_id?: string; // Legacy (deprecated)
  funnel_id?: string; // MT table column
  etapa_id?: string; // Legacy (deprecated)
  stage_id?: string; // MT table column
  lead_id: string;
  valor_estimado: number | null;
  prioridade: number;
  responsavel_id: string | null;
  data_entrada: string;
  data_etapa: string;
  observacoes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface FunilLeadCreate {
  funil_id: string;
  etapa_id: string;
  lead_id: string;
  valor_estimado?: number | null;
  prioridade?: number;
  responsavel_id?: string | null;
  observacoes?: string;
  tags?: string[];
}

export interface FunilLeadUpdate {
  etapa_id?: string;
  valor_estimado?: number | null;
  prioridade?: number;
  responsavel_id?: string | null;
  data_etapa?: string;
  observacoes?: string | null;
  tags?: string[] | null;
}

// Lead expandido com dados do mt_leads
export interface FunilLeadExpanded extends FunilLead {
  lead?: {
    id: string;
    nome: string;
    telefone: string;
    whatsapp?: string;
    email: string;
    unidade: string;
    cidade: string;
    estado?: string;
    status: string;
    foto_url?: string | null;
    created_at: string;
  };
  etapa?: FunilEtapa;
  responsavel?: {
    id: string;
    full_name: string;
    email: string;
  };
  whatsapp_cache?: FunilWhatsAppCache;
}

// =============================================================================
// HISTÓRICO
// =============================================================================

export interface FunilHistorico {
  id: string;
  funil_lead_id: string;
  etapa_origem_id: string | null;
  etapa_destino_id: string;
  usuario_id: string | null;
  motivo: string | null;
  created_at: string;
}

export interface FunilHistoricoExpanded extends FunilHistorico {
  etapa_origem?: FunilEtapa | null;
  etapa_destino?: FunilEtapa;
  usuario?: {
    id: string;
    nome: string;
  };
}

// =============================================================================
// WHATSAPP CACHE
// =============================================================================

export interface FunilWhatsAppCache {
  id: string;
  lead_id: string;
  conversa_id: string | null;
  telefone_normalizado: string | null;
  avatar_url: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_at: string | null;
  unread_count: number;
  updated_at: string;
}

// =============================================================================
// AUTOMAÇÕES
// =============================================================================

export type AutomacaoTipo = 'timeout' | 'alerta' | 'mensagem' | 'agendamento';

export interface AutomacaoTimeoutConfig {
  dias: number;
  destino_etapa_id: string;
  ignorar_fins_semana?: boolean;
}

export interface AutomacaoAlertaConfig {
  dias: number;
  tipo_alerta: 'esfriando' | 'critico';
}

export interface AutomacaoMensagemConfig {
  template_id: string;
  sessao_id: string;
}

export interface AutomacaoAgendamentoConfig {
  ao_agendar: boolean;
  destino_etapa_id: string;
  enviar_confirmacao?: boolean;
}

export type AutomacaoConfig =
  | AutomacaoTimeoutConfig
  | AutomacaoAlertaConfig
  | AutomacaoMensagemConfig
  | AutomacaoAgendamentoConfig;

export interface FunilAutomacao {
  id: string;
  etapa_id: string;
  tipo: AutomacaoTipo;
  config: AutomacaoConfig;
  ativo: boolean;
  created_at: string;
}

export interface FunilAutomacaoCreate {
  etapa_id: string;
  tipo: AutomacaoTipo;
  config: AutomacaoConfig;
  ativo?: boolean;
}

// =============================================================================
// TEMPLATES DE MENSAGEM
// =============================================================================

export interface FunilMensagemTemplate {
  id: string;
  funil_id: string | null;
  nome: string;
  mensagem: string;
  variaveis: string[] | null;
  ativo: boolean;
  created_at: string;
}

export interface FunilMensagemTemplateCreate {
  funil_id?: string | null;
  nome: string;
  mensagem: string;
  variaveis?: string[];
}

// =============================================================================
// LOG DE AUTOMAÇÕES
// =============================================================================

export type AutomacaoResultado = 'sucesso' | 'falha' | 'ignorado';

export interface FunilAutomacaoLog {
  id: string;
  automacao_id: string | null;
  funil_lead_id: string | null;
  acao: string;
  resultado: AutomacaoResultado | null;
  detalhes: Record<string, unknown> | null;
  created_at: string;
}

// =============================================================================
// KANBAN / UI
// =============================================================================

export interface KanbanColumn {
  etapa: FunilEtapa;
  leads: FunilLeadExpanded[];
  totalLeads: number;
  totalValor: number;
}

export interface KanbanBoard {
  funil: Funil;
  columns: KanbanColumn[];
}

// Drag & Drop
export interface DragItem {
  type: 'lead';
  funilLeadId: string;
  sourceEtapaId: string;
}

export interface DropResult {
  funilLeadId: string;
  sourceEtapaId: string;
  destinationEtapaId: string;
  newPrioridade?: number;
}

// =============================================================================
// MÉTRICAS
// =============================================================================

export interface FunilMetrics {
  totalLeads: number;
  totalValor: number;
  leadsNovos: number; // Últimos 7 dias
  leadsFechados: number; // Últimos 7 dias
  leadsPerdidos: number; // Últimos 7 dias
  taxaConversao: number; // %
  tempoMedioFechamento: number; // dias
}

export interface EtapaMetrics {
  etapaId: string;
  totalLeads: number;
  totalValor: number;
  tempoMedio: number; // dias
  taxaConversaoProxima: number; // % que avançam
  leadsEsfriando: number; // Acima do meta_dias
}

// =============================================================================
// FILTROS
// =============================================================================

export interface FunilFilters {
  funilId?: string;
  responsavelId?: string;
  etapaIds?: string[];
  tags?: string[];
  valorMin?: number;
  valorMax?: number;
  dataEntradaInicio?: string;
  dataEntradaFim?: string;
  busca?: string; // Nome, telefone, email
  apenasEsfriando?: boolean;
}

// =============================================================================
// CORES PADRÃO PARA ETAPAS
// =============================================================================

export const ETAPA_CORES = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#6366f1', label: 'Índigo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Verde-água' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#64748b', label: 'Cinza' },
] as const;

// =============================================================================
// ÍCONES PADRÃO PARA ETAPAS
// =============================================================================

export const ETAPA_ICONES = [
  { value: 'circle', label: 'Círculo' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'phone', label: 'Telefone' },
  { value: 'message-circle', label: 'Mensagem' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'clipboard-check', label: 'Checklist' },
  { value: 'user-check', label: 'Usuário OK' },
  { value: 'handshake', label: 'Acordo' },
  { value: 'trophy', label: 'Troféu' },
  { value: 'x-circle', label: 'Cancelado' },
  { value: 'clock', label: 'Relógio' },
  { value: 'star', label: 'Estrela' },
] as const;

// =============================================================================
// TEMPLATE PADRÃO DE ETAPAS
// =============================================================================

export const ETAPAS_PADRAO: Omit<FunilEtapaCreate, 'funil_id'>[] = [
  { nome: 'Novo Lead', cor: '#3b82f6', icone: 'inbox', ordem: 0, tipo: 'ativa', meta_dias: 2 },
  { nome: 'Contato Iniciado', cor: '#06b6d4', icone: 'phone', ordem: 1, tipo: 'ativa', meta_dias: 3 },
  { nome: 'Contato Efetivo', cor: '#6366f1', icone: 'message-circle', ordem: 2, tipo: 'ativa', meta_dias: 5 },
  { nome: 'Avaliação Agendada', cor: '#f97316', icone: 'calendar', ordem: 3, tipo: 'ativa', meta_dias: 7 },
  { nome: 'Avaliação Realizada', cor: '#8b5cf6', icone: 'clipboard-check', ordem: 4, tipo: 'ativa', meta_dias: 5 },
  { nome: 'Proposta Enviada', cor: '#eab308', icone: 'handshake', ordem: 5, tipo: 'ativa', meta_dias: 7 },
  { nome: 'Cliente Fechado', cor: '#22c55e', icone: 'trophy', ordem: 6, tipo: 'ganho' },
  { nome: 'Perdido', cor: '#ef4444', icone: 'x-circle', ordem: 7, tipo: 'perda' },
];
