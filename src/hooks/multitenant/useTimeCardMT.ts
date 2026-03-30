import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TimeCardEntry, TimeCardSummary, AttendanceStatus, AttendanceRecord, AttendanceAuditEntry, JustificativaTipo } from '@/types/produtividade';

interface EmployeeScheduleDay {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
}

export interface ClockOptions {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  selfie_url?: string;
  registro_origem?: 'admin' | 'self_service';
}

// Converte "HH:MM" para minutos desde meia-noite
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Converte minutos para "HH:MM"
function minutesToTime(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Extrai "HH:MM" de um timestamp ISO
function timestampToTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function useTimeCardMT(userId?: string, yearMonth?: string) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<EmployeeScheduleDay[]>([]);
  const [employeeDefaults, setEmployeeDefaults] = useState<{ horario_entrada: string; horario_saida: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { user } = useAuth();

  // Busca presença do mês - TODAS as entradas (múltiplas por dia)
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
        .order('data', { ascending: true })
        .order('checkin_em', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setAttendance(data || []);
    } catch (err) {
      console.error('Erro ao carregar presença:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, yearMonth, tenant?.id]);

  // Busca escala semanal do profissional
  const fetchSchedule = useCallback(async () => {
    if (!userId) return;
    try {
      let query = supabase
        .from('mt_professional_schedules')
        .select('dia_semana, hora_inicio, hora_fim')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);

      const { data, error } = await query;
      if (error) throw error;
      setSchedule((data || []).map(d => ({
        dia_semana: d.dia_semana,
        hora_inicio: typeof d.hora_inicio === 'string' ? d.hora_inicio.substring(0, 5) : '08:00',
        hora_fim: typeof d.hora_fim === 'string' ? d.hora_fim.substring(0, 5) : '18:00',
      })));
    } catch (err) {
      console.error('Erro ao carregar escala:', err);
    }
  }, [userId, tenant?.id]);

  // Busca horário padrão do funcionário
  const fetchEmployeeDefaults = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('mt_payroll_employees')
        .select('horario_entrada, horario_saida')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEmployeeDefaults({
          horario_entrada: typeof data.horario_entrada === 'string' ? data.horario_entrada.substring(0, 5) : '08:00',
          horario_saida: typeof data.horario_saida === 'string' ? data.horario_saida.substring(0, 5) : '18:00',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar defaults:', err);
      setEmployeeDefaults({ horario_entrada: '08:00', horario_saida: '18:00' });
    }
  }, [userId]);

  useEffect(() => {
    if (userId && yearMonth && (tenant?.id || accessLevel === 'platform')) {
      fetchAttendance();
      fetchSchedule();
      fetchEmployeeDefaults();
    }
  }, [fetchAttendance, fetchSchedule, fetchEmployeeDefaults, userId, yearMonth, tenant?.id, accessLevel]);

  // Retorna horário esperado para um dia da semana
  const getExpectedHours = useCallback((weekday: number) => {
    const scheduleDay = schedule.find(s => s.dia_semana === weekday);
    if (scheduleDay) {
      return { entrada: scheduleDay.hora_inicio, saida: scheduleDay.hora_fim };
    }
    return {
      entrada: employeeDefaults?.horario_entrada || '08:00',
      saida: employeeDefaults?.horario_saida || '18:00',
    };
  }, [schedule, employeeDefaults]);

  // Gera os dias do mês com cálculos
  const days: TimeCardEntry[] = useMemo(() => {
    if (!yearMonth) return [];
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Agrupa entradas por data
    const attendanceByDate = new Map<string, any[]>();
    attendance.forEach(a => {
      const existing = attendanceByDate.get(a.data) || [];
      existing.push(a);
      attendanceByDate.set(a.data, existing);
    });

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      const dayRecords = attendanceByDate.get(dateStr) || [];
      const hasAnyRecord = dayRecords.length > 0;
      const status: AttendanceStatus = hasAnyRecord
        ? (dayRecords.some((r: any) => r.status === 'presente') ? 'presente' : dayRecords[0].status)
        : (weekday === 0 ? 'domingo' : 'falta');
      const expected = getExpectedHours(weekday);

      // Primeira entrada e última saída do dia (para resumo)
      const firstCheckin = dayRecords.find((r: any) => r.checkin_em)?.checkin_em || null;
      const lastCheckout = [...dayRecords].reverse().find((r: any) => r.checkout_em)?.checkout_em || null;

      let hours_worked_minutes = 0;
      let late_minutes = 0;
      let early_departure_minutes = 0;
      let overtime_minutes = 0;
      const expected_minutes = timeToMinutes(expected.saida) - timeToMinutes(expected.entrada);

      // Calcula horas trabalhadas somando todos os pares entrada/saída
      dayRecords.forEach((r: any) => {
        if (r.checkin_em && r.checkout_em) {
          const checkinMin = timeToMinutes(timestampToTime(r.checkin_em));
          const checkoutMin = timeToMinutes(timestampToTime(r.checkout_em));
          hours_worked_minutes += Math.max(0, checkoutMin - checkinMin);
        }
      });

      if (status === 'presente' && firstCheckin) {
        const checkinTime = timestampToTime(firstCheckin);
        const expectedEntradaMin = timeToMinutes(expected.entrada);
        late_minutes = Math.max(0, timeToMinutes(checkinTime) - expectedEntradaMin);

        if (lastCheckout) {
          const expectedSaidaMin = timeToMinutes(expected.saida);
          early_departure_minutes = Math.max(0, expectedSaidaMin - timeToMinutes(timestampToTime(lastCheckout)));
        }
        overtime_minutes = Math.max(0, hours_worked_minutes - expected_minutes);
      }

      // Monta registros detalhados para o detalhe do dia
      const records: AttendanceRecord[] = dayRecords.map((r: any) => ({
        id: r.id,
        checkin_em: r.checkin_em,
        checkout_em: r.checkout_em,
        checkin_selfie_url: r.checkin_selfie_url || null,
        checkout_selfie_url: r.checkout_selfie_url || null,
        checkin_latitude: r.checkin_latitude ? Number(r.checkin_latitude) : null,
        checkin_longitude: r.checkin_longitude ? Number(r.checkin_longitude) : null,
        checkout_latitude: r.checkout_latitude ? Number(r.checkout_latitude) : null,
        checkout_longitude: r.checkout_longitude ? Number(r.checkout_longitude) : null,
        registro_origem: r.registro_origem || null,
        observacoes: r.observacoes || null,
        justificativa_url: r.justificativa_url || null,
        justificativa_tipo: r.justificativa_tipo || null,
        justificativa_observacoes: r.justificativa_observacoes || null,
        created_at: r.created_at,
      }));

      return {
        data: dateStr,
        weekday,
        checkin_em: firstCheckin,
        checkout_em: lastCheckout,
        expected_entrada: expected.entrada,
        expected_saida: expected.saida,
        hours_worked_minutes,
        expected_hours_minutes: status === 'presente' ? expected_minutes : 0,
        late_minutes,
        early_departure_minutes,
        overtime_minutes,
        status,
        observacoes: dayRecords[0]?.observacoes || null,
        records,
      };
    });
  }, [yearMonth, attendance, getExpectedHours]);

  // Resumo mensal
  const summary: TimeCardSummary = useMemo(() => {
    const result: TimeCardSummary = {
      total_days_worked: 0,
      total_hours_worked_minutes: 0,
      total_expected_hours_minutes: 0,
      total_late_minutes: 0,
      total_early_departure_minutes: 0,
      total_overtime_minutes: 0,
      balance_minutes: 0,
      faltas: 0,
      faltas_justificadas: 0,
      folgas: 0,
      feriados: 0,
    };

    days.forEach(d => {
      if (d.status === 'presente') {
        result.total_days_worked++;
        result.total_hours_worked_minutes += d.hours_worked_minutes;
        result.total_expected_hours_minutes += d.expected_hours_minutes;
        result.total_late_minutes += d.late_minutes;
        result.total_early_departure_minutes += d.early_departure_minutes;
        result.total_overtime_minutes += d.overtime_minutes;
      } else if (d.status === 'falta') {
        result.faltas++;
      } else if (d.status === 'falta_justificada') {
        result.faltas_justificadas++;
      } else if (d.status === 'folga') {
        result.folgas++;
      } else if (d.status === 'feriado') {
        result.feriados++;
      }
    });

    result.balance_minutes = result.total_hours_worked_minutes - result.total_expected_hours_minutes;
    return result;
  }, [days]);

  // Busca log de auditoria para um registro específico
  const fetchAuditLog = useCallback(async (attendanceId: string): Promise<AttendanceAuditEntry[]> => {
    const { data, error } = await supabase
      .from('mt_attendance_audit_log')
      .select('id, changed_by_name, action, motivo, old_values, new_values, created_at')
      .eq('attendance_id', attendanceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar auditoria:', error);
      return [];
    }
    return (data || []) as AttendanceAuditEntry[];
  }, []);

  // Busca auditoria para todos os registros de um dia
  const fetchDayAuditLog = useCallback(async (date: string): Promise<AttendanceAuditEntry[]> => {
    const dayRecords = attendance.filter(a => a.data === date);
    if (dayRecords.length === 0) return [];

    const ids = dayRecords.map((r: any) => r.id);
    const { data, error } = await supabase
      .from('mt_attendance_audit_log')
      .select('id, changed_by_name, action, motivo, old_values, new_values, created_at')
      .in('attendance_id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar auditoria do dia:', error);
      return [];
    }
    return (data || []) as AttendanceAuditEntry[];
  }, [attendance]);

  // Salva log de auditoria
  const saveAuditLog = useCallback(async (
    attendanceId: string,
    action: string,
    motivo: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ) => {
    if (!tenant?.id || !user) return;

    await supabase.from('mt_attendance_audit_log').insert({
      tenant_id: tenant.id,
      attendance_id: attendanceId,
      changed_by: user.id,
      changed_by_name: user.email || 'Admin',
      action,
      motivo,
      old_values: oldValues || null,
      new_values: newValues || null,
    });
  }, [tenant?.id, user]);

  // Registrar entrada (hoje) — suporta múltiplas entradas/saídas por dia (igual Totem)
  const clockIn = useCallback(async (options?: ClockOptions) => {
    if (!userId || !tenant?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Verificar se existe entrada aberta (sem saída) — impede duplicar
    const openEntry = attendance.find(a => a.data === today && a.checkin_em && !a.checkout_em);
    if (openEntry) {
      toast.error('Você tem uma entrada aberta. Registre a saída primeiro.');
      return;
    }

    const geoData = {
      checkin_latitude: options?.latitude ?? null,
      checkin_longitude: options?.longitude ?? null,
      checkin_accuracy: options?.accuracy ?? null,
      checkin_selfie_url: options?.selfie_url ?? null,
      registro_origem: options?.registro_origem || 'admin',
    };

    // Sempre INSERT novo registro (novo período do dia)
    const { error } = await supabase
      .from('mt_professional_attendance')
      .insert({
        tenant_id: tenant.id,
        franchise_id: franchise?.id,
        user_id: userId,
        data: today,
        checkin_em: now,
        status: 'presente',
        ...geoData,
      });
    if (error) throw error;

    toast.success('Entrada registrada');
    await fetchAttendance();
  }, [userId, tenant?.id, franchise?.id, attendance, fetchAttendance]);

  // Registrar saída (hoje) — fecha último registro aberto
  const clockOut = useCallback(async (options?: ClockOptions) => {
    if (!userId || !tenant?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Buscar último registro aberto (com checkin mas sem checkout)
    const openEntry = attendance.find(a => a.data === today && a.checkin_em && !a.checkout_em);
    if (!openEntry) {
      toast.error('Nenhuma entrada aberta para registrar saída');
      return;
    }

    const geoData = {
      checkout_latitude: options?.latitude ?? null,
      checkout_longitude: options?.longitude ?? null,
      checkout_accuracy: options?.accuracy ?? null,
      checkout_selfie_url: options?.selfie_url ?? null,
    };

    const { error } = await supabase
      .from('mt_professional_attendance')
      .update({ checkout_em: now, updated_at: now, ...geoData })
      .eq('id', openEntry.id);
    if (error) throw error;

    toast.success('Saída registrada');
    await fetchAttendance();
  }, [userId, tenant?.id, attendance, fetchAttendance]);

  // Registro manual (admin) - COM AUDITORIA
  const manualEntry = useCallback(async (
    date: string,
    checkinTime: string,
    checkoutTime: string,
    motivo: string,
    observacoes?: string,
  ) => {
    if (!userId || !tenant?.id) return;
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo da alteração é obrigatório (mínimo 5 caracteres)');
    }

    const checkin_em = `${date}T${checkinTime}:00`;
    const checkout_em = `${date}T${checkoutTime}:00`;

    const existing = attendance.find(a => a.data === date);
    if (existing) {
      const oldValues = {
        checkin_em: existing.checkin_em,
        checkout_em: existing.checkout_em,
        status: existing.status,
      };

      const { error } = await supabase
        .from('mt_professional_attendance')
        .update({
          checkin_em,
          checkout_em,
          status: 'presente',
          observacoes: observacoes || existing.observacoes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;

      // Salvar auditoria
      await saveAuditLog(existing.id, 'manual_edit', motivo, oldValues, {
        checkin_em,
        checkout_em,
        status: 'presente',
      });
    } else {
      const { data: inserted, error } = await supabase
        .from('mt_professional_attendance')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          user_id: userId,
          data: date,
          checkin_em,
          checkout_em,
          status: 'presente',
          observacoes,
          registro_origem: 'admin',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Salvar auditoria
      if (inserted) {
        await saveAuditLog(inserted.id, 'manual_create', motivo, null, {
          checkin_em,
          checkout_em,
          status: 'presente',
        });
      }
    }

    toast.success('Registro atualizado');
    await fetchAttendance();
  }, [userId, tenant?.id, franchise?.id, attendance, fetchAttendance, saveAuditLog]);

  // Registro manual MULTI (admin) - edita/cria/deleta múltiplos registros do dia
  const manualEntryMulti = useCallback(async (
    date: string,
    entries: Array<{ id?: string; checkin: string; checkout: string }>,
    deletedIds: string[],
    motivo: string,
  ) => {
    if (!userId || !tenant?.id) return;
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo da alteração é obrigatório (mínimo 5 caracteres)');
    }

    // 1. Deletar registros removidos pelo usuário
    for (const delId of deletedIds) {
      const existing = attendance.find(a => a.id === delId);
      if (existing) {
        const { error } = await supabase
          .from('mt_professional_attendance')
          .delete()
          .eq('id', delId);
        if (error) throw error;
        await saveAuditLog(delId, 'manual_edit', `Removido: ${motivo}`, {
          checkin_em: existing.checkin_em,
          checkout_em: existing.checkout_em,
          status: existing.status,
        }, { status: 'removido' });
      }
    }

    // 2. Atualizar existentes e criar novos
    for (const entry of entries) {
      const checkin_em = entry.checkin ? `${date}T${entry.checkin}:00` : null;
      const checkout_em = entry.checkout ? `${date}T${entry.checkout}:00` : null;

      if (entry.id) {
        // UPDATE existente
        const existing = attendance.find(a => a.id === entry.id);
        if (existing) {
          const oldValues = {
            checkin_em: existing.checkin_em,
            checkout_em: existing.checkout_em,
            status: existing.status,
          };
          const { error } = await supabase
            .from('mt_professional_attendance')
            .update({
              checkin_em,
              checkout_em,
              status: 'presente',
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);
          if (error) throw error;
          await saveAuditLog(entry.id, 'manual_edit', motivo, oldValues, {
            checkin_em,
            checkout_em,
            status: 'presente',
          });
        }
      } else {
        // INSERT novo
        if (!checkin_em) continue; // Ignorar entradas vazias
        const { data: inserted, error } = await supabase
          .from('mt_professional_attendance')
          .insert({
            tenant_id: tenant.id,
            franchise_id: franchise?.id,
            user_id: userId,
            data: date,
            checkin_em,
            checkout_em,
            status: 'presente',
            registro_origem: 'admin',
          })
          .select('id')
          .single();
        if (error) throw error;
        if (inserted) {
          await saveAuditLog(inserted.id, 'manual_create', motivo, null, {
            checkin_em,
            checkout_em,
            status: 'presente',
          });
        }
      }
    }

    toast.success('Registros atualizados');
    await fetchAttendance();
  }, [userId, tenant?.id, franchise?.id, attendance, fetchAttendance, saveAuditLog]);

  // Justificar falta (admin) - COM UPLOAD DE DOCUMENTO
  const justifyAbsence = useCallback(async (
    date: string,
    justificativaTipo: JustificativaTipo,
    observacoes: string,
    file?: File,
  ) => {
    if (!userId || !tenant?.id) return;
    if (!observacoes || observacoes.trim().length < 5) {
      throw new Error('Observação é obrigatória (mínimo 5 caracteres)');
    }

    let justificativa_url: string | null = null;

    // Upload do arquivo se fornecido
    if (file) {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `justificativas/${tenant.id}/${userId}/${date}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('attendance-selfies')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw new Error(`Erro ao fazer upload: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('attendance-selfies')
        .getPublicUrl(fileName);

      justificativa_url = urlData.publicUrl;
    }

    const existing = attendance.find(a => a.data === date);
    const updateData = {
      status: 'falta_justificada',
      justificativa_tipo: justificativaTipo,
      justificativa_observacoes: observacoes,
      justificativa_url,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const oldValues = {
        status: existing.status,
        justificativa_tipo: existing.justificativa_tipo,
        justificativa_observacoes: existing.justificativa_observacoes,
        justificativa_url: existing.justificativa_url,
      };

      const { error } = await supabase
        .from('mt_professional_attendance')
        .update(updateData)
        .eq('id', existing.id);
      if (error) throw error;

      await saveAuditLog(existing.id, 'justificativa', observacoes, oldValues, updateData);
    } else {
      // Criar registro com status falta_justificada
      const { data: inserted, error } = await supabase
        .from('mt_professional_attendance')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id,
          user_id: userId,
          data: date,
          ...updateData,
          registro_origem: 'admin',
        })
        .select('id')
        .single();
      if (error) throw error;

      if (inserted) {
        await saveAuditLog(inserted.id, 'justificativa', observacoes, null, updateData);
      }
    }

    toast.success('Falta justificada com sucesso');
    await fetchAttendance();
  }, [userId, tenant?.id, franchise?.id, attendance, fetchAttendance, saveAuditLog]);

  // Remover justificativa (voltar para falta)
  const removeJustification = useCallback(async (date: string, motivo: string) => {
    if (!userId || !tenant?.id) return;
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo é obrigatório (mínimo 5 caracteres)');
    }

    const existing = attendance.find(a => a.data === date);
    if (!existing) throw new Error('Registro não encontrado');

    const oldValues = {
      status: existing.status,
      justificativa_tipo: existing.justificativa_tipo,
      justificativa_observacoes: existing.justificativa_observacoes,
      justificativa_url: existing.justificativa_url,
    };

    const { error } = await supabase
      .from('mt_professional_attendance')
      .update({
        status: 'falta',
        justificativa_tipo: null,
        justificativa_observacoes: null,
        justificativa_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;

    await saveAuditLog(existing.id, 'remover_justificativa', motivo, oldValues, { status: 'falta' });
    toast.success('Justificativa removida');
    await fetchAttendance();
  }, [userId, tenant?.id, attendance, fetchAttendance, saveAuditLog]);

  return {
    days,
    summary,
    isLoading,
    attendance,
    clockIn,
    clockOut,
    manualEntry,
    manualEntryMulti,
    justifyAbsence,
    removeJustification,
    fetchAuditLog,
    fetchDayAuditLog,
    refetch: fetchAttendance,
  };
}

// Helper exportado para formatar minutos
export { minutesToTime, timeToMinutes };
