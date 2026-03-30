import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AIProactiveRule } from '@/types/ai-sales-assistant';

interface ProactiveRuleFilters {
  is_active?: boolean;
  target_roles?: string[];
  agent_id?: string;
  search?: string;
}

type ProactiveRuleWithAgent = AIProactiveRule & {
  agent?: { codigo: string; nome: string; icone: string; cor: string };
};

export function useYESiaProactiveRulesMT(filters?: ProactiveRuleFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: ['mt-ai-proactive-rules', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_proactive_rules')
        .select('*, agent:mt_ai_agents(codigo, nome, icone, cor)')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id);
      if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%`);
      }
      if (filters?.target_roles && filters.target_roles.length > 0) {
        query = query.overlaps('target_roles', filters.target_roles);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProactiveRuleWithAgent[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (rule: Partial<AIProactiveRule>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_proactive_rules')
        .insert({
          ...rule,
          tenant_id: tenant.id,
          is_active: rule.is_active ?? true,
          trigger_count: 0,
          target_roles: rule.target_roles || [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIProactiveRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-proactive-rules'] });
      toast.success('Regra proativa criada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar regra: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AIProactiveRule> & { id: string }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_proactive_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AIProactiveRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-proactive-rules'] });
      toast.success('Regra atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { error } = await (supabase as any)
        .from('mt_ai_proactive_rules')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-proactive-rules'] });
      toast.success('Regra removida');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_proactive_rules')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AIProactiveRule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-proactive-rules'] });
      toast.success(data.is_active ? 'Regra ativada' : 'Regra desativada');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    rules: rules.data || [],
    isLoading: rules.isLoading || isTenantLoading,
    error: rules.error,
    create,
    update,
    remove,
    toggleActive,
    refetch: rules.refetch,
  };
}
