import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  WhatsAppProvider,
  CreateProviderInput,
  UpdateProviderInput,
  ProviderType,
} from '@/types/whatsapp-hybrid';

const TABLE = 'mt_whatsapp_providers';
const QUERY_KEY = 'mt-wa-providers';

const SELECT_FIELDS = `
  *,
  tenant:mt_tenants(slug, nome_fantasia),
  franchise:mt_franchises(nome, cidade),
  session:mt_whatsapp_sessions(id, nome, status)
`;

export function useWhatsAppProvidersMT(filters?: {
  franchise_id?: string;
  provider_type?: ProviderType;
  status?: string;
  is_active?: boolean;
}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, filters],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select(SELECT_FIELDS)
        .is('deleted_at', null)
        .order('priority', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);
      if (filters?.provider_type) q = q.eq('provider_type', filters.provider_type);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WhatsAppProvider[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (input: CreateProviderInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await (supabase.from(TABLE) as any)
        .insert({
          ...input,
          tenant_id: tenant?.id,
          franchise_id: input.franchise_id || franchise?.id,
        })
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Provider criado com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao criar provider: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateProviderInput) => {
      const { data, error } = await (supabase.from(TABLE) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Provider atualizado');
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
      toast.success('Provider removido');
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
      toast.success(vars.is_active ? 'Provider ativado' : 'Provider desativado');
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // Buscar provider no cache para determinar escopo de tenant
      const provider = query.data?.find(p => p.id === id);
      if (!provider) throw new Error('Provider não encontrado');

      // Remove default anterior (escopo: tenant_id)
      const { error: clearError } = await (supabase.from(TABLE) as any)
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('tenant_id', provider.tenant_id)
        .eq('is_default', true);

      if (clearError) throw clearError;

      // Define novo default
      const { error } = await (supabase.from(TABLE) as any)
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Provider definido como padrão');
    },
  });

  // Providers separados por tipo
  const wahaProviders = query.data?.filter(p => p.provider_type === 'waha') || [];
  const metaProviders = query.data?.filter(p => p.provider_type === 'meta_cloud_api') || [];
  const defaultProvider = query.data?.find(p => p.is_default && p.is_active);

  return {
    providers: query.data || [],
    wahaProviders,
    metaProviders,
    defaultProvider,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
    toggleActive,
    setDefault,
  };
}

// Hook para provider individual
export function useWhatsAppProviderMT(providerId?: string) {
  const { isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [QUERY_KEY, 'detail', providerId],
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE) as any)
        .select(SELECT_FIELDS)
        .eq('id', providerId)
        .single();
      if (error) throw error;
      return data as WhatsAppProvider;
    },
    enabled: !isTenantLoading && !!providerId,
  });

  return {
    provider: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
  };
}
