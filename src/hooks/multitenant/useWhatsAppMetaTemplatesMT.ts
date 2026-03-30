import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  WhatsAppMetaTemplate,
  CreateMetaTemplateInput,
  TemplateCategory,
  TemplateApprovalStatus,
} from '@/types/whatsapp-hybrid';

const TABLE = 'mt_whatsapp_meta_templates';
const QUERY_KEY = 'mt-wa-meta-templates';

const SELECT_FIELDS = `
  *,
  provider:mt_whatsapp_providers(id, nome, provider_type, phone_number)
`;

export function useWhatsAppMetaTemplatesMT(filters?: {
  provider_id?: string;
  category?: TemplateCategory;
  approval_status?: TemplateApprovalStatus;
  is_active?: boolean;
}) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters],
    queryFn: async () => {
      let q = (supabase.from(TABLE) as any)
        .select(SELECT_FIELDS)
        .is('deleted_at', null)
        .order('category')
        .order('meta_template_name');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.provider_id) q = q.eq('provider_id', filters.provider_id);
      if (filters?.category) q = q.eq('category', filters.category);
      if (filters?.approval_status) q = q.eq('approval_status', filters.approval_status);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WhatsAppMetaTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (input: CreateMetaTemplateInput) => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await (supabase.from(TABLE) as any)
        .insert({
          ...input,
          tenant_id: tenant?.id,
          meta_template_id: `tpl_${Date.now()}`, // Temporário até sync com Meta
          approval_status: 'PENDING',
        })
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppMetaTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template criado (pendente aprovação Meta)');
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateMetaTemplateInput>) => {
      const { data, error } = await (supabase.from(TABLE) as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data as WhatsAppMetaTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template atualizado');
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
      toast.success('Template removido');
    },
  });

  // Templates aprovados e ativos (para envio)
  const approvedTemplates = query.data?.filter(
    t => t.approval_status === 'APPROVED' && t.is_active
  ) || [];

  // Estatísticas
  const stats = {
    total: query.data?.length || 0,
    approved: query.data?.filter(t => t.approval_status === 'APPROVED').length || 0,
    pending: query.data?.filter(t => t.approval_status === 'PENDING').length || 0,
    rejected: query.data?.filter(t => t.approval_status === 'REJECTED').length || 0,
  };

  return {
    templates: query.data || [],
    approvedTemplates,
    stats,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}
