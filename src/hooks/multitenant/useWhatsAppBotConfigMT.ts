import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppBotConfig {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  session_id: string | null;
  is_active: boolean;
  auto_respond: boolean;
  // Prompts e mensagens
  system_prompt: string;
  welcome_message: string;
  fallback_message: string;
  handoff_message: string;
  transfer_message: string | null;
  offline_message: string | null;
  // OpenAI
  openai_api_key: string | null;
  openai_model: string;
  openai_temperature: number;
  openai_max_tokens: number;
  // Transferência para humano
  max_interactions_before_handoff: number;
  uncertainty_threshold: number;
  transfer_after_attempts: number;
  transfer_on_keywords: string[] | null;
  transfer_if_low_confidence: boolean;
  min_confidence_score: number;
  // Exclusões
  exclude_groups: boolean;
  exclude_contacts: string[] | null;
  // Horário comercial
  only_outside_hours: boolean;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[] | null;
  // Estatísticas
  total_messages_handled: number;
  successful_resolutions: number;
  handoffs_to_human: number;
  avg_response_time_ms: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdateBotConfigInput {
  is_active?: boolean;
  auto_respond?: boolean;
  system_prompt?: string;
  welcome_message?: string;
  fallback_message?: string;
  handoff_message?: string;
  transfer_message?: string;
  offline_message?: string;
  max_interactions_before_handoff?: number;
  uncertainty_threshold?: number;
  transfer_after_attempts?: number;
  transfer_on_keywords?: string[];
  transfer_if_low_confidence?: boolean;
  min_confidence_score?: number;
  exclude_groups?: boolean;
  exclude_contacts?: string[];
  only_outside_hours?: boolean;
  horario_inicio?: string;
  horario_fim?: string;
  dias_semana?: number[];
  openai_api_key?: string;
  openai_model?: string;
  openai_temperature?: number;
  openai_max_tokens?: number;
}

export function useWhatsAppBotConfigMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Buscar configuração do bot (config global do tenant, session_id IS NULL)
  const query = useQuery({
    queryKey: ['mt-whatsapp-bot-config', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_bot_config')
        .select('*')
        .is('session_id', null) // Config global (não por sessão)
        .order('created_at', { ascending: false });

      // Filtrar por tenant
      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Franchise admin: filtrar por franchise se existir config da franquia
      if (accessLevel === 'franchise' && franchise) {
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      const { data, error } = await q.maybeSingle();
      if (error) throw error;

      return data as WhatsAppBotConfig | null;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Upsert (criar ou atualizar)
  const upsert = useMutation({
    mutationFn: async (input: UpdateBotConfigInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const tenantId = tenant?.id;
      if (!tenantId) {
        throw new Error('tenant_id obrigatório');
      }

      // Verificar se já existe configuração global para este tenant
      const { data: existing } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('session_id', null)
        .maybeSingle();

      if (existing) {
        // UPDATE
        const { data, error } = await supabase
          .from('mt_whatsapp_bot_config')
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppBotConfig;
      } else {
        // INSERT - config global do tenant (session_id = null)
        const { data, error } = await supabase
          .from('mt_whatsapp_bot_config')
          .insert({
            tenant_id: tenantId,
            franchise_id: franchise?.id || null,
            session_id: null, // Config global
            auto_respond: true,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppBotConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-bot-config'] });
      toast.success('Configuração do chatbot salva com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });

  // Mutation: Ativar/Desativar bot
  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!tenant) {
        throw new Error('Tenant não definido');
      }

      const { data: existing } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('id')
        .eq('tenant_id', tenant.id)
        .is('session_id', null)
        .maybeSingle();

      if (!existing) {
        // Criar config se não existir ao ativar
        const { data, error } = await supabase
          .from('mt_whatsapp_bot_config')
          .insert({
            tenant_id: tenant.id,
            franchise_id: franchise?.id || null,
            session_id: null,
            is_active: isActive,
            auto_respond: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppBotConfig;
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_bot_config')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppBotConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-bot-config'] });
      toast.success(data.is_active ? 'Chatbot ativado' : 'Chatbot desativado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  // Mutation: Resetar estatísticas
  const resetStats = useMutation({
    mutationFn: async () => {
      if (!tenant) {
        throw new Error('Tenant não definido');
      }

      const { data: existing } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('id')
        .eq('tenant_id', tenant.id)
        .is('session_id', null)
        .maybeSingle();

      if (!existing) {
        throw new Error('Configuração do bot não encontrada');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_bot_config')
        .update({
          total_messages_handled: 0,
          successful_resolutions: 0,
          handoffs_to_human: 0,
          avg_response_time_ms: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppBotConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-bot-config'] });
      toast.success('Estatísticas resetadas com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar estatísticas: ${error.message}`);
    },
  });

  // Query: Buscar logs do chatbot
  const logsQuery = useQuery({
    queryKey: ['mt-chatbot-logs', tenant?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        return [];
      }

      let q = supabase
        .from('mt_chatbot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    config: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    upsert,
    toggleActive,
    resetStats,
    logs: logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    refetchLogs: logsQuery.refetch,
  };
}
