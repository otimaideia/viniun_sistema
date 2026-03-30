// =============================================================================
// USE WAHA CONFIG ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para configuração WAHA usando tabelas MT
// SISTEMA 100% MT - Suporta configuração por EMPRESA e por FRANQUIA
//
// Hierarquia de configuração:
// 1. Franquia específica (franchise_id IS NOT NULL)
// 2. Empresa/Tenant global (franchise_id IS NULL)
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { wahaApi } from '@/services/waha-api';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { toast } from 'sonner';
import type { WahaConfigRow, WahaConfigInput, WahaEngine } from '@/types/whatsapp';

const DEBUG = import.meta.env.DEV;

// Helper para sincronizar config com todos os clientes WAHA
function syncWahaConfig(apiUrl: string, apiKey: string, webhookUrl?: string) {
  if (DEBUG) console.log('[useWahaConfigAdapter] Sincronizando config com wahaApi e wahaClient...');
  wahaApi.setConfig(apiUrl, apiKey);
  // Definir config diretamente no wahaClient (evita re-query ao banco que pode falhar por RLS)
  wahaClient.setConfig(apiUrl, apiKey, webhookUrl || undefined);
}

// =============================================================================
// Types
// =============================================================================

interface MTWahaConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  api_url: string;
  api_key: string;
  webhook_base_url: string | null;
  enabled: boolean;
  default_engine: WahaEngine;
  created_at: string;
  updated_at: string;
}

export interface WahaConfigWithLevel extends WahaConfigRow {
  config_level: 'tenant' | 'franchise';
  franchise_id?: string | null;
  franchise_name?: string;
}

const QUERY_KEY = 'mt-waha-config';

// =============================================================================
// Hook Principal - Busca config efetiva (considera hierarquia franchise > tenant)
// =============================================================================

export function useWahaConfigAdapter(franchiseIdOverride?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Usar franchise do contexto ou override
  const targetFranchiseId = franchiseIdOverride || franchise?.id;

  // ==========================================================================
  // Query: Buscar configuração WAHA efetiva
  // Prioridade:
  //   1. mt_waha_config com franchise_id específico (se franchise definida)
  //   2. mt_waha_config do tenant (franchise_id IS NULL)
  //   3. mt_whatsapp_sessions (fallback)
  //   4. mt_tenant_integrations (fallback antigo)
  // ==========================================================================
  const { data: config, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, targetFranchiseId],
    queryFn: async (): Promise<WahaConfigWithLevel | null> => {
      if (!tenant && accessLevel !== 'platform') {
        if (DEBUG) console.log('[useWahaConfigAdapter] Sem tenant e não é platform admin');
        return null;
      }

      try {
        // PRIORIDADE 1: Buscar config da FRANQUIA específica (se houver)
        if (targetFranchiseId) {
          if (DEBUG) console.log('[useWahaConfigAdapter] Buscando config da franquia:', targetFranchiseId);
          const { data: franchiseConfig, error: franchiseError } = await supabase
            .from('mt_waha_config')
            .select('*, franchise:mt_franchises(nome)')
            .eq('franchise_id', targetFranchiseId)
            .maybeSingle();

          if (!franchiseError && franchiseConfig?.api_url && franchiseConfig?.api_key) {
            if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config encontrada para franquia');
            syncWahaConfig(franchiseConfig.api_url, franchiseConfig.api_key, franchiseConfig.webhook_url);

            return {
              id: franchiseConfig.id,
              api_url: franchiseConfig.api_url,
              api_key: franchiseConfig.api_key,
              webhook_base_url: franchiseConfig.webhook_base_url || null,
              enabled: franchiseConfig.enabled,
              default_engine: (franchiseConfig.default_engine as WahaEngine) || 'NOWEB',
              created_at: franchiseConfig.created_at,
              updated_at: franchiseConfig.updated_at,
              updated_by: franchiseConfig.updated_by || null,
              config_level: 'franchise',
              franchise_id: franchiseConfig.franchise_id,
              franchise_name: (franchiseConfig.franchise as any)?.nome || undefined,
            };
          }
        }

        // PRIORIDADE 2: Buscar config do TENANT (global)
        if (DEBUG) console.log('[useWahaConfigAdapter] Buscando config do tenant...');
        let wahaConfigQuery = supabase
          .from('mt_waha_config')
          .select('*')
          .is('franchise_id', null); // Config global do tenant

        if (tenant?.id) {
          wahaConfigQuery = wahaConfigQuery.eq('tenant_id', tenant.id);
        }

        const { data: wahaConfig, error: wahaConfigError } = await wahaConfigQuery.maybeSingle();

        if (!wahaConfigError && wahaConfig?.api_url && wahaConfig?.api_key) {
          if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config encontrada para tenant (global)');
          syncWahaConfig(wahaConfig.api_url, wahaConfig.api_key, wahaConfig.webhook_url);

          return {
            id: wahaConfig.id,
            api_url: wahaConfig.api_url,
            api_key: wahaConfig.api_key,
            webhook_base_url: wahaConfig.webhook_base_url || null,
            enabled: wahaConfig.enabled,
            default_engine: (wahaConfig.default_engine as WahaEngine) || 'NOWEB',
            created_at: wahaConfig.created_at,
            updated_at: wahaConfig.updated_at,
            updated_by: wahaConfig.updated_by || null,
            config_level: 'tenant',
            franchise_id: null,
          };
        }

        if (wahaConfigError) {
          console.warn('[useWahaConfigAdapter] Erro ao buscar mt_waha_config:', wahaConfigError.message);
        } else {
          if (DEBUG) console.log('[useWahaConfigAdapter] mt_waha_config vazio ou incompleto');
        }

        // PRIORIDADE 2: Fallback para mt_whatsapp_sessions
        if (DEBUG) console.log('[useWahaConfigAdapter] Tentando fallback para mt_whatsapp_sessions...');
        let sessionQuery = supabase
          .from('mt_whatsapp_sessions')
          .select('waha_url, waha_api_key')
          .not('waha_url', 'is', null)
          .not('waha_api_key', 'is', null)
          .limit(1);

        if (tenant?.id) {
          sessionQuery = sessionQuery.eq('tenant_id', tenant.id);
        }

        const { data: session } = await sessionQuery.maybeSingle();

        if (session?.waha_url && session?.waha_api_key) {
          if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config encontrada em mt_whatsapp_sessions');
          syncWahaConfig(session.waha_url, session.waha_api_key);

          return {
            id: 'from-session',
            api_url: session.waha_url,
            api_key: session.waha_api_key,
            webhook_base_url: null,
            enabled: true,
            default_engine: 'NOWEB' as WahaEngine,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: null,
            config_level: 'tenant',
            franchise_id: null,
          };
        }

        // PRIORIDADE 3: Fallback para mt_tenant_integrations (estrutura antiga)
        if (DEBUG) console.log('[useWahaConfigAdapter] Tentando fallback para mt_tenant_integrations...');
        const { data: integrationType } = await supabase
          .from('mt_integration_types')
          .select('id')
          .eq('codigo', 'whatsapp')
          .maybeSingle();

        if (integrationType?.id) {
          let integrationQuery = supabase
            .from('mt_tenant_integrations')
            .select('*')
            .eq('integration_type_id', integrationType.id);

          if (tenant?.id) {
            integrationQuery = integrationQuery.eq('tenant_id', tenant.id);
          }

          const { data: integration } = await integrationQuery.maybeSingle();

          if (integration) {
            // Extrair do campo credentials (jsonb)
            const credentials = integration.credentials as { api_key?: string; waha_url?: string } | null;
            const apiUrl = credentials?.waha_url || 'https://waha.yeslaserpraiagrande.com.br';
            const apiKey = credentials?.api_key || '';

            // Verificar se não é placeholder
            if (apiKey && apiKey !== 'encrypted_key' && apiKey.length > 10) {
              if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config encontrada em mt_tenant_integrations');
              syncWahaConfig(apiUrl, apiKey);

              return {
                id: integration.id,
                api_url: apiUrl,
                api_key: apiKey,
                webhook_base_url: null,
                enabled: integration.is_active,
                default_engine: 'NOWEB' as WahaEngine,
                created_at: integration.created_at,
                updated_at: integration.updated_at,
                updated_by: null,
                config_level: 'tenant',
                franchise_id: null,
              };
            }
          }
        }

        console.warn('[useWahaConfigAdapter] Nenhuma configuração WAHA encontrada');
        return null;
      } catch (err) {
        console.error('[useWahaConfigAdapter] Erro ao buscar config:', err);
        throw err;
      }
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Salvar configuração em mt_waha_config
  // Suporta salvar para tenant (franchise_id=null) ou franquia específica
  // ==========================================================================
  const saveConfigMutation = useMutation({
    mutationFn: async (input: WahaConfigInput & { franchise_id?: string | null }): Promise<WahaConfigWithLevel> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Determinar se é config de franquia ou tenant
      const targetFranchiseIdForSave = input.franchise_id !== undefined ? input.franchise_id : targetFranchiseId;
      const isForFranchise = !!targetFranchiseIdForSave;

      if (DEBUG) console.log(`[useWahaConfigAdapter] Salvando config para ${isForFranchise ? 'franquia: ' + targetFranchiseIdForSave : 'tenant (global)'}...`);

      // Verificar se já existe config
      let existingQuery = supabase
        .from('mt_waha_config')
        .select('id');

      if (tenant?.id) {
        existingQuery = existingQuery.eq('tenant_id', tenant.id);
      }

      if (isForFranchise) {
        existingQuery = existingQuery.eq('franchise_id', targetFranchiseIdForSave);
      } else {
        existingQuery = existingQuery.is('franchise_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      const payload = {
        api_url: input.api_url,
        api_key: input.api_key || null,
        webhook_base_url: input.webhook_base_url || null,
        enabled: input.enabled,
        default_engine: input.default_engine || 'NOWEB',
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (existing) {
        // Atualizar
        const { data, error } = await supabase
          .from('mt_waha_config')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config atualizada');

        return {
          id: data.id,
          api_url: data.api_url,
          api_key: data.api_key || '',
          webhook_base_url: data.webhook_base_url || null,
          enabled: data.enabled,
          default_engine: (data.default_engine as WahaEngine) || 'NOWEB',
          created_at: data.created_at,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
          config_level: isForFranchise ? 'franchise' : 'tenant',
          franchise_id: data.franchise_id,
        };
      } else {
        // Inserir novo
        const { data, error } = await supabase
          .from('mt_waha_config')
          .insert({
            ...payload,
            tenant_id: tenant?.id,
            franchise_id: isForFranchise ? targetFranchiseIdForSave : null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        if (DEBUG) console.log('[useWahaConfigAdapter] ✓ Config criada');

        return {
          id: data.id,
          api_url: input.api_url,
          api_key: input.api_key || '',
          webhook_base_url: input.webhook_base_url || null,
          enabled: input.enabled,
          default_engine: input.default_engine || 'NOWEB',
          created_at: data.created_at,
          updated_at: data.updated_at,
          updated_by: user.id,
          config_level: isForFranchise ? 'franchise' : 'tenant',
          franchise_id: isForFranchise ? targetFranchiseIdForSave : null,
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

      // Atualizar credenciais em todos os serviços
      if (data?.api_url && data?.api_key) {
        syncWahaConfig(data.api_url, data.api_key);
      }

      toast.success('Configurações WAHA salvas com sucesso!');
    },
    onError: (error) => {
      console.error('[useWahaConfigAdapter] Erro ao salvar config:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar: ${message}`);
    },
  });

  // ==========================================================================
  // Mutation: Testar conexão
  // ==========================================================================
  const testConnectionMutation = useMutation({
    mutationFn: async ({ apiUrl, apiKey }: { apiUrl: string; apiKey: string }) => {
      // Configura temporariamente para teste (sincroniza ambos os serviços)
      syncWahaConfig(apiUrl, apiKey);
      const result = await wahaApi.testConnection();
      return result;
    },
  });

  // ==========================================================================
  // Effect: Sincronizar config quando carregada
  // ==========================================================================
  useEffect(() => {
    if (config?.api_url && config?.api_key) {
      if (DEBUG) console.log('[useWahaConfigAdapter] Sincronizando config carregada com wahaClient...');
      syncWahaConfig(config.api_url, config.api_key, (config as any).webhook_url);
    }
  }, [config?.api_url, config?.api_key]);

  return {
    config,
    isLoading: isLoading || isTenantLoading,
    error,
    saveConfig: saveConfigMutation.mutate,
    isSaving: saveConfigMutation.isPending,
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: Listar TODAS as configs do tenant (global + franquias)
// =============================================================================

export function useWahaConfigList() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const { data: configs, isLoading, error, refetch } = useQuery({
    queryKey: ['mt-waha-config-list', tenant?.id],
    queryFn: async (): Promise<WahaConfigWithLevel[]> => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let query = supabase
        .from('mt_waha_config')
        .select(`
          *,
          franchise:mt_franchises(id, nome, cidade, estado)
        `)
        .order('franchise_id', { ascending: true, nullsFirst: true });

      if (tenant?.id) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useWahaConfigList] Erro:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        api_url: item.api_url,
        api_key: item.api_key || '',
        webhook_base_url: item.webhook_base_url || null,
        enabled: item.enabled,
        default_engine: (item.default_engine as WahaEngine) || 'NOWEB',
        created_at: item.created_at,
        updated_at: item.updated_at,
        updated_by: item.updated_by,
        config_level: item.franchise_id ? 'franchise' : 'tenant',
        franchise_id: item.franchise_id,
        franchise_name: item.franchise?.nome || (item.franchise_id ? 'Franquia' : 'Configuração Global'),
      })) as WahaConfigWithLevel[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Deletar config de franquia
  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('mt_waha_config')
        .delete()
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-config-list'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Configuração removida');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao remover: ${message}`);
    },
  });

  return {
    configs: configs || [],
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    deleteConfig: deleteConfigMutation.mutate,
    isDeleting: deleteConfigMutation.isPending,
  };
}

// Re-exportar tipos
export type { WahaConfigRow, WahaConfigInput, WahaEngine } from '@/types/whatsapp';

// Helper: Verificar modo atual (sempre MT)
export function getWahaConfigMode(): 'mt' {
  return 'mt';
}

export default useWahaConfigAdapter;
