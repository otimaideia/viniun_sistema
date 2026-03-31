// Hook Multi-Tenant para Sessões WhatsApp
// Tabela: mt_whatsapp_sessions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { wahaApi } from '@/services/waha-api';
import type {
  MTWhatsAppSession,
  CreateMTSessionInput,
  UpdateMTSessionInput,
  WhatsAppSessionStatus,
} from '@/types/whatsapp-mt';

interface SessionFilters {
  franchise_id?: string;
  status?: WhatsAppSessionStatus;
  is_active?: boolean;
}

export function useWhatsAppSessionsMT(filters?: SessionFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar sessões
  const query = useQuery({
    queryKey: ['mt-whatsapp-sessions', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTWhatsAppSession[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_sessions')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          responsible_user:mt_users!responsible_user_id(id, nome, email, avatar_url),
          department:mt_departments(id, codigo, nome, cor, icone, parent_id),
          team:mt_teams(id, codigo, nome, cor, icone, lider_id)
        `)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Filtros adicionais
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar sessões MT:', error);
        throw error;
      }

      // Sanitizar dados para prevenir erros de Unicode inválido
      const sanitizedData = sanitizeObjectForJSON(data || []);
      return sanitizedData as MTWhatsAppSession[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Query: Buscar sessão por ID
  const getSession = async (id: string): Promise<MTWhatsAppSession | null> => {
    const { data, error } = await supabase
      .from('mt_whatsapp_sessions')
      .select(`
        *,
        tenant:mt_tenants(id, slug, nome_fantasia),
        franchise:mt_franchises(id, nome, cidade, estado),
        responsible_user:mt_users!responsible_user_id(id, nome, email, avatar_url),
        department:mt_departments(id, codigo, nome, cor, icone, parent_id),
        team:mt_teams(id, codigo, nome, cor, icone, lider_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar sessão:', error);
      return null;
    }

    // Sanitizar dados para prevenir erros de Unicode inválido
    const sanitizedData = sanitizeObjectForJSON(data);
    return sanitizedData as MTWhatsAppSession;
  };

  // Mutation: Criar sessão
  const createSession = useMutation({
    mutationFn: async (input: CreateMTSessionInput): Promise<MTWhatsAppSession> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .insert({
          ...input,
          engine: input.engine || 'NOWEB',
          tenant_id: tenant?.id,
          franchise_id: input.franchise_id || franchise?.id,
          status: 'disconnected',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppSession;
    },
    onSuccess: async (newSession, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });

      // Auto-criar permissão para o responsável da sessão
      if (variables.responsible_user_id && newSession?.id) {
        try {
          await supabase
            .from('mt_whatsapp_user_sessions')
            .insert({
              user_id: variables.responsible_user_id,
              session_id: newSession.id,
              can_view: true,
              can_send: true,
              can_manage: true,
              can_delete_messages: false,
            });
        } catch (err) {
          console.warn('[WhatsApp] Erro ao auto-criar permissão:', err);
        }
      }

      // Auto-criar labels padrão para o tenant (se ainda não existem)
      const sessionTenantId = newSession?.tenant_id || tenant?.id;
      if (sessionTenantId) {
        try {
          await supabase.rpc('seed_default_whatsapp_labels', { p_tenant_id: sessionTenantId });
          queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
        } catch (err) {
          console.warn('[WhatsApp] Erro ao seed labels padrão:', err);
        }
      }

      toast.success('Sessão criada com sucesso');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar sessão:', error);
      toast.error(`Erro ao criar sessão: ${error.message}`);
    },
  });

  // Mutation: Atualizar sessão
  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMTSessionInput): Promise<MTWhatsAppSession> => {
      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });
      toast.success('Sessão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar sessão: ${error.message}`);
    },
  });

  // Mutation: Atualizar status da sessão
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      qr_code,
    }: {
      id: string;
      status: WhatsAppSessionStatus;
      qr_code?: string | null;
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (qr_code !== undefined) {
        updates.qr_code = qr_code;
        updates.last_qr_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });
    },
  });

  // Mutation: Deletar sessão (WAHA + banco)
  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      // 1. Buscar session_name para deletar no WAHA
      const { data: session } = await supabase
        .from('mt_whatsapp_sessions')
        .select('session_name')
        .eq('id', id)
        .single();

      // 2. Deletar no WAHA (ignora erro se sessão não existe lá)
      if (session?.session_name) {
        try {
          await wahaApi.deleteSession(session.session_name);
        } catch {
          // Ignora - sessão pode já não existir no WAHA
          console.warn(`[WAHA] Sessão ${session.session_name} não encontrada no WAHA (pode já ter sido deletada)`);
        }
      }

      // 3. Deletar do banco (CASCADE cuida das tabelas relacionadas)
      const { error } = await supabase
        .from('mt_whatsapp_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });
      toast.success('Sessão removida com sucesso (WAHA + banco)');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover sessão: ${error.message}`);
    },
  });

  // Mutation: Atualizar estatísticas
  const updateStats = useMutation({
    mutationFn: async ({
      id,
      total_chats,
      total_messages,
      last_message_at,
      last_sync_at,
    }: {
      id: string;
      total_chats?: number;
      total_messages?: number;
      last_message_at?: string;
      last_sync_at?: string;
    }) => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (total_chats !== undefined) updates.total_chats = total_chats;
      if (total_messages !== undefined) updates.total_messages = total_messages;
      if (last_message_at) updates.last_message_at = last_message_at;
      if (last_sync_at) updates.last_sync_at = last_sync_at;

      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-sessions'] });
    },
  });

  // Buscar sessão padrão do usuário/franchise
  const getDefaultSession = async (): Promise<MTWhatsAppSession | null> => {
    let q = supabase
      .from('mt_whatsapp_sessions')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true);

    if (franchise) {
      q = q.eq('franchise_id', franchise.id);
    } else if (tenant) {
      q = q.eq('tenant_id', tenant.id);
    }

    const { data, error } = await q.limit(1).single();

    if (error) {
      // Não tem sessão padrão, retorna a primeira ativa
      const { data: firstSession } = await supabase
        .from('mt_whatsapp_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', tenant?.id)
        .limit(1)
        .single();

      return firstSession as MTWhatsAppSession | null;
    }

    return data as MTWhatsAppSession;
  };

  return {
    // Query
    sessions: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,

    // Helpers
    getSession,
    getDefaultSession,

    // Mutations
    createSession,
    updateSession,
    updateStatus,
    deleteSession,
    updateStats,

    // Estados das mutations
    isCreating: createSession.isPending,
    isUpdating: updateSession.isPending,
    isDeleting: deleteSession.isPending,
  };
}

// Hook para sessão individual
export function useWhatsAppSessionMT(sessionId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-whatsapp-session', sessionId],
    queryFn: async (): Promise<MTWhatsAppSession | null> => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome, cidade, estado),
          responsible_user:mt_users!responsible_user_id(id, nome, email, avatar_url),
          department:mt_departments(id, codigo, nome, cor, icone, parent_id),
          team:mt_teams(id, codigo, nome, cor, icone, lider_id)
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Erro ao buscar sessão:', error);
        return null;
      }

      return data as MTWhatsAppSession;
    },
    enabled: !!sessionId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    session: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook para buscar o perfil da própria sessão via WAHA API
 * GET /api/{session}/profile
 */
export function useSessionProfile(sessionId: string | undefined) {
  const query = useQuery({
    queryKey: ['waha-session-profile', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      // Buscar credenciais da sessão
      const { data: session } = await supabase
        .from('mt_whatsapp_sessions')
        .select('session_name, waha_url, waha_api_key, display_name, profile_picture_url')
        .eq('id', sessionId)
        .single();

      if (!session?.waha_url || !session?.session_name) return null;

      wahaApi.setConfig(session.waha_url, session.waha_api_key);
      const profile = await wahaApi.getSessionProfile(session.session_name);

      // Atualizar display_name e foto se obtidos do WAHA
      if (profile?.name || profile?.pushname || profile?.profilePictureURL) {
        const updates: Record<string, string> = {};
        if (profile.name || profile.pushname) {
          updates.display_name = profile.name || profile.pushname || session.display_name || '';
        }
        if (profile.profilePictureURL) {
          updates.profile_picture_url = profile.profilePictureURL;
        }
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('mt_whatsapp_sessions')
            .update(updates)
            .eq('id', sessionId);
        }
      }

      return {
        ...profile,
        display_name: profile?.name || profile?.pushname || session.display_name,
        profile_picture_url: profile?.profilePictureURL || session.profile_picture_url,
      };
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Hook para gerenciar labels WAHA de uma sessão
 * Sincroniza labels do WAHA com o banco de dados local
 */
export function useSessionWahaLabels(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['waha-session-labels', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data: session } = await supabase
        .from('mt_whatsapp_sessions')
        .select('session_name, waha_url, waha_api_key, tenant_id')
        .eq('id', sessionId)
        .single();

      if (!session?.waha_url || !session?.session_name) return [];

      wahaApi.setConfig(session.waha_url, session.waha_api_key);
      const wahaLabels = await wahaApi.getSessionLabels(session.session_name);

      return wahaLabels;
    },
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Mutation: Sincronizar labels WAHA com DB (upsert)
  const syncLabels = useMutation({
    mutationFn: async () => {
      if (!sessionId || !query.data) return;

      const { data: session } = await supabase
        .from('mt_whatsapp_sessions')
        .select('tenant_id')
        .eq('id', sessionId)
        .single();

      if (!session?.tenant_id) return;

      for (const wahaLabel of query.data) {
        await supabase
          .from('mt_whatsapp_labels')
          .upsert({
            tenant_id: session.tenant_id,
            name: wahaLabel.name,
            color: wahaLabel.colorHex || `#${(wahaLabel.color || 0).toString(16).padStart(6, '0')}`,
            waha_label_id: wahaLabel.id,
            is_active: true,
          }, { onConflict: 'tenant_id,waha_label_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-labels'] });
      toast.success('Labels sincronizadas com WAHA');
    },
  });

  return {
    wahaLabels: query.data || [],
    isLoading: query.isLoading,
    syncLabels,
  };
}
