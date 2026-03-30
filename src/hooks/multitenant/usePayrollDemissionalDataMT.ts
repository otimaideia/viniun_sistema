import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DemissionalData } from '@/types/financeiro';

export function usePayrollDemissionalDataMT(employeeId?: string) {
  const { tenant, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-payroll-demissional-data', tenant?.id, employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await (supabase as any)
        .from('mt_payroll_demissional_data')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) throw error;
      return data as DemissionalData | null;
    },
    enabled: !!employeeId && (!!tenant || accessLevel === 'platform'),
  });

  const upsert = useMutation({
    mutationFn: async (formData: Partial<DemissionalData>) => {
      if (!employeeId || !tenant) throw new Error('Dados obrigatórios faltando');

      const payload = {
        tenant_id: tenant.id,
        employee_id: employeeId,
        quem_solicitou: formData.quem_solicitou || null,
        tipo_aviso_previo: formData.tipo_aviso_previo || null,
        variaveis: formData.variaveis || null,
        descontos: formData.descontos || null,
        info_ferias_13: formData.info_ferias_13 || null,
        houve_afastamento: formData.houve_afastamento || null,
        updated_at: new Date().toISOString(),
      };

      // Upsert: insert or update based on employee_id unique constraint
      const { data, error } = await (supabase as any)
        .from('mt_payroll_demissional_data')
        .upsert(payload, { onConflict: 'employee_id' })
        .select()
        .single();

      if (error) throw error;
      return data as DemissionalData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-payroll-demissional-data'] });
      toast.success('Dados do desligamento salvos');
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsert,
  };
}
