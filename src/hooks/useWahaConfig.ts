import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { wahaApi } from "@/services/waha-api";
import { useTenantContext } from "@/contexts/TenantContext";
import type { WahaConfigRow, WahaConfigInput, WahaEngine } from "@/types/whatsapp";

export function useWahaConfig() {
  const queryClient = useQueryClient();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Buscar configuração atual
  // Prioridade: config da franquia > config do tenant
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["waha-config", tenant?.id, franchise?.id],
    queryFn: async () => {
      // Primeiro tenta buscar config específica da franquia
      if (franchise?.id) {
        const { data: franchiseConfig, error: franchiseError } = await supabase
          .from("mt_waha_config")
          .select("*")
          .eq("franchise_id", franchise.id)
          .maybeSingle();

        if (!franchiseError && franchiseConfig) {
          if (franchiseConfig?.api_url && franchiseConfig?.api_key) {
            wahaApi.setConfig(franchiseConfig.api_url, franchiseConfig.api_key);
          }
          return franchiseConfig as WahaConfigRow | null;
        }
      }

      // Se não encontrou, busca config do tenant (franchise_id IS NULL)
      const { data, error } = await supabase
        .from("mt_waha_config")
        .select("*")
        .is("franchise_id", null)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configuração WAHA:", error);
        throw error;
      }

      // Configurar o serviço com as credenciais carregadas
      if (data?.api_url && data?.api_key) {
        wahaApi.setConfig(data.api_url, data.api_key);
      }

      return data as WahaConfigRow | null;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Salvar/atualizar configuração
  const saveConfigMutation = useMutation({
    mutationFn: async (input: WahaConfigInput) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Usuário não autenticado");
      }

      if (!tenant?.id && accessLevel !== 'platform') {
        throw new Error("Tenant não identificado");
      }

      // Verificar se já existe uma configuração para este tenant/franchise
      let query = supabase
        .from("mt_waha_config")
        .select("id");

      // Franchise admin: busca config da sua franquia
      if (accessLevel === 'franchise' && franchise?.id) {
        query = query.eq("franchise_id", franchise.id);
      } else {
        // Tenant admin: busca config geral do tenant
        query = query.is("franchise_id", null);
      }

      const { data: existing, error: existingError } = await query.maybeSingle();

      if (existingError) {
        console.error("Erro ao verificar config existente:", existingError);
        throw new Error(`Erro ao verificar configuração: ${existingError.message}`);
      }

      const payload = {
        api_url: input.api_url,
        api_key: input.api_key || null,
        webhook_base_url: input.webhook_base_url || null,
        webhook_url: input.webhook_url || null,
        enabled: input.enabled,
        default_engine: input.default_engine,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (existing) {
        // Atualizar
        const { data, error } = await supabase
          .from("mt_waha_config")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar config:", error);
          throw new Error(`Erro ao atualizar: ${error.message}`);
        }
        return data;
      } else {
        // Inserir novo com tenant_id e franchise_id corretos
        const insertPayload = {
          ...payload,
          tenant_id: tenant?.id,
          franchise_id: accessLevel === 'franchise' ? franchise?.id : null,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("mt_waha_config")
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          console.error("Erro ao inserir config:", error);
          throw new Error(`Erro ao inserir: ${error.message}`);
        }
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["waha-config"] });
      
      // Atualizar credenciais no serviço
      if (data?.api_url && data?.api_key) {
        wahaApi.setConfig(data.api_url, data.api_key);
      }
      
      toast.success("Configurações WAHA salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar configuração WAHA:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao salvar: ${message}`);
    },
  });

  // Testar conexão
  const testConnectionMutation = useMutation({
    mutationFn: async ({ apiUrl, apiKey }: { apiUrl: string; apiKey: string }) => {
      // Configura temporariamente para teste
      wahaApi.setConfig(apiUrl, apiKey);
      const result = await wahaApi.testConnection();
      return result;
    },
  });

  return {
    config,
    isLoading,
    error,
    saveConfig: saveConfigMutation.mutate,
    isSaving: saveConfigMutation.isPending,
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,
  };
}
