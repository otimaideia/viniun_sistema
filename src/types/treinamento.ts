// Tipos para o módulo de Treinamentos (LMS) + Gamificação

// ============================================================
// LMS Core
// ============================================================

export type TrackNivel = 'iniciante' | 'intermediario' | 'avancado' | 'expert';
export type LessonTipo = 'video' | 'documento' | 'texto' | 'link_externo' | 'embed';
export type VideoProvider = 'supabase' | 'youtube' | 'vimeo' | 'outro';
export type MaterialTipo = 'pdf' | 'imagem' | 'planilha' | 'apresentacao' | 'link' | 'outro';
export type QuizQuestionTipo = 'multipla_escolha' | 'verdadeiro_falso' | 'dissertativa';
export type EnrollmentStatus = 'ativo' | 'concluido' | 'pausado' | 'cancelado' | 'expirado';
export type LessonProgressStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

export interface MTTrainingTrack {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  codigo: string;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
  cor: string | null;
  icone: string | null;
  nivel: TrackNivel;
  duracao_estimada_horas: number | null;
  is_obrigatoria: boolean;
  is_sequencial: boolean;
  is_published: boolean;
  published_at: string | null;
  total_xp: number;
  roles_alvo: string[] | null;
  prerequisite_track_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  modules?: MTTrainingModule[];
  modules_count?: number;
  lessons_count?: number;
  enrolled_count?: number;
  enrollment?: MTTrainingEnrollment;
}

export interface MTTrainingModule {
  id: string;
  tenant_id: string;
  track_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
  duracao_estimada_min: number | null;
  is_published: boolean;
  xp_completar: number;
  nota_minima: number;
  has_quiz: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  lessons?: MTTrainingLesson[];
  lessons_count?: number;
  quiz?: MTTrainingQuiz;
  track?: MTTrainingTrack;
}

export interface MTTrainingLesson {
  id: string;
  tenant_id: string;
  module_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  tipo: LessonTipo;
  conteudo_html: string | null;
  video_url: string | null;
  video_provider: VideoProvider | null;
  video_duration_sec: number | null;
  documento_url: string | null;
  documento_nome: string | null;
  link_externo: string | null;
  embed_code: string | null;
  thumbnail_url: string | null;
  duracao_estimada_min: number | null;
  is_published: boolean;
  xp_completar: number;
  xp_primeiro_acesso: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  materials?: MTTrainingMaterial[];
  progress?: MTTrainingLessonProgress;
  module?: MTTrainingModule;
}

export interface MTTrainingMaterial {
  id: string;
  tenant_id: string;
  lesson_id: string;
  titulo: string;
  tipo: MaterialTipo;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  ordem: number;
  created_at: string;
  deleted_at: string | null;
}

export interface MTTrainingQuiz {
  id: string;
  tenant_id: string;
  module_id: string;
  titulo: string;
  descricao: string | null;
  tempo_limite_min: number | null;
  tentativas_max: number;
  nota_minima: number;
  mostrar_respostas: boolean;
  embaralhar_questoes: boolean;
  embaralhar_alternativas: boolean;
  xp_aprovado: number;
  xp_nota_maxima: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  questions?: MTTrainingQuizQuestion[];
  questions_count?: number;
}

export interface MTTrainingQuizQuestion {
  id: string;
  tenant_id: string;
  quiz_id: string;
  ordem: number;
  tipo: QuizQuestionTipo;
  enunciado: string;
  imagem_url: string | null;
  pontos: number;
  explicacao: string | null;
  created_at: string;
  deleted_at: string | null;
  // Joins
  options?: MTTrainingQuizOption[];
}

export interface MTTrainingQuizOption {
  id: string;
  tenant_id: string;
  question_id: string;
  ordem: number;
  texto: string;
  is_correta: boolean;
  created_at: string;
}

export interface MTTrainingCertificate {
  id: string;
  tenant_id: string;
  track_id: string | null;
  titulo: string;
  template_html: string | null;
  background_url: string | null;
  assinatura_url: string | null;
  assinante_nome: string | null;
  assinante_cargo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// Progresso do Colaborador
// ============================================================

export interface MTTrainingEnrollment {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  track_id: string;
  status: EnrollmentStatus;
  progresso_pct: number;
  started_at: string;
  completed_at: string | null;
  certificate_id: string | null;
  certificate_code: string | null;
  certificate_issued_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  track?: MTTrainingTrack;
  user?: { id: string; nome: string };
}

export interface MTTrainingLessonProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  progresso_pct: number;
  video_position_sec: number;
  tempo_gasto_sec: number;
  first_access_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MTTrainingQuizAttempt {
  id: string;
  tenant_id: string;
  user_id: string;
  quiz_id: string;
  nota: number | null;
  acertos: number;
  total_questoes: number;
  aprovado: boolean;
  tempo_gasto_sec: number | null;
  respostas: QuizRespostas | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface QuizRespostas {
  [questionId: string]: {
    selected_option_id?: string;
    text_answer?: string;
    is_correct?: boolean;
    pontos_obtidos?: number;
  };
}

// ============================================================
// Gamificação
// ============================================================

export type XPSource =
  | 'lesson_complete'
  | 'lesson_first_access'
  | 'module_complete'
  | 'track_complete'
  | 'quiz_pass'
  | 'quiz_perfect'
  | 'streak_bonus'
  | 'badge_earned'
  | 'daily_login'
  | 'sop_execution'
  | 'faq_created'
  | 'manual_admin'
  | 'checklist_item'
  | 'checklist_daily'
  | 'checklist_streak';

export type BadgeCategoria = 'aprendizado' | 'consistencia' | 'excelencia' | 'social' | 'marco' | 'especial';
export type BadgeRaridade = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type LeaderboardPeriodo = 'semanal' | 'mensal' | 'total';

export interface MTGamificationProfile {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string;
  total_xp: number;
  level: number;
  rank_name: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_lessons_completed: number;
  total_modules_completed: number;
  total_tracks_completed: number;
  total_quizzes_passed: number;
  total_perfect_quizzes: number;
  total_certificates: number;
  total_study_time_min: number;
  weekly_xp: number;
  monthly_xp: number;
  created_at: string;
  updated_at: string;
  // Joins
  user?: { id: string; nome: string; avatar_url?: string };
  current_level?: MTGamificationLevel;
  next_level?: MTGamificationLevel;
  badges?: MTGamificationUserBadge[];
}

export interface MTGamificationXPLog {
  id: string;
  tenant_id: string;
  user_id: string;
  amount: number;
  source: XPSource;
  source_id: string | null;
  descricao: string | null;
  created_at: string;
}

export interface MTGamificationLevel {
  id: string;
  tenant_id: string;
  level: number;
  nome: string;
  xp_required: number;
  icone: string | null;
  cor: string | null;
  beneficio: string | null;
  created_at: string;
}

export interface MTGamificationBadge {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone_url: string | null;
  icone_emoji: string | null;
  categoria: BadgeCategoria;
  criterio_tipo: string;
  criterio_valor: number;
  xp_reward: number;
  is_secret: boolean;
  is_active: boolean;
  raridade: BadgeRaridade;
  created_at: string;
  // Computed
  earned?: boolean;
  earned_at?: string;
}

export interface MTGamificationUserBadge {
  id: string;
  tenant_id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  notified: boolean;
  // Joins
  badge?: MTGamificationBadge;
}

export interface MTLeaderboardEntry {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  periodo: LeaderboardPeriodo;
  user_id: string;
  user_name: string | null;
  user_avatar_url: string | null;
  xp: number;
  level: number;
  rank_name: string | null;
  posicao: number | null;
  badges_count: number;
  calculated_at: string;
}

// ============================================================
// Constantes e Configurações
// ============================================================

export const XP_REWARDS: Record<XPSource, number> = {
  lesson_first_access: 5,
  lesson_complete: 10,
  module_complete: 50,
  track_complete: 200,
  quiz_pass: 100,
  quiz_perfect: 50,
  streak_bonus: 50,
  badge_earned: 25,
  daily_login: 5,
  sop_execution: 15,
  faq_created: 10,
  manual_admin: 0,
  checklist_item: 5,
  checklist_daily: 25,
  checklist_streak: 50,
};

export const XP_SOURCE_LABELS: Record<XPSource, string> = {
  lesson_first_access: 'Primeiro acesso à aula',
  lesson_complete: 'Aula concluída',
  module_complete: 'Módulo concluído',
  track_complete: 'Trilha concluída',
  quiz_pass: 'Quiz aprovado',
  quiz_perfect: 'Quiz nota máxima',
  streak_bonus: 'Bônus de streak',
  badge_earned: 'Badge conquistado',
  daily_login: 'Login diário',
  sop_execution: 'SOP executado',
  faq_created: 'FAQ criada',
  manual_admin: 'Ajuste manual',
  checklist_item: 'Item do checklist concluído',
  checklist_daily: 'Checklist diário concluído',
  checklist_streak: 'Streak de checklist',
};

export const BADGE_RARIDADE_CONFIG: Record<BadgeRaridade, { label: string; color: string; bgColor: string; glowColor: string }> = {
  comum: { label: 'Comum', color: 'text-gray-600', bgColor: 'bg-gray-100', glowColor: 'shadow-gray-300' },
  incomum: { label: 'Incomum', color: 'text-green-600', bgColor: 'bg-green-100', glowColor: 'shadow-green-300' },
  raro: { label: 'Raro', color: 'text-blue-600', bgColor: 'bg-blue-100', glowColor: 'shadow-blue-300' },
  epico: { label: 'Épico', color: 'text-purple-600', bgColor: 'bg-purple-100', glowColor: 'shadow-purple-300' },
  lendario: { label: 'Lendário', color: 'text-yellow-600', bgColor: 'bg-yellow-50', glowColor: 'shadow-yellow-400' },
};

export const TRACK_NIVEL_CONFIG: Record<TrackNivel, { label: string; color: string; bgColor: string }> = {
  iniciante: { label: 'Iniciante', color: 'text-green-600', bgColor: 'bg-green-100' },
  intermediario: { label: 'Intermediário', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  avancado: { label: 'Avançado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  expert: { label: 'Expert', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const LESSON_TIPO_CONFIG: Record<LessonTipo, { label: string; icon: string }> = {
  video: { label: 'Vídeo', icon: 'Play' },
  documento: { label: 'Documento', icon: 'FileText' },
  texto: { label: 'Texto', icon: 'AlignLeft' },
  link_externo: { label: 'Link Externo', icon: 'ExternalLink' },
  embed: { label: 'Conteúdo Incorporado', icon: 'Code' },
};
