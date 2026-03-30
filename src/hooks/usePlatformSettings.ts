/**
 * usePlatformSettings - Hook para buscar configurações globais do banco
 *
 * Busca configurações de mt_platform_settings que sejam públicas (is_public = true)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PlatformSetting {
  chave: string;
  valor: string;
  tipo: string;
  categoria: string;
  is_public: boolean;
}

export function usePlatformSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_platform_settings')
        .select('chave, valor, tipo, categoria, is_public')
        .eq('is_public', true)
        .order('categoria', { ascending: true });

      if (error) throw error;
      return (data || []) as PlatformSetting[];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Converter array em object para acesso fácil
  const settings = data?.reduce((acc, setting) => {
    acc[setting.chave] = setting.valor;
    return acc;
  }, {} as Record<string, string>) || {};

  // Helpers para categorias específicas
  const supabaseSettings = data?.filter(s => s.categoria === 'supabase') || [];
  const metaSettings = data?.filter(s => s.categoria === 'meta') || [];

  return {
    settings,
    supabaseSettings,
    metaSettings,
    isLoading,
    error,
  };
}

/**
 * Hook especializado para configurações do Meta
 */
export function useMetaSettings() {
  const { settings, isLoading } = usePlatformSettings();

  return {
    metaAppId: settings.META_APP_ID || import.meta.env.VITE_META_APP_ID,
    metaRedirectUri: settings.META_REDIRECT_URI || import.meta.env.VITE_META_REDIRECT_URI,
    isLoading,
  };
}

/**
 * Hook especializado para configurações do Supabase
 */
export function useSupabaseSettings() {
  const { settings, isLoading } = usePlatformSettings();

  return {
    supabaseUrl: settings.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: settings.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
    isLoading,
  };
}
