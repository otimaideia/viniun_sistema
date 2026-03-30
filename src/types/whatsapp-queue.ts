// Tipos TypeScript para Sistema de Filas WhatsApp Multi-Tenant
// Baseado nas tabelas mt_whatsapp_queues e mt_whatsapp_queue_users

import type { MTTenant, MTFranchise, MTUser } from './multitenant';
import type { MTWhatsAppSession } from './whatsapp-mt';

// ============================================
// TIPOS DE DISTRIBUIÇÃO
// ============================================

export type QueueDistributionType =
  | 'round_robin'     // Revezamento circular
  | 'least_busy'      // Atendente com menos conversas
  | 'manual'          // Atribuição manual
  | 'skill_based';    // Baseado em habilidades

export type AgentStatus =
  | 'available'   // Disponível para receber
  | 'busy'        // Ocupado mas pode receber
  | 'away'        // Ausente temporariamente
  | 'offline';    // Desconectado

// ============================================
// FILA DE ATENDIMENTO (mt_whatsapp_queues)
// ============================================

export interface MTWhatsAppQueue {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  session_id: string;

  // Identificação
  codigo: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;

  // Tipo de distribuição
  distribution_type: QueueDistributionType;

  // Limites
  max_concurrent_per_user: number;
  auto_assign: boolean;

  // Prioridade
  priority: number;

  // SLA
  first_response_sla_minutes: number;
  resolution_sla_minutes: number;
  send_sla_alerts: boolean;

  // Métricas
  total_conversations: number;
  total_resolved: number;
  total_transferred: number;
  avg_wait_time_seconds: number;
  avg_resolution_time_seconds: number;

  // Horários
  trabalha_24h: boolean;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[] | null;

  // Mensagens
  welcome_message: string | null;
  offline_message: string | null;
  queue_message: string | null;

  // Controle
  is_active: boolean;
  is_default: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;

  // Relacionamentos
  tenant?: MTTenant;
  franchise?: MTFranchise;
  session?: MTWhatsAppSession;
  created_by_user?: MTUser;
  updated_by_user?: MTUser;

  // Stats (da view v_whatsapp_queue_stats)
  stats?: QueueStats;
}

export interface QueueStats {
  queue_id: string;
  queue_nome: string;
  tenant_id: string;
  session_id: string;

  // Agentes
  total_agents: number;
  available_agents: number;
  busy_agents: number;

  // Conversas
  queued_conversations: number;
  active_conversations: number;
  resolved_today: number;

  // Tempos
  avg_wait_time_seconds: number | null;

  // SLA
  first_response_sla_minutes: number;
  resolution_sla_minutes: number;

  // Capacidade
  total_capacity: number | null;
  current_load: number | null;

  last_activity_at: string | null;
}

export interface CreateQueueInput {
  codigo: string;
  nome: string;
  descricao?: string | null;
  cor?: string;
  icone?: string;
  franchise_id?: string | null;
  session_id: string;
  distribution_type?: QueueDistributionType;
  max_concurrent_per_user?: number;
  auto_assign?: boolean;
  priority?: number;
  first_response_sla_minutes?: number;
  resolution_sla_minutes?: number;
  trabalha_24h?: boolean;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  dias_semana?: number[] | null;
  welcome_message?: string | null;
  offline_message?: string | null;
  queue_message?: string | null;
  is_default?: boolean;
}

export interface UpdateQueueInput {
  id: string;
  nome?: string;
  descricao?: string | null;
  cor?: string;
  icone?: string;
  distribution_type?: QueueDistributionType;
  max_concurrent_per_user?: number;
  auto_assign?: boolean;
  priority?: number;
  first_response_sla_minutes?: number;
  resolution_sla_minutes?: number;
  send_sla_alerts?: boolean;
  trabalha_24h?: boolean;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  dias_semana?: number[] | null;
  welcome_message?: string | null;
  offline_message?: string | null;
  queue_message?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

// ============================================
// USUÁRIO NA FILA (mt_whatsapp_queue_users)
// ============================================

export interface MTWhatsAppQueueUser {
  id: string;
  queue_id: string;
  user_id: string;
  tenant_id: string;

  // Status
  status: AgentStatus;

  // Capacidade
  max_concurrent: number;
  current_conversations: number;

  // Skills
  skills: string[] | null;

  // Prioridade
  priority: number;

  // Métricas
  total_assigned: number;
  total_resolved: number;
  total_transferred_out: number;
  avg_resolution_time_seconds: number;

  // Controle
  is_active: boolean;
  joined_at: string;
  last_activity_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relacionamentos
  queue?: MTWhatsAppQueue;
  user?: MTUser;
}

export interface AddUserToQueueInput {
  queue_id: string;
  user_id: string;
  status?: AgentStatus;
  max_concurrent?: number;
  skills?: string[] | null;
  priority?: number;
}

export interface UpdateQueueUserInput {
  id: string;
  status?: AgentStatus;
  max_concurrent?: number;
  skills?: string[] | null;
  priority?: number;
  is_active?: boolean;
}

// ============================================
// FILTROS
// ============================================

export interface QueueFilters {
  session_id?: string;
  franchise_id?: string;
  is_active?: boolean;
  is_default?: boolean;
  distribution_type?: QueueDistributionType;
}

export interface QueueUserFilters {
  queue_id?: string;
  user_id?: string;
  status?: AgentStatus;
  is_active?: boolean;
  has_capacity?: boolean; // current_conversations < max_concurrent
}

// ============================================
// ACTIONS
// ============================================

export interface AssignConversationResult {
  assigned_user_id: string | null;
  conversation_id: string;
  queue_id: string;
  wait_time_seconds: number | null;
}

export interface AddToQueueResult {
  conversation_id: string;
  queue_id: string;
  queue_position: number;
  auto_assigned: boolean;
  assigned_user_id: string | null;
}

// ============================================
// DASHBOARD
// ============================================

export interface QueueDashboardData {
  queue: MTWhatsAppQueue;
  stats: QueueStats;
  agents: MTWhatsAppQueueUser[];

  // Métricas calculadas
  utilization_rate: number; // (current_load / total_capacity) * 100
  sla_compliance_rate: number; // % de conversas resolvidas dentro do SLA
  avg_wait_time_formatted: string; // "2m 30s"
  avg_resolution_time_formatted: string; // "15m 45s"
}

// ============================================
// ICONS MAPPING
// ============================================

export const QUEUE_ICONS = [
  'Users',
  'UserCheck',
  'UserCog',
  'Headphones',
  'MessageCircle',
  'PhoneCall',
  'Mail',
  'ShoppingCart',
  'CreditCard',
  'HelpCircle',
  'Settings',
  'Zap'
] as const;

// ============================================
// COLORS MAPPING
// ============================================

export const QUEUE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function formatWaitTime(seconds: number | null): string {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function calculateUtilizationRate(currentLoad: number | null, totalCapacity: number | null): number {
  if (!totalCapacity || totalCapacity === 0) return 0;
  if (!currentLoad) return 0;

  return Math.round((currentLoad / totalCapacity) * 100);
}

export function getStatusColor(status: AgentStatus): string {
  const colors: Record<AgentStatus, string> = {
    available: 'text-green-600 bg-green-50',
    busy: 'text-yellow-600 bg-yellow-50',
    away: 'text-orange-600 bg-orange-50',
    offline: 'text-gray-600 bg-gray-50'
  };

  return colors[status] || 'text-gray-600 bg-gray-50';
}

export function getStatusLabel(status: AgentStatus): string {
  const labels: Record<AgentStatus, string> = {
    available: 'Disponível',
    busy: 'Ocupado',
    away: 'Ausente',
    offline: 'Offline'
  };

  return labels[status] || status;
}

export function getDistributionTypeLabel(type: QueueDistributionType): string {
  const labels: Record<QueueDistributionType, string> = {
    round_robin: 'Revezamento Circular',
    least_busy: 'Menos Ocupado',
    manual: 'Atribuição Manual',
    skill_based: 'Baseado em Habilidades'
  };

  return labels[type] || type;
}
