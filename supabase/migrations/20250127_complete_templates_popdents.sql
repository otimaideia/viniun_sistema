-- Migration: 20250127_complete_templates_popdents.sql
-- Purpose: Completar templates para ficar igual ao PopDents
-- Author: Claude + Danilo
-- Date: 2025-01-27

-- ROLLBACK PLAN:
-- DELETE FROM yeslaser_formulario_templates WHERE nome IN (
--   'Solicitacao de Orcamento',
--   'Formulario de Contato',
--   'Cadastro Completo com Endereco'
-- );

BEGIN;

-- =============================================================
-- 1. TEMPLATE: SOLICITACAO DE ORCAMENTO (FALTANDO)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Solicitacao de Orcamento',
  'Formulario completo para solicitacao de orcamento com descricao do servico desejado.',
  'orcamento',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#f59e0b",
    "titulo": "Solicite seu Orcamento",
    "subtitulo": "Sem compromisso, resposta em ate 24h",
    "texto_botao": "Solicitar Orcamento",
    "mensagem_sucesso": "Orcamento solicitado! Voce recebera uma proposta em breve.",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "largura": "half"},
    {"nome": "servico", "tipo": "servico", "label": "Servicos de interesse", "obrigatorio": true, "ordem": 4, "largura": "full"},
    {"nome": "descricao", "tipo": "textarea", "label": "Descreva o que voce precisa", "obrigatorio": false, "campo_lead": "observacoes", "ordem": 5, "largura": "full", "placeholder": "Conte-nos mais sobre o que voce procura..."}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2. TEMPLATE: FORMULARIO DE CONTATO (FALTANDO)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Formulario de Contato',
  'Formulario basico de contato com assunto e mensagem.',
  'contato',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#6366f1",
    "titulo": "Entre em Contato",
    "subtitulo": "Estamos prontos para ajudar",
    "texto_botao": "Enviar Mensagem",
    "mensagem_sucesso": "Mensagem enviada! Responderemos em breve.",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "Telefone", "obrigatorio": false, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "largura": "half"},
    {"nome": "assunto", "tipo": "select", "label": "Assunto", "obrigatorio": true, "ordem": 4, "largura": "full", "opcoes": ["Duvida", "Reclamacao", "Sugestao", "Elogio", "Outro"]},
    {"nome": "mensagem", "tipo": "textarea", "label": "Sua mensagem", "obrigatorio": true, "campo_lead": "observacoes", "ordem": 5, "largura": "full", "placeholder": "Digite sua mensagem aqui..."}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 3. TEMPLATE: CADASTRO COMPLETO COM ENDERECO (ATUALIZADO)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Cadastro Completo com Endereco',
  'Formulario wizard em etapas para cadastro completo com dados pessoais e endereco.',
  'cadastro',
  TRUE,
  '{
    "modo": "wizard",
    "mostrar_progresso": true,
    "permitir_voltar": true,
    "cor_primaria": "#8b5cf6",
    "titulo": "Complete seu Cadastro",
    "texto_botao": "Finalizar Cadastro",
    "mensagem_sucesso": "Cadastro realizado com sucesso!",
    "acao_pos_envio": "mensagem",
    "cep_auto_fill": true,
    "wizard_config": {
      "etapas": [
        {"id": "1", "titulo": "Dados Pessoais", "ordem": 1},
        {"id": "2", "titulo": "Endereco", "ordem": 2}
      ]
    }
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "etapa": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 2, "etapa": 1, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "etapa": 1, "largura": "half"},
    {"nome": "cpf", "tipo": "cpf", "label": "CPF", "obrigatorio": true, "campo_lead": "cpf", "mascara": "999.999.999-99", "ordem": 4, "etapa": 1, "largura": "half"},
    {"nome": "data_nascimento", "tipo": "date", "label": "Data de Nascimento", "obrigatorio": false, "campo_lead": "data_nascimento", "ordem": 5, "etapa": 1, "largura": "half"},
    {"nome": "cep", "tipo": "cep", "label": "CEP", "obrigatorio": true, "campo_lead": "cep", "mascara": "99999-999", "ordem": 6, "etapa": 2, "largura": "third"},
    {"nome": "rua", "tipo": "text", "label": "Rua", "obrigatorio": true, "campo_lead": "rua", "ordem": 7, "etapa": 2, "largura": "full"},
    {"nome": "numero", "tipo": "text", "label": "Numero", "obrigatorio": true, "campo_lead": "numero", "ordem": 8, "etapa": 2, "largura": "third"},
    {"nome": "complemento", "tipo": "text", "label": "Complemento", "obrigatorio": false, "campo_lead": "complemento", "ordem": 9, "etapa": 2, "largura": "third"},
    {"nome": "bairro", "tipo": "text", "label": "Bairro", "obrigatorio": true, "campo_lead": "bairro", "ordem": 10, "etapa": 2, "largura": "third"},
    {"nome": "cidade", "tipo": "text", "label": "Cidade", "obrigatorio": true, "campo_lead": "cidade", "ordem": 11, "etapa": 2, "largura": "half"},
    {"nome": "estado", "tipo": "select", "label": "Estado", "obrigatorio": true, "campo_lead": "estado", "ordem": 12, "etapa": 2, "largura": "half", "opcoes": ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 4. TEMPLATE: AVALIACAO COM RATING (BONUS - YESlaser exclusivo)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Avaliacao com Estrelas',
  'Formulario de avaliacao com sistema de estrelas para avaliar atendimento.',
  'avaliacao',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#f59e0b",
    "titulo": "Avalie sua Experiencia",
    "subtitulo": "Sua opiniao nos ajuda a melhorar",
    "texto_botao": "Enviar Avaliacao",
    "mensagem_sucesso": "Obrigado pela sua avaliacao!",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Seu nome (opcional)", "obrigatorio": false, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "rating_atendimento", "tipo": "rating", "label": "Como voce avalia nosso atendimento?", "obrigatorio": true, "ordem": 2, "largura": "full"},
    {"nome": "rating_resultado", "tipo": "rating", "label": "Como voce avalia o resultado do tratamento?", "obrigatorio": true, "ordem": 3, "largura": "full"},
    {"nome": "rating_ambiente", "tipo": "rating", "label": "Como voce avalia nosso ambiente?", "obrigatorio": true, "ordem": 4, "largura": "full"},
    {"nome": "recomendaria", "tipo": "radio", "label": "Voce nos recomendaria?", "obrigatorio": true, "ordem": 5, "largura": "full", "opcoes": ["Com certeza!", "Provavelmente sim", "Talvez", "Provavelmente nao"]},
    {"nome": "comentarios", "tipo": "textarea", "label": "Deixe seu comentario", "obrigatorio": false, "campo_lead": "observacoes", "ordem": 6, "largura": "full", "placeholder": "O que podemos melhorar?"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 5. TEMPLATE: EVENTO - INSCRICAO (BONUS)
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Inscricao em Evento',
  'Formulario para inscricao em eventos, workshops ou palestras.',
  'evento',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#8b5cf6",
    "titulo": "Inscricao no Evento",
    "subtitulo": "Garanta sua vaga!",
    "texto_botao": "Confirmar Inscricao",
    "mensagem_sucesso": "Inscricao confirmada! Enviamos os detalhes para seu e-mail.",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "largura": "half"},
    {"nome": "como_soube", "tipo": "select", "label": "Como soube do evento?", "obrigatorio": false, "ordem": 4, "largura": "full", "opcoes": ["Instagram", "Facebook", "WhatsApp", "Indicacao", "Google", "Outro"]}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================
-- VERIFICACAO FINAL
-- =============================================================

DO $$
DECLARE
  v_templates_count INT;
  v_categorias_count INT;
BEGIN
  SELECT COUNT(*) INTO v_templates_count FROM yeslaser_formulario_templates;
  SELECT COUNT(DISTINCT categoria) INTO v_categorias_count FROM yeslaser_formulario_templates;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEMPLATES COMPLETADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de templates: %', v_templates_count;
  RAISE NOTICE 'Categorias cobertas: %', v_categorias_count;
  RAISE NOTICE '========================================';
END $$;
