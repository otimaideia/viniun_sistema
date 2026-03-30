import React, { useState, useCallback } from "react";
import { EmptyStateView } from "./EmptyStateView";
import { ChatHeaderV2 } from "./ChatHeaderV2";
import { MessageList } from "./MessageList";
import { ChatInput, type ReplyPreview } from "@/components/whatsapp/chat/ChatInput";
import { useContactPresence } from "@/hooks/useContactPresence";
import { useChatContext } from "@/contexts/ChatContext";

/**
 * Chat area panel — uses ChatContext for all data and actions.
 * No more prop drilling (previously 83 props).
 */
export function ChatAreaPanel() {
  const ctx = useChatContext();
  const [replyToMessage, setReplyToMessage] = useState<ReplyPreview | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Contact presence (typing + online/offline)
  const { isOnline, isTyping, lastSeen } = useContactPresence(
    ctx.sessionName || null,
    ctx.selectedChat?.chat_id || null,
    ctx.selectedChat?.is_group || false
  );

  const handleReplyMessage = useCallback((messageId: string) => {
    const msg = ctx.messages.find(m => (m.message_id || m.id) === messageId || m.id === messageId);
    if (msg) {
      setReplyToMessage({
        id: msg.message_id || msg.id,
        body: msg.body,
        from_me: msg.direction === 'outbound',
        senderName: msg.direction === 'inbound' ? null : 'Você',
      });
    }
  }, [ctx.messages]);

  const handleSendWithReply = useCallback(async (text: string, quotedId?: string) => {
    const result = await ctx.sendMessage(text, quotedId || replyToMessage?.id);
    if (result.success) {
      setReplyToMessage(null);
    }
    return result;
  }, [ctx.sendMessage, replyToMessage]);

  // No chat selected: show empty state
  if (!ctx.selectedChat) {
    return <EmptyStateView />;
  }

  return (
    <div className="flex h-full flex-col bg-[#efeae2]">
      {/* Chat header */}
      <ChatHeaderV2
        chat={ctx.selectedChat}
        onToggleCrmPanel={ctx.toggleCrmPanel}
        crmPanelOpen={ctx.crmPanelOpen}
        onToggleAiPanel={ctx.toggleAiPanel}
        aiPanelOpen={ctx.aiPanelOpen}
        onBack={ctx.onBack}
        showBackButton={ctx.showBackButton}
        isBotActive={ctx.isBotActive}
        onToggleBot={ctx.toggleBot}
        assignedUserName={ctx.assignedUserName}
        isContactOnline={isOnline}
        isContactTyping={isTyping}
        lastSeen={lastSeen}
        isHybridEnabled={ctx.isHybridEnabled}
        routingProvider={ctx.routingProvider}
        windowOpen={ctx.windowOpen}
        windowTimeRemaining={ctx.windowTimeRemaining}
        windowType={ctx.windowType}
        onArchive={ctx.archiveConversation}
        onUnarchive={ctx.unarchiveConversation}
        onMarkAsUnread={ctx.markAsUnread}
        isArchived={ctx.isArchived}
        onBlockContact={ctx.blockContact}
        onUnblockContact={ctx.unblockContact}
        isBlocked={ctx.isBlocked}
        onSearchInConversation={() => setSearchOpen(prev => !prev)}
      />

      {/* Message list */}
      <MessageList
        messages={ctx.messages}
        isLoading={ctx.isLoadingMessages}
        wahaApiUrl={ctx.wahaApiUrl}
        wahaApiKey={ctx.wahaApiKey}
        onDeleteMessage={ctx.deleteMessage}
        onReplyMessage={handleReplyMessage}
        onForwardMessage={ctx.forwardMessage}
        onPinMessage={ctx.pinMessage}
        onUnpinMessage={ctx.unpinMessage}
        onReactMessage={ctx.reactMessage}
        onRetryMessage={ctx.retryMessage}
        onPhoneClick={ctx.onPhoneClick}
        onLoadMore={ctx.loadMoreMessages}
        hasMoreMessages={ctx.hasMoreMessages}
        isLoadingMore={ctx.isLoadingMore}
        searchOpen={searchOpen}
        onCloseSearch={() => setSearchOpen(false)}
      />

      {/* Input area */}
      <ChatInput
        onSend={handleSendWithReply}
        onSendMedia={ctx.sendMedia}
        onSendContact={ctx.sendContact}
        onSendPoll={ctx.sendPoll}
        onSendLocation={ctx.sendLocation}
        onSendEvent={ctx.sendEvent}
        canSend={ctx.canSend}
        disabled={ctx.isLoadingPermissions}
        leadData={ctx.leadData}
        onSlashCommand={ctx.onSlashCommand}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        conversationId={ctx.selectedChat?.id}
      />
    </div>
  );
}
