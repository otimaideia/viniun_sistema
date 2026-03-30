import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTSOPExecution, MTSOPExecutionStep } from '@/types/sop';

export function useSOPExecutionsMT(sopId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-sop-executions', sopId, tenant?.id],
    queryFn: async () => {
      let q = (supabase
        .from('mt_sop_executions') as any)
        .select(`
          *,
          sop:mt_sops(id, codigo, titulo),
          user:mt_users!mt_sop_executions_user_id_fkey(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (sopId) q = q.eq('sop_id', sopId);

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTSOPExecution[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const startExecution = useMutation({
    mutationFn: async (sopId: string) => {
      // Get current user from context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get user MT id
      const { data: mtUser } = await (supabase
        .from('mt_users') as any)
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (!mtUser) throw new Error('Usuário MT não encontrado');

      // Create execution
      const { data: execution, error } = await (supabase
        .from('mt_sop_executions') as any)
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          sop_id: sopId,
          user_id: mtUser.id,
          status: 'em_andamento',
        })
        .select()
        .single();
      if (error) throw error;

      // Get SOP steps and create execution steps
      const { data: steps } = await (supabase
        .from('mt_sop_steps') as any)
        .select('id')
        .eq('sop_id', sopId)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (steps?.length) {
        const execSteps = steps.map((step: any) => ({
          tenant_id: tenant?.id,
          execution_id: execution.id,
          step_id: step.id,
          status: 'pendente',
        }));
        await (supabase.from('mt_sop_execution_steps') as any).insert(execSteps);
      }

      return execution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-executions'] });
      toast.success('Execução iniciada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const completeExecution = useMutation({
    mutationFn: async ({ executionId, observacoes }: { executionId: string; observacoes?: string }) => {
      const { error } = await (supabase
        .from('mt_sop_executions') as any)
        .update({
          status: 'concluido',
          completed_at: new Date().toISOString(),
          observacoes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-executions'] });
      toast.success('Execução concluída!');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const cancelExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await (supabase
        .from('mt_sop_executions') as any)
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-executions'] });
      toast.success('Execução cancelada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  return {
    executions: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    startExecution,
    completeExecution,
    cancelExecution,
  };
}

export function useSOPExecutionMT(executionId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-sop-execution', executionId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('mt_sop_executions') as any)
        .select(`
          *,
          sop:mt_sops(*, steps:mt_sop_steps(*, checklist_items:mt_sop_step_checklist(*))),
          user:mt_users!mt_sop_executions_user_id_fkey(id, nome),
          steps:mt_sop_execution_steps(
            *,
            step:mt_sop_steps(id, titulo, tipo, descricao, instrucoes, has_checklist, imagem_url),
            checklist:mt_sop_execution_checklist(*)
          )
        `)
        .eq('id', executionId)
        .single();
      if (error) throw error;

      // Sort execution steps by step ordem
      if (data?.steps) {
        data.steps.sort((a: any, b: any) => {
          const stepA = data.sop?.steps?.find((s: any) => s.id === a.step_id);
          const stepB = data.sop?.steps?.find((s: any) => s.id === b.step_id);
          return (stepA?.ordem || 0) - (stepB?.ordem || 0);
        });
      }

      return data as MTSOPExecution;
    },
    enabled: !!executionId && !isTenantLoading,
  });

  const updateStepStatus = useMutation({
    mutationFn: async ({
      executionStepId,
      status,
      observacoes,
      evidencia_url,
    }: {
      executionStepId: string;
      status: string;
      observacoes?: string;
      evidencia_url?: string;
    }) => {
      const updates: any = { status };
      if (status === 'concluido') {
        updates.completed_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: mtUser } = await (supabase
            .from('mt_users') as any)
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          if (mtUser) updates.completed_by = mtUser.id;
        }
      }
      if (observacoes) updates.observacoes = observacoes;
      if (evidencia_url) updates.evidencia_url = evidencia_url;

      const { error } = await (supabase
        .from('mt_sop_execution_steps') as any)
        .update(updates)
        .eq('id', executionStepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-execution', executionId] });
    },
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({
      executionStepId,
      checklistItemId,
      isChecked,
    }: {
      executionStepId: string;
      checklistItemId: string;
      isChecked: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      let mtUserId: string | undefined;
      if (user) {
        const { data: mtUser } = await (supabase
          .from('mt_users') as any)
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        mtUserId = mtUser?.id;
      }

      // Upsert checklist execution
      const { data: existing } = await (supabase
        .from('mt_sop_execution_checklist') as any)
        .select('id')
        .eq('execution_step_id', executionStepId)
        .eq('checklist_item_id', checklistItemId)
        .maybeSingle();

      if (existing) {
        await (supabase
          .from('mt_sop_execution_checklist') as any)
          .update({
            is_checked: isChecked,
            checked_at: isChecked ? new Date().toISOString() : null,
            checked_by: isChecked ? mtUserId : null,
          })
          .eq('id', existing.id);
      } else {
        const { data: execStep } = await (supabase
          .from('mt_sop_execution_steps') as any)
          .select('tenant_id')
          .eq('id', executionStepId)
          .single();

        await (supabase
          .from('mt_sop_execution_checklist') as any)
          .insert({
            tenant_id: execStep?.tenant_id,
            execution_step_id: executionStepId,
            checklist_item_id: checklistItemId,
            is_checked: isChecked,
            checked_at: isChecked ? new Date().toISOString() : null,
            checked_by: isChecked ? mtUserId : null,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-sop-execution', executionId] });
    },
  });

  return {
    execution: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    updateStepStatus,
    toggleChecklist,
  };
}
