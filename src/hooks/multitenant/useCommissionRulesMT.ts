import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { CommissionRule, CommissionTier } from '@/types/vendas';

export function useCommissionRulesMT(franchiseIdOverride?: string) {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [rules, setRules] = useState<CommissionRule | null>(null);
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveFranchiseId = franchiseIdOverride || franchise?.id;

  const fetchRules = useCallback(async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_commission_rules')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .limit(1);

      if (effectiveFranchiseId) {
        query = query.eq('franchise_id', effectiveFranchiseId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setRules(data as CommissionRule | null);

      // Fetch tiers if rule exists
      if (data?.id) {
        const { data: tiersData, error: tiersError } = await supabase
          .from('mt_commission_tiers')
          .select('*')
          .eq('rule_id', data.id)
          .order('ordem', { ascending: true });
        if (tiersError) throw tiersError;
        setTiers((tiersData || []) as CommissionTier[]);
      } else {
        setTiers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar regras de comissão:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, effectiveFranchiseId]);

  const updateRule = useCallback(async (updates: Partial<Omit<CommissionRule, 'id' | 'tenant_id' | 'franchise_id' | 'created_at'>>) => {
    if (!rules?.id) {
      toast.error('Nenhuma regra encontrada para atualizar');
      return;
    }
    try {
      const { error } = await supabase
        .from('mt_commission_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', rules.id);
      if (error) throw error;
      toast.success('Regras atualizadas');
      await fetchRules();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [rules?.id, fetchRules]);

  const createRule = useCallback(async (franchiseId: string) => {
    if (!tenant?.id) return;
    try {
      const { error } = await supabase
        .from('mt_commission_rules')
        .insert({ tenant_id: tenant.id, franchise_id: franchiseId });
      if (error) throw error;
      toast.success('Regras criadas com valores padrão');
      await fetchRules();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [tenant?.id, fetchRules]);

  const addTier = useCallback(async (metaValor: number, percentual: number) => {
    if (!rules?.id) return;
    try {
      const ordem = tiers.length + 1;
      const { error } = await supabase
        .from('mt_commission_tiers')
        .insert({ rule_id: rules.id, meta_valor: metaValor, percentual, ordem });
      if (error) throw error;
      toast.success('Tier adicionado');
      await fetchRules();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [rules?.id, tiers.length, fetchRules]);

  const updateTier = useCallback(async (tierId: string, updates: { meta_valor?: number; percentual?: number; ordem?: number }) => {
    try {
      const { error } = await supabase
        .from('mt_commission_tiers')
        .update(updates)
        .eq('id', tierId);
      if (error) throw error;
      toast.success('Tier atualizado');
      await fetchRules();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [fetchRules]);

  const removeTier = useCallback(async (tierId: string) => {
    try {
      const { error } = await supabase
        .from('mt_commission_tiers')
        .delete()
        .eq('id', tierId);
      if (error) throw error;
      toast.success('Tier removido');
      await fetchRules();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [fetchRules]);

  useEffect(() => {
    if (tenant?.id) {
      fetchRules();
    }
  }, [fetchRules, tenant?.id]);

  return {
    rules,
    tiers,
    isLoading,
    updateRule,
    createRule,
    addTier,
    updateTier,
    removeTier,
    refetch: fetchRules,
  };
}
