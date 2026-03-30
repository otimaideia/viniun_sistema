import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  WhatsAppRoutingRule,
  CreateRoutingRuleInput,
  UpdateRoutingRuleInput,
} from '@/types/whatsapp-hybrid';

const TABLE = 'mt_whatsapp_routing_rules';
const QUERY_KEY = 'mt-wa-routing-rules';

const SELECT_FIELDS = `
  *,
  tenant:mt_tenants(slug, nome_fantasia),
  franchise:mt_franchises(nome)
`;

export function useWhatsAppRoutingRulesMT(filters?: {
  franchise_id?: string;
  condition_type?: string;
  is_active?: boolean;
}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select(SELECT_FIELDS)
        .is('deleted_at', null)
        .order('priority', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.condition_type) q = q.eq('condition_type', filters.condition_type);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WhatsAppRoutingRule[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (input: CreateRoutingRuleInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await (supabase.from(TABLE) as any)
        .insert({
          ...input,
          tenant_id: tenant?.id,
          condition_params: input.condition_params || {},
        })
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppRoutingRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Regra criada com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRoutingRuleInput) => {
      const { data, error } = await (supabase.from(TABLE) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppRoutingRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Regra atualizada');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(TABLE) as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Regra removida');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(vars.is_active ? 'Regra ativada' : 'Regra desativada');
    },
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        (supabase.from(TABLE) as any)
          .update({ priority: (index + 1) * 10 })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ordem atualizada');
    },
  });

  return {
    rules: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    toggleActive,
    reorder,
  };
}
