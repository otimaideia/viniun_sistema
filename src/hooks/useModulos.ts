import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Modulo, FranqueadoModulo, ModuloCodigo } from '@/types/modulo';

interface UseModulosReturn {
  modulos: Modulo[];
  franqueadoModulos: FranqueadoModulo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchModulos: () => Promise<void>;
  fetchFranqueadoModulos: (franqueadoId: string) => Promise<FranqueadoModulo[]>;
  toggleModulo: (franqueadoId: string, moduloId: string, active: boolean) => Promise<{ error: any }>;
  toggleModuloFranqueado: (franqueadoId: string, moduloId: string, active: boolean) => Promise<{ error: any }>;
  hasModule: (franqueadoId: string, codigo: ModuloCodigo) => boolean;
  getActiveModulos: (franqueadoId: string) => ModuloCodigo[];
}

/**
 * @deprecated Use useModulosAdapter instead for proper multi-tenant isolation.
 */
export const useModulos = (): UseModulosReturn => {
  const { user } = useAuth();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [franqueadoModulos, setFranqueadoModulos] = useState<FranqueadoModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os módulos disponíveis
  const fetchModulos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('mt_modules')
        .select('*')
        .order('ordem');

      if (err) throw err;
      setModulos(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar módulos:', err);
      setError('Erro ao carregar módulos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar módulos de uma franquia específica
  const fetchFranqueadoModulos = useCallback(async (franqueadoId: string): Promise<FranqueadoModulo[]> => {
    try {
      const { data, error: err } = await supabase
        .from('mt_franchise_modules')
        .select(`
          *,
          modulo:mt_modules(*)
        `)
        .eq('franqueado_id', franqueadoId);

      if (err) throw err;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar módulos da franquia:', err);
      return [];
    }
  }, []);

  // Ativar/desativar módulo para uma franquia
  const toggleModulo = useCallback(async (
    franqueadoId: string,
    moduloId: string,
    active: boolean
  ): Promise<{ error: any }> => {
    try {
      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('mt_franchise_modules')
        .select('id')
        .eq('franqueado_id', franqueadoId)
        .eq('modulo_id', moduloId)
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { error: err } = await supabase
          .from('mt_franchise_modules')
          .update({
            is_active: active,
            ativado_em: active ? new Date().toISOString() : null,
            ativado_por: active ? user?.id : null,
          })
          .eq('id', existing.id);

        if (err) throw err;
      } else if (active) {
        // Inserir novo
        const { error: err } = await supabase
          .from('mt_franchise_modules')
          .insert({
            franqueado_id: franqueadoId,
            modulo_id: moduloId,
            is_active: true,
            ativado_por: user?.id,
          });

        if (err) throw err;
      }

      return { error: null };
    } catch (err) {
      console.error('Erro ao alterar módulo:', err);
      return { error: err };
    }
  }, [user]);

  // Verificar se franquia tem módulo ativo
  const hasModule = useCallback((franqueadoId: string, codigo: ModuloCodigo): boolean => {
    const fm = franqueadoModulos.find(
      (m) => m.franqueado_id === franqueadoId && m.modulo?.codigo === codigo && m.is_active
    );
    return !!fm;
  }, [franqueadoModulos]);

  // Obter lista de códigos de módulos ativos
  const getActiveModulos = useCallback((franqueadoId: string): ModuloCodigo[] => {
    return franqueadoModulos
      .filter((m) => m.franqueado_id === franqueadoId && m.is_active && m.modulo?.codigo)
      .map((m) => m.modulo!.codigo as ModuloCodigo);
  }, [franqueadoModulos]);

  useEffect(() => {
    fetchModulos();
  }, [fetchModulos]);

  return {
    modulos,
    franqueadoModulos,
    loading,
    error,
    refetch: fetchModulos,
    fetchModulos,
    fetchFranqueadoModulos,
    toggleModulo,
    toggleModuloFranqueado: toggleModulo,
    hasModule,
    getActiveModulos,
  };
};

export default useModulos;
