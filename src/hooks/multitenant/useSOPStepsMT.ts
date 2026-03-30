import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTSOPStep, MTSOPStepChecklist } from '@/types/sop';

export function useSOPStepsMT(sopId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-sop-steps', sopId, tenant?.id],
    queryFn: async () => {
      let q = (supabase
        .from('mt_sop_steps') as any)
        .select(`*, checklist_items:mt_sop_step_checklist(*)`)
        .eq('sop_id', sopId)
        .is('deleted_at', null);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q.order('ordem', { ascending: true });
      if (error) throw error;
      return (data as MTSOPStep[]).map((step) => ({
        ...step,
        checklist_items: step.checklist_items?.sort((a: any, b: any) => a.ordem - b.ordem),
      }));
    },
    enabled: !!sopId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createStep = useMutation({
    mutationFn: async (newStep: Partial<MTSOPStep>) => {
      const { data, error } = await (supabase
        .from('mt_sop_steps') as any)
        .insert({ ...newStep, tenant_id: tenant?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
      queryClient.invalidateQueries({ queryKey: ['mt-sop', sopId] });
      toast.success('Passo adicionado');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTSOPStep> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_sop_steps') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
      queryClient.invalidateQueries({ queryKey: ['mt-sop', sopId] });
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await (supabase
        .from('mt_sop_steps') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
      queryClient.invalidateQueries({ queryKey: ['mt-sop', sopId] });
      toast.success('Passo removido');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const updatePositions = useMutation({
    mutationFn: async (positions: { id: string; position_x: number; position_y: number }[]) => {
      for (const pos of positions) {
        const { error } = await (supabase.from('mt_sop_steps') as any)
          .update({ position_x: pos.position_x, position_y: pos.position_y })
          .eq('id', pos.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
    },
  });

  const reorderSteps = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        (supabase.from('mt_sop_steps') as any)
          .update({ ordem: index + 1 })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
    },
  });

  // Checklist mutations
  const addChecklistItem = useMutation({
    mutationFn: async (item: Partial<MTSOPStepChecklist>) => {
      const { data, error } = await (supabase
        .from('mt_sop_step_checklist') as any)
        .insert({ ...item, tenant_id: tenant?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
    },
  });

  const removeChecklistItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase
        .from('mt_sop_step_checklist') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-steps', sopId] });
    },
  });

  return {
    steps: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    updatePositions,
    addChecklistItem,
    removeChecklistItem,
  };
}
