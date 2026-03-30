import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { YESiaConfig } from '@/types/ai-sales-assistant';

export function useYESiaConfigMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ['mt-ai-config', tenant?.id],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');
      const { data, error } = await (supabase as any)
        .from('mt_ai_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single();
      if (error) throw error;
      return data as YESiaConfig;
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<YESiaConfig>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenant.id)
        .select()
        .single();
      if (error) throw error;
      return data as YESiaConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-config'] });
      toast.success('Configuração atualizada');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createConfig = useMutation({
    mutationFn: async (config: Partial<YESiaConfig>) => {
      if (!tenant) throw new Error('Tenant não definido');
      const { data, error } = await (supabase as any)
        .from('mt_ai_config')
        .insert({ ...config, tenant_id: tenant.id })
        .select()
        .single();
      if (error) throw error;
      return data as YESiaConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-config'] });
      toast.success('Configuração criada');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    config: config.data,
    isLoading: config.isLoading || isTenantLoading,
    error: config.error,
    updateConfig,
    createConfig,
    refetch: config.refetch,
  };
}
