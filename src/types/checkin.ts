/**
 * Tipos para o sistema de check-in (Totem e Portal do Cliente)
 *
 * SCHEMA MT (mt_checkins):
 * - tenant_id: UUID (obrigatório)
 * - franchise_id: UUID
 * - appointment_id: UUID (era agendamento_id)
 * - checkin_type: VARCHAR (era metodo)
 * - checkin_time: TIMESTAMPTZ
 * - checkout_time: TIMESTAMPTZ
 * - source: VARCHAR (totem, portal, manual)
 * - device_info: JSONB (era user_agent)
 */

export type CheckinType = 'cpf' | 'telefone' | 'portal';

export interface Checkin {
  id: string;
  tenant_id: string;           // MT: obrigatório
  franchise_id: string;        // MT: franchise_id (era unidade_id)
  appointment_id: string;      // MT: appointment_id (era agendamento_id)
  lead_id: string;
  user_id: string | null;
  checkin_type: CheckinType;   // MT: checkin_type (era metodo)
  checkin_time: string;        // MT: checkin_time (era data_checkin)
  checkout_time: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;       // MT: totem, portal, manual
  device_info: {               // MT: device_info (era ip_address + user_agent)
    user_agent?: string;
    ip_address?: string;
  } | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinWithDetails extends Checkin {
  // Dados do agendamento
  appointment?: {
    data_agendamento: string;
    hora_inicio: string;
    hora_fim: string | null;
    servico: string | null;
    status: string;
  };
  // Dados do lead/cliente
  lead?: {
    nome: string;
    telefone: string;
    email: string;
    cpf: string | null;
  };
  // Dados da franquia
  franchise?: {
    nome_fantasia: string;
    cidade: string | null;
    estado: string | null;
  };
}

export interface CreateCheckinData {
  tenant_id?: string;          // MT: será preenchido automaticamente
  franchise_id: string;        // MT: franchise_id (era unidade_id)
  appointment_id: string;      // MT: appointment_id (era agendamento_id)
  lead_id: string;
  checkin_type: CheckinType;   // MT: checkin_type (era metodo)
  checkin_time?: string;       // MT: será preenchido automaticamente
  source?: string;             // MT: totem, portal, manual
  device_info?: {
    user_agent?: string;
    ip_address?: string;
  };
}

// Dados retornados ao buscar agendamento no totem
export interface TotemAgendamento {
  id: string;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim: string | null;
  servico: string | null;
  status: string;
  lead_id: string;
  lead_nome: string;
  lead_telefone: string;
  franchise_id: string;        // MT: franchise_id (era unidade_id)
  unidade_nome: string;
  ja_fez_checkin: boolean;
}

// Dados da unidade para o totem
export interface TotemUnidade {
  id: string;
  tenant_id: string;           // MT: obrigatório para isolamento
  nome_fantasia: string;
  slug: string;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
}

// Mapeamento de compatibilidade (legacy → MT)
// agendamento_id → appointment_id
// unidade_id → franchise_id
// metodo → checkin_type
// data_checkin → checkin_time
// user_agent/ip_address → device_info (jsonb)
