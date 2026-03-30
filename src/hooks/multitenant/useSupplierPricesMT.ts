import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  SupplierPriceList, SupplierPriceListCreate,
  SupplierPrice, SupplierPriceCreate,
  PriceComparisonRow, PriceHistoryPoint,
  InventoryProduct,
} from '@/types/estoque';

// =============================================================================
// Normalize string for fuzzy matching (remove accents, lowercase, trim)
// =============================================================================
function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// =============================================================================
// HOOK: useSupplierPriceListsMT
// CRUD de tabelas de preco de fornecedores
// =============================================================================

export function useSupplierPriceListsMT(supplierId?: string) {
  const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchPriceLists = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_supplier_price_lists')
        .select('*, supplier:mt_inventory_suppliers(id, nome_fantasia)')
        .is('deleted_at', null)
        .order('data_vigencia', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (supplierId) query = query.eq('supplier_id', supplierId);

      const { data, error } = await query;
      if (error) throw error;

      // Count prices per list
      const lists = (data || []) as SupplierPriceList[];
      if (lists.length > 0) {
        const ids = lists.map(l => l.id);
        const { data: counts } = await supabase
          .from('mt_supplier_prices')
          .select('price_list_id')
          .in('price_list_id', ids);

        const countMap = new Map<string, number>();
        (counts || []).forEach((c: any) => {
          countMap.set(c.price_list_id, (countMap.get(c.price_list_id) || 0) + 1);
        });
        lists.forEach(l => { l._count = countMap.get(l.id) || 0; });
      }

      setPriceLists(lists);
    } catch (err) {
      console.error('Erro ao carregar tabelas de preco:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, supplierId]);

  const createPriceList = useCallback(async (data: SupplierPriceListCreate): Promise<SupplierPriceList> => {
    const { data: created, error } = await supabase
      .from('mt_supplier_price_lists')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    toast.success('Tabela de precos criada');
    await fetchPriceLists();
    return created as SupplierPriceList;
  }, [tenant?.id, fetchPriceLists]);

  const updatePriceList = useCallback(async (id: string, data: Partial<SupplierPriceListCreate>) => {
    const { error } = await supabase
      .from('mt_supplier_price_lists')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Tabela de precos atualizada');
    await fetchPriceLists();
  }, [fetchPriceLists]);

  const deletePriceList = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_supplier_price_lists')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Tabela de precos removida');
    await fetchPriceLists();
  }, [fetchPriceLists]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchPriceLists();
  }, [fetchPriceLists, tenant?.id, accessLevel]);

  return { priceLists, isLoading, refetch: fetchPriceLists, createPriceList, updatePriceList, deletePriceList };
}

// =============================================================================
// HOOK: useSupplierPricesMT
// CRUD de precos individuais + auto-map
// =============================================================================

export function useSupplierPricesMT(priceListId?: string) {
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchPrices = useCallback(async () => {
    if (!priceListId) { setPrices([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_supplier_prices')
        .select('*, product:mt_inventory_products(id, nome, codigo, unidade_medida, categoria)')
        .eq('price_list_id', priceListId)
        .order('nome_produto_fornecedor', { ascending: true });

      if (error) throw error;
      setPrices((data || []) as SupplierPrice[]);
    } catch (err) {
      console.error('Erro ao carregar precos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [priceListId]);

  const createPrice = useCallback(async (data: SupplierPriceCreate): Promise<SupplierPrice> => {
    const { data: created, error } = await supabase
      .from('mt_supplier_prices')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    await fetchPrices();
    return created as SupplierPrice;
  }, [tenant?.id, fetchPrices]);

  const createPricesBatch = useCallback(async (items: SupplierPriceCreate[]): Promise<number> => {
    if (items.length === 0) return 0;
    const rows = items.map(item => ({ tenant_id: tenant?.id, ...item }));
    const { error } = await supabase
      .from('mt_supplier_prices')
      .insert(rows);

    if (error) throw error;
    toast.success(`${items.length} precos cadastrados`);
    await fetchPrices();
    return items.length;
  }, [tenant?.id, fetchPrices]);

  const updatePrice = useCallback(async (id: string, data: Partial<SupplierPriceCreate>) => {
    const { error } = await supabase
      .from('mt_supplier_prices')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchPrices();
  }, [fetchPrices]);

  const deletePrice = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_supplier_prices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchPrices();
  }, [fetchPrices]);

  const mapProduct = useCallback(async (priceId: string, productId: string | null) => {
    const { error } = await supabase
      .from('mt_supplier_prices')
      .update({
        product_id: productId,
        is_mapped: !!productId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', priceId);

    if (error) throw error;
    await fetchPrices();
  }, [fetchPrices]);

  const autoMapProducts = useCallback(async (): Promise<number> => {
    // Fetch all inventory products for this tenant
    let query = supabase
      .from('mt_inventory_products')
      .select('id, nome')
      .is('deleted_at', null)
      .eq('is_active', true);
    if (tenant?.id) query = query.eq('tenant_id', tenant.id);

    const { data: products } = await query;
    if (!products || products.length === 0) return 0;

    // Build normalized map: normalizedName -> product
    const productMap = new Map<string, { id: string; nome: string }>();
    (products as any[]).forEach(p => {
      productMap.set(normalizeStr(p.nome), p);
    });

    let mapped = 0;
    const unmappedPrices = prices.filter(p => !p.is_mapped);

    for (const price of unmappedPrices) {
      const normalized = normalizeStr(price.nome_produto_fornecedor);

      // Try exact match
      let match = productMap.get(normalized);

      // Try includes match
      if (!match) {
        for (const [key, product] of productMap.entries()) {
          if (normalized.includes(key) || key.includes(normalized)) {
            match = product;
            break;
          }
        }
      }

      if (match) {
        await supabase
          .from('mt_supplier_prices')
          .update({ product_id: match.id, is_mapped: true, updated_at: new Date().toISOString() })
          .eq('id', price.id);
        mapped++;
      }
    }

    if (mapped > 0) {
      toast.success(`${mapped} produto(s) mapeado(s) automaticamente`);
      await fetchPrices();
    } else {
      toast.info('Nenhum produto foi mapeado automaticamente');
    }

    return mapped;
  }, [tenant?.id, prices, fetchPrices]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return {
    prices, isLoading, refetch: fetchPrices,
    createPrice, createPricesBatch, updatePrice, deletePrice,
    mapProduct, autoMapProducts,
  };
}

// =============================================================================
// HOOK: usePriceComparisonMT
// Matriz comparativa: ultimo preco por (fornecedor, produto)
// =============================================================================

export function usePriceComparisonMT(supplierIds: string[], categoryFilter?: string) {
  const [rows, setRows] = useState<PriceComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tenant, accessLevel } = useTenantContext();

  const fetchComparison = useCallback(async () => {
    if (supplierIds.length === 0) { setRows([]); return; }
    setIsLoading(true);
    try {
      // 1. Get all mapped prices for selected suppliers (only latest per supplier+product)
      let priceQuery = supabase
        .from('mt_supplier_prices')
        .select('*, price_list:mt_supplier_price_lists(data_vigencia, deleted_at), supplier:mt_inventory_suppliers(id, nome_fantasia)')
        .in('supplier_id', supplierIds)
        .eq('is_mapped', true)
        .not('product_id', 'is', null);

      if (tenant?.id) priceQuery = priceQuery.eq('tenant_id', tenant.id);

      const { data: allPrices, error: priceError } = await priceQuery;
      if (priceError) throw priceError;

      // Filter out deleted price lists
      const validPrices = ((allPrices || []) as any[]).filter(
        p => p.price_list && !p.price_list.deleted_at
      );

      // 2. Get latest price per (supplier, product)
      const latestMap = new Map<string, any>(); // key: supplierId_productId
      validPrices.forEach(p => {
        const key = `${p.supplier_id}_${p.product_id}`;
        const existing = latestMap.get(key);
        if (!existing || p.price_list.data_vigencia > existing.price_list.data_vigencia) {
          latestMap.set(key, p);
        }
      });

      // 3. Get all products that have prices
      const productIds = [...new Set([...latestMap.values()].map(p => p.product_id))];
      if (productIds.length === 0) { setRows([]); setIsLoading(false); return; }

      let prodQuery = supabase
        .from('mt_inventory_products')
        .select('*')
        .in('id', productIds)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (categoryFilter) prodQuery = prodQuery.eq('categoria', categoryFilter);

      const { data: products, error: prodError } = await prodQuery;
      if (prodError) throw prodError;

      // 4. Build comparison rows
      const compRows: PriceComparisonRow[] = ((products || []) as InventoryProduct[]).map(product => {
        const priceEntries = supplierIds
          .map(sid => {
            const entry = latestMap.get(`${sid}_${product.id}`);
            if (!entry) return null;
            return {
              supplier_id: sid,
              supplier_name: entry.supplier?.nome_fantasia || '',
              preco_unitario: Number(entry.preco_unitario),
              data_vigencia: entry.price_list?.data_vigencia || '',
              price_list_id: entry.price_list_id,
            };
          })
          .filter(Boolean) as PriceComparisonRow['prices'];

        const validPrices = priceEntries.map(p => p.preco_unitario).filter(v => v > 0);
        const best = validPrices.length > 0 ? Math.min(...validPrices) : null;
        const worst = validPrices.length > 0 ? Math.max(...validPrices) : null;

        return {
          product,
          prices: priceEntries,
          best_price: best,
          worst_price: worst !== best ? worst : null,
        };
      });

      setRows(compRows);
    } catch (err) {
      console.error('Erro ao carregar comparativo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supplierIds, categoryFilter, tenant?.id]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchComparison();
  }, [fetchComparison, tenant?.id, accessLevel]);

  return { rows, isLoading, refetch: fetchComparison };
}

// =============================================================================
// HOOK: usePriceHistoryMT
// Historico de precos de um produto por fornecedor ao longo do tempo
// =============================================================================

export function usePriceHistoryMT(productId?: string) {
  const [history, setHistory] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchHistory = useCallback(async () => {
    if (!productId) { setHistory([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_supplier_prices')
        .select('preco_unitario, supplier_id, supplier:mt_inventory_suppliers(nome_fantasia), price_list:mt_supplier_price_lists(data_vigencia, deleted_at)')
        .eq('product_id', productId)
        .eq('is_mapped', true);

      if (error) throw error;

      const points: PriceHistoryPoint[] = ((data || []) as any[])
        .filter(d => d.price_list && !d.price_list.deleted_at)
        .map(d => ({
          data_vigencia: d.price_list.data_vigencia,
          supplier_id: d.supplier_id,
          supplier_name: d.supplier?.nome_fantasia || '',
          preco_unitario: Number(d.preco_unitario),
        }))
        .sort((a, b) => a.data_vigencia.localeCompare(b.data_vigencia));

      setHistory(points);
    } catch (err) {
      console.error('Erro ao carregar historico:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, refetch: fetchHistory };
}
