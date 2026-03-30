import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PromocaoIndicacao } from "@/types/promocao";
import { useUserProfile } from "./useUserProfile";

export function usePromocaoIndicacoes() {
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();

  const { data: indicacoes = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["promocao-indicacoes", canViewAllLeads, unidadeId],
    queryFn: async () => {
      // Se usuário é de unidade, busca o nome da franquia para filtrar
      let franqueadoNome: string | null = null;
      if (!canViewAllLeads && unidadeId) {
        const { data: franqueado } = await supabase
          .from("mt_franchises")
          .select("nome_fantasia")
          .eq("id", unidadeId)
          .single();
        franqueadoNome = franqueado?.nome_fantasia || null;
      }

      // Busca indicações primeiro
      const { data: indicacoesData, error: indicacoesError } = await supabase
        .from("mt_promotion_referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (indicacoesError) {
        console.error("Erro ao buscar indicações:", indicacoesError);
        throw indicacoesError;
      }

      // Busca cadastros relacionados
      // Nota: mt_promotion_registrations usa campo "unidade" (texto), não tem franqueado_id
      const cadastroIds = [...new Set((indicacoesData || []).map((i: any) => i.cadastro_id).filter(Boolean))];

      let cadastrosMap: Record<string, any> = {};

      if (cadastroIds.length > 0) {
        const { data: cadastros } = await supabase
          .from("mt_promotion_registrations")
          .select("id, nome, email, telefone, unidade")
          .in("id", cadastroIds);

        cadastrosMap = (cadastros || []).reduce((acc: Record<string, any>, c: any) => {
          acc[c.id] = {
            ...c,
            unidade: c.unidade || "",
          };
          return acc;
        }, {});
      }

      // Mapeia indicações com cadastros
      let result = (indicacoesData || []).map((row: any) => ({
        ...row,
        cadastro: cadastrosMap[row.cadastro_id] || null,
        // Adiciona campo unidade diretamente para facilitar filtros
        unidade: cadastrosMap[row.cadastro_id]?.unidade || "",
      }));

      // Filtra indicações cujo cadastro pertence à franquia do usuário
      // Filtra pelo nome da unidade (texto) já que não existe franqueado_id
      if (!canViewAllLeads && franqueadoNome) {
        const nomeLower = franqueadoNome.toLowerCase();
        result = result.filter((indicacao: any) => {
          const unidade = (indicacao.cadastro?.unidade || "").toLowerCase();
          return unidade.includes(nomeLower) || nomeLower.includes(unidade);
        });
      }

      return result as PromocaoIndicacao[];
    },
    enabled: !isProfileLoading,
  });

  return { indicacoes, isLoading, error, refetch, isFetching };
}
