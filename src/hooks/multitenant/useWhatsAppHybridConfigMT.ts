import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TABLE = 'mt_whatsapp_hybrid_config';
const QUERY_KEY = 'mt-wa-hybrid-config';

export interface HybridConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Habilitação
  hybrid_enabled: boolean;
  single_provider_type: 'waha' | 'meta_cloud_api';

  // Roteamento
  auto_routing_enabled: boolean;
  prefer_free_provider: boolean;

  // Janela 24h
  window_tracking_enabled: boolean;
  auto_detect_window: boolean;

  // Custos
  budget_alerts_enabled: boolean;
  monthly_budget_limit: number;
  budget_alert_threshold: number;

  // Meta Cloud API
  meta_api_configured: boolean;
  meta_business_id: string | null;
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;

  // Fallback
  fallback_enabled: boolean;
  fallback_provider_type: 'waha' | 'meta_cloud_api';

  // Horário comercial
  business_hours_start: string;
  business_hours_end: string;
  business_days: number[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export type HybridConfigUpdate = Partial<Omit<HybridConfig,
  'id' | 'tenant_id' | 'franchise_id' | 'created_at' | 'updated_at'
>>;

export function useWhatsAppHybridConfigMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Buscar config do tenant/franchise atual
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id],
    queryFn: async () => {
      // Primeiro tentar config da franchise, depois do tenant
      let q = (supabase.from(TABLE) as any)
        .select('*')
        .eq('tenant_id', tenant?.id);

      if (franchise?.id) {
        q = q.eq('franchise_id', franchise.id);
      } else {
        q = q.is('franchise_id', null);
      }

      const { data, error } = await q.maybeSingle();
      if (error) throw error;

      // Se não tem config de franchise, buscar config do tenant
      if (!data && franchise?.id) {
        const { data: tenantConfig, error: tenantError } = await (supabase.from(TABLE) as any)
          .select('*')
          .eq('tenant_id', tenant?.id)
          .is('franchise_id', null)
          .maybeSingle();

        if (tenantError) throw tenantError;
        return tenantConfig as HybridConfig | null;
      }

      return data as HybridConfig | null;
    },
    enabled: !isTenantLoading && !!tenant,
  });

  // Criar ou atualizar config
  const saveConfig = useMutation({
    mutationFn: async (updates: HybridConfigUpdate) => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data, error } = await (supabase.from(TABLE) as any)
        .upsert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,franchise_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as HybridConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (error: Error) => toast.error(`Erro ao salvar: ${error.message}`),
  });

  // Toggle rápido do modo híbrido
  const toggleHybrid = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data, error } = await (supabase.from(TABLE) as any)
        .upsert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          hybrid_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,franchise_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as HybridConfig;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(enabled
        ? 'Modo híbrido ativado (WAHA + Meta Cloud API)'
        : 'Modo híbrido desativado (provider único)'
      );
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });

  // Estado derivado
  const config = query.data;
  const isHybridEnabled = config?.hybrid_enabled ?? false;
  const isConfigured = !!config;

  // Status geral da integração
  const integrationStatus = useMemo(() => {
    if (!config) return 'not_configured';
    if (!config.hybrid_enabled) return 'single_provider';
    if (!config.meta_api_configured) return 'hybrid_incomplete';
    return 'hybrid_active';
  }, [config]);

  const statusLabel = useMemo(() => {
    switch (integrationStatus) {
      case 'not_configured': return 'Não configurado';
      case 'single_provider': return config?.single_provider_type === 'waha' ? 'WAHA (Gratuito)' : 'Meta Cloud API';
      case 'hybrid_incomplete': return 'Híbrido (Meta API não configurada)';
      case 'hybrid_active': return 'Híbrido Ativo';
      default: return 'Desconhecido';
    }
  }, [integrationStatus, config?.single_provider_type]);

  return {
    config,
    isHybridEnabled,
    isConfigured,
    integrationStatus,
    statusLabel,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    saveConfig,
    toggleHybrid,

    // Permissões
    canConfigure: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
  };
}
