import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Loader2, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import type { WhatsAppMensagem } from "@/types/whatsapp-chat";
import MessageBubble from "./MessageBubble";
import { formatDateSeparator } from "./helpers";

interface MessageListProps {
  messages: WhatsAppMensagem[];
  isLoading: boolean;
  wahaApiUrl?: string;
  wahaApiKey?: string;
  onDeleteMessage?: (messageId: string, forEveryone: boolean) => Promise<void>;
  onReplyMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => Promise<void>;
  onUnpinMessage?: (messageId: string) => Promise<void>;
  onReactMessage?: (messageId: string, reaction: string) => Promise<void>;
  onRetryMessage?: (messageId: string) => void;
  onPhoneClick?: (phone: string) => void;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  searchOpen?: boolean;
  onCloseSearch?: () => void;
}

/**
 * WhatsApp-style chat background pattern (base64-encoded subtle pattern).
 */
const CHAT_BG_PATTERN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QIQERkVxjKHvAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABQklEQVRo3u2ZMQ6CQBBF/0JCYmVhYWNlZeUZPIiH0NpjeAcre9Za2HgAK0trGwsTYoLG4i8hGhZZnDWZeTXJ7Myb3Z1JVqCNNtpoo4022mg/tqIW3W73dVUKALBerwe6yEgW8FmE/0D4kEhNJrLQCYCHSLKYT+zEh8IHxL+HcLYTu8RnqcSeYSMYCW/REJ5kwq9uWwhXqd0CxkKY8PqTBuFfp3bLWVLtWFJNxoZh8PJ5Ph/LbwLh5XUcx3UJz4ZN/VLtGIbhixBuxnHsRBFkEkI4TWqF0O4k0kIId5L8WhPChHAnCZ5LpMYqBHMnC0/E6xpeCGYJWQjmnbRTSCEYLNXCb3fy7VQj3LJ0SqSFEO4kK9x0xXcigWDeSfsW4rmTdr6IEEI4W4jnTjp0YQSC+SctJxJY4KZL9sshkZC+nW20f20vfZ1YJq7hcF4AAAAASUVORK5CYII=";

export function MessageList({
  messages,
  isLoading,
  wahaApiUrl,
  wahaApiKey,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  onPinMessage,
  onUnpinMessage,
  onReactMessage,
  onRetryMessage,
  onPhoneClick,
  onLoadMore,
  hasMoreMessages = false,
  isLoadingMore = false,
  searchOpen = false,
  onCloseSearch,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setActiveSearchIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = messages
      .filter(m => m.body?.toLowerCase().includes(q))
      .map(m => m.id);
    setSearchResults(results);
    setActiveSearchIndex(results.length > 0 ? results.length - 1 : 0);
  }, [searchQuery, messages]);

  // Scroll to active search result
  useEffect(() => {
    if (searchResults.length === 0) return;
    const targetId = searchResults[activeSearchIndex];
    if (!targetId) return;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[#00a884]", "ring-opacity-50");
      setTimeout(() => el.classList.remove("ring-2", "ring-[#00a884]", "ring-opacity-50"), 2000);
    }
  }, [activeSearchIndex, searchResults]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  // Auto-scroll to bottom on initial load or new message at bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current) {
      // Primeiro carregamento: scroll direto ao fundo
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isInitialLoadRef.current = false;
      return;
    }

    // Se carregou mensagens antigas (scroll up), manter posição
    if (prevScrollHeightRef.current > 0 && container.scrollHeight > prevScrollHeightRef.current) {
      const diff = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += diff;
      prevScrollHeightRef.current = 0;
      return;
    }

    // Nova mensagem no final: scroll suave se estiver perto do fundo
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset on chat change
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevScrollHeightRef.current = 0;
  }, [messages.length === 0]);

  // Infinite scroll: load more when scrolling near top
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !onLoadMore || !hasMoreMessages || isLoadingMore) return;

    if (container.scrollTop < 100) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  }, [onLoadMore, hasMoreMessages, isLoadingMore]);

  // Group messages by date for date separators
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: WhatsAppMensagem[] }[] = [];
    let currentDate = "";

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.timestamp, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage: `url("${CHAT_BG_PATTERN}")`,
          backgroundRepeat: "repeat",
        }}
      >
        <div className="flex flex-col gap-3 max-w-[900px] mx-auto">
          {/* Skeleton messages */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 3 === 0 ? "justify-end" : "justify-start"}`}
            >
              <Skeleton
                className={`rounded-lg ${
                  i % 3 === 0
                    ? "bg-[#d9fdd3]/60 w-[45%] h-12"
                    : "bg-white/60 w-[55%] h-14"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage: `url("${CHAT_BG_PATTERN}")`,
          backgroundRepeat: "repeat",
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 mb-4 shadow-sm">
          <MessageSquare className="h-7 w-7 text-[#667781]" />
        </div>
        <p className="text-sm text-[#667781] bg-white/70 px-4 py-2 rounded-lg shadow-sm">
          Nenhuma mensagem nesta conversa
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-[#e9edef] flex-shrink-0">
          <Search className="h-4 w-4 text-[#667781] flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar mensagens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-[#111b21] placeholder-[#8696a0] bg-transparent outline-none"
          />
          {searchResults.length > 0 && (
            <span className="text-xs text-[#667781] flex-shrink-0">
              {activeSearchIndex + 1}/{searchResults.length}
            </span>
          )}
          <button
            onClick={() => setActiveSearchIndex(prev => Math.max(0, prev - 1))}
            disabled={searchResults.length === 0 || activeSearchIndex === 0}
            className="p-1 rounded hover:bg-[#f0f2f5] disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4 text-[#667781]" />
          </button>
          <button
            onClick={() => setActiveSearchIndex(prev => Math.min(searchResults.length - 1, prev + 1))}
            disabled={searchResults.length === 0 || activeSearchIndex === searchResults.length - 1}
            className="p-1 rounded hover:bg-[#f0f2f5] disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4 text-[#667781]" />
          </button>
          <button
            onClick={() => { setSearchQuery(""); onCloseSearch?.(); }}
            className="p-1 rounded hover:bg-[#f0f2f5]"
          >
            <X className="h-4 w-4 text-[#667781]" />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{
          backgroundColor: "#efeae2",
          backgroundImage: `url("${CHAT_BG_PATTERN}")`,
          backgroundRepeat: "repeat",
        }}
      >
        <div className="max-w-[900px] mx-auto px-3 sm:px-4 md:px-6 py-3">
          {/* Load more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="bg-white/90 rounded-full px-4 py-1.5 shadow-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#00a884]" />
                <span className="text-xs text-[#667781]">Carregando mensagens anteriores...</span>
              </div>
            </div>
          )}
          {hasMoreMessages && !isLoadingMore && (
            <div ref={topSentinelRef} className="h-1" />
          )}

          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date separator */}
              <div className="text-center my-3">
                <span className="bg-white/90 text-[#54656f] px-3 py-1.5 rounded-[7.5px] text-[12.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] inline-block font-medium">
                  {formatDateSeparator(group.date)}
                </span>
              </div>

              {/* Messages for this date */}
              {group.messages.map((msg) => (
                <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-300">
                  <MessageBubble
                    message={msg}
                    wahaApiUrl={wahaApiUrl}
                    wahaApiKey={wahaApiKey}
                    onDelete={onDeleteMessage}
                    onReply={onReplyMessage}
                    onForward={onForwardMessage}
                    onPin={onPinMessage ? () => onPinMessage(msg.id) : undefined}
                    onUnpin={onUnpinMessage ? () => onUnpinMessage(msg.id) : undefined}
                    onReact={onReactMessage ? (reaction) => onReactMessage(msg.id, reaction) : undefined}
                    onRetry={onRetryMessage}
                    onPhoneClick={onPhoneClick}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
