import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTChecklistDailyItem, ChecklistLogAcao, TimerStatus } from '@/types/checklist';

/**
 * Hook para controle de timer (play/pause/stop) nos items do checklist diário.
 * O timer persiste no banco — sobrevive a refresh de página.
 */
export function useChecklistTimerMT(dailyId: string | undefined) {
  const { tenant, user: currentUser } = useTenantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily'] });
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-meu'] });
    queryClient.invalidateQueries({ queryKey: ['mt-checklist-daily-detail', dailyId] });
  };

  const logAction = async (acao: ChecklistLogAcao, dailyItemId: string, descricao?: string) => {
    if (!dailyId || !tenant?.id || !currentUser?.id) return;
    try {
      await (supabase.from('mt_checklist_logs') as any).insert({
        tenant_id: tenant.id,
        daily_id: dailyId,
        daily_item_id: dailyItemId,
        acao,
        descricao,
        user_id: currentUser.id,
      });
    } catch {
      // Log failures are non-critical
    }
  };

  // Iniciar / Resumir timer (auto-pause any other running timer in the same daily)
  const startTimer = useMutation({
    mutationFn: async (itemId: string) => {
      // Auto-pause: find and pause any running timer in this daily
      if (dailyId) {
        const { data: runningItems } = await (supabase
          .from('mt_checklist_daily_items') as any)
          .select('id, timer_status, timer_started_at, timer_elapsed_seconds')
          .eq('daily_id', dailyId)
          .eq('timer_status', 'running')
          .neq('id', itemId);

        if (runningItems?.length) {
          for (const running of runningItems) {
            const elapsed = calculateElapsed(running as MTChecklistDailyItem);
            await (supabase.from('mt_checklist_daily_items') as any)
              .update({
                timer_status: 'paused' as TimerStatus,
                timer_started_at: null,
                timer_elapsed_seconds: elapsed,
                updated_at: new Date().toISOString(),
              })
              .eq('id', running.id);
          }
        }
      }

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          timer_status: 'running' as TimerStatus,
          timer_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      // Se daily está pendente, marcar como em_andamento
      if (dailyId) {
        await (supabase.from('mt_checklist_daily') as any)
          .update({
            status: 'em_andamento',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', dailyId)
          .eq('status', 'pendente');
      }

      await logAction('timer_start', itemId);
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => toast.error(`Erro ao iniciar timer: ${error.message}`),
  });

  // Pausar timer — acumula elapsed
  const pauseTimer = useMutation({
    mutationFn: async ({ itemId, currentItem }: { itemId: string; currentItem: MTChecklistDailyItem }) => {
      const elapsed = calculateElapsed(currentItem);

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          timer_status: 'paused' as TimerStatus,
          timer_started_at: null,
          timer_elapsed_seconds: elapsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('timer_pause', itemId, `${formatSeconds(elapsed)} acumulados`);
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => toast.error(`Erro ao pausar timer: ${error.message}`),
  });

  // Parar timer — salva elapsed final
  const stopTimer = useMutation({
    mutationFn: async ({ itemId, currentItem }: { itemId: string; currentItem: MTChecklistDailyItem }) => {
      const elapsed = calculateElapsed(currentItem);

      const { error } = await (supabase
        .from('mt_checklist_daily_items') as any)
        .update({
          timer_status: 'stopped' as TimerStatus,
          timer_started_at: null,
          timer_elapsed_seconds: elapsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
      if (error) throw error;

      await logAction('timer_stop', itemId, `Tempo total: ${formatSeconds(elapsed)}`);
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => toast.error(`Erro ao parar timer: ${error.message}`),
  });

  return {
    startTimer,
    pauseTimer,
    stopTimer,
  };
}

/**
 * Calcula o tempo total decorrido em segundos.
 * Se running: elapsed acumulado + (agora - timer_started_at)
 * Se paused/stopped: elapsed acumulado
 */
export function calculateElapsed(item: MTChecklistDailyItem): number {
  const base = item.timer_elapsed_seconds || 0;
  if (item.timer_status === 'running' && item.timer_started_at) {
    const started = new Date(item.timer_started_at).getTime();
    const now = Date.now();
    return base + Math.floor((now - started) / 1000);
  }
  return base;
}

/**
 * Formata segundos em HH:MM:SS
 */
export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
