/**
 * @deprecated This barrel file exports legacy WhatsApp hooks.
 * Use the MT/adapter versions from @/hooks/multitenant/ or @/hooks/ instead.
 */
// Hooks para integração WhatsApp - YESlaser
// Baseado na implementação completa do POPdents

// Sessões
export { useWhatsAppSessions } from './useWhatsAppSessions';
export type { WhatsAppSession, CreateSessionInput, UpdateSessionInput } from './useWhatsAppSessions';

// Conversas
export { useConversations, useRealtimeConversations } from './useConversations';

// Mensagens
export { useMessages } from './useMessages';
export { useMessagesHybrid } from './useMessagesHybrid';

// Envio
export { useSendMessage } from './useSendMessage';

// Templates e Respostas Rápidas
export { useQuickReplies } from './useQuickReplies';
export { useTemplates } from './useTemplates';

// Sincronização
export { useSyncMessages } from './useSyncMessages';
export { useBackgroundSync } from './useBackgroundSync';

// Real-time
export { useRealtimeMessages, useRealtimeConversation } from './useRealtimeMessages';

// Webhook
export { useWebhookConfig } from './useWebhookConfig';

// Labels/Etiquetas → migrado para hooks/multitenant/useWhatsAppLabelsMT.ts

// Ações de Chat
export { useChatActions } from './useChatActions';

// Contatos
export { useContact, useContacts } from './useContacts';
export type { WAHAContact } from './useContacts';

// Status/Stories
export { useStatus, STATUS_BACKGROUND_COLORS, STATUS_FONTS } from './useStatus';

// Vinculação com Leads
export { useLinkLead } from './useLinkLead';

// Grupos
export { useGroups } from './useGroups';
export type { WhatsAppGroup, GroupParticipant, CreateGroupInput, GroupSettingsInput } from './useGroups';

// Métricas
export { useMetrics } from './useMetrics';
export type { WhatsAppMetrics } from './useMetrics';

// Automações
export { useAutomations, AUTOMATION_TYPE_LABELS, AUTOMATION_TYPE_DESCRIPTIONS, WEEKDAY_LABELS } from './useAutomations';
export type { WhatsAppAutomation, AutomationType, CreateAutomationInput, UpdateAutomationInput } from './useAutomations';

// Exportação de Histórico
export { useExportHistory } from './useExportHistory';
export type { ExportFormat, ExportOptions } from './useExportHistory';
