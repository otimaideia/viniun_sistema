import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { CommissionBatch, CommissionTier, MonthlyCommissionSummary } from '@/types/vendas';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function useCommissionAutomationMT() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<MonthlyCommissionSummary | null>(null);

  /**
   * Processa comissões mensais para uma franchise
   * Algoritmo:
   * 1. Verifica batch existente (idempotência)
   * 2. Calcula faturamento do mês
   * 3. Compara com meta global → tier
   * 4. Distribui global: 30% supervisora, 70%/N consultoras
   * 5. Individual: 1% se ambas metas batidas
   * 6. Gerente: 1% do faturamento
   */
  const processMonthlyCommissions = useCallback(async (
    franchiseId: string,
    referenciaMes: string, // YYYY-MM
  ): Promise<MonthlyCommissionSummary | null> => {
    if (!tenant?.id) {
      toast.error('Tenant não carregado');
      return null;
    }

    setIsProcessing(true);
    try {
      // 1. Check existing batch
      const { data: existingBatch } = await supabase
        .from('mt_commission_batches')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('franchise_id', franchiseId)
        .eq('tipo', 'mensal_vendas')
        .eq('referencia', referenciaMes)
        .maybeSingle();

      if (existingBatch) {
        toast.error(`Mês ${referenciaMes} já foi processado. Use "Reprocessar" para recalcular.`);
        return null;
      }

      // 2. Fetch commission rules
      const { data: rulesData } = await supabase
        .from('mt_commission_rules')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('franchise_id', franchiseId)
        .eq('is_active', true)
        .maybeSingle();

      const rules = rulesData || {
        meta_global_default: 200000,
        meta_individual_default: 75000,
        percentual_supervisora: 30,
        percentual_consultoras: 70,
        percentual_individual: 1,
        percentual_gerente: 1,
      };

      // Fetch tiers
      let tiersData: CommissionTier[] = [];
      if (rulesData?.id) {
        const { data: td } = await supabase
          .from('mt_commission_tiers')
          .select('*')
          .eq('rule_id', rulesData.id)
          .order('meta_valor', { ascending: false });
        tiersData = (td || []) as CommissionTier[];
      }
      if (tiersData.length === 0) {
        tiersData = [
          { id: '', rule_id: '', meta_valor: 300000, percentual: 1.5, ordem: 3, created_at: '' },
          { id: '', rule_id: '', meta_valor: 250000, percentual: 1.2, ordem: 2, created_at: '' },
          { id: '', rule_id: '', meta_valor: 200000, percentual: 1.0, ordem: 1, created_at: '' },
        ];
      }

      // 3. Calculate franchise revenue for the month
      const monthStart = `${referenciaMes}-01T00:00:00`;
      const [year, month] = referenciaMes.split('-').map(Number);
      const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthEnd = `${nextMonth}-01T00:00:00`;

      const { data: salesData } = await supabase
        .from('mt_sales')
        .select('id, valor_total, profissional_id')
        .eq('franchise_id', franchiseId)
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .in('status', ['concluido', 'aprovado'])
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd);

      const sales = (salesData || []) as any[];
      const faturamento = sales.reduce((sum: number, s: any) => sum + (s.valor_total || 0), 0);

      // 4. Determine global goal (franchise-level, not individual)
      const { data: goalData } = await supabase
        .from('mt_goals')
        .select('meta_valor')
        .eq('tenant_id', tenant.id)
        .eq('tipo', 'receita')
        .is('assigned_to', null)
        .eq('franchise_id', franchiseId)
        .gte('data_fim', monthStart)
        .lte('data_inicio', monthEnd)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const metaGlobal = goalData?.meta_valor || rules.meta_global_default || 200000;
      const globalAtingida = faturamento >= metaGlobal;

      // 5. Determine tier
      let matchedTier: CommissionTier | null = null;
      if (globalAtingida) {
        for (const tier of tiersData) {
          if (faturamento >= tier.meta_valor) {
            matchedTier = tier;
            break; // tiersData is sorted DESC, first match is highest
          }
        }
      }

      const tierPct = matchedTier?.percentual || 0;
      const poolGlobal = globalAtingida ? faturamento * (tierPct / 100) : 0;

      // 6. Fetch professionals by role
      const { data: usersData } = await supabase
        .from('mt_users')
        .select('id, nome, commission_role')
        .eq('tenant_id', tenant.id)
        .eq('franchise_id', franchiseId)
        .eq('status', 'ativo')
        .in('commission_role', ['consultora', 'supervisora', 'gerente']);

      const professionals = (usersData || []) as any[];
      const supervisoras = professionals.filter((u: any) => u.commission_role === 'supervisora');
      const consultoras = professionals.filter((u: any) => u.commission_role === 'consultora');
      const gerentes = professionals.filter((u: any) => u.commission_role === 'gerente');

      // Create batch
      const batchId = crypto.randomUUID();
      const commissions: any[] = [];

      // 7. Distribute global pool
      const supervisoraResults: MonthlyCommissionSummary['supervisoras'] = [];
      const consultoraResults: MonthlyCommissionSummary['consultoras'] = [];
      const gerenteResults: MonthlyCommissionSummary['gerentes'] = [];

      if (globalAtingida && poolGlobal > 0) {
        // Supervisora: 30% of pool
        const supervisoraPool = poolGlobal * ((rules.percentual_supervisora || 30) / 100);
        const perSupervisora = supervisoras.length > 0 ? supervisoraPool / supervisoras.length : 0;

        for (const sup of supervisoras) {
          if (perSupervisora > 0) {
            commissions.push({
              tenant_id: tenant.id,
              franchise_id: franchiseId,
              profissional_id: sup.id,
              sale_id: null,
              categoria: 'comissao_global',
              tipo: 'percentual',
              percentual: tierPct,
              valor: Math.round(perSupervisora * 100) / 100,
              valor_base_calculo: faturamento,
              meta_global_atingida: true,
              meta_individual_atingida: false,
              referencia_mes: referenciaMes,
              commission_role: 'supervisora',
              batch_id: batchId,
              status: 'pendente',
              observacoes: `Global ${tierPct}% - ${rules.percentual_supervisora}% supervisora${supervisoras.length > 1 ? ` (÷${supervisoras.length})` : ''}`,
            });
            supervisoraResults.push({ user_id: sup.id, nome: sup.nome, valor: perSupervisora });
          }
        }

        // Consultoras: 70% of pool, split equally
        const consultoraPool = poolGlobal * ((rules.percentual_consultoras || 70) / 100);
        const perConsultora = consultoras.length > 0 ? consultoraPool / consultoras.length : 0;

        for (const cons of consultoras) {
          if (perConsultora > 0) {
            commissions.push({
              tenant_id: tenant.id,
              franchise_id: franchiseId,
              profissional_id: cons.id,
              sale_id: null,
              categoria: 'comissao_global',
              tipo: 'percentual',
              percentual: tierPct,
              valor: Math.round(perConsultora * 100) / 100,
              valor_base_calculo: faturamento,
              meta_global_atingida: true,
              meta_individual_atingida: false,
              referencia_mes: referenciaMes,
              commission_role: 'consultora',
              batch_id: batchId,
              status: 'pendente',
              observacoes: `Global ${tierPct}% - ${rules.percentual_consultoras}% consultoras (÷${consultoras.length})`,
            });
          }
        }
      }

      // 8. Individual commissions per consultora
      for (const cons of consultoras) {
        const vendasIndividuais = sales
          .filter((s: any) => s.profissional_id === cons.id)
          .reduce((sum: number, s: any) => sum + (s.valor_total || 0), 0);

        // Check individual goal
        const { data: indGoal } = await supabase
          .from('mt_goals')
          .select('meta_valor')
          .eq('tenant_id', tenant.id)
          .eq('tipo', 'receita')
          .eq('assigned_to', cons.id)
          .gte('data_fim', monthStart)
          .lte('data_inicio', monthEnd)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const metaIndividual = indGoal?.meta_valor || rules.meta_individual_default || 75000;
        const individualBatida = vendasIndividuais >= metaIndividual;

        // Individual only if BOTH goals met
        const valorIndividual = (globalAtingida && individualBatida)
          ? vendasIndividuais * ((rules.percentual_individual || 1) / 100)
          : 0;

        if (valorIndividual > 0) {
          commissions.push({
            tenant_id: tenant.id,
            franchise_id: franchiseId,
            profissional_id: cons.id,
            sale_id: null,
            categoria: 'comissao_individual',
            tipo: 'percentual',
            percentual: rules.percentual_individual || 1,
            valor: Math.round(valorIndividual * 100) / 100,
            valor_base_calculo: vendasIndividuais,
            meta_global_atingida: globalAtingida,
            meta_individual_atingida: individualBatida,
            referencia_mes: referenciaMes,
            commission_role: 'consultora',
            batch_id: batchId,
            status: 'pendente',
            observacoes: `Individual ${rules.percentual_individual || 1}% sobre ${formatCurrency(vendasIndividuais)}`,
          });
        }

        const globalShare = globalAtingida && poolGlobal > 0 && consultoras.length > 0
          ? (poolGlobal * ((rules.percentual_consultoras || 70) / 100)) / consultoras.length
          : 0;

        consultoraResults.push({
          user_id: cons.id,
          nome: cons.nome,
          valor_global: Math.round(globalShare * 100) / 100,
          vendas_individuais: vendasIndividuais,
          meta_individual: metaIndividual,
          meta_batida: individualBatida,
          valor_individual: Math.round(valorIndividual * 100) / 100,
        });
      }

      // 9. Gerente commission (só se meta global batida)
      if (globalAtingida) {
        for (const ger of gerentes) {
          const valorGerente = faturamento * ((rules.percentual_gerente || 1) / 100);
          if (valorGerente > 0) {
            commissions.push({
              tenant_id: tenant.id,
              franchise_id: franchiseId,
              profissional_id: ger.id,
              sale_id: null,
              categoria: 'comissao_gerente',
              tipo: 'percentual',
              percentual: rules.percentual_gerente || 1,
              valor: Math.round(valorGerente * 100) / 100,
              valor_base_calculo: faturamento,
              meta_global_atingida: true,
              referencia_mes: referenciaMes,
              commission_role: 'gerente',
              batch_id: batchId,
              status: 'pendente',
              observacoes: `Gerente ${rules.percentual_gerente || 1}% sobre faturamento ${formatCurrency(faturamento)}`,
            });
            gerenteResults.push({ user_id: ger.id, nome: ger.nome, valor: valorGerente });
          }
        }
      }

      // 10. Insert all commissions
      if (commissions.length > 0) {
        const { error: insertError } = await supabase
          .from('mt_commissions')
          .insert(commissions);
        if (insertError) throw insertError;
      }

      // 11. Create batch record
      const totalComissoes = commissions.reduce((sum, c) => sum + c.valor, 0);
      const { data: batchData, error: batchError } = await supabase
        .from('mt_commission_batches')
        .insert({
          id: batchId,
          tenant_id: tenant.id,
          franchise_id: franchiseId,
          tipo: 'mensal_vendas',
          referencia: referenciaMes,
          faturamento_total: faturamento,
          meta_global_valor: metaGlobal,
          meta_global_atingida: globalAtingida,
          tier_percentual: tierPct,
          total_comissoes_geradas: Math.round(totalComissoes * 100) / 100,
          qtd_comissoes: commissions.length,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const summary: MonthlyCommissionSummary = {
        batch: batchData as CommissionBatch,
        faturamento,
        meta_global: metaGlobal,
        meta_atingida: globalAtingida,
        tier: matchedTier,
        pool_global: poolGlobal,
        supervisoras: supervisoraResults,
        consultoras: consultoraResults,
        gerentes: gerenteResults,
        total_comissoes: totalComissoes,
      };

      setLastResult(summary);
      toast.success(`${commissions.length} comissões geradas para ${referenciaMes} (${formatCurrency(totalComissoes)})`);
      return summary;

    } catch (err: any) {
      console.error('Erro ao processar comissões:', err);
      toast.error(`Erro: ${err.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [tenant?.id]);

  /**
   * Reprocessa mês: deleta batch anterior e recalcula
   */
  const reprocessMonth = useCallback(async (franchiseId: string, referenciaMes: string) => {
    if (!tenant?.id) return null;
    try {
      // Find existing batch
      const { data: batch } = await supabase
        .from('mt_commission_batches')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('franchise_id', franchiseId)
        .eq('tipo', 'mensal_vendas')
        .eq('referencia', referenciaMes)
        .maybeSingle();

      if (batch?.id) {
        // Check if any commissions are already paid
        const { data: paidCommissions } = await supabase
          .from('mt_commissions')
          .select('id')
          .eq('batch_id', batch.id)
          .eq('status', 'pago');

        if (paidCommissions && paidCommissions.length > 0) {
          toast.error(`Não é possível reprocessar: ${paidCommissions.length} comissão(ões) já foi(ram) paga(s) neste mês.`);
          return null;
        }

        // Delete commissions of this batch
        await supabase
          .from('mt_commissions')
          .delete()
          .eq('batch_id', batch.id);

        // Delete batch
        await supabase
          .from('mt_commission_batches')
          .delete()
          .eq('id', batch.id);
      }

      // Process again
      return await processMonthlyCommissions(franchiseId, referenciaMes);
    } catch (err: any) {
      toast.error(`Erro ao reprocessar: ${err.message}`);
      return null;
    }
  }, [tenant?.id, processMonthlyCommissions]);

  /**
   * Busca batch existente para um mês
   */
  const fetchBatch = useCallback(async (franchiseId: string, referenciaMes: string): Promise<CommissionBatch | null> => {
    if (!tenant?.id) return null;
    const { data } = await supabase
      .from('mt_commission_batches')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('franchise_id', franchiseId)
      .eq('tipo', 'mensal_vendas')
      .eq('referencia', referenciaMes)
      .maybeSingle();
    return (data as CommissionBatch) || null;
  }, [tenant?.id]);

  return {
    isProcessing,
    lastResult,
    processMonthlyCommissions,
    reprocessMonth,
    fetchBatch,
  };
}
