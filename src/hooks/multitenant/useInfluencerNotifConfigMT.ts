import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MTInfluencerNotifConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  notif_whatsapp_enabled: boolean;
  notif_email_enabled: boolean;
  notif_whatsapp_cc: string[];
  notif_email_cc: string[];
  notif_on_contrato_criado: boolean;
  notif_on_aditivo_gerado: boolean;
  notif_on_assinatura_confirmada: boolean;
  notif_on_contrato_encerrado: boolean;
  notif_on_aprovacao: boolean;
  notif_on_pagamento: boolean;
  notif_on_post_aprovado: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONFIG: Omit<MTInfluencerNotifConfig, 'id' | 'tenant_id' | 'franchise_id' | 'created_at' | 'updated_at'> = {
  notif_whatsapp_enabled: true,
  notif_email_enabled: true,
  notif_whatsapp_cc: [],
  notif_email_cc: [],
  notif_on_contrato_criado: true,
  notif_on_aditivo_gerado: true,
  notif_on_assinatura_confirmada: true,
  notif_on_contrato_encerrado: true,
  notif_on_aprovacao: true,
  notif_on_pagamento: false,
  notif_on_post_aprovado: false,
};

export function useInfluencerNotifConfigMT() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-influencer-notif-config', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant?.id && accessLevel !== 'platform') return null;

      // Tentar config específica da franquia primeiro
      if (franchise?.id) {
        const { data: franchiseConfig } = await (supabase
          .from('mt_influencer_notif_config') as any)
          .select('*')
          .eq('tenant_id', tenant!.id)
          .eq('franchise_id', franchise.id)
          .maybeSingle();

        if (franchiseConfig) return franchiseConfig as MTInfluencerNotifConfig;

        // Fallback: config do tenant (franchise_id IS NULL)
        const { data: tenantConfig } = await (supabase
          .from('mt_influencer_notif_config') as any)
          .select('*')
          .eq('tenant_id', tenant!.id)
          .is('franchise_id', null)
          .maybeSingle();

        return tenantConfig as MTInfluencerNotifConfig | null;
      }

      // Sem franquia: config do tenant
      const { data } = await (supabase
        .from('mt_influencer_notif_config') as any)
        .select('*')
        .eq('tenant_id', tenant!.id)
        .is('franchise_id', null)
        .maybeSingle();

      return data as MTInfluencerNotifConfig | null;
    },
    enabled: !!tenant?.id || accessLevel === 'platform',
  });

  const save = useMutation({
    mutationFn: async (updates: Partial<MTInfluencerNotifConfig> & { franchise_id?: string | null }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      const franchiseId = updates.franchise_id ?? franchise?.id ?? null;
      const payload = {
        ...updates,
        tenant_id: tenant.id,
        franchise_id: franchiseId,
        updated_at: new Date().toISOString(),
      };
      delete (payload as any).id;
      delete (payload as any).created_at;

      if (query.data?.id) {
        const { error } = await (supabase
          .from('mt_influencer_notif_config') as any)
          .update(payload)
          .eq('id', query.data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('mt_influencer_notif_config') as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-notif-config'] });
      toast.success('Configurações salvas');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  return {
    config: query.data,
    defaults: DEFAULT_CONFIG,
    isLoading: query.isLoading,
    save,
  };
}
