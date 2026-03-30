import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AIMemory, AIMemoryType } from '@/types/ai-sales-assistant';

interface MemoryFilters {
  memory_type?: AIMemoryType;
  user_id?: string;
  agent_id?: string;
  search?: string;
  minImportance?: number;
}

export function useAIMemoryMT(filters?: MemoryFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const memories = useQuery({
    queryKey: ['mt-ai-memory', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_memory')
        .select('*, agent:mt_ai_agents(codigo, nome, icone, cor)')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.memory_type) query = query.eq('memory_type', filters.memory_type);
      if (filters?.user_id) query = query.eq('user_id', filters.user_id);
      if (filters?.agent_id) query = query.eq('agent_id', filters.agent_id);
      if (filters?.minImportance) query = query.gte('importance', filters.minImportance);
      if (filters?.search) {
        query = query.ilike('content', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (AIMemory & { agent?: { codigo: string; nome: string; icone: string; cor: string } })[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const create = useMutation({
    mutationFn: async (memory: Partial<AIMemory>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_memory')
        .insert({
          ...memory,
          tenant_id: tenant.id,
          access_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-memory'] });
      toast.success('Memória adicionada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar memória: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AIMemory> & { id: string }) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_memory')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as AIMemory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-memory'] });
      toast.success('Memória atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { error } = await (supabase as any)
        .from('mt_ai_memory')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-memory'] });
      toast.success('Memória removida');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    memories: memories.data || [],
    isLoading: memories.isLoading || isTenantLoading,
    error: memories.error,
    create,
    update,
    remove,
    refetch: memories.refetch,
  };
}
