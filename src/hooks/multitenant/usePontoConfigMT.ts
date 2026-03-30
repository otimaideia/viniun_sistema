import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PontoConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  notif_whatsapp_enabled: boolean;
  notif_email_enabled: boolean;
  notif_whatsapp_cc: string[];
  notif_email_cc: string[];
  notif_on_entrada: boolean;
  notif_on_saida: boolean;
  require_selfie: boolean;
  require_geo: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONFIG: Omit<PontoConfig, 'id' | 'tenant_id' | 'franchise_id' | 'created_at' | 'updated_at'> = {
  notif_whatsapp_enabled: true,
  notif_email_enabled: true,
  notif_whatsapp_cc: [],
  notif_email_cc: [],
  notif_on_entrada: true,
  notif_on_saida: true,
  require_selfie: true,
  require_geo: false,
};

export function usePontoConfigMT() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-ponto-config', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant?.id && accessLevel !== 'platform') return null;

      let q = supabase
        .from('mt_ponto_config')
        .select('*');

      if (tenant?.id) q = q.eq('tenant_id', tenant.id);

      // Try franchise-specific first, then tenant-wide
      if (franchise?.id) {
        const { data: franchiseConfig } = await q.eq('franchise_id', franchise.id).maybeSingle();
        if (franchiseConfig) return franchiseConfig as PontoConfig;

        // Fallback: tenant-wide config (franchise_id IS NULL)
        const { data: tenantConfig } = await supabase
          .from('mt_ponto_config')
          .select('*')
          .eq('tenant_id', tenant!.id)
          .is('franchise_id', null)
          .maybeSingle();
        return tenantConfig as PontoConfig | null;
      }

      // No franchise: get tenant-wide config
      const { data } = await q.is('franchise_id', null).maybeSingle();
      return data as PontoConfig | null;
    },
    enabled: !!tenant?.id || accessLevel === 'platform',
  });

  const save = useMutation({
    mutationFn: async (updates: Partial<PontoConfig> & { franchise_id?: string | null }) => {
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
        // Update existing
        const { error } = await supabase
          .from('mt_ponto_config')
          .update(payload)
          .eq('id', query.data.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('mt_ponto_config')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ponto-config'] });
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
