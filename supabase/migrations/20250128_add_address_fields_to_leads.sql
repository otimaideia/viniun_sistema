-- Migration: Adicionar campos de endereço e dados pessoais aos leads
-- Data: 2025-01-28
-- Descrição: Expande os dados do lead para incluir endereço completo e dados adicionais

-- Adicionar campo sobrenome (separar nome/sobrenome)
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS sobrenome varchar(100) DEFAULT NULL;

-- Adicionar RG
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS rg varchar(20) DEFAULT NULL;

-- Adicionar campos de endereço
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS endereco varchar(255) DEFAULT NULL; -- Logradouro

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS numero varchar(20) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS complemento varchar(100) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS proximidade varchar(255) DEFAULT NULL; -- Ponto de referência

-- Adicionar campos adicionais
ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS profissao varchar(100) DEFAULT NULL;

ALTER TABLE sistema_leads_yeslaser
ADD COLUMN IF NOT EXISTS como_conheceu varchar(100) DEFAULT NULL;

-- Criar índice para busca por RG (opcional, útil para consultas)
CREATE INDEX IF NOT EXISTS idx_leads_rg
ON sistema_leads_yeslaser(rg) WHERE rg IS NOT NULL;

-- Comentários nas colunas para documentação
COMMENT ON COLUMN sistema_leads_yeslaser.sobrenome IS 'Sobrenome do cliente (separado do nome)';
COMMENT ON COLUMN sistema_leads_yeslaser.rg IS 'Documento de identidade (RG)';
COMMENT ON COLUMN sistema_leads_yeslaser.endereco IS 'Logradouro (rua, avenida, etc)';
COMMENT ON COLUMN sistema_leads_yeslaser.numero IS 'Número do endereço';
COMMENT ON COLUMN sistema_leads_yeslaser.complemento IS 'Complemento do endereço (apto, bloco, etc)';
COMMENT ON COLUMN sistema_leads_yeslaser.proximidade IS 'Ponto de referência para localização';
COMMENT ON COLUMN sistema_leads_yeslaser.profissao IS 'Profissão/ocupação do cliente';
COMMENT ON COLUMN sistema_leads_yeslaser.como_conheceu IS 'Como o cliente conheceu a YESlaser';
