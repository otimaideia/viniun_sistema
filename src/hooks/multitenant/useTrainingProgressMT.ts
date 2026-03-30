// =============================================================================
// USE TRAINING PROGRESS MT - Hook Multi-Tenant para Progresso de Treinamento
// =============================================================================
//
// Hooks para:
// - useMyEnrollmentsMT: trilhas do usuário com progresso
// - useAllEnrollmentsMT: todas as matrículas (admin)
// - useEnrollMT: inscrever-se em uma trilha
// - useTrackProgressMT: progresso detalhado por trilha
// - useCompleteLessonMT: marcar aula como concluída
// - useLessonProgressMT: progresso por aula (video position, status, tempo)
// - useSubmitQuizMT: submeter quiz e calcular nota
// - useRecalculateEnrollmentProgress: recalcular % de progresso
// - useTrainingStatsMT: stats para admin dashboard
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTTrainingEnrollment,
  MTTrainingLessonProgress,
  MTTrainingQuizAttempt,
  QuizRespostas,
  EnrollmentStatus,
  LessonProgressStatus,
} from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ENROLLMENTS_KEY = 'mt-training-enrollments';
const PROGRESS_KEY = 'mt-training-lesson-progress';
const QUIZ_ATTEMPTS_KEY = 'mt-training-quiz-attempts';

// -----------------------------------------------------------------------------
// Hook: Minhas Matrículas (Colaborador)
// -----------------------------------------------------------------------------

export function useMyEnrollmentsMT(statusFilter?: EnrollmentStatus) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [ENROLLMENTS_KEY, 'mine', tenant?.id, user?.id, statusFilter],
    queryFn: async (): Promise<MTTrainingEnrollment[]> => {
      if (!tenant || !user) return [];

      let q = (supabase.from('mt_training_enrollments') as any)
        .select(`
          *,
          track:mt_training_tracks(
            id, titulo, descricao, thumbnail_url, cor, nivel, total_xp, is_sequencial,
            duracao_estimada_horas, is_obrigatoria, codigo, icone,
            modules:mt_training_modules(count)
          )
        `)
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (statusFilter) q = q.eq('status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((e: any) => ({
        ...e,
        track: e.track
          ? {
              ...e.track,
              modules_count: e.track.modules?.[0]?.count ?? 0,
              modules: undefined,
            }
          : null,
      })) as MTTrainingEnrollment[];
    },
    enabled: !isTenantLoading && !!tenant && !!user,
  });

  return {
    enrollments: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Todas as Matrículas (Admin)
// -----------------------------------------------------------------------------

export function useAllEnrollmentsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [ENROLLMENTS_KEY, 'all', tenant?.id, franchise?.id, accessLevel],
    queryFn: async (): Promise<MTTrainingEnrollment[]> => {
      if (!tenant && accessLevel !== 'platform') return [];

      let q = (supabase.from('mt_training_enrollments') as any)
        .select(`
          *,
          track:mt_training_tracks(id, titulo, nivel, cor),
          user:mt_users(id, nome)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTTrainingEnrollment[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    enrollments: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Matricular em Trilha
// -----------------------------------------------------------------------------

export function useEnrollMT() {
  const { tenant, franchise, user } = useTenantContext();
  const queryClient = useQueryClient();

  const enroll = useMutation({
    mutationFn: async (trackId: string): Promise<MTTrainingEnrollment> => {
      if (!tenant || !user) throw new Error('Contexto incompleto.');

      // Check if already enrolled
      const { data: existing } = await (supabase.from('mt_training_enrollments') as any)
        .select('id, status')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .limit(1);

      if (existing && existing.length > 0) {
        const enrollment = existing[0];
        if (enrollment.status === 'ativo' || enrollment.status === 'concluido') {
          throw new Error('Você já está inscrito nesta trilha.');
        }

        // Reactivate if paused/cancelled/expired
        const { data: reactivated, error: reErr } = await (supabase.from('mt_training_enrollments') as any)
          .update({
            status: 'ativo',
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id)
          .select()
          .single();

        if (reErr) throw reErr;
        return reactivated as MTTrainingEnrollment;
      }

      // Check prerequisites
      const { data: track } = await (supabase.from('mt_training_tracks') as any)
        .select('prerequisite_track_id')
        .eq('id', trackId)
        .single();

      if (track?.prerequisite_track_id) {
        const { data: prereqEnrollment } = await (supabase.from('mt_training_enrollments') as any)
          .select('id, status')
          .eq('user_id', user.id)
          .eq('track_id', track.prerequisite_track_id)
          .eq('status', 'concluido')
          .limit(1);

        if (!prereqEnrollment || prereqEnrollment.length === 0) {
          throw new Error('Você precisa concluir a trilha pré-requisito antes.');
        }
      }

      const { data, error } = await (supabase.from('mt_training_enrollments') as any)
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          user_id: user.id,
          track_id: trackId,
          status: 'ativo',
          progresso_pct: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingEnrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success('Matriculado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao matricular.');
    },
  });

  const unenroll = useMutation({
    mutationFn: async (trackId: string): Promise<void> => {
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await (supabase.from('mt_training_enrollments') as any)
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .eq('status', 'ativo');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
      toast.success('Inscrição cancelada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cancelar inscrição.');
    },
  });

  return {
    enroll,
    unenroll,
    isEnrolling: enroll.isPending,
    isUnenrolling: unenroll.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Progresso do Colaborador em uma Trilha
// -----------------------------------------------------------------------------

export function useTrackProgressMT(trackId?: string) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const enrollmentQuery = useQuery({
    queryKey: [ENROLLMENTS_KEY, 'track', trackId, user?.id],
    queryFn: async (): Promise<MTTrainingEnrollment | null> => {
      if (!trackId || !user || !tenant) return null;

      const { data, error } = await (supabase.from('mt_training_enrollments') as any)
        .select('*')
        .eq('track_id', trackId)
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as MTTrainingEnrollment | null;
    },
    enabled: !!trackId && !!user && !isTenantLoading && !!tenant,
  });

  const lessonsProgressQuery = useQuery({
    queryKey: [PROGRESS_KEY, 'track', trackId, user?.id],
    queryFn: async (): Promise<MTTrainingLessonProgress[]> => {
      if (!trackId || !user || !tenant) return [];

      // Get all lesson IDs for this track via modules
      const { data: modules, error: mErr } = await (supabase.from('mt_training_modules') as any)
        .select('id')
        .eq('track_id', trackId)
        .is('deleted_at', null);
      if (mErr) throw mErr;

      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map((m: any) => m.id);
      const { data: lessons, error: lErr } = await (supabase.from('mt_training_lessons') as any)
        .select('id')
        .in('module_id', moduleIds)
        .is('deleted_at', null);
      if (lErr) throw lErr;

      if (!lessons || lessons.length === 0) return [];

      const lessonIds = lessons.map((l: any) => l.id);
      const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return (data || []) as MTTrainingLessonProgress[];
    },
    enabled: !!trackId && !!user && !isTenantLoading && !!tenant,
  });

  return {
    enrollment: enrollmentQuery.data ?? null,
    lessonsProgress: lessonsProgressQuery.data ?? [],
    isLoading: enrollmentQuery.isLoading || lessonsProgressQuery.isLoading || isTenantLoading,
    refetch: () => {
      enrollmentQuery.refetch();
      lessonsProgressQuery.refetch();
    },
  };
}

// -----------------------------------------------------------------------------
// Hook: Marcar Aula como Concluída
// -----------------------------------------------------------------------------

export function useCompleteLessonMT() {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string): Promise<MTTrainingLessonProgress> => {
      if (!tenant || !user) throw new Error('Contexto incompleto.');

      // Upsert progress
      const { data: existing } = await (supabase.from('mt_training_lesson_progress') as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing) {
        const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
          .update({
            status: 'concluido' as LessonProgressStatus,
            progresso_pct: 100,
            completed_at: now,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as MTTrainingLessonProgress;
      } else {
        const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            lesson_id: lessonId,
            status: 'concluido' as LessonProgressStatus,
            progresso_pct: 100,
            video_position_sec: 0,
            tempo_gasto_sec: 0,
            first_access_at: now,
            completed_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        return data as MTTrainingLessonProgress;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROGRESS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
      toast.success('Aula marcada como concluída!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao marcar aula.');
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Progresso detalhado de uma Aula (video position, tempo, etc)
// -----------------------------------------------------------------------------

export function useLessonProgressMT(lessonId?: string) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [PROGRESS_KEY, 'lesson', lessonId, user?.id],
    queryFn: async (): Promise<MTTrainingLessonProgress | null> => {
      if (!lessonId || !user?.id) return null;

      const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as MTTrainingLessonProgress | null;
    },
    enabled: !!lessonId && !!user?.id && !isTenantLoading,
  });

  // Update progress (upsert pattern)
  const updateProgress = useMutation({
    mutationFn: async (updates: {
      status?: LessonProgressStatus;
      progresso_pct?: number;
      video_position_sec?: number;
      tempo_gasto_sec?: number;
    }): Promise<MTTrainingLessonProgress> => {
      if (!lessonId || !user?.id || !tenant?.id) {
        throw new Error('Dados insuficientes para atualizar progresso.');
      }

      const now = new Date().toISOString();
      const existing = query.data;

      if (existing) {
        const updateData: any = {
          ...updates,
          updated_at: now,
        };

        // Set completed_at if status changed to concluido
        if (updates.status === 'concluido' && existing.status !== 'concluido') {
          updateData.completed_at = now;
          updateData.progresso_pct = 100;
        }

        // Accumulate tempo_gasto_sec (add to existing, don't replace)
        if (updates.tempo_gasto_sec) {
          updateData.tempo_gasto_sec = existing.tempo_gasto_sec + updates.tempo_gasto_sec;
        }

        const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as MTTrainingLessonProgress;
      } else {
        // Create new progress record
        const { data, error } = await (supabase.from('mt_training_lesson_progress') as any)
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            lesson_id: lessonId,
            status: updates.status || 'em_andamento',
            progresso_pct: updates.progresso_pct ?? 0,
            video_position_sec: updates.video_position_sec ?? 0,
            tempo_gasto_sec: updates.tempo_gasto_sec ?? 0,
            first_access_at: now,
            completed_at: updates.status === 'concluido' ? now : null,
          })
          .select()
          .single();

        if (error) throw error;
        return data as MTTrainingLessonProgress;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROGRESS_KEY, 'lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
    },
  });

  // Shortcut: save video position (silent, no toast)
  const saveVideoPosition = useMutation({
    mutationFn: async (positionSec: number) => {
      return updateProgress.mutateAsync({
        video_position_sec: positionSec,
        status: 'em_andamento',
      });
    },
  });

  // Shortcut: complete lesson
  const completeLesson = useMutation({
    mutationFn: async () => {
      return updateProgress.mutateAsync({
        status: 'concluido',
        progresso_pct: 100,
      });
    },
    onSuccess: () => {
      toast.success('Aula concluída!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao concluir aula.');
    },
  });

  return {
    progress: query.data ?? null,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    updateProgress,
    saveVideoPosition,
    completeLesson,

    isUpdating: updateProgress.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Submeter Quiz e Calcular Nota
// -----------------------------------------------------------------------------

export function useSubmitQuizMT(quizId?: string) {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();

  // Previous attempts
  const attemptsQuery = useQuery({
    queryKey: [QUIZ_ATTEMPTS_KEY, quizId, user?.id],
    queryFn: async (): Promise<MTTrainingQuizAttempt[]> => {
      if (!quizId || !user?.id) return [];

      const { data, error } = await (supabase.from('mt_training_quiz_attempts') as any)
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTTrainingQuizAttempt[];
    },
    enabled: !!quizId && !!user?.id,
  });

  // Submit quiz
  const submitQuiz = useMutation({
    mutationFn: async ({
      respostas,
      startedAt,
    }: {
      respostas: QuizRespostas;
      startedAt: string;
    }): Promise<MTTrainingQuizAttempt> => {
      if (!quizId || !user?.id || !tenant?.id) {
        throw new Error('Dados insuficientes para submeter quiz.');
      }

      // Fetch quiz with questions and options to calculate score
      const { data: quiz, error: quizError } = await (supabase.from('mt_training_quizzes') as any)
        .select(`
          *,
          questions:mt_training_quiz_questions(
            *,
            options:mt_training_quiz_options(*)
          )
        `)
        .eq('id', quizId)
        .is('deleted_at', null)
        .single();

      if (quizError) throw quizError;
      if (!quiz) throw new Error('Quiz não encontrado.');

      // Check attempt limit
      const previousAttempts = attemptsQuery.data || [];
      if (quiz.tentativas_max > 0 && previousAttempts.length >= quiz.tentativas_max) {
        throw new Error(`Limite de ${quiz.tentativas_max} tentativas atingido.`);
      }

      // Calculate score
      const activeQuestions = (quiz.questions || []).filter((q: any) => !q.deleted_at);
      let acertos = 0;
      let totalPontos = 0;
      let pontosObtidos = 0;

      const respostasComputadas: QuizRespostas = {};

      for (const question of activeQuestions) {
        totalPontos += question.pontos || 10;
        const resposta = respostas[question.id];

        if (!resposta) {
          respostasComputadas[question.id] = {
            is_correct: false,
            pontos_obtidos: 0,
          };
          continue;
        }

        let isCorrect = false;

        if (question.tipo === 'multipla_escolha' || question.tipo === 'verdadeiro_falso') {
          const correctOption = (question.options || []).find((o: any) => o.is_correta);
          isCorrect = !!correctOption && resposta.selected_option_id === correctOption.id;
        }
        // Dissertativa needs manual grading - leave is_correct as false

        if (isCorrect) {
          acertos++;
          pontosObtidos += question.pontos || 10;
        }

        respostasComputadas[question.id] = {
          ...resposta,
          is_correct: isCorrect,
          pontos_obtidos: isCorrect ? (question.pontos || 10) : 0,
        };
      }

      const nota = totalPontos > 0 ? (pontosObtidos / totalPontos) * 100 : 0;
      const aprovado = nota >= (quiz.nota_minima || 70);
      const now = new Date().toISOString();

      // Calculate time spent
      const tempoGasto = Math.round(
        (new Date(now).getTime() - new Date(startedAt).getTime()) / 1000
      );

      // Save attempt
      const { data: attempt, error: attemptError } = await (supabase.from('mt_training_quiz_attempts') as any)
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          quiz_id: quizId,
          nota: Math.round(nota * 100) / 100,
          acertos,
          total_questoes: activeQuestions.length,
          aprovado,
          tempo_gasto_sec: tempoGasto,
          respostas: respostasComputadas,
          started_at: startedAt,
          completed_at: now,
        })
        .select()
        .single();

      if (attemptError) throw attemptError;
      return attempt as MTTrainingQuizAttempt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUIZ_ATTEMPTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROGRESS_KEY] });

      if (data.aprovado) {
        toast.success(`Quiz aprovado! Nota: ${data.nota?.toFixed(1)}%`);
      } else {
        toast.error(`Quiz reprovado. Nota: ${data.nota?.toFixed(1)}%`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao submeter quiz.');
    },
  });

  return {
    attempts: attemptsQuery.data ?? [],
    bestAttempt: attemptsQuery.data?.reduce<MTTrainingQuizAttempt | null>((best, attempt) => {
      if (!best || (attempt.nota ?? 0) > (best.nota ?? 0)) return attempt;
      return best;
    }, null) ?? null,
    attemptsCount: attemptsQuery.data?.length ?? 0,
    isLoadingAttempts: attemptsQuery.isLoading,

    submitQuiz,
    isSubmitting: submitQuiz.isPending,
    lastResult: submitQuiz.data ?? null,
  };
}

// -----------------------------------------------------------------------------
// Hook: Recalcular Progresso de Enrollment
// -----------------------------------------------------------------------------

export function useRecalculateEnrollmentProgress() {
  const { user } = useTenantContext();
  const queryClient = useQueryClient();

  const recalculate = useMutation({
    mutationFn: async (trackId: string): Promise<void> => {
      if (!user?.id) throw new Error('Usuário não autenticado.');

      // Get all modules and lessons for this track
      const { data: modules } = await (supabase.from('mt_training_modules') as any)
        .select('id')
        .eq('track_id', trackId)
        .is('deleted_at', null);

      if (!modules || modules.length === 0) return;

      const moduleIds = modules.map((m: any) => m.id);

      // Get all lessons
      const { data: lessons } = await (supabase.from('mt_training_lessons') as any)
        .select('id')
        .in('module_id', moduleIds)
        .is('deleted_at', null);

      if (!lessons || lessons.length === 0) return;

      const lessonIds = lessons.map((l: any) => l.id);
      const totalLessons = lessonIds.length;

      // Get completed lessons for this user
      const { data: completed } = await (supabase.from('mt_training_lesson_progress') as any)
        .select('id')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
        .eq('status', 'concluido');

      const completedCount = completed?.length ?? 0;
      const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      // Update enrollment
      const updateData: any = {
        progresso_pct: progressPct,
        updated_at: new Date().toISOString(),
      };

      if (progressPct >= 100) {
        updateData.status = 'concluido';
        updateData.completed_at = new Date().toISOString();
      }

      await (supabase.from('mt_training_enrollments') as any)
        .update(updateData)
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .eq('status', 'ativo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENROLLMENTS_KEY] });
    },
  });

  return { recalculate };
}

// -----------------------------------------------------------------------------
// Hook: Stats de Treinamento (Admin Dashboard)
// -----------------------------------------------------------------------------

export function useTrainingStatsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-training-stats', tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') return null;

      const tenantFilter = accessLevel !== 'platform' && tenant ? tenant.id : null;

      // Tracks count
      let tracksQ = (supabase.from('mt_training_tracks') as any)
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      if (tenantFilter) tracksQ = tracksQ.eq('tenant_id', tenantFilter);
      const { count: totalTracks } = await tracksQ;

      // Enrollments count
      let enrollQ = (supabase.from('mt_training_enrollments') as any)
        .select('id', { count: 'exact', head: true });
      if (tenantFilter) enrollQ = enrollQ.eq('tenant_id', tenantFilter);
      const { count: totalEnrollments } = await enrollQ;

      // Completed enrollments
      let completedQ = (supabase.from('mt_training_enrollments') as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'concluido');
      if (tenantFilter) completedQ = completedQ.eq('tenant_id', tenantFilter);
      const { count: totalCompleted } = await completedQ;

      // Certificates
      let certQ = (supabase.from('mt_training_enrollments') as any)
        .select('id', { count: 'exact', head: true })
        .not('certificate_issued_at', 'is', null);
      if (tenantFilter) certQ = certQ.eq('tenant_id', tenantFilter);
      const { count: totalCertificates } = await certQ;

      const completionRate = totalEnrollments && totalEnrollments > 0
        ? Math.round(((totalCompleted || 0) / totalEnrollments) * 100)
        : 0;

      return {
        totalTracks: totalTracks || 0,
        totalEnrollments: totalEnrollments || 0,
        totalCompleted: totalCompleted || 0,
        totalCertificates: totalCertificates || 0,
        completionRate,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading || isTenantLoading,
  };
}

export default useMyEnrollmentsMT;
