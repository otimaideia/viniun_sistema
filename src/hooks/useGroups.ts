import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupParticipant {
  id: string;
  phone: string;
  name?: string;
  isAdmin: boolean;
}

interface Group {
  id: string;
  jid: string;
  name: string;
  description?: string;
  owner?: string;
  participants: GroupParticipant[];
  participantsCount: number;
  createdAt?: string;
  isReadOnly: boolean;
}

interface CreateGroupData {
  name: string;
  participants: string[]; // Array de números de telefone
}

/**
 * Hook para gerenciar grupos do WhatsApp
 */
export function useGroups(sessionName: string | undefined, sessaoId: string | undefined) {
  const queryClient = useQueryClient();

  // Buscar lista de grupos
  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp_groups', sessaoId],
    queryFn: async (): Promise<Group[]> => {
      if (!sessionName || !sessaoId) return [];

      try {
        // Chamar edge function para buscar grupos do WAHA
        const { data, error } = await supabase.functions.invoke('waha-proxy', {
          body: {
            action: 'list-groups',
            sessionName,
          },
        });

        if (error) throw error;

        return (data?.groups || []).map((g: any) => ({
          id: g.id,
          jid: g.id,
          name: g.name || g.subject || 'Grupo',
          description: g.description,
          owner: g.owner,
          participants: (g.participants || []).map((p: any) => ({
            id: p.id,
            phone: p.id?.split('@')[0] || '',
            name: p.name,
            isAdmin: p.isAdmin || p.isSuperAdmin || false,
          })),
          participantsCount: g.participants?.length || 0,
          createdAt: g.creation,
          isReadOnly: g.announce || false,
        }));
      } catch (err) {
        console.error('Erro ao buscar grupos:', err);
        return [];
      }
    },
    enabled: !!sessionName && !!sessaoId,
    staleTime: 60000, // 1 minuto
  });

  // Criar novo grupo
  const createGroup = useMutation({
    mutationFn: async (data: CreateGroupData) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data: result, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'create-group',
          sessionName,
          name: data.name,
          participants: data.participants,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  // Adicionar participante ao grupo
  const addParticipant = useMutation({
    mutationFn: async ({ groupId, phone }: { groupId: string; phone: string }) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'add-participant',
          sessionName,
          groupId,
          participant: phone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Participante adicionado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar participante: ${error.message}`);
    },
  });

  // Remover participante do grupo
  const removeParticipant = useMutation({
    mutationFn: async ({ groupId, phone }: { groupId: string; phone: string }) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'remove-participant',
          sessionName,
          groupId,
          participant: phone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Participante removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover participante: ${error.message}`);
    },
  });

  // Promover participante a admin
  const promoteToAdmin = useMutation({
    mutationFn: async ({ groupId, phone }: { groupId: string; phone: string }) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'promote-participant',
          sessionName,
          groupId,
          participant: phone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Participante promovido a admin!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao promover participante: ${error.message}`);
    },
  });

  // Rebaixar admin para participante comum
  const demoteFromAdmin = useMutation({
    mutationFn: async ({ groupId, phone }: { groupId: string; phone: string }) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'demote-participant',
          sessionName,
          groupId,
          participant: phone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Admin rebaixado para participante!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rebaixar admin: ${error.message}`);
    },
  });

  // Sair do grupo
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'leave-group',
          sessionName,
          groupId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Você saiu do grupo!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sair do grupo: ${error.message}`);
    },
  });

  // Atualizar informações do grupo
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, name, description }: { groupId: string; name?: string; description?: string }) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'update-group',
          sessionName,
          groupId,
          name,
          description,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_groups', sessaoId] });
      toast.success('Grupo atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });

  // Buscar grupo por ID
  const getGroup = (groupId: string): Group | undefined => {
    return groups.find(g => g.id === groupId || g.jid === groupId);
  };

  return {
    groups,
    isLoading,
    error,
    refetch,
    createGroup: createGroup.mutate,
    createGroupAsync: createGroup.mutateAsync,
    isCreating: createGroup.isPending,
    addParticipant: addParticipant.mutate,
    removeParticipant: removeParticipant.mutate,
    promoteToAdmin: promoteToAdmin.mutate,
    demoteFromAdmin: demoteFromAdmin.mutate,
    leaveGroup: leaveGroup.mutate,
    updateGroup: updateGroup.mutate,
    getGroup,
    groupCount: groups.length,
  };
}

export default useGroups;
