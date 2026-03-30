import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';

export interface PublicBanner {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  link_url: string | null;
  link_texto: string | null;
  posicao: string;
  cor_fundo: string | null;
  cor_texto: string | null;
  ordem: number;
}

export function useSiteBanners(posicao?: string) {
  return useQuery<PublicBanner[]>({
    queryKey: ['public-banners', TENANT_ID, posicao],
    queryFn: async () => {
      const now = new Date().toISOString();

      let query = (supabase as any)
        .from('mt_site_banners')
        .select(
          'id, titulo, subtitulo, imagem_url, imagem_mobile_url, link_url, link_texto, posicao, cor_fundo, cor_texto, ordem'
        )
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .or(`data_inicio.is.null,data_inicio.lte.${now}`)
        .or(`data_fim.is.null,data_fim.gte.${now}`)
        .order('ordem', { ascending: true });

      if (posicao) {
        query = query.eq('posicao', posicao);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as PublicBanner[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
