import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { InstallmentConfig, InstallmentConfigCreate } from '@/types/vendas';

export function useInstallmentConfigsMT() {
  const [configs, setConfigs] = useState<InstallmentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_installment_configs')
        .select('*')
        .eq('is_active', true)
        .order('forma_pagamento');

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setConfigs((data || []) as InstallmentConfig[]);
    } catch (err) {
      console.error('Erro ao carregar configs de parcelamento:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  const createConfig = useCallback(async (data: InstallmentConfigCreate): Promise<InstallmentConfig> => {
    const { data: created, error } = await supabase
      .from('mt_installment_configs')
      .insert({ tenant_id: tenant?.id, ...data })
      .select()
      .single();

    if (error) throw error;
    toast.success('Configuração criada');
    await fetchConfigs();
    return created as InstallmentConfig;
  }, [tenant?.id, fetchConfigs]);

  const updateConfig = useCallback(async (id: string, updates: Partial<InstallmentConfigCreate>): Promise<void> => {
    const { error } = await supabase
      .from('mt_installment_configs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Configuração atualizada');
    await fetchConfigs();
  }, [fetchConfigs]);

  const deleteConfig = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mt_installment_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    toast.success('Configuração removida');
    await fetchConfigs();
  }, [fetchConfigs]);

  const getMaxParcelas = useCallback((formaPagamento: string): number => {
    const config = configs.find(c => c.forma_pagamento === formaPagamento);
    return config?.max_parcelas ?? 1;
  }, [configs]);

  const getMetaPercentual = useCallback((formaPagamento: string): number | null => {
    const config = configs.find(c => c.forma_pagamento === formaPagamento);
    return config?.meta_percentual ?? null;
  }, [configs]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchConfigs();
  }, [fetchConfigs, tenant?.id, accessLevel]);

  return {
    configs,
    isLoading,
    refetch: fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    getMaxParcelas,
    getMetaPercentual,
  };
}
