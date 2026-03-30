// =============================================================================
// USE TRAINING MODULES MT - Hook Multi-Tenant para Módulos de Treinamento
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTTrainingModule } from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ModuleCreate {
  track_id: string;
  titulo: string;
  descricao?: string;
  thumbnail_url?: string;
  duracao_estimada_min?: number;
  ordem?: number;
  is_published?: boolean;
  xp_completar?: number;
  nota_minima?: number;
  has_quiz?: boolean;
  tenant_id?: string;
}

export interface ModuleUpdate extends Partial<Omit<ModuleCreate, 'track_id'>> {
  id: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-training-modules';

// -----------------------------------------------------------------------------
// Hook Principal - Módulos de uma Trilha
// -----------------------------------------------------------------------------

export function useTrainingModulesMT(trackId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Query: Listar Módulos de uma Trilha
  // -------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, trackId, tenant?.id],
    queryFn: async (): Promise<MTTrainingModule[]> => {
      if (!trackId) return [];

      let q = (supabase.from('mt_training_modules') as any)
        .select(`
          *,
          lessons:mt_training_lessons(count),
          quiz:mt_training_quizzes(count)
        `)
        .eq('track_id', trackId)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.order('ordem', { ascending: true });

      if (error) throw error;

      return (data || []).map((mod: any) => ({
        ...mod,
        lessons_count: mod.lessons?.[0]?.count ?? 0,
        quiz_count: mod.quiz?.[0]?.count ?? 0,
        has_quiz: (mod.quiz?.[0]?.count ?? 0) > 0,
        lessons: undefined,
        quiz: undefined,
      })) as MTTrainingModule[];
    },
    enabled: !!trackId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // -------------------------------------------------------------------------
  // Mutation: Criar Módulo
  // -------------------------------------------------------------------------

  const createModule = useMutation({
    mutationFn: async (newModule: ModuleCreate): Promise<MTTrainingModule> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Auto-calcular ordem se não informada
      let ordem = newModule.ordem;
      if (ordem === undefined) {
        const { data: existing } = await (supabase.from('mt_training_modules') as any)
          .select('ordem')
          .eq('track_id', newModule.track_id)
          .is('deleted_at', null)
          .order('ordem', { ascending: false })
          .limit(1);

        ordem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;
      }

      const { data, error } = await (supabase.from('mt_training_modules') as any)
        .insert({
          ...newModule,
          tenant_id: newModule.tenant_id || tenant!.id,
          ordem,
          is_published: newModule.is_published ?? false,
          xp_completar: newModule.xp_completar ?? 50,
          nota_minima: newModule.nota_minima ?? 70,
          has_quiz: newModule.has_quiz ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingModule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success(`Módulo "${data.titulo}" criado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar módulo.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Atualizar Módulo
  // -------------------------------------------------------------------------

  const updateModule = useMutation({
    mutationFn: async ({ id, ...updates }: ModuleUpdate): Promise<MTTrainingModule> => {
      const { data, error } = await (supabase.from('mt_training_modules') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingModule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success(`Módulo "${data.titulo}" atualizado!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar módulo.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Deletar Módulo (soft delete)
  // -------------------------------------------------------------------------

  const deleteModule = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_modules') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success('Módulo removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover módulo.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Reordenar Módulos
  // -------------------------------------------------------------------------

  const reorderModules = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      const updates = orderedIds.map((id, index) => ({
        id,
        ordem: index + 1,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await (supabase.from('mt_training_modules') as any)
          .update({ ordem: update.ordem, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ordem dos módulos atualizada!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao reordenar módulos.');
    },
  });

  return {
    modules: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createModule,
    updateModule,
    deleteModule,
    reorderModules,

    isCreating: createModule.isPending,
    isUpdating: updateModule.isPending,
    isDeleting: deleteModule.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Detalhe de um Módulo
// -----------------------------------------------------------------------------

export function useTrainingModuleMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTTrainingModule | null> => {
      if (!id) return null;

      const { data, error } = await (supabase.from('mt_training_modules') as any)
        .select(`
          *,
          track:mt_training_tracks(id, titulo, codigo, is_sequencial),
          lessons:mt_training_lessons(
            *,
            materials:mt_training_materials(*)
          ),
          quiz:mt_training_quizzes(
            *,
            questions:mt_training_quiz_questions(
              *,
              options:mt_training_quiz_options(*)
            )
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Filter soft-deleted children
      if (data) {
        data.lessons = (data.lessons || [])
          .filter((l: any) => !l.deleted_at)
          .map((l: any) => ({
            ...l,
            materials: (l.materials || []).filter((m: any) => !m.deleted_at),
          }))
          .sort((a: any, b: any) => a.ordem - b.ordem);

        data.lessons_count = data.lessons.length;

        const activeQuizzes = (data.quiz || []).filter((q: any) => !q.deleted_at);
        data.quiz = activeQuizzes[0] || null;

        if (data.quiz?.questions) {
          data.quiz.questions = data.quiz.questions
            .filter((q: any) => !q.deleted_at)
            .map((q: any) => ({
              ...q,
              options: (q.options || []).sort((a: any, b: any) => a.ordem - b.ordem),
            }))
            .sort((a: any, b: any) => a.ordem - b.ordem);

          data.quiz.questions_count = data.quiz.questions.length;
        }
      }

      return data as MTTrainingModule;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useTrainingModulesMT;
