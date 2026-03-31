// Hook Multi-Tenant para Permissões de Usuário WhatsApp
// Tabela: mt_whatsapp_user_sessions
// Colunas reais: id, tenant_id, user_id, whatsapp_session_id, can_view, can_send, can_manage, can_delete_messages,
//               assigned_at, assigned_by, revoked_at, revoked_by, is_active, created_at, updated_at

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Interface baseada nas colunas reais da tabela
export interface MTWhatsAppUserSession {
  id: string;
  tenant_id: string;
  user_id: string;
  whatsapp_session_id: string;
  can_view: boolean;
  can_send: boolean;
  can_manage: boolean;
  can_delete_messages: boolean;
  assigned_at: string | null;
  assigned_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  user?: {
    id: string;
    nome: string;
    email: string;
    avatar_url?: string;
  };
}

export interface GrantPermissionInput {
  user_id: string;
  session_id: string; // será convertido para whatsapp_session_id
  can_view?: boolean;
  can_send?: boolean;
  can_manage?: boolean;
  can_delete_messages?: boolean;
}

export function useWhatsAppPermissionsMT(sessionId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query: Permissões do usuário atual para a sessão
  const myPermissions = useQuery({
    queryKey: ['mt-whatsapp-my-permissions', sessionId, user?.id],
    queryFn: async (): Promise<MTWhatsAppUserSession | null> => {
      if (!sessionId || !user?.id) return null;

      const { data, error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .select('*')
        .eq('whatsapp_session_id', sessionId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar permissões:', error);
        return null;
      }

      return data as MTWhatsAppUserSession | null;
    },
    enabled: !!sessionId && !!user?.id,
  });

  // Query: Todas as permissões da sessão (para admin)
  const sessionPermissions = useQuery({
    queryKey: ['mt-whatsapp-session-permissions', sessionId],
    queryFn: async (): Promise<MTWhatsAppUserSession[]> => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .select(`
          *,
          user:mt_users!user_id(id, nome, email, avatar_url)
        `)
        .eq('whatsapp_session_id', sessionId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar permissões da sessão:', error);
        throw error;
      }

      return (data || []) as MTWhatsAppUserSession[];
    },
    enabled: !!sessionId && (accessLevel === 'platform' || accessLevel === 'tenant'),
  });

  // Permissions are simplified - all users can access. Restore granular filtering when needed.
  // Original: canView/canSend dependiam de mt_whatsapp_user_sessions + accessLevel
  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';
  const canView = true; // TEMP: todos podem ver
  const canSend = true; // TEMP: todos podem enviar
  const canManage = myPermissions.data?.can_manage ?? (accessLevel === 'platform' || accessLevel === 'tenant');
  const canDeleteMessages = myPermissions.data?.can_delete_messages ?? isAdmin;
  // Permissões derivadas (não existem na tabela, baseadas em can_manage)
  const canExport = canManage;
  const canAssign = canManage;

  // Mutation: Conceder permissão
  const grantPermission = useMutation({
    mutationFn: async (input: GrantPermissionInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('mt_whatsapp_user_sessions')
        .select('id')
        .eq('user_id', input.user_id)
        .eq('whatsapp_session_id', input.session_id)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('mt_whatsapp_user_sessions')
          .update({
            can_view: input.can_view ?? true,
            can_send: input.can_send ?? false,
            can_manage: input.can_manage ?? false,
            can_delete_messages: input.can_delete_messages ?? false,
            is_active: true,
            revoked_at: null,
            revoked_by: null,
            assigned_at: new Date().toISOString(),
            assigned_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar nova permissão
        const { error } = await supabase
          .from('mt_whatsapp_user_sessions')
          .insert({
            user_id: input.user_id,
            whatsapp_session_id: input.session_id,
            tenant_id: tenant?.id,
            can_view: input.can_view ?? true,
            can_send: input.can_send ?? false,
            can_manage: input.can_manage ?? false,
            can_delete_messages: input.can_delete_messages ?? false,
            is_active: true,
            assigned_at: new Date().toISOString(),
            assigned_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-session-permissions', sessionId] });
      toast.success('Permissão concedida');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Revogar permissão (soft delete)
  const revokePermission = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('whatsapp_session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-session-permissions', sessionId] });
      toast.success('Permissão revogada');
    },
  });

  // Mutation: Atualizar permissão específica
  const updatePermission = useMutation({
    mutationFn: async ({
      userId,
      ...updates
    }: {
      userId: string;
      can_view?: boolean;
      can_send?: boolean;
      can_manage?: boolean;
      can_delete_messages?: boolean;
    }) => {
      const { error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('whatsapp_session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-session-permissions', sessionId] });
      toast.success('Permissão atualizada');
    },
  });

  // Definir sessão padrão do usuário (não existe na tabela, função vazia)
  const setDefaultSession = useMutation({
    mutationFn: async () => {
      // A tabela não tem coluna is_default_session
      // Esta função é mantida para compatibilidade mas não faz nada
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-my-permissions'] });
    },
  });

  return {
    // Permissões do usuário atual
    myPermissions: myPermissions.data,
    canView,
    canSend,
    canManage,
    canDeleteMessages,
    canExport,
    canAssign,
    isLoading: myPermissions.isLoading || isTenantLoading,

    // Permissões da sessão (admin)
    sessionPermissions: sessionPermissions.data || [],
    isLoadingPermissions: sessionPermissions.isLoading,

    // Mutations
    grantPermission,
    revokePermission,
    updatePermission,
    setDefaultSession,
  };
}

// Hook para listar sessões que o usuário tem acesso
export function useMyWhatsAppSessionsMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['mt-whatsapp-my-sessions', tenant?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Permissions are simplified - all users can access. Restore granular filtering when needed.
      let q = supabase
        .from('mt_whatsapp_sessions')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });

      if (tenant && accessLevel !== 'platform') {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !isTenantLoading,
  });

  return {
    sessions: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
