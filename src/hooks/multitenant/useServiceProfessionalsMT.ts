// =============================================================================
// USE SERVICE PROFESSIONALS MT - Vínculo Profissional ↔ Serviço + Custo Mão de Obra
// =============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { PayrollEmployee } from '@/types/financeiro';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ProfessionalRole = 'executor' | 'auxiliar' | 'supervisor';

export const PROFESSIONAL_ROLE_LABELS: Record<ProfessionalRole, string> = {
  executor: 'Executor',
  auxiliar: 'Auxiliar',
  supervisor: 'Supervisor',
};

export interface ServiceProfessional {
  id: string;
  tenant_id: string;
  service_id: string;
  employee_id: string;
  horas_mes: number;
  custo_hora_calculado: number;
  custo_hora_manual: number | null;
  tempo_execucao_minutos: number | null;
  custo_por_sessao: number;
  papel: ProfessionalRole;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // JOINs
  employee?: PayrollEmployee;
}

export interface ServiceProfessionalCreate {
  service_id: string;
  employee_id: string;
  horas_mes?: number;
  custo_hora_manual?: number;
  tempo_execucao_minutos?: number;
  papel?: ProfessionalRole;
  observacoes?: string;
}

// Calcula custo/hora a partir dos dados do profissional
export function calcCustoHora(emp: PayrollEmployee, horasMes: number = 220): number {
  if (horasMes <= 0) return 0;

  // MEI com diaria: custo/hora = diaria / horas_por_dia (8h padrao)
  const isMei = (emp as any).tipo_contratacao === 'mei';
  const diaria = (emp as any).diaria_minima || 0;
  if (isMei && diaria > 0) {
    const horasPorDia = 8;
    return diaria / horasPorDia;
  }

  // CLT: custo/hora = (salario + encargos) / horas_mes
  const salario = emp.salario_base || 0;
  if (salario <= 0) return 0;
  const vt = emp.has_vt ? (emp.vt_valor || 0) : 0;
  const vr = emp.has_vr ? (emp.vr_valor || 0) : 0;
  const fgts = salario * ((emp.fgts_percentual || 8) / 100);
  const inss = salario * ((emp.inss_percentual || 11) / 100);
  const custoTotal = salario + vt + vr + fgts + inss;
  return custoTotal / horasMes;
}

// Calcula custo por sessão
export function calcCustoPorSessao(
  custoHora: number,
  tempoMinutos: number,
): number {
  if (tempoMinutos <= 0 || custoHora <= 0) return 0;
  return (custoHora * tempoMinutos) / 60;
}

// -----------------------------------------------------------------------------
// HOOK: useServiceProfessionalsMT
// -----------------------------------------------------------------------------

export function useServiceProfessionalsMT(serviceId?: string) {
  const [professionals, setProfessionals] = useState<ServiceProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchProfessionals = useCallback(async () => {
    if (!serviceId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_service_professionals')
        .select('*, employee:mt_payroll_employees(id, nome, cargo, salario_base, tipo_salario, tipo_contratacao, diaria_minima, has_vt, vt_valor, has_vr, vr_valor, fgts_percentual, inss_percentual, is_active)')
        .eq('service_id', serviceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfessionals((data || []) as ServiceProfessional[]);
    } catch (err) {
      console.error('Erro ao carregar profissionais do serviço:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  const createServiceProfessional = useCallback(async (
    data: ServiceProfessionalCreate,
    employee: PayrollEmployee,
    servicoDuracaoMinutos?: number | null,
  ): Promise<ServiceProfessional> => {
    const horasMes = data.horas_mes || 220;
    const custoHoraCalc = calcCustoHora(employee, horasMes);
    const custoHoraFinal = data.custo_hora_manual ?? custoHoraCalc;
    const tempoExec = data.tempo_execucao_minutos ?? servicoDuracaoMinutos ?? 30;
    const custoPorSessao = calcCustoPorSessao(custoHoraFinal, tempoExec);

    const { data: created, error } = await supabase
      .from('mt_service_professionals')
      .insert({
        tenant_id: tenant?.id,
        service_id: data.service_id,
        employee_id: data.employee_id,
        horas_mes: horasMes,
        custo_hora_calculado: custoHoraCalc,
        custo_hora_manual: data.custo_hora_manual || null,
        tempo_execucao_minutos: tempoExec,
        custo_por_sessao: custoPorSessao,
        papel: data.papel || 'executor',
        observacoes: data.observacoes || null,
      })
      .select('*, employee:mt_payroll_employees(id, nome, cargo, salario_base, tipo_salario, tipo_contratacao, diaria_minima, has_vt, vt_valor, has_vr, vr_valor, fgts_percentual, inss_percentual, is_active)')
      .single();

    if (error) throw error;
    toast.success('Profissional vinculado ao serviço');
    await fetchProfessionals();
    // Recalcular custo total do serviço
    await recalcServiceCosts(data.service_id);
    return created as ServiceProfessional;
  }, [tenant?.id, fetchProfessionals]);

  const deleteServiceProfessional = useCallback(async (id: string) => {
    const prof = professionals.find(p => p.id === id);
    const { error } = await supabase
      .from('mt_service_professionals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Profissional removido do serviço');
    await fetchProfessionals();
    if (prof?.service_id) await recalcServiceCosts(prof.service_id);
  }, [professionals, fetchProfessionals]);

  // Custo total de mão de obra = soma dos custo_por_sessao de todos os profissionais
  const custoMaoDeObra = useMemo(() => {
    return professionals.reduce((sum, p) => sum + (p.custo_por_sessao || 0), 0);
  }, [professionals]);

  useEffect(() => {
    if (serviceId && (tenant?.id || accessLevel === 'platform')) fetchProfessionals();
  }, [fetchProfessionals, tenant?.id, accessLevel, serviceId]);

  return {
    professionals,
    isLoading,
    refetch: fetchProfessionals,
    createServiceProfessional,
    deleteServiceProfessional,
    custoMaoDeObra,
  };
}

// -----------------------------------------------------------------------------
// Recalcular custos totais no mt_services
// -----------------------------------------------------------------------------

async function recalcServiceCosts(serviceId: string) {
  try {
    // Buscar custos e preços atuais
    const { data: svc } = await supabase
      .from('mt_services')
      .select('custo_insumos, custo_fixo_rateado, preco_tabela_maior, preco_tabela_menor')
      .eq('id', serviceId)
      .single();

    const custoInsumos = Number((svc as any)?.custo_insumos) || 0;
    const custoFixo = Number((svc as any)?.custo_fixo_rateado) || 0;
    const precoMaior = Number((svc as any)?.preco_tabela_maior) || 0;
    const precoMenor = Number((svc as any)?.preco_tabela_menor) || 0;

    // Buscar soma de mão de obra
    const { data: profs } = await supabase
      .from('mt_service_professionals')
      .select('custo_por_sessao')
      .eq('service_id', serviceId)
      .is('deleted_at', null);

    const custoMaoObra = (profs || []).reduce((sum: number, p: any) => sum + (p.custo_por_sessao || 0), 0);
    const custoTotal = custoInsumos + custoMaoObra + custoFixo;

    await supabase
      .from('mt_services')
      .update({
        custo_mao_obra: custoMaoObra,
        custo_total_sessao: custoTotal,
        margem_maior: precoMaior ? precoMaior - custoTotal : null,
        margem_menor: precoMenor ? precoMenor - custoTotal : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);
  } catch (err) {
    console.error('Erro ao recalcular custos do serviço:', err);
  }
}

// -----------------------------------------------------------------------------
// HOOK: usePayrollEmployeesForService
// Lista profissionais disponíveis para vincular a um serviço
// Busca de mt_payroll_employees + mt_users (auto-cria folha se necessário)
// -----------------------------------------------------------------------------

export function usePayrollEmployeesForService() {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Buscar profissionais que já têm registro na folha
      let payrollQuery = supabase
        .from('mt_payroll_employees')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('nome', { ascending: true });

      if (tenant?.id) payrollQuery = payrollQuery.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') payrollQuery = payrollQuery.eq('franchise_id', franchise.id);

      const { data: payrollData, error: payrollError } = await payrollQuery;
      if (payrollError) throw payrollError;

      const payrollEmployees = (payrollData || []) as PayrollEmployee[];
      const payrollUserIds = new Set(payrollEmployees.map(e => e.user_id).filter(Boolean));

      // 2. Buscar usuários ativos do mt_users que NÃO possuem registro na folha
      let usersQuery = supabase
        .from('mt_users')
        .select('id, nome, cargo, tenant_id, franchise_id')
        .eq('is_active', true)
        .order('nome', { ascending: true });

      if (tenant?.id) usersQuery = usersQuery.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') usersQuery = usersQuery.eq('franchise_id', franchise.id);

      const { data: usersData, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      // Filtrar usuários que já têm registro na folha
      const usersWithoutPayroll = (usersData || []).filter(
        (u: any) => !payrollUserIds.has(u.id) && u.nome && u.nome.trim() !== ''
      );

      // 3. Converter mt_users para formato PayrollEmployee (dados mínimos)
      const userAsPayroll: PayrollEmployee[] = usersWithoutPayroll.map((u: any) => ({
        id: `user_${u.id}`, // Prefixo para distinguir de registros reais
        tenant_id: u.tenant_id,
        franchise_id: u.franchise_id || null,
        nome: u.nome,
        cargo: u.cargo || 'Profissional',
        salario_base: 0,
        tipo_salario: 'mensal' as const,
        has_vt: false,
        vt_valor: 0,
        has_vr: false,
        vr_valor: 0,
        fgts_percentual: 8,
        inss_percentual: 11,
        is_active: true,
        user_id: u.id,
        // Campos que podem não existir no type mas precisamos para o fluxo
        _isFromUsers: true,
        _originalUserId: u.id,
      } as any));

      setEmployees([...payrollEmployees, ...userAsPayroll]);
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  // Auto-criar registro na folha para usuário de mt_users
  const ensurePayrollRecord = useCallback(async (employee: PayrollEmployee): Promise<PayrollEmployee> => {
    // Se já é um registro real da folha, retornar direto
    if (!String(employee.id).startsWith('user_')) {
      return employee;
    }

    const userId = (employee as any)._originalUserId || String(employee.id).replace('user_', '');

    // Verificar se já existe (race condition)
    const { data: existing } = await supabase
      .from('mt_payroll_employees')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) return existing as PayrollEmployee;

    // Criar registro básico na folha
    const { data: created, error } = await supabase
      .from('mt_payroll_employees')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: employee.franchise_id || franchise?.id || null,
        user_id: userId,
        nome: employee.nome,
        cargo: employee.cargo || 'Profissional',
        salario_base: 0,
        tipo_salario: 'mensal',
        has_vt: false,
        vt_valor: 0,
        has_vr: false,
        vr_valor: 0,
        fgts_percentual: 8,
        inss_percentual: 11,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Refetch para atualizar lista
    await fetchEmployees();

    return created as PayrollEmployee;
  }, [tenant?.id, franchise?.id, fetchEmployees]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchEmployees();
  }, [fetchEmployees, tenant?.id, accessLevel]);

  return { employees, isLoading, refetch: fetchEmployees, ensurePayrollRecord };
}
