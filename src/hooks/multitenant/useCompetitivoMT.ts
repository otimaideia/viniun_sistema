// =============================================================================
// USE COMPETITIVO MT - Hook Multi-Tenant para Análise Competitiva
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTCompetitor, MTCompetitorCreate, MTCompetitorUpdate,
  MTCompetitorPrice, MTCompetitorPriceCreate, MTCompetitorPriceUpdate,
  ComparativoArea, ComparativoMetricas,
} from '@/types/competitivo';
import { useMemo } from 'react';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const COMPETITORS_KEY = 'mt-competitors';
const PRICES_KEY = 'mt-competitor-prices';
const COMPARATIVO_KEY = 'mt-comparativo';

// -----------------------------------------------------------------------------
// Hook: Concorrentes (CRUD)
// -----------------------------------------------------------------------------

export function useCompetitorsMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [COMPETITORS_KEY, tenant?.id],
    queryFn: async (): Promise<MTCompetitor[]> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não carregado');

      let q = supabase
        .from('mt_competitors')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTCompetitor[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (input: MTCompetitorCreate): Promise<MTCompetitor> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const slug = input.slug || input.nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('mt_competitors')
        .insert({
          ...input,
          tenant_id: input.tenant_id || tenant!.id,
          slug,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTCompetitor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [COMPETITORS_KEY] });
      toast.success(`Concorrente "${data.nome}" cadastrado!`);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao cadastrar concorrente'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTCompetitorUpdate): Promise<MTCompetitor> => {
      const { data, error } = await supabase
        .from('mt_competitors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTCompetitor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [COMPETITORS_KEY] });
      toast.success(`Concorrente "${data.nome}" atualizado!`);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_competitors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPETITORS_KEY] });
      toast.success('Concorrente removido!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover'),
  });

  return {
    competitors: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    create,
    update,
    remove,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Preços de Concorrentes (CRUD)
// -----------------------------------------------------------------------------

export function useCompetitorPricesMT(filters?: {
  competitorId?: string;
  genero?: string;
  categoria?: string;
  area?: string;
}) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [PRICES_KEY, tenant?.id, filters],
    queryFn: async (): Promise<MTCompetitorPrice[]> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não carregado');

      let q = supabase
        .from('mt_competitor_prices')
        .select('*, competitor:mt_competitors(id, nome, slug, website, logo_url)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('area_corporal')
        .order('genero');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }
      if (filters?.competitorId) q = q.eq('competitor_id', filters.competitorId);
      if (filters?.genero) q = q.eq('genero', filters.genero);
      if (filters?.categoria) q = q.eq('categoria', filters.categoria);
      if (filters?.area) q = q.eq('area_corporal', filters.area);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTCompetitorPrice[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (input: MTCompetitorPriceCreate): Promise<MTCompetitorPrice> => {
      if (!tenant && accessLevel !== 'platform') throw new Error('Tenant não definido');

      const { data, error } = await supabase
        .from('mt_competitor_prices')
        .insert({
          ...input,
          tenant_id: input.tenant_id || tenant!.id,
          data_coleta: input.data_coleta || new Date().toISOString().split('T')[0],
        })
        .select('*, competitor:mt_competitors(id, nome, slug)')
        .single();

      if (error) throw error;
      return data as MTCompetitorPrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMPARATIVO_KEY] });
      toast.success('Preço cadastrado!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao cadastrar preço'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTCompetitorPriceUpdate): Promise<MTCompetitorPrice> => {
      const { data, error } = await supabase
        .from('mt_competitor_prices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, competitor:mt_competitors(id, nome, slug)')
        .single();

      if (error) throw error;
      return data as MTCompetitorPrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMPARATIVO_KEY] });
      toast.success('Preço atualizado!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_competitor_prices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [COMPARATIVO_KEY] });
      toast.success('Preço removido!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover'),
  });

  return {
    prices: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    create,
    update,
    remove,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Análise Comparativa
// -----------------------------------------------------------------------------

export function useComparativoMT(genero?: 'feminino' | 'masculino') {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Buscar nossos serviços
  const servicesQuery = useQuery({
    queryKey: ['mt-services-comparativo', tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_services')
        .select('id, nome, area_corporal, preco, preco_promocional, preco_por_sessao, preco_tabela_maior, preco_tabela_menor, sessoes_protocolo, categoria')
        .eq('is_active', true);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Buscar preços dos concorrentes
  const competitorPricesQuery = useQuery({
    queryKey: [COMPARATIVO_KEY, tenant?.id, genero],
    queryFn: async () => {
      let q = supabase
        .from('mt_competitor_prices')
        .select('*, competitor:mt_competitors(id, nome, slug, logo_url)')
        .is('deleted_at', null)
        .eq('is_active', true);

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }
      if (genero) q = q.in('genero', [genero, 'unissex']);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Buscar lista de concorrentes
  const competitorsQuery = useQuery({
    queryKey: [COMPETITORS_KEY, tenant?.id, 'list'],
    queryFn: async () => {
      let q = supabase
        .from('mt_competitors')
        .select('id, nome, slug, logo_url')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nome');

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Calcular comparativo
  const { comparativo, metricas, competitors } = useMemo(() => {
    const services = servicesQuery.data || [];
    const prices = competitorPricesQuery.data || [];
    const comps = competitorsQuery.data || [];

    if (prices.length === 0) {
      return {
        comparativo: [],
        metricas: { total_areas: 0, abaixo_mercado: 0, dentro_mercado: 0, acima_mercado: 0, sem_dados: 0, economia_media_pct: 0 },
        competitors: comps,
      };
    }

    // Agrupar preços por área (normaliza 'unissex' para o gênero selecionado)
    const areaMap = new Map<string, MTCompetitorPrice[]>();
    for (const price of prices) {
      const key = price.area_corporal || 'unknown';
      if (!areaMap.has(key)) areaMap.set(key, []);
      areaMap.get(key)!.push(price);
    }

    const areaNomes: Record<string, string> = {
      'axilas': 'Axilas', 'virilha': 'Virilha', 'virilha-completa': 'Virilha Completa',
      'virilha-cavada': 'Virilha Cavada', 'anus': 'Perianal', 'perianal': 'Perianal',
      'areolas': 'Aréolas', 'bracos-inteiros': 'Braços Inteiros', 'antebraco': 'Antebraço',
      'pescoco': 'Pescoço', 'glabela': 'Glabela', 'testa': 'Testa',
      'faces-laterais': 'Faces Laterais', 'buco': 'Buço', 'costas': 'Costas',
      'abdomen': 'Abdômen', 'pernas-inteiras': 'Pernas Inteiras', 'meia-perna': 'Meia Perna',
      'pes': 'Pés', 'maos': 'Mãos', 'nuca': 'Nuca', 'queixo': 'Queixo',
      'orelhas': 'Orelhas', 'orelha': 'Orelhas', 'lombar': 'Lombar', 'barba': 'Barba',
      'ombros': 'Ombros', 'peitoral': 'Peitoral', 'gluteos': 'Glúteos',
      'gluteos-medios': 'Glúteos Médios', 'anterior-coxa': 'Anterior da Coxa',
      'posterior-coxa': 'Posterior da Coxa', 'interno-coxa': 'Interno da Coxa',
      'lateral-coxa': 'Lateral da Coxa', 'coxas': 'Coxas', 'seios': 'Seios',
      'infraumbilical': 'Infraumbilical', 'joelhos': 'Joelhos', 'rosto': 'Rosto',
      'rosto-inteiro': 'Rosto Inteiro', 'cabeca': 'Cabeça', 'mento': 'Mento (Queixo)',
      'nariz': 'Nariz', 'barriga': 'Barriga', 'linha-alba': 'Linha Alba',
      'maca-rosto': 'Maçã do Rosto', 'bracos': 'Braços', 'torax': 'Tórax',
      'faixa-barba': 'Faixa de Barba', 'costeletas': 'Costeletas', 'maxilar': 'Maxilar',
      'cavanhaque': 'Cavanhaque', 'bigode': 'Bigode',
      // Combos Vialaser
      'combo-virilha-perianal-axilas': 'Combo: Virilha+Perianal+Axilas',
      'combo-virilha-perianal-buco': 'Combo: Virilha+Perianal+Buço',
      'combo-virilha-perianal-linha-alba': 'Combo: Virilha+Perianal+Linha Alba',
      'combo-peito-barriga': 'Combo: Peito+Barriga',
    };

    const result: ComparativoArea[] = [];
    let abaixo = 0, dentro = 0, acima = 0, semDados = 0;
    let totalDif = 0, countDif = 0;

    for (const [areaSlug, areaPrices] of areaMap) {
      // Encontrar nosso serviço pela area_corporal (normaliza underscore/espaço para hífen)
      const normalizeArea = (a: string | null) => a?.toLowerCase().replace(/[\s_]+/g, '-') || '';
      const nossoServico = services.find(
        s => normalizeArea(s.area_corporal) === areaSlug || normalizeArea(s.area_corporal) === areaSlug.replace(/-/g, '_')
      );

      const concorrentesResumo = comps.map(comp => {
        const price = areaPrices.find(p => p.competitor_id === comp.id);
        return {
          competitor_id: comp.id,
          nome: comp.nome,
          preco_total: price?.preco_total ?? null,
          preco_promocional: price?.preco_promocional ?? null,
          preco_credito: price?.preco_credito ?? null,
          preco_pix: price?.preco_pix ?? null,
          preco_recorrencia: price?.preco_recorrencia ?? null,
          parcelas: price?.parcelas_max && price?.valor_parcela
            ? `${price.parcelas_max}x R$ ${Number(price.valor_parcela).toFixed(2)}`
            : null,
          parcelas_num: price?.parcelas_max ?? null,
          valor_parcela_num: price?.valor_parcela ? Number(price.valor_parcela) : null,
          sessoes: price?.sessoes_pacote ?? null,
          data_coleta: price?.data_coleta ?? null,
        };
      });

      // Calcular média do mercado baseada no CRÉDITO TOTAL (parcelas × valor_parcela)
      // Se não tem crédito, usa preco_promocional, depois preco_total como fallback
      const precosConc = concorrentesResumo
        .map(c => {
          const creditoTotal = c.parcelas_num && c.valor_parcela_num
            ? Math.round(c.parcelas_num * c.valor_parcela_num * 100) / 100
            : null;
          return creditoTotal ?? c.preco_promocional ?? c.preco_total;
        })
        .filter((p): p is number => p !== null && p > 0);
      const mediaMercado = precosConc.length > 0
        ? precosConc.reduce((a, b) => a + b, 0) / precosConc.length
        : null;

      // Usar preco_tabela_menor (preço a menor / preço real de venda)
      const nossoPreco = nossoServico?.preco_tabela_menor ?? nossoServico?.preco ?? nossoServico?.preco_tabela_maior ?? null;
      let posicao: 'abaixo' | 'dentro' | 'acima' | 'sem_dados' = 'sem_dados';
      let diferencaPct = 0;

      if (nossoPreco && mediaMercado) {
        diferencaPct = ((nossoPreco - mediaMercado) / mediaMercado) * 100;
        if (diferencaPct < -10) { posicao = 'abaixo'; abaixo++; }
        else if (diferencaPct > 10) { posicao = 'acima'; acima++; }
        else { posicao = 'dentro'; dentro++; }
        totalDif += diferencaPct;
        countDif++;
      } else {
        semDados++;
      }

      result.push({
        area_corporal: areaSlug,
        area_nome: areaNomes[areaSlug] || areaSlug,
        genero: (genero || 'feminino') as 'feminino' | 'masculino',
        nosso_preco: nossoPreco,
        nosso_preco_sessao: nossoServico?.preco_por_sessao ?? null,
        concorrentes: concorrentesResumo,
        media_mercado: mediaMercado,
        posicao,
        diferenca_pct: Math.round(diferencaPct * 10) / 10,
      });
    }

    // Ordenar por área
    result.sort((a, b) => a.area_nome.localeCompare(b.area_nome));

    return {
      comparativo: result,
      metricas: {
        total_areas: result.length,
        abaixo_mercado: abaixo,
        dentro_mercado: dentro,
        acima_mercado: acima,
        sem_dados: semDados,
        economia_media_pct: countDif > 0 ? Math.round((totalDif / countDif) * 10) / 10 : 0,
      },
      competitors: comps,
    };
  }, [servicesQuery.data, competitorPricesQuery.data, competitorsQuery.data]);

  return {
    comparativo,
    metricas,
    competitors,
    isLoading: servicesQuery.isLoading || competitorPricesQuery.isLoading || competitorsQuery.isLoading || isTenantLoading,
    error: servicesQuery.error || competitorPricesQuery.error,
    refetch: () => {
      servicesQuery.refetch();
      competitorPricesQuery.refetch();
      competitorsQuery.refetch();
    },
  };
}
