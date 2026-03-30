import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AISkillExecution, AITriggerType } from '@/types/ai-sales-assistant';

interface SkillExecutionFilters {
  status?: AISkillExecution['status'];
  trigger_type?: AITriggerType;
  user_id?: string;
  agent_id?: string;
  limit?: number;
}

type SkillExecutionWithAgent = AISkillExecution & {
  agent?: { codigo: string; nome: string; icone: string; cor: string };
};

export function useAISkillExecutionsMT(filters?: SkillExecutionFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const executions = useQuery({
    queryKey: ['mt-ai-skill-executions', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_skill_executions')
        .select('*, agent:mt_ai_agents(codigo, nome, icone, cor)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.trigger_type) query = query.eq('trigger_type', filters.trigger_type);
      if (filters?.user_id) query = query.eq('user_id', filters.user_id);
      if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data as SkillExecutionWithAgent[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (execution: Partial<AISkillExecution>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_skill_executions')
        .insert({
          ...execution,
          tenant_id: tenant.id,
          status: execution.status || 'pending',
          tokens_used: execution.tokens_used || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AISkillExecution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-skill-executions'] });
      toast.success('Execução criada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar execução: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AISkillExecution> & { id: string }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_skill_executions')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AISkillExecution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-skill-executions'] });
      toast.success('Execução atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_skill_executions')
        .update({ was_dismissed: true })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AISkillExecution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-skill-executions'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao dispensar: ${error.message}`);
    },
  });

  return {
    executions: executions.data || [],
    isLoading: executions.isLoading || isTenantLoading,
    error: executions.error,
    create,
    update,
    dismiss,
    refetch: executions.refetch,
  };
}
