-- Migration: Journey Modules - 13 new tables for complete client journey
-- Date: 2026-03-16

-- 1. mt_appointment_notification_configs
CREATE TABLE IF NOT EXISTS mt_appointment_notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  notification_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  channel VARCHAR(20) DEFAULT 'whatsapp',
  template_id UUID,
  send_at_offset_minutes INT DEFAULT 0,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, franchise_id, notification_type)
);

-- 2. mt_appointment_notifications
CREATE TABLE IF NOT EXISTS mt_appointment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  appointment_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) DEFAULT 'whatsapp',
  status VARCHAR(20) DEFAULT 'pendente',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  message_content TEXT,
  template_id UUID,
  whatsapp_message_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. mt_self_scheduling_config
CREATE TABLE IF NOT EXISTS mt_self_scheduling_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  is_active BOOLEAN DEFAULT true,
  servicos_disponiveis UUID[] DEFAULT ARRAY[]::UUID[],
  duracao_padrao_minutos INT DEFAULT 60,
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '20:00',
  intervalo_minutos INT DEFAULT 30,
  dias_antecedencia_max INT DEFAULT 30,
  dias_antecedencia_min INT DEFAULT 1,
  mensagem_confirmacao TEXT,
  redirect_url TEXT,
  form_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, franchise_id)
);

-- 4. mt_treatment_timer_logs
CREATE TABLE IF NOT EXISTS mt_treatment_timer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  appointment_id UUID NOT NULL,
  treatment_session_id UUID,
  profissional_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_seconds INT DEFAULT 0,
  pause_seconds INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running',
  observacoes_profissional TEXT,
  observacoes_cliente TEXT,
  produtos_utilizados JSONB DEFAULT '[]'::jsonb,
  fotos_antes TEXT[] DEFAULT ARRAY[]::TEXT[],
  fotos_depois TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. mt_nps_surveys
CREATE TABLE IF NOT EXISTS mt_nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'nps',
  perguntas JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  trigger_type VARCHAR(30) DEFAULT 'post_appointment',
  trigger_delay_minutes INT DEFAULT 60,
  avaliar_profissional BOOLEAN DEFAULT true,
  avaliar_consultora BOOLEAN DEFAULT true,
  avaliar_experiencia BOOLEAN DEFAULT true,
  google_review_url TEXT,
  google_review_delay_minutes INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. mt_nps_responses
CREATE TABLE IF NOT EXISTS mt_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  survey_id UUID,
  appointment_id UUID,
  lead_id UUID,
  nps_score INT,
  nota_profissional INT,
  nota_consultora INT,
  nota_experiencia INT,
  respostas JSONB DEFAULT '{}'::jsonb,
  comentario TEXT,
  google_review_clicked BOOLEAN DEFAULT false,
  google_review_sent_at TIMESTAMPTZ,
  token VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'pendente',
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. mt_auditorias
CREATE TABLE IF NOT EXISTS mt_auditorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  lead_id UUID NOT NULL,
  treatment_plan_id UUID,
  appointment_id UUID,
  auditor_id UUID,
  consultora_id UUID,
  status VARCHAR(30) DEFAULT 'pendente',
  tipo VARCHAR(30) DEFAULT 'upsell',
  data_agendada DATE,
  hora_agendada TIME,
  data_realizada TIMESTAMPTZ,
  resultado TEXT,
  interesse_servicos UUID[] DEFAULT ARRAY[]::UUID[],
  proposta_valor DECIMAL(10,2),
  venda_id UUID,
  sessao_numero INT,
  total_sessoes INT,
  servico_atual VARCHAR(255),
  historico_compras JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 9. mt_rooms
CREATE TABLE IF NOT EXISTS mt_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'multiuso',
  capacidade INT DEFAULT 1,
  equipamentos JSONB DEFAULT '[]'::jsonb,
  area_m2 DECIMAL(8,2),
  custo_mensal DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 11. mt_room_assignments
CREATE TABLE IF NOT EXISTS mt_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  room_id UUID NOT NULL,
  profissional_id UUID NOT NULL,
  dia_semana INT,
  data DATE,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  tipo VARCHAR(20) DEFAULT 'fixo',
  is_recorrente BOOLEAN DEFAULT false,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 12. mt_room_appointments
CREATE TABLE IF NOT EXISTS mt_room_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  room_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME,
  status VARCHAR(20) DEFAULT 'reservado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mt_appt_notif_appointment ON mt_appointment_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mt_appt_notif_status ON mt_appointment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_mt_treatment_timer_appointment ON mt_treatment_timer_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mt_nps_responses_appointment ON mt_nps_responses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mt_nps_responses_token ON mt_nps_responses(token);
CREATE INDEX IF NOT EXISTS idx_mt_auditorias_lead ON mt_auditorias(lead_id);
CREATE INDEX IF NOT EXISTS idx_mt_auditorias_status ON mt_auditorias(status);
CREATE INDEX IF NOT EXISTS idx_mt_rooms_franchise ON mt_rooms(franchise_id);
CREATE INDEX IF NOT EXISTS idx_mt_room_appointments_room ON mt_room_appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_mt_daily_reports_data ON mt_daily_reports(data);

-- RLS
ALTER TABLE mt_appointment_notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_appointment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_self_scheduling_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_treatment_timer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_room_appointments ENABLE ROW LEVEL SECURITY;

-- Reload schema
NOTIFY pgrst, 'reload schema';
