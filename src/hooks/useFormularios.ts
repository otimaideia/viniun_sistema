import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  Formulario,
  FormularioInsert,
  FormularioUpdate,
  FormularioWithRelations,
  FormularioStats,
} from "@/types/formulario";
import { useUserProfile } from "./useUserProfile";

interface UseFormulariosOptions {
  franqueadoId?: string;
  includeStats?: boolean;
  status?: string;
}

/**
 * @deprecated Use useFormulariosAdapter instead for proper multi-tenant isolation.
 */
export function useFormularios(options: UseFormulariosOptions = {}) {
  const queryClient = useQueryClient();
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();

  // Query para listar formulários
  const {
    data: formularios = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["formularios", options.franqueadoId, options.status, canViewAllLeads, unidadeId],
    queryFn: async (): Promise<FormularioWithRelations[]> => {
      let query = supabase
        .from("mt_forms")
        .select(`
          *,
          franqueado:mt_franchises(id, nome_fantasia),
          campos:mt_form_fields(*)
        `)
        .order("created_at", { ascending: false });

      // Filtro por franquia
      // Admin vê todos (incluindo formulários da central com franqueado_id = null)
      // Franqueado vê os seus + formulários globais da central
      if (options.franqueadoId) {
        // Filtro explícito passado - usar exatamente esse
        query = query.eq("franchise_id", options.franqueadoId);
      } else if (!canViewAllLeads && unidadeId) {
        // Franqueado: vê seus formulários + formulários da central (global)
        query = query.or(`franchise_id.eq.${unidadeId},franchise_id.is.null`);
      }
      // Admin sem filtro explícito: vê todos (não adiciona filtro)

      // Filtro por status
      if (options.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar formulários:", error);
        throw error;
      }

      let formulariosWithStats = (data || []) as FormularioWithRelations[];

      // Buscar stats se solicitado
      if (options.includeStats && formulariosWithStats.length > 0) {
        const statsPromises = formulariosWithStats.map(async (form) => {
          const { data: statsData } = await supabase.rpc("get_formulario_stats_yeslaser", {
            p_formulario_id: form.id,
          });
          return { ...form, stats: statsData?.[0] as FormularioStats };
        });
        formulariosWithStats = await Promise.all(statsPromises);
      }

      return formulariosWithStats;
    },
    enabled: !isProfileLoading,
  });

  // Mutation para criar formulário
  const createMutation = useMutation({
    mutationFn: async (formulario: FormularioInsert) => {
      const { data, error } = await supabase
        .from("mt_forms")
        .insert(formulario)
        .select()
        .single();

      if (error) throw error;
      return data as Formulario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formularios"] });
      toast.success("Formulário criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar formulário:", error);
      toast.error("Erro ao criar formulário");
    },
  });

  // Mutation para atualizar formulário
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: FormularioUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("mt_forms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Formulario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formularios"] });
      toast.success("Formulário atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar formulário:", error);
      toast.error("Erro ao atualizar formulário");
    },
  });

  // Mutation para deletar formulário
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_forms")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formularios"] });
      toast.success("Formulário removido!");
    },
    onError: (error) => {
      console.error("Erro ao deletar formulário:", error);
      toast.error("Erro ao remover formulário");
    },
  });

  // Buscar formulário por ID
  const getFormulario = async (id: string): Promise<FormularioWithRelations | null> => {
    const { data, error } = await supabase
      .from("mt_forms")
      .select(`
        *,
        franqueado:mt_franchises(id, nome_fantasia),
        campos:mt_form_fields(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar formulário:", error);
      return null;
    }

    if (data) {
      // Buscar stats
      const { data: statsData } = await supabase.rpc("get_formulario_stats_yeslaser", {
        p_formulario_id: id,
      });
      return { ...data, stats: statsData?.[0] as FormularioStats } as FormularioWithRelations;
    }

    return null;
  };

  // Buscar formulário por slug (para página pública)
  const getFormularioBySlug = async (slug: string): Promise<FormularioWithRelations | null> => {
    const { data, error } = await supabase
      .from("mt_forms")
      .select(`
        *,
        franqueado:mt_franchises(id, nome_fantasia),
        campos:mt_form_fields(*)
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar formulário por slug:", error);
      return null;
    }

    return data as FormularioWithRelations | null;
  };

  // Duplicar formulário
  const duplicateFormulario = async (id: string, newName: string): Promise<Formulario | null> => {
    const original = await getFormulario(id);
    if (!original) {
      toast.error("Formulário não encontrado");
      return null;
    }

    const { id: _, created_at, updated_at, campos, franqueado, stats, _count, variantes, ...formularioData } = original;

    const newSlug = `${original.slug}-copy-${Date.now()}`;

    const { data: newFormulario, error: createError } = await supabase
      .from("mt_forms")
      .insert({
        ...formularioData,
        nome: newName,
        slug: newSlug,
        status: "rascunho",
      })
      .select()
      .single();

    if (createError) {
      console.error("Erro ao duplicar formulário:", createError);
      toast.error("Erro ao duplicar formulário");
      return null;
    }

    // Duplicar campos
    if (campos && campos.length > 0) {
      const newCampos = campos.map(({ id, form_id, created_at, updated_at, ...campo }: any) => ({
        ...campo,
        form_id: newFormulario.id,
      }));

      const { error: camposError } = await supabase
        .from("mt_form_fields")
        .insert(newCampos);

      if (camposError) {
        console.error("Erro ao duplicar campos:", camposError);
        toast.error("Formulário criado, mas houve erro ao duplicar campos");
      }
    }

    queryClient.invalidateQueries({ queryKey: ["formularios"] });
    toast.success("Formulário duplicado com sucesso!");
    return newFormulario as Formulario;
  };

  return {
    formularios,
    isLoading,
    error,
    refetch,
    isFetching,
    getFormulario,
    getFormularioBySlug,
    createFormulario: createMutation.mutateAsync,
    updateFormulario: updateMutation.mutateAsync,
    deleteFormulario: deleteMutation.mutate,
    duplicateFormulario,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
