// Hook Multi-Tenant para Labels/Etiquetas WhatsApp
// Tabelas: mt_whatsapp_labels, mt_whatsapp_conversation_labels

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { wahaApi } from '@/services/waha-api';
import { toast } from 'sonner';
import type {
  MTWhatsAppLabel,
  CreateLabelInput,
  UpdateLabelInput,
} from '@/types/whatsapp-mt';

// Cores pré-definidas para labels
export const LABEL_COLORS = [
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Roxo', value: '#A855F7' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Cinza', value: '#6B7280' },
];

// Labels padrão do sistema (criadas automaticamente para cada tenant)
export const DEFAULT_LABELS = [
  { name: 'Novo cliente', color: '#64c4ff', description: 'Etiqueta padrão - Novo cliente identificado', display_order: 1 },
  { name: 'Novo pedido', color: '#ffd429', description: 'Etiqueta padrão - Novo pedido recebido', display_order: 2 },
  { name: 'Pagamento pendente', color: '#ff9485', description: 'Etiqueta padrão - Aguardando pagamento', display_order: 3 },
  { name: 'Pago', color: '#dfaef0', description: 'Etiqueta padrão - Pagamento confirmado', display_order: 4 },
  { name: 'Pedido finalizado', color: '#55ccb3', description: 'Etiqueta padrão - Pedido concluído', display_order: 5 },
  { name: 'Lead', color: '#3B82F6', description: 'Lead identificado - potencial cliente', display_order: 6 },
  { name: 'Cadastro', color: '#22C55E', description: 'Cliente realizou cadastro ou agendamento', display_order: 7 },
  { name: 'Acompanhar', color: '#F97316', description: 'Conversa requer acompanhamento', display_order: 8 },
  { name: 'Importante', color: '#EF4444', description: 'Conversa prioritária ou urgente', display_order: 9 },
  { name: 'Curriculos', color: '#14B8A6', description: 'Contato enviou currículo - candidato a vaga', display_order: 10 },
];

// Função utilitária: garante que as labels padrão existam para um tenant
export async function ensureDefaultLabels(tenantId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('seed_default_whatsapp_labels', { p_tenant_id: tenantId });
    if (error) {
      console.warn('[Labels] Erro ao seed labels padrão via RPC:', error);
      return 0;
    }
    return data as number;
  } catch (e) {
    console.warn('[Labels] Erro ao garantir labels padrão:', e);
    return 0;
  }
}

export function useWhatsAppLabelsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar labels
  const query = useQuery({
    queryKey: ['mt-whatsapp-labels', tenant?.id, franchise?.id],
    queryFn: async (): Promise<MTWhatsAppLabel[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_labels')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      // Filtros por nível de acesso — sempre filtrar por tenant quando disponível
      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }
      if (accessLevel === 'franchise' && franchise) {
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar labels MT:', error);
        throw error;
      }

      return (data || []) as MTWhatsAppLabel[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar label
  const createLabel = useMutation({
    mutationFn: async (input: CreateLabelInput): Promise<MTWhatsAppLabel> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_labels')
        .insert({
          ...input,
          tenant_id: tenant?.id,
          franchise_id: input.franchise_id || franchise?.id,
          is_active: true,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppLabel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
      toast.success('Etiqueta criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar etiqueta: ${error.message}`);
    },
  });

  // Mutation: Atualizar label
  const updateLabel = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLabelInput): Promise<MTWhatsAppLabel> => {
      const { data, error } = await supabase
        .from('mt_whatsapp_labels')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppLabel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
      toast.success('Etiqueta atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar etiqueta: ${error.message}`);
    },
  });

  // Mutation: Deletar label (soft delete)
  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_labels')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
      toast.success('Etiqueta removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover etiqueta: ${error.message}`);
    },
  });

  return {
    labels: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    createLabel,
    updateLabel,
    deleteLabel,
  };
}

// Hook para labels de uma conversa específica
export function useConversationLabelsMT(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  // Query: Labels da conversa
  const query = useQuery({
    queryKey: ['mt-whatsapp-conversation-labels', conversationId],
    queryFn: async (): Promise<MTWhatsAppLabel[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('mt_whatsapp_conversation_labels')
        .select(`
          label:mt_whatsapp_labels(*)
        `)
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Erro ao buscar labels da conversa:', error);
        throw error;
      }

      return (data?.map((item) => item.label).filter(Boolean) || []) as MTWhatsAppLabel[];
    },
    enabled: !!conversationId,
  });

  // Mutation: Adicionar label à conversa
  const addLabel = useMutation({
    mutationFn: async (labelId: string) => {
      if (!conversationId) throw new Error('Conversa não definida');

      // Buscar tenant_id da conversa
      const { data: conv } = await supabase
        .from('mt_whatsapp_conversations')
        .select('tenant_id')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('mt_whatsapp_conversation_labels')
        .insert({
          conversation_id: conversationId,
          label_id: labelId,
          tenant_id: conv?.tenant_id,
        });

      if (error) throw error;

      // Incrementar contador de uso
      try {
        await supabase.rpc('increment_label_usage', { p_label_id: labelId });
      } catch (e) {
        console.warn('[Labels] Erro ao incrementar usage_count:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversation-labels', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      toast.success('Etiqueta adicionada');
    },
  });

  // Mutation: Remover label da conversa
  const removeLabel = useMutation({
    mutationFn: async (labelId: string) => {
      if (!conversationId) throw new Error('Conversa não definida');

      const { error } = await supabase
        .from('mt_whatsapp_conversation_labels')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversation-labels', conversationId] });
      toast.success('Etiqueta removida');
    },
  });

  // Mutation: Definir labels (substituir todas) + sync WAHA
  const setLabels = useMutation({
    mutationFn: async (labelIds: string[]) => {
      if (!conversationId) throw new Error('Conversa não definida');

      // Remover todas as labels atuais
      await supabase
        .from('mt_whatsapp_conversation_labels')
        .delete()
        .eq('conversation_id', conversationId);

      // Adicionar novas labels (DB)
      if (labelIds.length > 0) {
        // Buscar tenant_id da conversa
        const { data: conv } = await supabase
          .from('mt_whatsapp_conversations')
          .select('tenant_id')
          .eq('id', conversationId)
          .single();

        const inserts = labelIds.map((labelId) => ({
          conversation_id: conversationId,
          label_id: labelId,
          tenant_id: conv?.tenant_id,
        }));

        const { error } = await supabase
          .from('mt_whatsapp_conversation_labels')
          .insert(inserts);

        if (error) throw error;
      }

      // Sync com WAHA (best-effort): usar waha_label_id das labels para assignar
      try {
        const { data: convFull } = await supabase
          .from('mt_whatsapp_conversations')
          .select('chat_id, session:mt_whatsapp_sessions(session_name, waha_url, waha_api_key)')
          .eq('id', conversationId)
          .single();

        if (convFull?.chat_id && convFull?.session) {
          const session = convFull.session as { session_name: string; waha_url: string; waha_api_key: string };
          if (session.waha_url && session.waha_api_key && labelIds.length > 0) {
            // Buscar os waha_label_id das labels selecionadas
            const { data: labelRows } = await supabase
              .from('mt_whatsapp_labels')
              .select('id, waha_label_id')
              .in('id', labelIds);

            const wahaLabelIds = (labelRows || [])
              .filter((l: { waha_label_id?: string }) => l.waha_label_id)
              .map((l: { waha_label_id: string }) => l.waha_label_id);

            if (wahaLabelIds.length > 0) {
              wahaApi.setConfig(session.waha_url, session.waha_api_key);
              await wahaApi.assignLabelsToChat(
                session.session_name,
                convFull.chat_id,
                wahaLabelIds
              );
            }
          }
        }
      } catch (wahaErr) {
        console.warn('[Labels] Erro ao sincronizar labels com WAHA (ignorado):', wahaErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversation-labels', conversationId] });
      toast.success('Etiquetas atualizadas');
    },
  });

  return {
    labels: query.data || [],
    isLoading: query.isLoading,
    addLabel,
    removeLabel,
    setLabels,
  };
}
