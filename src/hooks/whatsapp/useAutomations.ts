// Hook para Automações WhatsApp (boas-vindas, ausência, etc)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export type AutomationType = 'welcome' | 'away' | 'business_hours';

export interface WhatsAppAutomation {
  id: string;
  session_id: string;
  franqueado_id: string;
  type: AutomationType;
  name: string;
  is_active: boolean;

  // Conteúdo
  message: string;
  media_url?: string | null;

  // Configurações
  delay_seconds: number; // Delay antes de enviar
  only_first_message: boolean; // Só responde na primeira mensagem

  // Horário de funcionamento (para away e business_hours)
  schedule_enabled: boolean;
  schedule_start_time?: string | null; // HH:mm
  schedule_end_time?: string | null; // HH:mm
  schedule_days?: number[] | null; // 0-6 (domingo-sábado)

  // Controle
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationInput {
  session_id: string;
  type: AutomationType;
  name: string;
  message: string;
  media_url?: string | null;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
  schedule_days?: number[] | null;
}

export interface UpdateAutomationInput {
  name?: string;
  message?: string;
  media_url?: string | null;
  is_active?: boolean;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
  schedule_days?: number[] | null;
}

const AUTOMATIONS_KEY = 'whatsapp-automations';
const TABLE_NAME = 'mt_whatsapp_automations';

interface UseAutomationsOptions {
  sessionId?: string | null;
  franqueadoId?: string | null;
  enabled?: boolean;
}

/**
 * @deprecated Use useAutomationsAdapter instead. This hook lacks tenant isolation.
 */
export function useAutomations({ sessionId, franqueadoId, enabled = true }: UseAutomationsOptions = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant, franchise } = useTenantContext();
  const effectiveFranqueadoId = franqueadoId || user?.user_metadata?.franqueado_id;

  // Listar automações
  const automationsQuery = useQuery({
    queryKey: [AUTOMATIONS_KEY, effectiveFranqueadoId, sessionId],
    queryFn: async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else if (effectiveFranqueadoId) {
        query = query.eq('franqueado_id', effectiveFranqueadoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Automations] Erro ao buscar:', error);
        // Se tabela não existe, retorna array vazio
        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return data as WhatsAppAutomation[];
    },
    enabled: enabled && !!effectiveFranqueadoId,
    staleTime: 60000,
  });

  // Criar automação
  const createAutomation = useMutation({
    mutationFn: async (input: CreateAutomationInput) => {
      if (!tenant?.id) {
        throw new Error('Tenant não identificado');
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          ...input,
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          franchise_id: franchise?.id || null,
          franqueado_id: effectiveFranqueadoId,
          is_active: true,
          delay_seconds: input.delay_seconds ?? 2,
          only_first_message: input.only_first_message ?? true,
          schedule_enabled: input.schedule_enabled ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAutomation;
    },
    onSuccess: () => {
      toast.success('Automação criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar automação: ${error.message}`);
    },
  });

  // Atualizar automação
  const updateAutomation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateAutomationInput & { id: string }) => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAutomation;
    },
    onSuccess: () => {
      toast.success('Automação atualizada!');
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar automação: ${error.message}`);
    },
  });

  // Deletar automação
  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Automação removida!');
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover automação: ${error.message}`);
    },
  });

  // Toggle ativo/inativo
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAutomation;
    },
    onSuccess: (data) => {
      toast.success(data.is_active ? 'Automação ativada!' : 'Automação desativada!');
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    automations: automationsQuery.data || [],
    isLoading: automationsQuery.isLoading,
    error: automationsQuery.error,
    refetch: automationsQuery.refetch,

    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,

    isCreating: createAutomation.isPending,
    isUpdating: updateAutomation.isPending,
    isDeleting: deleteAutomation.isPending,
  };
}

// Labels para tipos de automação
export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  welcome: 'Boas-vindas',
  away: 'Mensagem de Ausência',
  business_hours: 'Horário Comercial',
};

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  welcome: 'Resposta automática para novos contatos',
  away: 'Resposta quando você está ausente',
  business_hours: 'Resposta fora do horário comercial',
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

export default useAutomations;
