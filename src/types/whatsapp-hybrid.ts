// =====================================================
// TYPES: Sistema Híbrido WAHA + Meta Cloud API
// =====================================================

// === PROVIDER ===
export type ProviderType = 'waha' | 'meta_cloud_api';
export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'suspended' | 'configuring';

export interface WhatsAppProvider {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  provider_type: ProviderType;
  nome: string;
  descricao?: string;
  phone_number: string;

  // WAHA config
  waha_url?: string;
  waha_api_key?: string;
  waha_session_name?: string;
  waha_session_id?: string;

  // Meta Cloud API config
  meta_phone_number_id?: string;
  meta_waba_id?: string;
  meta_business_account_id?: string;
  meta_access_token?: string;
  meta_webhook_verify_token?: string;
  meta_api_version?: string;

  // Status
  status: ProviderStatus;
  last_health_check?: string;
  health_details?: Record<string, unknown>;
  error_count: number;
  last_error_at?: string;
  last_error_message?: string;

  // Coexistência
  coexistence_enabled: boolean;
  coexistence_partner_id?: string;

  // Controle
  priority: number;
  is_active: boolean;
  is_default: boolean;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string;

  // Joins
  tenant?: { slug: string; nome_fantasia: string };
  franchise?: { nome: string; cidade: string };
  partner?: WhatsAppProvider;
  session?: { id: string; nome: string; status: string };
}

export interface CreateProviderInput {
  provider_type: ProviderType;
  nome: string;
  descricao?: string;
  phone_number: string;
  franchise_id?: string;
  // WAHA
  waha_url?: string;
  waha_api_key?: string;
  waha_session_name?: string;
  waha_session_id?: string;
  // Meta
  meta_phone_number_id?: string;
  meta_waba_id?: string;
  meta_business_account_id?: string;
  meta_access_token?: string;
  meta_api_version?: string;
  // Config
  priority?: number;
  is_default?: boolean;
  coexistence_enabled?: boolean;
  coexistence_partner_id?: string;
}

export interface UpdateProviderInput extends Partial<CreateProviderInput> {
  id: string;
  status?: ProviderStatus;
  is_active?: boolean;
}

// === WINDOW (Janela 24h) ===
export type WindowType = '24h' | '72h';
export type EntryPointType = 'user_initiated' | 'free_entry_point' | 'referral';

export interface WhatsAppWindow {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  conversation_id: string;
  provider_id?: string;
  last_customer_message_at: string;
  entry_point_type: EntryPointType;
  window_type: WindowType;
  window_expires_at: string;
  messages_sent_in_window: number;
  created_at: string;
  updated_at: string;
}

export interface WindowStatus {
  is_open: boolean;
  window_type: WindowType;
  expires_at: string | null;
  time_remaining_ms: number;
  time_remaining_text: string;
  messages_sent: number;
  entry_point: EntryPointType;
}

// === ROUTING RULE ===
export type ConditionType =
  | 'window_open'
  | 'window_closed'
  | 'message_type'
  | 'bulk_campaign'
  | 'business_hours'
  | 'outside_business_hours'
  | 'first_contact'
  | 'follow_up'
  | 'template_required'
  | 'always';

export type ProviderPreference = 'waha' | 'meta_cloud_api' | 'cheapest' | 'fastest';

export interface WhatsAppRoutingRule {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  nome: string;
  descricao?: string;
  condition_type: ConditionType;
  condition_params: Record<string, unknown>;
  preferred_provider: ProviderPreference;
  fallback_provider?: ProviderType;
  force_provider: boolean;
  alert_before_cost: boolean;
  require_confirmation: boolean;
  max_cost_per_message?: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string;

  // Joins
  tenant?: { slug: string; nome_fantasia: string };
  franchise?: { nome: string };
}

export interface CreateRoutingRuleInput {
  nome: string;
  descricao?: string;
  franchise_id?: string;
  condition_type: ConditionType;
  condition_params?: Record<string, unknown>;
  preferred_provider: ProviderPreference;
  fallback_provider?: ProviderType;
  force_provider?: boolean;
  alert_before_cost?: boolean;
  require_confirmation?: boolean;
  max_cost_per_message?: number;
  priority?: number;
}

export interface UpdateRoutingRuleInput extends Partial<CreateRoutingRuleInput> {
  id: string;
  is_active?: boolean;
}

// === META TEMPLATE ===
export type TemplateCategory = 'UTILITY' | 'AUTHENTICATION' | 'MARKETING' | 'SERVICE';
export type TemplateApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
export type TemplateHeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface WhatsAppMetaTemplate {
  id: string;
  tenant_id: string;
  provider_id: string;
  meta_template_id: string;
  meta_template_name: string;
  language: string;
  category: TemplateCategory;
  header_type?: TemplateHeaderType;
  header_text?: string;
  header_media_url?: string;
  body_text: string;
  body_variables?: string[];
  footer_text?: string;
  buttons?: TemplateButton[];
  approval_status: TemplateApprovalStatus;
  quality_score?: string;
  rejection_reason?: string;
  internal_template_id?: string;
  estimated_cost_brl?: number;
  is_active: boolean;
  synced_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joins
  provider?: WhatsAppProvider;
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateMetaTemplateInput {
  provider_id: string;
  meta_template_name: string;
  language?: string;
  category: TemplateCategory;
  header_type?: TemplateHeaderType;
  header_text?: string;
  body_text: string;
  body_variables?: string[];
  footer_text?: string;
  buttons?: TemplateButton[];
  estimated_cost_brl?: number;
}

// === COST ===
export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface WhatsAppCost {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  budget_limit?: number;
  budget_alert_threshold: number;
  budget_alert_sent: boolean;
  total_messages: number;
  messages_waha: number;
  messages_meta_free: number;
  messages_meta_paid: number;
  cost_total: number;
  cost_utility: number;
  cost_authentication: number;
  cost_marketing: number;
  cost_service: number;
  created_at: string;
  updated_at: string;

  // Computed
  budget_usage_pct?: number;
  franchise?: { nome: string; cidade: string };
}

export interface UpdateBudgetInput {
  franchise_id?: string;
  period_type: PeriodType;
  budget_limit: number;
  budget_alert_threshold?: number;
}

// === ROUTING LOG ===
export interface WhatsAppRoutingLog {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  message_id?: string;
  conversation_id?: string;
  provider_id?: string;
  user_id?: string;
  provider_selected: ProviderType;
  rule_applied_id?: string;
  rule_applied_name?: string;
  decision_reason?: string;
  window_status?: string;
  window_expires_at?: string;
  estimated_cost: number;
  actual_cost?: number;
  cost_category?: string;
  success?: boolean;
  error_message?: string;
  fallback_used: boolean;
  fallback_provider?: string;
  response_time_ms?: number;
  created_at: string;

  // Joins
  user?: { nome: string; email: string };
  rule?: WhatsAppRoutingRule;
}

// === ROUTING DECISION (Frontend Only - não persiste) ===
export interface RoutingDecision {
  provider: ProviderType;
  provider_id: string;
  provider_name: string;
  reason: string;
  rule_applied?: WhatsAppRoutingRule;
  window_open: boolean;
  window_expires_at?: string;
  estimated_cost: number;
  cost_category?: TemplateCategory;
  is_free: boolean;
  requires_template: boolean;
  requires_confirmation: boolean;
  fallback_available: boolean;
  fallback_provider?: ProviderType;
}

// === COST ESTIMATE ===
export interface CostEstimate {
  provider: ProviderType;
  category: TemplateCategory;
  cost_brl: number;
  is_free: boolean;
  reason: string;
  quantity?: number;
  total_cost?: number;
}

// === CUSTO DE REFERÊNCIA (Brasil - Fevereiro 2026) ===
export const META_COST_TABLE_BRL: Record<TemplateCategory, number> = {
  UTILITY: 0.10,
  AUTHENTICATION: 0.10,
  MARKETING: 0.25,
  SERVICE: 0.00,
};

// === LABELS para UI ===
export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  waha: 'WAHA',
  meta_cloud_api: 'Meta Cloud API',
};

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Erro',
  suspended: 'Suspenso',
  configuring: 'Configurando',
};

export const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  window_open: 'Janela 24h aberta',
  window_closed: 'Janela 24h fechada',
  message_type: 'Tipo de mensagem',
  bulk_campaign: 'Campanha em massa',
  business_hours: 'Horário comercial',
  outside_business_hours: 'Fora do horário',
  first_contact: 'Primeiro contato',
  follow_up: 'Follow-up',
  template_required: 'Template obrigatório',
  always: 'Sempre',
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
  MARKETING: 'Marketing',
  SERVICE: 'Serviço (Grátis)',
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateApprovalStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAUSED: 'Pausado',
  DISABLED: 'Desativado',
};

// === HELPER: Calcular status da janela ===
export function calculateWindowStatus(window: WhatsAppWindow | null): WindowStatus {
  if (!window) {
    return {
      is_open: false,
      window_type: '24h',
      expires_at: null,
      time_remaining_ms: 0,
      time_remaining_text: 'Sem janela',
      messages_sent: 0,
      entry_point: 'user_initiated',
    };
  }

  const now = Date.now();
  const expiresAt = new Date(window.window_expires_at).getTime();
  const remaining = expiresAt - now;
  const isOpen = remaining > 0;

  let timeText = 'Expirada';
  if (isOpen) {
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      timeText = `${hours}h ${minutes}min`;
    } else {
      timeText = `${minutes}min`;
    }
  }

  return {
    is_open: isOpen,
    window_type: window.window_type,
    expires_at: window.window_expires_at,
    time_remaining_ms: Math.max(0, remaining),
    time_remaining_text: timeText,
    messages_sent: window.messages_sent_in_window,
    entry_point: window.entry_point_type,
  };
}

// === HELPER: Estimar custo ===
export function estimateCost(
  category: TemplateCategory,
  quantity: number = 1
): CostEstimate {
  const costPerMsg = META_COST_TABLE_BRL[category];
  const isFree = costPerMsg === 0;

  return {
    provider: 'meta_cloud_api',
    category,
    cost_brl: costPerMsg,
    is_free: isFree,
    reason: isFree
      ? 'Mensagem dentro da janela 24h (grátis)'
      : `Template ${category} - R$ ${costPerMsg.toFixed(2)}/msg`,
    quantity,
    total_cost: costPerMsg * quantity,
  };
}

// === HELPER: Formato de custo ===
export function formatCostBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
