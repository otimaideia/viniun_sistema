// =============================================================================
// LEAD MULTI-TENANT TYPES
// Tipos TypeScript para o módulo de leads multi-tenant
// =============================================================================

import type { Tenant, Franchise, MTUser } from './multitenant';

// -----------------------------------------------------------------------------
// Enums e Tipos Base
// -----------------------------------------------------------------------------

export type LeadStatus =
  | 'novo'
  | 'contato'
  | 'agendado'
  | 'confirmado'
  | 'atendido'
  | 'convertido'
  | 'perdido'
  | 'cancelado'
  | 'aguardando'
  | 'recontato'
  | 'curriculo';

export type LeadTemperatura = 'frio' | 'morno' | 'quente';

export type LeadStatusGeral = 'ativo' | 'inativo' | 'duplicado' | 'mesclado' | 'arquivado';

export type LeadUrgencia = 'baixa' | 'media' | 'alta' | 'urgente';

// -----------------------------------------------------------------------------
// Lead Multi-Tenant
// -----------------------------------------------------------------------------

export interface MTLead {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  codigo?: string | null;
  nome: string;
  sobrenome?: string | null;
  nome_social?: string | null;

  // Contato
  email?: string | null;
  telefone?: string | null;
  telefone_secundario?: string | null;
  whatsapp?: string | null;
  whatsapp_validado?: boolean;

  // Documentos
  cpf?: string | null;
  rg?: string | null;

  // Dados pessoais
  data_nascimento?: string | null;
  genero?: string | null;
  estado_civil?: string | null;

  // Endereço
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Dados profissionais
  profissao?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  renda_mensal?: number | null;

  // Interesse comercial
  servico_interesse?: string | null;
  servico_id?: string | null;
  valor_estimado?: number | null;
  urgencia?: LeadUrgencia | null;

  // Canal e Origem
  canal_entrada?: string | null;
  origem?: string | null;
  campanha?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer_url?: string | null;
  landing_page?: string | null;

  // Indicações
  indicado_por_id?: string | null;
  indicado_por_nome?: string | null;
  codigo_indicacao?: string | null;
  influenciador_id?: string | null;
  influenciador_codigo?: string | null;
  parceria_id?: string | null;
  parceria_codigo?: string | null;

  // Score e qualificação
  score?: number;
  score_automatico?: number;
  score_manual?: number;
  temperatura?: LeadTemperatura;
  qualificado?: boolean;
  qualificado_por?: string | null;
  qualificado_em?: string | null;

  // Atribuição
  atribuido_para?: string | null;
  atribuido_em?: string | null;
  atribuido_por?: string | null;

  // Status e funil
  status?: LeadStatus;
  etapa_funil?: string | null;
  funil_id?: string | null;
  funnel_stage_id?: string | null;

  // Agendamento
  data_agendamento?: string | null;
  confirmado?: boolean;
  compareceu?: boolean | null;
  motivo_nao_comparecimento?: string | null;

  // Conversão
  convertido?: boolean;
  data_conversao?: string | null;
  valor_conversao?: number | null;
  motivo_perda?: string | null;
  concorrente?: string | null;

  // Histórico de contato
  ultimo_contato?: string | null;
  proximo_contato?: string | null;
  total_contatos?: number;
  total_mensagens?: number;
  total_emails?: number;
  total_ligacoes?: number;

  // WhatsApp
  whatsapp_chat_id?: string | null;
  whatsapp_session_id?: string | null;
  ultima_mensagem_whatsapp?: string | null;

  // Formulário
  formulario_id?: string | null;
  submissao_id?: string | null;

  // Observações e extras
  observacoes?: string | null;
  tags?: string[] | null;
  dados_extras?: Record<string, unknown>;

  // Status geral e duplicação
  status_geral?: LeadStatusGeral;
  duplicado_de?: string | null;
  mesclado_em?: string | null;

  // Atribuição alternativa (colunas adicionais no banco)
  responsavel_id?: string | null;
  responsible_user_id?: string | null;

  // Meta Messenger
  meta_participant_id?: string | null;
  meta_participant_username?: string | null;
  meta_conversation_id?: string | null;

  // Foto e redes
  foto_url?: string | null;
  instagram_id?: string | null;

  // Timestamps e auditoria
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Relacionamentos (quando carregados via select)
  tenant?: Tenant;
  franchise?: Franchise;
  responsavel?: MTUser;
  activities?: MTLeadActivity[];
}

// -----------------------------------------------------------------------------
// Lead Activity (Atividade do Lead)
// -----------------------------------------------------------------------------

export type LeadActivityType =
  | 'nota'
  | 'ligacao'
  | 'email'
  | 'whatsapp'
  | 'reuniao'
  | 'tarefa'
  | 'status_change'
  | 'atribuicao'
  | 'agendamento'
  | 'conversao'
  | 'perda'
  | 'reativacao'
  | 'sistema'
  | 'cadastro'
  | 'indicacao'
  | 'atualizacao'
  | 'formulario'
  | 'venda';

export interface MTLeadActivity {
  id: string;
  tenant_id: string;
  lead_id: string;

  // Tipo e descrição
  tipo: LeadActivityType;
  titulo?: string | null;
  descricao: string;

  // Metadados
  metadata?: Record<string, unknown>;

  // Status anterior/novo (para mudanças de status)
  status_anterior?: string | null;
  status_novo?: string | null;

  // Agendamento (para tarefas/lembretes)
  data_agendada?: string | null;
  concluida?: boolean;
  concluida_em?: string | null;

  // Auditoria
  created_by: string;
  created_at: string;

  // Relacionamentos
  lead?: MTLead;
  criador?: MTUser;
}

// -----------------------------------------------------------------------------
// Filtros
// -----------------------------------------------------------------------------

export interface MTLeadFilters {
  // Filtros de tenant/franchise
  tenant_id?: string;
  franchise_id?: string | null;

  // Filtros de status
  status?: LeadStatus | LeadStatus[];
  status_geral?: LeadStatusGeral | LeadStatusGeral[];
  temperatura?: LeadTemperatura | LeadTemperatura[];

  // Filtros de atribuição
  atribuido_para?: string | null;
  sem_atribuicao?: boolean;

  // Filtros de data
  created_at_inicio?: string;
  created_at_fim?: string;
  data_agendamento_inicio?: string;
  data_agendamento_fim?: string;
  ultimo_contato_inicio?: string;
  ultimo_contato_fim?: string;

  // Filtros de origem
  origem?: string | string[];
  campanha?: string | string[];
  utm_source?: string | string[];

  // Filtros booleanos
  qualificado?: boolean;
  convertido?: boolean;
  confirmado?: boolean;
  compareceu?: boolean;

  // Busca textual
  search?: string;

  // Ordenação
  orderBy?: keyof MTLead;
  orderDirection?: 'asc' | 'desc';

  // Paginação
  page?: number;
  pageSize?: number;
}

// -----------------------------------------------------------------------------
// Tipos para Mutations
// -----------------------------------------------------------------------------

export type MTLeadCreate = Omit<MTLead,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'tenant'
  | 'franchise'
  | 'responsavel'
  | 'activities'
>;

export type MTLeadUpdate = Partial<MTLeadCreate> & { id: string };

export interface MTLeadActivityCreate {
  tenant_id: string;
  lead_id: string;
  tipo: LeadActivityType;
  titulo?: string;
  descricao: string;
  metadata?: Record<string, unknown>;
  data_agendada?: string;
}

// -----------------------------------------------------------------------------
// Tipos de Resposta
// -----------------------------------------------------------------------------

export interface MTLeadWithRelations extends MTLead {
  tenant: Tenant;
  franchise?: Franchise | null;
  responsavel?: MTUser | null;
  activities?: MTLeadActivity[];
}

export interface MTLeadPaginatedResponse {
  data: MTLead[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MTLeadMetrics {
  total: number;
  novos: number;
  em_contato: number;
  agendados: number;
  convertidos: number;
  perdidos: number;
  taxa_conversao: number;
  valor_pipeline: number;
}

// -----------------------------------------------------------------------------
// Hook Return Types
// -----------------------------------------------------------------------------

export interface UseLeadsMTReturn {
  leads: MTLead[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  // Mutations
  createLead: {
    mutate: (data: Partial<MTLeadCreate>) => void;
    mutateAsync: (data: Partial<MTLeadCreate>) => Promise<MTLead>;
    isPending: boolean;
  };
  updateLead: {
    mutate: (data: MTLeadUpdate) => void;
    mutateAsync: (data: MTLeadUpdate) => Promise<MTLead>;
    isPending: boolean;
  };
  deleteLead: {
    mutate: (id: string) => void;
    mutateAsync: (id: string) => Promise<void>;
    isPending: boolean;
  };
  updateStatus: {
    mutate: (params: { id: string; status: LeadStatus }) => void;
    mutateAsync: (params: { id: string; status: LeadStatus }) => Promise<MTLead>;
    isPending: boolean;
  };
}

export interface UseLeadActivitiesMTReturn {
  activities: MTLeadActivity[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  createActivity: {
    mutate: (data: MTLeadActivityCreate) => void;
    mutateAsync: (data: MTLeadActivityCreate) => Promise<MTLeadActivity>;
    isPending: boolean;
  };
}

// -----------------------------------------------------------------------------
// Labels e Mapeamentos
// -----------------------------------------------------------------------------

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contato: 'Em Contato',
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  atendido: 'Atendido',
  convertido: 'Convertido',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
  aguardando: 'Aguardando',
  recontato: 'Recontato',
  curriculo: 'Currículo',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  contato: 'bg-yellow-100 text-yellow-800',
  agendado: 'bg-purple-100 text-purple-800',
  confirmado: 'bg-indigo-100 text-indigo-800',
  atendido: 'bg-cyan-100 text-cyan-800',
  convertido: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-800',
  aguardando: 'bg-orange-100 text-orange-800',
  recontato: 'bg-pink-100 text-pink-800',
  curriculo: 'bg-teal-100 text-teal-800',
};

export const LEAD_TEMPERATURA_LABELS: Record<LeadTemperatura, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};

export const LEAD_TEMPERATURA_COLORS: Record<LeadTemperatura, string> = {
  frio: 'bg-blue-100 text-blue-800',
  morno: 'bg-yellow-100 text-yellow-800',
  quente: 'bg-red-100 text-red-800',
};

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  nota: 'Nota',
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  reuniao: 'Reunião',
  tarefa: 'Tarefa',
  status_change: 'Mudança de Status',
  atribuicao: 'Atribuição',
  agendamento: 'Agendamento',
  conversao: 'Conversão',
  perda: 'Perda',
  reativacao: 'Reativação',
  sistema: 'Sistema',
  cadastro: 'Cadastro',
  indicacao: 'Indicação',
  atualizacao: 'Atualização',
  formulario: 'Formulário',
  venda: 'Venda',
};

export const LEAD_ACTIVITY_ICONS: Record<LeadActivityType, string> = {
  nota: 'FileText',
  ligacao: 'Phone',
  email: 'Mail',
  whatsapp: 'MessageCircle',
  reuniao: 'Users',
  tarefa: 'CheckSquare',
  status_change: 'RefreshCw',
  atribuicao: 'UserPlus',
  agendamento: 'Calendar',
  conversao: 'CheckCircle',
  perda: 'XCircle',
  reativacao: 'RotateCcw',
  sistema: 'Settings',
  cadastro: 'UserPlus',
  indicacao: 'Share2',
  atualizacao: 'Edit',
  formulario: 'FileText',
  venda: 'DollarSign',
};

// -----------------------------------------------------------------------------
// Campos extras que ficam em dados_extras (JSONB) - não são colunas reais
// Usado para eliminar `as any` casts nas páginas LeadDetail/LeadEdit
// -----------------------------------------------------------------------------

export interface LeadDadosExtras {
  // Dados pessoais extras
  sobrenome?: string | null;
  nacionalidade?: string | null;
  como_conheceu?: string | null;
  proximidade?: string | null;

  // Códigos de país
  telefone_codigo_pais?: string | null;
  whatsapp_codigo_pais?: string | null;
  telefone_secundario_codigo_pais?: string | null;

  // Redes sociais
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;

  // Preferências de contato
  preferencia_contato?: string | null;
  melhor_horario_contato?: string | null;
  dia_preferencial?: string | null;

  // Financeiro
  chave_pix?: string | null;
  tipo_chave_pix?: string | null;

  // Notas
  nota_interna?: string | null;

  // Saúde e tratamento
  tipo_pele?: string | null;
  alergias?: string | null;
  condicoes_medicas?: string | null;
  medicamentos_uso?: string | null;
  historico_tratamentos?: string | null;
  areas_interesse?: string | null;
  fotossensibilidade?: boolean | null;
  gravidez_lactacao?: boolean | null;

  // Contato de emergência
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  contato_emergencia_telefone_codigo_pais?: string | null;
  contato_emergencia_parentesco?: string | null;

  // Preferências de comunicação
  aceita_marketing?: boolean | null;
  aceita_pesquisa?: boolean | null;
  consentimento?: boolean | null;

  // Multi-serviço
  servicos_interesse?: string[] | null;
  como_conheceu_outro?: string | null;

  // Campos legacy/compatibilidade
  interesse?: string | null;
  unidade?: string | null;
  servico?: string | null;
  franqueado_id?: string | null;
  responsible_id?: string | null;
  referrer?: string | null;
  franquias_vinculadas?: string[] | null;
  id_giga?: number | null;
  id_api?: string | null;
  campanha_id?: string | null;
  lead_source?: string | null;
  quantidade_indicacoes?: number | null;
  unidades_vinculadas?: string[] | null;

  // Click IDs extras (não são colunas diretas do mt_leads)
  ttclid?: string | null;
  msclkid?: string | null;
  li_fat_id?: string | null;
  embed_url?: string | null;

  // Catch-all para campos não mapeados
  [key: string]: unknown;
}

/**
 * Lead com dados extras espalhados - usado nas páginas Detail/Edit
 * Combina MTLead (colunas reais) + LeadDadosExtras (campos JSONB)
 */
export type LeadWithExtras = MTLead & LeadDadosExtras;

/**
 * Helper para criar LeadWithExtras a partir de MTLead
 * Espalha dados_extras no objeto para acesso direto aos campos
 */
export function spreadDadosExtras(lead: MTLead): LeadWithExtras {
  if (!lead) return lead as LeadWithExtras;
  const extras = (typeof lead.dados_extras === 'object' && lead.dados_extras !== null)
    ? lead.dados_extras
    : {};
  return {
    ...extras,        // campos extras PRIMEIRO (menor prioridade)
    ...lead,          // campos reais SOBRESCREVEM
    // Aliases de compatibilidade
    unidade: (lead.franchise as any)?.nome || (extras as any).unidade || null,
    servico: lead.servico_interesse || (extras as any).servico || null,
    responsible_id: lead.atribuido_para || lead.responsible_user_id || null,
    referrer: lead.referrer_url || null,
    franqueado_id: (extras as any).franqueado_id || lead.franchise_id || null,
  } as LeadWithExtras;
}

// -----------------------------------------------------------------------------
// Aliases de compatibilidade com types/lead.ts (legacy)
// Permite migrar imports gradualmente sem quebrar código
// -----------------------------------------------------------------------------

/** @deprecated Use MTLead */
export type Lead = LeadWithExtras;

/** STATUS_OPTIONS com valores MT */
export const STATUS_OPTIONS: LeadStatus[] = [
  'novo',
  'contato',
  'agendado',
  'confirmado',
  'atendido',
  'convertido',
  'perdido',
  'cancelado',
  'aguardando',
  'recontato',
  'curriculo',
];

/** STATUS_CONFIG compatível com componentes que usam .color/.bg/.label */
export const STATUS_CONFIG: Record<LeadStatus, { color: string; bg: string; label: string }> = {
  novo: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Novo' },
  contato: { color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', label: 'Em Contato' },
  agendado: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Agendado' },
  confirmado: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', label: 'Confirmado' },
  atendido: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Atendido' },
  convertido: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Convertido' },
  perdido: { color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', label: 'Perdido' },
  cancelado: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-200', label: 'Cancelado' },
  aguardando: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Aguardando' },
  recontato: { color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', label: 'Recontato' },
  curriculo: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'Currículo' },
};

// =============================================================================
// CANAL DE ENTRADA (como o lead chegou - canal de comunicação)
// =============================================================================

export type CanalEntrada =
  | 'whatsapp' | 'site' | 'telefone' | 'presencial'
  | 'instagram' | 'instagram_dm' | 'facebook' | 'messenger'
  | 'tiktok' | 'google' | 'email' | 'indicacao' | 'outro';

export const CANAL_OPTIONS: { value: CanalEntrada; label: string; icon: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'site', label: 'Site/Formulário', icon: '🌐' },
  { value: 'telefone', label: 'Telefone', icon: '📞' },
  { value: 'presencial', label: 'Presencial', icon: '🏪' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'instagram_dm', label: 'Instagram DM', icon: '📩' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'messenger', label: 'Messenger', icon: '💬' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'indicacao', label: 'Indicação', icon: '🤝' },
  { value: 'outro', label: 'Outro', icon: '📋' },
];

export const CANAL_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  whatsapp: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'WhatsApp', icon: '💬' },
  site: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Site', icon: '🌐' },
  telefone: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Telefone', icon: '📞' },
  presencial: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Presencial', icon: '🏪' },
  instagram: { color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', label: 'Instagram', icon: '📸' },
  instagram_dm: { color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200', label: 'Instagram DM', icon: '📩' },
  facebook: { color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200', label: 'Facebook', icon: '📘' },
  messenger: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Messenger', icon: '💬' },
  tiktok: { color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', label: 'TikTok', icon: '🎵' },
  email: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'E-mail', icon: '📧' },
  indicacao: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Indicação', icon: '🤝' },
  outro: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', label: 'Outro', icon: '📋' },
};

// =============================================================================
// ORIGEM (fonte de marketing - por que o lead veio)
// =============================================================================

export type LeadOrigem =
  | 'organico' | 'campanha' | 'indicacao' | 'influenciador'
  | 'google_ads' | 'meta_ads' | 'tiktok_ads'
  | 'instagram' | 'facebook' | 'google' | 'google_maps' | 'tiktok'
  | 'formulario' | 'grupo_vip' | 'parceria' | 'evento'
  | 'bio_link' | 'site' | 'redes_sociais' | 'outro';

export const ORIGEM_OPTIONS: { value: LeadOrigem; label: string; icon?: string }[] = [
  { value: 'organico', label: 'Orgânico', icon: '🌱' },
  { value: 'campanha', label: 'Campanha', icon: '📢' },
  { value: 'indicacao', label: 'Indicação', icon: '👥' },
  { value: 'influenciador', label: 'Influenciador', icon: '⭐' },
  { value: 'google_ads', label: 'Google Ads', icon: '🎯' },
  { value: 'meta_ads', label: 'Meta Ads', icon: '📱' },
  { value: 'tiktok_ads', label: 'TikTok Ads', icon: '🎵' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'google', label: 'Google', icon: '🔍' },
  { value: 'google_maps', label: 'Google Maps', icon: '📍' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'formulario', label: 'Formulário', icon: '📝' },
  { value: 'grupo_vip', label: 'Grupo VIP', icon: '👑' },
  { value: 'parceria', label: 'Parceria', icon: '🤝' },
  { value: 'evento', label: 'Evento', icon: '🎉' },
  { value: 'bio_link', label: 'Link da Bio', icon: '🔗' },
  { value: 'site', label: 'Site', icon: '🌐' },
  { value: 'redes_sociais', label: 'Outras Redes', icon: '📱' },
  { value: 'outro', label: 'Outro', icon: '❓' },
];

export const COMO_CONHECEU_OPTIONS: { value: string; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google / Pesquisa' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'indicacao_amigo', label: 'Indicacao de Amigo/Familiar' },
  { value: 'indicacao_profissional', label: 'Indicacao Profissional' },
  { value: 'passou_na_frente', label: 'Passou na Frente da Loja' },
  { value: 'panfleto', label: 'Panfleto / Material Impresso' },
  { value: 'radio_tv', label: 'Radio / TV' },
  { value: 'evento', label: 'Evento / Feira' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'site', label: 'Site' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'outro', label: 'Outro' },
];

export const ORIGEM_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  organico: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Orgânico', icon: '🌱' },
  campanha: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', label: 'Campanha', icon: '📢' },
  indicacao: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Indicação', icon: '👥' },
  influenciador: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Influenciador', icon: '⭐' },
  google_ads: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Google Ads', icon: '🎯' },
  meta_ads: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Meta Ads', icon: '📱' },
  tiktok_ads: { color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', label: 'TikTok Ads', icon: '🎵' },
  instagram: { color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200', label: 'Instagram', icon: '📸' },
  facebook: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Facebook', icon: '📘' },
  google: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Google', icon: '🔍' },
  google_maps: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Google Maps', icon: '📍' },
  tiktok: { color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', label: 'TikTok', icon: '🎵' },
  formulario: { color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', label: 'Formulário', icon: '📝' },
  grupo_vip: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Grupo VIP', icon: '👑' },
  parceria: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'Parceria', icon: '🤝' },
  evento: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', label: 'Evento', icon: '🎉' },
  bio_link: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Link da Bio', icon: '🔗' },
  site: { color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', label: 'Site', icon: '🌐' },
  redes_sociais: { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', label: 'Outras Redes', icon: '📱' },
  outro: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', label: 'Outro', icon: '❓' },
  // Backward compatibility
  whatsapp_inbound: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Orgânico', icon: '🌱' },
  telefone: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Telefone', icon: '📞' },
  presencial: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', label: 'Presencial', icon: '🏢' },
};
