-- Migration: Adicionar campos completos ao Lead (Cliente)
-- Data: 2025-01-28
-- Descrição: Expande Lead para clínica de estética a laser com dados de saúde, contato de emergência e preferências

-- === Dados Adicionais ===
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS estado_civil varchar(20) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS nacionalidade varchar(50) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS foto_url text DEFAULT NULL;

-- === Contato e Redes Sociais ===
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS instagram varchar(100) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS preferencia_contato varchar(50) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS melhor_horario_contato varchar(50) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS dia_preferencial varchar(100) DEFAULT NULL;

-- === Saúde e Tratamento (Importante para Laser) ===
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS tipo_pele varchar(10) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS alergias text DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS condicoes_medicas text DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS medicamentos_uso text DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS historico_tratamentos text DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS areas_interesse text DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS fotossensibilidade boolean DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS gravidez_lactacao boolean DEFAULT NULL;

-- === Contato de Emergência ===
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS contato_emergencia_nome varchar(100) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS contato_emergencia_telefone varchar(20) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS contato_emergencia_parentesco varchar(50) DEFAULT NULL;

-- === Preferências de Comunicação ===
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS aceita_marketing boolean DEFAULT true;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS aceita_pesquisa boolean DEFAULT true;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS data_cadastro_completo timestamp with time zone DEFAULT NULL;

-- === Índices úteis ===
CREATE INDEX IF NOT EXISTS idx_leads_instagram
ON sistema_leads_yeslaser(instagram) WHERE instagram IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tipo_pele
ON sistema_leads_yeslaser(tipo_pele) WHERE tipo_pele IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_estado_civil
ON sistema_leads_yeslaser(estado_civil) WHERE estado_civil IS NOT NULL;

-- === Comentários para Documentação ===
COMMENT ON COLUMN sistema_leads_yeslaser.estado_civil IS 'Estado civil: solteiro, casado, divorciado, viuvo, uniao_estavel';
COMMENT ON COLUMN sistema_leads_yeslaser.nacionalidade IS 'País de origem do cliente';
COMMENT ON COLUMN sistema_leads_yeslaser.foto_url IS 'URL da foto do cliente';
COMMENT ON COLUMN sistema_leads_yeslaser.instagram IS 'Usuário do Instagram (com @)';
COMMENT ON COLUMN sistema_leads_yeslaser.preferencia_contato IS 'Canal preferido: whatsapp, telefone, email, sms';
COMMENT ON COLUMN sistema_leads_yeslaser.melhor_horario_contato IS 'Horário preferido: manha, tarde, noite, qualquer';
COMMENT ON COLUMN sistema_leads_yeslaser.dia_preferencial IS 'Dias preferidos para agendamentos';
COMMENT ON COLUMN sistema_leads_yeslaser.tipo_pele IS 'Escala Fitzpatrick (I-VI) para tratamentos a laser';
COMMENT ON COLUMN sistema_leads_yeslaser.alergias IS 'Alergias conhecidas do cliente';
COMMENT ON COLUMN sistema_leads_yeslaser.condicoes_medicas IS 'Condições médicas relevantes para tratamentos';
COMMENT ON COLUMN sistema_leads_yeslaser.medicamentos_uso IS 'Medicamentos em uso contínuo';
COMMENT ON COLUMN sistema_leads_yeslaser.historico_tratamentos IS 'Histórico de tratamentos estéticos anteriores';
COMMENT ON COLUMN sistema_leads_yeslaser.areas_interesse IS 'Áreas do corpo de interesse para tratamento';
COMMENT ON COLUMN sistema_leads_yeslaser.fotossensibilidade IS 'Se o cliente tem sensibilidade à luz';
COMMENT ON COLUMN sistema_leads_yeslaser.gravidez_lactacao IS 'Se está grávida ou amamentando (contraindicação)';
COMMENT ON COLUMN sistema_leads_yeslaser.contato_emergencia_nome IS 'Nome do contato de emergência';
COMMENT ON COLUMN sistema_leads_yeslaser.contato_emergencia_telefone IS 'Telefone do contato de emergência';
COMMENT ON COLUMN sistema_leads_yeslaser.contato_emergencia_parentesco IS 'Relação com o contato de emergência';
COMMENT ON COLUMN sistema_leads_yeslaser.aceita_marketing IS 'Se aceita receber comunicações de marketing';
COMMENT ON COLUMN sistema_leads_yeslaser.aceita_pesquisa IS 'Se aceita participar de pesquisas de satisfação';
COMMENT ON COLUMN sistema_leads_yeslaser.data_cadastro_completo IS 'Data em que completou todos os dados do cadastro';
