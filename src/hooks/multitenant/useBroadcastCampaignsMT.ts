// =============================================================================
// USE BROADCAST CAMPAIGNS MT - Hook Multi-Tenant para Campanhas de Broadcast
// =============================================================================
//
// Este hook fornece CRUD completo para mt_broadcast_campaigns
// com controle de ciclo de vida (draft -> processing -> completed)
// e integracao com Edge Function broadcast-processor
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BroadcastCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type BroadcastProviderType = 'waha' | 'meta_api' | 'evolution';

export type BroadcastMessageType = 'text' | 'image' | 'video' | 'document' | 'template';

export interface MTBroadcastCampaign {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  list_id: string;
  session_id: string | null;
  nome: string;
  descricao: string | null;
  provider_type: BroadcastProviderType;
  provider_id: string | null;
  message_type: BroadcastMessageType;
  message_text: string;
  media_url: string | null;
  template_name: string | null;
  template_components: Record<string, any> | null;
  status: BroadcastCampaignStatus;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  opted_out_count: number;
  batch_size: number;
  frequency_cap_hours: number | null;
  last_processed_index: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  delay_between_messages_ms: number;
  wave_size: number;
  wave_pause_minutes: number;
  current_wave: number;
  next_wave_at: string | null;
  send_text_separate: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  list?: {
    id: string;
    nome: string;
    total_recipients: number;
  };
  session?: {
    id: string;
    session_name: string;
    display_name: string;
    telefone: string;
  };
}

export interface CreateBroadcastCampaignInput {
  nome: string;
  list_id: string;
  session_id?: string | null;
  descricao?: string;
  provider_type?: BroadcastProviderType;
  provider_id?: string | null;
  message_type?: BroadcastMessageType;
  message_text: string;
  media_url?: string | null;
  template_name?: string | null;
  template_components?: Record<string, any>;
  scheduled_at?: string | null;
  delay_between_messages_ms?: number;
  batch_size?: number;
  frequency_cap_hours?: number | null;
  wave_size?: number;
  wave_pause_minutes?: number;
  send_text_separate?: boolean;
  tenant_id?: string;
  franchise_id?: string | null;
}

export interface UpdateBroadcastCampaignInput {
  id: string;
  nome?: string;
  list_id?: string;
  session_id?: string | null;
  descricao?: string;
  provider_type?: BroadcastProviderType;
  provider_id?: string | null;
  message_type?: BroadcastMessageType;
  message_text?: string;
  media_url?: string | null;
  template_name?: string | null;
  template_components?: Record<string, any>;
  scheduled_at?: string | null;
  delay_between_messages_ms?: number;
  batch_size?: number;
  frequency_cap_hours?: number | null;
}

export interface BroadcastCampaignFilters {
  status?: BroadcastCampaignStatus;
  provider_type?: BroadcastProviderType;
  search?: string;
  list_id?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-broadcast-campaigns';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Esta campanha ja existe.';
      case '23503':
        return 'Referencia invalida. Verifique lista e sessao.';
      case '23502':
        return 'Preencha todos os campos obrigatorios.';
      case '42501':
        return 'Voce nao tem permissao para realizar esta acao.';
      default:
        break;
    }
  }

  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal: useBroadcastCampaignsMT
// -----------------------------------------------------------------------------

export function useBroadcastCampaignsMT(filters?: BroadcastCampaignFilters) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Real-time subscription para mudancas de status/contadores
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!tenant && accessLevel !== 'platform') return;

    const channel = supabase
      .channel('broadcast-campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_broadcast_campaigns',
          ...(tenant ? { filter: `tenant_id=eq.${tenant.id}` } : {}),
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, accessLevel, queryClient]);

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Campanhas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.status, filters?.provider_type, filters?.search, filters?.list_id],
    queryFn: async (): Promise<MTBroadcastCampaign[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado.');
      }

      let q = supabase
        .from('mt_broadcast_campaigns')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          list:mt_broadcast_lists (id, nome, total_recipients),
          session:mt_whatsapp_sessions (id, session_name, display_name, telefone)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nivel de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        // Franchise admin vê campanhas do seu tenant (franchise-specific + gerais)
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.provider_type) {
        q = q.eq('provider_type', filters.provider_type);
      }

      if (filters?.list_id) {
        q = q.eq('list_id', filters.list_id);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar campanhas de broadcast MT:', error);
        throw error;
      }

      return (data || []) as MTBroadcastCampaign[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 30, // 30s - campanhas mudam com mais frequencia
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Campanha
  // ---------------------------------------------------------------------------

  const createCampaign = useMutation({
    mutationFn: async (input: CreateBroadcastCampaignInput): Promise<MTBroadcastCampaign> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido.');
      }

      const { data, error } = await supabase
        .from('mt_broadcast_campaigns')
        .insert({
          nome: input.nome,
          list_id: input.list_id,
          session_id: input.session_id || null,
          descricao: input.descricao || null,
          provider_type: input.provider_type || 'waha',
          provider_id: input.provider_id || null,
          message_type: input.message_type || 'text',
          message_text: input.message_text,
          media_url: input.media_url || null,
          template_name: input.template_name || null,
          template_components: input.template_components || null,
          status: 'draft',
          scheduled_at: input.scheduled_at || null,
          delay_between_messages_ms: input.delay_between_messages_ms ?? 3000,
          batch_size: input.batch_size ?? 50,
          frequency_cap_hours: input.frequency_cap_hours ?? null,
          tenant_id: input.tenant_id || tenant!.id,
          franchise_id: input.franchise_id ?? franchise?.id ?? null,
          created_by: user?.id || null,
          total_recipients: 0,
          sent_count: 0,
          delivered_count: 0,
          read_count: 0,
          failed_count: 0,
          opted_out_count: 0,
          last_processed_index: 0,
        })
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          list:mt_broadcast_lists (id, nome, total_recipients),
          session:mt_whatsapp_sessions (id, session_name, display_name, telefone)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar campanha de broadcast MT:', error);
        throw error;
      }

      return data as MTBroadcastCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Campanha "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Campanha (somente draft)
  // ---------------------------------------------------------------------------

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateBroadcastCampaignInput): Promise<MTBroadcastCampaign> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      // Verificar se campanha esta em draft
      const { data: current } = await supabase
        .from('mt_broadcast_campaigns')
        .select('status')
        .eq('id', id)
        .single();

      if (current && !['draft', 'paused'].includes(current.status)) {
        throw new Error('Somente campanhas em rascunho ou pausadas podem ser editadas.');
      }

      // Proteger campos de progresso - NUNCA resetar ao editar
      const safeUpdates = { ...updates };
      const protectedFields = [
        'sent_count', 'failed_count', 'delivered_count', 'read_count',
        'opted_out_count', 'total_recipients', 'last_processed_index',
        'started_at', 'completed_at', 'paused_at', 'current_wave',
        'status', 'tenant_id', 'franchise_id', 'created_by', 'created_at',
      ];
      for (const field of protectedFields) {
        delete (safeUpdates as any)[field];
      }

      // Detectar mudanças para log
      const changes: Record<string, { from: any; to: any }> = {};
      for (const [key, value] of Object.entries(safeUpdates)) {
        if (key === 'id' || key === 'updated_at') continue;
        const oldVal = (current as any)[key];
        if (oldVal !== value && JSON.stringify(oldVal) !== JSON.stringify(value)) {
          changes[key] = { from: oldVal, to: value };
        }
      }

      const { data, error } = await supabase
        .from('mt_broadcast_campaigns')
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString(),
          processing_metadata: {
            ...(current.processing_metadata as Record<string, any> || {}),
            edit_history: [
              ...((current.processing_metadata as any)?.edit_history || []),
              {
                at: new Date().toISOString(),
                by: tenant?.id || 'unknown',
                changes,
              },
            ],
          },
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          list:mt_broadcast_lists (id, nome, total_recipients),
          session:mt_whatsapp_sessions (id, session_name, display_name, telefone)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar campanha de broadcast MT:', error);
        throw error;
      }

      return data as MTBroadcastCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Campanha "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Campanha
  // ---------------------------------------------------------------------------

  const deleteCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      const { error } = await supabase
        .from('mt_broadcast_campaigns')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar campanha de broadcast MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Iniciar Campanha
  // ---------------------------------------------------------------------------

  const startCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      // 1. Buscar campanha e lista
      const { data: campaign, error: campaignError } = await supabase
        .from('mt_broadcast_campaigns')
        .select('id, status, list_id, tenant_id, message_text, message_type, media_url, template_name, template_components')
        .eq('id', id)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campanha nao encontrada.');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error(`Campanha nao pode ser iniciada no status "${campaign.status}".`);
      }

      // 2. Buscar destinatarios da lista
      const { data: recipients, error: recipientsError } = await supabase
        .from('mt_broadcast_recipients')
        .select('id, phone, nome, lead_id')
        .eq('list_id', campaign.list_id)
        .eq('is_valid', true);

      if (recipientsError) {
        console.error('Erro ao buscar destinatarios:', recipientsError);
        throw new Error('Erro ao buscar destinatarios da lista.');
      }

      if (!recipients || recipients.length === 0) {
        throw new Error('Nenhum destinatario valido encontrado na lista.');
      }

      // 3. Criar registros de mt_broadcast_messages (deduplicar por phone)
      const seenPhones = new Set<string>();
      const messageRecords: Array<{
        broadcast_campaign_id: string;
        tenant_id: string;
        phone: string;
        nome: string | null;
        recipient_id: string | null;
        status: 'pending';
      }> = [];

      for (const recipient of recipients) {
        if (!seenPhones.has(recipient.phone)) {
          seenPhones.add(recipient.phone);
          messageRecords.push({
            broadcast_campaign_id: id,
            tenant_id: campaign.tenant_id,
            phone: recipient.phone,
            nome: recipient.nome,
            recipient_id: recipient.id,
            status: 'pending',
          });
        }
      }

      // Inserir em lotes de 500 (upsert para ignorar duplicatas)
      const batchSize = 500;
      for (let i = 0; i < messageRecords.length; i += batchSize) {
        const batch = messageRecords.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('mt_broadcast_messages')
          .upsert(batch, { onConflict: 'broadcast_campaign_id,phone', ignoreDuplicates: true });

        if (insertError) {
          console.error('Erro ao criar mensagens de broadcast:', insertError);
          throw new Error('Erro ao criar registros de mensagens.');
        }
      }

      // 4. Atualizar campanha com total e status
      const { error: updateError } = await supabase
        .from('mt_broadcast_campaigns')
        .update({
          total_recipients: recipients.length,
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao atualizar status da campanha:', updateError);
        throw new Error('Erro ao atualizar status da campanha.');
      }

      // 5. Invocar edge function para processar envios
      const { error: fnError } = await supabase.functions.invoke('broadcast-processor', {
        body: { broadcast_campaign_id: id },
      });

      if (fnError) {
        console.error('Erro ao invocar broadcast-processor:', fnError);
        // Nao lanca erro pois a campanha ja foi criada - processor pode ser reinvocado
        toast.error('Campanha iniciada, mas houve erro ao conectar com o processador. Tente retomar.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-broadcast-messages'] });
      toast.success('Campanha iniciada! As mensagens estao sendo enviadas.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Pausar Campanha
  // ---------------------------------------------------------------------------

  const pauseCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      const { error } = await supabase
        .from('mt_broadcast_campaigns')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['processing']);

      if (error) {
        console.error('Erro ao pausar campanha:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha pausada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Retomar Campanha
  // ---------------------------------------------------------------------------

  const resumeCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      // Atualizar status
      const { error: updateError } = await supabase
        .from('mt_broadcast_campaigns')
        .update({
          status: 'processing',
          paused_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['paused', 'wave_pause']);

      if (updateError) {
        console.error('Erro ao retomar campanha:', updateError);
        throw updateError;
      }

      // Re-invocar edge function
      const { error: fnError } = await supabase.functions.invoke('broadcast-processor', {
        body: { broadcast_campaign_id: id },
      });

      if (fnError) {
        console.error('Erro ao invocar broadcast-processor:', fnError);
        toast.error('Campanha retomada, mas houve erro ao conectar com o processador.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha retomada! Os envios continuam.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Cancelar Campanha
  // ---------------------------------------------------------------------------

  const cancelCampaign = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da campanha e obrigatorio.');
      }

      const { error } = await supabase
        .from('mt_broadcast_campaigns')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['draft', 'scheduled', 'processing', 'paused']);

      if (error) {
        console.error('Erro ao cancelar campanha:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha cancelada!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Duplicar Campanha
  // ---------------------------------------------------------------------------

  const duplicateCampaign = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { data: original, error: fetchError } = await supabase
        .from('mt_broadcast_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !original) {
        throw new Error('Campanha não encontrada.');
      }

      const { data: newCampaign, error: insertError } = await supabase
        .from('mt_broadcast_campaigns')
        .insert({
          tenant_id: original.tenant_id,
          franchise_id: original.franchise_id,
          nome: `${original.nome} (cópia)`,
          descricao: original.descricao,
          provider_type: original.provider_type,
          session_id: original.session_id,
          list_id: original.list_id,
          message_type: original.message_type,
          message_text: original.message_text,
          media_url: original.media_url,
          template_name: original.template_name,
          template_components: original.template_components,
          batch_size: original.batch_size,
          delay_between_messages_ms: original.delay_between_messages_ms,
          max_per_minute: original.max_per_minute,
          frequency_cap_hours: original.frequency_cap_hours,
          total_recipients: original.total_recipients,
          status: 'draft',
        })
        .select('id')
        .single();

      if (insertError || !newCampaign) {
        console.error('Erro ao duplicar campanha:', insertError);
        throw insertError || new Error('Erro ao duplicar.');
      }

      return newCampaign.id;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campanha duplicada! Redirecionando...');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    campaigns: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: query.refetch,

    // Mutations
    createCampaign: {
      mutate: createCampaign.mutate,
      mutateAsync: createCampaign.mutateAsync,
      isPending: createCampaign.isPending,
    },
    updateCampaign: {
      mutate: updateCampaign.mutate,
      mutateAsync: updateCampaign.mutateAsync,
      isPending: updateCampaign.isPending,
    },
    deleteCampaign: {
      mutate: deleteCampaign.mutate,
      mutateAsync: deleteCampaign.mutateAsync,
      isPending: deleteCampaign.isPending,
    },
    startCampaign: {
      mutate: startCampaign.mutate,
      mutateAsync: startCampaign.mutateAsync,
      isPending: startCampaign.isPending,
    },
    pauseCampaign: {
      mutate: pauseCampaign.mutate,
      mutateAsync: pauseCampaign.mutateAsync,
      isPending: pauseCampaign.isPending,
    },
    resumeCampaign: {
      mutate: resumeCampaign.mutate,
      mutateAsync: resumeCampaign.mutateAsync,
      isPending: resumeCampaign.isPending,
    },
    cancelCampaign: {
      mutate: cancelCampaign.mutate,
      mutateAsync: cancelCampaign.mutateAsync,
      isPending: cancelCampaign.isPending,
    },
    duplicateCampaign: {
      mutate: duplicateCampaign.mutate,
      mutateAsync: duplicateCampaign.mutateAsync,
      isPending: duplicateCampaign.isPending,
    },

    isCreating: createCampaign.isPending,
    isUpdating: updateCampaign.isPending,
    isDeleting: deleteCampaign.isPending,
    isStarting: startCampaign.isPending,
    isPausing: pauseCampaign.isPending,
    isResuming: resumeCampaign.isPending,
    isCancelling: cancelCampaign.isPending,
    isDuplicating: duplicateCampaign.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Campanha Individual com Real-time
// -----------------------------------------------------------------------------

export function useBroadcastCampaignMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Real-time subscription para esta campanha especifica
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`broadcast-campaign-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_broadcast_campaigns',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          queryClient.setQueryData(
            [QUERY_KEY, 'detail', id],
            (old: MTBroadcastCampaign | null) => {
              if (!old) return payload.new as MTBroadcastCampaign;
              return { ...old, ...payload.new } as MTBroadcastCampaign;
            }
          );
          // Tambem invalidar a lista
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const query = useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTBroadcastCampaign | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_broadcast_campaigns')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          list:mt_broadcast_lists (id, nome, total_recipients),
          session:mt_whatsapp_sessions (id, session_name, display_name, telefone)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Erro ao buscar campanha de broadcast:', error);
        throw error;
      }

      return data as MTBroadcastCampaign;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 10, // 10s - campanha individual precisa estar mais atualizada
  });

  return {
    campaign: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export default useBroadcastCampaignsMT;
