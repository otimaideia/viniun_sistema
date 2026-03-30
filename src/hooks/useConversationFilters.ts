import { useState, useMemo } from 'react';
import type { WhatsAppConversa } from '@/types/whatsapp-chat';

export type FilterTab = 'all' | 'mine' | 'unread' | 'favorites' | 'groups' | 'archived';

export interface AssignedUser {
  id: string; // assigned_to value (primary)
  name: string;
  count: number;
  allIds?: string[]; // all assigned_to values for this user (handles auth_user_id vs mt_users.id)
}

// Verifica se uma conversa é broadcast/status (não deve aparecer em conversas diretas)
function isBroadcastOrStatus(c: WhatsAppConversa): boolean {
  const chatId = c.chat_id || '';
  return chatId === 'status@broadcast' ||
    chatId.includes('@broadcast') ||
    chatId.includes('@newsletter');
}

// Verifica se é grupo ou broadcast
function isGroupOrBroadcast(c: WhatsAppConversa): boolean {
  return c.is_group || isBroadcastOrStatus(c);
}

export function useConversationFilters(chats: WhatsAppConversa[], currentUserId?: string | string[] | null) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedAssignedUser, setSelectedAssignedUser] = useState<string | null>(null); // null = "Minhas" (eu), string = outro user

  // Extrair lista de responsáveis únicos dos chats (deduplicar por nome)
  const assignedUsers = useMemo(() => {
    const userMap = new Map<string, { ids: Set<string>; name: string; count: number }>();
    for (const c of chats) {
      if (c.assigned_to && c.assigned_user_name && !isGroupOrBroadcast(c)) {
        const nameKey = c.assigned_user_name.toLowerCase();
        const existing = userMap.get(nameKey);
        if (existing) {
          existing.count++;
          existing.ids.add(c.assigned_to);
        } else {
          userMap.set(nameKey, { ids: new Set([c.assigned_to]), name: c.assigned_user_name, count: 1 });
        }
      }
    }
    const result: AssignedUser[] = [];
    userMap.forEach((val) => {
      // Usar o primeiro ID como referência, mas guardar todos
      const firstId = Array.from(val.ids)[0];
      result.push({ id: firstId, name: val.name, count: val.count, allIds: Array.from(val.ids) });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [chats]);

  // Total de conversas atribuídas (para qualquer pessoa)
  const totalAssigned = useMemo(() => {
    return chats.filter(c => c.assigned_to && !isGroupOrBroadcast(c)).length;
  }, [chats]);

  const filteredChats = useMemo(() => {
    let result = chats;

    // Filter by tab
    switch (activeTab) {
      case 'all':
        // Apenas conversas diretas (1-a-1): excluir grupos, broadcasts, status e arquivadas
        result = result.filter(c => !isGroupOrBroadcast(c) && c.status !== 'archived' && c.status !== 'arquivada');
        break;
      case 'archived':
        // Apenas conversas arquivadas (excluir grupos/broadcasts)
        result = result.filter(c => (c.status === 'archived' || c.status === 'arquivada') && !isGroupOrBroadcast(c));
        break;
      case 'mine':
        if (selectedAssignedUser === '__all__') {
          // Todas as conversas atribuídas a qualquer pessoa
          result = result.filter(c => c.assigned_to && !isGroupOrBroadcast(c));
        } else if (selectedAssignedUser) {
          // Filtrar por responsável selecionado no dropdown (pode ter múltiplos IDs)
          const selectedUser = assignedUsers.find(u => u.id === selectedAssignedUser);
          const targetIds = selectedUser?.allIds || [selectedAssignedUser];
          result = result.filter(c => c.assigned_to && targetIds.includes(c.assigned_to) && !isGroupOrBroadcast(c));
        } else {
          // Minhas conversas: atribuídas ao usuário atual
          const myIds = Array.isArray(currentUserId) ? currentUserId : [currentUserId];
          result = result.filter(c => c.assigned_to && myIds.includes(c.assigned_to) && !isGroupOrBroadcast(c));
        }
        break;
      case 'unread':
        // Não lidas: apenas conversas diretas
        result = result.filter(c => (c.unread_count || 0) > 0 && !isGroupOrBroadcast(c));
        break;
      case 'favorites':
        result = result.filter(c => c.is_pinned && !isBroadcastOrStatus(c));
        break;
      case 'groups':
        // Grupos e broadcasts
        result = result.filter(c => c.is_group || isBroadcastOrStatus(c));
        break;
    }

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(c =>
        (c.nome_contato?.toLowerCase().includes(term)) ||
        (c.numero_telefone?.includes(term)) ||
        (c.ultima_mensagem_texto?.toLowerCase().includes(term))
      );
    }

    // Filter by labels (if any selected)
    if (selectedLabelIds.length > 0) {
      result = result.filter(c =>
        c.labels?.some(l => selectedLabelIds.includes(l.id))
      );
    }

    return result;
  }, [chats, activeTab, searchTerm, selectedLabelIds, currentUserId, selectedAssignedUser]);

  const counts = useMemo(() => ({
    all: chats.filter(c => !isGroupOrBroadcast(c) && c.status !== 'archived' && c.status !== 'arquivada').length,
    mine: totalAssigned,
    unread: chats.filter(c => (c.unread_count || 0) > 0 && !isGroupOrBroadcast(c)).length,
    favorites: chats.filter(c => c.is_pinned && !isBroadcastOrStatus(c)).length,
    groups: chats.filter(c => c.is_group || isBroadcastOrStatus(c)).length,
    archived: chats.filter(c => (c.status === 'archived' || c.status === 'arquivada') && !isGroupOrBroadcast(c)).length,
  }), [chats, totalAssigned]);

  return {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    selectedLabelIds,
    setSelectedLabelIds,
    selectedAssignedUser,
    setSelectedAssignedUser,
    assignedUsers,
    filteredChats,
    counts,
  };
}
