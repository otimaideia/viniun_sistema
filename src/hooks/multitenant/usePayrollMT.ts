import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { PayrollEmployee, PayrollEmployeeCreate, PayrollRun, PayrollItem } from '@/types/financeiro';
import { DEFAULT_CHECKLIST_ITEMS } from '@/types/financeiro';

// =============================================================================
// HOOK: usePayrollEmployeesMT
// =============================================================================

export function usePayrollEmployeesMT() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_payroll_employees')
        .select('*')
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setEmployees((data || []) as PayrollEmployee[]);
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  const createEmployee = useCallback(async (data: PayrollEmployeeCreate): Promise<PayrollEmployee> => {
    const { data: created, error } = await supabase
      .from('mt_payroll_employees')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create checklist items for the new employee
    const emp = created as PayrollEmployee;
    try {
      const checklistItems = DEFAULT_CHECKLIST_ITEMS.map(item => ({
        tenant_id: tenant?.id,
        employee_id: emp.id,
        codigo: item.codigo,
        categoria: item.categoria,
        nome: item.nome,
        obrigatorio: item.obrigatorio,
        status: 'pendente',
      }));
      await (supabase as any)
        .from('mt_payroll_checklist_items')
        .insert(checklistItems);
    } catch (checklistErr) {
      console.error('Erro ao criar checklist:', checklistErr);
    }

    toast.success('Funcionário cadastrado');
    await fetchEmployees();
    return emp;
  }, [tenant?.id, franchise?.id, fetchEmployees]);

  const updateEmployee = useCallback(async (id: string, data: Partial<PayrollEmployeeCreate> & { is_active?: boolean }) => {
    const { error } = await supabase
      .from('mt_payroll_employees')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Funcionário atualizado');
    await fetchEmployees();
  }, [fetchEmployees]);

  const deleteEmployee = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_payroll_employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Funcionário removido');
    await fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchEmployees();
  }, [fetchEmployees, tenant?.id, accessLevel]);

  return { employees, isLoading, refetch: fetchEmployees, createEmployee, updateEmployee, deleteEmployee };
}

// =============================================================================
// HOOK: usePayrollRunsMT
// =============================================================================

export function usePayrollRunsMT() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_payroll_runs')
        .select('*')
        .is('deleted_at', null)
        .order('competencia', { ascending: false });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);

      const { data, error } = await query;
      if (error) throw error;
      setRuns((data || []) as PayrollRun[]);
    } catch (err) {
      console.error('Erro ao carregar folhas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  const generatePayrollRun = useCallback(async (competencia: string): Promise<PayrollRun> => {
    // Buscar funcionários ativos
    let empQuery = supabase
      .from('mt_payroll_employees')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true);

    if (tenant?.id) empQuery = empQuery.eq('tenant_id', tenant.id);
    if (franchise?.id && accessLevel === 'franchise') empQuery = empQuery.eq('franchise_id', franchise.id);

    const { data: emps, error: empErr } = await empQuery;
    if (empErr) throw empErr;

    const employees = (emps || []) as PayrollEmployee[];
    if (employees.length === 0) {
      toast.error('Nenhum funcionário ativo encontrado');
      throw new Error('Nenhum funcionário ativo');
    }

    // Criar run
    const { data: run, error: runErr } = await supabase
      .from('mt_payroll_runs')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        competencia,
        status: 'rascunho',
      })
      .select()
      .single();

    if (runErr) throw runErr;
    const payrollRun = run as PayrollRun;

    let totalSalarios = 0;
    let totalBeneficios = 0;
    let totalImpostos = 0;
    let totalComissoes = 0;
    let totalProvisoes = 0;
    let totalEncargos = 0;
    let totalDescontos = 0;

    // Criar items para cada funcionário
    for (const emp of employees) {
      const salario = emp.salario_base;
      const isCLT = emp.tipo_contratacao === 'clt';
      const vt = emp.has_vt ? emp.vt_valor : 0;
      const vr = emp.has_vr ? emp.vr_valor : 0;
      const comissao = emp.comissao_valor || 0;

      // Benefícios adicionais
      const va = emp.has_va ? (emp.va_valor || 0) : 0;
      const planoSaude = emp.has_plano_saude ? (emp.plano_saude_valor || 0) : 0;
      const planoOdonto = emp.has_plano_odonto ? (emp.plano_odonto_valor || 0) : 0;
      const auxilioCreche = emp.has_auxilio_creche ? (emp.auxilio_creche_valor || 0) : 0;
      const salarioFamilia = emp.has_salario_familia ? (emp.salario_familia_valor || 0) : 0;

      // FGTS sobre salário (sempre para CLT)
      const fgts = isCLT ? salario * (emp.fgts_percentual / 100) : 0;

      // Provisões mensais (apenas CLT)
      const provisao13 = isCLT ? salario * ((emp.provisao_13_pct || 8.33) / 100) : 0;
      const provisaoFerias = isCLT ? salario * ((emp.provisao_ferias_pct || 8.33) / 100) : 0;
      const provisaoFeriasTerco = isCLT ? salario * ((emp.provisao_ferias_terco_pct || 2.78) / 100) : 0;
      const fgts13 = isCLT ? provisao13 * (emp.fgts_percentual / 100) : 0;
      const fgtsFerias = isCLT ? (provisaoFerias + provisaoFeriasTerco) * (emp.fgts_percentual / 100) : 0;
      const provisaoMultaFgts = isCLT ? salario * ((emp.provisao_multa_fgts_pct || 4) / 100) : 0;

      // Encargos patronais (apenas CLT)
      const inssPatronal = isCLT ? salario * ((emp.inss_patronal_pct || 20) / 100) : 0;
      const rat = isCLT ? salario * ((emp.rat_pct || 2) / 100) : 0;
      const sistemaS = isCLT ? salario * ((emp.sistema_s_pct || 5.8) / 100) : 0;
      const salarioEducacao = isCLT ? salario * ((emp.salario_educacao_pct || 2.5) / 100) : 0;

      // Descontos do funcionário (apenas CLT)
      const descontoVt = isCLT ? Math.min(salario * ((emp.desconto_vt_pct || 6) / 100), vt) : 0;
      const inssFuncionario = isCLT ? salario * ((emp.inss_funcionario_pct || 7.5) / 100) : 0;
      const irrf = isCLT ? (emp.irrf_valor || 0) : 0;

      // Totais do item
      const itemBeneficios = vt + vr + va + planoSaude + planoOdonto + auxilioCreche + salarioFamilia;
      const itemProvisoes = provisao13 + provisaoFerias + provisaoFeriasTerco + fgts13 + fgtsFerias + provisaoMultaFgts;
      const itemEncargos = fgts + inssPatronal + rat + sistemaS + salarioEducacao;
      const itemDescontos = descontoVt + inssFuncionario + irrf;
      const totalBruto = salario + itemBeneficios + itemProvisoes + itemEncargos + comissao;
      const totalLiquido = salario + vt + vr + va + comissao - itemDescontos;

      // Criar transação financeira
      const [year, month] = competencia.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dataVencimento = `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
      const { data: tx } = await supabase
        .from('mt_financial_transactions')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          tipo: 'despesa',
          descricao: `Folha - ${emp.nome} (${emp.cargo}) - ${competencia}`,
          valor: totalBruto,
          data_competencia: `${competencia}-01`,
          data_vencimento: dataVencimento,
          status: 'pendente',
        })
        .select()
        .single();

      // Criar item da folha
      await supabase
        .from('mt_payroll_items')
        .insert({
          tenant_id: tenant?.id,
          payroll_run_id: payrollRun.id,
          employee_id: emp.id,
          transaction_id: tx ? (tx as any).id : null,
          salario_base: salario,
          vt_valor: vt,
          vr_valor: vr,
          fgts_valor: fgts,
          inss_valor: inssPatronal, // INSS patronal (corrigido)
          comissao_valor: comissao,
          // Provisões
          provisao_13_valor: provisao13,
          provisao_ferias_valor: provisaoFerias,
          provisao_ferias_terco_valor: provisaoFeriasTerco,
          fgts_13_valor: fgts13,
          fgts_ferias_valor: fgtsFerias,
          provisao_multa_fgts_valor: provisaoMultaFgts,
          // Encargos
          inss_patronal_valor: inssPatronal,
          rat_valor: rat,
          sistema_s_valor: sistemaS,
          salario_educacao_valor: salarioEducacao,
          // Benefícios
          va_valor: va,
          plano_saude_valor: planoSaude,
          plano_odonto_valor: planoOdonto,
          auxilio_creche_valor: auxilioCreche,
          salario_familia_valor: salarioFamilia,
          // Descontos
          desconto_vt_valor: descontoVt,
          inss_funcionario_valor: inssFuncionario,
          irrf_valor: irrf,
          total_bruto: totalBruto,
          total_liquido: totalLiquido,
        });

      totalSalarios += salario;
      totalBeneficios += itemBeneficios;
      totalImpostos += fgts + inssPatronal; // Mantém compatibilidade
      totalComissoes += comissao;
      totalProvisoes += itemProvisoes;
      totalEncargos += itemEncargos;
      totalDescontos += itemDescontos;
    }

    const totalGeral = totalSalarios + totalBeneficios + totalProvisoes + totalEncargos + totalComissoes;

    // Atualizar run com totais
    await supabase
      .from('mt_payroll_runs')
      .update({
        total_salarios: totalSalarios,
        total_beneficios: totalBeneficios,
        total_impostos: totalImpostos,
        total_comissoes: totalComissoes,
        total_provisoes: totalProvisoes,
        total_encargos: totalEncargos,
        total_descontos: totalDescontos,
        total_geral: totalGeral,
        processado_em: new Date().toISOString(),
        status: 'processado',
      })
      .eq('id', payrollRun.id);

    toast.success(`Folha gerada: ${employees.length} funcionários, total R$ ${totalGeral.toFixed(2)}`);
    await fetchRuns();
    return { ...payrollRun, total_salarios: totalSalarios, total_beneficios: totalBeneficios, total_impostos: totalImpostos, total_comissoes: totalComissoes, total_provisoes: totalProvisoes, total_encargos: totalEncargos, total_descontos: totalDescontos, total_geral: totalGeral };
  }, [tenant?.id, franchise?.id, accessLevel, fetchRuns]);

  const deleteRun = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_payroll_runs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Folha removida');
    await fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchRuns();
  }, [fetchRuns, tenant?.id, accessLevel]);

  return { runs, isLoading, refetch: fetchRuns, generatePayrollRun, deleteRun };
}

// =============================================================================
// HOOK: usePayrollRunMT
// Detalhe de uma folha com items
// =============================================================================

export function usePayrollRunMT(id?: string) {
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, accessLevel } = useTenantContext();

  const fetchRun = useCallback(async () => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data: runData, error: runErr } = await supabase
        .from('mt_payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

      if (runErr) throw runErr;
      setRun(runData as PayrollRun);

      const { data: itemsData, error: itemsErr } = await supabase
        .from('mt_payroll_items')
        .select('*, employee:mt_payroll_employees(id, nome, cargo)')
        .eq('payroll_run_id', id)
        .order('created_at', { ascending: true });

      if (itemsErr) throw itemsErr;
      setItems((itemsData || []) as PayrollItem[]);
    } catch (err) {
      console.error('Erro ao carregar folha:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const payAll = useCallback(async () => {
    if (!run) return;

    // Marcar todas as transações vinculadas como pagas
    for (const item of items) {
      if (item.transaction_id) {
        await supabase
          .from('mt_financial_transactions')
          .update({
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.transaction_id);
      }
    }

    // Atualizar status da folha
    await supabase
      .from('mt_payroll_runs')
      .update({ status: 'pago', updated_at: new Date().toISOString() })
      .eq('id', run.id);

    toast.success('Folha paga - todas as transações marcadas como pagas');
    await fetchRun();
  }, [run, items, fetchRun]);

  useEffect(() => {
    if (id && (tenant?.id || accessLevel === 'platform')) fetchRun();
  }, [fetchRun, tenant?.id, accessLevel, id]);

  return { run, items, isLoading, refetch: fetchRun, payAll };
}
