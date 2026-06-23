// Hook público SELF-CONTAINED para a landing de Tabelas/Lançamentos (cliente final)
// NÃO usa TenantContext — é standalone, escopado ao tenant viniun, via anon key.
// Foco: comunicação ao cliente final em viniun.com.br (sem multi-tenant).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tenant viniun (único com imóveis cadastrados). Constante evita round-trip extra
// e mantém a landing desacoplada da máquina multi-tenant.
export const VINIUN_TENANT_ID = '6049d76c-0d18-4112-a33f-a85d37a6da18';

export interface TabelaImovel {
  id: string;
  slug: string | null;
  ref_code: string | null;
  titulo: string | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  garagens: number | null;
  area_total: number | null;
  area_util: number | null;
  valor_venda: number | null;
  valor_promocao: number | null;
  lancamento: boolean | null;
  destaque: boolean | null;
  distancia_praia: number | null;
  aceita_financiamento: boolean | null;
  bairro: string | null;
  cidade: string | null;
  foto: string | null;
}

export interface TabelasFilters {
  bairroId?: string;
  dormitorios?: number;
  valorMax?: number;
  somenteLancamentos?: boolean;
  limit?: number;
}

interface PhotoRow { url: string | null; thumbnail_url: string | null; is_destaque: boolean | null; ordem: number | null; }
interface PropertyRow {
  id: string; slug: string | null; ref_code: string | null; titulo: string | null;
  dormitorios: number | null; suites: number | null; banheiros: number | null; garagens: number | null;
  area_total: number | null; area_util: number | null;
  valor_venda: number | null; valor_promocao: number | null;
  lancamento: boolean | null; destaque: boolean | null; distancia_praia: number | null;
  aceita_financiamento: boolean | null;
  location_bairro?: { nome: string | null } | null;
  location_cidade?: { nome: string | null } | null;
  photos?: PhotoRow[] | null;
}

const SELECT = `
  id, slug, ref_code, titulo,
  dormitorios, suites, banheiros, garagens,
  area_total, area_util,
  valor_venda, valor_promocao,
  lancamento, destaque, distancia_praia, aceita_financiamento,
  location_bairro:mt_locations!mt_properties_location_bairro_id_fkey (nome),
  location_cidade:mt_locations!mt_properties_location_cidade_id_fkey (nome),
  photos:mt_property_photos (url, thumbnail_url, is_destaque, ordem)
`;

function pickFoto(photos?: PhotoRow[] | null): string | null {
  if (!photos || photos.length === 0) return null;
  const ordenadas = [...photos].sort((a, b) => {
    if (a.is_destaque && !b.is_destaque) return -1;
    if (!a.is_destaque && b.is_destaque) return 1;
    return (a.ordem ?? 999) - (b.ordem ?? 999);
  });
  const f = ordenadas[0];
  return f.thumbnail_url || f.url || null;
}

function mapRow(r: PropertyRow): TabelaImovel {
  return {
    id: r.id,
    slug: r.slug,
    ref_code: r.ref_code,
    titulo: r.titulo,
    dormitorios: r.dormitorios,
    suites: r.suites,
    banheiros: r.banheiros,
    garagens: r.garagens,
    area_total: r.area_total,
    area_util: r.area_util,
    valor_venda: r.valor_venda,
    valor_promocao: r.valor_promocao,
    lancamento: r.lancamento,
    destaque: r.destaque,
    distancia_praia: r.distancia_praia,
    aceita_financiamento: r.aceita_financiamento,
    bairro: r.location_bairro?.nome ?? null,
    cidade: r.location_cidade?.nome ?? null,
    foto: pickFoto(r.photos),
  };
}

// Lista de imóveis para a vitrine (com filtros do cliente final)
export function useTabelasPublicas(filters: TabelasFilters = {}) {
  return useQuery({
    queryKey: ['tabelas-publicas', filters],
    queryFn: async (): Promise<TabelaImovel[]> => {
      let q = supabase
        .from('mt_properties')
        .select(SELECT)
        .eq('tenant_id', VINIUN_TENANT_ID)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null);

      if (filters.somenteLancamentos) q = q.eq('lancamento', true);
      if (filters.bairroId) q = q.eq('location_bairro_id', filters.bairroId);
      if (filters.dormitorios) q = q.gte('dormitorios', filters.dormitorios);
      if (filters.valorMax != null) q = q.lte('valor_venda', filters.valorMax);

      q = q
        .order('destaque', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 24);

      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as PropertyRow[]).map(mapRow);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Bairros disponíveis (para o filtro) — com contagem
export function useTabelasBairros() {
  return useQuery({
    queryKey: ['tabelas-bairros'],
    queryFn: async (): Promise<{ id: string; nome: string }[]> => {
      const { data, error } = await supabase
        .from('mt_properties')
        .select('location_bairro_id, location_bairro:mt_locations!mt_properties_location_bairro_id_fkey(nome)')
        .eq('tenant_id', VINIUN_TENANT_ID)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null)
        .not('location_bairro_id', 'is', null)
        .limit(5000);
      if (error) throw error;

      const map = new Map<string, string>();
      for (const r of (data as unknown as { location_bairro_id: string; location_bairro?: { nome: string | null } | null }[])) {
        const nome = r.location_bairro?.nome;
        if (r.location_bairro_id && nome && !map.has(r.location_bairro_id)) {
          map.set(r.location_bairro_id, nome);
        }
      }
      return [...map.entries()]
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
    staleTime: 30 * 60 * 1000,
  });
}

// -----------------------------------------------------------------------------
// Tabela pública compartilhável (mt_network_tables visibilidade='publica')
// -----------------------------------------------------------------------------

export interface TabelaPublicaMeta {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  validade_inicio: string | null;
  validade_fim: string | null;
  total_imoveis: number | null;
  foto_capa_url: string | null;
}

export interface TabelaPublicaItem extends TabelaImovel {
  valor_rede: number | null;
  observacoes: string | null;
  ordem: number | null;
}

interface ItemRow {
  valor_rede: number | null;
  observacoes: string | null;
  ordem: number | null;
  property?: PropertyRow | null;
}

export function useTabelaPublica(tableId: string | undefined) {
  return useQuery({
    queryKey: ['tabela-publica', tableId],
    enabled: !!tableId,
    queryFn: async (): Promise<{ tabela: TabelaPublicaMeta; itens: TabelaPublicaItem[] } | null> => {
      const { data: tabela, error: tErr } = await supabase
        .from('mt_network_tables')
        .select('id, nome, descricao, tipo, validade_inicio, validade_fim, total_imoveis, foto_capa_url')
        .eq('id', tableId!)
        .eq('visibilidade', 'publica')
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!tabela) return null;

      const { data: items, error: iErr } = await supabase
        .from('mt_network_table_items')
        .select(`
          valor_rede, observacoes, ordem,
          property:mt_properties (${SELECT})
        `)
        .eq('table_id', tableId!)
        .eq('is_active', true)
        .order('ordem', { ascending: true });
      if (iErr) throw iErr;

      const itens: TabelaPublicaItem[] = (items as unknown as ItemRow[])
        .filter(it => it.property)
        .map(it => ({
          ...mapRow(it.property as PropertyRow),
          valor_rede: it.valor_rede,
          observacoes: it.observacoes,
          ordem: it.ordem,
        }));

      return { tabela: tabela as TabelaPublicaMeta, itens };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Estatísticas para o hero (total de imóveis, lançamentos, bairros)
export function useTabelasStats() {
  return useQuery({
    queryKey: ['tabelas-stats'],
    queryFn: async () => {
      const base = supabase
        .from('mt_properties')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', VINIUN_TENANT_ID)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null);

      const [total, lancamentos] = await Promise.all([
        base,
        supabase
          .from('mt_properties')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', VINIUN_TENANT_ID)
          .eq('situacao', 'disponivel')
          .eq('lancamento', true)
          .is('deleted_at', null),
      ]);

      return {
        totalImoveis: total.count ?? 0,
        totalLancamentos: lancamentos.count ?? 0,
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}
