import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  FinancialTransaction, FinancialTransactionCreate, FinancialTransactionUpdate, FinancialTransactionFilters,
  FinancialCategory, FinancialCategoryCreate,
  FinancialAccount, FinancialAccountCreate, FinancialAccountUpdate,
  CostCenter, FinanceiroDashboardMetrics, DREData, FluxoCaixaData,
} from '@/types/financeiro';

// =============================================================================
// HOOK: useFinancialTransactionsMT
// CRUD de lançamentos financeiros
// =============================================================================

export function useFinancialTransactionsMT(filters?: FinancialTransactionFilters) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_financial_transactions')
        .select('*, category:mt_financial_categories(id, nome, codigo, tipo), account:mt_financial_accounts(id, nome, tipo)')
        .is('deleted_at', null)
        .order('data_competencia', { ascending: false })
        .limit(200);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.category_id) query = query.eq('category_id', filters.category_id);
      if (filters?.account_id) query = query.eq('account_id', filters.account_id);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);
      if (filters?.date_from) query = query.gte('data_competencia', filters.date_from);
      if (filters?.date_to) query = query.lte('data_competencia', filters.date_to);
      if (filters?.search) query = query.ilike('descricao', `%${filters.search}%`);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTransactions((data || []) as FinancialTransaction[]);
    } catch (err) {
      console.error('Erro ao carregar lançamentos:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar lançamentos'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.tipo, filters?.status, filters?.category_id, filters?.account_id, filters?.franchise_id, filters?.date_from, filters?.date_to, filters?.search]);

  const createTransaction = useCallback(async (data: FinancialTransactionCreate): Promise<FinancialTransaction> => {
    const { data: created, error } = await supabase
      .from('mt_financial_transactions')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;

    // Atualizar saldo da conta se pago
    if (data.account_id && data.status === 'pago') {
      const delta = data.tipo === 'receita' ? data.valor : -data.valor;
      const { data: account } = await supabase
        .from('mt_financial_accounts')
        .select('saldo_atual')
        .eq('id', data.account_id)
        .single();

      if (account) {
        await supabase
          .from('mt_financial_accounts')
          .update({ saldo_atual: (account as any).saldo_atual + delta })
          .eq('id', data.account_id);
      }
    }

    toast.success('Lançamento criado');
    await fetchTransactions();
    return created as FinancialTransaction;
  }, [tenant?.id, fetchTransactions]);

  const updateTransaction = useCallback(async (data: FinancialTransactionUpdate): Promise<FinancialTransaction> => {
    const { id, ...updates } = data;
    const { data: updated, error } = await supabase
      .from('mt_financial_transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    toast.success('Lançamento atualizado');
    await fetchTransactions();
    return updated as FinancialTransaction;
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    // Buscar transação antes de deletar para reverter saldo se necessário
    const { data: tx } = await supabase
      .from('mt_financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('mt_financial_transactions')
      .update({ deleted_at: new Date().toISOString(), status: 'cancelado' })
      .eq('id', id);

    if (error) throw error;

    // Reverter saldo da conta se a transação já estava paga
    if (tx && (tx as any).status === 'pago' && (tx as any).account_id) {
      const reverseDelta = (tx as any).tipo === 'receita' ? -(tx as any).valor : (tx as any).valor;
      const { data: account } = await supabase
        .from('mt_financial_accounts')
        .select('saldo_atual')
        .eq('id', (tx as any).account_id)
        .single();

      if (account) {
        await supabase
          .from('mt_financial_accounts')
          .update({ saldo_atual: (account as any).saldo_atual + reverseDelta })
          .eq('id', (tx as any).account_id);
      }
    }

    toast.success('Lançamento cancelado');
    await fetchTransactions();
  }, [fetchTransactions]);

  const payTransaction = useCallback(async (id: string, options?: {
    data_pagamento?: string;
    valor_recebido?: number;
    account_id?: string;
    forma_pagamento?: string;
    comprovante_url?: string;
    observacoes?: string;
  }) => {
    const { data: tx } = await supabase
      .from('mt_financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (!tx) return;

    const txData = tx as any;
    const dataPagamento = options?.data_pagamento || new Date().toISOString().split('T')[0];

    // Build update payload
    const updatePayload: Record<string, any> = {
      status: 'pago',
      data_pagamento: dataPagamento,
      updated_at: new Date().toISOString(),
    };

    if (options?.forma_pagamento) {
      updatePayload.forma_pagamento = options.forma_pagamento;
    }

    if (options?.comprovante_url) {
      updatePayload.comprovante_url = options.comprovante_url;
    }

    // Handle observacoes: append if existing
    if (options?.observacoes) {
      const existing = txData.observacoes || '';
      updatePayload.observacoes = existing
        ? `${existing}\n[Pagamento] ${options.observacoes}`
        : `[Pagamento] ${options.observacoes}`;
    }

    // Handle valor_recebido divergence
    const valorOriginal = txData.valor;
    const valorRecebido = options?.valor_recebido ?? valorOriginal;
    if (options?.valor_recebido !== undefined && options.valor_recebido !== valorOriginal) {
      const diffNote = `Valor original: R$ ${valorOriginal.toFixed(2)} | Valor recebido: R$ ${valorRecebido.toFixed(2)}`;
      const obs = updatePayload.observacoes || txData.observacoes || '';
      updatePayload.observacoes = obs ? `${obs}\n${diffNote}` : diffNote;
    }

    const { error } = await supabase
      .from('mt_financial_transactions')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    // Determine which account to update (options.account_id takes priority)
    const targetAccountId = options?.account_id || txData.account_id;

    // If a different account_id was provided, also update the transaction record
    if (options?.account_id && options.account_id !== txData.account_id) {
      await supabase
        .from('mt_financial_transactions')
        .update({ account_id: options.account_id })
        .eq('id', id);
    }

    // Atualizar saldo da conta
    if (targetAccountId) {
      const delta = txData.tipo === 'receita' ? valorRecebido : -valorRecebido;
      const { data: account } = await supabase
        .from('mt_financial_accounts')
        .select('saldo_atual')
        .eq('id', targetAccountId)
        .single();

      if (account) {
        await supabase
          .from('mt_financial_accounts')
          .update({ saldo_atual: (account as any).saldo_atual + delta })
          .eq('id', targetAccountId);
      }
    }

    toast.success('Lançamento pago');
    await fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchTransactions();
  }, [fetchTransactions, tenant?.id, accessLevel]);

  const createInstallmentTransaction = useCallback(async (data: FinancialTransactionCreate, parcelaTotal: number): Promise<FinancialTransaction[]> => {
    if (parcelaTotal < 2) {
      const tx = await createTransaction(data);
      return [tx];
    }

    const grupoId = crypto.randomUUID();
    const valorParcela = Math.floor((data.valor / parcelaTotal) * 100) / 100;
    const valorUltima = data.valor - valorParcela * (parcelaTotal - 1);
    const baseDateStr = data.data_vencimento || data.data_competencia;
    const baseDate = new Date(baseDateStr + 'T00:00:00');
    const created: FinancialTransaction[] = [];

    for (let i = 0; i < parcelaTotal; i++) {
      const vencimento = new Date(baseDate);
      vencimento.setMonth(vencimento.getMonth() + i);
      const valor = i === parcelaTotal - 1 ? valorUltima : valorParcela;

      const { data: tx, error } = await supabase
        .from('mt_financial_transactions')
        .insert({
          tenant_id: tenant?.id,
          ...data,
          valor,
          descricao: `${data.descricao} (${i + 1}/${parcelaTotal})`,
          parcela_atual: i + 1,
          parcela_total: parcelaTotal,
          parcela_grupo_id: grupoId,
          data_vencimento: vencimento.toISOString().split('T')[0],
          data_competencia: vencimento.toISOString().split('T')[0],
          status: 'pendente',
        })
        .select()
        .single();

      if (error) throw error;
      created.push(tx as FinancialTransaction);
    }

    toast.success(`${parcelaTotal} parcelas criadas`);
    await fetchTransactions();
    return created;
  }, [tenant?.id, createTransaction, fetchTransactions]);

  const fetchInstallmentGroup = useCallback(async (grupoId: string): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
      .from('mt_financial_transactions')
      .select('*, category:mt_financial_categories(id, nome, codigo, tipo), account:mt_financial_accounts(id, nome, tipo)')
      .eq('parcela_grupo_id', grupoId)
      .is('deleted_at', null)
      .order('parcela_atual', { ascending: true });

    if (error) throw error;
    return (data || []) as FinancialTransaction[];
  }, []);

  return { transactions, isLoading, error, refetch: fetchTransactions, createTransaction, createInstallmentTransaction, fetchInstallmentGroup, updateTransaction, deleteTransaction, payTransaction };
}

// =============================================================================
// HOOK: useFinancialCategoriesMT
// Categorias financeiras (plano de contas)
// =============================================================================

export function useFinancialCategoriesMT() {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_financial_categories')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('tipo', { ascending: true })
        .order('ordem', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;

      const flat = (data || []) as FinancialCategory[];
      setCategories(flat);

      // Montar árvore
      const rootCategories = flat.filter(c => !c.parent_id);
      const tree = rootCategories.map(root => ({
        ...root,
        children: flat.filter(c => c.parent_id === root.id),
      }));
      setCategoryTree(tree);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  const createCategory = useCallback(async (data: FinancialCategoryCreate): Promise<FinancialCategory> => {
    const { data: created, error } = await supabase
      .from('mt_financial_categories')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    toast.success('Categoria criada');
    await fetchCategories();
    return created as FinancialCategory;
  }, [tenant?.id, fetchCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<FinancialCategoryCreate>) => {
    const { error } = await supabase
      .from('mt_financial_categories')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Categoria atualizada');
    await fetchCategories();
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_financial_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Categoria removida');
    await fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchCategories();
  }, [fetchCategories, tenant?.id, accessLevel]);

  return { categories, categoryTree, isLoading, refetch: fetchCategories, createCategory, updateCategory, deleteCategory };
}

// =============================================================================
// HOOK: useFinancialAccountsMT
// Contas bancárias/caixa
// =============================================================================

export function useFinancialAccountsMT() {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_financial_accounts')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nome', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setAccounts((data || []) as FinancialAccount[]);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  const createAccount = useCallback(async (data: FinancialAccountCreate): Promise<FinancialAccount> => {
    const { data: created, error } = await supabase
      .from('mt_financial_accounts')
      .insert({
        tenant_id: tenant?.id,
        ...data,
        saldo_atual: data.saldo_inicial || 0,
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Conta criada');
    await fetchAccounts();
    return created as FinancialAccount;
  }, [tenant?.id, fetchAccounts]);

  const updateAccount = useCallback(async (data: FinancialAccountUpdate) => {
    const { id, ...updates } = data;
    const { error } = await supabase
      .from('mt_financial_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Conta atualizada');
    await fetchAccounts();
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_financial_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Conta removida');
    await fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchAccounts();
  }, [fetchAccounts, tenant?.id, accessLevel]);

  return { accounts, isLoading, refetch: fetchAccounts, createAccount, updateAccount, deleteAccount };
}

// =============================================================================
// HOOK: useFinanceiroDashboardMT
// DRE + Fluxo de Caixa
// =============================================================================

export function useFinanceiroDashboardMT(period?: { from: string; to: string }) {
  const [metrics, setMetrics] = useState<FinanceiroDashboardMetrics | null>(null);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const from = period?.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const to = period?.to || now.toISOString().split('T')[0];

      // Buscar lançamentos do período
      let query = supabase
        .from('mt_financial_transactions')
        .select('tipo, valor, status, data_competencia, data_vencimento')
        .is('deleted_at', null)
        .gte('data_competencia', from)
        .lte('data_competencia', to);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data: txs } = await query;

      // Buscar saldo das contas
      let accQuery = supabase
        .from('mt_financial_accounts')
        .select('saldo_atual')
        .is('deleted_at', null)
        .eq('is_active', true);
      if (tenant?.id) accQuery = accQuery.eq('tenant_id', tenant.id);
      const { data: accs } = await accQuery;

      const transactions = (txs || []) as any[];
      const hoje = now.toISOString().split('T')[0];

      const receitas = transactions.filter(t => t.tipo === 'receita');
      const despesas = transactions.filter(t => t.tipo === 'despesa');

      const receitaTotal = receitas.filter(t => t.status === 'pago').reduce((s: number, t: any) => s + t.valor, 0);
      const despesaTotal = despesas.filter(t => t.status === 'pago').reduce((s: number, t: any) => s + t.valor, 0);
      const receitasPendentes = receitas.filter(t => t.status === 'pendente').reduce((s: number, t: any) => s + t.valor, 0);
      const despesasPendentes = despesas.filter(t => t.status === 'pendente').reduce((s: number, t: any) => s + t.valor, 0);
      const vencidas = transactions.filter(t => t.status === 'pendente' && t.data_vencimento && t.data_vencimento < hoje);
      const contasVencidasDespesas = vencidas.filter(t => t.tipo === 'despesa').reduce((s: number, t: any) => s + t.valor, 0);
      const contasVencidasReceitas = vencidas.filter(t => t.tipo === 'receita').reduce((s: number, t: any) => s + t.valor, 0);
      const contasVencidas = contasVencidasDespesas;
      const saldoTotal = (accs || []).reduce((s: number, a: any) => s + a.saldo_atual, 0);

      setMetrics({
        receita_total: receitaTotal,
        despesa_total: despesaTotal,
        lucro_liquido: receitaTotal - despesaTotal,
        margem_liquida: receitaTotal > 0 ? ((receitaTotal - despesaTotal) / receitaTotal) * 100 : 0,
        receitas_pendentes: receitasPendentes,
        despesas_pendentes: despesasPendentes,
        contas_a_pagar_vencidas: contasVencidas,
        contas_a_receber_vencidas: contasVencidasReceitas,
        total_vencidos: vencidas.length,
        saldo_total_contas: saldoTotal,
      });

      // Gerar fluxo de caixa diário
      const fluxoMap = new Map<string, { entradas: number; saidas: number }>();
      transactions.filter(t => t.status === 'pago').forEach((t: any) => {
        const dia = t.data_competencia;
        const current = fluxoMap.get(dia) || { entradas: 0, saidas: 0 };
        if (t.tipo === 'receita') current.entradas += t.valor;
        else current.saidas += t.valor;
        fluxoMap.set(dia, current);
      });

      let acumulado = 0;
      const fluxo = Array.from(fluxoMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, { entradas, saidas }]) => {
          acumulado += entradas - saidas;
          return { data, entradas, saidas, saldo: entradas - saidas, saldo_acumulado: acumulado };
        });

      setFluxoCaixa(fluxo);
    } catch (err) {
      console.error('Erro ao carregar dashboard financeiro:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, period?.from, period?.to]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchDashboard();
  }, [fetchDashboard, tenant?.id, accessLevel]);

  return { metrics, fluxoCaixa, isLoading, refetch: fetchDashboard };
}

// =============================================================================
// HOOK: useFinancialTransactionMT
// Busca um único lançamento por ID (para páginas de detalhe/edição)
// =============================================================================

export function useFinancialTransactionMT(id?: string) {
  const { tenant, accessLevel } = useTenantContext();
  const [transaction, setTransaction] = useState<FinancialTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransaction = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_financial_transactions')
        .select('*, category:mt_financial_categories(id, nome, codigo, tipo), account:mt_financial_accounts(id, nome, tipo)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      setTransaction(data as FinancialTransaction);
    } catch (err) {
      console.error('Erro ao carregar lançamento:', err);
      toast.error('Erro ao carregar lançamento');
      setTransaction(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && (tenant?.id || accessLevel === 'platform')) fetchTransaction();
  }, [fetchTransaction, tenant?.id, accessLevel, id]);

  return { transaction, isLoading, refetch: fetchTransaction };
}

// =============================================================================
// HOOK: useCreateFinancialTransactionFromSale
// Cria lançamento de receita vinculado a uma venda
// =============================================================================

export function useCreateFinancialTransactionFromSale() {
  const { tenant, franchise } = useTenantContext();

  const createFromSale = useCallback(async (params: {
    sale_id: string;
    descricao: string;
    valor: number;
    data_competencia: string;
    data_vencimento?: string;
    category_id?: string;
    account_id?: string;
    franchise_id?: string;
    observacoes?: string;
  }): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from('mt_financial_transactions')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: params.franchise_id || franchise?.id,
        tipo: 'receita',
        status: 'pendente',
        descricao: params.descricao,
        valor: params.valor,
        data_competencia: params.data_competencia,
        data_vencimento: params.data_vencimento || params.data_competencia,
        category_id: params.category_id,
        account_id: params.account_id,
        sale_id: params.sale_id,
        observacoes: params.observacoes,
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Lançamento financeiro criado a partir da venda');
    return data as FinancialTransaction;
  }, [tenant?.id, franchise?.id]);

  return { createFromSale };
}

// =============================================================================
// HOOK: useCreateFinancialTransactionFromMovement
// Cria lançamento de despesa vinculado a uma movimentação de estoque
// =============================================================================

export function useCreateFinancialTransactionFromMovement() {
  const { tenant, franchise } = useTenantContext();

  const createFromMovement = useCallback(async (params: {
    movement_id: string;
    descricao: string;
    valor: number;
    data_competencia: string;
    data_vencimento?: string;
    category_id?: string;
    account_id?: string;
    franchise_id?: string;
    observacoes?: string;
  }): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from('mt_financial_transactions')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: params.franchise_id || franchise?.id,
        tipo: 'despesa',
        status: 'pendente',
        descricao: params.descricao,
        valor: params.valor,
        data_competencia: params.data_competencia,
        data_vencimento: params.data_vencimento || params.data_competencia,
        category_id: params.category_id,
        account_id: params.account_id,
        movement_id: params.movement_id,
        observacoes: params.observacoes,
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Lançamento financeiro criado a partir da movimentação');
    return data as FinancialTransaction;
  }, [tenant?.id, franchise?.id]);

  return { createFromMovement };
}
