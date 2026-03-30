import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export type RoomType = 'laser' | 'injetaveis' | 'estetica' | 'avaliacao' | 'multiuso';

export interface Room {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  nome: string;
  tipo: RoomType;
  capacidade: number;
  area_m2?: number;
  custo_mensal?: number;
  equipamentos: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  franchise?: {
    id: string;
    codigo: string;
    nome: string;
  };
}

export interface RoomSchedule {
  id: string;
  room_id: string;
  dia_semana: number; // 0=dom, 1=seg, ..., 6=sab
  hora_inicio: string;
  hora_fim: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomAssignment {
  id: string;
  room_id: string;
  profissional_id: string;
  profissional_nome: string;
  dia_semana?: number;
  hora_inicio?: string;
  hora_fim?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OccupancyMetrics {
  room_id: string;
  room_nome: string;
  room_tipo: RoomType;
  horas_disponiveis: number;
  horas_ocupadas: number;
  taxa_ocupacao: number; // 0-100
  total_agendamentos: number;
  no_shows: number;
  taxa_no_show: number; // 0-100
  horarios_vagos: { dia_semana: number; hora: string }[];
  heatmap: { dia_semana: number; hora: number; ocupacao: number }[];
}

interface RoomFilters {
  tipo?: RoomType;
  is_active?: boolean;
  franchise_id?: string;
}

// =============================================================================
// HOOK: useRoomsMT
// CRUD de salas com dados de schedule e assignment
// =============================================================================

export function useRoomsMT(filters?: RoomFilters) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_rooms' as any)
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome)
        `)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (tenant?.id) query = query.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') query = query.eq('franchise_id', franchise.id);
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
      if (filters?.franchise_id) query = query.eq('franchise_id', filters.franchise_id);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setRooms((data || []) as Room[]);
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar salas'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.tipo, filters?.is_active, filters?.franchise_id]);

  const createRoom = useCallback(async (data: Partial<Room>): Promise<Room> => {
    const { data: created, error: createError } = await supabase
      .from('mt_rooms' as any)
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        nome: data.nome,
        tipo: data.tipo || 'multiuso',
        capacidade: data.capacidade || 1,
        area_m2: data.area_m2 || null,
        custo_mensal: data.custo_mensal || null,
        equipamentos: data.equipamentos || [],
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (createError) throw createError;
    toast.success('Sala criada com sucesso');
    await fetchRooms();
    return created as Room;
  }, [fetchRooms, tenant?.id, franchise?.id]);

  const updateRoom = useCallback(async (id: string, data: Partial<Room>): Promise<Room> => {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = ['nome', 'tipo', 'capacidade', 'area_m2', 'custo_mensal', 'equipamentos', 'is_active', 'franchise_id'] as const;
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const { data: updated, error: updateError } = await supabase
      .from('mt_rooms' as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    toast.success('Sala atualizada com sucesso');
    await fetchRooms();
    return updated as Room;
  }, [fetchRooms]);

  const deleteRoom = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('mt_rooms' as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;
    toast.success('Sala removida com sucesso');
    await fetchRooms();
  }, [fetchRooms]);

  const toggleActive = useCallback(async (id: string, is_active: boolean): Promise<void> => {
    const { error: updateError } = await supabase
      .from('mt_rooms' as any)
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;
    toast.success(is_active ? 'Sala ativada' : 'Sala desativada');
    await fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (tenant?.id) {
      fetchRooms();
    } else {
      setIsLoading(false);
      setRooms([]);
    }
  }, [fetchRooms, tenant?.id]);

  return {
    rooms,
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
    toggleActive,
    refetch: fetchRooms,
  };
}

// =============================================================================
// HOOK: useRoomMT (singular)
// =============================================================================

export function useRoomMT(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!roomId) {
      setRoom(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('mt_rooms' as any)
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('id', roomId)
        .is('deleted_at', null)
        .single();

      if (fetchError) throw fetchError;
      setRoom(data as Room);
    } catch (err) {
      console.error('Erro ao carregar sala:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar sala'));
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  return { room, isLoading, error, refetch: fetchRoom };
}

// =============================================================================
// HOOK: useRoomSchedulesMT
// CRUD de horarios de funcionamento da sala
// =============================================================================

export function useRoomSchedulesMT(roomId: string | undefined) {
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!roomId) { setSchedules([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_room_schedules' as any)
        .select('*')
        .eq('room_id', roomId)
        .order('dia_semana', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as RoomSchedule[]);
    } catch (err) {
      console.error('Erro ao carregar horários:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const upsertSchedule = useCallback(async (schedule: Partial<RoomSchedule>): Promise<RoomSchedule> => {
    if (schedule.id) {
      const { data, error } = await supabase
        .from('mt_room_schedules' as any)
        .update({
          dia_semana: schedule.dia_semana,
          hora_inicio: schedule.hora_inicio,
          hora_fim: schedule.hora_fim,
          is_active: schedule.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)
        .select()
        .single();
      if (error) throw error;
      await fetchSchedules();
      return data as RoomSchedule;
    } else {
      const { data, error } = await supabase
        .from('mt_room_schedules' as any)
        .insert({
          room_id: roomId,
          dia_semana: schedule.dia_semana,
          hora_inicio: schedule.hora_inicio,
          hora_fim: schedule.hora_fim,
          is_active: schedule.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      await fetchSchedules();
      return data as RoomSchedule;
    }
  }, [roomId, fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_room_schedules' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchSchedules();
  }, [fetchSchedules]);

  const saveAllSchedules = useCallback(async (scheduleList: Partial<RoomSchedule>[]) => {
    // Delete existing
    if (roomId) {
      await supabase.from('mt_room_schedules' as any).delete().eq('room_id', roomId);
    }
    // Insert new
    const toInsert = scheduleList
      .filter(s => s.is_active)
      .map(s => ({
        room_id: roomId,
        dia_semana: s.dia_semana,
        hora_inicio: s.hora_inicio,
        hora_fim: s.hora_fim,
        is_active: true,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('mt_room_schedules' as any).insert(toInsert);
      if (error) throw error;
    }
    await fetchSchedules();
    toast.success('Horários salvos com sucesso');
  }, [roomId, fetchSchedules]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  return { schedules, isLoading, upsertSchedule, deleteSchedule, saveAllSchedules, refetch: fetchSchedules };
}

// =============================================================================
// HOOK: useRoomAssignmentsMT
// CRUD de profissionais alocados a salas
// =============================================================================

export function useRoomAssignmentsMT(roomId?: string) {
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant } = useTenantContext();

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_room_assignments' as any)
        .select('*')
        .order('profissional_nome', { ascending: true });

      if (roomId) query = query.eq('room_id', roomId);

      const { data, error } = await query;
      if (error) throw error;
      setAssignments((data || []) as RoomAssignment[]);
    } catch (err) {
      console.error('Erro ao carregar alocações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const createAssignment = useCallback(async (data: Partial<RoomAssignment>): Promise<RoomAssignment> => {
    const { data: created, error } = await supabase
      .from('mt_room_assignments' as any)
      .insert({
        room_id: data.room_id || roomId,
        profissional_id: data.profissional_id,
        profissional_nome: data.profissional_nome,
        dia_semana: data.dia_semana ?? null,
        hora_inicio: data.hora_inicio ?? null,
        hora_fim: data.hora_fim ?? null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    toast.success('Profissional alocado com sucesso');
    await fetchAssignments();
    return created as RoomAssignment;
  }, [roomId, fetchAssignments]);

  const deleteAssignment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('mt_room_assignments' as any)
      .delete()
      .eq('id', id);
    if (error) throw error;
    toast.success('Alocação removida');
    await fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  return { assignments, isLoading, createAssignment, deleteAssignment, refetch: fetchAssignments };
}

// =============================================================================
// HOOK: useOccupancyMT
// Calcula metricas de ocupacao das salas
// =============================================================================

export function useOccupancyMT(franchiseId?: string, dateRange?: { from: string; to: string }) {
  const [metrics, setMetrics] = useState<OccupancyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchOccupancy = useCallback(async () => {
    setIsLoading(true);
    try {
      const effectiveFranchiseId = franchiseId || (accessLevel === 'franchise' ? franchise?.id : undefined);

      // 1. Buscar salas ativas
      let roomQuery = supabase
        .from('mt_rooms' as any)
        .select('id, nome, tipo')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (tenant?.id) roomQuery = roomQuery.eq('tenant_id', tenant.id);
      if (effectiveFranchiseId) roomQuery = roomQuery.eq('franchise_id', effectiveFranchiseId);

      const { data: roomsData } = await roomQuery;
      const roomsList = (roomsData || []) as Room[];

      if (roomsList.length === 0) {
        setMetrics([]);
        setIsLoading(false);
        return;
      }

      // 2. Buscar schedules de todas as salas
      const roomIds = roomsList.map(r => r.id);
      const { data: schedulesData } = await supabase
        .from('mt_room_schedules' as any)
        .select('*')
        .in('room_id', roomIds)
        .eq('is_active', true);
      const schedules = (schedulesData || []) as RoomSchedule[];

      // 3. Buscar agendamentos no periodo
      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = dateRange?.to || new Date().toISOString().split('T')[0];

      const { data: appointmentsData } = await supabase
        .from('mt_room_appointments' as any)
        .select('room_id, appointment_id')
        .in('room_id', roomIds);

      const roomAppointmentIds = (appointmentsData || []) as { room_id: string; appointment_id: string }[];

      let appointments: any[] = [];
      if (roomAppointmentIds.length > 0) {
        const aptIds = roomAppointmentIds.map(ra => ra.appointment_id);
        const { data: aptsData } = await supabase
          .from('mt_appointments')
          .select('id, data_agendamento, hora_inicio, duracao_minutos, status')
          .in('id', aptIds)
          .gte('data_agendamento', fromDate)
          .lte('data_agendamento', toDate)
          .is('deleted_at', null);

        appointments = (aptsData || []) as any[];
      }

      // TAMBÉM buscar appointments que têm room_id diretamente (sem mt_room_appointments)
      const { data: directApts } = await supabase
        .from('mt_appointments')
        .select('id, room_id, data_agendamento, hora_inicio, duracao_minutos, status')
        .in('room_id', roomIds)
        .gte('data_agendamento', fromDate)
        .lte('data_agendamento', toDate)
        .is('deleted_at', null);

      // Merge: adicionar appointments diretos ao roomAppointmentIds (evitar duplicatas)
      const existingAptIds = new Set(roomAppointmentIds.map(ra => ra.appointment_id));
      for (const apt of (directApts || []) as any[]) {
        if (apt.room_id && !existingAptIds.has(apt.id)) {
          roomAppointmentIds.push({ room_id: apt.room_id, appointment_id: apt.id });
          appointments.push(apt);
          existingAptIds.add(apt.id);
        }
      }

      // Build appointment map by room
      const aptByRoom: Record<string, any[]> = {};
      for (const ra of roomAppointmentIds) {
        const apt = appointments.find(a => a.id === ra.appointment_id);
        if (apt) {
          if (!aptByRoom[ra.room_id]) aptByRoom[ra.room_id] = [];
          aptByRoom[ra.room_id].push(apt);
        }
      }

      // 4. Calculate metrics per room
      const fromMs = new Date(fromDate).getTime();
      const toMs = new Date(toDate).getTime();
      const totalDays = Math.max(1, Math.ceil((toMs - fromMs) / (24 * 60 * 60 * 1000)) + 1);

      const result: OccupancyMetrics[] = roomsList.map(room => {
        const roomSchedules = schedules.filter(s => s.room_id === room.id);
        const roomApts = aptByRoom[room.id] || [];

        // Calculate available hours in the period
        let horasDisponiveis = 0;
        for (const sched of roomSchedules) {
          const [sh, sm] = sched.hora_inicio.split(':').map(Number);
          const [eh, em] = sched.hora_fim.split(':').map(Number);
          const schedHours = (eh * 60 + em - sh * 60 - sm) / 60;
          // Count how many times this day_of_week appears in period
          let count = 0;
          for (let d = 0; d < totalDays; d++) {
            const date = new Date(fromMs + d * 24 * 60 * 60 * 1000);
            if (date.getDay() === sched.dia_semana) count++;
          }
          horasDisponiveis += schedHours * count;
        }

        // Calculate occupied hours
        let horasOcupadas = 0;
        let noShows = 0;
        for (const apt of roomApts) {
          const duration = (apt.duracao_minutos || 60) / 60;
          if (!['cancelado', 'remarcado'].includes(apt.status)) {
            horasOcupadas += duration;
          }
          if (apt.status === 'nao_compareceu') {
            noShows++;
          }
        }

        const taxaOcupacao = horasDisponiveis > 0 ? Math.min(100, (horasOcupadas / horasDisponiveis) * 100) : 0;
        const taxaNoShow = roomApts.length > 0 ? (noShows / roomApts.length) * 100 : 0;

        // Heatmap data
        const heatmap: { dia_semana: number; hora: number; ocupacao: number }[] = [];
        for (let dia = 0; dia <= 6; dia++) {
          for (let hora = 8; hora < 20; hora++) {
            const aptsInSlot = roomApts.filter(a => {
              const aptDay = new Date(a.data_agendamento).getDay();
              const aptHour = parseInt(a.hora_inicio?.split(':')[0] || '0');
              return aptDay === dia && aptHour === hora;
            });
            heatmap.push({ dia_semana: dia, hora, ocupacao: aptsInSlot.length });
          }
        }

        // Available slots (today or next week)
        const horariosVagos: { dia_semana: number; hora: string }[] = [];
        for (const sched of roomSchedules) {
          const [sh] = sched.hora_inicio.split(':').map(Number);
          const [eh] = sched.hora_fim.split(':').map(Number);
          for (let h = sh; h < eh; h++) {
            const slot = `${String(h).padStart(2, '0')}:00`;
            const occupied = roomApts.some(a => {
              const aptDay = new Date(a.data_agendamento).getDay();
              const aptHour = parseInt(a.hora_inicio?.split(':')[0] || '0');
              return aptDay === sched.dia_semana && aptHour === h;
            });
            if (!occupied) {
              horariosVagos.push({ dia_semana: sched.dia_semana, hora: slot });
            }
          }
        }

        return {
          room_id: room.id,
          room_nome: room.nome,
          room_tipo: room.tipo as RoomType,
          horas_disponiveis: Math.round(horasDisponiveis * 10) / 10,
          horas_ocupadas: Math.round(horasOcupadas * 10) / 10,
          taxa_ocupacao: Math.round(taxaOcupacao * 10) / 10,
          total_agendamentos: roomApts.length,
          no_shows: noShows,
          taxa_no_show: Math.round(taxaNoShow * 10) / 10,
          horarios_vagos: horariosVagos,
          heatmap,
        };
      });

      setMetrics(result);
    } catch (err) {
      console.error('Erro ao calcular ocupação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, franchiseId, dateRange?.from, dateRange?.to]);

  useEffect(() => {
    if (tenant?.id) {
      fetchOccupancy();
    } else {
      setIsLoading(false);
    }
  }, [fetchOccupancy, tenant?.id]);

  return { metrics, isLoading, refetch: fetchOccupancy };
}

export default useRoomsMT;
