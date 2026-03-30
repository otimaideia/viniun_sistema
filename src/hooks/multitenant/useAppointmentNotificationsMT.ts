import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export type NotificationType =
  | 'confirmacao'
  | 'lembrete_24h'
  | 'lembrete_2h'
  | 'lembrete_dia'
  | 'notificacao_franquia'
  | 'checkin_profissional'
  | 'checkin_consultora'
  | 'pos_google_review'
  | 'pos_nps';

export type NotificationChannel = 'whatsapp' | 'email' | 'sms';

export interface NotificationTypeInfo {
  type: NotificationType;
  label: string;
  description: string;
  channel: NotificationChannel;
  offset_minutes: number;
  icon: string;
}

export interface AppointmentNotificationConfig {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  notification_type: NotificationType;
  is_active: boolean;
  channel: NotificationChannel;
  template_id?: string | null;
  offset_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentNotification {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  appointment_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  scheduled_at: string;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

// =============================================================================
// HELPER: Verificar se notificação está ativa (usado por outros módulos)
// =============================================================================

export async function isNotificationEnabled(
  supabaseClient: any,
  tenantId: string,
  notificationType: string,
  franchiseId?: string | null
): Promise<boolean> {
  try {
    let q = supabaseClient
      .from('mt_appointment_notification_configs')
      .select('is_active')
      .eq('tenant_id', tenantId)
      .eq('notification_type', notificationType);

    if (franchiseId) {
      q = q.eq('franchise_id', franchiseId);
    }

    const { data } = await q.maybeSingle();
    // Se não tem config, default = desativado
    return data?.is_active ?? false;
  } catch {
    return false;
  }
}

// =============================================================================
// CONSTANTES
// =============================================================================

export const NOTIFICATION_TYPES: NotificationTypeInfo[] = [
  {
    type: 'confirmacao',
    label: 'Confirmação de Agendamento',
    description: 'Enviar pedido de confirmação quando agendamento é criado',
    channel: 'whatsapp',
    offset_minutes: 0,
    icon: 'CheckCircle',
  },
  {
    type: 'lembrete_24h',
    label: 'Lembrete 24h Antes',
    description: 'Enviar lembrete 24 horas antes do agendamento',
    channel: 'whatsapp',
    offset_minutes: -1440,
    icon: 'Clock',
  },
  {
    type: 'lembrete_2h',
    label: 'Lembrete 2h Antes',
    description: 'Enviar lembrete 2 horas antes do agendamento',
    channel: 'whatsapp',
    offset_minutes: -120,
    icon: 'Bell',
  },
  {
    type: 'lembrete_dia',
    label: 'Lembrete no dia (manhã)',
    description: 'Enviar lembrete às 7h da manhã no dia do agendamento',
    channel: 'whatsapp',
    offset_minutes: 0,
    icon: 'Sunrise',
  },
  {
    type: 'notificacao_franquia',
    label: 'Notificar franquia (novo agendamento)',
    description: 'Enviar WhatsApp para a franquia quando um cliente agenda pelo portal',
    channel: 'whatsapp',
    offset_minutes: 0,
    icon: 'Building2',
  },
  {
    type: 'checkin_profissional',
    label: 'Notificar Profissional no Check-in',
    description: 'Avisar a profissional quando o cliente faz check-in no totem',
    channel: 'whatsapp',
    offset_minutes: 0,
    icon: 'UserCheck',
  },
  {
    type: 'checkin_consultora',
    label: 'Notificar Consultora no Check-in',
    description: 'Avisar a consultora quando o cliente faz check-in no totem',
    channel: 'whatsapp',
    offset_minutes: 0,
    icon: 'Users',
  },
  {
    type: 'pos_google_review',
    label: 'Link Google Review (pós-atendimento)',
    description: 'Enviar link do Google Meu Negócio 2 min após checkout',
    channel: 'whatsapp',
    offset_minutes: 2,
    icon: 'Star',
  },
  {
    type: 'pos_nps',
    label: 'Pesquisa NPS (pós-atendimento)',
    description: 'Enviar pesquisa de satisfação interna 1h após checkout',
    channel: 'whatsapp',
    offset_minutes: 60,
    icon: 'BarChart3',
  },
];

// =============================================================================
// HOOK: useAppointmentNotificationConfigs
// =============================================================================

export function useAppointmentNotificationConfigs() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: buscar configs existentes
  const query = useQuery({
    queryKey: ['mt-appointment-notification-configs', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_appointment_notification_configs' as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppointmentNotificationConfig[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Merge configs from DB with defaults (show all types, use DB state where available)
  const mergedConfigs = NOTIFICATION_TYPES.map((typeInfo) => {
    const dbConfig = query.data?.find(
      (c) => c.notification_type === typeInfo.type
    );
    return {
      ...typeInfo,
      id: dbConfig?.id || null,
      is_active: dbConfig?.is_active ?? false,
      channel: dbConfig?.channel || typeInfo.channel,
      offset_minutes: dbConfig?.offset_minutes ?? typeInfo.offset_minutes,
      template_id: dbConfig?.template_id || null,
    };
  });

  // Mutation: toggle (upsert) config
  const toggleConfig = useMutation({
    mutationFn: async ({
      notificationType,
      isActive,
    }: {
      notificationType: NotificationType;
      isActive: boolean;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const typeInfo = NOTIFICATION_TYPES.find((t) => t.type === notificationType);
      if (!typeInfo) throw new Error('Tipo de notificação inválido');

      // Check if config already exists
      const existing = query.data?.find(
        (c) => c.notification_type === notificationType
      );

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('mt_appointment_notification_configs' as any)
          .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('mt_appointment_notification_configs' as any)
          .insert({
            tenant_id: tenant?.id,
            franchise_id: franchise?.id || null,
            notification_type: notificationType,
            is_active: isActive,
            channel: typeInfo.channel,
            offset_minutes: typeInfo.offset_minutes,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mt-appointment-notification-configs'],
      });
      const typeInfo = NOTIFICATION_TYPES.find(
        (t) => t.type === variables.notificationType
      );
      toast.success(
        variables.isActive
          ? `${typeInfo?.label} ativada`
          : `${typeInfo?.label} desativada`
      );
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar configuração: ${error.message}`);
    },
  });

  // Mutation: update channel
  const updateChannel = useMutation({
    mutationFn: async ({
      notificationType,
      channel,
    }: {
      notificationType: NotificationType;
      channel: NotificationChannel;
    }) => {
      const existing = query.data?.find(
        (c) => c.notification_type === notificationType
      );

      if (!existing) {
        throw new Error('Configure a notificação antes de alterar o canal');
      }

      const { data, error } = await supabase
        .from('mt_appointment_notification_configs' as any)
        .update({
          channel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['mt-appointment-notification-configs'],
      });
      toast.success('Canal atualizado');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const activeCount = mergedConfigs.filter((c) => c.is_active).length;
  const totalCount = NOTIFICATION_TYPES.length;

  return {
    configs: mergedConfigs,
    activeCount,
    totalCount,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    toggleConfig,
    updateChannel,
  };
}

// =============================================================================
// HOOK: useAppointmentNotifications
// =============================================================================

export function useAppointmentNotifications(appointmentId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-appointment-notifications', tenant?.id, appointmentId],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_appointment_notifications' as any)
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (appointmentId) {
        q = q.eq('appointment_id', appointmentId);
      }

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppointmentNotification[];
    },
    enabled:
      !isTenantLoading &&
      (!!tenant || accessLevel === 'platform') &&
      !!appointmentId,
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
