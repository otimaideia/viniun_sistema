import type { AIAgent } from './ai-agent';

// === ENUMS & TYPE ALIASES ===

export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIMessageRole = 'user' | 'assistant' | 'system';
export type AIConversationStatus = 'active' | 'closed';
export type AIActionVariant = 'default' | 'outline' | 'destructive';
export type AIMemoryType = 'fact' | 'preference' | 'context' | 'learning' | 'insight';
export type AIApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AITriggerType = 'manual' | 'scheduled' | 'event' | 'keyword' | 'proactive';
export type AISkillCategory = 'vendas' | 'marketing' | 'operacao' | 'financeiro' | 'rh' | 'suporte' | 'analytics' | 'admin';
export type AILearningStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AILearningSource = 'whatsapp' | 'leads' | 'appointments' | 'forms' | 'documents' | 'manual';
export type AIProactiveFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';

// === INTERFACES ===

export interface YESiaConfig {
  id: string;
  tenant_id: string;
  assistant_name: string;
  personality: string | null;
  welcome_message: string | null;
  is_active: boolean;
  allowed_roles: string[];
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[];
  default_provider: AIProvider;
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  openai_api_key_encrypted: string | null;
  anthropic_api_key_encrypted: string | null;
  google_api_key_encrypted: string | null;
  router_model: string | null;
  daily_limit_usd: number | null;
  monthly_limit_usd: number | null;
  alert_threshold_percent: number;
  cost_per_1k_tokens_override: Record<string, number> | null;
  enable_memory: boolean;
  enable_proactive: boolean;
  enable_function_calling: boolean;
  enable_knowledge_rag: boolean;
  enable_whatsapp_learning: boolean;
  enable_document_processing: boolean;
  enable_audio_transcription: boolean;
  learning_schedule: string | null;
  learning_cron: string | null;
  last_learning_at: string | null;
  total_knowledge_items: number;
  created_at: string;
  updated_at: string;
}

export interface YESiaAction {
  label: string;
  route?: string;
  action?: string;
  icon?: string;
  variant: AIActionVariant;
}

export interface YESiaMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  agent_used: string | null;
  actions: YESiaAction[];
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface YESiaConversation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  canal: string | null;
  status: AIConversationStatus;
  contato_nome: string | null;
  total_mensagens: number | null;
  last_message_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface YESiaChatResponse {
  reply: string;
  agent_used: {
    id: string;
    nome: string;
    domain: string;
    avatar_url: string | null;
  } | null;
  actions: YESiaAction[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  conversation_id: string;
}

export interface AIMemory {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string | null;
  agent_id: string | null;
  memory_type: AIMemoryType;
  content: string;
  importance: number;
  source: string | null;
  metadata: Record<string, any> | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

export interface AITokenUsage {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  data: string;
  user_id: string | null;
  agent_id: string | null;
  provider: AIProvider;
  model: string;
  total_requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  estimated_cost_brl: number;
  is_limit_reached: boolean;
  created_at: string;
}

export interface AISkillExecution {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  agent_id: string;
  user_id: string;
  conversation_id: string | null;
  skill_name: string;
  skill_category: AISkillCategory;
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  execution_time_ms: number | null;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
}

export interface AILearningJob {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  source: AILearningSource;
  source_config: Record<string, any> | null;
  status: AILearningStatus;
  items_processed: number;
  items_total: number;
  items_created: number;
  items_updated: number;
  items_skipped: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AIDocumentEmbedding {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  document_type: string;
  document_id: string | null;
  title: string;
  content: string;
  content_hash: string;
  chunk_index: number;
  total_chunks: number;
  embedding: number[] | null;
  metadata: Record<string, any> | null;
  source: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AIProactiveRule {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  agent_id: string | null;
  nome: string;
  descricao: string | null;
  trigger_condition: string;
  trigger_query: string | null;
  frequency: AIProactiveFrequency;
  message_template: string;
  target_roles: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AdCampaign {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  platform: 'meta_ads' | 'google_ads' | 'tiktok_ads';
  platform_campaign_id: string;
  nome: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  objetivo: string | null;
  orcamento_diario: number | null;
  orcamento_total: number | null;
  gasto_total: number;
  impressoes: number;
  cliques: number;
  conversoes: number;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  metadata: Record<string, any> | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AdAttribution {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  campaign_id: string;
  lead_id: string | null;
  form_submission_id: string | null;
  appointment_id: string | null;
  sale_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_id: string | null;
  attribution_model: 'first_click' | 'last_click' | 'linear' | 'time_decay';
  attribution_weight: number;
  revenue_attributed: number;
  created_at: string;
  // JOINs
  campaign?: AdCampaign;
}

export interface AIAgentExtended extends AIAgent {
  skill_category: AISkillCategory | null;
  trigger_type: AITriggerType;
  trigger_config: Record<string, any> | null;
  data_sources: string[];
  data_query_template: string | null;
  response_format_yesia: string | null;
  proactive_enabled: boolean;
  knowledge_ids: string[];
  personality: string | null;
  domain: string | null;
  routing_keywords: string[];
  routing_priority: number;
  can_execute_actions: boolean;
  available_actions: string[];
  auto_generated: boolean;
  generation_reason: string | null;
  generation_evidence: Record<string, any> | null;
  approval_status: AIApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  deleted_at: string | null;
}

// === CONSTANTS ===

export const AI_DOMAINS: Record<string, { label: string; color: string }> = {
  vendas: { label: 'Vendas', color: 'text-blue-600 bg-blue-50' },
  marketing: { label: 'Marketing', color: 'text-purple-600 bg-purple-50' },
  atendimento: { label: 'Atendimento', color: 'text-green-600 bg-green-50' },
  operacao: { label: 'Operação', color: 'text-orange-600 bg-orange-50' },
  financeiro: { label: 'Financeiro', color: 'text-emerald-600 bg-emerald-50' },
  rh: { label: 'RH', color: 'text-pink-600 bg-pink-50' },
  analytics: { label: 'Analytics', color: 'text-cyan-600 bg-cyan-50' },
  admin: { label: 'Administração', color: 'text-gray-600 bg-gray-50' },
};

export const AI_SKILL_CATEGORIES: Record<AISkillCategory, { label: string; icon: string }> = {
  vendas: { label: 'Vendas', icon: 'DollarSign' },
  marketing: { label: 'Marketing', icon: 'Megaphone' },
  operacao: { label: 'Operação', icon: 'Settings' },
  financeiro: { label: 'Financeiro', icon: 'Wallet' },
  rh: { label: 'Recursos Humanos', icon: 'Users' },
  suporte: { label: 'Suporte', icon: 'Headphones' },
  analytics: { label: 'Analytics', icon: 'BarChart3' },
  admin: { label: 'Administração', icon: 'Shield' },
};

export const AI_PROVIDERS: Record<AIProvider, { label: string; icon: string; color: string }> = {
  openai: { label: 'OpenAI', icon: 'Bot', color: 'text-green-600' },
  anthropic: { label: 'Anthropic', icon: 'Brain', color: 'text-orange-600' },
  google: { label: 'Google AI', icon: 'Sparkles', color: 'text-blue-600' },
};

export const AI_MODELS_EXTENDED = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido, Econômico)', cost_per_1k: 0.00015 },
    { value: 'gpt-4o', label: 'GPT-4o (Avançado)', cost_per_1k: 0.005 },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Potente)', cost_per_1k: 0.01 },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Básico)', cost_per_1k: 0.0005 },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recomendado)', cost_per_1k: 0.003 },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rápido)', cost_per_1k: 0.00025 },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Avançado)', cost_per_1k: 0.015 },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', cost_per_1k: 0.00125 },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Rápido)', cost_per_1k: 0.000075 },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Novo)', cost_per_1k: 0.0001 },
  ],
};
