-- Migration: 20250127_scheduled_messages.sql
-- Purpose: Criar tabela para agendamento de mensagens WhatsApp
-- Author: Claude + User
-- Date: 2025-01-27

-- Tabela de mensagens agendadas
CREATE TABLE IF NOT EXISTS yeslaser_mensagens_agendadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES yeslaser_whatsapp_sessoes(id) ON DELETE CASCADE,
  destinatario varchar(50) NOT NULL, -- Número do WhatsApp no formato JID
  conteudo text NOT NULL,
  tipo varchar(20) DEFAULT 'text' CHECK (tipo IN ('text', 'image', 'video', 'document', 'audio')),
  media_url text, -- URL da mídia se for envio de arquivo
  template_id uuid REFERENCES yeslaser_marketing_templates(id) ON DELETE SET NULL,
  campanha_id uuid REFERENCES yeslaser_marketing_campanhas(id) ON DELETE SET NULL,
  agendado_para timestamptz NOT NULL,
  status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'falhou', 'cancelada')),
  tentativas integer DEFAULT 0,
  enviada_em timestamptz,
  erro text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_mensagens_agendadas_status
  ON yeslaser_mensagens_agendadas(status, agendado_para);

CREATE INDEX IF NOT EXISTS idx_mensagens_agendadas_sessao
  ON yeslaser_mensagens_agendadas(sessao_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_agendadas_unidade
  ON yeslaser_mensagens_agendadas(unidade_id);

-- Habilitar RLS
ALTER TABLE yeslaser_mensagens_agendadas ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Allow all for authenticated" ON yeslaser_mensagens_agendadas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_mensagem_agendada_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mensagem_agendada_updated_at
  BEFORE UPDATE ON yeslaser_mensagens_agendadas
  FOR EACH ROW
  EXECUTE FUNCTION update_mensagem_agendada_updated_at();

-- Comentários
COMMENT ON TABLE yeslaser_mensagens_agendadas IS 'Mensagens WhatsApp agendadas para envio futuro';
COMMENT ON COLUMN yeslaser_mensagens_agendadas.destinatario IS 'Número do WhatsApp no formato JID (ex: 5511999999999@c.us)';
COMMENT ON COLUMN yeslaser_mensagens_agendadas.status IS 'Status: pendente, enviada, falhou, cancelada';
COMMENT ON COLUMN yeslaser_mensagens_agendadas.tentativas IS 'Número de tentativas de envio realizadas';
