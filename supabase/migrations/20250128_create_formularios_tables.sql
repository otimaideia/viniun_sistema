-- Migration: 20250128_create_formularios_tables.sql
-- Purpose: Criar sistema completo de formularios dinamicos (baseado no PopDents)
-- Author: Claude + Danilo
-- Date: 2025-01-28

-- ROLLBACK PLAN:
-- BEGIN;
-- DROP TABLE IF EXISTS yeslaser_formulario_templates CASCADE;
-- DROP TABLE IF EXISTS yeslaser_formulario_ab_tests CASCADE;
-- DROP TABLE IF EXISTS yeslaser_formulario_analytics CASCADE;
-- DROP TABLE IF EXISTS yeslaser_formulario_submissoes CASCADE;
-- DROP TABLE IF EXISTS yeslaser_formulario_campos CASCADE;
-- DROP TABLE IF EXISTS yeslaser_formularios CASCADE;
-- DROP FUNCTION IF EXISTS user_has_franchise_access_yeslaser(uuid);
-- DROP FUNCTION IF EXISTS user_is_admin_yeslaser();
-- COMMIT;

BEGIN;

-- =============================================================
-- 1. HELPER FUNCTIONS FOR RLS
-- =============================================================

-- Funcao para verificar se usuario tem acesso a franquia
CREATE OR REPLACE FUNCTION user_has_franchise_access_yeslaser(p_franqueado_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM yeslaser_profiles
    WHERE id = auth.uid()
    AND (
      role IN ('admin', 'central')
      OR unidade_id = p_franqueado_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para verificar se usuario e admin
CREATE OR REPLACE FUNCTION user_is_admin_yeslaser()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM yeslaser_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'central')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 2. TABELA PRINCIPAL DE FORMULARIOS
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueado_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE CASCADE,

  -- Identificacao
  nome varchar(255) NOT NULL,
  descricao text,
  slug varchar(255) NOT NULL,
  status varchar(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'inativo', 'arquivado')),
  ativo boolean DEFAULT true,

  -- Textos do Formulario
  titulo varchar(255),
  subtitulo text,
  texto_botao varchar(100) DEFAULT 'Enviar',
  mensagem_sucesso text DEFAULT 'Cadastro realizado com sucesso!',

  -- Multi-Step Wizard
  modo varchar(20) DEFAULT 'simples' CHECK (modo IN ('simples', 'wizard')),
  wizard_config jsonb,
  mostrar_progresso boolean DEFAULT true,
  permitir_voltar boolean DEFAULT true,

  -- Template e Layout
  layout_template varchar(50) DEFAULT 'padrao',

  -- Personalizacao Visual - Cores
  cor_primaria varchar(7) DEFAULT '#10b981',
  cor_secundaria varchar(7) DEFAULT '#059669',
  cor_texto varchar(7) DEFAULT '#1f2937',
  cor_fundo varchar(7) DEFAULT '#ffffff',
  cor_botao varchar(7) DEFAULT '#10b981',
  cor_botao_texto varchar(7) DEFAULT '#ffffff',

  -- Cores dos Campos
  cor_campo_fundo varchar(7),
  cor_campo_texto varchar(7),
  cor_campo_borda varchar(7),
  cor_campo_foco varchar(7),
  cor_campo_placeholder varchar(7),
  cor_label varchar(7),

  -- Cores Header/Stepper
  cor_header_fundo varchar(7),
  cor_header_texto varchar(7),
  cor_stepper_ativo varchar(7),
  cor_stepper_inativo varchar(7),
  cor_stepper_completo varchar(7),

  -- Cores Feedback
  cor_sucesso varchar(7),
  cor_erro varchar(7),
  cor_aviso varchar(7),

  -- Gradientes
  gradiente_ativo boolean DEFAULT false,
  gradiente_inicio varchar(7),
  gradiente_fim varchar(7),
  gradiente_direcao varchar(20),

  -- Tipografia
  font_family varchar(100) DEFAULT 'Inter',
  font_size_base varchar(10) DEFAULT 'base',
  font_weight_label varchar(20) DEFAULT 'medium',

  -- Bordas e Sombras
  border_radius varchar(10) DEFAULT 'lg',
  border_width varchar(5) DEFAULT '1',
  sombra varchar(10) DEFAULT 'md',

  -- Espacamento
  padding_form varchar(10) DEFAULT 'md',
  gap_campos varchar(10) DEFAULT 'md',

  -- Imagens
  logo_url text,
  logo_tamanho varchar(10) DEFAULT 'md',
  logo_posicao varchar(20) DEFAULT 'center',
  background_image_url text,
  background_overlay boolean DEFAULT false,
  background_overlay_cor varchar(20),

  -- Badge/Icone Header
  icone_header_url text,
  badge_texto varchar(50),
  badge_cor_fundo varchar(7),
  badge_cor_texto varchar(7),

  -- Animacoes
  animacoes_ativas boolean DEFAULT true,
  animacao_entrada varchar(20) DEFAULT 'fade',

  -- Estilo Botoes
  botao_estilo varchar(20) DEFAULT 'solid',
  botao_tamanho varchar(10) DEFAULT 'md',
  botao_largura_total boolean DEFAULT true,

  -- Estilo Campos
  campo_estilo varchar(20) DEFAULT 'default',
  mostrar_icones_campos boolean DEFAULT true,

  -- Stepper Visual
  stepper_estilo varchar(20) DEFAULT 'circles',
  stepper_posicao varchar(20) DEFAULT 'top',
  stepper_mostrar_numeros boolean DEFAULT true,
  stepper_mostrar_titulos boolean DEFAULT true,

  -- Card Container
  card_max_width varchar(10) DEFAULT 'lg',
  card_fundo varchar(7),
  card_borda boolean DEFAULT true,

  -- Footer
  mostrar_footer boolean DEFAULT false,
  texto_footer text,
  cor_footer_fundo varchar(7),
  cor_footer_texto varchar(7),

  -- Secoes Extras
  mostrar_depoimentos boolean DEFAULT false,
  mostrar_beneficios boolean DEFAULT false,
  mostrar_contadores boolean DEFAULT false,

  -- Acao Pos-Envio
  acao_pos_envio varchar(20) DEFAULT 'mensagem' CHECK (acao_pos_envio IN ('mensagem', 'redirect', 'whatsapp')),
  redirect_url text,
  whatsapp_numero varchar(20),
  whatsapp_mensagem text,
  whatsapp_incluir_dados boolean DEFAULT true,

  -- Webhook
  webhook_ativo boolean DEFAULT false,
  webhook_url text,
  webhook_headers jsonb,
  webhook_retry boolean DEFAULT true,

  -- CEP Auto-fill
  cep_auto_fill boolean DEFAULT true,

  -- Pixels de Rastreamento
  pixel_facebook varchar(50),
  pixel_facebook_evento varchar(50),
  pixel_ga4 varchar(50),
  pixel_ga4_evento varchar(50),
  pixel_tiktok varchar(50),
  pixel_tiktok_evento varchar(50),

  -- Seguranca
  recaptcha_ativo boolean DEFAULT false,
  recaptcha_site_key varchar(100),
  honeypot_ativo boolean DEFAULT true,
  rate_limit_por_ip integer,

  -- Captura de Dados
  capturar_utms boolean DEFAULT true,
  capturar_ip boolean DEFAULT false,
  capturar_user_agent boolean DEFAULT false,

  -- Integracao Campanhas
  campanha_id uuid,

  -- A/B Testing
  variante_pai_id uuid REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,
  variante_nome varchar(50),
  variante_peso integer DEFAULT 100 CHECK (variante_peso >= 0 AND variante_peso <= 100),

  -- Timestamps
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),

  -- Constraint unico para slug por franquia
  UNIQUE(franqueado_id, slug)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_formularios_franqueado ON yeslaser_formularios(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_formularios_slug ON yeslaser_formularios(slug);
CREATE INDEX IF NOT EXISTS idx_formularios_status ON yeslaser_formularios(status);
CREATE INDEX IF NOT EXISTS idx_formularios_ativo ON yeslaser_formularios(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_formularios_variante_pai ON yeslaser_formularios(variante_pai_id) WHERE variante_pai_id IS NOT NULL;

-- =============================================================
-- 3. TABELA DE CAMPOS DO FORMULARIO
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,

  -- Identificacao
  nome varchar(100) NOT NULL,
  tipo varchar(30) NOT NULL CHECK (tipo IN ('text', 'email', 'tel', 'cpf', 'cep', 'select', 'textarea', 'checkbox', 'radio', 'date', 'number', 'hidden', 'servico', 'file', 'rating', 'range')),
  label varchar(255) NOT NULL,
  placeholder varchar(255),

  -- Validacao
  obrigatorio boolean DEFAULT false,
  min_length integer,
  max_length integer,
  pattern varchar(255),
  mensagem_erro varchar(255),
  mascara varchar(50),
  validacao varchar(255),

  -- Opcoes (para select, radio, checkbox)
  opcoes text[],

  -- Mapeamento para Lead
  campo_lead varchar(50),

  -- Wizard
  etapa integer DEFAULT 1,

  -- Condicionalidade
  condicao_campo varchar(100),
  condicao_valor varchar(255),

  -- Layout
  ordem integer NOT NULL DEFAULT 0,
  largura varchar(10) DEFAULT 'full' CHECK (largura IN ('full', 'half', 'third')),
  ativo boolean DEFAULT true,

  -- Timestamps
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_campos_formulario ON yeslaser_formulario_campos(formulario_id);
CREATE INDEX IF NOT EXISTS idx_campos_ordem ON yeslaser_formulario_campos(formulario_id, ordem);
CREATE INDEX IF NOT EXISTS idx_campos_etapa ON yeslaser_formulario_campos(formulario_id, etapa);

-- =============================================================
-- 4. TABELA DE SUBMISSOES
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_submissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES sistema_leads_yeslaser(id) ON DELETE SET NULL,

  -- Dados preenchidos
  dados jsonb NOT NULL,

  -- Metadados de rastreamento
  ip_address varchar(45),
  user_agent text,
  referrer text,
  session_id varchar(100),
  tempo_preenchimento_segundos integer,

  -- UTM Parameters
  utm_source varchar(100),
  utm_medium varchar(100),
  utm_campaign varchar(100),
  utm_content varchar(100),
  utm_term varchar(100),

  -- Indicacao
  codigo_indicacao varchar(10),
  indicado_por_id uuid REFERENCES sistema_leads_yeslaser(id) ON DELETE SET NULL,

  -- Webhook
  webhook_enviado boolean DEFAULT false,
  webhook_response_code integer,
  webhook_response_body text,
  webhook_tentativas integer DEFAULT 0,

  -- A/B Testing
  variante_id uuid REFERENCES yeslaser_formularios(id),

  -- Timestamps
  created_at timestamp DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_submissoes_formulario ON yeslaser_formulario_submissoes(formulario_id);
CREATE INDEX IF NOT EXISTS idx_submissoes_lead ON yeslaser_formulario_submissoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_submissoes_codigo ON yeslaser_formulario_submissoes(codigo_indicacao) WHERE codigo_indicacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissoes_created ON yeslaser_formulario_submissoes(created_at);
CREATE INDEX IF NOT EXISTS idx_submissoes_session ON yeslaser_formulario_submissoes(session_id);

-- =============================================================
-- 5. TABELA DE ANALYTICS
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,

  -- Evento
  evento varchar(30) NOT NULL CHECK (evento IN ('view', 'start', 'step', 'submit', 'abandon', 'error')),
  etapa_atual integer,
  tempo_total_segundos integer,

  -- Sessao
  session_id varchar(100),

  -- Metadados
  ip_address varchar(45),
  user_agent text,
  referrer text,

  -- UTM Parameters
  utm_source varchar(100),
  utm_medium varchar(100),
  utm_campaign varchar(100),
  utm_content varchar(100),
  utm_term varchar(100),

  -- A/B Testing
  variante_id uuid REFERENCES yeslaser_formularios(id),

  -- Dados extras
  dados_extra jsonb,

  -- Timestamps
  created_at timestamp DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_analytics_formulario ON yeslaser_formulario_analytics(formulario_id);
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON yeslaser_formulario_analytics(evento);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON yeslaser_formulario_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON yeslaser_formulario_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_variante ON yeslaser_formulario_analytics(variante_id) WHERE variante_id IS NOT NULL;

-- =============================================================
-- 6. TABELA DE TEMPLATES
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao
  nome varchar(255) NOT NULL,
  descricao text,
  categoria varchar(50) NOT NULL DEFAULT 'lead_capture' CHECK (categoria IN ('lead_capture', 'agendamento', 'orcamento', 'contato', 'pesquisa', 'cadastro', 'evento', 'avaliacao', 'indicacao')),
  thumbnail_url text,

  -- Configuracoes do template (JSON com config do formulario)
  config jsonb NOT NULL DEFAULT '{}',

  -- Campos do template (JSON array)
  campos jsonb NOT NULL DEFAULT '[]',

  -- Metadata
  uso_count integer DEFAULT 0,
  is_premium boolean DEFAULT false,
  is_sistema boolean DEFAULT true,
  franqueado_id uuid REFERENCES yeslaser_franqueados(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_templates_categoria ON yeslaser_formulario_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_templates_franqueado ON yeslaser_formulario_templates(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_sistema ON yeslaser_formulario_templates(is_sistema);

-- =============================================================
-- 7. TABELA DE TESTES A/B
-- =============================================================

CREATE TABLE IF NOT EXISTS yeslaser_formulario_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Formulario original
  formulario_original_id uuid NOT NULL REFERENCES yeslaser_formularios(id) ON DELETE CASCADE,
  franqueado_id uuid NOT NULL REFERENCES yeslaser_franqueados(id) ON DELETE CASCADE,

  -- Identificacao
  nome varchar(255) NOT NULL,
  descricao text,
  status varchar(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'pausado', 'finalizado')),

  -- Configuracao do teste
  metrica_principal varchar(50) DEFAULT 'conversion_rate' CHECK (metrica_principal IN ('conversion_rate', 'avg_time', 'abandonment_rate')),
  duracao_dias integer,
  min_submissoes integer DEFAULT 100,

  -- Resultados
  vencedor_id uuid REFERENCES yeslaser_formularios(id),
  confianca_estatistica decimal(5,2),

  -- Timestamps
  inicio_at timestamp,
  fim_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ab_tests_formulario ON yeslaser_formulario_ab_tests(formulario_original_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_franqueado ON yeslaser_formulario_ab_tests(franqueado_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON yeslaser_formulario_ab_tests(status);

-- =============================================================
-- 8. RLS POLICIES
-- =============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE yeslaser_formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_formulario_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_formulario_submissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_formulario_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_formulario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE yeslaser_formulario_ab_tests ENABLE ROW LEVEL SECURITY;

-- Formularios
DROP POLICY IF EXISTS "Formularios visiveis por franquia" ON yeslaser_formularios;
CREATE POLICY "Formularios visiveis por franquia" ON yeslaser_formularios
  FOR SELECT USING (
    franqueado_id IS NULL
    OR user_has_franchise_access_yeslaser(franqueado_id)
  );

DROP POLICY IF EXISTS "Criar formularios" ON yeslaser_formularios;
CREATE POLICY "Criar formularios" ON yeslaser_formularios
  FOR INSERT WITH CHECK (user_has_franchise_access_yeslaser(franqueado_id));

DROP POLICY IF EXISTS "Atualizar formularios" ON yeslaser_formularios;
CREATE POLICY "Atualizar formularios" ON yeslaser_formularios
  FOR UPDATE USING (user_has_franchise_access_yeslaser(franqueado_id));

DROP POLICY IF EXISTS "Deletar formularios" ON yeslaser_formularios;
CREATE POLICY "Deletar formularios" ON yeslaser_formularios
  FOR DELETE USING (user_has_franchise_access_yeslaser(franqueado_id));

-- Campos - seguem o formulario pai
DROP POLICY IF EXISTS "Campos visiveis por formulario" ON yeslaser_formulario_campos;
CREATE POLICY "Campos visiveis por formulario" ON yeslaser_formulario_campos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM yeslaser_formularios f
      WHERE f.id = formulario_id
      AND (f.franqueado_id IS NULL OR user_has_franchise_access_yeslaser(f.franqueado_id))
    )
  );

DROP POLICY IF EXISTS "Gerenciar campos" ON yeslaser_formulario_campos;
CREATE POLICY "Gerenciar campos" ON yeslaser_formulario_campos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM yeslaser_formularios f
      WHERE f.id = formulario_id
      AND user_has_franchise_access_yeslaser(f.franqueado_id)
    )
  );

-- Submissoes - publico para inserir, restrito para ver
DROP POLICY IF EXISTS "Submissoes publicas insert" ON yeslaser_formulario_submissoes;
CREATE POLICY "Submissoes publicas insert" ON yeslaser_formulario_submissoes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM yeslaser_formularios WHERE id = formulario_id AND ativo = true)
  );

DROP POLICY IF EXISTS "Submissoes visiveis por franquia" ON yeslaser_formulario_submissoes;
CREATE POLICY "Submissoes visiveis por franquia" ON yeslaser_formulario_submissoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM yeslaser_formularios f
      WHERE f.id = formulario_id
      AND user_has_franchise_access_yeslaser(f.franqueado_id)
    )
  );

-- Analytics - publico para inserir
DROP POLICY IF EXISTS "Analytics publicos insert" ON yeslaser_formulario_analytics;
CREATE POLICY "Analytics publicos insert" ON yeslaser_formulario_analytics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Analytics visiveis por franquia" ON yeslaser_formulario_analytics;
CREATE POLICY "Analytics visiveis por franquia" ON yeslaser_formulario_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM yeslaser_formularios f
      WHERE f.id = formulario_id
      AND user_has_franchise_access_yeslaser(f.franqueado_id)
    )
  );

-- Templates
DROP POLICY IF EXISTS "Templates do sistema visiveis" ON yeslaser_formulario_templates;
CREATE POLICY "Templates do sistema visiveis" ON yeslaser_formulario_templates
  FOR SELECT USING (
    is_sistema = true
    OR franqueado_id IS NULL
    OR user_has_franchise_access_yeslaser(franqueado_id)
  );

DROP POLICY IF EXISTS "Admins criam templates sistema" ON yeslaser_formulario_templates;
CREATE POLICY "Admins criam templates sistema" ON yeslaser_formulario_templates
  FOR INSERT WITH CHECK (
    (is_sistema = true AND user_is_admin_yeslaser())
    OR (is_sistema = false AND user_has_franchise_access_yeslaser(franqueado_id))
  );

DROP POLICY IF EXISTS "Atualizar templates" ON yeslaser_formulario_templates;
CREATE POLICY "Atualizar templates" ON yeslaser_formulario_templates
  FOR UPDATE USING (
    (is_sistema = true AND user_is_admin_yeslaser())
    OR (is_sistema = false AND user_has_franchise_access_yeslaser(franqueado_id))
  );

-- A/B Tests
DROP POLICY IF EXISTS "AB tests por franquia" ON yeslaser_formulario_ab_tests;
CREATE POLICY "AB tests por franquia" ON yeslaser_formulario_ab_tests
  FOR SELECT USING (user_has_franchise_access_yeslaser(franqueado_id));

DROP POLICY IF EXISTS "Criar AB tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Criar AB tests" ON yeslaser_formulario_ab_tests
  FOR INSERT WITH CHECK (user_has_franchise_access_yeslaser(franqueado_id));

DROP POLICY IF EXISTS "Atualizar AB tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Atualizar AB tests" ON yeslaser_formulario_ab_tests
  FOR UPDATE USING (user_has_franchise_access_yeslaser(franqueado_id));

DROP POLICY IF EXISTS "Deletar AB tests" ON yeslaser_formulario_ab_tests;
CREATE POLICY "Deletar AB tests" ON yeslaser_formulario_ab_tests
  FOR DELETE USING (user_has_franchise_access_yeslaser(franqueado_id));

-- =============================================================
-- 9. FUNCAO PARA ESTATISTICAS DO FORMULARIO
-- =============================================================

CREATE OR REPLACE FUNCTION get_formulario_stats_yeslaser(p_formulario_id uuid)
RETURNS TABLE (
  total_views bigint,
  total_starts bigint,
  total_submits bigint,
  total_abandons bigint,
  conversion_rate decimal,
  avg_time_seconds decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT CASE WHEN a.evento = 'view' THEN a.session_id END) as total_views,
    COUNT(DISTINCT CASE WHEN a.evento = 'start' THEN a.session_id END) as total_starts,
    COUNT(DISTINCT CASE WHEN a.evento = 'submit' THEN a.session_id END) as total_submits,
    COUNT(DISTINCT CASE WHEN a.evento = 'abandon' THEN a.session_id END) as total_abandons,
    CASE
      WHEN COUNT(DISTINCT CASE WHEN a.evento = 'view' THEN a.session_id END) > 0
      THEN ROUND(
        COUNT(DISTINCT CASE WHEN a.evento = 'submit' THEN a.session_id END)::decimal /
        COUNT(DISTINCT CASE WHEN a.evento = 'view' THEN a.session_id END) * 100, 2
      )
      ELSE 0
    END as conversion_rate,
    COALESCE(AVG(CASE WHEN a.evento = 'submit' THEN a.tempo_total_segundos END), 0) as avg_time_seconds
  FROM yeslaser_formulario_analytics a
  WHERE a.formulario_id = p_formulario_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 10. TRIGGER PARA ATUALIZAR updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_formularios_updated_at ON yeslaser_formularios;
CREATE TRIGGER trigger_formularios_updated_at
BEFORE UPDATE ON yeslaser_formularios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_campos_updated_at ON yeslaser_formulario_campos;
CREATE TRIGGER trigger_campos_updated_at
BEFORE UPDATE ON yeslaser_formulario_campos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_templates_updated_at ON yeslaser_formulario_templates;
CREATE TRIGGER trigger_templates_updated_at
BEFORE UPDATE ON yeslaser_formulario_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_ab_tests_updated_at ON yeslaser_formulario_ab_tests;
CREATE TRIGGER trigger_ab_tests_updated_at
BEFORE UPDATE ON yeslaser_formulario_ab_tests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- 11. INSERIR TEMPLATES PADRAO
-- =============================================================

INSERT INTO yeslaser_formulario_templates (nome, descricao, categoria, is_sistema, config, campos)
VALUES
-- Template: Captura de Leads Simples
(
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
),

-- Template: Indicacao
(
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
),

-- Template: Agendamento de Avaliacao
(
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
),

-- Template: Cadastro Completo com Wizard
(
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
),

-- Template: Pesquisa de Satisfacao
(
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

COMMIT;

-- =============================================================
-- VERIFICACAO FINAL
-- =============================================================

DO $$
DECLARE
  v_tables_count INT;
  v_templates_count INT;
BEGIN
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_name LIKE 'yeslaser_formulario%';

  SELECT COUNT(*) INTO v_templates_count FROM yeslaser_formulario_templates;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACAO FORMULARIOS CONCLUIDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tabelas criadas: %', v_tables_count;
  RAISE NOTICE 'Templates inseridos: %', v_templates_count;
  RAISE NOTICE '========================================';
END $$;
