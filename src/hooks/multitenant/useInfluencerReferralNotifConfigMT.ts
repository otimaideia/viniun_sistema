import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralNotifConfig {
  id?: string;
  tenant_id?: string;
  franchise_id?: string | null;
  auto_send_whatsapp_enabled: boolean;
  auto_send_email_enabled: boolean;
  auto_send_on_indicacao_criada: boolean;
  auto_send_copy_to_influencer: boolean;
  message_template: string | null;
  whatsapp_cc: string[];
  email_cc: string[];
}

export const DEFAULT_REFERRAL_NOTIF_CONFIG: ReferralNotifConfig = {
  auto_send_whatsapp_enabled: true,
  auto_send_email_enabled: false,
  auto_send_on_indicacao_criada: true,
  auto_send_copy_to_influencer: false,
  message_template: null,
  whatsapp_cc: [],
  email_cc: [],
};

const QUERY_KEY = 'mt-influencer-referral-notif-config';

export function useInfluencerReferralNotifConfigMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      // Try franchise-specific config first
      if (franchise?.id) {
        const { data } = await supabase
          .from('mt_influencer_referral_notif_config')
          .select('*')
          .eq('tenant_id', tenant!.id)
          .eq('franchise_id', franchise.id)
          .maybeSingle();
        if (data) return data as ReferralNotifConfig;
      }

      // Fallback to tenant-level config
      const { data } = await supabase
        .from('mt_influencer_referral_notif_config')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .is('franchise_id', null)
        .maybeSingle();

      return (data as ReferralNotifConfig) || null;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const save = useMutation({
    mutationFn: async (updates: Partial<ReferralNotifConfig>) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const payload = {
        ...updates,
        tenant_id: tenant.id,
        franchise_id: franchise?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (query.data?.id) {
        const { error } = await supabase
          .from('mt_influencer_referral_notif_config')
          .update(payload)
          .eq('id', query.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mt_influencer_referral_notif_config')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Configurações salvas');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    config: query.data,
    defaults: DEFAULT_REFERRAL_NOTIF_CONFIG,
    isLoading: query.isLoading || isTenantLoading,
    save,
  };
}
