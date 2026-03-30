import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export interface SelfSchedulingConfig {
  id: string;
  tenant_id: string;
  franchise_id: string;
  is_active: boolean;
  duracao_padrao: number;       // minutes
  horario_inicio: string;       // "08:00"
  horario_fim: string;          // "20:00"
  intervalo_minutos: number;    // slot interval (e.g. 30)
  dias_antecedencia_min: number;
  dias_antecedencia_max: number;
  dias_semana: number[];        // [1,2,3,4,5] = Mon-Fri
  mensagem_confirmacao: string;
  servicos_disponiveis?: string[]; // service IDs
  created_at: string;
  updated_at: string;
}

export interface PublicTimeSlot {
  hora: string;
  disponivel: boolean;
}

export interface PublicAppointmentData {
  franchise_id: string;
  tenant_id: string;
  lead_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_email?: string;
  servico_id?: string;
  servico_nome?: string;
  data_agendamento: string;
  hora_inicio: string;
  duracao_minutos: number;
}

// =============================================================================
// HOOK: useSelfSchedulingConfigMT
// Admin CRUD for self-scheduling config per franchise
// =============================================================================

export function useSelfSchedulingConfigMT(franchiseId?: string) {
  const { tenant, franchise, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const effectiveFranchiseId = franchiseId || franchise?.id;

  const query = useQuery({
    queryKey: ['mt-self-scheduling-config', effectiveFranchiseId],
    queryFn: async () => {
      if (!effectiveFranchiseId) return null;

      const { data, error } = await (supabase
        .from('mt_self_scheduling_config') as any)
        .select('*')
        .eq('franchise_id', effectiveFranchiseId)
        .maybeSingle();

      if (error) throw error;
      return data as SelfSchedulingConfig | null;
    },
    enabled: !isTenantLoading && !!effectiveFranchiseId,
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<SelfSchedulingConfig>) => {
      if (!tenant?.id) throw new Error('Tenant nao carregado');
      if (!effectiveFranchiseId) throw new Error('Franquia nao selecionada');

      const payload = {
        tenant_id: tenant.id,
        franchise_id: effectiveFranchiseId,
        is_active: config.is_active ?? true,
        duracao_padrao: config.duracao_padrao ?? 60,
        horario_inicio: config.horario_inicio ?? '08:00',
        horario_fim: config.horario_fim ?? '20:00',
        intervalo_minutos: config.intervalo_minutos ?? 30,
        dias_antecedencia_min: config.dias_antecedencia_min ?? 1,
        dias_antecedencia_max: config.dias_antecedencia_max ?? 30,
        dias_semana: config.dias_semana ?? [1, 2, 3, 4, 5, 6],
        mensagem_confirmacao: config.mensagem_confirmacao ?? 'Agendamento confirmado! Entraremos em contato para confirmar.',
        servicos_disponiveis: config.servicos_disponiveis || null,
        updated_at: new Date().toISOString(),
      };

      if (query.data?.id) {
        // Update existing
        const { data, error } = await (supabase
          .from('mt_self_scheduling_config') as any)
          .update(payload)
          .eq('id', query.data.id)
          .select()
          .single();

        if (error) throw error;
        return data as SelfSchedulingConfig;
      } else {
        // Insert new
        const { data, error } = await (supabase
          .from('mt_self_scheduling_config') as any)
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data as SelfSchedulingConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-self-scheduling-config'] });
      toast.success('Configuracao salva com sucesso');
    },
    onError: (error: any) => toast.error(`Erro ao salvar configuracao: ${error.message}`),
  });

  return {
    config: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    upsertConfig,
    refetch: query.refetch,
  };
}

// =============================================================================
// HOOK: useAvailableSlots
// Public: fetches available time slots for a date (no auth required)
// =============================================================================

export function useAvailableSlots(
  franchiseId: string | undefined,
  date: string | undefined,
  servicoId?: string
) {
  const [slots, setSlots] = useState<PublicTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<SelfSchedulingConfig | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!franchiseId || !date) {
      setSlots([]);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Fetch self-scheduling config for this franchise
      const { data: configData, error: configError } = await (supabase
        .from('mt_self_scheduling_config') as any)
        .select('*')
        .eq('franchise_id', franchiseId)
        .eq('is_active', true)
        .maybeSingle();

      if (configError) throw configError;
      if (!configData) {
        setSlots([]);
        setIsLoading(false);
        return;
      }

      setConfig(configData);

      const cfg = configData as SelfSchedulingConfig;

      // 2. Check if the selected day is allowed
      const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun, 1=Mon...
      if (cfg.dias_semana && !cfg.dias_semana.includes(dayOfWeek)) {
        setSlots([]);
        setIsLoading(false);
        return;
      }

      // 3. Generate time slots based on config
      const [startH, startM] = cfg.horario_inicio.split(':').map(Number);
      const [endH, endM] = cfg.horario_fim.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const interval = cfg.intervalo_minutos || 30;

      const allSlots: PublicTimeSlot[] = [];
      for (let m = startMinutes; m < endMinutes; m += interval) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        allSlots.push({
          hora: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          disponivel: true,
        });
      }

      // 4. Fetch existing appointments for this day to find conflicts
      const { data: existing } = await supabase
        .from('mt_appointments')
        .select('hora_inicio, hora_fim, duracao_minutos')
        .eq('franchise_id', franchiseId)
        .eq('data_agendamento', date)
        .is('deleted_at', null)
        .not('status', 'in', '("cancelado","remarcado")');

      // 5. Mark occupied slots
      const duration = cfg.duracao_padrao || 60;
      existing?.forEach(apt => {
        const [aH, aM] = apt.hora_inicio.split(':').map(Number);
        const aptStart = aH * 60 + aM;
        const aptDuration = apt.duracao_minutos || duration;
        const aptEnd = aptStart + aptDuration;

        allSlots.forEach(slot => {
          const [sH, sM] = slot.hora.split(':').map(Number);
          const slotStart = sH * 60 + sM;
          const slotEnd = slotStart + duration;

          // Overlap check: slotStart < aptEnd AND slotEnd > aptStart
          if (slotStart < aptEnd && slotEnd > aptStart) {
            slot.disponivel = false;
          }
        });
      });

      // 6. Filter out past times if date is today
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (date === todayStr) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        allSlots.forEach(slot => {
          const [sH, sM] = slot.hora.split(':').map(Number);
          if (sH * 60 + sM <= currentMinutes) {
            slot.disponivel = false;
          }
        });
      }

      setSlots(allSlots);
    } catch (err) {
      console.error('Erro ao verificar disponibilidade:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [franchiseId, date, servicoId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, config, isLoading, refetch: fetchSlots };
}

// =============================================================================
// HOOK: useCreatePublicAppointment
// Public: creates appointment without authentication
// =============================================================================

export function useCreatePublicAppointment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const createAppointment = useCallback(async (data: PublicAppointmentData) => {
    setIsSubmitting(true);
    setError(null);
    setCreatedId(null);

    try {
      // Calculate hora_fim
      const [h, m] = data.hora_inicio.split(':').map(Number);
      const endMinutes = h * 60 + m + (data.duracao_minutos || 60);
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
      const endM = String(endMinutes % 60).padStart(2, '0');
      const hora_fim = `${endH}:${endM}`;

      const { data: created, error: createError } = await supabase
        .from('mt_appointments')
        .insert({
          tenant_id: data.tenant_id,
          franchise_id: data.franchise_id,
          lead_id: data.lead_id || null,
          tipo: 'avaliacao',
          cliente_nome: data.cliente_nome,
          cliente_telefone: data.cliente_telefone || null,
          cliente_email: data.cliente_email || null,
          servico_id: data.servico_id || null,
          servico_nome: data.servico_nome || null,
          data_agendamento: data.data_agendamento,
          hora_inicio: data.hora_inicio,
          hora_fim,
          duracao_minutos: data.duracao_minutos || 60,
          status: 'pendente',
          confirmado: false,
          is_recorrente: false,
          origem: 'auto_agendamento',
        })
        .select()
        .single();

      if (createError) throw createError;

      setCreatedId((created as any).id);
      return created;
    } catch (err: any) {
      console.error('Erro ao criar agendamento publico:', err);
      setError(err.message || 'Erro ao criar agendamento');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    createAppointment,
    isSubmitting,
    error,
    createdId,
  };
}

export default useSelfSchedulingConfigMT;
