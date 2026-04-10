// =============================================================================
// USE EMAIL CAMPAIGNS MT - Hook Multi-Tenant para Campanhas de Email
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTEmailCampaign,
  MTEmailTemplate,
  CampaignStatus,
} from '@/types/email-mkt-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CAMPAIGNS_KEY = 'mt-email-campaigns';
const TEMPLATES_KEY = 'mt-email-templates';

// -----------------------------------------------------------------------------
// Hook: Campanhas de Email
// -----------------------------------------------------------------------------

export function useEmailCampaignsMT(statusFilter?: CampaignStatus) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Campanhas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [CAMPAIGNS_KEY, tenant?.id, statusFilter],
    queryFn: async (): Promise<MTEmailCampaign[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_email_campaigns')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (statusFilter) {
        q = q.eq('status', statusFilter);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar campanhas email MT:', error);
        throw error;
      }

      return (data || []) as MTEmailCampaign[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Campanha
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTEmailCampaign>): Promise<MTEmailCampaign> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_email_campaigns')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          status: newItem.status || 'rascunho',
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar campanha email MT:', error);
        throw error;
      }

      return data as MTEmailCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
      toast.success(`Campanha "${data.nome}" criada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar campanha.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Campanha
  // ---------------------------------------------------------------------------

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTEmailCampaign>): Promise<MTEmailCampaign> => {
      if (!id) throw new Error('ID da campanha é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_email_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar campanha email MT:', error);
        throw error;
      }

      return data as MTEmailCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
      toast.success(`Campanha "${data.nome}" atualizada com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar campanha.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Campanha
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_email_campaigns')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover campanha email MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });
      toast.success('Campanha removida com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover campanha.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

// -----------------------------------------------------------------------------
// Hook: Templates de Email
// -----------------------------------------------------------------------------

export function useEmailTemplatesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [TEMPLATES_KEY, tenant?.id],
    queryFn: async (): Promise<MTEmailTemplate[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_email_templates')
        .select('*')
        .order('nome', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar templates email MT:', error);
        throw error;
      }

      return (data || []) as MTEmailTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 10,
  });

  const createTemplate = useMutation({
    mutationFn: async (newItem: Partial<MTEmailTemplate>): Promise<MTEmailTemplate> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_email_templates')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          is_active: newItem.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar template email MT:', error);
        throw error;
      }

      return data as MTEmailTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success(`Template "${data.nome}" criado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao criar template.');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTEmailTemplate>): Promise<MTEmailTemplate> => {
      if (!id) throw new Error('ID do template é obrigatório.');

      const { data, error } = await supabase
        .from('mt_property_email_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar template email MT:', error);
        throw error;
      }

      return data as MTEmailTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success(`Template "${data.nome}" atualizado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar template.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    createTemplate,
    updateTemplate,
  };
}
