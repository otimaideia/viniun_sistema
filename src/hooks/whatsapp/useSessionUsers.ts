// Hook para gerenciar vínculos entre usuários e sessões WhatsApp
// Implementa sistema hierárquico de acesso:
// - Super Admin: vê tudo
// - Admin/Gestor da Franquia: vê e gerencia todos da franquia
// - Usuário comum: vê apenas sessões vinculadas

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SessionUserLink, FranchiseUserForSession } from '@/types/whatsapp';

interface UseSessionUsersOptions {
  sessionId?: string;
  franqueadoId?: string;
}

const QUERY_KEY = 'whatsapp-session-users';

/**
 * @deprecated Use useWhatsAppPermissionsMT instead. This hook lacks tenant isolation.
 */
export function useSessionUsers(options: UseSessionUsersOptions = {}) {
  const { sessionId, franqueadoId } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLinking, setIsLinking] = useState(false);

  // ========================================
  // QUERY: Listar usuários vinculados a uma sessão
  // ========================================
  const linkedUsersQuery = useQuery({
    queryKey: [QUERY_KEY, 'linked', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      // Buscar vínculos (sem join - FK é para auth.users que está em outro schema)
      const { data: linksData, error: linksError } = await supabase
        .from('mt_whatsapp_user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('granted_at', { ascending: false });

      if (linksError) {
        console.error('[useSessionUsers] Erro ao buscar vínculos:', linksError);
        throw linksError;
      }

      if (!linksData || linksData.length === 0) {
        return [];
      }

      const userIds = linksData.map(l => l.user_id);

      // Buscar perfis dos usuários (mt_users usa auth_user_id para vincular com auth.users)
      const { data: profilesData } = await supabase
        .from('mt_users')
        .select('auth_user_id, nome')
        .in('auth_user_id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.auth_user_id, p]));

      // Buscar roles dos usuários
      const { data: rolesData } = await supabase
        .from('mt_user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

      // Montar resultado com dados disponíveis
      const result: SessionUserLink[] = linksData.map(link => {
        const profile = profilesMap.get(link.user_id);
        const role = rolesMap.get(link.user_id);
        return {
          ...link,
          user: {
            id: link.user_id,
            email: profile?.nome || `Usuário ${link.user_id.slice(0, 8)}...`,
            raw_user_meta_data: {
              full_name: profile?.nome || (role ? `Função: ${role}` : undefined),
              name: profile?.nome,
            },
          },
        };
      });

      return result;
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 segundos
  });

  // ========================================
  // QUERY: Listar todos usuários da franquia (para modal de seleção)
  // ========================================
  const franchiseUsersQuery = useQuery({
    queryKey: [QUERY_KEY, 'franchise', franqueadoId, sessionId],
    queryFn: async () => {
      if (!franqueadoId) return [];

      // Buscar usuários com acesso à franquia (tabela mt_user_franchises)
      const { data: accessData, error: accessError } = await supabase
        .from('mt_user_franchises')
        .select('user_id, is_active')
        .eq('franchise_id', franqueadoId)
        .eq('is_active', true);

      if (accessError) {
        console.error('[useSessionUsers] Erro ao buscar acessos da franquia:', accessError);
        throw accessError;
      }

      if (!accessData || accessData.length === 0) {
        return [];
      }

      const userIds = accessData.map(a => a.user_id);

      // Buscar vínculos existentes com a sessão (se sessionId fornecido)
      let linkedUserIds: string[] = [];
      if (sessionId) {
        const { data: linkedData } = await supabase
          .from('mt_whatsapp_user_sessions')
          .select('user_id')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        linkedUserIds = (linkedData || []).map(l => l.user_id);
      }

      // Buscar perfis dos usuários (mt_users usa auth_user_id para vincular com auth.users)
      const { data: profilesData } = await supabase
        .from('mt_users')
        .select('auth_user_id, nome')
        .in('auth_user_id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.auth_user_id, p]));

      // Buscar roles dos usuários
      const { data: rolesData } = await supabase
        .from('mt_user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

      // Mapear para formato uniforme com dados dos perfis
      const users: FranchiseUserForSession[] = userIds.map(userId => {
        const profile = profilesMap.get(userId);
        return {
          user_id: userId,
          email: profile?.nome || `Usuário ${userId.slice(0, 8)}...`,
          full_name: profile?.nome || null,
          role: rolesMap.get(userId) || 'user',
          is_linked: linkedUserIds.includes(userId),
        };
      });

      return users;
    },
    enabled: !!franqueadoId,
    staleTime: 60000, // 1 minuto
  });

  // ========================================
  // MUTATION: Vincular usuário à sessão
  // ========================================
  const linkUserMutation = useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          granted_by: user?.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,session_id',
        })
        .select()
        .single();

      if (error) {
        console.error('[useSessionUsers] Erro ao vincular usuário:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // ========================================
  // MUTATION: Desvincular usuário da sessão
  // ========================================
  const unlinkUserMutation = useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
      // Soft delete: marcar como inativo
      const { error } = await supabase
        .from('mt_whatsapp_user_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        console.error('[useSessionUsers] Erro ao desvincular usuário:', error);
        throw error;
      }

      return { userId, sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // ========================================
  // MUTATION: Vincular/Desvincular múltiplos usuários
  // ========================================
  const updateSessionUsersMutation = useMutation({
    mutationFn: async ({
      sessionId,
      userIdsToLink,
      userIdsToUnlink,
    }: {
      sessionId: string;
      userIdsToLink: string[];
      userIdsToUnlink: string[];
    }) => {
      setIsLinking(true);

      try {
        // Vincular novos usuários
        if (userIdsToLink.length > 0) {
          const linksToCreate = userIdsToLink.map(userId => ({
            user_id: userId,
            session_id: sessionId,
            granted_by: user?.id,
            is_active: true,
          }));

          const { error: linkError } = await supabase
            .from('mt_whatsapp_user_sessions')
            .upsert(linksToCreate, { onConflict: 'user_id,session_id' });

          if (linkError) {
            console.error('[useSessionUsers] Erro ao vincular usuários:', linkError);
            throw linkError;
          }
        }

        // Desvincular usuários removidos
        if (userIdsToUnlink.length > 0) {
          const { error: unlinkError } = await supabase
            .from('mt_whatsapp_user_sessions')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('session_id', sessionId)
            .in('user_id', userIdsToUnlink);

          if (unlinkError) {
            console.error('[useSessionUsers] Erro ao desvincular usuários:', unlinkError);
            throw unlinkError;
          }
        }

        return {
          linked: userIdsToLink.length,
          unlinked: userIdsToUnlink.length,
        };
      } finally {
        setIsLinking(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // ========================================
  // HELPERS
  // ========================================

  // Vincular um único usuário
  const linkUser = useCallback(
    async (userId: string, targetSessionId?: string) => {
      const sid = targetSessionId || sessionId;
      if (!sid) throw new Error('sessionId é obrigatório');
      return linkUserMutation.mutateAsync({ userId, sessionId: sid });
    },
    [sessionId, linkUserMutation]
  );

  // Desvincular um único usuário
  const unlinkUser = useCallback(
    async (userId: string, targetSessionId?: string) => {
      const sid = targetSessionId || sessionId;
      if (!sid) throw new Error('sessionId é obrigatório');
      return unlinkUserMutation.mutateAsync({ userId, sessionId: sid });
    },
    [sessionId, unlinkUserMutation]
  );

  // Atualizar lista de usuários vinculados (batch)
  const updateLinkedUsers = useCallback(
    async (selectedUserIds: string[], targetSessionId?: string) => {
      const sid = targetSessionId || sessionId;
      if (!sid) throw new Error('sessionId é obrigatório');

      // Calcular diferenças
      const currentLinkedIds = linkedUsersQuery.data?.map(u => u.user_id) || [];
      const userIdsToLink = selectedUserIds.filter(id => !currentLinkedIds.includes(id));
      const userIdsToUnlink = currentLinkedIds.filter(id => !selectedUserIds.includes(id));

      return updateSessionUsersMutation.mutateAsync({
        sessionId: sid,
        userIdsToLink,
        userIdsToUnlink,
      });
    },
    [sessionId, linkedUsersQuery.data, updateSessionUsersMutation]
  );

  // Refetch
  const refetch = useCallback(() => {
    linkedUsersQuery.refetch();
    franchiseUsersQuery.refetch();
  }, [linkedUsersQuery, franchiseUsersQuery]);

  return {
    // Dados
    linkedUsers: linkedUsersQuery.data || [],
    franchiseUsers: franchiseUsersQuery.data || [],

    // Estados de loading
    isLoadingLinkedUsers: linkedUsersQuery.isLoading,
    isLoadingFranchiseUsers: franchiseUsersQuery.isLoading,
    isLinking,
    isMutating:
      linkUserMutation.isPending ||
      unlinkUserMutation.isPending ||
      updateSessionUsersMutation.isPending,

    // Erros
    linkedUsersError: linkedUsersQuery.error,
    franchiseUsersError: franchiseUsersQuery.error,

    // Ações
    linkUser,
    unlinkUser,
    updateLinkedUsers,
    refetch,

    // Mutations diretas (para uso avançado)
    linkUserMutation,
    unlinkUserMutation,
    updateSessionUsersMutation,
  };
}

export default useSessionUsers;
