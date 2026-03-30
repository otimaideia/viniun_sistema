// Hook para gerenciar contatos do WhatsApp

import { useQuery } from '@tanstack/react-query';
import { wahaClient } from '@/services/waha/wahaDirectClient';

export interface WAHAContact {
  id: string;
  name?: string;
  pushname?: string;
  isMyContact?: boolean;
  isBlocked?: boolean;
  isBusiness?: boolean;
  isEnterprise?: boolean;
  isGroup?: boolean;
  isUser?: boolean;
  profilePicUrl?: string;
  shortName?: string;
  verifiedName?: string;
  about?: string;
  phone?: string;
}

interface UseContactOptions {
  sessionName: string;
  contactId: string;
  enabled?: boolean;
}

/**
 * @deprecated Use useWhatsAppConversationsAdapter instead. This hook lacks tenant isolation.
 */
export function useContact({ sessionName, contactId, enabled = true }: UseContactOptions) {
  // Buscar informações do contato
  const contactQuery = useQuery({
    queryKey: ['whatsapp-contact', sessionName, contactId],
    queryFn: async (): Promise<WAHAContact | null> => {
      const result = await wahaClient.getContact(sessionName, contactId);

      if (!result.success) {
        console.warn('[useContact] Erro ao buscar contato:', result.error);
        return null;
      }

      return result.data as WAHAContact;
    },
    enabled: !!sessionName && !!contactId && enabled,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  // Buscar foto de perfil
  const profilePictureQuery = useQuery({
    queryKey: ['whatsapp-profile-picture', sessionName, contactId],
    queryFn: async (): Promise<string | null> => {
      const result = await wahaClient.getProfilePicture(sessionName, contactId);

      if (!result.success || !result.data) {
        return null;
      }

      return (result.data as { url: string }).url;
    },
    enabled: !!sessionName && !!contactId && enabled,
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
    retry: 1,
  });

  return {
    contact: contactQuery.data,
    profilePicture: profilePictureQuery.data,
    isLoading: contactQuery.isLoading || profilePictureQuery.isLoading,
    error: contactQuery.error || profilePictureQuery.error,
    refetch: () => {
      contactQuery.refetch();
      profilePictureQuery.refetch();
    },
  };
}

interface UseContactsOptions {
  sessionName: string;
  enabled?: boolean;
}

export function useContacts({ sessionName, enabled = true }: UseContactsOptions) {
  // Listar todos os contatos
  const contactsQuery = useQuery({
    queryKey: ['whatsapp-contacts', sessionName],
    queryFn: async (): Promise<WAHAContact[]> => {
      const result = await wahaClient.getContacts(sessionName);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao listar contatos');
      }

      return (result.data || []) as WAHAContact[];
    },
    enabled: !!sessionName && enabled,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    refetch: contactsQuery.refetch,
  };
}
