import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { ProfessionalSchedule } from '@/types/produtividade';

export function useProfessionalScheduleMT(userId?: string) {
  const [schedule, setSchedule] = useState<ProfessionalSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchSchedule = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_professional_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('dia_semana', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setSchedule((data || []) as ProfessionalSchedule[]);
    } catch (err) {
      console.error('Erro ao carregar escala:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, tenant?.id]);

  const saveSchedule = useCallback(async (
    targetUserId: string,
    days: Array<{ dia_semana: number; hora_inicio: string; hora_fim: string; is_active: boolean }>
  ) => {
    if (!tenant?.id) throw new Error('Tenant não definido');

    // Delete existing schedule for this user
    await supabase
      .from('mt_professional_schedules')
      .delete()
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenant.id);

    // Insert new schedule (only active days)
    const activeDays = days.filter(d => d.is_active);
    if (activeDays.length > 0) {
      const { error } = await supabase
        .from('mt_professional_schedules')
        .insert(
          activeDays.map(d => ({
            tenant_id: tenant.id,
            franchise_id: franchise?.id,
            user_id: targetUserId,
            dia_semana: d.dia_semana,
            hora_inicio: d.hora_inicio,
            hora_fim: d.hora_fim,
            is_active: true,
          }))
        );

      if (error) throw error;
    }

    toast.success('Escala salva com sucesso');
    await fetchSchedule();
  }, [tenant?.id, franchise?.id, fetchSchedule]);

  // Returns which dates in a month the professional should work (based on schedule)
  const getWorkingDaysInMonth = useCallback((yearMonth: string): string[] => {
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays: string[] = [];

    // Get active weekdays from schedule
    const activeWeekdays = new Set(schedule.map(s => s.dia_semana));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay(); // 0=Sun, 1=Mon, ...
      if (activeWeekdays.has(weekday)) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        workingDays.push(dateStr);
      }
    }

    return workingDays;
  }, [schedule]);

  useEffect(() => {
    if (userId && (tenant?.id || accessLevel === 'platform')) fetchSchedule();
  }, [fetchSchedule, userId, tenant?.id, accessLevel]);

  return {
    schedule,
    isLoading,
    refetch: fetchSchedule,
    saveSchedule,
    getWorkingDaysInMonth,
  };
}
