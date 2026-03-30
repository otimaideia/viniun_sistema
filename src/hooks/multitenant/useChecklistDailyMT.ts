import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTChecklistDaily, MTChecklistDailyItem, ChecklistDailyFilters } from '@/types/checklist';

/**
 * Hook para gerenciar checklists diários.
 * - Lista checklists por data/usuário/status
 * - Gera checklist diário a partir de um template
 * - Carrega o checklist do dia do usuário atual
 */
export function useChecklistDailyMT(filters?: ChecklistDailyFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Lista de checklists diários (para visão do gestor)
  const query = useQuery({
    queryKey: ['mt-checklist-daily', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = (supabase
        .from('mt_checklist_daily') as any)
        .select(`
          *,
          template:mt_checklist_templates(id, nome, icone, cor),
          user:mt_users!mt_checklist_daily_user_id_fkey(id, nome, cargo)
        `)
        .order('data', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      if (filters?.data) q = q.eq('data', filters.data);
      if (filters?.user_id) q = q.eq('user_id', filters.user_id);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.template_id) q = q.eq('template_id', filters.template_id);
      if (filters?.franchise_id) q = q.eq('franchise_id', filters.franchise_id);

      const { data, error } = await q;
      if (error) throw error;
      return data as MTChecklistDaily[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Gerar checklist diário a partir de template
  const generate = useMutation({
    mutationFn: async ({ templateId, userId, data: date }: { templateId: string; userId: string; data: string }) => {
      // 1. Buscar template com items
      const { data: template, error: tErr } = await (supabase
        .from('mt_checklist_templates') as any)
        .select('*, items:mt_checklist_items(*)')
        .eq('id', templateId)
        .is('items.deleted_at', null)
        .order('ordem', { referencedTable: 'mt_checklist_items', ascending: true })
        .single();
      if (tErr) throw tErr;

      const items = template.items || [];

      // 2. Criar instância diária
      const { data: daily, error: dErr } = await (supabase
        .from('mt_checklist_daily') as any)
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          template_id: templateId,
          user_id: userId,
          data: date,
          hora_inicio: template.hora_inicio,
          hora_fim: template.hora_fim,
          total_items: items.length,
          status: 'pendente',
        })
        .select()
        .single();
      if (dErr) throw dErr;

      // 3. Criar items da instância diária (cópia dos items do template)
      if (items.length > 0) {
        const dailyItems = items.map((item: any) => ({
          tenant_id: tenant?.id,
          daily_id: daily.id,
          item_id: item.id,
          titulo: item.titulo,
          descricao: item.descricao,
          instrucoes: item.instrucoes,
          hora_bloco: item.hora_bloco,
          duracao_min: item.duracao_min,
          ordem: item.ordem,
          prioridade: item.prioridade,
          categoria: item.categoria,
          is_obrigatorio: item.is_obrigatorio,
          requer_foto: item.requer_foto,
          requer_observacao: item.requer_observacao,
          status: 'pendente',
        }));

        const { error: iErr } = await (supabase
          .from('mt_checklist_daily_items') as any)
          .insert(dailyItems);
        if (iErr) throw iErr;
      }

      return daily;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily'] });
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-meu'] });
      toast.success('Checklist diário gerado com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao gerar checklist: ${error.message}`),
  });

  // Atualizar status do daily
  const updateDaily = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTChecklistDaily> & { id: string }) => {
      const { data, error } = await (supabase
        .from('mt_checklist_daily') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily'] });
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-meu'] });
    },
    onError: (error: any) => toast.error(`Erro ao atualizar checklist: ${error.message}`),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    generate,
    updateDaily,
  };
}

/**
 * Hook para o checklist do dia do usuário atual.
 * Carrega todos os checklists diários do usuário logado para a data especificada.
 */
export function useMeuChecklistMT(date?: string) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();

  // Usar data local para evitar problemas de fuso horário (Brasil UTC-3)
  const today = date || (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  return useQuery({
    queryKey: ['mt-checklist-meu', user?.id, today],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('mt_checklist_daily') as any)
        .select(`
          *,
          template:mt_checklist_templates(id, nome, icone, cor, assignment_type),
          items:mt_checklist_daily_items(*)
        `)
        .eq('user_id', user?.id)
        .eq('data', today)
        .order('created_at', { ascending: true })
        .order('ordem', { referencedTable: 'mt_checklist_daily_items', ascending: true });

      if (error) throw error;
      return data as MTChecklistDaily[];
    },
    enabled: !isTenantLoading && !!user?.id,
  });
}

/**
 * Hook para carregar um checklist diário específico com items.
 */
export function useChecklistDailyDetailMT(id: string | undefined) {
  const { isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-checklist-daily-detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await (supabase
        .from('mt_checklist_daily') as any)
        .select(`
          *,
          template:mt_checklist_templates(id, nome, icone, cor),
          user:mt_users!mt_checklist_daily_user_id_fkey(id, nome, cargo),
          items:mt_checklist_daily_items(*)
        `)
        .eq('id', id)
        .order('ordem', { referencedTable: 'mt_checklist_daily_items', ascending: true })
        .single();

      if (error) throw error;
      return data as MTChecklistDaily;
    },
    enabled: !isTenantLoading && !!id,
  });
}
