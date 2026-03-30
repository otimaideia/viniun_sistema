// =============================================================================
// DASHBOARD DINÂMICO - TIPOS
// Tipos para o sistema de dashboard configurável por perfil profissional
// =============================================================================

export type WidgetTipo = 'kpi' | 'chart' | 'funnel' | 'table' | 'list' | 'calendar' | 'progress';
export type WidgetSubtipo = 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'stacked';

export type QueryScope = 'user' | 'franchise' | 'tenant';
export type QueryPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// -----------------------------------------------------------------------------
// Dashboard Profile
// -----------------------------------------------------------------------------

export interface MTDashboardProfile {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  role_codigos: string[];
  cargos: string[];
  is_default: boolean;
  is_active: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
  boards?: MTDashboardBoard[];
}

// -----------------------------------------------------------------------------
// Dashboard Board (múltiplos por perfil)
// -----------------------------------------------------------------------------

export interface MTDashboardBoard {
  id: string;
  tenant_id: string;
  profile_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  is_default: boolean;
  is_active: boolean;
  ordem: number;
  required_module?: string;
  required_permission?: string;
  created_at?: string;
  updated_at?: string;
  widgets?: MTDashboardBoardWidget[];
}

// -----------------------------------------------------------------------------
// Dashboard Board Widget
// -----------------------------------------------------------------------------

export interface WidgetQueryConfig {
  select?: string;
  columns?: string[];
  filters?: Record<string, any>;
  period?: QueryPeriod;
  group_by?: string;
  order_by?: string;
  limit?: number;
  scope?: QueryScope;
  type?: string;
  [key: string]: any;
}

export interface WidgetVisualConfig {
  show_trend?: boolean;
  show_label?: boolean;
  chart_colors?: string[];
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
  [key: string]: any;
}

export interface MTDashboardBoardWidget {
  id: string;
  tenant_id: string;
  board_id: string;
  widget_key: string;
  nome: string;
  descricao?: string;
  tipo: WidgetTipo;
  subtipo?: WidgetSubtipo;
  posicao_x: number;
  posicao_y: number;
  largura: number;
  altura: number;
  data_source: string;
  query_config: WidgetQueryConfig;
  icone?: string;
  cor?: string;
  config: WidgetVisualConfig;
  required_module?: string;
  required_permission?: string;
  is_active: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
  // Merged override from mt_dashboard_user_overrides
  _override?: WidgetUserOverride;
}

// -----------------------------------------------------------------------------
// User Override
// -----------------------------------------------------------------------------

export interface WidgetUserOverride {
  id?: string;
  is_hidden: boolean;
  posicao_x?: number;
  posicao_y?: number;
  largura?: number;
  altura?: number;
  config?: WidgetVisualConfig;
}

// -----------------------------------------------------------------------------
// Widget Data (retorno do query engine)
// -----------------------------------------------------------------------------

export interface WidgetData {
  value?: number | string;
  label?: string;
  items?: Record<string, any>[];
  series?: { name: string; data: { label: string; value: number }[] }[];
  trend?: { value: number; positive: boolean };
  stages?: { etapa: string; quantidade: number; percentual: number; conversaoAnterior: number }[];
  progress?: { current: number; target: number; percent: number };
}

// -----------------------------------------------------------------------------
// Allowed Data Sources (whitelist)
// -----------------------------------------------------------------------------

export const ALLOWED_DATA_SOURCES: Record<string, string> = {
  mt_leads: 'mt_leads',
  mt_appointments: 'mt_appointments',
  mt_whatsapp_messages: 'mt_whatsapp_messages',
  mt_whatsapp_conversations: 'mt_whatsapp_conversations',
  mt_services: 'mt_services',
  mt_campaigns: 'mt_campaigns',
  mt_form_submissions: 'mt_form_submissions',
  mt_influencer_referrals: 'mt_influencer_referrals',
  mt_goals: 'mt_goals',
  mt_lead_activities: 'mt_lead_activities',
};
