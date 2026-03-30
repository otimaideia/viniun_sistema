import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  FormularioCampo,
  FormularioCampoInsert,
  FormularioCampoUpdate,
} from "@/types/formulario";

/**
 * @deprecated Use useFormularioCamposAdapter instead for proper multi-tenant isolation.
 */
export function useFormularioCampos(formularioId: string) {
  const queryClient = useQueryClient();

  // Query para listar campos
  const {
    data: campos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["formulario-campos", formularioId],
    queryFn: async (): Promise<FormularioCampo[]> => {
      if (!formularioId) return [];

      const { data, error } = await supabase
        .from("mt_form_fields")
        .select("*")
        .eq("form_id", formularioId)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("Erro ao buscar campos:", error);
        throw error;
      }

      return (data || []) as FormularioCampo[];
    },
    enabled: !!formularioId,
  });

  // Mutation para criar campo
  const createMutation = useMutation({
    mutationFn: async (campo: Omit<FormularioCampoInsert, "formulario_id">) => {
      const campoData = {
        form_id: formularioId,
        nome: campo.nome,
        tipo: campo.tipo,
        label: campo.label,
        placeholder: campo.placeholder || null,
        obrigatorio: campo.obrigatorio ?? false,
        ordem: campo.ordem ?? 0,
        largura: campo.largura || "full",
        ativo: campo.ativo ?? true,
        opcoes: campo.opcoes && campo.opcoes.length > 0 ? campo.opcoes : null,
        mascara: campo.mascara || null,
        etapa: campo.etapa || 1,
        campo_lead: campo.campo_lead || null,
        min_length: campo.min_length || null,
        max_length: campo.max_length || null,
        pattern: campo.pattern || null,
        mensagem_erro: campo.mensagem_erro || null,
        condicao_campo: campo.condicao_campo || null,
        condicao_valor: campo.condicao_valor || null,
        indicados_config: campo.indicados_config || null,
      };

      const { data, error } = await supabase
        .from("mt_form_fields")
        .insert(campoData)
        .select()
        .single();

      if (error) throw error;
      return data as FormularioCampo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-campos", formularioId] });
      toast.success("Campo adicionado!");
    },
    onError: (error) => {
      console.error("Erro ao criar campo:", error);
      toast.error("Erro ao adicionar campo");
    },
  });

  // Mutation para atualizar campo
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: FormularioCampoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("mt_form_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FormularioCampo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-campos", formularioId] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar campo:", error);
      toast.error("Erro ao atualizar campo");
    },
  });

  // Mutation para deletar campo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_form_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-campos", formularioId] });
      toast.success("Campo removido!");
    },
    onError: (error) => {
      console.error("Erro ao deletar campo:", error);
      toast.error("Erro ao remover campo");
    },
  });

  // Reordenar campos
  const reorderCampos = async (reorderedCampos: { id: string; ordem: number }[]): Promise<boolean> => {
    try {
      const updates = reorderedCampos.map(({ id, ordem }) =>
        supabase
          .from("mt_form_fields")
          .update({ ordem })
          .eq("id", id)
      );

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["formulario-campos", formularioId] });
      return true;
    } catch (err) {
      console.error("Erro ao reordenar campos:", err);
      toast.error("Erro ao reordenar campos");
      return false;
    }
  };

  // Criar campos em lote
  const bulkCreateCampos = async (camposToCreate: Omit<FormularioCampoInsert, "formulario_id">[]): Promise<FormularioCampo[]> => {
    const camposWithFormId = camposToCreate.map((campo) => ({
      form_id: formularioId,
      nome: campo.nome,
      tipo: campo.tipo,
      label: campo.label,
      placeholder: campo.placeholder || null,
      obrigatorio: campo.obrigatorio ?? false,
      ordem: campo.ordem ?? 0,
      largura: campo.largura || "full",
      ativo: campo.ativo ?? true,
      opcoes: campo.opcoes && campo.opcoes.length > 0 ? campo.opcoes : null,
      mascara: campo.mascara || null,
      etapa: campo.etapa || 1,
      campo_lead: campo.campo_lead || null,
      indicados_config: campo.indicados_config || null,
    }));

    const { data, error } = await supabase
      .from("mt_form_fields")
      .insert(camposWithFormId)
      .select();

    if (error) {
      console.error("Erro ao criar campos em lote:", error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ["formulario-campos", formularioId] });
    return (data || []) as FormularioCampo[];
  };

  return {
    campos,
    isLoading,
    error,
    refetch,
    createCampo: createMutation.mutate,
    updateCampo: updateMutation.mutate,
    deleteCampo: deleteMutation.mutate,
    reorderCampos,
    bulkCreateCampos,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
