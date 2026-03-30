import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FormularioTemplate, FormularioTemplateCategoria } from "@/types/formulario";
import { TEMPLATE_CATEGORIAS } from "@/types/formulario";

interface UseFormularioTemplatesOptions {
  categoria?: FormularioTemplateCategoria;
  onlySystem?: boolean;
}

export function useFormularioTemplates(options: UseFormularioTemplatesOptions = {}) {
  const queryClient = useQueryClient();

  // Query para listar templates
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["formulario-templates", options.categoria, options.onlySystem],
    queryFn: async (): Promise<FormularioTemplate[]> => {
      let query = supabase
        .from("mt_form_templates")
        .select("*")
        .order("uso_count", { ascending: false });

      if (options.categoria) {
        query = query.eq("categoria", options.categoria);
      }

      if (options.onlySystem) {
        query = query.eq("is_sistema", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar templates:", error);
        throw error;
      }

      return (data || []) as FormularioTemplate[];
    },
  });

  // Buscar template por ID
  const getTemplate = async (id: string): Promise<FormularioTemplate | null> => {
    const { data, error } = await supabase
      .from("mt_form_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar template:", error);
      return null;
    }

    return data as FormularioTemplate | null;
  };

  // Criar formulário a partir de template
  const createFromTemplate = async (
    templateId: string,
    franqueadoId: string,
    nome: string,
    slug: string
  ) => {
    const template = await getTemplate(templateId);
    if (!template) {
      toast.error("Template não encontrado");
      return null;
    }

    try {
      // Criar formulário com configurações do template
      const formularioData = {
        franqueado_id: franqueadoId,
        nome,
        slug,
        status: "rascunho",
        ativo: false,
        ...template.config,
      };

      const { data: formulario, error: formError } = await supabase
        .from("mt_forms")
        .insert(formularioData)
        .select()
        .single();

      if (formError) throw formError;

      // Criar campos do template
      if (template.campos && template.campos.length > 0) {
        const camposData = template.campos.map((campo, index) => ({
          formulario_id: formulario.id,
          nome: campo.nome || `campo_${index}`,
          tipo: campo.tipo || "text",
          label: campo.label || `Campo ${index + 1}`,
          placeholder: campo.placeholder || null,
          obrigatorio: campo.obrigatorio ?? false,
          ordem: campo.ordem ?? index,
          largura: campo.largura || "full",
          ativo: true,
          opcoes: campo.opcoes || null,
          mascara: campo.mascara || null,
          etapa: campo.etapa || 1,
          campo_lead: campo.campo_lead || null,
        }));

        const { error: camposError } = await supabase
          .from("mt_form_fields")
          .insert(camposData);

        if (camposError) {
          console.error("Erro ao criar campos:", camposError);
        }
      }

      // Incrementar contador de uso do template
      await supabase
        .from("mt_form_templates")
        .update({ uso_count: (template.uso_count || 0) + 1 })
        .eq("id", templateId);

      queryClient.invalidateQueries({ queryKey: ["formularios"] });
      queryClient.invalidateQueries({ queryKey: ["formulario-templates"] });

      toast.success("Formulário criado a partir do template!");
      return formulario;
    } catch (error) {
      console.error("Erro ao criar formulário a partir do template:", error);
      toast.error("Erro ao criar formulário");
      return null;
    }
  };

  // Mutation para criar template personalizado
  const createMutation = useMutation({
    mutationFn: async (template: Omit<FormularioTemplate, "id" | "created_at" | "updated_at" | "uso_count">) => {
      const { data, error } = await supabase
        .from("mt_form_templates")
        .insert({
          ...template,
          is_sistema: false,
          uso_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FormularioTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-templates"] });
      toast.success("Template criado!");
    },
    onError: (error) => {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao criar template");
    },
  });

  // Mutation para incrementar uso do template
  const incrementUsageMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      const currentCount = template?.uso_count || 0;

      const { error } = await supabase
        .from("mt_form_templates")
        .update({ uso_count: currentCount + 1 })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-templates"] });
    },
    onError: (error) => {
      console.error("Erro ao incrementar uso:", error);
    },
  });

  // Mutation para deletar template
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("mt_form_templates")
        .delete()
        .eq("id", templateId)
        .eq("is_sistema", false); // Só pode deletar templates não-sistema

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulario-templates"] });
      toast.success("Template excluído!");
    },
    onError: (error) => {
      console.error("Erro ao deletar template:", error);
      toast.error("Erro ao excluir template");
    },
  });

  // Agrupar templates por categoria
  const getTemplatesByCategory = (): Record<FormularioTemplateCategoria, FormularioTemplate[]> => {
    const grouped: Record<FormularioTemplateCategoria, FormularioTemplate[]> = {
      lead_capture: [],
      agendamento: [],
      orcamento: [],
      contato: [],
      pesquisa: [],
      cadastro: [],
      evento: [],
      avaliacao: [],
      indicacao: [],
    };

    templates.forEach((template) => {
      if (grouped[template.categoria]) {
        grouped[template.categoria].push(template);
      }
    });

    return grouped;
  };

  // Listar categorias que têm templates com contador
  const getCategoriesWithTemplates = () => {
    const grouped = getTemplatesByCategory();
    return Object.entries(grouped)
      .filter(([, categoryTemplates]) => categoryTemplates.length > 0)
      .map(([categoria]) => ({
        categoria: categoria as FormularioTemplateCategoria,
        ...TEMPLATE_CATEGORIAS[categoria as FormularioTemplateCategoria],
        count: grouped[categoria as FormularioTemplateCategoria].length,
      }));
  };

  return {
    // Dados
    templates,
    templatesByCategory: getTemplatesByCategory(),
    categoriesWithTemplates: getCategoriesWithTemplates(),
    categorias: TEMPLATE_CATEGORIAS,

    // Estados
    isLoading,
    error,

    // Ações
    refetch,
    getTemplate,
    getTemplateById: getTemplate,
    createFromTemplate,
    createTemplate: createMutation.mutate,
    incrementUsage: incrementUsageMutation.mutate,
    deleteTemplate: deleteMutation.mutateAsync,

    // Estados das mutations
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
