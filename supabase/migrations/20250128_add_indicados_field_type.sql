-- Migration: 20250128_add_indicados_field_type.sql
-- Purpose: Add 'indicados' field type for friend indication in forms
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- ALTER TABLE yeslaser_formulario_campos DROP COLUMN IF EXISTS indicados_config;
-- DELETE FROM yeslaser_formulario_templates WHERE nome = 'Indicacao de Amigos - Landing Page (Wizard)';
-- COMMIT;

BEGIN;

-- =============================================================
-- 1. ADD indicados_config COLUMN TO CAMPOS TABLE
-- =============================================================

-- Add column for indicados field configuration
ALTER TABLE yeslaser_formulario_campos
ADD COLUMN IF NOT EXISTS indicados_config jsonb;

-- Add comment for documentation
COMMENT ON COLUMN yeslaser_formulario_campos.indicados_config IS
'Configuracao especifica para campos do tipo indicados: {min_indicados, max_indicados, campos_por_indicado: [{nome, label, tipo, obrigatorio, placeholder, mascara}]}';

-- =============================================================
-- 2. UPDATE tipo CHECK CONSTRAINT TO INCLUDE 'indicados'
-- =============================================================

-- Drop existing constraint if exists
ALTER TABLE yeslaser_formulario_campos
DROP CONSTRAINT IF EXISTS yeslaser_formulario_campos_tipo_check;

-- Recreate with 'indicados' type included
ALTER TABLE yeslaser_formulario_campos
ADD CONSTRAINT yeslaser_formulario_campos_tipo_check
CHECK (tipo IN ('text', 'email', 'tel', 'cpf', 'cep', 'select', 'textarea', 'checkbox', 'radio', 'date', 'number', 'hidden', 'servico', 'file', 'rating', 'range', 'indicados'));

-- =============================================================
-- 3. INSERT WIZARD-STYLE INDICATION LP TEMPLATE
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES
(
  'Indicacao de Amigos - Landing Page (Wizard)',
  'Template wizard em 2 etapas para captura de dados pessoais e indicacao de multiplos amigos. Ideal para campanhas de indicacao e programas de referencia.',
  'indicacao',
  TRUE,
  '{
    "modo": "wizard",
    "layout_template": "landing_page",
    "cor_primaria": "#8b5cf6",
    "cor_secundaria": "#7c3aed",
    "cor_botao": "#8b5cf6",
    "cor_botao_texto": "#ffffff",
    "gradiente_ativo": true,
    "gradiente_inicio": "#8b5cf6",
    "gradiente_fim": "#6d28d9",
    "gradiente_direcao": "to-br",
    "titulo": "Indique e Ganhe!",
    "subtitulo": "Indique seus amigos e ganhe beneficios exclusivos",
    "texto_botao": "Finalizar Indicacoes",
    "mensagem_sucesso": "Obrigado! Suas indicacoes foram registradas com sucesso. Voce sera notificado quando seus amigos se cadastrarem.",
    "acao_pos_envio": "mensagem",
    "mostrar_progresso": true,
    "permitir_voltar": true,
    "animacoes_ativas": true,
    "animacao_entrada": "slide",
    "stepper_estilo": "pills",
    "stepper_posicao": "top",
    "stepper_mostrar_numeros": true,
    "stepper_mostrar_titulos": true,
    "botao_estilo": "gradient",
    "botao_largura_total": true,
    "card_max_width": "lg",
    "card_borda": true,
    "sombra": "lg",
    "border_radius": "xl",
    "wizard_config": {
      "etapas": [
        {"id": "1", "titulo": "Seus Dados", "descricao": "Preencha suas informacoes", "icone": "User", "ordem": 1},
        {"id": "2", "titulo": "Indique Amigos", "descricao": "Adicione seus amigos", "icone": "Users", "ordem": 2}
      ]
    }
  }'::jsonb,
  '[
    {
      "nome": "nome",
      "tipo": "text",
      "label": "Seu nome completo",
      "placeholder": "Digite seu nome",
      "obrigatorio": true,
      "campo_lead": "nome",
      "ordem": 1,
      "etapa": 1,
      "largura": "full"
    },
    {
      "nome": "email",
      "tipo": "email",
      "label": "Seu e-mail",
      "placeholder": "seuemail@exemplo.com",
      "obrigatorio": true,
      "campo_lead": "email",
      "ordem": 2,
      "etapa": 1,
      "largura": "half"
    },
    {
      "nome": "whatsapp",
      "tipo": "tel",
      "label": "Seu WhatsApp",
      "placeholder": "(00) 00000-0000",
      "obrigatorio": true,
      "campo_lead": "whatsapp",
      "mascara": "(99) 99999-9999",
      "ordem": 3,
      "etapa": 1,
      "largura": "half"
    },
    {
      "nome": "cep",
      "tipo": "cep",
      "label": "Seu CEP",
      "placeholder": "00000-000",
      "obrigatorio": false,
      "campo_lead": "cep",
      "mascara": "99999-999",
      "ordem": 4,
      "etapa": 1,
      "largura": "third"
    },
    {
      "nome": "aceite_termos",
      "tipo": "checkbox",
      "label": "Aceito receber comunicacoes e participar do programa de indicacoes",
      "obrigatorio": true,
      "ordem": 5,
      "etapa": 1,
      "largura": "full"
    },
    {
      "nome": "indicados",
      "tipo": "indicados",
      "label": "Indique seus amigos",
      "obrigatorio": true,
      "ordem": 6,
      "etapa": 2,
      "largura": "full",
      "indicados_config": {
        "min_indicados": 1,
        "max_indicados": 5,
        "campos_por_indicado": [
          {
            "nome": "nome_amigo",
            "label": "Nome do Amigo",
            "tipo": "text",
            "obrigatorio": true,
            "placeholder": "Nome completo do amigo"
          },
          {
            "nome": "whatsapp_amigo",
            "label": "WhatsApp do Amigo",
            "tipo": "tel",
            "obrigatorio": true,
            "placeholder": "(00) 00000-0000",
            "mascara": "(99) 99999-9999"
          },
          {
            "nome": "email_amigo",
            "label": "E-mail do Amigo (opcional)",
            "tipo": "email",
            "obrigatorio": false,
            "placeholder": "email@exemplo.com"
          }
        ]
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 4. INSERT SIMPLE INDICATION TEMPLATE (WITHOUT WIZARD)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES
(
  'Indicacao Rapida - Multiplos Amigos',
  'Formulario simples para indicacao de multiplos amigos de uma vez. Ideal para campanhas rapidas.',
  'indicacao',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#8b5cf6",
    "cor_secundaria": "#7c3aed",
    "titulo": "Indique seus Amigos",
    "subtitulo": "Quanto mais indicacoes, mais voce ganha!",
    "texto_botao": "Enviar Indicacoes",
    "mensagem_sucesso": "Indicacoes enviadas com sucesso!",
    "acao_pos_envio": "mensagem",
    "botao_estilo": "solid",
    "botao_largura_total": true,
    "card_max_width": "md",
    "sombra": "md",
    "border_radius": "lg"
  }'::jsonb,
  '[
    {
      "nome": "seu_nome",
      "tipo": "text",
      "label": "Seu nome",
      "placeholder": "Como devemos te chamar?",
      "obrigatorio": true,
      "campo_lead": "nome",
      "ordem": 1,
      "largura": "half"
    },
    {
      "nome": "seu_whatsapp",
      "tipo": "tel",
      "label": "Seu WhatsApp",
      "placeholder": "(00) 00000-0000",
      "obrigatorio": true,
      "campo_lead": "whatsapp",
      "mascara": "(99) 99999-9999",
      "ordem": 2,
      "largura": "half"
    },
    {
      "nome": "indicados",
      "tipo": "indicados",
      "label": "Amigos que voce quer indicar",
      "obrigatorio": true,
      "ordem": 3,
      "largura": "full",
      "indicados_config": {
        "min_indicados": 1,
        "max_indicados": 10,
        "campos_por_indicado": [
          {
            "nome": "nome_amigo",
            "label": "Nome",
            "tipo": "text",
            "obrigatorio": true,
            "placeholder": "Nome do amigo"
          },
          {
            "nome": "whatsapp_amigo",
            "label": "WhatsApp",
            "tipo": "tel",
            "obrigatorio": true,
            "placeholder": "(00) 00000-0000",
            "mascara": "(99) 99999-9999"
          }
        ]
      }
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================
-- VERIFICATION
-- =============================================================

DO $$
DECLARE
  v_has_indicados_type BOOLEAN;
  v_template_count INT;
BEGIN
  -- Check if indicados type is in constraint
  SELECT EXISTS(
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'yeslaser_formulario_campos_tipo_check'
    AND check_clause LIKE '%indicados%'
  ) INTO v_has_indicados_type;

  -- Count indication templates
  SELECT COUNT(*) INTO v_template_count
  FROM yeslaser_formulario_templates
  WHERE categoria = 'indicacao';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION INDICADOS FIELD TYPE COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Indicados type added: %', v_has_indicados_type;
  RAISE NOTICE 'Indication templates: %', v_template_count;
  RAISE NOTICE '========================================';
END $$;
