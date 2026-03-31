// Hook para gerenciar grupos do WhatsApp
// Viniun Sistema

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { toast } from 'sonner';

const GROUPS_KEY = 'whatsapp-groups';

export interface WhatsAppGroup {
  id: string;
  name: string;
  participants: GroupParticipant[];
  description?: string;
  inviteCode?: string;
  owner?: string;
  creation?: number;
  announce?: boolean; // Apenas admins podem enviar
  restrict?: boolean; // Apenas admins podem editar info
}

export interface GroupParticipant {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface CreateGroupInput {
  name: string;
  participants: string[]; // Array de números de telefone
}

export interface GroupSettingsInput {
  announce?: boolean;
  restrict?: boolean;
}

interface UseGroupsOptions {
  sessionId: string;
  enabled?: boolean;
}

/**
 * @deprecated Use useGroupsMT instead. This hook lacks tenant isolation.
 */
export function useGroups({ sessionId, enabled = true }: UseGroupsOptions) {
  const queryClient = useQueryClient();

  // Listar todos os grupos
  const groupsQuery = useQuery({
    queryKey: [GROUPS_KEY, sessionId],
    queryFn: async () => {
      const result = await wahaClient.getGroups(sessionId);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao listar grupos');
      }
      return result.data as WhatsAppGroup[];
    },
    enabled: !!sessionId && enabled,
    staleTime: 60000, // Cache por 1 minuto
  });

  // Obter informações de um grupo
  const getGroupInfo = async (groupId: string) => {
    const result = await wahaClient.getGroupInfo(sessionId, groupId);
    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar informações do grupo');
    }
    return result.data as WhatsAppGroup;
  };

  // Criar grupo
  const createGroup = useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      const result = await wahaClient.createGroup(sessionId, input.name, input.participants);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar grupo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  // Adicionar participantes
  const addParticipants = useMutation({
    mutationFn: async ({ groupId, participants }: { groupId: string; participants: string[] }) => {
      const result = await wahaClient.addGroupParticipants(sessionId, groupId, participants);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao adicionar participantes');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Participantes adicionados!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar participantes: ${error.message}`);
    },
  });

  // Remover participantes
  const removeParticipants = useMutation({
    mutationFn: async ({ groupId, participants }: { groupId: string; participants: string[] }) => {
      const result = await wahaClient.removeGroupParticipants(sessionId, groupId, participants);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao remover participantes');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Participantes removidos!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover participantes: ${error.message}`);
    },
  });

  // Promover a admin
  const promoteToAdmin = useMutation({
    mutationFn: async ({ groupId, participants }: { groupId: string; participants: string[] }) => {
      const result = await wahaClient.promoteGroupParticipants(sessionId, groupId, participants);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao promover participantes');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Participantes promovidos a administradores!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao promover participantes: ${error.message}`);
    },
  });

  // Rebaixar de admin
  const demoteFromAdmin = useMutation({
    mutationFn: async ({ groupId, participants }: { groupId: string; participants: string[] }) => {
      const result = await wahaClient.demoteGroupParticipants(sessionId, groupId, participants);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao rebaixar participantes');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Participantes rebaixados!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rebaixar participantes: ${error.message}`);
    },
  });

  // Atualizar nome do grupo
  const updateGroupName = useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const result = await wahaClient.updateGroupSubject(sessionId, groupId, name);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar nome do grupo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Nome do grupo atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar nome: ${error.message}`);
    },
  });

  // Atualizar descrição do grupo
  const updateGroupDescription = useMutation({
    mutationFn: async ({ groupId, description }: { groupId: string; description: string }) => {
      const result = await wahaClient.updateGroupDescription(sessionId, groupId, description);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar descrição do grupo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Descrição do grupo atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar descrição: ${error.message}`);
    },
  });

  // Atualizar configurações do grupo
  const updateGroupSettings = useMutation({
    mutationFn: async ({ groupId, settings }: { groupId: string; settings: GroupSettingsInput }) => {
      const result = await wahaClient.updateGroupSettings(sessionId, groupId, settings);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar configurações do grupo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Configurações do grupo atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    },
  });

  // Sair do grupo
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const result = await wahaClient.leaveGroup(sessionId, groupId);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao sair do grupo');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUPS_KEY, sessionId] });
      toast.success('Você saiu do grupo!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sair do grupo: ${error.message}`);
    },
  });

  // Obter link de convite
  const getInviteCode = async (groupId: string) => {
    const result = await wahaClient.getGroupInviteCode(sessionId, groupId);
    if (!result.success) {
      throw new Error(result.error || 'Erro ao obter link de convite');
    }
    return result.data?.code;
  };

  // Revogar link de convite
  const revokeInviteCode = useMutation({
    mutationFn: async (groupId: string) => {
      const result = await wahaClient.revokeGroupInviteCode(sessionId, groupId);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao revogar link de convite');
      }
      return result.data?.code;
    },
    onSuccess: () => {
      toast.success('Link de convite revogado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao revogar link: ${error.message}`);
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    error: groupsQuery.error,
    refetch: groupsQuery.refetch,

    getGroupInfo,
    createGroup,
    addParticipants,
    removeParticipants,
    promoteToAdmin,
    demoteFromAdmin,
    updateGroupName,
    updateGroupDescription,
    updateGroupSettings,
    leaveGroup,
    getInviteCode,
    revokeInviteCode,
  };
}
