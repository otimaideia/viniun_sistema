// Tipos para Auditoria WhatsApp

export interface WhatsAppAudit {
  id: string;
  franqueado_id: string;
  session_id: string | null;
  user_id: string | null;

  // Período
  audit_date: string;

  // Contadores de mensagens
  messages_sent: number;
  messages_received: number;
  media_sent: number;
  media_received: number;

  // Contadores de contatos
  unique_contacts: number;
  new_leads: number;
  conversations_opened: number;
  conversations_resolved: number;

  // Performance
  avg_response_time_seconds: number | null;
  first_response_count: number;
  total_response_time_seconds: number;

  // Horários
  first_activity_at: string | null;
  last_activity_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UserPerformanceRanking {
  user_id: string;
  user_name: string | null;
  user_email: string;
  franqueado_id: string;
  franquia_nome: string;
  periodo: string;

  // Totais
  total_msgs_enviadas: number;
  total_msgs_recebidas: number;
  total_msgs: number;
  total_media_enviada: number;
  total_media_recebida: number;
  total_contatos_atendidos: number;
  total_leads_gerados: number;
  total_conversas_abertas: number;
  total_conversas_resolvidas: number;

  // Performance
  media_tempo_resposta_segundos: number | null;
  dias_ativos: number;
  media_msgs_por_dia: number;

  // Rankings
  ranking_msgs: number;
  ranking_leads: number;
  ranking_tempo_resposta: number;
}

export interface DailyFranchiseStats {
  franqueado_id: string;
  franquia_nome: string;
  audit_date: string;

  // Totais
  total_msgs_enviadas: number;
  total_msgs_recebidas: number;
  total_media: number;
  total_contatos: number;
  total_novos_leads: number;
  conversas_abertas: number;
  conversas_resolvidas: number;

  // Por sessão/usuário
  sessoes_ativas: number;
  usuarios_ativos: number;

  // Performance
  media_tempo_resposta_segundos: number | null;
}

export interface SessionStats {
  session_id: string;
  session_name: string;
  phone_number: string | null;
  display_name: string | null;
  session_status: string;
  franqueado_id: string;
  franquia_nome: string;

  // Contadores
  total_conversas: number;
  conversas_abertas: number;
  conversas_resolvidas: number;

  // Mensagens (últimos 30 dias)
  msgs_enviadas_30d: number;
  msgs_recebidas_30d: number;

  // Última atividade
  ultima_mensagem_at: string | null;
  last_seen_at: string | null;
}

export interface FranchiseDashboard {
  franqueado_id: string;
  nome_fantasia: string;

  // Sessões
  total_sessoes: number;
  sessoes_conectadas: number;

  // Conversas
  total_conversas: number;
  conversas_abertas: number;
  total_nao_lidas: number;

  // Leads
  total_leads: number;
  leads_7d: number;
  leads_30d: number;

  // Funil
  total_funis: number;

  // Mensagens
  msgs_hoje: number;
  msgs_7d: number;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  userId?: string;
}

// Função para formatar tempo de resposta
export function formatResponseTime(seconds: number | null): string {
  if (seconds === null) return '-';

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

// Função para calcular porcentagem de variação
export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
