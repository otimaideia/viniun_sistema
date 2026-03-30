-- Migration: 20260310_002_mt_treinamentos.sql
-- Purpose: Criar tabelas do módulo de Treinamentos (LMS) + Gamificação
-- Author: Claude + Danilo
-- Date: 2026-03-10

-- ============================================================
-- MÓDULO 3: TREINAMENTOS (LMS) - 8 tabelas core
-- ============================================================

-- 1. Trilhas de aprendizagem
CREATE TABLE IF NOT EXISTS mt_training_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  codigo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  thumbnail_url TEXT,
  cor VARCHAR(7),
  icone VARCHAR(50),
  nivel VARCHAR(20) DEFAULT 'iniciante' CHECK (nivel IN ('iniciante','intermediario','avancado','expert')),
  duracao_estimada_horas DECIMAL(5,1),
  is_obrigatoria BOOLEAN DEFAULT false,
  is_sequencial BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  total_xp INT DEFAULT 0,
  roles_alvo TEXT[],
  prerequisite_track_id UUID REFERENCES mt_training_tracks(id),
  created_by UUID REFERENCES mt_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_mt_training_tracks_tenant ON mt_training_tracks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_training_tracks_deleted ON mt_training_tracks(deleted_at) WHERE deleted_at IS NULL;

-- 2. Módulos dentro de trilhas
CREATE TABLE IF NOT EXISTS mt_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  track_id UUID NOT NULL REFERENCES mt_training_tracks(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  thumbnail_url TEXT,
  duracao_estimada_min INT,
  is_published BOOLEAN DEFAULT false,
  xp_completar INT DEFAULT 50,
  nota_minima DECIMAL(5,2) DEFAULT 70.00,
  has_quiz BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_training_modules_track ON mt_training_modules(track_id, ordem);

-- 3. Aulas dentro de módulos
CREATE TABLE IF NOT EXISTS mt_training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  module_id UUID NOT NULL REFERENCES mt_training_modules(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('video','documento','texto','link_externo','embed')),
  conteudo_html TEXT,
  video_url TEXT,
  video_provider VARCHAR(20) CHECK (video_provider IN ('supabase','youtube','vimeo','outro')),
  video_duration_sec INT,
  documento_url TEXT,
  documento_nome VARCHAR(255),
  link_externo TEXT,
  embed_code TEXT,
  thumbnail_url TEXT,
  duracao_estimada_min INT,
  is_published BOOLEAN DEFAULT false,
  xp_completar INT DEFAULT 10,
  xp_primeiro_acesso INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_training_lessons_module ON mt_training_lessons(module_id, ordem);

-- 4. Materiais extras para aulas
CREATE TABLE IF NOT EXISTS mt_training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  lesson_id UUID NOT NULL REFERENCES mt_training_lessons(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pdf','imagem','planilha','apresentacao','link','outro')),
  arquivo_url TEXT,
  arquivo_nome VARCHAR(255),
  tamanho_bytes BIGINT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_training_materials_lesson ON mt_training_materials(lesson_id);

-- 5. Quizzes por módulo
CREATE TABLE IF NOT EXISTS mt_training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  module_id UUID NOT NULL REFERENCES mt_training_modules(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tempo_limite_min INT,
  tentativas_max INT DEFAULT 3,
  nota_minima DECIMAL(5,2) DEFAULT 70.00,
  mostrar_respostas BOOLEAN DEFAULT false,
  embaralhar_questoes BOOLEAN DEFAULT true,
  embaralhar_alternativas BOOLEAN DEFAULT true,
  xp_aprovado INT DEFAULT 100,
  xp_nota_maxima INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_training_quizzes_module ON mt_training_quizzes(module_id);

-- 6. Questões do quiz
CREATE TABLE IF NOT EXISTS mt_training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  quiz_id UUID NOT NULL REFERENCES mt_training_quizzes(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('multipla_escolha','verdadeiro_falso','dissertativa')),
  enunciado TEXT NOT NULL,
  imagem_url TEXT,
  pontos DECIMAL(5,2) DEFAULT 1.00,
  explicacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mt_training_quiz_questions_quiz ON mt_training_quiz_questions(quiz_id, ordem);

-- 7. Alternativas das questões
CREATE TABLE IF NOT EXISTS mt_training_quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  question_id UUID NOT NULL REFERENCES mt_training_quiz_questions(id) ON DELETE CASCADE,
  ordem INT NOT NULL,
  texto TEXT NOT NULL,
  is_correta BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_training_quiz_options_question ON mt_training_quiz_options(question_id, ordem);

-- 8. Templates de certificado
CREATE TABLE IF NOT EXISTS mt_training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  track_id UUID REFERENCES mt_training_tracks(id),
  titulo VARCHAR(255) NOT NULL,
  template_html TEXT,
  background_url TEXT,
  assinatura_url TEXT,
  assinante_nome VARCHAR(255),
  assinante_cargo VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- PROGRESSO DO COLABORADOR - 4 tabelas
-- ============================================================

-- 9. Matrícula em trilha
CREATE TABLE IF NOT EXISTS mt_training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  track_id UUID NOT NULL REFERENCES mt_training_tracks(id),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','pausado','cancelado','expirado')),
  progresso_pct DECIMAL(5,2) DEFAULT 0.00,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_id UUID REFERENCES mt_training_certificates(id),
  certificate_code VARCHAR(50),
  certificate_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_training_enrollments_tenant ON mt_training_enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_training_enrollments_user ON mt_training_enrollments(user_id);

-- 10. Progresso por aula
CREATE TABLE IF NOT EXISTS mt_training_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  lesson_id UUID NOT NULL REFERENCES mt_training_lessons(id),
  status VARCHAR(20) DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado','em_andamento','concluido')),
  progresso_pct DECIMAL(5,2) DEFAULT 0.00,
  video_position_sec INT DEFAULT 0,
  tempo_gasto_sec INT DEFAULT 0,
  first_access_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_training_lesson_progress_user ON mt_training_lesson_progress(user_id);

-- 11. Tentativas de quiz
CREATE TABLE IF NOT EXISTS mt_training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  quiz_id UUID NOT NULL REFERENCES mt_training_quizzes(id),
  nota DECIMAL(5,2),
  acertos INT DEFAULT 0,
  total_questoes INT DEFAULT 0,
  aprovado BOOLEAN DEFAULT false,
  tempo_gasto_sec INT,
  respostas JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_training_quiz_attempts_user ON mt_training_quiz_attempts(user_id, quiz_id);

-- 12. Materiais baixados pelo colaborador
CREATE TABLE IF NOT EXISTS mt_training_user_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  material_id UUID NOT NULL REFERENCES mt_training_materials(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, material_id)
);

-- ============================================================
-- GAMIFICAÇÃO - 6 tabelas
-- ============================================================

-- 13. Perfil de gamificação do colaborador
CREATE TABLE IF NOT EXISTS mt_gamification_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  rank_name VARCHAR(50) DEFAULT 'Iniciante',
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  total_lessons_completed INT DEFAULT 0,
  total_modules_completed INT DEFAULT 0,
  total_tracks_completed INT DEFAULT 0,
  total_quizzes_passed INT DEFAULT 0,
  total_perfect_quizzes INT DEFAULT 0,
  total_certificates INT DEFAULT 0,
  total_study_time_min INT DEFAULT 0,
  weekly_xp INT DEFAULT 0,
  monthly_xp INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_profiles_tenant ON mt_gamification_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_profiles_xp ON mt_gamification_profiles(tenant_id, total_xp DESC);

-- 14. Log de transações de XP
CREATE TABLE IF NOT EXISTS mt_gamification_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  amount INT NOT NULL,
  source VARCHAR(30) NOT NULL CHECK (source IN (
    'lesson_complete','lesson_first_access','module_complete',
    'track_complete','quiz_pass','quiz_perfect','streak_bonus',
    'badge_earned','daily_login','sop_execution','faq_created','manual_admin'
  )),
  source_id UUID,
  descricao VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_xp_log_user ON mt_gamification_xp_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_xp_log_tenant ON mt_gamification_xp_log(tenant_id);

-- 15. Definição de níveis por tenant
CREATE TABLE IF NOT EXISTS mt_gamification_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  level INT NOT NULL,
  nome VARCHAR(50) NOT NULL,
  xp_required INT NOT NULL,
  icone VARCHAR(50),
  cor VARCHAR(7),
  beneficio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, level)
);

-- 16. Badges/conquistas
CREATE TABLE IF NOT EXISTS mt_gamification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(500),
  icone_url TEXT,
  icone_emoji VARCHAR(10),
  categoria VARCHAR(30) CHECK (categoria IN ('aprendizado','consistencia','excelencia','social','marco','especial')),
  criterio_tipo VARCHAR(30) NOT NULL CHECK (criterio_tipo IN (
    'lessons_completed','modules_completed','tracks_completed',
    'quizzes_passed','perfect_quiz','streak_days','total_xp',
    'study_time_hours','first_lesson','first_track','all_tracks',
    'sop_executions','login_streak','manual'
  )),
  criterio_valor INT DEFAULT 1,
  xp_reward INT DEFAULT 25,
  is_secret BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  raridade VARCHAR(20) DEFAULT 'comum' CHECK (raridade IN ('comum','incomum','raro','epico','lendario')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

-- 17. Badges conquistados por colaboradores
CREATE TABLE IF NOT EXISTS mt_gamification_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  badge_id UUID NOT NULL REFERENCES mt_gamification_badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_user_badges_user ON mt_gamification_user_badges(user_id);

-- 18. Cache de leaderboard
CREATE TABLE IF NOT EXISTS mt_gamification_leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),
  periodo VARCHAR(20) NOT NULL CHECK (periodo IN ('semanal','mensal','total')),
  user_id UUID NOT NULL REFERENCES mt_users(id),
  user_name VARCHAR(255),
  user_avatar_url TEXT,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  rank_name VARCHAR(50),
  posicao INT,
  badges_count INT DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, franchise_id, periodo, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mt_gamification_leaderboard_tenant ON mt_gamification_leaderboard_cache(tenant_id, periodo, posicao);

-- ============================================================
-- RLS para todas as tabelas de Treinamento + Gamificação
-- ============================================================

ALTER TABLE mt_training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_training_user_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_gamification_leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para Training Tracks (admin gerencia, colaborador visualiza publicados)
CREATE POLICY "mt_training_tracks_select" ON mt_training_tracks FOR SELECT USING (
  is_platform_admin() OR tenant_id = current_tenant_id()
);
CREATE POLICY "mt_training_tracks_insert" ON mt_training_tracks FOR INSERT WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_training_tracks_update" ON mt_training_tracks FOR UPDATE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
CREATE POLICY "mt_training_tracks_delete" ON mt_training_tracks FOR DELETE USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

-- Políticas genéricas para tabelas filhas do training (select: tenant, write: admin)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mt_training_modules','mt_training_lessons','mt_training_materials',
    'mt_training_quizzes','mt_training_quiz_questions','mt_training_quiz_options',
    'mt_training_certificates'
  ]) LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete" ON %s FOR DELETE USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
  END LOOP;
END $$;

-- Políticas para tabelas de progresso do colaborador (user vê/edita próprios dados)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mt_training_enrollments','mt_training_lesson_progress',
    'mt_training_quiz_attempts','mt_training_user_materials'
  ]) LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
  END LOOP;
END $$;

-- Políticas para gamificação
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mt_gamification_profiles','mt_gamification_xp_log',
    'mt_gamification_levels','mt_gamification_badges',
    'mt_gamification_user_badges','mt_gamification_leaderboard_cache'
  ]) LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (is_platform_admin() OR tenant_id = current_tenant_id())', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- Registrar módulo treinamentos em mt_modules
-- ============================================================

INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES ('treinamentos', 'Treinamentos', 'LMS com gamificação para capacitação de equipes', 'GraduationCap', 'rh', 26, false, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Habilitar para todos os tenants
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'treinamentos'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);
