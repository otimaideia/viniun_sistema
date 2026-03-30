// =============================================================================
// USE AGENDAMENTOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para agendamentos
// SISTEMA 100% MT - Usa mt_appointments diretamente via useAgendamentosMT
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useAgendamentosMT, useAgendamentoMT, useDisponibilidade } from './multitenant/useAgendamentosMT';
import type { AppointmentStatus } from './multitenant/useAgendamentosMT';

// =============================================================================
// Types
// =============================================================================

interface UseAgendamentosAdapterOptions {
  franchiseId?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus | AppointmentStatus[];
}

export interface AgendamentoAdaptado {
  id: string;
  tenant_id?: string;
  franchise_id: string | null;
  // Campos mapeados para formato legacy
  unidade_id?: string | null;
  servico?: string | null;
  servico_nome?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
  // Campos legacy esperados pelo AgendamentoCard
  nome_lead?: string | null;
  telefone_lead?: string | null;
  email_lead?: string | null;
  data_agendamento: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  status: string;
  observacoes?: string | null;
  profissional_id?: string | null;
  profissional_nome?: string | null;
  origem?: string | null;
  lead_id?: string | null;
  servico_id?: string | null;
  tipo?: string;
  venda_id?: string | null;
  treatment_session_id?: string | null;
  cortesia_motivo?: string | null;
  cortesia_aprovada_por?: string | null;
  cortesia_aprovada_em?: string | null;
  lead_type?: string;
  consultora_id?: string | null;
  consultora_nome?: string | null;
  sessao_numero?: number | null;
  total_sessoes?: number | null;
  created_by?: string | null;
  observacoes_internas?: string | null;
  valor?: number | null;
  duracao_minutos?: number | null;
  confirmado?: boolean | null;
  confirmado_em?: string | null;
  confirmado_via?: string | null;
  checkin_em?: string | null;
  checkout_em?: string | null;
  cancelado_em?: string | null;
  cancelado_por?: string | null;
  motivo_cancelamento?: string | null;
  room_id?: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTToAdaptado(appointment: any): AgendamentoAdaptado {
  return {
    id: appointment.id,
    tenant_id: appointment.tenant_id,
    franchise_id: appointment.franchise_id,
    // Mapear campos para formato legacy para compatibilidade
    unidade_id: appointment.franchise_id,
    servico: appointment.servico_nome,
    servico_nome: appointment.servico_nome,
    cliente_nome: appointment.cliente_nome,
    cliente_telefone: appointment.cliente_telefone,
    cliente_email: appointment.cliente_email,
    // Campos legacy esperados pelo AgendamentoCard
    nome_lead: appointment.cliente_nome,
    telefone_lead: appointment.cliente_telefone,
    email_lead: appointment.cliente_email,
    data_agendamento: appointment.data_agendamento,
    hora_inicio: appointment.hora_inicio,
    hora_fim: appointment.hora_fim,
    status: appointment.status,
    observacoes: appointment.observacoes,
    profissional_id: appointment.profissional_id,
    profissional_nome: appointment.profissional_nome,
    origem: appointment.origem,
    lead_id: appointment.lead_id,
    servico_id: appointment.servico_id,
    tipo: appointment.tipo || 'avaliacao',
    venda_id: appointment.venda_id,
    treatment_session_id: appointment.treatment_session_id,
    cortesia_motivo: appointment.cortesia_motivo,
    cortesia_aprovada_por: appointment.cortesia_aprovada_por,
    cortesia_aprovada_em: appointment.cortesia_aprovada_em,
    lead_type: appointment.lead_type,
    consultora_id: appointment.consultora_id,
    consultora_nome: appointment.consultora_nome,
    sessao_numero: appointment.sessao_numero,
    total_sessoes: appointment.total_sessoes,
    created_by: appointment.created_by,
    observacoes_internas: appointment.observacoes_internas,
    valor: appointment.valor,
    duracao_minutos: appointment.duracao_minutos,
    confirmado: appointment.confirmado,
    confirmado_em: appointment.confirmado_em,
    confirmado_via: appointment.confirmado_via,
    checkin_em: appointment.checkin_em,
    checkout_em: appointment.checkout_em,
    cancelado_em: appointment.cancelado_em,
    cancelado_por: appointment.cancelado_por,
    motivo_cancelamento: appointment.motivo_cancelamento,
    room_id: appointment.room_id,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

// =============================================================================
// Mapper: Legacy to MT fields
// =============================================================================

function mapLegacyToMT(legacyData: any): any {
  // Validar lead_id: se for um UUID gerado aleatoriamente (não existe no banco), não usar
  // O campo lead_id deve ser um ID válido de um lead existente ou null
  let leadId = legacyData.lead_id;

  // Se lead_id parece ser um UUID gerado e não um ID real de lead selecionado
  // Verificamos se selected_lead_id foi usado (que indica seleção real de lead)
  if (leadId && !legacyData.selected_lead_id) {
    // Se não há selected_lead_id mas há lead_id, pode ser um UUID gerado
    // Verificar se parece ser um UUID v4 gerado (padrão do crypto.randomUUID)
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4Pattern.test(leadId)) {
      // Pode ser gerado, deixar como null para evitar FK violation
      leadId = null;
    }
  }

  return {
    // Mapear campos legacy para MT
    cliente_nome: legacyData.nome_lead || legacyData.cliente_nome,
    cliente_telefone: legacyData.telefone_lead || legacyData.cliente_telefone,
    cliente_email: legacyData.email_lead || legacyData.cliente_email,
    franchise_id: legacyData.unidade_id || legacyData.franchise_id,
    servico_nome: legacyData.servico || legacyData.servico_nome,
    profissional_id: legacyData.responsavel_id || legacyData.profissional_id,
    profissional_nome: legacyData.responsavel_nome || legacyData.profissional_nome,
    // Lead ID - usar apenas se foi selecionado um lead real
    lead_id: leadId || null,
    servico_id: legacyData.servico_id,
    data_agendamento: legacyData.data_agendamento,
    hora_inicio: legacyData.hora_inicio,
    hora_fim: legacyData.hora_fim,
    duracao_minutos: legacyData.duracao_minutos,
    status: legacyData.status === 'agendado' ? 'pendente' : legacyData.status,
    observacoes: legacyData.observacoes,
    observacoes_internas: legacyData.observacoes_internas,
    valor: legacyData.valor,
    origem: legacyData.origem || 'painel',
    is_recorrente: legacyData.is_recorrente,
    recorrencia_config: legacyData.recorrencia_config,
    // Novos campos: tipo de agendamento
    tipo: legacyData.tipo,
    venda_id: legacyData.venda_id,
    treatment_session_id: legacyData.treatment_session_id,
    cortesia_motivo: legacyData.cortesia_motivo,
    // Consultora e sessão
    consultora_id: legacyData.consultora_id,
    consultora_nome: legacyData.consultora_nome,
    sessao_numero: legacyData.sessao_numero,
    total_sessoes: legacyData.total_sessoes,
  };
}

export function useAgendamentosAdapter(options: UseAgendamentosAdapterOptions = {}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT - sempre usa tabelas mt_*
  const mt = useAgendamentosMT(options);

  // Wrapper para criar agendamento mapeando campos legacy para MT
  const createAgendamento = async (legacyData: any) => {
    const mtData = mapLegacyToMT(legacyData);
    return mt.createAppointment(mtData);
  };

  // Wrapper para atualizar agendamento mapeando campos legacy para MT
  const updateAgendamentoWrapper = async (data: any) => {
    const { id, ...rest } = data;
    const mtData = mapLegacyToMT(rest);
    return mt.updateAppointment(id, mtData);
  };

  // Wrapper para updateStatus que aceita objeto { id, status }
  const updateStatusWrapper = async (params: { id: string; status: string }) => {
    return mt.updateStatus(params.id, params.status as any);
  };

  return {
    agendamentos: mt.appointments.map(mapMTToAdaptado),
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,
    stats: mt.stats,
    appointmentsByDay: mt.appointmentsByDay,

    createAgendamento,
    updateAgendamento: updateAgendamentoWrapper,
    updateStatus: updateStatusWrapper,
    deleteAgendamento: mt.deleteAppointment,
    confirmAgendamento: mt.confirmAppointment,
    cancelAgendamento: mt.cancelAppointment,
    checkIn: mt.checkIn,
    checkOut: mt.checkOut,
    markAsNoShow: mt.markAsNoShow,
    approveCortesia: mt.approveCortesia,
    rejectCortesia: mt.rejectCortesia,
    reschedule: mt.reschedule,

    isCreating: false,
    isUpdating: false,
    isDeleting: false,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Agendamento Individual
// =============================================================================

export function useAgendamentoAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useAgendamentoMT(id);

  return {
    agendamento: mt.appointment ? mapMTToAdaptado(mt.appointment) : null,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Disponibilidade
// =============================================================================

export function useDisponibilidadeAdapter(
  franchiseId: string | undefined,
  date: string | undefined,
  profissionalId?: string
) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useDisponibilidade(franchiseId, date, profissionalId);

  return {
    slots: mt.slots,
    isLoading: mt.isLoading || isTenantLoading,
    refetch: mt.refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getAgendamentoMode(): 'mt' {
  return 'mt';
}

export default useAgendamentosAdapter;
