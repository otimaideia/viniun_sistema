import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  Influenciadora,
  InfluenciadoraFormData,
  InfluenciadoraFilters,
  InfluenciadoraKPIs,
  InfluenciadoraRanking,
  InfluenciadoraStatus,
} from "@/types/influenciadora";
import { useUserProfile } from "./useUserProfile";

/**
 * @deprecated Use useInfluenciadorasAdapter instead for proper multi-tenant isolation.
 */
export function useInfluenciadoras(filtros: InfluenciadoraFilters = {}) {
  const queryClient = useQueryClient();
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();

  // Query para listar influenciadoras
  const {
    data: influenciadoras = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["influenciadoras", filtros, canViewAllLeads, unidadeId],
    queryFn: async (): Promise<Influenciadora[]> => {
      let query = supabase
        .from("mt_influencers")
        .select(`
          *,
          franqueado:mt_franchises!franqueado_id(id, nome_fantasia),
          redes_sociais:mt_influencer_social_media(*),
          valores:mt_influencer_values(*)
        `)
        .order("created_at", { ascending: false });

      // Filtros
      if (filtros.status) {
        query = query.eq("status", filtros.status);
      }

      if (filtros.tipo) {
        query = query.eq("tipo", filtros.tipo);
      }

      if (filtros.tamanho) {
        query = query.eq("tamanho", filtros.tamanho);
      }

      if (filtros.ativo !== undefined) {
        query = query.eq("ativo", filtros.ativo);
      }

      if (filtros.franqueado_id) {
        query = query.eq("franqueado_id", filtros.franqueado_id);
      }

      if (filtros.unidade_id) {
        query = query.eq("unidade_id", filtros.unidade_id);
      }

      if (filtros.periodo_inicio) {
        query = query.gte("created_at", filtros.periodo_inicio);
      }

      if (filtros.periodo_fim) {
        query = query.lte("created_at", filtros.periodo_fim);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar influenciadoras:", error);
        throw error;
      }

      let result = (data || []) as Influenciadora[];

      // Filtro por franquia (aplicado no resultado) - visualização híbrida
      if (!canViewAllLeads && unidadeId) {
        result = result.filter(
          (i) => i.franqueado_id === unidadeId || !i.franqueado_id // Mostra as globais + as da franquia
        );
      }

      // Busca textual
      if (filtros.search) {
        const search = filtros.search.toLowerCase();
        result = result.filter(
          (i) =>
            i.nome_completo?.toLowerCase().includes(search) ||
            i.nome_artistico?.toLowerCase().includes(search) ||
            i.email?.toLowerCase().includes(search) ||
            i.whatsapp?.includes(search) ||
            (i.codigo_indicacao || (i as any).codigo)?.toLowerCase().includes(search) || // DB retorna 'codigo', tipo TS usa 'codigo_indicacao'
            i.cidade?.toLowerCase().includes(search)
        );
      }

      return result;
    },
    enabled: !isProfileLoading,
  });

  // Query para KPIs de influenciadoras
  const { data: kpis } = useQuery({
    queryKey: ["influenciadoras-kpis", canViewAllLeads, unidadeId],
    queryFn: async (): Promise<InfluenciadoraKPIs> => {
      // Buscar todas influenciadoras
      const query = supabase
        .from("mt_influencers")
        .select("id, status, ativo, quantidade_indicacoes, total_seguidores, taxa_engajamento_media, franqueado_id");

      const { data: influenciadorasData, error } = await query;

      if (error) {
        console.error("Erro ao buscar KPIs:", error);
        throw error;
      }

      let infs = influenciadorasData || [];

      // Filtro por franquia
      if (!canViewAllLeads && unidadeId) {
        infs = infs.filter((i) => i.franqueado_id === unidadeId || !i.franqueado_id);
      }

      const total = infs.length;
      const ativas = infs.filter((i) => i.ativo && i.status === "aprovado").length;
      const pendentes = infs.filter((i) => i.status === "pendente").length;
      const totalIndicacoes = infs.reduce((sum, i) => sum + (i.quantidade_indicacoes || 0), 0);
      const totalSeguidores = infs.reduce((sum, i) => sum + (i.total_seguidores || 0), 0);
      const engajamentoMedio =
        infs.length > 0
          ? infs.reduce((sum, i) => sum + (i.taxa_engajamento_media || 0), 0) / infs.length
          : 0;

      // Buscar indicações convertidas
      const { count: indicacoesConvertidas } = await supabase
        .from("mt_influencer_referrals")
        .select("id", { count: "exact", head: true })
        .eq("status", "convertido");

      const taxaConversao =
        totalIndicacoes > 0 ? ((indicacoesConvertidas || 0) / totalIndicacoes) * 100 : 0;

      return {
        total_influenciadoras: total,
        influenciadoras_ativas: ativas,
        influenciadoras_pendentes: pendentes,
        total_indicacoes: totalIndicacoes,
        indicacoes_convertidas: indicacoesConvertidas || 0,
        taxa_conversao: Math.round(taxaConversao * 10) / 10,
        total_seguidores: totalSeguidores,
        engajamento_medio: Math.round(engajamentoMedio * 100) / 100,
      };
    },
    enabled: !isProfileLoading,
  });

  // Query para ranking (top influenciadoras)
  const { data: ranking = [] } = useQuery({
    queryKey: ["influenciadoras-ranking", canViewAllLeads, unidadeId],
    queryFn: async (): Promise<InfluenciadoraRanking[]> => {
      const { data, error } = await supabase
        .from("mt_influencers")
        .select(`
          id,
          nome_completo,
          nome_artistico,
          foto_perfil,
          codigo,
          quantidade_indicacoes,
          total_seguidores,
          franqueado_id
        `)
        .eq("status", "aprovado")
        .eq("ativo", true)
        .gt("quantidade_indicacoes", 0)
        .order("quantidade_indicacoes", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Erro ao buscar ranking:", error);
        return [];
      }

      let infs = data || [];

      // Filtro por franquia
      if (!canViewAllLeads && unidadeId) {
        infs = infs.filter((i) => i.franqueado_id === unidadeId || !i.franqueado_id);
      }

      // Buscar stats de conversão para cada influenciadora
      const rankingItems: InfluenciadoraRanking[] = await Promise.all(
        infs.map(async (inf, index) => {
          const { count: convertidas } = await supabase
            .from("mt_influencer_referrals")
            .select("id", { count: "exact", head: true })
            .eq("influenciadora_id", inf.id)
            .eq("status", "convertido");

          const { data: ultimaIndicacao } = await supabase
            .from("mt_influencer_referrals")
            .select("data_indicacao")
            .eq("influenciadora_id", inf.id)
            .order("data_indicacao", { ascending: false })
            .limit(1)
            .maybeSingle();

          const taxaConversao =
            inf.quantidade_indicacoes > 0
              ? ((convertidas || 0) / inf.quantidade_indicacoes) * 100
              : 0;

          return {
            posicao: index + 1,
            influenciadora_id: inf.id,
            nome_completo: inf.nome_completo,
            nome_artistico: inf.nome_artistico,
            foto_perfil: inf.foto_perfil,
            codigo_indicacao: inf.codigo, // coluna DB é 'codigo' em mt_influencers
            total_indicacoes: inf.quantidade_indicacoes || 0,
            indicacoes_convertidas: convertidas || 0,
            taxa_conversao: Math.round(taxaConversao * 10) / 10,
            ultima_indicacao: ultimaIndicacao?.data_indicacao,
            total_seguidores: inf.total_seguidores || 0,
          };
        })
      );

      return rankingItems;
    },
    enabled: !isProfileLoading,
  });

  // Buscar influenciadora por ID
  const getInfluenciadora = async (id: string): Promise<Influenciadora | null> => {
    const { data, error } = await supabase
      .from("mt_influencers")
      .select(`
        *,
        franqueado:mt_franchises!franqueado_id(id, nome_fantasia),
        redes_sociais:mt_influencer_social_media(*),
        valores:mt_influencer_values(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar influenciadora:", error);
      return null;
    }

    return data as Influenciadora | null;
  };

  // Buscar influenciadora pelo código de indicação
  const getInfluenciadoraByCodigo = async (codigo: string): Promise<Influenciadora | null> => {
    const { data, error } = await supabase
      .from("mt_influencers")
      .select(`
        *,
        franqueado:mt_franchises!franqueado_id(id, nome_fantasia),
        redes_sociais:mt_influencer_social_media(*),
        valores:mt_influencer_values(*)
      `)
      .eq("codigo", codigo.toUpperCase()) // coluna DB é 'codigo' em mt_influencers
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar influenciadora pelo código:", error);
      return null;
    }

    return data as Influenciadora | null;
  };

  // Mutation para criar influenciadora
  const createMutation = useMutation({
    mutationFn: async (formData: InfluenciadoraFormData) => {
      const { data, error } = await supabase
        .from("mt_influencers")
        .insert({
          nome_completo: formData.nome_completo,
          nome_artistico: formData.nome_artistico || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          whatsapp: formData.whatsapp,
          cpf: formData.cpf || null,
          data_nascimento: formData.data_nascimento || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          bairro: formData.bairro || null,
          foto_perfil: formData.foto_perfil || null,
          biografia: formData.biografia || null,
          tipo: formData.tipo,
          tamanho: formData.tamanho || null,
          franqueado_id: formData.franqueado_id || null,
          unidade_id: formData.unidade_id || null,
          aceite_termos: formData.aceite_termos || false,
          aceite_termos_at: formData.aceite_termos ? new Date().toISOString() : null,
          status: "pendente",
          ativo: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influenciadoras"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-kpis"] });
      toast.success("Influenciadora cadastrada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao cadastrar influenciadora:", error);
      toast.error("Erro ao cadastrar influenciadora");
    },
  });

  // Mutation para atualizar influenciadora
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<InfluenciadoraFormData> }) => {
      // Converte strings vazias para null em campos opcionais
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Lista de campos que devem converter string vazia para null
      const nullableFields = [
        'nome_artistico', 'email', 'telefone', 'cpf', 'data_nascimento',
        'cidade', 'estado', 'cep', 'bairro', 'foto_perfil', 'biografia',
        'tamanho', 'franqueado_id', 'unidade_id'
      ];

      // Processa cada campo do formData
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined) return; // Ignora undefined

        if (nullableFields.includes(key) && value === '') {
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      });

      const { data, error } = await supabase
        .from("mt_influencers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influenciadoras"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-kpis"] });
      toast.success("Influenciadora atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar influenciadora:", error);
      toast.error("Erro ao atualizar influenciadora");
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: InfluenciadoraStatus;
    }) => {
      const { error } = await supabase
        .from("mt_influencers")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influenciadoras"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-kpis"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  // Mutation para ativar/desativar
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("mt_influencers")
        .update({
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["influenciadoras"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-kpis"] });
      toast.success(variables.ativo ? "Influenciadora ativada!" : "Influenciadora desativada!");
    },
    onError: (error) => {
      console.error("Erro ao alterar status ativo:", error);
      toast.error("Erro ao alterar status");
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_influencers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influenciadoras"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["influenciadoras-ranking"] });
      toast.success("Influenciadora removida!");
    },
    onError: (error) => {
      console.error("Erro ao remover influenciadora:", error);
      toast.error("Erro ao remover influenciadora");
    },
  });

  // Verificar se WhatsApp já existe
  const checkWhatsAppExists = async (whatsapp: string, excludeId?: string): Promise<boolean> => {
    const cleanWhatsApp = whatsapp.replace(/\D/g, "");

    let query = supabase
      .from("mt_influencers")
      .select("id")
      .eq("whatsapp", cleanWhatsApp);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  // Verificar se email já existe
  const checkEmailExists = async (email: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("mt_influencers")
      .select("id")
      .eq("email", email.toLowerCase());

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  // Verificar se CPF já existe
  const checkCPFExists = async (cpf: string, excludeId?: string): Promise<boolean> => {
    const cleanCPF = cpf.replace(/\D/g, "");

    let query = supabase
      .from("mt_influencers")
      .select("id")
      .eq("cpf", cleanCPF);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  };

  return {
    // Dados
    influenciadoras,
    kpis,
    ranking,

    // Estados
    isLoading,
    error,
    isFetching,

    // Queries
    refetch,
    getInfluenciadora,
    getInfluenciadoraByCodigo,

    // Mutations
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,

    toggleAtivo: toggleAtivoMutation.mutate,
    isTogglingAtivo: toggleAtivoMutation.isPending,

    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,

    // Validações
    checkWhatsAppExists,
    checkEmailExists,
    checkCPFExists,
  };
}
