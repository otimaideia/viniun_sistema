import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserUnidade } from '@/types/user';

interface Unidade {
  id: string;
  nome_fantasia: string;
  cidade: string | null;
  estado: string | null;
}

interface UseUserUnidadesReturn {
  // Lista de unidades vinculadas ao usuário
  unidades: Unidade[];
  // IDs das unidades para filtros
  unidadeIds: string[];
  // Unidade principal (do perfil)
  unidadePrincipal: string | null;
  // Estados
  isLoading: boolean;
  error: string | null;
  // Ações
  addUnidade: (unidadeId: string) => Promise<boolean>;
  removeUnidade: (unidadeId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  // Verificação
  hasAccessToUnidade: (unidadeId: string) => boolean;
}

export function useUserUnidades(): UseUserUnidadesReturn {
  const { user, isAuthenticated } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadePrincipal, setUnidadePrincipal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnidades = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar unidade principal do perfil
      const { data: profileData } = await supabase
        .from('mt_users')
        .select('unidade_id')
        .eq('id', user.id)
        .single();

      if (profileData?.unidade_id) {
        setUnidadePrincipal(profileData.unidade_id);
      }

      // 2. Buscar unidades adicionais da tabela de vínculo
      const { data: vinculosData, error: vinculosError } = await supabase
        .from('mt_user_franchises')
        .select(`
          id,
          unidade_id,
          mt_franchises!inner (
            id,
            nome_fantasia,
            cidade,
            estado
          )
        `)
        .eq('user_id', user.id);

      if (vinculosError) {
        throw vinculosError;
      }

      // Mapear unidades vinculadas
      const unidadesVinculadas: Unidade[] = (vinculosData || []).map((v: any) => ({
        id: v.mt_franchises.id,
        nome_fantasia: v.mt_franchises.nome_fantasia,
        cidade: v.mt_franchises.cidade,
        estado: v.mt_franchises.estado,
      }));

      // 3. Se tem unidade principal e não está na lista, buscar também
      if (profileData?.unidade_id) {
        const jaIncluida = unidadesVinculadas.some(
          (u) => u.id === profileData.unidade_id
        );

        if (!jaIncluida) {
          const { data: unidadePrincipalData } = await supabase
            .from('mt_franchises')
            .select('id, nome_fantasia, cidade, estado')
            .eq('id', profileData.unidade_id)
            .single();

          if (unidadePrincipalData) {
            unidadesVinculadas.unshift(unidadePrincipalData);
          }
        }
      }

      setUnidades(unidadesVinculadas);
    } catch (err: any) {
      console.error('Erro ao carregar unidades:', err);
      setError(err.message || 'Erro ao carregar unidades');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  // IDs das unidades para usar em filtros
  const unidadeIds = unidades.map((u) => u.id);

  // Adicionar vínculo com unidade
  const addUnidade = useCallback(
    async (unidadeId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error } = await supabase.from('mt_user_franchises').insert({
          user_id: user.id,
          unidade_id: unidadeId,
        });

        if (error) throw error;

        await fetchUnidades();
        return true;
      } catch (err: any) {
        console.error('Erro ao adicionar unidade:', err);
        setError(err.message);
        return false;
      }
    },
    [user?.id, fetchUnidades]
  );

  // Remover vínculo com unidade
  const removeUnidade = useCallback(
    async (unidadeId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { error } = await supabase
          .from('mt_user_franchises')
          .delete()
          .eq('user_id', user.id)
          .eq('unidade_id', unidadeId);

        if (error) throw error;

        await fetchUnidades();
        return true;
      } catch (err: any) {
        console.error('Erro ao remover unidade:', err);
        setError(err.message);
        return false;
      }
    },
    [user?.id, fetchUnidades]
  );

  // Verificar se tem acesso a uma unidade específica
  const hasAccessToUnidade = useCallback(
    (unidadeId: string): boolean => {
      return unidadeIds.includes(unidadeId) || unidadePrincipal === unidadeId;
    },
    [unidadeIds, unidadePrincipal]
  );

  return {
    unidades,
    unidadeIds,
    unidadePrincipal,
    isLoading,
    error,
    addUnidade,
    removeUnidade,
    refetch: fetchUnidades,
    hasAccessToUnidade,
  };
}
