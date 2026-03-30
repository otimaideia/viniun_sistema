import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  InventoryProduct, InventoryProductCreate, InventoryProductUpdate, InventoryProductFilters,
  InventorySupplier, InventorySupplierCreate,
  InventoryStock, InventoryStockCreate,
  InventoryMovement, InventoryMovementCreate,
  ServiceProduct, ServiceProductCreate,
  ProcedureConsumption, ProcedureConsumptionCreate,
  InventoryAlert, EstoqueDashboardMetrics,
  FichaTecnicaItem,
} from '@/types/estoque';

// =============================================================================
// HOOK: useInventoryProductsMT
// CRUD de produtos do catálogo de insumos
// =============================================================================

export function useInventoryProductsMT(filters?: InventoryProductFilters) {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_inventory_products')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (filters?.categoria) query = query.eq('categoria', filters.categoria);
      if (filters?.is_fracionado !== undefined) query = query.eq('is_fracionado', filters.is_fracionado);
      if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);
      if (filters?.search) query = query.ilike('nome', `%${filters.search}%`);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setProducts((data || []) as InventoryProduct[]);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar produtos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.categoria, filters?.is_fracionado, filters?.is_active, filters?.franchise_id, filters?.search]);

  const createProduct = useCallback(async (data: InventoryProductCreate): Promise<InventoryProduct> => {
    // Calcular custo unitário fracionado automaticamente
    let custo_unitario_fracionado = null;
    if (data.is_fracionado && data.custo_pix && data.doses_por_unidade) {
      custo_unitario_fracionado = Number((data.custo_pix / data.doses_por_unidade).toFixed(2));
    }

    const { data: created, error: createError } = await supabase
      .from('mt_inventory_products')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        ...data,
        custo_unitario_fracionado,
      })
      .select()
      .single();

    if (createError) throw createError;
    toast.success('Produto criado com sucesso');
    await fetchProducts();
    return created as InventoryProduct;
  }, [tenant?.id, franchise?.id, fetchProducts]);

  const updateProduct = useCallback(async (data: InventoryProductUpdate): Promise<InventoryProduct> => {
    const { id, ...updates } = data;

    // Recalcular custo fracionado se necessário
    if (updates.is_fracionado && updates.custo_pix && updates.doses_por_unidade) {
      (updates as any).custo_unitario_fracionado = Number((updates.custo_pix / updates.doses_por_unidade).toFixed(2));
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_inventory_products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    toast.success('Produto atualizado com sucesso');
    await fetchProducts();
    return updated as InventoryProduct;
  }, [fetchProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('mt_inventory_products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;
    toast.success('Produto removido com sucesso');
    await fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') {
      fetchProducts();
    }
  }, [fetchProducts, tenant?.id, accessLevel]);

  return { products, isLoading, error, refetch: fetchProducts, createProduct, updateProduct, deleteProduct };
}

// =============================================================================
// HOOK: useInventoryProductMT
// Detalhe de um produto
// =============================================================================

export function useInventoryProductMT(id?: string) {
  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_inventory_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data as InventoryProduct);
    } catch (err) {
      console.error('Erro ao carregar produto:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  return { product, isLoading, refetch: fetchProduct };
}

// =============================================================================
// HOOK: useInventoryStockMT
// Estoque real por franquia com lotes
// =============================================================================

export function useInventoryStockMT(franchiseId?: string, productId?: string) {
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_inventory_stock')
        .select('*, product:mt_inventory_products(id, nome, codigo, unidade_medida, categoria), supplier:mt_inventory_suppliers(id, nome_fantasia)')
        .order('data_validade', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const fId = franchiseId || franchise?.id;
      if (fId && accessLevel !== 'platform') query = query.eq('franchise_id', fId);
      if (productId) query = query.eq('product_id', productId);

      const { data, error } = await query;
      if (error) throw error;
      setStock((data || []) as InventoryStock[]);
    } catch (err) {
      console.error('Erro ao carregar estoque:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, franchiseId, productId, accessLevel]);

  const createStock = useCallback(async (data: InventoryStockCreate): Promise<InventoryStock> => {
    const { data: created, error } = await supabase
      .from('mt_inventory_stock')
      .insert({
        tenant_id: tenant?.id,
        ...data,
        quantidade_atual: data.quantidade_inicial,
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Entrada de estoque registrada');
    await fetchStock();
    return created as InventoryStock;
  }, [tenant?.id, fetchStock]);

  const updateStock = useCallback(async (id: string, data: Partial<InventoryStockCreate>) => {
    const { error } = await supabase
      .from('mt_inventory_stock')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Estoque atualizado');
    await fetchStock();
  }, [fetchStock]);

  const deleteStock = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_inventory_stock')
      .delete()
      .eq('id', id);

    if (error) throw error;
    toast.success('Registro de estoque removido');
    await fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchStock();
  }, [fetchStock, tenant?.id, accessLevel]);

  return { stock, isLoading, refetch: fetchStock, createStock, updateStock, deleteStock };
}

// =============================================================================
// HOOK: useInventoryMovementsMT
// Histórico de movimentações
// =============================================================================

interface MovementFilters {
  franchise_id?: string;
  product_id?: string;
  tipo?: string;
  date_from?: string;
  date_to?: string;
}

export function useInventoryMovementsMT(filters?: MovementFilters) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_inventory_movements')
        .select('*, product:mt_inventory_products(id, nome, codigo, unidade_medida)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);
      else if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.product_id) query = query.eq('product_id', filters.product_id);
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      setMovements((data || []) as InventoryMovement[]);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.franchise_id, filters?.product_id, filters?.tipo, filters?.date_from, filters?.date_to]);

  const createMovement = useCallback(async (data: InventoryMovementCreate): Promise<InventoryMovement> => {
    const { data: created, error } = await supabase
      .from('mt_inventory_movements')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;

    // Atualizar estoque se for entrada/saída
    if (data.stock_id && (data.tipo === 'entrada' || data.tipo === 'saida' || data.tipo === 'ajuste' || data.tipo === 'perda')) {
      const delta = data.tipo === 'entrada' ? Math.abs(data.quantidade) : -Math.abs(data.quantidade);
      const { error: rpcError } = await supabase.rpc('increment_stock_quantity', { p_stock_id: data.stock_id, p_delta: delta });
      if (rpcError) {
        // Se RPC não existir, fazer manualmente
        const { data: stockData, error: fetchStockError } = await supabase
          .from('mt_inventory_stock')
          .select('quantidade_atual')
          .eq('id', data.stock_id!)
          .single();

        if (fetchStockError) throw fetchStockError;
        if (stockData) {
          const { error: updateStockError } = await supabase
            .from('mt_inventory_stock')
            .update({ quantidade_atual: (stockData as any).quantidade_atual + delta, updated_at: new Date().toISOString() })
            .eq('id', data.stock_id!);

          if (updateStockError) throw updateStockError;
        }
      }
    }

    toast.success('Movimentação registrada');
    await fetchMovements();
    return created as InventoryMovement;
  }, [tenant?.id, fetchMovements]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchMovements();
  }, [fetchMovements, tenant?.id, accessLevel]);

  return { movements, isLoading, refetch: fetchMovements, createMovement };
}

// =============================================================================
// HOOK: useServiceProductsMT
// Vínculos serviço ↔ produto (consumo padrão)
// =============================================================================

export function useServiceProductsMT(serviceId?: string) {
  const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchServiceProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_service_products')
        .select('*, product:mt_inventory_products(id, nome, codigo, unidade_medida, categoria, dose_padrao, custo_pix, custo_cartao, custo_unitario_fracionado, is_fracionado, quantidade_total_unidade), service:mt_services(id, nome)')
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (serviceId) query = query.eq('service_id', serviceId);

      const { data, error } = await query;
      if (error) throw error;
      setServiceProducts((data || []) as ServiceProduct[]);
    } catch (err) {
      console.error('Erro ao carregar vínculos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, serviceId]);

  // Recalcular custo_insumos, custo_total_sessao e margens no mt_services
  const recalculateServiceCost = useCallback(async (svcId: string) => {
    try {
      // 1. Buscar vínculos com custos dos produtos
      const { data: links } = await supabase
        .from('mt_service_products')
        .select('quantidade, product:mt_inventory_products(custo_pix, custo_unitario_fracionado, is_fracionado)')
        .eq('service_id', svcId);

      let custoInsumos = 0;
      (links || []).forEach((link: any) => {
        const p = link.product;
        if (!p) return;
        const custoUnit = p.is_fracionado && p.custo_unitario_fracionado
          ? p.custo_unitario_fracionado
          : (p.custo_pix || 0);
        custoInsumos += custoUnit * (link.quantidade || 0);
      });

      // 2. Buscar dados atuais do serviço (mão de obra, fixos, preços)
      const { data: svc } = await supabase
        .from('mt_services')
        .select('custo_mao_obra, custo_fixo_rateado, preco_tabela_maior, preco_tabela_menor')
        .eq('id', svcId)
        .single();

      const custoMaoObra = Number(svc?.custo_mao_obra) || 0;
      const custoFixo = Number(svc?.custo_fixo_rateado) || 0;
      const custoTotalSessao = custoInsumos + custoMaoObra + custoFixo;

      const margemMaior = svc?.preco_tabela_maior ? Number(svc.preco_tabela_maior) - custoTotalSessao : null;
      const margemMenor = svc?.preco_tabela_menor ? Number(svc.preco_tabela_menor) - custoTotalSessao : null;

      // 3. Atualizar mt_services com custos e margens
      await supabase
        .from('mt_services')
        .update({
          custo_insumos: Number(custoInsumos.toFixed(2)),
          custo_total_sessao: Number(custoTotalSessao.toFixed(2)),
          margem_maior: margemMaior !== null ? Number(margemMaior.toFixed(2)) : null,
          margem_menor: margemMenor !== null ? Number(margemMenor.toFixed(2)) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', svcId);
    } catch (err) {
      console.error('Erro ao recalcular custo do serviço:', err);
    }
  }, []);

  const createServiceProduct = useCallback(async (data: ServiceProductCreate): Promise<ServiceProduct> => {
    const { data: created, error } = await supabase
      .from('mt_service_products')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    toast.success('Insumo adicionado à ficha técnica');
    await fetchServiceProducts();
    await recalculateServiceCost(data.service_id);
    return created as ServiceProduct;
  }, [tenant?.id, fetchServiceProducts, recalculateServiceCost]);

  const updateServiceProduct = useCallback(async (id: string, data: Partial<ServiceProductCreate>) => {
    const { error } = await supabase
      .from('mt_service_products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Ficha técnica atualizada');
    await fetchServiceProducts();
    // Recalcular custo se temos o serviceId
    if (data.service_id) await recalculateServiceCost(data.service_id);
    else if (serviceId) await recalculateServiceCost(serviceId);
  }, [fetchServiceProducts, recalculateServiceCost, serviceId]);

  const deleteServiceProduct = useCallback(async (id: string) => {
    // Pegar service_id antes de deletar para recalcular
    const sp = serviceProducts.find(s => s.id === id);
    const { error } = await supabase.from('mt_service_products').delete().eq('id', id);
    if (error) throw error;
    toast.success('Insumo removido da ficha técnica');
    await fetchServiceProducts();
    if (sp?.service_id) await recalculateServiceCost(sp.service_id);
    else if (serviceId) await recalculateServiceCost(serviceId);
  }, [fetchServiceProducts, recalculateServiceCost, serviceId, serviceProducts]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchServiceProducts();
  }, [fetchServiceProducts, tenant?.id, accessLevel]);

  return { serviceProducts, isLoading, refetch: fetchServiceProducts, createServiceProduct, updateServiceProduct, deleteServiceProduct, recalculateServiceCost };
}

// =============================================================================
// HOOK: useServiceCostMT
// Calcula custo total da ficha tecnica de um servico
// =============================================================================

export function useServiceCostMT(serviceId?: string, externalServiceProducts?: ServiceProduct[]) {
  const { serviceProducts: internalServiceProducts, isLoading } = useServiceProductsMT(externalServiceProducts ? undefined : serviceId);
  const serviceProducts = externalServiceProducts || internalServiceProducts;

  const items: FichaTecnicaItem[] = serviceProducts.map(sp => {
    const p = sp.product;
    const custoUnitCalc = p
      ? (p.is_fracionado && p.custo_unitario_fracionado
          ? p.custo_unitario_fracionado
          : (p.custo_pix || 0))
      : 0;
    return {
      ...sp,
      custo_unitario_calc: custoUnitCalc,
      custo_total_linha: custoUnitCalc * (sp.quantidade || 0),
    };
  });

  const custoTotal = items.reduce((sum, item) => sum + item.custo_total_linha, 0);

  return { items, custoTotal, isLoading };
}

// =============================================================================
// HOOK: useProcedureConsumptionsMT
// Consumo real por atendimento
// =============================================================================

export function useProcedureConsumptionsMT(appointmentId?: string) {
  const [consumptions, setConsumptions] = useState<ProcedureConsumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchConsumptions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_procedure_consumptions')
        .select('*, product:mt_inventory_products(id, nome, codigo, unidade_medida)')
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (appointmentId) query = query.eq('appointment_id', appointmentId);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setConsumptions((data || []) as ProcedureConsumption[]);
    } catch (err) {
      console.error('Erro ao carregar consumos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, appointmentId, accessLevel]);

  const createConsumption = useCallback(async (data: ProcedureConsumptionCreate): Promise<ProcedureConsumption> => {
    const { data: created, error } = await supabase
      .from('mt_procedure_consumptions')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;

    // Registrar movimentação de saída e deduzir do estoque
    if (data.stock_id && data.quantidade_usada) {
      const { error: movError } = await supabase
        .from('mt_inventory_movements')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: data.franchise_id || franchise?.id || null,
          product_id: data.product_id,
          stock_id: data.stock_id,
          tipo: 'saida',
          quantidade: Math.abs(data.quantidade_usada),
          motivo: `Consumo em atendimento${data.appointment_id ? ` #${data.appointment_id.slice(0, 8)}` : ''}`,
          referencia_tipo: 'consumption',
          referencia_id: (created as any).id,
        });

      if (movError) console.error('Erro ao registrar movimentação de consumo:', movError);

      // Deduzir do estoque
      const { data: stockData, error: fetchStockError } = await supabase
        .from('mt_inventory_stock')
        .select('quantidade_atual')
        .eq('id', data.stock_id)
        .single();

      if (fetchStockError) {
        console.error('Erro ao buscar estoque para dedução:', fetchStockError);
      } else if (stockData) {
        const novaQtd = Math.max(0, (stockData as any).quantidade_atual - Math.abs(data.quantidade_usada));
        const { error: updateError } = await supabase
          .from('mt_inventory_stock')
          .update({ quantidade_atual: novaQtd, updated_at: new Date().toISOString() })
          .eq('id', data.stock_id);

        if (updateError) console.error('Erro ao deduzir estoque:', updateError);
      }
    }

    toast.success('Consumo registrado');
    await fetchConsumptions();
    return created as ProcedureConsumption;
  }, [tenant?.id, franchise?.id, fetchConsumptions]);

  const deleteConsumption = useCallback(async (id: string) => {
    // Buscar consumo para reverter estoque
    const { data: consumption, error: fetchError } = await supabase
      .from('mt_procedure_consumptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const c = consumption as any;

    // Reverter estoque se havia stock_id vinculado
    if (c.stock_id && c.quantidade_usada) {
      // Devolver quantidade ao estoque
      const { data: stockData, error: fetchStockError } = await supabase
        .from('mt_inventory_stock')
        .select('quantidade_atual')
        .eq('id', c.stock_id)
        .single();

      if (!fetchStockError && stockData) {
        const novaQtd = (stockData as any).quantidade_atual + Math.abs(c.quantidade_usada);
        const { error: updateError } = await supabase
          .from('mt_inventory_stock')
          .update({ quantidade_atual: novaQtd, updated_at: new Date().toISOString() })
          .eq('id', c.stock_id);

        if (updateError) console.error('Erro ao reverter estoque:', updateError);
      }

      // Registrar movimentação de entrada (estorno)
      const { error: movError } = await supabase
        .from('mt_inventory_movements')
        .insert({
          tenant_id: c.tenant_id,
          franchise_id: c.franchise_id,
          product_id: c.product_id,
          stock_id: c.stock_id,
          tipo: 'entrada',
          quantidade: Math.abs(c.quantidade_usada),
          motivo: `Estorno de consumo #${id.slice(0, 8)}`,
          referencia_tipo: 'consumption_reversal',
          referencia_id: id,
        });

      if (movError) console.error('Erro ao registrar estorno:', movError);
    }

    // Deletar consumo
    const { error: deleteError } = await supabase
      .from('mt_procedure_consumptions')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    toast.success('Consumo removido e estoque revertido');
    await fetchConsumptions();
  }, [fetchConsumptions]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchConsumptions();
  }, [fetchConsumptions, tenant?.id, accessLevel]);

  return { consumptions, isLoading, refetch: fetchConsumptions, createConsumption, deleteConsumption };
}

// =============================================================================
// HOOK: useInventorySuppliersMT
// CRUD de fornecedores
// =============================================================================

export function useInventorySuppliersMT() {
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_inventory_suppliers')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nome_fantasia', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setSuppliers((data || []) as InventorySupplier[]);
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  const createSupplier = useCallback(async (data: InventorySupplierCreate): Promise<InventorySupplier> => {
    const { data: created, error } = await supabase
      .from('mt_inventory_suppliers')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    toast.success('Fornecedor criado com sucesso');
    await fetchSuppliers();
    return created as InventorySupplier;
  }, [tenant?.id, fetchSuppliers]);

  const updateSupplier = useCallback(async (id: string, data: Partial<InventorySupplierCreate>) => {
    const { error } = await supabase
      .from('mt_inventory_suppliers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Fornecedor atualizado');
    await fetchSuppliers();
  }, [fetchSuppliers]);

  const deleteSupplier = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_inventory_suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Fornecedor removido');
    await fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchSuppliers();
  }, [fetchSuppliers, tenant?.id, accessLevel]);

  return { suppliers, isLoading, refetch: fetchSuppliers, createSupplier, updateSupplier, deleteSupplier };
}

// =============================================================================
// HOOK: useInventoryAlertsMT
// Alertas de estoque
// =============================================================================

export function useInventoryAlertsMT() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_inventory_alerts')
        .select('*, product:mt_inventory_products(id, nome, codigo)')
        .eq('resolvido', false)
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setAlerts((data || []) as InventoryAlert[]);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('mt_inventory_alerts').update({ lido: true }).eq('id', id);
    await fetchAlerts();
  }, [fetchAlerts]);

  const resolveAlert = useCallback(async (id: string) => {
    await supabase.from('mt_inventory_alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', id);
    toast.success('Alerta resolvido');
    await fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchAlerts();
  }, [fetchAlerts, tenant?.id, accessLevel]);

  return { alerts, isLoading, refetch: fetchAlerts, markAsRead, resolveAlert };
}

// =============================================================================
// HOOK: useEstoqueDashboardMT
// KPIs do estoque
// =============================================================================

export function useEstoqueDashboardMT() {
  const [metrics, setMetrics] = useState<EstoqueDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const tenantFilter = tenant?.id ? `tenant_id.eq.${tenant.id}` : '';

      // Buscar produtos ativos
      const { data: products } = await supabase
        .from('mt_inventory_products')
        .select('id, estoque_minimo')
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('tenant_id', tenant?.id || '');

      // Buscar estoque
      const { data: stockData } = await supabase
        .from('mt_inventory_stock')
        .select('quantidade_atual, custo_unitario, product_id, data_validade')
        .eq('tenant_id', tenant?.id || '');

      // Buscar alertas pendentes
      const { count: alertCount } = await supabase
        .from('mt_inventory_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('resolvido', false)
        .eq('tenant_id', tenant?.id || '');

      // Buscar movimentações de hoje
      const hojeStr = new Date().toISOString().split('T')[0];
      const { count: movHojeCount } = await supabase
        .from('mt_inventory_movements')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant?.id || '')
        .gte('created_at', `${hojeStr}T00:00:00`);

      // Buscar consumo dos últimos 30 dias para calcular média mensal
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: consumosRecentes } = await supabase
        .from('mt_procedure_consumptions')
        .select('quantidade_usada')
        .eq('tenant_id', tenant?.id || '')
        .gte('created_at', trintaDiasAtras);

      const totalConsumo = (consumosRecentes || []).reduce((acc: number, c: any) => acc + (c.quantidade_usada || 0), 0);

      // Calcular métricas
      const hoje = new Date();
      const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

      let valorTotal = 0;
      let produtosEstoqueBaixo = 0;
      let produtosVencendo = 0;
      let produtosVencidos = 0;

      const stockByProduct = new Map<string, number>();
      (stockData || []).forEach((s: any) => {
        valorTotal += s.quantidade_atual * s.custo_unitario;
        stockByProduct.set(s.product_id, (stockByProduct.get(s.product_id) || 0) + s.quantidade_atual);

        if (s.data_validade) {
          const validade = new Date(s.data_validade);
          if (validade < hoje) produtosVencidos++;
          else if (validade < em30dias) produtosVencendo++;
        }
      });

      (products || []).forEach((p: any) => {
        const qtdAtual = stockByProduct.get(p.id) || 0;
        if (qtdAtual <= p.estoque_minimo) produtosEstoqueBaixo++;
      });

      setMetrics({
        valor_total_estoque: valorTotal,
        total_produtos: products?.length || 0,
        produtos_estoque_baixo: produtosEstoqueBaixo,
        produtos_vencendo_30dias: produtosVencendo,
        produtos_vencidos: produtosVencidos,
        alertas_pendentes: alertCount || 0,
        movimentacoes_hoje: movHojeCount || 0,
        consumo_medio_mensal: (products?.length || 0) > 0 ? Number((totalConsumo / (products?.length || 1)).toFixed(2)) : 0,
      });
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchMetrics();
  }, [fetchMetrics, tenant?.id, accessLevel]);

  return { metrics, isLoading, refetch: fetchMetrics };
}
