import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export interface TreatmentTimerLog {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  appointment_id: string;
  profissional_id: string;
  treatment_session_id?: string;

  // Timer state
  timer_started_at: string;
  timer_paused_at?: string | null;
  timer_resumed_at?: string | null;
  timer_finished_at?: string | null;
  timer_status: 'running' | 'paused' | 'stopped';

  // Accumulated time
  timer_elapsed_seconds: number;
  pause_seconds: number;
  total_seconds?: number;

  // Metadata
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format seconds to HH:MM:SS string
 */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Calculate real-time elapsed seconds from a timer log entry.
 * Follows checklist timer pattern: uses timer_started_at as reference.
 */
export function calculateElapsed(timer: TreatmentTimerLog): number {
  if (!timer.timer_started_at) return 0;

  const startedAt = new Date(timer.timer_started_at).getTime();
  const now = Date.now();

  if (timer.timer_status === 'stopped') {
    return timer.total_seconds || timer.timer_elapsed_seconds || 0;
  }

  if (timer.timer_status === 'paused') {
    // When paused, elapsed = time from start to pause minus accumulated pauses
    const pausedAt = timer.timer_paused_at
      ? new Date(timer.timer_paused_at).getTime()
      : now;
    const rawElapsed = Math.floor((pausedAt - startedAt) / 1000);
    return Math.max(0, rawElapsed - (timer.pause_seconds || 0));
  }

  // Running: calculate from start minus pauses
  const rawElapsed = Math.floor((now - startedAt) / 1000);
  return Math.max(0, rawElapsed - (timer.pause_seconds || 0));
}

// =============================================================================
// HOOK: useTreatmentTimerMT
// =============================================================================

export function useTreatmentTimerMT(appointmentId: string | undefined) {
  const { tenant, franchise, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active timer for this appointment
  const timerQuery = useQuery({
    queryKey: ['mt-treatment-timer', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;

      const { data, error } = await (supabase
        .from('mt_treatment_timer_logs') as any)
        .select('*')
        .eq('appointment_id', appointmentId)
        .in('timer_status', ['running', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TreatmentTimerLog | null;
    },
    enabled: !isTenantLoading && !!appointmentId,
  });

  const activeTimer = timerQuery.data;

  // Real-time display with setInterval (follows checklist timer pattern)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeTimer && activeTimer.timer_status === 'running') {
      // Update display immediately
      setDisplaySeconds(calculateElapsed(activeTimer));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setDisplaySeconds(calculateElapsed(activeTimer));
      }, 1000);
    } else if (activeTimer && activeTimer.timer_status === 'paused') {
      setDisplaySeconds(calculateElapsed(activeTimer));
    } else {
      setDisplaySeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTimer]);

  // Start timer
  const startTimer = useMutation({
    mutationFn: async ({
      profissionalId,
      treatmentSessionId,
    }: {
      profissionalId: string;
      treatmentSessionId?: string;
    }) => {
      if (!appointmentId) throw new Error('Appointment ID obrigatorio');
      if (!tenant?.id) throw new Error('Tenant nao carregado');

      const now = new Date().toISOString();

      const { data, error } = await (supabase
        .from('mt_treatment_timer_logs') as any)
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          appointment_id: appointmentId,
          profissional_id: profissionalId,
          treatment_session_id: treatmentSessionId || null,
          timer_started_at: now,
          timer_status: 'running',
          timer_elapsed_seconds: 0,
          pause_seconds: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TreatmentTimerLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-treatment-timer', appointmentId] });
      toast.success('Timer iniciado');
    },
    onError: (error: any) => toast.error(`Erro ao iniciar timer: ${error.message}`),
  });

  // Pause timer
  const pauseTimer = useMutation({
    mutationFn: async (timerId: string) => {
      const now = new Date().toISOString();

      // Calculate current elapsed to store
      const currentElapsed = activeTimer ? calculateElapsed(activeTimer) : 0;

      const { data, error } = await (supabase
        .from('mt_treatment_timer_logs') as any)
        .update({
          timer_paused_at: now,
          timer_status: 'paused',
          timer_elapsed_seconds: currentElapsed,
          updated_at: now,
        })
        .eq('id', timerId)
        .select()
        .single();

      if (error) throw error;
      return data as TreatmentTimerLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-treatment-timer', appointmentId] });
      toast.success('Timer pausado');
    },
    onError: (error: any) => toast.error(`Erro ao pausar timer: ${error.message}`),
  });

  // Resume timer
  const resumeTimer = useMutation({
    mutationFn: async (timerId: string) => {
      if (!activeTimer) throw new Error('Nenhum timer ativo');

      const now = new Date().toISOString();
      const nowMs = Date.now();

      // Calculate how long the pause lasted and add to accumulated pause_seconds
      const pausedAt = activeTimer.timer_paused_at
        ? new Date(activeTimer.timer_paused_at).getTime()
        : nowMs;
      const pauseDuration = Math.floor((nowMs - pausedAt) / 1000);
      const newPauseSeconds = (activeTimer.pause_seconds || 0) + pauseDuration;

      const { data, error } = await (supabase
        .from('mt_treatment_timer_logs') as any)
        .update({
          timer_paused_at: null,
          timer_resumed_at: now,
          timer_status: 'running',
          pause_seconds: newPauseSeconds,
          updated_at: now,
        })
        .eq('id', timerId)
        .select()
        .single();

      if (error) throw error;
      return data as TreatmentTimerLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-treatment-timer', appointmentId] });
      toast.success('Timer retomado');
    },
    onError: (error: any) => toast.error(`Erro ao retomar timer: ${error.message}`),
  });

  // Stop timer
  const stopTimer = useMutation({
    mutationFn: async ({ timerId, observacoes }: { timerId: string; observacoes?: string }) => {
      const now = new Date().toISOString();
      const totalSeconds = activeTimer ? calculateElapsed(activeTimer) : 0;

      const { data, error } = await (supabase
        .from('mt_treatment_timer_logs') as any)
        .update({
          timer_finished_at: now,
          timer_status: 'stopped',
          timer_elapsed_seconds: totalSeconds,
          total_seconds: totalSeconds,
          observacoes: observacoes || null,
          updated_at: now,
        })
        .eq('id', timerId)
        .select()
        .single();

      if (error) throw error;
      return data as TreatmentTimerLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-treatment-timer', appointmentId] });
      toast.success('Timer finalizado');
    },
    onError: (error: any) => toast.error(`Erro ao finalizar timer: ${error.message}`),
  });

  return {
    activeTimer,
    displaySeconds,
    displayFormatted: formatSeconds(displaySeconds),
    isLoading: timerQuery.isLoading || isTenantLoading,
    isRunning: activeTimer?.timer_status === 'running',
    isPaused: activeTimer?.timer_status === 'paused',
    isStopped: !activeTimer || activeTimer.timer_status === 'stopped',
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    refetch: timerQuery.refetch,
  };
}

export default useTreatmentTimerMT;
