// =============================================================================
// USE TRAINING QUIZ MT - Hook Multi-Tenant para Quizzes de Treinamento
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTTrainingQuiz,
  MTTrainingQuizQuestion,
  MTTrainingQuizOption,
  MTTrainingQuizAttempt,
  QuizQuestionTipo,
  QuizRespostas,
} from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface QuizCreate {
  module_id: string;
  titulo: string;
  descricao?: string;
  tempo_limite_min?: number;
  tentativas_max?: number;
  nota_minima?: number;
  mostrar_respostas?: boolean;
  embaralhar_questoes?: boolean;
  embaralhar_alternativas?: boolean;
  xp_aprovado?: number;
  xp_nota_maxima?: number;
  tenant_id?: string;
}

export interface QuizUpdate extends Partial<Omit<QuizCreate, 'module_id'>> {
  id: string;
}

export interface QuestionCreate {
  quiz_id: string;
  tipo?: QuizQuestionTipo;
  enunciado: string;
  imagem_url?: string;
  pontos?: number;
  explicacao?: string;
  ordem?: number;
  tenant_id?: string;
  // Options to create alongside the question
  options?: OptionCreate[];
}

export interface QuestionUpdate extends Partial<Omit<QuestionCreate, 'quiz_id' | 'options'>> {
  id: string;
}

export interface OptionCreate {
  question_id?: string;
  texto: string;
  is_correta?: boolean;
  ordem?: number;
  tenant_id?: string;
}

export interface OptionUpdate extends Partial<Omit<OptionCreate, 'question_id'>> {
  id: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-training-quizzes';
const QUESTIONS_KEY = 'mt-training-quiz-questions';

// -----------------------------------------------------------------------------
// Hook: CRUD de Quizzes
// -----------------------------------------------------------------------------

export function useTrainingQuizzesMT(moduleId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Query: Quiz de um Módulo (geralmente 1 por módulo)
  // -------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, moduleId, tenant?.id],
    queryFn: async (): Promise<MTTrainingQuiz | null> => {
      if (!moduleId) return null;

      let q = (supabase.from('mt_training_quizzes') as any)
        .select(`
          *,
          questions:mt_training_quiz_questions(count)
        `)
        .eq('module_id', moduleId)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      const quiz = data[0];
      return {
        ...quiz,
        questions_count: quiz.questions?.[0]?.count ?? 0,
        questions: undefined,
      } as MTTrainingQuiz;
    },
    enabled: !!moduleId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // -------------------------------------------------------------------------
  // Mutation: Criar Quiz
  // -------------------------------------------------------------------------

  const createQuiz = useMutation({
    mutationFn: async (newQuiz: QuizCreate): Promise<MTTrainingQuiz> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await (supabase.from('mt_training_quizzes') as any)
        .insert({
          ...newQuiz,
          tenant_id: newQuiz.tenant_id || tenant!.id,
          tentativas_max: newQuiz.tentativas_max ?? 3,
          nota_minima: newQuiz.nota_minima ?? 70,
          mostrar_respostas: newQuiz.mostrar_respostas ?? true,
          embaralhar_questoes: newQuiz.embaralhar_questoes ?? false,
          embaralhar_alternativas: newQuiz.embaralhar_alternativas ?? true,
          xp_aprovado: newQuiz.xp_aprovado ?? 100,
          xp_nota_maxima: newQuiz.xp_nota_maxima ?? 50,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark module as having quiz
      await (supabase.from('mt_training_modules') as any)
        .update({ has_quiz: true, updated_at: new Date().toISOString() })
        .eq('id', newQuiz.module_id);

      return data as MTTrainingQuiz;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-modules'] });
      toast.success(`Quiz "${data.titulo}" criado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar quiz.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Atualizar Quiz
  // -------------------------------------------------------------------------

  const updateQuiz = useMutation({
    mutationFn: async ({ id, ...updates }: QuizUpdate): Promise<MTTrainingQuiz> => {
      const { data, error } = await (supabase.from('mt_training_quizzes') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingQuiz;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Quiz "${data.titulo}" atualizado!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar quiz.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Deletar Quiz (soft delete)
  // -------------------------------------------------------------------------

  const deleteQuiz = useMutation({
    mutationFn: async ({ id, moduleId: modId }: { id: string; moduleId: string }): Promise<void> => {
      const { error } = await (supabase.from('mt_training_quizzes') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Mark module as not having quiz
      await (supabase.from('mt_training_modules') as any)
        .update({ has_quiz: false, updated_at: new Date().toISOString() })
        .eq('id', modId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-modules'] });
      toast.success('Quiz removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover quiz.');
    },
  });

  return {
    quiz: query.data ?? null,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createQuiz,
    updateQuiz,
    deleteQuiz,

    isCreating: createQuiz.isPending,
    isUpdating: updateQuiz.isPending,
    isDeleting: deleteQuiz.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Detalhe de um Quiz (com questões e opções)
// -----------------------------------------------------------------------------

export function useQuizMT(quizId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', quizId],
    queryFn: async (): Promise<MTTrainingQuiz | null> => {
      if (!quizId) return null;

      const { data, error } = await (supabase.from('mt_training_quizzes') as any)
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

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (data?.questions) {
        data.questions = data.questions
          .filter((q: any) => !q.deleted_at)
          .map((q: any) => ({
            ...q,
            options: (q.options || []).sort((a: any, b: any) => a.ordem - b.ordem),
          }))
          .sort((a: any, b: any) => a.ordem - b.ordem);

        data.questions_count = data.questions.length;
      }

      return data as MTTrainingQuiz;
    },
    enabled: !!quizId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: CRUD de Questões
// -----------------------------------------------------------------------------

export function useQuizQuestionsMT(quizId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUESTIONS_KEY, quizId],
    queryFn: async (): Promise<MTTrainingQuizQuestion[]> => {
      if (!quizId) return [];

      const { data, error } = await (supabase.from('mt_training_quiz_questions') as any)
        .select(`
          *,
          options:mt_training_quiz_options(*)
        `)
        .eq('quiz_id', quizId)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) throw error;

      return (data || []).map((q: any) => ({
        ...q,
        options: (q.options || []).sort((a: any, b: any) => a.ordem - b.ordem),
      })) as MTTrainingQuizQuestion[];
    },
    enabled: !!quizId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Create question + options in one step
  const createQuestion = useMutation({
    mutationFn: async (newQuestion: QuestionCreate): Promise<MTTrainingQuizQuestion> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { options: optionsData, ...questionData } = newQuestion;

      // Auto-calcular ordem
      let ordem = questionData.ordem;
      if (ordem === undefined) {
        const { data: existing } = await (supabase.from('mt_training_quiz_questions') as any)
          .select('ordem')
          .eq('quiz_id', questionData.quiz_id)
          .is('deleted_at', null)
          .order('ordem', { ascending: false })
          .limit(1);

        ordem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;
      }

      const { data: question, error: qError } = await (supabase.from('mt_training_quiz_questions') as any)
        .insert({
          ...questionData,
          tenant_id: questionData.tenant_id || tenant!.id,
          tipo: questionData.tipo || 'multipla_escolha',
          pontos: questionData.pontos ?? 10,
          ordem,
        })
        .select()
        .single();

      if (qError) throw qError;

      // Create options if provided
      if (optionsData && optionsData.length > 0) {
        const optionsToInsert = optionsData.map((opt, idx) => ({
          question_id: question.id,
          tenant_id: tenant!.id,
          texto: opt.texto,
          is_correta: opt.is_correta ?? false,
          ordem: opt.ordem ?? idx + 1,
        }));

        const { error: optError } = await (supabase.from('mt_training_quiz_options') as any)
          .insert(optionsToInsert);

        if (optError) {
          console.error('Erro ao criar opções:', optError);
        }
      }

      return question as MTTrainingQuizQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Questão criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar questão.');
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...updates }: QuestionUpdate): Promise<MTTrainingQuizQuestion> => {
      const { data, error } = await (supabase.from('mt_training_quiz_questions') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingQuizQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Questão atualizada!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar questão.');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_quiz_questions') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Questão removida!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover questão.');
    },
  });

  // -------------------------------------------------------------------------
  // Options CRUD
  // -------------------------------------------------------------------------

  const createOption = useMutation({
    mutationFn: async (newOption: OptionCreate): Promise<MTTrainingQuizOption> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await (supabase.from('mt_training_quiz_options') as any)
        .insert({
          ...newOption,
          tenant_id: newOption.tenant_id || tenant!.id,
          is_correta: newOption.is_correta ?? false,
          ordem: newOption.ordem ?? 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingQuizOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar opção.');
    },
  });

  const updateOption = useMutation({
    mutationFn: async ({ id, ...updates }: OptionUpdate): Promise<MTTrainingQuizOption> => {
      const { data, error } = await (supabase.from('mt_training_quiz_options') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingQuizOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar opção.');
    },
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_quiz_options') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover opção.');
    },
  });

  // Replace all options for a question
  const replaceOptions = useMutation({
    mutationFn: async ({
      questionId,
      options,
    }: {
      questionId: string;
      options: OptionCreate[];
    }): Promise<MTTrainingQuizOption[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Delete existing options
      await (supabase.from('mt_training_quiz_options') as any)
        .delete()
        .eq('question_id', questionId);

      // Insert new options
      const optionsToInsert = options.map((opt, idx) => ({
        question_id: questionId,
        tenant_id: tenant!.id,
        texto: opt.texto,
        is_correta: opt.is_correta ?? false,
        ordem: opt.ordem ?? idx + 1,
      }));

      const { data, error } = await (supabase.from('mt_training_quiz_options') as any)
        .insert(optionsToInsert)
        .select();

      if (error) throw error;
      return (data || []) as MTTrainingQuizOption[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUESTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Opções atualizadas!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar opções.');
    },
  });

  return {
    questions: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createQuestion,
    updateQuestion,
    deleteQuestion,

    createOption,
    updateOption,
    deleteOption,
    replaceOptions,
  };
}

// -----------------------------------------------------------------------------
// Hook: Minhas Tentativas de Quiz
// -----------------------------------------------------------------------------

export function useMyQuizAttemptsMT(quizId?: string) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-training-quiz-attempts', quizId, user?.id],
    queryFn: async (): Promise<MTTrainingQuizAttempt[]> => {
      if (!quizId || !user) return [];

      const { data, error } = await (supabase.from('mt_training_quiz_attempts') as any)
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTTrainingQuizAttempt[];
    },
    enabled: !!quizId && !!user && !isTenantLoading && !!tenant,
  });

  return {
    attempts: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Submeter Quiz (Colaborador)
// -----------------------------------------------------------------------------

export function useSubmitQuizMT() {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quizId,
      respostas,
      tempoGastoSec,
    }: {
      quizId: string;
      respostas: QuizRespostas;
      tempoGastoSec: number;
    }): Promise<MTTrainingQuizAttempt> => {
      if (!tenant || !user) throw new Error('Contexto incompleto.');

      // Fetch quiz with answers to grade
      const { data: quiz, error: qErr } = await (supabase.from('mt_training_quizzes') as any)
        .select(`
          *,
          questions:mt_training_quiz_questions(
            *,
            options:mt_training_quiz_options(*)
          )
        `)
        .eq('id', quizId)
        .single();

      if (qErr) throw qErr;

      const questions = (quiz.questions || []).filter((q: any) => !q.deleted_at);
      let acertos = 0;
      let totalPontos = 0;
      let pontosObtidos = 0;

      for (const question of questions) {
        totalPontos += question.pontos || 1;
        const resp = respostas[question.id];
        if (!resp) continue;

        if (question.tipo === 'multipla_escolha' || question.tipo === 'verdadeiro_falso') {
          const correctOption = (question.options || []).find((o: any) => o.is_correta);
          const isCorrect = correctOption && resp.selected_option_id === correctOption.id;
          resp.is_correct = !!isCorrect;
          resp.pontos_obtidos = isCorrect ? (question.pontos || 1) : 0;
          if (isCorrect) {
            acertos++;
            pontosObtidos += question.pontos || 1;
          }
        } else if (question.tipo === 'dissertativa') {
          resp.is_correct = undefined;
          resp.pontos_obtidos = 0;
        }
      }

      const nota = totalPontos > 0 ? Math.round((pontosObtidos / totalPontos) * 100) : 0;
      const aprovado = nota >= (quiz.nota_minima || 70);

      const { data, error } = await (supabase.from('mt_training_quiz_attempts') as any)
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          quiz_id: quizId,
          nota,
          acertos,
          total_questoes: questions.length,
          aprovado,
          tempo_gasto_sec: tempoGastoSec,
          respostas,
          started_at: new Date(Date.now() - tempoGastoSec * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingQuizAttempt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-training-quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-enrollments'] });
      if (data.aprovado) {
        toast.success(`Parabens! Aprovado com nota ${data.nota}%!`);
      } else {
        toast.error(`Nota ${data.nota}% - nao atingiu a nota minima. Tente novamente.`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao submeter quiz.');
    },
  });
}

export default useTrainingQuizzesMT;
