// =============================================================================
// USE PARCERIA BENEFICIOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para benefícios de parcerias
// SISTEMA 100% MT - Usa mt_partnership_benefits diretamente
//
// =============================================================================

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  ParceriaBeneficio,
  ParceriaBeneficioInsert,
  ParceriaBeneficioUpdate,
} from '@/types/parceria';

// =============================================================================
// Query Keys
// =============================================================================

export const parceriaBeneficiosKeys = {
  all: ['mt-parceria-beneficios'] as const,
  byParceria: (parceriaId: string) => [...parceriaBeneficiosKeys.all, parceriaId] as const,
};

// =============================================================================
// Hook Principal
// =============================================================================

export function useParceriaBeneficiosAdapter(parceriaId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Benefícios
  // ==========================================================================
  const {
    data: beneficios = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: parceriaBeneficiosKeys.byParceria(parceriaId || ''),
    queryFn: async (): Promise<ParceriaBeneficio[]> => {
      if (!parceriaId) return [];

      const { data, error } = await supabase
        .from('mt_partnership_benefits')
        .select('*')
        .eq('partnership_id', parceriaId)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('[MT] Erro ao buscar benefícios:', error);
        throw error;
      }

      // Mapear campos MT para campos legados
      return (data || []).map((b) => ({
        id: b.id,
        parceria_id: b.partnership_id,
        titulo: b.titulo || b.title,
        descricao: b.descricao || b.description,
        icone: b.icone || b.icon,
        ativo: b.ativo ?? b.is_active ?? true,
        destaque: b.destaque ?? b.is_featured ?? false,
        ordem: b.ordem ?? b.order ?? 0,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })) as ParceriaBeneficio[];
    },
    enabled: !!parceriaId && !isTenantLoading,
  });

  // ==========================================================================
  // Mutation: Criar Benefício
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: ParceriaBeneficioInsert) => {
      // Se marcado como destaque, desmarcar outros
      if (data.destaque) {
        await supabase
          .from('mt_partnership_benefits')
          .update({ destaque: false, is_featured: false })
          .eq('partnership_id', data.parceria_id);
      }

      // Calcular próxima ordem
      const { data: existing } = await supabase
        .from('mt_partnership_benefits')
        .select('ordem')
        .eq('partnership_id', data.parceria_id)
        .is('deleted_at', null)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = existing && existing.length > 0 ? (existing[0].ordem || 0) + 1 : 0;

      const { data: beneficio, error } = await supabase
        .from('mt_partnership_benefits')
        .insert({
          partnership_id: data.parceria_id,
          tenant_id: tenant?.id,
          titulo: data.titulo,
          title: data.titulo,
          descricao: data.descricao,
          description: data.descricao,
          icone: data.icone,
          icon: data.icone,
          ativo: data.ativo ?? true,
          is_active: data.ativo ?? true,
          destaque: data.destaque ?? false,
          is_featured: data.destaque ?? false,
          ordem: data.ordem ?? nextOrdem,
          order: data.ordem ?? nextOrdem,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar benefício:', error);
        throw error;
      }

      return beneficio as ParceriaBeneficio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success('Benefício adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar benefício: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Benefício
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ParceriaBeneficioUpdate }) => {
      // Se marcado como destaque, desmarcar outros
      if (data.destaque && parceriaId) {
        await supabase
          .from('mt_partnership_benefits')
          .update({ destaque: false, is_featured: false })
          .eq('partnership_id', parceriaId)
          .neq('id', id);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.titulo !== undefined) {
        updateData.titulo = data.titulo;
        updateData.title = data.titulo;
      }
      if (data.descricao !== undefined) {
        updateData.descricao = data.descricao;
        updateData.description = data.descricao;
      }
      if (data.icone !== undefined) {
        updateData.icone = data.icone;
        updateData.icon = data.icone;
      }
      if (data.ativo !== undefined) {
        updateData.ativo = data.ativo;
        updateData.is_active = data.ativo;
      }
      if (data.destaque !== undefined) {
        updateData.destaque = data.destaque;
        updateData.is_featured = data.destaque;
      }
      if (data.ordem !== undefined) {
        updateData.ordem = data.ordem;
        updateData.order = data.ordem;
      }

      const { error } = await supabase
        .from('mt_partnership_benefits')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao atualizar benefício:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success('Benefício atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar benefício: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Benefício (soft delete)
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_partnership_benefits')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar benefício:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
      toast.success('Benefício removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover benefício: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Reordenar Benefícios
  // ==========================================================================
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('mt_partnership_benefits')
          .update({ ordem: index, order: index })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parceriaBeneficiosKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar benefícios: ${error.message}`);
    },
  });

  // ==========================================================================
  // Funções Auxiliares
  // ==========================================================================
  const toggleAtivo = useCallback(
    (id: string, ativo: boolean) => updateMutation.mutateAsync({ id, data: { ativo } }),
    [updateMutation]
  );

  const toggleDestaque = useCallback(
    (id: string, destaque: boolean) => updateMutation.mutateAsync({ id, data: { destaque } }),
    [updateMutation]
  );

  // ==========================================================================
  // Dados Derivados
  // ==========================================================================
  const beneficiosAtivos = beneficios.filter((b) => b.ativo);
  const beneficioDestaque = beneficios.find((b) => b.destaque && b.ativo);

  return {
    // Dados
    beneficios,
    beneficiosAtivos,
    beneficioDestaque,

    // Estados
    isLoading: isLoading || isTenantLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,

    // Ações
    refetch,
    createBeneficio: createMutation.mutateAsync,
    updateBeneficio: updateMutation.mutateAsync,
    deleteBeneficio: deleteMutation.mutateAsync,
    reorderBeneficios: reorderMutation.mutateAsync,

    // Atalhos
    toggleAtivo,
    toggleDestaque,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type {
  ParceriaBeneficio,
  ParceriaBeneficioInsert,
  ParceriaBeneficioUpdate,
} from '@/types/parceria';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getParceriaBeneficiosMode(): 'mt' {
  return 'mt';
}

export default useParceriaBeneficiosAdapter;
