import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChecklistItemStatus, ChecklistLogAcao, MTChecklistDailyItem } from '@/types/checklist';
import { calculateElapsed } from './useChecklistTimerMT';

/**
 * Hook para execução do checklist diário.
 * Marcar items como feitos, pular, adicionar observações, registrar não-conformidade.
 * Cada ação gera um log com timestamp.
 */
export function useChecklistExecutionMT(dailyId: string | undefined) {
  const { tenant, user: currentUser } = useTenantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily'] });
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-meu'] });
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily-detail', dailyId] });
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-report-daily'] });
  };

  // Registrar ação no log (non-blocking, errors are silently ignored)
  const logAction = async (acao: ChecklistLogAcao, dailyItemId?: string, descricao?: string) => {
    if (!dailyId || !tenant?.id || !currentUser?.id) return;
    try {
      await (supabase.from('mt_checklist_logs') as any).insert({
        tenant_id: tenant.id,
        daily_id: dailyId,
        daily_item_id: dailyItemId || null,
        acao,
        descricao,
        user_id: currentUser.id,
      });
    } catch {
      // Log failures are non-critical
    }
  };

  // Atualizar contadores do daily — retorna true se 100% concluído
  const updateDailySummary = async (): Promise<boolean> => {
    if (!dailyId || !tenant?.id) return false;

    const { data: items } = await (supabase
      .from('mt_checklist_daily_items') as any)
      .select('status')
      .eq('daily_id', dailyId)
      .eq('tenant_id', tenant.id);

    if (!items) return false;

    const total = items.length;
    const concluidos = items.filter((i: any) => i.status === 'concluido').length;
    const nao_concluidos = items.filter((i: any) => i.status === 'nao_feito').length;
    const percentual = total > 0 ? Math.round((concluidos / total) * 10000) / 100 : 0;

    const allDone = items.every((i: any) => i.status !== 'pendente');
    const status = allDone
      ? (nao_concluidos > 0 ? 'incompleto' : 'concluido')
      : (concluidos > 0 ? 'em_andamento' : 'pendente');

    await (supabase.from('mt_checklist_daily') as any)
      .update({
        total_items: total,
        items_concluidos: concluidos,
        items_nao_concluidos: nao_concluidos,
        percentual_conclusao: percentual,
        status,
        ...(status === 'em_andamento' && !concluidos ? { started_at: new Date().toISOString() } : {}),
        ...(allDone ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dailyId);

    return status === 'concluido';
  };

  // Marcar item como concluído (auto-stop timer se estiver rodando)
  const completeItem = useMutation({
    mutationFn: async ({ itemId, observacoes, fotoUrl }: {
      itemId: string;
      observacoes?: string;
      fotoUrl?: string;
    }) => {
      // Auto-stop timer: buscar item atual para calcular elapsed
      const { data: currentItem } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .select('timer_status, timer_started_at, timer_elapsed_seconds')
        .eq('id', itemId)
        .single();

      let timerFields = {};
      if (currentItem?.timer_status === 'running') {
        const elapsed = calculateElapsed(currentItem as MTChecklistDailyItem);
        timerFields = {
          timer_status: 'stopped',
          timer_started_at: null,
          timer_elapsed_seconds: elapsed,
        };
      }

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          status: 'concluido' as ChecklistItemStatus,
          concluido_em: new Date().toISOString(),
          concluido_por: currentUser?.id,
          observacoes: observacoes || null,
          foto_url: fotoUrl || null,
          ...timerFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('concluiu', itemId, observacoes);
      const isFullyComplete = await updateDailySummary();
      return { isFullyComplete };
    },
    onSuccess: (result) => {
      invalidate();
      if (result?.isFullyComplete) {
        // Auto-trigger streak update when checklist is 100% done
        queryClient.invalidateQueries({ queryKey: ['mt-checklist-streak'] });
      }
    },
    onError: () => toast.error('Não foi possível concluir a tarefa. Tente novamente.'),
  });

  // Marcar como não feito
  const markNotDone = useMutation({
    mutationFn: async ({ itemId, observacoes }: { itemId: string; observacoes?: string }) => {
      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          status: 'nao_feito' as ChecklistItemStatus,
          observacoes: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('pulou', itemId, observacoes);
      await updateDailySummary();
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error('Não foi possível marcar como não feito. Tente novamente.'),
  });

  // Pular item
  const skipItem = useMutation({
    mutationFn: async ({ itemId, motivo }: { itemId: string; motivo?: string }) => {
      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          status: 'pulado' as ChecklistItemStatus,
          observacoes: motivo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('pulou', itemId, motivo);
      await updateDailySummary();
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error('Não foi possível pular o item. Tente novamente.'),
  });

  // Reabrir item (voltar para pendente + reset timer)
  const reopenItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          status: 'pendente' as ChecklistItemStatus,
          concluido_em: null,
          concluido_por: null,
          timer_status: 'stopped',
          timer_started_at: null,
          timer_elapsed_seconds: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('reabriu', itemId);
      await updateDailySummary();
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error('Não foi possível reabrir o item. Tente novamente.'),
  });

  // Registrar não-conformidade
  const flagNonConformity = useMutation({
    mutationFn: async ({ itemId, descricao, acao }: {
      itemId: string;
      descricao: string;
      acao: string;
    }) => {
      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          has_nao_conformidade: true,
          nao_conformidade_descricao: descricao,
          nao_conformidade_acao: acao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('nao_conformidade', itemId, descricao);
    },
    onSuccess: () => {
      invalidate();
      toast.warning('Não-conformidade registrada');
    },
    onError: () => toast.error('Não foi possível registrar a não-conformidade. Tente novamente.'),
  });

  // Adicionar item ad-hoc (gerente)
  const addAdHocItem = useMutation({
    mutationFn: async ({ titulo, descricao, hora_bloco, prioridade, categoria }: {
      titulo: string;
      descricao?: string;
      hora_bloco?: string;
      prioridade?: string;
      categoria?: string;
    }) => {
      if (!dailyId || !tenant?.id) throw new Error('Checklist não carregado');

      // Get current max ordem
      const { data: existing } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .select('ordem')
        .eq('daily_id', dailyId)
        .order('ordem', { ascending: false })
        .limit(1);

      const nextOrdem = (existing?.[0]?.ordem || 0) + 1;

      const { data, error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .insert({
          tenant_id: tenant.id,
          daily_id: dailyId,
          titulo,
          descricao: descricao || null,
          hora_bloco: hora_bloco || null,
          prioridade: prioridade || 'normal',
          categoria: categoria || null,
          ordem: nextOrdem,
          is_ad_hoc: true,
          adicionado_por: currentUser?.id,
          status: 'pendente',
        })
        .select()
        .single();
      if (error) throw error;

      await logAction('adicionou_item', data.id, titulo);
      await updateDailySummary();
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Item adicionado ao checklist');
    },
    onError: () => toast.error('Não foi possível adicionar o item. Tente novamente.'),
  });

  // Finalizar checklist do dia (gerente)
  const finalize = useMutation({
    mutationFn: async ({ status, observacoes }: {
      status: 'concluido' | 'incompleto' | 'cancelado';
      observacoes?: string;
    }) => {
      if (!dailyId) throw new Error('Checklist não carregado');

      const { error } = await (supabase
        .from('mt_checklist_daily') as any)
        .update({
          status,
          observacoes_gestor: observacoes || null,
          modificado_por: currentUser?.id,
          modificado_em: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', dailyId);
      if (error) throw error;

      await logAction('finalizou', undefined, `Finalizado como ${status}`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Checklist finalizado');
    },
    onError: () => toast.error('Não foi possível finalizar o checklist. Tente novamente.'),
  });

  // Remover item ad-hoc (gerente)
  const removeAdHocItem = useMutation({
    mutationFn: async (itemId: string) => {
      // Verificar se é ad-hoc
      const { data: item } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .select('is_ad_hoc, titulo')
        .eq('id', itemId)
        .single();

      if (!item?.is_ad_hoc) throw new Error('Apenas itens ad-hoc podem ser removidos');

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .delete()
        .eq('id', itemId);
      if (error) throw error;

      await logAction('modificou', itemId, `Removeu item: ${item.titulo}`);
      await updateDailySummary();
    },
    onSuccess: () => {
      invalidate();
      toast.success('Item removido');
    },
    onError: () => toast.error('Não foi possível remover o item. Tente novamente.'),
  });

  // Modificar bloco horário e duração de um item (gerente)
  const updateItemTimeBlock = useMutation({
    mutationFn: async ({ itemId, hora_bloco, duracao_min }: {
      itemId: string;
      hora_bloco?: string;
      duracao_min?: number;
    }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (hora_bloco !== undefined) updates.hora_bloco = hora_bloco || null;
      if (duracao_min !== undefined) updates.duracao_min = duracao_min;

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update(updates)
        .eq('id', itemId);
      if (error) throw error;

      await logAction('modificou', itemId, `Alterou horário/duração`);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Item atualizado');
    },
    onError: () => toast.error('Não foi possível atualizar o horário. Tente novamente.'),
  });

  return {
    completeItem,
    markNotDone,
    skipItem,
    reopenItem,
    flagNonConformity,
    addAdHocItem,
    removeAdHocItem,
    updateItemTimeBlock,
    finalize,
  };
}
