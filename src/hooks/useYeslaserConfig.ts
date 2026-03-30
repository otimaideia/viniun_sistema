import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface YeslaserApiConfigRow {
  id: string;
  usuario: string;
  senha: string;
  agencia_id: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface YeslaserConfigInput {
  usuario: string;
  senha: string;
  agencia_id?: number | null;
  enabled: boolean;
}

export function useYeslaserConfig() {
  const queryClient = useQueryClient();

  // Buscar configuração atual
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["yeslaser-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_api_config")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configuração:", error);
        throw error;
      }

      return data as YeslaserApiConfigRow | null;
    },
  });

  // Salvar/atualizar configuração
  const saveConfigMutation = useMutation({
    mutationFn: async (input: YeslaserConfigInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Verificar se já existe uma configuração
      const { data: existing } = await supabase
        .from("mt_api_config")
        .select("id")
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { data, error } = await supabase
          .from("mt_api_config")
          .update({
            usuario: input.usuario,
            senha: input.senha,
            agencia_id: input.agencia_id,
            enabled: input.enabled,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Inserir novo
        const { data, error } = await supabase
          .from("mt_api_config")
          .insert({
            usuario: input.usuario,
            senha: input.senha,
            agencia_id: input.agencia_id,
            enabled: input.enabled,
            updated_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yeslaser-config"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    config,
    isLoading,
    error,
    saveConfig: saveConfigMutation.mutate,
    isSaving: saveConfigMutation.isPending,
  };
}
