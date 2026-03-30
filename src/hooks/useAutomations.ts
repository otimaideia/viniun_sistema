import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantContext } from '@/contexts/TenantContext';

export type AutomationType = 'welcome' | 'away' | 'business_hours';

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  welcome: 'Boas-vindas',
  away: 'Ausente',
  business_hours: 'Fora do Horário',
};

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  welcome: 'Enviada quando um contato inicia uma nova conversa',
  away: 'Enviada quando você está ausente ou ocupado',
  business_hours: 'Enviada fora do horário comercial',
};

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export interface WhatsAppAutomation {
  id: string;
  session_id: string;
  type: AutomationType;
  name: string;
  message: string;
  is_active: boolean;
  delay_seconds: number;
  only_first_message: boolean;
  schedule_enabled: boolean;
  schedule_days: number[] | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationInput {
  session_id: string;
  type: AutomationType;
  name: string;
  message: string;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_days?: number[];
  schedule_start_time?: string;
  schedule_end_time?: string;
}

export interface UpdateAutomationInput {
  id: string;
  name?: string;
  message?: string;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_days?: number[];
  schedule_start_time?: string;
  schedule_end_time?: string;
}

interface UseAutomationsProps {
  sessionId?: string;
  franqueadoId?: string;
}

/**
 * @deprecated Use useAutomationsMT from '@/hooks/multitenant/useAutomationsMT' instead.
 * This hook is kept for backward compatibility only.
 */
export function useAutomations({ sessionId, franqueadoId }: UseAutomationsProps = {}) {
  const queryClient = useQueryClient();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Buscar automações
  const {
    data: automations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp_automations', sessionId, franqueadoId, tenant?.id, franchise?.id],
    queryFn: async (): Promise<WhatsAppAutomation[]> => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let query = supabase
        .from('mt_whatsapp_automations')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrar por tenant/franchise baseado no nível de acesso
      if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      if (franqueadoId) {
        // Join com sessões para filtrar por franqueado
        query = supabase
          .from('mt_whatsapp_automations')
          .select(`
            *,
            mt_whatsapp_sessions!inner(franqueado_id)
          `)
          .eq('mt_whatsapp_sessions.franqueado_id', franqueadoId)
          .order('created_at', { ascending: false });
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Erro ao buscar automações:', queryError);
        return [];
      }

      return (data || []) as WhatsAppAutomation[];
    },
    staleTime: 60000,
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Criar automação
  const createAutomation = useMutation({
    mutationFn: async (input: CreateAutomationInput) => {
      if (!tenant?.id && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_automations')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || null,
          session_id: input.session_id,
          type: input.type,
          name: input.name,
          message: input.message,
          delay_seconds: input.delay_seconds ?? 2,
          only_first_message: input.only_first_message ?? true,
          schedule_enabled: input.schedule_enabled ?? false,
          schedule_days: input.schedule_days ?? null,
          schedule_start_time: input.schedule_start_time ?? null,
          schedule_end_time: input.schedule_end_time ?? null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_automations'] });
      toast.success('Automação criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar automação: ${error.message}`);
    },
  });

  // Atualizar automação
  const updateAutomation = useMutation({
    mutationFn: async (input: UpdateAutomationInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('mt_whatsapp_automations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_automations'] });
      toast.success('Automação atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar automação: ${error.message}`);
    },
  });

  // Excluir automação
  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_automations'] });
      toast.success('Automação excluída!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir automação: ${error.message}`);
    },
  });

  // Toggle ativo/inativo
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('mt_whatsapp_automations')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_automations'] });
      toast.success(variables.is_active ? 'Automação ativada!' : 'Automação desativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  // Buscar automação por ID
  const getAutomation = (id: string): WhatsAppAutomation | undefined => {
    return automations.find((a) => a.id === id);
  };

  return {
    automations,
    isLoading,
    error,
    refetch,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getAutomation,
    isCreating: createAutomation.isPending,
    isUpdating: updateAutomation.isPending,
    isDeleting: deleteAutomation.isPending,
  };
}

export default useAutomations;
