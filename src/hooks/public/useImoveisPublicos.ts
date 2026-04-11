// =============================================================================
// useImoveisPublicos - Hook público para busca de imóveis (sem autenticação)
// =============================================================================
//
// Consulta imóveis disponíveis para o site público do tenant.
// Usa a anon key do Supabase (sem sessão de usuário).
// Filtra por tenant_id via TenantContext quando disponível.
//
// =============================================================================

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { MTProperty, MTPropertyPhoto } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PropertySearchFilters {
  /** Busca textual (título, endereço, ref_code) */
  search?: string;
  /** ID do tipo de imóvel */
  tipo?: string;
  /** ID da finalidade (venda, locação, etc.) */
  finalidade?: string;
  /** ID da cidade */
  cidade?: string;
  /** ID do bairro */
  bairro?: string;
  /** ID do estado */
  estado?: string;
  /** Número mínimo de dormitórios */
  dormitorios?: number;
  /** Valor máximo (venda) */
  valorMax?: number;
  /** Valor mínimo (venda) */
  valorMin?: number;
  /** Valor máximo de locação */
  valorLocacaoMax?: number;
  /** Somente destaques */
  destaque?: boolean;
  /** Somente lançamentos */
  lancamento?: boolean;
  /** Aceita financiamento */
  financiamento?: boolean;
  /** Mobiliado */
  mobiliado?: boolean;
  /** Área mínima (m²) */
  areaMin?: number;
  /** Área máxima (m²) */
  areaMax?: number;
  /** Número de garagens mínimo */
  garagens?: number;
  /** Ordenação */
  sort?: 'preco_asc' | 'preco_desc' | 'recente' | 'area_asc' | 'area_desc';
  /** Página (0-indexed) */
  page?: number;
  /** Itens por página */
  perPage?: number;
}

export interface PublicPropertyResult {
  data: MTProperty[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'public-imoveis';
const DEFAULT_PER_PAGE = 20;

// Select padrão para listagem pública (campos relevantes + joins)
const PUBLIC_LIST_SELECT = `
  id, tenant_id, ref_code, slug,
  titulo, descricao,
  foto_destaque_url,
  dormitorios, suites, banheiros, garagens,
  area_total, area_construida, area_privada,
  valor_venda, valor_locacao, valor_temporada,
  valor_condominio, valor_iptu,
  aceita_financiamento, financiamento_caixa,
  financ_caixa_mostrar_site, financ_caixa_valor_entrada, financ_caixa_valor_parcela,
  financiamento_construtora,
  financ_const_mostrar_site, financ_const_valor_entrada, financ_const_valor_parcela,
  situacao, destaque, destaque_semana, lancamento, mobiliado,
  endereco, numero, cep, latitude, longitude,
  video_youtube_url, tour_virtual_url,
  total_visualizacoes,
  created_at, updated_at,
  property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
  purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
  location_estado:mt_locations!mt_properties_location_estado_id_fkey (id, nome, uf),
  location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
  location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome)
`;

// Select completo para detalhe do imóvel público
const PUBLIC_DETAIL_SELECT = `
  *,
  property_type:mt_property_types!mt_properties_property_type_id_fkey (id, nome, codigo, icone),
  property_subtype:mt_property_types!mt_properties_property_subtype_id_fkey (id, nome, codigo, icone),
  purpose:mt_property_purposes!mt_properties_purpose_id_fkey (id, nome, codigo),
  location_estado:mt_locations!mt_properties_location_estado_id_fkey (id, nome, uf),
  location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome),
  location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome),
  building:mt_buildings!mt_properties_building_id_fkey (id, nome),
  photos:mt_property_photos (id, url, thumbnail_url, descricao, album, ordem, is_destaque, mime_type, largura, altura)
`;

// -----------------------------------------------------------------------------
// Helper: aplicar ordenação
// -----------------------------------------------------------------------------

function applySorting(q: any, sort?: PropertySearchFilters['sort']) {
  switch (sort) {
    case 'preco_asc':
      return q.order('valor_venda', { ascending: true, nullsFirst: false });
    case 'preco_desc':
      return q.order('valor_venda', { ascending: false, nullsFirst: false });
    case 'area_asc':
      return q.order('area_total', { ascending: true, nullsFirst: false });
    case 'area_desc':
      return q.order('area_total', { ascending: false, nullsFirst: false });
    case 'recente':
    default:
      return q.order('created_at', { ascending: false });
  }
}

// -----------------------------------------------------------------------------
// Helper: aplicar filtros
// -----------------------------------------------------------------------------

function applyFilters(q: any, filters: PropertySearchFilters) {
  if (filters.tipo) q = q.eq('property_type_id', filters.tipo);
  if (filters.finalidade) q = q.eq('purpose_id', filters.finalidade);
  if (filters.estado) q = q.eq('location_estado_id', filters.estado);
  if (filters.cidade) q = q.eq('location_cidade_id', filters.cidade);
  if (filters.bairro) q = q.eq('location_bairro_id', filters.bairro);
  if (filters.dormitorios) q = q.gte('dormitorios', filters.dormitorios);
  if (filters.garagens) q = q.gte('garagens', filters.garagens);
  if (filters.valorMin != null) q = q.gte('valor_venda', filters.valorMin);
  if (filters.valorMax != null) q = q.lte('valor_venda', filters.valorMax);
  if (filters.valorLocacaoMax != null) q = q.lte('valor_locacao', filters.valorLocacaoMax);
  if (filters.areaMin != null) q = q.gte('area_total', filters.areaMin);
  if (filters.areaMax != null) q = q.lte('area_total', filters.areaMax);
  if (filters.destaque) q = q.eq('destaque', true);
  if (filters.lancamento) q = q.eq('lancamento', true);
  if (filters.financiamento) q = q.eq('aceita_financiamento', true);
  if (filters.mobiliado) q = q.eq('mobiliado', true);

  // Busca textual (título, endereço, ref_code, descrição)
  if (filters.search) {
    const term = `%${filters.search}%`;
    q = q.or(`titulo.ilike.${term},endereco.ilike.${term},ref_code.ilike.${term}`);
  }

  return q;
}

// -----------------------------------------------------------------------------
// Hook: Lista de Imóveis Públicos (paginado)
// -----------------------------------------------------------------------------

export function useImoveisPublicos(filters: PropertySearchFilters = {}) {
  const { tenant } = useTenantContext();

  const page = filters.page ?? 0;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;

  return useQuery<PublicPropertyResult>({
    queryKey: [QUERY_KEY, tenant?.id, filters],
    queryFn: async () => {
      let q = supabase
        .from('mt_properties')
        .select(PUBLIC_LIST_SELECT, { count: 'exact' })
        .is('deleted_at', null)
        .eq('situacao', 'disponivel');

      // Filtro por tenant
      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Aplicar filtros do usuário
      q = applyFilters(q, filters);

      // Ordenação
      q = applySorting(q, filters.sort);

      // Paginação
      const from = page * perPage;
      const to = from + perPage - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;

      if (error) {
        console.error('[useImoveisPublicos] Erro:', error);
        throw error;
      }

      const total = count || 0;

      return {
        data: (data || []) as MTProperty[],
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 5, // 5 minutos para dados públicos
    gcTime: 1000 * 60 * 10,
  });
}

// -----------------------------------------------------------------------------
// Hook: Imóveis Destaque (para homepage)
// -----------------------------------------------------------------------------

export function useImoveisDestaque(limit = 8) {
  const { tenant } = useTenantContext();

  return useQuery<MTProperty[]>({
    queryKey: [QUERY_KEY, 'destaque', tenant?.id, limit],
    queryFn: async () => {
      let q = supabase
        .from('mt_properties')
        .select(PUBLIC_LIST_SELECT)
        .is('deleted_at', null)
        .eq('situacao', 'disponivel')
        .eq('destaque', true)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('[useImoveisDestaque] Erro:', error);
        throw error;
      }

      return (data || []) as MTProperty[];
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 5,
  });
}

// -----------------------------------------------------------------------------
// Hook: Imóveis Lançamento (para homepage)
// -----------------------------------------------------------------------------

export function useImoveisLancamento(limit = 8) {
  const { tenant } = useTenantContext();

  return useQuery<MTProperty[]>({
    queryKey: [QUERY_KEY, 'lancamento', tenant?.id, limit],
    queryFn: async () => {
      let q = supabase
        .from('mt_properties')
        .select(PUBLIC_LIST_SELECT)
        .is('deleted_at', null)
        .eq('situacao', 'disponivel')
        .eq('lancamento', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('[useImoveisLancamento] Erro:', error);
        throw error;
      }

      return (data || []) as MTProperty[];
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 5,
  });
}

// -----------------------------------------------------------------------------
// Hook: Detalhe de Imóvel Público (por slug ou id)
// -----------------------------------------------------------------------------

export function useImovelPublico(slugOrId: string | undefined) {
  const { tenant } = useTenantContext();

  return useQuery<MTProperty | null>({
    queryKey: [QUERY_KEY, 'detail', tenant?.id, slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;

      // Tentar buscar por slug primeiro, fallback para id
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

      let q = supabase
        .from('mt_properties')
        .select(PUBLIC_DETAIL_SELECT)
        .is('deleted_at', null);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (isUuid) {
        q = q.eq('id', slugOrId);
      } else {
        q = q.eq('slug', slugOrId);
      }

      const { data, error } = await q.single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[useImovelPublico] Erro:', error);
        throw error;
      }

      // Ordenar fotos por ordem
      if (data?.photos) {
        (data.photos as any[]).sort((a: any, b: any) => (a.ordem ?? 999) - (b.ordem ?? 999));
      }

      return data as MTProperty;
    },
    enabled: !!slugOrId && !!tenant,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

// -----------------------------------------------------------------------------
// Hook: Incrementar visualizações do imóvel
// -----------------------------------------------------------------------------

export function useIncrementVisualizacao() {
  return async (propertyId: string) => {
    try {
      // RPC ou update direto - usa supabase sem auth
      await supabase.rpc('increment_property_views', { p_property_id: propertyId }).throwOnError();
    } catch {
      // Falha silenciosa - não bloqueia a experiência do usuário
      // Se a RPC não existir, tentar update direto
      try {
        await supabase
          .from('mt_properties')
          .update({ total_visualizacoes: supabase.rpc ? undefined : 0 })
          .eq('id', propertyId);
      } catch {
        // Ignorar - contagem de views é nice-to-have
      }
    }
  };
}

// -----------------------------------------------------------------------------
// Hook: Tipos de imóvel do tenant (para filtros)
// -----------------------------------------------------------------------------

export function useTiposImovelPublico() {
  const { tenant } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'tipos', tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_property_types')
        .select('id, nome, codigo, icone, parent_id, ordem')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem');

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 30, // 30 min - tipos mudam raramente
  });
}

// -----------------------------------------------------------------------------
// Hook: Finalidades do tenant (para filtros)
// -----------------------------------------------------------------------------

export function useFinalidadesPublico() {
  const { tenant } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'finalidades', tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_property_purposes')
        .select('id, nome, codigo, ordem')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem');

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 30,
  });
}

// -----------------------------------------------------------------------------
// Hook: Cidades com imóveis disponíveis (para filtros)
// -----------------------------------------------------------------------------

export function useCidadesComImoveis() {
  const { tenant } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'cidades', tenant?.id],
    queryFn: async () => {
      // Buscar cidades distintas que têm imóveis disponíveis
      let q = supabase
        .from('mt_properties')
        .select('location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (id, nome)')
        .is('deleted_at', null)
        .eq('situacao', 'disponivel')
        .not('location_cidade_id', 'is', null);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Deduplicar cidades
      const cidadesMap = new Map<string, { id: string; nome: string }>();
      for (const item of data || []) {
        const cidade = (item as any).location_cidade;
        if (cidade?.id) {
          cidadesMap.set(cidade.id, cidade);
        }
      }

      return Array.from(cidadesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 15,
  });
}

// -----------------------------------------------------------------------------
// Hook: Bairros de uma cidade (para filtros)
// -----------------------------------------------------------------------------

export function useBairrosDaCidade(cidadeId: string | undefined) {
  const { tenant } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'bairros', tenant?.id, cidadeId],
    queryFn: async () => {
      if (!cidadeId) return [];

      let q = supabase
        .from('mt_properties')
        .select('location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (id, nome)')
        .is('deleted_at', null)
        .eq('situacao', 'disponivel')
        .eq('location_cidade_id', cidadeId)
        .not('location_bairro_id', 'is', null);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Deduplicar bairros
      const bairrosMap = new Map<string, { id: string; nome: string }>();
      for (const item of data || []) {
        const bairro = (item as any).location_bairro;
        if (bairro?.id) {
          bairrosMap.set(bairro.id, bairro);
        }
      }

      return Array.from(bairrosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: !!tenant && !!cidadeId,
    staleTime: 1000 * 60 * 15,
  });
}

export default useImoveisPublicos;
