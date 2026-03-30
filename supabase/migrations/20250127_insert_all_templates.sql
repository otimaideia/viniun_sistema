-- Migration: 20250127_insert_all_templates.sql
-- Purpose: Inserir TODOS os templates de formularios (executar no Supabase Studio)
-- Author: Claude + Danilo
-- Date: 2025-01-27
--
-- INSTRUCOES: Execute este SQL no Supabase Studio > SQL Editor
-- Isso ignora as policies de RLS e insere os templates como sistema

-- Limpar templates existentes e reinserir (opcional - descomente se necessário)
-- DELETE FROM yeslaser_formulario_templates WHERE is_sistema = true;

-- =============================================================
-- TEMPLATES BASICOS (6 templates)
-- =============================================================

-- 1. Captura de Leads Basico
INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Captura de Leads - Basico',
  'Formulario simples para capturar nome, email e telefone de potenciais clientes.',
  'lead_capture',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#10b981",
    "titulo": "Agende sua Avaliacao",
    "subtitulo": "Preencha seus dados e entraremos em contato",
    "texto_botao": "Quero Agendar",
    "mensagem_sucesso": "Obrigado! Entraremos em contato em breve.",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "largura": "half"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 2. Formulario de Indicacao
INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Formulario de Indicacao',
  'Formulario para indicacao de amigos com codigo de referencia.',
  'indicacao',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#8b5cf6",
    "titulo": "Indique e Ganhe!",
    "subtitulo": "Indique um amigo e ganhe beneficios exclusivos",
    "texto_botao": "Indicar Agora",
    "mensagem_sucesso": "Indicacao registrada com sucesso! Voce sera notificado quando seu amigo se cadastrar.",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome do indicado", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "email", "tipo": "email", "label": "E-mail do indicado", "obrigatorio": false, "campo_lead": "email", "ordem": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp do indicado", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 3, "largura": "half"},
    {"nome": "servico", "tipo": "servico", "label": "Servico de interesse", "obrigatorio": false, "ordem": 4, "largura": "full"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 3. Agendamento de Avaliacao
INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Agendamento de Avaliacao',
  'Formulario para agendamento de avaliacao com selecao de servico e preferencia de horario.',
  'agendamento',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#3b82f6",
    "titulo": "Agende sua Avaliacao",
    "subtitulo": "Escolha o melhor horario para voce",
    "texto_botao": "Agendar",
    "mensagem_sucesso": "Avaliacao agendada com sucesso! Confirmaremos em breve.",
    "acao_pos_envio": "whatsapp",
    "whatsapp_incluir_dados": true
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 2, "largura": "half"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": false, "campo_lead": "email", "ordem": 3, "largura": "half"},
    {"nome": "servico", "tipo": "servico", "label": "Servico de interesse", "obrigatorio": true, "ordem": 4, "largura": "full"},
    {"nome": "preferencia_horario", "tipo": "select", "label": "Preferencia de horario", "obrigatorio": true, "ordem": 5, "largura": "full", "opcoes": ["Manha (8h-12h)", "Tarde (13h-18h)", "Noite (18h-21h)", "Qualquer horario"]}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 4. Cadastro Completo (wizard)
INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Cadastro Completo',
  'Formulario wizard em etapas para cadastro completo com dados pessoais.',
  'cadastro',
  TRUE,
  '{
    "modo": "wizard",
    "mostrar_progresso": true,
    "permitir_voltar": true,
    "cor_primaria": "#10b981",
    "titulo": "Complete seu Cadastro",
    "texto_botao": "Finalizar Cadastro",
    "mensagem_sucesso": "Cadastro realizado com sucesso!",
    "acao_pos_envio": "mensagem",
    "wizard_config": {
      "etapas": [
        {"id": "1", "titulo": "Dados Pessoais", "ordem": 1},
        {"id": "2", "titulo": "Contato", "ordem": 2}
      ]
    }
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Nome completo", "obrigatorio": true, "campo_lead": "nome", "ordem": 1, "etapa": 1, "largura": "full"},
    {"nome": "cpf", "tipo": "cpf", "label": "CPF", "obrigatorio": true, "campo_lead": "cpf", "mascara": "999.999.999-99", "ordem": 2, "etapa": 1, "largura": "half"},
    {"nome": "data_nascimento", "tipo": "date", "label": "Data de Nascimento", "obrigatorio": false, "campo_lead": "data_nascimento", "ordem": 3, "etapa": 1, "largura": "half"},
    {"nome": "email", "tipo": "email", "label": "E-mail", "obrigatorio": true, "campo_lead": "email", "ordem": 4, "etapa": 2, "largura": "half"},
    {"nome": "whatsapp", "tipo": "tel", "label": "WhatsApp", "obrigatorio": true, "campo_lead": "whatsapp", "mascara": "(99) 99999-9999", "ordem": 5, "etapa": 2, "largura": "half"},
    {"nome": "cep", "tipo": "cep", "label": "CEP", "obrigatorio": false, "campo_lead": "cep", "mascara": "99999-999", "ordem": 6, "etapa": 2, "largura": "third"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 5. Pesquisa de Satisfacao
INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES (
  'Pesquisa de Satisfacao',
  'Formulario para avaliar a satisfacao do cliente apos o atendimento.',
  'pesquisa',
  TRUE,
  '{
    "modo": "simples",
    "cor_primaria": "#ec4899",
    "titulo": "Como foi sua experiencia?",
    "subtitulo": "Sua opiniao e muito importante para nos",
    "texto_botao": "Enviar Avaliacao",
    "mensagem_sucesso": "Obrigado pela sua avaliacao!",
    "acao_pos_envio": "mensagem"
  }'::jsonb,
  '[
    {"nome": "nome", "tipo": "text", "label": "Seu nome", "obrigatorio": false, "campo_lead": "nome", "ordem": 1, "largura": "full"},
    {"nome": "avaliacao_geral", "tipo": "radio", "label": "Como voce avalia nosso atendimento?", "obrigatorio": true, "ordem": 2, "largura": "full", "opcoes": ["Excelente", "Bom", "Regular", "Ruim"]},
    {"nome": "recomendaria", "tipo": "radio", "label": "Voce nos recomendaria para amigos e familiares?", "obrigatorio": true, "ordem": 3, "largura": "full", "opcoes": ["Com certeza!", "Provavelmente sim", "Talvez", "Provavelmente nao"]},
    {"nome": "comentarios", "tipo": "textarea", "label": "Deixe seu comentario (opcional)", "obrigatorio": false, "campo_lead": "observacoes", "ordem": 4, "largura": "full", "placeholder": "O que podemos melhorar?"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================================
-- TEMPLATES POPDENTS (5 templates adicionais)
-- =============================================================

-- 6. Solicitacao de Orcamento
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

-- 7. Formulario de Contato
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

-- 8. Cadastro Completo com Endereco (wizard)
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

-- 9. Avaliacao com Estrelas
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

-- 10. Inscricao em Evento
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

-- =============================================================
-- VERIFICACAO FINAL
-- =============================================================

SELECT
  categoria,
  COUNT(*) as total,
  STRING_AGG(nome, ', ') as templates
FROM yeslaser_formulario_templates
WHERE is_sistema = true
GROUP BY categoria
ORDER BY categoria;

-- Total de templates
SELECT COUNT(*) as total_templates FROM yeslaser_formulario_templates WHERE is_sistema = true;
