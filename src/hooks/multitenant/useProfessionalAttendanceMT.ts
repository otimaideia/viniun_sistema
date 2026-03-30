import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { ProfessionalAttendance, AttendanceStatus } from '@/types/produtividade';

export function useProfessionalAttendanceMT(userId?: string, yearMonth?: string) {
  const [attendance, setAttendance] = useState<ProfessionalAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchAttendance = useCallback(async () => {
    if (!userId || !yearMonth) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const from = `${yearMonth}-01`;
      const to = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      let query = supabase
        .from('mt_professional_attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('data', from)
        .lte('data', to)
        .order('data', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setAttendance((data || []) as ProfessionalAttendance[]);
    } catch (err) {
      console.error('Erro ao carregar presença:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, yearMonth, tenant?.id]);

  const updateAttendanceStatus = useCallback(async (date: string, status: AttendanceStatus, observacoes?: string) => {
    if (!userId || !tenant?.id) return;

    const now = new Date().toISOString();
    const existing = attendance.find(a => a.data === date);

    if (existing) {
      const { error } = await supabase
        .from('mt_professional_attendance')
        .update({
          status,
          observacoes: observacoes ?? existing.observacoes,
          checkin_em: status === 'presente' && !existing.checkin_em ? now : existing.checkin_em,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('mt_professional_attendance')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          user_id: userId,
          data: date,
          status,
          checkin_em: status === 'presente' ? now : null,
          observacoes,
        });

      if (error) throw error;
    }

    await fetchAttendance();
  }, [userId, tenant?.id, franchise?.id, attendance, fetchAttendance]);

  const markCheckout = useCallback(async (date: string) => {
    const existing = attendance.find(a => a.data === date);
    if (!existing) return;

    const { error } = await supabase
      .from('mt_professional_attendance')
      .update({
        checkout_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
    await fetchAttendance();
  }, [attendance, fetchAttendance]);

  // Generate attendance for the whole month based on schedule
  const generateFromSchedule = useCallback(async (
    targetUserId: string,
    targetYearMonth: string,
    workingDays: string[] // from useProfessionalScheduleMT.getWorkingDaysInMonth
  ) => {
    if (!tenant?.id) throw new Error('Tenant não definido');

    const [year, month] = targetYearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    const workingSet = new Set(workingDays);
    const records: Array<{
      tenant_id: string;
      franchise_id: string | undefined;
      user_id: string;
      data: string;
      status: AttendanceStatus;
    }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = date.getDay();

      // Don't generate future days
      if (dateStr > today) continue;

      let status: AttendanceStatus;
      if (weekday === 0) {
        status = 'domingo';
      } else if (workingSet.has(dateStr)) {
        status = 'presente';
      } else {
        status = 'folga'; // not scheduled
      }

      records.push({
        tenant_id: tenant.id,
        franchise_id: franchise?.id,
        user_id: targetUserId,
        data: dateStr,
        status,
      });
    }

    if (records.length === 0) return;

    // Upsert: use ON CONFLICT to avoid duplicates
    const { error } = await supabase
      .from('mt_professional_attendance')
      .upsert(records, { onConflict: 'tenant_id,user_id,data' });

    if (error) throw error;
    toast.success(`Presença gerada: ${records.length} dias`);
    await fetchAttendance();
  }, [tenant?.id, franchise?.id, fetchAttendance]);

  useEffect(() => {
    if (userId && yearMonth && (tenant?.id || accessLevel === 'platform')) fetchAttendance();
  }, [fetchAttendance, userId, yearMonth, tenant?.id, accessLevel]);

  return {
    attendance,
    isLoading,
    refetch: fetchAttendance,
    updateAttendanceStatus,
    markCheckout,
    generateFromSchedule,
  };
}
