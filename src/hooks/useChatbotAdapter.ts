// =============================================================================
// USE CHATBOT ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para módulo Chatbot IA
// SISTEMA 100% MT - Usa mt_chatbot_* diretamente via hooks MT
//
// =============================================================================

// Re-exportar tipos do hook MT
export type {
  ChatbotConfig,
  ChatbotConversation,
  ChatbotMessage,
  ChatbotAnalytics,
} from './multitenant/useChatbotMT';

// Re-exportar hooks MT diretamente (já incluem _mode: 'mt')
export {
  useChatbotConfigMT as useChatbotConfigAdapter,
  useChatbotConversationsMT as useChatbotConversationsAdapter,
  useChatbotMessagesMT as useChatbotMessagesAdapter,
  useChatbotAnalyticsMT as useChatbotAnalyticsAdapter,
} from './multitenant/useChatbotMT';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getChatbotMode(): 'mt' {
  return 'mt';
}

// Export default = config adapter
export { useChatbotConfigMT as default } from './multitenant/useChatbotMT';
