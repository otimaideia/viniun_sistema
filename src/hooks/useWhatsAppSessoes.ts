import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WhatsAppSessao, WhatsAppSessaoInput } from "@/types/whatsapp-sessao";

export function useWhatsAppSessoes(franqueadoId?: string) {
  const queryClient = useQueryClient();

  // Listar sessões (com filtro opcional por franqueado)
  const { data: sessoes, isLoading, error, refetch } = useQuery({
    queryKey: ["whatsapp-sessoes", franqueadoId],
    queryFn: async (): Promise<WhatsAppSessao[]> => {
      // Buscar sessões sem join (evita erro de tipo uuid/integer)
      let query = supabase
        .from("mt_whatsapp_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (franqueadoId) {
        query = query.eq("franqueado_id", franqueadoId);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        console.error("Erro ao buscar sessões:", sessionsError);
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        return [];
      }

      // Buscar franqueados separadamente para evitar erro de tipo
      const franqueadoIds = [...new Set(
        sessionsData
          .map(s => s.franqueado_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )];

      let franqueadosMap: Record<string, { id: string; nome_fantasia: string }> = {};

      if (franqueadoIds.length > 0) {
        const { data: franqueadosData } = await supabase
          .from("mt_franchises")
          .select("id, nome_fantasia")
          .in("id", franqueadoIds);

        if (franqueadosData) {
          franqueadosMap = franqueadosData.reduce((acc, f) => {
            acc[f.id] = { id: f.id, nome_fantasia: f.nome_fantasia };
            return acc;
          }, {} as Record<string, { id: string; nome_fantasia: string }>);
        }
      }

      // Mesclar dados de sessões com franqueados
      const sessionsWithFranqueado = sessionsData.map(session => ({
        ...session,
        franqueado: session.franqueado_id ? franqueadosMap[session.franqueado_id] : undefined,
      }));

      return sessionsWithFranqueado as WhatsAppSessao[];
    },
  });

  // Buscar uma sessão específica
  const getSessao = async (id: string): Promise<WhatsAppSessao | null> => {
    // Buscar sessão sem join
    const { data: sessionData, error: sessionError } = await supabase
      .from("mt_whatsapp_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (sessionError) {
      console.error("Erro ao buscar sessão:", sessionError);
      return null;
    }

    if (!sessionData) return null;

    // Buscar franqueado separadamente se existir
    let franqueado: { id: string; nome_fantasia: string } | undefined;
    if (sessionData.franqueado_id) {
      const { data: franqueadoData } = await supabase
        .from("mt_franchises")
        .select("id, nome_fantasia")
        .eq("id", sessionData.franqueado_id)
        .maybeSingle();

      if (franqueadoData) {
        franqueado = franqueadoData;
      }
    }

    return {
      ...sessionData,
      franqueado,
    } as WhatsAppSessao;
  };

  // Criar sessão
  const createMutation = useMutation({
    mutationFn: async (input: WhatsAppSessaoInput) => {
      const { data, error } = await supabase
        .from("mt_whatsapp_sessions")
        .insert({
          franqueado_id: input.franqueado_id,
          nome: input.nome,
          tipo: input.tipo,
          session_name: input.session_name,
          phone_number: input.phone_number || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessoes"] });
      toast.success("Sessão criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar sessão:", error);
      toast.error("Erro ao criar sessão");
    },
  });

  // Atualizar sessão
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsAppSessao> & { id: string }) => {
      const { error } = await supabase
        .from("mt_whatsapp_sessions")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessoes"] });
      toast.success("Sessão atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar sessão:", error);
      toast.error("Erro ao atualizar sessão");
    },
  });

  // Atualizar status da sessão
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, qr_code }: { id: string; status: WhatsAppSessao['status']; qr_code?: string | null }) => {
      const updateData: Partial<WhatsAppSessao> = { status };
      if (qr_code !== undefined) {
        updateData.qr_code = qr_code;
      }
      
      const { error } = await supabase
        .from("mt_whatsapp_sessions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessoes"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
    },
  });

  // Deletar sessão
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_whatsapp_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessoes"] });
      toast.success("Sessão removida!");
    },
    onError: (error) => {
      console.error("Erro ao deletar sessão:", error);
      toast.error("Erro ao remover sessão");
    },
  });

  return {
    sessoes: sessoes || [],
    isLoading,
    error,
    refetch,
    getSessao,
    createSessao: createMutation.mutate,
    updateSessao: updateMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteSessao: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
