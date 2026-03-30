import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';

export interface PublicService {
  id: string;
  tenant_id: string;
  nome: string;
  nome_curto: string | null;
  descricao: string | null;
  descricao_curta: string | null;
  codigo: string | null;
  categoria: string | null;
  subcategoria: string | null;
  tipo: string;
  preco: number | null;
  preco_promocional: number | null;
  custo_pix: number | null;
  custo_cartao: number | null;
  numero_sessoes: number | null;
  duracao_minutos: number | null;
  imagem_url: string | null;
  galeria: any | null;
  area_corporal: string | null;
  tamanho_area: string | null;
  sessoes_protocolo: number | null;
  preco_por_sessao: number | null;
  genero: string | null;
  url_slug: string | null;
  category_id: string | null;
  equipamento: string | null;
  beneficios: any | null;
  contraindicacoes: string | null;
  preparo: string | null;
  pos_procedimento: string | null;
  destaque: boolean;
  is_active: boolean;
  tags: string[] | null;
  disponivel_online: boolean | null;
  requer_avaliacao: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
}

export interface PublicServiceFilters {
  category_id?: string;
  genero?: string;
  area_corporal?: string;
  tamanho_area?: string;
  destaque?: boolean;
  search?: string;
  categoria?: string;
}

export function useServicosPublicos(filters?: PublicServiceFilters) {
  return useQuery<PublicService[]>({
    queryKey: ['public-servicos', TENANT_ID, filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('mt_services')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem', { ascending: true, nullsFirst: false })
        .order('nome', { ascending: true });

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.genero) {
        query = query.eq('genero', filters.genero);
      }

      if (filters?.area_corporal) {
        query = query.eq('area_corporal', filters.area_corporal);
      }

      if (filters?.tamanho_area) {
        query = query.eq('tamanho_area', filters.tamanho_area);
      }

      if (filters?.destaque !== undefined) {
        query = query.eq('destaque', filters.destaque);
      }

      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria);
      }

      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,descricao_curta.ilike.%${filters.search}%,tags.cs.{${filters.search}}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as PublicService[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - public data changes rarely
  });
}

export function useServicoPublico(slugOrId: string) {
  return useQuery<PublicService | null>({
    queryKey: ['public-servico', TENANT_ID, slugOrId],
    queryFn: async () => {
      // Try by url_slug first
      const { data: bySlug, error: slugError } = await (supabase as any)
        .from('mt_services')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .eq('url_slug', slugOrId)
        .maybeSingle();

      if (slugError) throw slugError;
      if (bySlug) return bySlug as PublicService;

      // Fallback: try by id (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slugOrId)) {
        const { data: byId, error: idError } = await (supabase as any)
          .from('mt_services')
          .select('*')
          .eq('tenant_id', TENANT_ID)
          .eq('is_active', true)
          .is('deleted_at', null)
          .eq('id', slugOrId)
          .maybeSingle();

        if (idError) throw idError;
        return (byId as PublicService) ?? null;
      }

      return null;
    },
    enabled: !!slugOrId,
    staleTime: 5 * 60 * 1000,
  });
}
