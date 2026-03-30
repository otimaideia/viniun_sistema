import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTSOPFlowConnection } from '@/types/sop';

const QUERY_KEY = 'mt-sop-flow-connections';

export function useSOPFlowMT(sopId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, sopId, tenant?.id],
    queryFn: async () => {
      let q = (supabase.from('mt_sop_flow_connections') as any)
        .select('*')
        .eq('sop_id', sopId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTSOPFlowConnection[];
    },
    enabled: !!sopId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createConnection = useMutation({
    mutationFn: async (newConnection: Partial<MTSOPFlowConnection>) => {
      const { data, error } = await (supabase.from('mt_sop_flow_connections') as any)
        .insert({ ...newConnection, tenant_id: tenant?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sopId] });
      toast.success('Conexao adicionada');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTSOPFlowConnection> & { id: string }) => {
      const { data, error } = await (supabase.from('mt_sop_flow_connections') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sopId] });
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase.from('mt_sop_flow_connections') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sopId] });
      toast.success('Conexao removida');
    },
    onError: (error: any) => toast.error(`Erro: ${error.message}`),
  });

  const replaceAll = useMutation({
    mutationFn: async ({
      sopId: targetSopId,
      connections,
    }: {
      sopId: string;
      connections: Omit<MTSOPFlowConnection, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>[];
    }) => {
      // 1. Soft-delete all existing connections for this SOP
      await (supabase.from('mt_sop_flow_connections') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('sop_id', targetSopId)
        .is('deleted_at', null);

      // 2. Insert new connections
      if (connections.length > 0) {
        const { error } = await (supabase.from('mt_sop_flow_connections') as any)
          .insert(
            connections.map((c) => ({
              ...c,
              sop_id: targetSopId,
              tenant_id: tenant?.id,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sopId] });
      toast.success('Fluxo do POP salvo');
    },
    onError: (error: any) => toast.error(`Erro ao salvar fluxo: ${error.message}`),
  });

  return {
    connections: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    createConnection,
    updateConnection,
    deleteConnection,
    replaceAll,
  };
}
