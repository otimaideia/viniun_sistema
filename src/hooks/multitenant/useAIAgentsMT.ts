import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIAgent } from '@/types/ai-agent';

export function useAIAgentsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-ai-agents', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from('mt_ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id)
          .or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AIAgent[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newAgent: Partial<AIAgent>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase as any)
        .from('mt_ai_agents')
        .insert({
          ...newAgent,
          tenant_id: newAgent.tenant_id || tenant?.id,
          franchise_id: newAgent.franchise_id || franchise?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-agents'] });
      toast.success('Agente criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar agente: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AIAgent> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('mt_ai_agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-agents'] });
      toast.success('Agente atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar agente: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_ai_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-agents'] });
      toast.success('Agente removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover agente: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('mt_ai_agents')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-agents'] });
      toast.success(is_active ? 'Agente ativado' : 'Agente desativado');
    },
  });

  const duplicate = useMutation({
    mutationFn: async (agentId: string) => {
      const agent = query.data?.find(a => a.id === agentId);
      if (!agent) throw new Error('Agente não encontrado');

      const { id, created_at, updated_at, codigo, nome, ...rest } = agent;
      const newCodigo = `${codigo}_copy_${Date.now().toString(36)}`;
      const newNome = `${nome} (Cópia)`;

      const { data, error } = await (supabase as any)
        .from('mt_ai_agents')
        .insert({ ...rest, codigo: newCodigo, nome: newNome })
        .select()
        .single();

      if (error) throw error;
      return data as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-agents'] });
      toast.success('Agente duplicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar: ${error.message}`);
    },
  });

  return {
    agents: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    toggleActive,
    duplicate,
  };
}

// Hook for fetching a single agent by ID
export function useAIAgentMT(agentId: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-ai-agent', agentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_ai_agents')
        .select('*')
        .eq('id', agentId!)
        .single();

      if (error) throw error;
      return data as AIAgent;
    },
    enabled: !isTenantLoading && !!agentId,
  });
}

// Hook for fetching all agents (including inactive) for admin pages
export function useAIAgentsAdminMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-ai-agents-admin', tenant?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from('mt_ai_agents')
        .select('*')
        .order('ordem', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AIAgent[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    agents: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
