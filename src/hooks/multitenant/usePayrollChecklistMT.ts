import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PayrollChecklistItem,
  ChecklistStatus,
  ChecklistTipo,
  CHECKLIST_CATEGORIA_LABELS,
  DEFAULT_CHECKLIST_ITEMS,
  DEFAULT_DEMISSIONAL_ITEMS,
} from '@/types/financeiro';

export function usePayrollChecklistMT(employeeId?: string, tipo: ChecklistTipo = 'admissional') {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-payroll-checklist', tenant?.id, employeeId, tipo],
    queryFn: async () => {
      if (!employeeId) return [];

      let q = (supabase as any)
        .from('mt_payroll_checklist_items')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('tipo', tipo)
        .order('categoria', { ascending: true })
        .order('obrigatorio', { ascending: false })
        .order('nome', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant?.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PayrollChecklistItem[];
    },
    enabled: !!employeeId && (!!tenant || accessLevel === 'platform'),
  });

  const items = query.data || [];

  // Computed values
  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'validado').length;
  const pendingItems = items.filter(i => i.status === 'pendente').length;
  const enviadoItems = items.filter(i => i.status === 'enviado').length;
  const rejeitadoItems = items.filter(i => i.status === 'rejeitado').length;
  const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const requiredItems = items.filter(i => i.obrigatorio);
  const requiredCompleted = requiredItems.filter(i => i.status === 'validado').length;
  const requiredPercent = requiredItems.length > 0 ? Math.round((requiredCompleted / requiredItems.length) * 100) : 0;

  // Group by category
  const byCategory = items.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = {
        label: CHECKLIST_CATEGORIA_LABELS[item.categoria] || item.categoria,
        items: [],
        completed: 0,
        total: 0,
      };
    }
    acc[item.categoria].items.push(item);
    acc[item.categoria].total++;
    if (item.status === 'validado') acc[item.categoria].completed++;
    return acc;
  }, {} as Record<string, { label: string; items: PayrollChecklistItem[]; completed: number; total: number }>);

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({
      itemId,
      status,
      observacoes,
    }: {
      itemId: string;
      status: ChecklistStatus;
      observacoes?: string;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'validado') {
        updateData.validado_em = new Date().toISOString();
      }

      if (observacoes !== undefined) {
        updateData.observacoes = observacoes;
      }

      const { error } = await (supabase as any)
        .from('mt_payroll_checklist_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-payroll-checklist'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Link document to checklist item
  const linkDocument = useMutation({
    mutationFn: async ({
      itemId,
      documentoId,
    }: {
      itemId: string;
      documentoId: string;
    }) => {
      const { error } = await (supabase as any)
        .from('mt_payroll_checklist_items')
        .update({
          documento_id: documentoId,
          status: 'enviado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-payroll-checklist'] });
      toast.success('Documento vinculado');
    },
    onError: (error: any) => {
      toast.error(`Erro ao vincular: ${error.message}`);
    },
  });

  // Create default admissional checklist items
  const createDefaultItems = async (empId: string, tenantId: string) => {
    const newItems = DEFAULT_CHECKLIST_ITEMS.map(item => ({
      tenant_id: tenantId,
      employee_id: empId,
      codigo: item.codigo,
      categoria: item.categoria,
      nome: item.nome,
      obrigatorio: item.obrigatorio,
      status: 'pendente',
      tipo: 'admissional',
    }));

    const { error } = await (supabase as any)
      .from('mt_payroll_checklist_items')
      .insert(newItems);

    if (error) throw error;
  };

  // Create demissional checklist items
  const createDemissionalItems = async (empId: string, tenantId: string) => {
    // Check if demissional items already exist
    const { data: existing } = await (supabase as any)
      .from('mt_payroll_checklist_items')
      .select('id')
      .eq('employee_id', empId)
      .eq('tipo', 'demissional')
      .limit(1);

    if (existing && existing.length > 0) return false; // Already exists

    const newItems = DEFAULT_DEMISSIONAL_ITEMS.map(item => ({
      tenant_id: tenantId,
      employee_id: empId,
      codigo: item.codigo,
      categoria: item.categoria,
      nome: item.nome,
      obrigatorio: item.obrigatorio,
      status: 'pendente',
      tipo: 'demissional',
    }));

    const { error } = await (supabase as any)
      .from('mt_payroll_checklist_items')
      .insert(newItems);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['mt-payroll-checklist'] });
    return true; // Created
  };

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Computed
    totalItems,
    completedItems,
    pendingItems,
    enviadoItems,
    rejeitadoItems,
    percentComplete,
    requiredPercent,
    byCategory,
    // Mutations
    updateStatus,
    linkDocument,
    createDefaultItems,
    createDemissionalItems,
  };
}
