// =============================================================================
// USE TRAINING LESSONS MT - Hook Multi-Tenant para Aulas de Treinamento
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTTrainingLesson, MTTrainingMaterial, LessonTipo, VideoProvider } from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface LessonCreate {
  module_id: string;
  titulo: string;
  descricao?: string;
  tipo?: LessonTipo;
  conteudo_html?: string;
  video_url?: string;
  video_provider?: VideoProvider;
  video_duration_sec?: number;
  documento_url?: string;
  documento_nome?: string;
  link_externo?: string;
  embed_code?: string;
  thumbnail_url?: string;
  duracao_estimada_min?: number;
  ordem?: number;
  is_published?: boolean;
  xp_completar?: number;
  xp_primeiro_acesso?: number;
  tenant_id?: string;
}

export interface LessonUpdate extends Partial<Omit<LessonCreate, 'module_id'>> {
  id: string;
}

export interface MaterialCreate {
  lesson_id: string;
  titulo: string;
  tipo: MTTrainingMaterial['tipo'];
  arquivo_url?: string;
  arquivo_nome?: string;
  tamanho_bytes?: number;
  ordem?: number;
  tenant_id?: string;
}

export interface MaterialUpdate extends Partial<Omit<MaterialCreate, 'lesson_id'>> {
  id: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-training-lessons';
const MATERIALS_KEY = 'mt-training-materials';

// -----------------------------------------------------------------------------
// Hook Principal - Aulas de um Módulo
// -----------------------------------------------------------------------------

export function useTrainingLessonsMT(moduleId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Query: Listar Aulas de um Módulo
  // -------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, moduleId, tenant?.id],
    queryFn: async (): Promise<MTTrainingLesson[]> => {
      if (!moduleId) return [];

      let q = (supabase.from('mt_training_lessons') as any)
        .select(`
          *,
          materials:mt_training_materials(count)
        `)
        .eq('module_id', moduleId)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q.order('ordem', { ascending: true });

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        ...lesson,
        materials_count: lesson.materials?.[0]?.count ?? 0,
        materials: undefined,
      })) as MTTrainingLesson[];
    },
    enabled: !!moduleId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // -------------------------------------------------------------------------
  // Mutation: Criar Aula
  // -------------------------------------------------------------------------

  const createLesson = useMutation({
    mutationFn: async (newLesson: LessonCreate): Promise<MTTrainingLesson> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Auto-calcular ordem se não informada
      let ordem = newLesson.ordem;
      if (ordem === undefined) {
        const { data: existing } = await (supabase.from('mt_training_lessons') as any)
          .select('ordem')
          .eq('module_id', newLesson.module_id)
          .is('deleted_at', null)
          .order('ordem', { ascending: false })
          .limit(1);

        ordem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;
      }

      const { data, error } = await (supabase.from('mt_training_lessons') as any)
        .insert({
          ...newLesson,
          tenant_id: newLesson.tenant_id || tenant!.id,
          tipo: newLesson.tipo || 'video',
          ordem,
          is_published: newLesson.is_published ?? false,
          xp_completar: newLesson.xp_completar ?? 10,
          xp_primeiro_acesso: newLesson.xp_primeiro_acesso ?? 5,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-modules'] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success(`Aula "${data.titulo}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar aula.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Atualizar Aula
  // -------------------------------------------------------------------------

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...updates }: LessonUpdate): Promise<MTTrainingLesson> => {
      const { data, error } = await (supabase.from('mt_training_lessons') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Aula "${data.titulo}" atualizada!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar aula.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Deletar Aula (soft delete)
  // -------------------------------------------------------------------------

  const deleteLesson = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_lessons') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-modules'] });
      queryClient.invalidateQueries({ queryKey: ['mt-training-tracks'] });
      toast.success('Aula removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover aula.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Reordenar Aulas
  // -------------------------------------------------------------------------

  const reorderLessons = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await (supabase.from('mt_training_lessons') as any)
          .update({ ordem: i + 1, updated_at: new Date().toISOString() })
          .eq('id', orderedIds[i]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ordem das aulas atualizada!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao reordenar aulas.');
    },
  });

  return {
    lessons: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,

    isCreating: createLesson.isPending,
    isUpdating: updateLesson.isPending,
    isDeleting: deleteLesson.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Detalhe de uma Aula (com materiais)
// -----------------------------------------------------------------------------

export function useTrainingLessonMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTTrainingLesson | null> => {
      if (!id) return null;

      const { data, error } = await (supabase.from('mt_training_lessons') as any)
        .select(`
          *,
          materials:mt_training_materials(*),
          module:mt_training_modules(id, titulo, track_id, ordem, is_sequencial:mt_training_tracks(is_sequencial))
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (data?.materials) {
        data.materials = data.materials
          .filter((m: any) => !m.deleted_at)
          .sort((a: any, b: any) => a.ordem - b.ordem);
      }

      return data as MTTrainingLesson;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Materiais de uma Aula
// -----------------------------------------------------------------------------

export function useTrainingMaterialsMT(lessonId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [MATERIALS_KEY, lessonId],
    queryFn: async (): Promise<MTTrainingMaterial[]> => {
      if (!lessonId) return [];

      const { data, error } = await (supabase.from('mt_training_materials') as any)
        .select('*')
        .eq('lesson_id', lessonId)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return (data || []) as MTTrainingMaterial[];
    },
    enabled: !!lessonId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createMaterial = useMutation({
    mutationFn: async (newMaterial: MaterialCreate): Promise<MTTrainingMaterial> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      // Auto-calcular ordem
      let ordem = newMaterial.ordem;
      if (ordem === undefined) {
        const { data: existing } = await (supabase.from('mt_training_materials') as any)
          .select('ordem')
          .eq('lesson_id', newMaterial.lesson_id)
          .is('deleted_at', null)
          .order('ordem', { ascending: false })
          .limit(1);

        ordem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;
      }

      const { data, error } = await (supabase.from('mt_training_materials') as any)
        .insert({
          ...newMaterial,
          tenant_id: newMaterial.tenant_id || tenant!.id,
          ordem,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Material adicionado!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao adicionar material.');
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: MaterialUpdate): Promise<MTTrainingMaterial> => {
      const { data, error } = await (supabase.from('mt_training_materials') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingMaterial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIALS_KEY] });
      toast.success('Material atualizado!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar material.');
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_materials') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Material removido!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover material.');
    },
  });

  return {
    materials: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}

export default useTrainingLessonsMT;
