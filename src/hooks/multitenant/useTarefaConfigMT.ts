import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTTaskConfig } from '@/types/tarefa';

const DEFAULT_CONFIG: Omit<MTTaskConfig, 'id' | 'tenant_id' | 'franchise_id' | 'created_at' | 'updated_at'> = {
  notif_whatsapp_enabled: true,
  notif_email_enabled: true,
  notif_inapp_enabled: true,
  notif_whatsapp_cc: [],
  notif_email_cc: [],
  notif_on_criacao: true,
  notif_on_status_change: true,
  notif_on_comment: true,
  notif_on_overdue: true,
  notif_on_completion: true,
  overdue_alert_hours: 24,
  overdue_repeat_hours: 24,
};

export function useTarefaConfigMT() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-task-config', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant?.id && accessLevel !== 'platform') return null;

      // Tentar config específica da franquia primeiro
      if (franchise?.id) {
        const { data: franchiseConfig } = await (supabase
          .from('mt_task_config') as any)
          .select('*')
          .eq('tenant_id', tenant!.id)
          .eq('franchise_id', franchise.id)
          .maybeSingle();

        if (franchiseConfig) return franchiseConfig as MTTaskConfig;

        // Fallback: config do tenant (franchise_id IS NULL)
        const { data: tenantConfig } = await (supabase
          .from('mt_task_config') as any)
          .select('*')
          .eq('tenant_id', tenant!.id)
          .is('franchise_id', null)
          .maybeSingle();

        return tenantConfig as MTTaskConfig | null;
      }

      // Sem franquia: config do tenant
      const { data } = await (supabase
        .from('mt_task_config') as any)
        .select('*')
        .eq('tenant_id', tenant!.id)
        .is('franchise_id', null)
        .maybeSingle();

      return data as MTTaskConfig | null;
    },
    enabled: !!tenant?.id || accessLevel === 'platform',
  });

  const save = useMutation({
    mutationFn: async (updates: Partial<MTTaskConfig> & { franchise_id?: string | null }) => {
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
          .from('mt_task_config') as any)
          .update(payload)
          .eq('id', query.data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('mt_task_config') as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-config'] });
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
