// Types for AI Agents system

export interface AIAgent {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  tipo: 'assistant' | 'quality';
  provider: 'openai' | 'anthropic';
  model: string;
  api_key_encrypted: string | null;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  context_instructions: string | null;
  output_format: 'suggestions' | 'analysis' | 'both';
  max_suggestions: number;
  include_reasoning: boolean;
  auto_transcribe_audio: boolean;
  max_history_messages: number;
  whisper_model: string;
  whisper_language: string;
  allowed_roles: string[];
  is_active: boolean;
  is_default: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AIAgentSuggestion {
  id: string;
  text: string;
  reasoning: string;
  type: 'reply' | 'question' | 'closing';
  confidence: number;
}

export interface AIAgentAnalysis {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  agent_id: string;
  conversation_id: string;
  requested_by: string;
  messages_analyzed: number;
  audio_messages_transcribed: number;
  context_tokens: number;
  analysis_text: string | null;
  quality_score: number | null;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | null;
  lead_intent: string | null;
  lead_temperature: 'hot' | 'warm' | 'cold' | null;
  suggestions: AIAgentSuggestion[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  processing_time_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  suggestion_used_id: string | null;
  was_helpful: boolean | null;
  feedback_text: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  updated_at: string;
  // Joined relation
  agent?: AIAgent;
}

export interface AIAudioTranscription {
  id: string;
  tenant_id: string;
  message_id: string;
  conversation_id: string;
  transcription: string;
  language: string;
  duration_seconds: number | null;
  confidence: number | null;
  whisper_model: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

// Agent templates for creating new agents
export interface AIAgentTemplate {
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  tipo: 'assistant' | 'quality';
  system_prompt: string;
  context_instructions: string;
  output_format: 'suggestions' | 'analysis' | 'both';
}

export const AI_AGENT_TEMPLATES: AIAgentTemplate[] = [
  {
    codigo: 'sdr',
    nome: 'SDR - Qualificador',
    descricao: 'Qualifica leads, identifica intenção de compra e sugere próximos passos',
    icone: 'UserSearch',
    cor: '#3b82f6',
    tipo: 'assistant',
    system_prompt: 'Você é um SDR especialista em qualificação de leads...',
    context_instructions: 'Contexto: empresa de franquias do mercado imobiliário.',
    output_format: 'suggestions',
  },
  {
    codigo: 'closer',
    nome: 'Closer - Conversão',
    descricao: 'Foca em fechar vendas, lidar com objeções e converter leads',
    icone: 'Target',
    cor: '#ef4444',
    tipo: 'assistant',
    system_prompt: 'Você é um Closer especialista em conversão...',
    context_instructions: '',
    output_format: 'suggestions',
  },
  {
    codigo: 'quality',
    nome: 'Qualidade - Analista',
    descricao: 'Analisa qualidade do atendimento, nota 0-10, pontos de melhoria',
    icone: 'ShieldCheck',
    cor: '#10b981',
    tipo: 'quality',
    system_prompt: 'Você é um Analista de Qualidade...',
    context_instructions: '',
    output_format: 'both',
  },
  {
    codigo: 'suporte',
    nome: 'Suporte - Atendimento',
    descricao: 'Resolve dúvidas, identifica problemas e sugere soluções',
    icone: 'Headphones',
    cor: '#8b5cf6',
    tipo: 'assistant',
    system_prompt: 'Você é um especialista em Suporte ao Cliente...',
    context_instructions: '',
    output_format: 'suggestions',
  },
  {
    codigo: 'pos_venda',
    nome: 'Pós-Venda',
    descricao: 'Follow-up, satisfação do cliente, upsell e fidelização',
    icone: 'Heart',
    cor: '#f59e0b',
    tipo: 'assistant',
    system_prompt: 'Você é um especialista em Pós-Venda...',
    context_instructions: '',
    output_format: 'suggestions',
  },
  {
    codigo: 'agendamento',
    nome: 'Agendamento',
    descricao: 'Foca em agendar atendimentos e confirmar horários',
    icone: 'CalendarCheck',
    cor: '#06b6d4',
    tipo: 'assistant',
    system_prompt: 'Você é um especialista em agendamentos...',
    context_instructions: '',
    output_format: 'suggestions',
  },
  {
    codigo: 'reativacao',
    nome: 'Reativação',
    descricao: 'Recupera leads frios e inativos com abordagem personalizada',
    icone: 'Flame',
    cor: '#f97316',
    tipo: 'assistant',
    system_prompt: 'Você é um especialista em reativação de leads...',
    context_instructions: '',
    output_format: 'suggestions',
  },
];

// Available AI models
export const AI_MODELS = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido, Econômico)' },
    { value: 'gpt-4o', label: 'GPT-4o (Avançado)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Potente)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Básico)' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recomendado)' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rápido)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Avançado)' },
  ],
};

// Sentiment labels in PT-BR
export const SENTIMENT_LABELS: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positivo', color: 'text-green-600 bg-green-50' },
  negative: { label: 'Negativo', color: 'text-red-600 bg-red-50' },
  neutral: { label: 'Neutro', color: 'text-gray-600 bg-gray-50' },
  mixed: { label: 'Misto', color: 'text-amber-600 bg-amber-50' },
};

// Lead temperature labels in PT-BR
export const LEAD_TEMPERATURE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  hot: { label: 'Quente', color: 'text-red-600 bg-red-50', icon: 'Flame' },
  warm: { label: 'Morno', color: 'text-amber-600 bg-amber-50', icon: 'Sun' },
  cold: { label: 'Frio', color: 'text-blue-600 bg-blue-50', icon: 'Snowflake' },
};
