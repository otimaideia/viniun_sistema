-- Migration: 20260310_003_mt_gamification_seed.sql
-- Purpose: Seed de níveis de gamificação e badges padrão para todos os tenants
-- Author: Claude + Danilo
-- Date: 2026-03-10

-- ============================================================
-- SEED: Níveis de Gamificação (10 níveis por tenant)
-- ============================================================

INSERT INTO mt_gamification_levels (tenant_id, level, nome, xp_required, icone, cor, beneficio)
SELECT t.id, l.level, l.nome, l.xp_required, l.icone, l.cor, l.beneficio
FROM mt_tenants t
CROSS JOIN (VALUES
  (1,  'Iniciante',     0,     'Circle',      '#9E9E9E', 'Acesso às trilhas básicas'),
  (2,  'Aprendiz',      100,   'Sprout',      '#8BC34A', 'Pode ver o leaderboard'),
  (3,  'Praticante',    300,   'BookOpen',     '#03A9F4', 'Pode baixar certificados'),
  (4,  'Profissional',  700,   'Briefcase',    '#9C27B0', 'Prioridade em novas trilhas'),
  (5,  'Especialista',  1500,  'Star',         '#FF9800', 'Destaque no ranking'),
  (6,  'Expert',        3000,  'Award',        '#F44336', 'Badge Mentor'),
  (7,  'Mestre',        5000,  'Crown',        '#FFD700', 'Frame customizado no avatar'),
  (8,  'Grão-Mestre',   8000,  'Gem',          '#E91E63', 'Reconhecimento especial'),
  (9,  'Lenda',         12000, 'Flame',        '#00BCD4', 'Hall da fama'),
  (10, 'Supremo',       20000, 'Zap',          '#FF4081', 'Conquista máxima')
) AS l(level, nome, xp_required, icone, cor, beneficio)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_gamification_levels gl
  WHERE gl.tenant_id = t.id AND gl.level = l.level
);

-- ============================================================
-- SEED: Badges/Conquistas (20 badges por tenant)
-- ============================================================

INSERT INTO mt_gamification_badges (tenant_id, codigo, nome, descricao, icone_emoji, categoria, criterio_tipo, criterio_valor, xp_reward, is_secret, raridade)
SELECT t.id, b.codigo, b.nome, b.descricao, b.icone_emoji, b.categoria, b.criterio_tipo, b.criterio_valor, b.xp_reward, b.is_secret, b.raridade
FROM mt_tenants t
CROSS JOIN (VALUES
  -- Aprendizado
  ('primeiro_passo',    'Primeiro Passo',        'Completou sua primeira aula',           '👣', 'aprendizado',  'first_lesson',        1,    25,  false, 'comum'),
  ('desbravador',       'Desbravador',           'Completou 10 aulas',                    '🗺️', 'aprendizado',  'lessons_completed',   10,   50,  false, 'comum'),
  ('estudioso',         'Estudioso',             'Completou 50 aulas',                    '📚', 'aprendizado',  'lessons_completed',   50,   100, false, 'incomum'),
  ('devorador',         'Devorador de Conteúdo', 'Completou 100 aulas',                   '🔥', 'aprendizado',  'lessons_completed',   100,  150, false, 'raro'),
  ('mestre_saber',      'Mestre do Saber',       'Completou 250 aulas',                   '🧠', 'aprendizado',  'lessons_completed',   250,  200, false, 'epico'),

  -- Consistência
  ('constante',         'Constante',             'Estudou 3 dias consecutivos',           '📅', 'consistencia', 'streak_days',         3,    25,  false, 'comum'),
  ('dedicado',          'Dedicado',              'Estudou 7 dias consecutivos',           '💪', 'consistencia', 'streak_days',         7,    75,  false, 'incomum'),
  ('incansavel',        'Incansável',            'Estudou 14 dias consecutivos',          '🏃', 'consistencia', 'streak_days',         14,   125, false, 'raro'),
  ('disciplinado',      'Disciplinado',          'Estudou 30 dias consecutivos',          '🎯', 'consistencia', 'streak_days',         30,   200, false, 'epico'),
  ('lendario_streak',   'Lendário',              'Estudou 60 dias consecutivos',          '⚡', 'consistencia', 'streak_days',         60,   500, false, 'lendario'),

  -- Excelência
  ('nota_10',           'Nota 10',               'Tirou nota máxima em um quiz',          '💯', 'excelencia',   'perfect_quiz',        1,    75,  false, 'incomum'),
  ('perfeccionista',    'Perfeccionista',         'Tirou nota máxima em 5 quizzes',        '✨', 'excelencia',   'perfect_quiz',        5,    150, false, 'raro'),
  ('genio',             'Gênio',                 'Tirou nota máxima em 10 quizzes',        '🏆', 'excelencia',   'perfect_quiz',        10,   250, false, 'epico'),

  -- Marcos
  ('primeira_trilha',   'Primeira Trilha',       'Completou sua primeira trilha',         '🛤️', 'marco',        'first_track',         1,    50,  false, 'comum'),
  ('trilheiro',         'Trilheiro',             'Completou 3 trilhas',                   '🧭', 'marco',        'tracks_completed',    3,    100, false, 'incomum'),
  ('completo',          'Completo',              'Completou todas as trilhas disponíveis', '🌟', 'marco',        'all_tracks',          1,    500, false, 'lendario'),
  ('mil_xp',            '1000 XP',               'Acumulou 1000 pontos de experiência',   '💎', 'marco',        'total_xp',            1000, 50,  false, 'incomum'),
  ('cinco_mil_xp',      '5000 XP',               'Acumulou 5000 pontos de experiência',   '👑', 'marco',        'total_xp',            5000, 100, false, 'raro'),

  -- Especial
  ('colaborador_sop',   'Colaborador',           'Executou 10 procedimentos (SOPs)',       '📋', 'especial',     'sop_executions',      10,   75,  false, 'incomum'),
  ('madrugador',        'Madrugador',            'Estudou antes das 7h da manhã',          '🌅', 'especial',     'manual',              1,    100, true,  'raro')
) AS b(codigo, nome, descricao, icone_emoji, categoria, criterio_tipo, criterio_valor, xp_reward, is_secret, raridade)
WHERE NOT EXISTS (
  SELECT 1 FROM mt_gamification_badges gb
  WHERE gb.tenant_id = t.id AND gb.codigo = b.codigo
);
