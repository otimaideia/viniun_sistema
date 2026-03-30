import React, { createContext, useContext, type ReactNode } from 'react';
import type { WhatsAppConversa, WhatsAppMensagem } from '@/types/whatsapp-chat';
import type { ContactData } from '@/components/whatsapp/chat/ContactDialog';
import type { PollData } from '@/components/whatsapp/chat/PollDialog';
import type { LocationData } from '@/components/whatsapp/chat/LocationDialog';
import type { EventData } from '@/components/whatsapp/chat/EventDialog';
import type { LeadFieldData } from '@/components/whatsapp/chat/DynamicFieldMenu';

export type SendResult = { success: boolean; error?: string };

export interface ChatContextValue {
  // Dados do chat
  selectedChat: WhatsAppConversa | null;
  messages: WhatsAppMensagem[];
  isLoadingMessages: boolean;

  // WAHA config
  wahaApiUrl?: string;
  wahaApiKey?: string;
  sessionName?: string | null;

  // Envio de mensagens
  sendMessage: (text: string, quotedId?: string) => Promise<SendResult>;
  sendMedia?: (file: File, type: 'image' | 'document' | 'audio' | 'video', caption?: string) => Promise<SendResult>;
  sendContact?: (contact: ContactData) => Promise<SendResult>;
  sendPoll?: (poll: PollData) => Promise<SendResult>;
  sendLocation?: (location: LocationData) => Promise<SendResult>;
  sendEvent?: (event: EventData) => Promise<SendResult>;

  // Ações de mensagem
  deleteMessage?: (id: string, forEveryone: boolean) => Promise<void>;
  pinMessage?: (id: string) => Promise<void>;
  unpinMessage?: (id: string) => Promise<void>;
  reactMessage?: (id: string, reaction: string) => Promise<void>;
  retryMessage?: (id: string) => void;
  forwardMessage?: (id: string) => void;

  // Scroll/Pagination
  loadMoreMessages?: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;

  // Conversa
  archiveConversation?: () => void;
  unarchiveConversation?: () => void;
  markAsUnread?: () => void;
  blockContact?: () => void;
  unblockContact?: () => void;
  isArchived: boolean;
  isBlocked: boolean;

  // Painéis
  toggleCrmPanel: () => void;
  crmPanelOpen: boolean;
  toggleAiPanel?: () => void;
  aiPanelOpen: boolean;
  onBack?: () => void;
  showBackButton: boolean;

  // Bot / Assignment
  isBotActive: boolean;
  toggleBot?: () => void;
  assignedUserName?: string | null;

  // Permissões
  canSend: boolean;
  isLoadingPermissions: boolean;

  // Lead
  leadData?: LeadFieldData | null;
  onSlashCommand?: (action: string) => void;

  // Search
  searchInConversation?: () => void;

  // Phone click (click-to-chat)
  onPhoneClick?: (phone: string) => void;

  // Hybrid routing
  isHybridEnabled: boolean;
  routingProvider: 'waha' | 'meta_cloud_api' | null;
  windowOpen: boolean;
  windowTimeRemaining: string | null;
  windowType: '24h' | '72h' | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ value, children }: { value: ChatContextValue; children: ReactNode }) {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

/**
 * Optional hook — returns undefined if outside provider (for backward compatibility).
 */
export function useChatContextOptional(): ChatContextValue | undefined {
  return useContext(ChatContext);
}
