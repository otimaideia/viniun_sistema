// =============================================================================
// USE TRAINING TRACKS MT - Hook Multi-Tenant para Trilhas de Treinamento
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTTrainingTrack } from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TrackCreate {
  codigo: string;
  titulo: string;
  descricao?: string;
  thumbnail_url?: string;
  cor?: string;
  icone?: string;
  nivel?: MTTrainingTrack['nivel'];
  duracao_estimada_horas?: number;
  is_obrigatoria?: boolean;
  is_sequencial?: boolean;
  is_published?: boolean;
  total_xp?: number;
  roles_alvo?: string[];
  prerequisite_track_id?: string;
  tenant_id?: string;
}

export interface TrackUpdate extends Partial<TrackCreate> {
  id: string;
}

export interface TrackFilters {
  nivel?: MTTrainingTrack['nivel'];
  is_published?: boolean;
  is_obrigatoria?: boolean;
  search?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-training-tracks';

// -----------------------------------------------------------------------------
// Hook Principal - Listar Trilhas
// -----------------------------------------------------------------------------

export function useTrainingTracksMT(filters?: TrackFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Query: Listar Trilhas
  // -------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async (): Promise<MTTrainingTrack[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = (supabase.from('mt_training_tracks') as any)
        .select(`
          *,
          modules:mt_training_modules(count),
          enrollments:mt_training_enrollments(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.nivel) q = q.eq('nivel', filters.nivel);
      if (filters?.is_published !== undefined) q = q.eq('is_published', filters.is_published);
      if (filters?.is_obrigatoria !== undefined) q = q.eq('is_obrigatoria', filters.is_obrigatoria);
      if (filters?.search) {
        const term = `%${filters.search}%`;
        q = q.or(`titulo.ilike.${term},descricao.ilike.${term},codigo.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Map count aggregations
      return (data || []).map((track: any) => ({
        ...track,
        modules_count: track.modules?.[0]?.count ?? 0,
        enrolled_count: track.enrollments?.[0]?.count ?? 0,
        modules: undefined,
        enrollments: undefined,
      })) as MTTrainingTrack[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // -------------------------------------------------------------------------
  // Mutation: Criar Trilha
  // -------------------------------------------------------------------------

  const createTrack = useMutation({
    mutationFn: async (newTrack: TrackCreate): Promise<MTTrainingTrack> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await (supabase.from('mt_training_tracks') as any)
        .insert({
          ...newTrack,
          tenant_id: newTrack.tenant_id || tenant!.id,
          nivel: newTrack.nivel || 'iniciante',
          is_obrigatoria: newTrack.is_obrigatoria ?? false,
          is_sequencial: newTrack.is_sequencial ?? true,
          is_published: newTrack.is_published ?? false,
          total_xp: newTrack.total_xp ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingTrack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Trilha "${data.titulo}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar trilha.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Atualizar Trilha
  // -------------------------------------------------------------------------

  const updateTrack = useMutation({
    mutationFn: async ({ id, ...updates }: TrackUpdate): Promise<MTTrainingTrack> => {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Se publicando, registrar data
      if (updates.is_published === true) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await (supabase.from('mt_training_tracks') as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTTrainingTrack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Trilha "${data.titulo}" atualizada!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar trilha.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Deletar Trilha (soft delete)
  // -------------------------------------------------------------------------

  const deleteTrack = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase.from('mt_training_tracks') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Trilha removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover trilha.');
    },
  });

  // -------------------------------------------------------------------------
  // Mutation: Publicar/Despublicar
  // -------------------------------------------------------------------------

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const updateData: any = {
        is_published,
        updated_at: new Date().toISOString(),
      };
      if (is_published) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await (supabase.from('mt_training_tracks') as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(vars.is_published ? 'Trilha publicada!' : 'Trilha despublicada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao alterar publicação.');
    },
  });

  return {
    tracks: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createTrack,
    updateTrack,
    deleteTrack,
    togglePublish,

    isCreating: createTrack.isPending,
    isUpdating: updateTrack.isPending,
    isDeleting: deleteTrack.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Detalhe de uma Trilha (com módulos e lições)
// -----------------------------------------------------------------------------

export function useTrainingTrackMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTTrainingTrack | null> => {
      if (!id) return null;

      const { data, error } = await (supabase.from('mt_training_tracks') as any)
        .select(`
          *,
          modules:mt_training_modules(
            *,
            lessons:mt_training_lessons(
              id, titulo, tipo, ordem, duracao_estimada_min, is_published, xp_completar, deleted_at
            ),
            quiz:mt_training_quizzes(
              id, titulo, tentativas_max, nota_minima, deleted_at
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

      // Filter out soft-deleted modules and lessons
      if (data?.modules) {
        data.modules = data.modules
          .filter((m: any) => !m.deleted_at)
          .map((m: any) => ({
            ...m,
            lessons: (m.lessons || []).filter((l: any) => !l.deleted_at),
            lessons_count: (m.lessons || []).filter((l: any) => !l.deleted_at).length,
            quiz: (m.quiz || []).find((q: any) => !q.deleted_at) || null,
          }))
          .sort((a: any, b: any) => a.ordem - b.ordem);

        data.modules_count = data.modules.length;
        data.lessons_count = data.modules.reduce(
          (sum: number, m: any) => sum + (m.lessons_count || 0),
          0
        );
      }

      return data as MTTrainingTrack;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Trilhas publicadas (para alunos)
// -----------------------------------------------------------------------------

export function usePublishedTracksMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading, user } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'published', tenant?.id, user?.id],
    queryFn: async (): Promise<MTTrainingTrack[]> => {
      if (!tenant) throw new Error('Tenant não carregado.');

      let q = (supabase.from('mt_training_tracks') as any)
        .select(`
          *,
          modules:mt_training_modules(count),
          enrollment:mt_training_enrollments(id, status, progresso_pct, started_at)
        `)
        .eq('tenant_id', tenant.id)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      // If user context, filter enrollment to current user
      if (user?.id) {
        q = q.eq('enrollment.user_id', user.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((track: any) => ({
        ...track,
        modules_count: track.modules?.[0]?.count ?? 0,
        enrollment: track.enrollment?.[0] || null,
        modules: undefined,
      })) as MTTrainingTrack[];
    },
    enabled: !isTenantLoading && !!tenant,
  });
}

export default useTrainingTracksMT;
