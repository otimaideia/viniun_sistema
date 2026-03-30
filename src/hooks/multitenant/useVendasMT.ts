import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logLeadActivity } from '@/utils/leadActivityLogger';
import { toast } from 'sonner';
import type {
  Sale, SaleCreate, SaleUpdate, SaleFilters, SaleItem, SaleItemCreate,
  SalePayment, SalePaymentCreate,
  Commission, CommissionCreate, CommissionFilters, VendasDashboardMetrics,
} from '@/types/vendas';

// =============================================================================
// HOOK: useVendasMT
// CRUD de vendas
// =============================================================================

export function useVendasMT(filters?: SaleFilters) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { user: authUser } = useAuth();

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_sales')
        .select('*, profissional:mt_users!mt_sales_profissional_id_fkey(id, nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.forma_pagamento) query = query.eq('forma_pagamento', filters.forma_pagamento);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);
      if (filters?.profissional_id) query = query.eq('profissional_id', filters.profissional_id);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);
      if (filters?.search) query = query.ilike('cliente_nome', `%${filters.search}%`);
      if (filters?.promotion_id) query = query.eq('promotion_id', filters.promotion_id);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSales((data || []) as Sale[]);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar vendas'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.status, filters?.forma_pagamento, filters?.franchise_id, filters?.profissional_id, filters?.date_from, filters?.date_to, filters?.search, filters?.promotion_id]);

  // Gera numero_venda no formato V-{YYYYMM}-{sequential}
  const generateNumeroVenda = useCallback(async (): Promise<string> => {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `V-${yyyymm}-`;

    const { data: lastSale } = await supabase
      .from('mt_sales')
      .select('numero_venda')
      .eq('tenant_id', tenant?.id!)
      .like('numero_venda', `${prefix}%`)
      .order('numero_venda', { ascending: false })
      .limit(1);

    let seq = 1;
    if (lastSale && lastSale.length > 0 && lastSale[0].numero_venda) {
      const lastNum = lastSale[0].numero_venda.split('-').pop();
      seq = (parseInt(lastNum || '0', 10) || 0) + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }, [tenant?.id]);

  // Auto-cria transação financeira ao concluir venda
  const autoCreateFinancialTransaction = useCallback(async (sale: Sale) => {
    try {
      await supabase.from('mt_financial_transactions').insert({
        tenant_id: sale.tenant_id,
        franchise_id: sale.franchise_id,
        tipo: 'receita',
        descricao: `Venda ${sale.numero_venda || sale.id} - ${sale.cliente_nome}`,
        valor: sale.valor_total,
        sale_id: sale.id,
        forma_pagamento: sale.forma_pagamento,
        status: 'pago',
        data_competencia: new Date().toISOString().split('T')[0],
        data_pagamento: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Erro ao criar transação financeira:', err);
    }
  }, []);

  // Auto-cria planos de tratamento para itens com sessões > 1
  interface RecurrenceConfig {
    recorrencia_tipo?: string;
    recorrencia_intervalo_dias?: number;
    dia_preferencial?: number;
    hora_preferencial?: string;
    profissional_preferencial_id?: string;
    geracao_agenda?: string;
  }

  const autoCreateTreatmentPlans = useCallback(async (sale: Sale, recurrenceConfig?: RecurrenceConfig) => {
    try {
      // Buscar itens da venda
      const { data: items } = await supabase
        .from('mt_sale_items')
        .select('*')
        .eq('sale_id', sale.id);

      if (!items || items.length === 0) return;

      const intervaloDias = recurrenceConfig?.recorrencia_intervalo_dias || 30;
      const recorrenciaTipo = recurrenceConfig?.recorrencia_tipo || 'mensal';
      const geracaoAgenda = recurrenceConfig?.geracao_agenda || 'manual';

      for (const item of items) {
        const sessoes = (item as any).sessoes_protocolo || 1;
        if (sessoes <= 1) continue;
        if (!item.service_id) continue;

        // Verificar se já existe plano para este item
        const { data: existing } = await supabase
          .from('mt_treatment_plans')
          .select('id')
          .eq('sale_item_id', item.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Criar plano de tratamento
        const { data: plan, error: planError } = await supabase
          .from('mt_treatment_plans')
          .insert({
            tenant_id: sale.tenant_id,
            franchise_id: sale.franchise_id,
            sale_id: sale.id,
            sale_item_id: item.id,
            service_id: item.service_id,
            lead_id: sale.lead_id,
            cliente_nome: sale.cliente_nome,
            cliente_telefone: sale.cliente_telefone,
            total_sessoes: sessoes,
            status: 'ativo',
            recorrencia_tipo: recorrenciaTipo,
            recorrencia_intervalo_dias: intervaloDias,
            dia_preferencial: recurrenceConfig?.dia_preferencial || null,
            hora_preferencial: recurrenceConfig?.hora_preferencial || null,
            profissional_preferencial_id: recurrenceConfig?.profissional_preferencial_id || null,
            geracao_agenda: geracaoAgenda,
          })
          .select()
          .single();

        if (planError) {
          console.error('Erro ao criar plano de tratamento:', planError);
          continue;
        }

        // Criar sessões pendentes
        const sessions = [];
        let prevDate = new Date();

        for (let i = 1; i <= sessoes; i++) {
          const dataPrevista = new Date(prevDate);
          if (i > 1) dataPrevista.setDate(dataPrevista.getDate() + intervaloDias);

          sessions.push({
            tenant_id: sale.tenant_id,
            treatment_plan_id: plan.id,
            numero_sessao: i,
            data_prevista: dataPrevista.toISOString().split('T')[0],
            status: 'pendente',
            profissional_id: recurrenceConfig?.profissional_preferencial_id || null,
          });

          prevDate = dataPrevista;
        }

        if (sessions.length > 0) {
          await supabase.from('mt_treatment_sessions').insert(sessions);
        }
      }
    } catch (err) {
      console.error('Erro ao criar planos de tratamento:', err);
    }
  }, []);

  // DEPRECATED: Comissões agora são processadas automaticamente via useCommissionAutomationMT
  // - Comissões de venda (global/individual): processMonthlyCommissions()
  // - Produtividade: auto-criada em useTreatmentPlansMT.completeSession()

  const createSale = useCallback(async (data: SaleCreate): Promise<Sale> => {
    const { items, payments, _recurrenceConfig, ...saleData } = data;

    // Calcular margem
    const margem = saleData.valor_total - (saleData.custo_total || 0);

    // Gerar numero_venda
    const numero_venda = await generateNumeroVenda();

    const { data: created, error: createError } = await supabase
      .from('mt_sales')
      .insert({
        tenant_id: tenant?.id,
        ...saleData,
        numero_venda,
        margem,
      })
      .select()
      .single();

    if (createError) throw createError;

    const sale = created as Sale;

    // Criar itens da venda
    if (items && items.length > 0) {
      const saleItems = items.map(item => ({
        tenant_id: tenant?.id,
        sale_id: sale.id,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from('mt_sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Erro ao criar itens da venda:', itemsError);
      }
    }

    // Criar pagamentos da venda
    if (payments && payments.length > 0) {
      const salePayments = payments.map(p => ({
        tenant_id: tenant?.id,
        sale_id: sale.id,
        ...p,
      }));

      const { error: paymentsError } = await supabase
        .from('mt_sale_payments')
        .insert(salePayments);

      if (paymentsError) {
        console.error('Erro ao criar pagamentos da venda:', paymentsError);
      }
    }

    // Se venda já concluída, auto-criar transação financeira e planos
    if (sale.status === 'concluido') {
      await autoCreateFinancialTransaction(sale);
      await autoCreateTreatmentPlans(sale, _recurrenceConfig);
    }

    // Se venda aprovada, criar planos de tratamento
    if (sale.status === 'aprovado') {
      await autoCreateTreatmentPlans(sale, _recurrenceConfig);
    }

    // Log atividade no lead vinculado
    if (sale.lead_id && sale.tenant_id) {
      const valorStr = sale.valor_total
        ? ` no valor de R$ ${Number(sale.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '';
      logLeadActivity({
        tenantId: sale.tenant_id,
        leadId: sale.lead_id,
        tipo: 'conversao',
        titulo: 'Venda Criada',
        descricao: `Venda #${sale.numero_venda} criada${valorStr}`,
        dados: {
          sale_id: sale.id,
          numero_venda: sale.numero_venda,
          valor_total: sale.valor_total,
          status: sale.status,
          itens: items?.length || 0,
        },
        userId: authUser?.id,
        userNome: authUser?.email || 'Sistema',
      });
    }

    toast.success('Venda criada com sucesso');
    await fetchSales();
    return sale;
  }, [tenant?.id, fetchSales, generateNumeroVenda, autoCreateFinancialTransaction, autoCreateTreatmentPlans, authUser]);

  const updateSale = useCallback(async (data: SaleUpdate): Promise<Sale> => {
    const { id, ...updates } = data;

    // Buscar status anterior para detectar transição
    const { data: prev } = await supabase
      .from('mt_sales')
      .select('status')
      .eq('id', id)
      .single();

    const previousStatus = (prev as any)?.status;

    // Recalcular margem se valor mudou
    if (updates.valor_total !== undefined || updates.custo_total !== undefined) {
      const valorTotal = updates.valor_total ?? 0;
      const custoTotal = updates.custo_total ?? 0;
      (updates as any).margem = valorTotal - custoTotal;
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_sales')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const sale = updated as Sale;

    // Se status mudou para concluido, auto-criar transação financeira e planos
    if (sale.status === 'concluido' && previousStatus !== 'concluido') {
      await autoCreateFinancialTransaction(sale);
      await autoCreateTreatmentPlans(sale);
    }

    // Se status mudou para aprovado, criar planos de tratamento
    if (sale.status === 'aprovado' && previousStatus !== 'aprovado') {
      await autoCreateTreatmentPlans(sale);
    }

    // Log atividade no lead vinculado (se status mudou)
    if (sale.lead_id && sale.tenant_id && previousStatus !== sale.status) {
      logLeadActivity({
        tenantId: sale.tenant_id,
        leadId: sale.lead_id,
        tipo: 'sistema',
        titulo: 'Venda Atualizada',
        descricao: `Venda #${sale.numero_venda}: status alterado de "${previousStatus}" para "${sale.status}"`,
        dados: { sale_id: sale.id, status_anterior: previousStatus, status_novo: sale.status },
        userId: authUser?.id,
        userNome: authUser?.email || 'Sistema',
      });
    }

    toast.success('Venda atualizada');
    await fetchSales();
    return sale;
  }, [fetchSales, autoCreateFinancialTransaction, autoCreateTreatmentPlans, authUser]);

  const deleteSale = useCallback(async (id: string, motivo?: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('mt_sales')
      .update({
        deleted_at: now,
        status: 'cancelado',
        motivo_cancelamento: motivo || null,
        data_cancelamento: now,
      })
      .eq('id', id);

    if (error) throw error;

    // Cancelar planos de tratamento vinculados
    await supabase
      .from('mt_treatment_plans')
      .update({ status: 'cancelado', updated_at: now })
      .eq('sale_id', id)
      .is('deleted_at', null);

    toast.success('Venda cancelada');
    await fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchSales();
  }, [fetchSales, tenant?.id, accessLevel]);

  return { sales, isLoading, error, refetch: fetchSales, createSale, updateSale, deleteSale };
}

// =============================================================================
// HOOK: useVendaMT
// Detalhe de uma venda com itens
// =============================================================================

export function useVendaMT(id?: string) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSale = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [saleRes, itemsRes, paymentsRes] = await Promise.all([
        supabase.from('mt_sales').select('*, profissional:mt_users!mt_sales_profissional_id_fkey(id, nome), lead:mt_leads!mt_sales_lead_id_fkey(id, nome, telefone, email)').eq('id', id).single(),
        supabase.from('mt_sale_items').select('*').eq('sale_id', id).order('created_at'),
        supabase.from('mt_sale_payments').select('*').eq('sale_id', id).order('created_at'),
      ]);

      if (saleRes.error) throw saleRes.error;
      setSale(saleRes.data as Sale);
      setItems((itemsRes.data || []) as SaleItem[]);
      setPayments((paymentsRes.data || []) as SalePayment[]);
    } catch (err) {
      console.error('Erro ao carregar venda:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const updateSaleItem = useCallback(async (itemId: string, updates: Partial<SaleItemCreate>): Promise<SaleItem> => {
    const { data: updated, error } = await supabase
      .from('mt_sale_items')
      .update({ ...updates })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Item atualizado');
    await fetchSale();
    return updated as SaleItem;
  }, [fetchSale]);

  const deleteSaleItem = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from('mt_sale_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    toast.success('Item removido');
    await fetchSale();
  }, [fetchSale]);

  useEffect(() => { fetchSale(); }, [fetchSale]);

  return { sale, items, payments, isLoading, refetch: fetchSale, updateSaleItem, deleteSaleItem };
}

// =============================================================================
// HOOK: useServicePricingMT
// Precificacao unificada - lê precos diretamente de mt_services
// =============================================================================

export interface ServicePricing {
  id: string;
  nome: string;
  area_corporal: string | null;
  tamanho_area: string | null;
  preco_tabela_maior: number | null;
  preco_tabela_menor: number | null;
  preco_desconto: number | null;
  preco_volume: number | null;
  volume_minimo: number | null;
  preco_piso: number | null;
  custo_insumos: number | null;
  custo_pix: number | null;
  custo_cartao: number | null;
  margem_maior: number | null;
  margem_menor: number | null;
  preco_por_sessao: number | null;
  numero_sessoes: number | null;
  sessoes_protocolo: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  is_active: boolean;
}

export interface ServicePricingUpdate {
  id: string;
  preco_tabela_maior?: number | null;
  preco_tabela_menor?: number | null;
  preco_desconto?: number | null;
  preco_volume?: number | null;
  volume_minimo?: number | null;
  preco_piso?: number | null;
  custo_pix?: number | null;
  custo_cartao?: number | null;
  preco_por_sessao?: number | null;
  numero_sessoes?: number | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
}

export function useServicePricingMT(serviceId?: string) {
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const pricingFields = 'id, nome, area_corporal, tamanho_area, preco_tabela_maior, preco_tabela_menor, preco_desconto, preco_volume, volume_minimo, preco_piso, custo_insumos, custo_pix, custo_cartao, margem_maior, margem_menor, preco_por_sessao, numero_sessoes, sessoes_protocolo, vigencia_inicio, vigencia_fim, is_active';

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_services')
        .select(pricingFields)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nome');

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (serviceId) query = query.eq('id', serviceId);

      const { data, error } = await query;
      if (error) throw error;
      setServices((data || []) as ServicePricing[]);
    } catch (err) {
      console.error('Erro ao carregar preços dos serviços:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, serviceId]);

  const updateServicePricing = useCallback(async (data: ServicePricingUpdate): Promise<ServicePricing> => {
    const { id, ...updates } = data;

    // Recalculate margins
    const custo = updates.preco_tabela_maior !== undefined || updates.preco_tabela_menor !== undefined
      ? (await supabase.from('mt_services').select('custo_insumos').eq('id', id).single()).data?.custo_insumos || 0
      : 0;

    const finalUpdates: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.preco_tabela_maior !== undefined) {
      finalUpdates.margem_maior = updates.preco_tabela_maior != null ? updates.preco_tabela_maior - custo : null;
    }
    if (updates.preco_tabela_menor !== undefined) {
      finalUpdates.margem_menor = updates.preco_tabela_menor != null ? updates.preco_tabela_menor - custo : null;
    }

    const { data: updated, error } = await supabase
      .from('mt_services')
      .update(finalUpdates)
      .eq('id', id)
      .select(pricingFields)
      .single();

    if (error) throw error;
    toast.success('Preços atualizados');
    await fetchServices();
    return updated as ServicePricing;
  }, [fetchServices]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchServices();
  }, [fetchServices, tenant?.id, accessLevel]);

  // Validar se preço está acima do piso
  const validatePriceFloor = useCallback(async (svcId: string, proposedPrice: number): Promise<{ isAboveFloor: boolean; precoPiso: number | null }> => {
    const svc = services.find(s => s.id === svcId);
    if (!svc) return { isAboveFloor: true, precoPiso: null };
    const piso = svc.preco_piso ?? svc.preco_tabela_menor ?? 0;
    return { isAboveFloor: proposedPrice >= piso, precoPiso: piso };
  }, [services]);

  // Obter margem de desconto para um serviço
  const getMarginForService = useCallback((svcId: string): number | null => {
    const svc = services.find(s => s.id === svcId);
    if (!svc || !svc.preco_tabela_maior || !svc.preco_tabela_menor) return null;
    return ((svc.preco_tabela_maior - svc.preco_tabela_menor) / svc.preco_tabela_maior) * 100;
  }, [services]);

  return { services, isLoading, refetch: fetchServices, updateServicePricing, validatePriceFloor, getMarginForService };
}


// =============================================================================
// HOOK: useCommissionsMT
// Comissões: comissao_venda (consultoras 1%+1%) e produtividade (aplicadoras 10%)
// =============================================================================

export function useCommissionsMT(filters?: CommissionFilters) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.categoria) query = query.eq('categoria', filters.categoria);
      if (filters?.profissional_id) query = query.eq('profissional_id', filters.profissional_id);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query;
      if (error) throw error;
      setCommissions((data || []) as Commission[]);
    } catch (err) {
      console.error('Erro ao carregar comissões:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.status, filters?.categoria, filters?.profissional_id, filters?.date_from, filters?.date_to]);

  const createCommission = useCallback(async (data: CommissionCreate): Promise<Commission> => {
    const { data: created, error } = await supabase
      .from('mt_commissions')
      .insert({
        tenant_id: tenant?.id,
        ...data,
        status: 'pendente',
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Comissão criada');
    await fetchCommissions();
    return created as Commission;
  }, [tenant?.id, fetchCommissions]);

  // DEPRECATED: Comissões de venda agora são processadas via useCommissionAutomationMT.processMonthlyCommissions()
  // Mantido apenas para compatibilidade - será removido em versão futura
  const createSaleCommission = useCallback(async (params: {
    profissional_id: string;
    sale_id: string;
    franchise_id: string;
    valor_venda: number;
    meta_global_atingida: boolean;
    meta_individual_atingida: boolean;
    referencia_mes: string;
    percentual_global?: number; // default 1
    percentual_individual?: number; // default 1
  }) => {
    const comissoes: CommissionCreate[] = [];
    const pctGlobal = params.percentual_global ?? 1;
    const pctIndividual = params.percentual_individual ?? 1;

    // Comissão global (se meta da equipe atingida)
    if (params.meta_global_atingida) {
      comissoes.push({
        franchise_id: params.franchise_id,
        profissional_id: params.profissional_id,
        sale_id: params.sale_id,
        categoria: 'comissao_venda',
        tipo: 'percentual',
        percentual: pctGlobal,
        valor: params.valor_venda * (pctGlobal / 100),
        valor_base_calculo: params.valor_venda,
        meta_global_atingida: true,
        meta_individual_atingida: false,
        referencia_mes: params.referencia_mes,
        observacoes: `Comissão global (meta equipe atingida) - ${pctGlobal}%`,
      });
    }

    // Comissão individual (se meta individual atingida)
    if (params.meta_individual_atingida) {
      comissoes.push({
        franchise_id: params.franchise_id,
        profissional_id: params.profissional_id,
        sale_id: params.sale_id,
        categoria: 'comissao_venda',
        tipo: 'percentual',
        percentual: pctIndividual,
        valor: params.valor_venda * (pctIndividual / 100),
        valor_base_calculo: params.valor_venda,
        meta_global_atingida: false,
        meta_individual_atingida: true,
        referencia_mes: params.referencia_mes,
        observacoes: `Comissão individual (meta individual atingida) - ${pctIndividual}%`,
      });
    }

    if (comissoes.length === 0) return;

    const inserts = comissoes.map(c => ({
      tenant_id: tenant?.id,
      ...c,
      status: 'pendente',
    }));

    const { error } = await supabase.from('mt_commissions').insert(inserts);
    if (error) throw error;
    toast.success(`${comissoes.length} comissão(ões) de venda criada(s)`);
    await fetchCommissions();
  }, [tenant?.id, fetchCommissions]);

  // DEPRECATED: Produtividade agora é auto-criada em useTreatmentPlansMT.completeSession()
  // Mantido apenas para compatibilidade - será removido em versão futura
  const createProductivityCommission = useCallback(async (params: {
    profissional_id: string;
    sale_id: string;
    franchise_id: string;
    sale_item_id?: string;
    treatment_plan_id?: string;
    treatment_session_id?: string;
    numero_sessao?: number;
    valor_parcela_mensal: number; // ex: R$ 99,90
    percentual_produtividade?: number; // default 10
  }) => {
    const percentual = params.percentual_produtividade ?? 10;
    const valor = params.valor_parcela_mensal * (percentual / 100);

    const { error } = await supabase.from('mt_commissions').insert({
      tenant_id: tenant?.id,
      franchise_id: params.franchise_id,
      profissional_id: params.profissional_id,
      sale_id: params.sale_id,
      sale_item_id: params.sale_item_id || null,
      treatment_plan_id: params.treatment_plan_id || null,
      treatment_session_id: params.treatment_session_id || null,
      numero_sessao: params.numero_sessao || null,
      categoria: 'produtividade',
      tipo: 'percentual',
      percentual,
      valor,
      valor_base_calculo: params.valor_parcela_mensal,
      status: 'pendente',
      observacoes: `Produtividade sessão ${params.numero_sessao || '-'} (${percentual}% de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.valor_parcela_mensal)})`,
    });

    if (error) throw error;
    toast.success(`Produtividade de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)} criada`);
    await fetchCommissions();
  }, [tenant?.id, fetchCommissions]);

  const approveCommission = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_commissions')
      .update({ status: 'aprovado', data_aprovacao: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Comissão aprovada');
    await fetchCommissions();
  }, [fetchCommissions]);

  const payCommission = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_commissions')
      .update({ status: 'pago', data_pagamento: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Comissão paga');
    await fetchCommissions();
  }, [fetchCommissions]);

  const updateCommission = useCallback(async (id: string, updates: { valor?: number; percentual?: number | null; observacoes?: string | null }) => {
    const { error } = await supabase
      .from('mt_commissions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Comissão atualizada');
    await fetchCommissions();
  }, [fetchCommissions]);

  const bulkApprove = useCallback(async (ids: string[]) => {
    const { error } = await supabase
      .from('mt_commissions')
      .update({ status: 'aprovado', data_aprovacao: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;
    toast.success(`${ids.length} comissões aprovadas`);
    await fetchCommissions();
  }, [fetchCommissions]);

  const bulkPay = useCallback(async (ids: string[]) => {
    const { error } = await supabase
      .from('mt_commissions')
      .update({ status: 'pago', data_pagamento: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;
    toast.success(`${ids.length} comissões pagas`);
    await fetchCommissions();
  }, [fetchCommissions]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchCommissions();
  }, [fetchCommissions, tenant?.id, accessLevel]);

  return {
    commissions, isLoading, refetch: fetchCommissions,
    createCommission, createSaleCommission, createProductivityCommission,
    updateCommission, approveCommission, payCommission, bulkApprove, bulkPay,
  };
}

// =============================================================================
// HOOK: useVendasDashboardMT
// KPIs de vendas
// =============================================================================

export function useVendasDashboardMT() {
  const [metrics, setMetrics] = useState<VendasDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let query = supabase
        .from('mt_sales')
        .select('valor_total, custo_total, margem, status, forma_pagamento, created_at, tipo_parcelamento, abaixo_piso')
        .is('deleted_at', null);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data: allSales } = await query;

      // Comissões pendentes
      let commQuery = supabase
        .from('mt_commissions')
        .select('valor')
        .eq('status', 'pendente');
      if (tenant?.id) commQuery = commQuery.eq('tenant_id', tenant.id);
      const { data: pendingComm } = await commQuery;

      const sales = (allSales || []) as any[];
      const mesAtual = sales.filter(s => s.created_at >= startOfMonth);
      const concluidas = sales.filter(s => s.status === 'concluido');

      const vendas_por_status: Record<string, number> = {};
      const vendas_por_pagamento: Record<string, number> = {};
      sales.forEach(s => {
        vendas_por_status[s.status] = (vendas_por_status[s.status] || 0) + 1;
        if (s.forma_pagamento) {
          vendas_por_pagamento[s.forma_pagamento] = (vendas_por_pagamento[s.forma_pagamento] || 0) + 1;
        }
      });

      const receitaTotal = concluidas.reduce((sum: number, s: any) => sum + (s.valor_total || 0), 0);
      const receitaMes = mesAtual.filter(s => s.status === 'concluido').reduce((sum: number, s: any) => sum + (s.valor_total || 0), 0);
      const margemTotal = concluidas.reduce((sum: number, s: any) => sum + (s.margem || 0), 0);

      // Calcular métricas de recorrência e compliance
      const vendasRecorrencia = concluidas.filter((s: any) => s.tipo_parcelamento === 'recorrencia_18x' || s.forma_pagamento === 'recorrencia');
      const vendasCartao = concluidas.filter((s: any) => s.tipo_parcelamento === 'cartao_12x' || s.forma_pagamento === 'cartao_credito');
      const vendasAbaixoPiso = sales.filter((s: any) => s.abaixo_piso === true);

      setMetrics({
        receita_total: receitaTotal,
        receita_mes_atual: receitaMes,
        ticket_medio: concluidas.length > 0 ? receitaTotal / concluidas.length : 0,
        total_vendas: sales.length,
        vendas_mes_atual: mesAtual.length,
        vendas_por_status: vendas_por_status as any,
        vendas_por_pagamento,
        comissoes_pendentes: (pendingComm || []).reduce((sum: number, c: any) => sum + (c.valor || 0), 0),
        margem_media: concluidas.length > 0 ? margemTotal / concluidas.length : 0,
        percentual_recorrencia: concluidas.length > 0 ? (vendasRecorrencia.length / concluidas.length) * 100 : 0,
        percentual_cartao: concluidas.length > 0 ? (vendasCartao.length / concluidas.length) * 100 : 0,
        vendas_abaixo_piso: vendasAbaixoPiso.length,
        receita_por_servico: [], // Populated by usePriceComplianceMT
      });
    } catch (err) {
      console.error('Erro ao carregar métricas de vendas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchMetrics();
  }, [fetchMetrics, tenant?.id, accessLevel]);

  return { metrics, isLoading, refetch: fetchMetrics };
}
