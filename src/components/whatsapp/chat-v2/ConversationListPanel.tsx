import React, { useRef, useEffect, useCallback } from "react";
import { Search, ArrowLeft, RefreshCw, MessageSquare, Phone, Wifi, WifiOff, Loader2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WhatsAppConversa } from "@/types/whatsapp-chat";
import type { FilterTab, AssignedUser } from "@/hooks/useConversationFilters";
import { ConversationItem } from "./ConversationItem";
import { ConversationFilterTabs } from "./ConversationFilterTabs";
import { generateDefaultAvatar } from "@/services/waha-api";
import { safeText } from "./helpers";

interface LabelOption {
  id: string;
  name: string;
  color: string | null;
}

interface ConversationListPanelProps {
  sessionName: string;
  sessionPhone?: string | null;
  sessionStatus?: string;
  sessionAvatar?: string | null;
  chatCount: number;
  chats: WhatsAppConversa[];
  selectedChatId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
  onSelectChat: (chatId: string) => void;
  onSync: () => void;
  onBack: () => void;
  labels?: LabelOption[];
  selectedLabelIds?: string[];
  onLabelFilterChange?: (labelIds: string[]) => void;
  onArchiveConversation?: (chatId: string) => void;
  onUnarchiveConversation?: (chatId: string) => void;
  onMarkAsUnread?: (chatId: string) => void;
  onMarkAsRead?: (chatId: string) => void;
  assignedUsers?: AssignedUser[];
  selectedAssignedUser?: string | null;
  onAssignedUserChange?: (userId: string | null) => void;
  // Pagination
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  // Server-side search
  isSearching?: boolean;
  // Session switcher
  availableSessions?: Array<{ id: string; nome: string; telefone?: string | null; status?: string | null; display_name?: string | null }>;
  currentSessionId?: string;
  onSwitchSession?: (sessionId: string) => void;
}

// Formatar telefone para exibição
function formatPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) {
    // +55 13 99999-9999
    return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12) {
    return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,8)}-${clean.slice(8)}`;
  }
  if (clean.length >= 10) {
    return `+${clean}`;
  }
  return phone;
}

export function ConversationListPanel({
  sessionName,
  sessionPhone,
  sessionStatus,
  sessionAvatar,
  chatCount,
  chats,
  selectedChatId,
  isLoading,
  isSyncing,
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  counts,
  onSelectChat,
  onSync,
  onBack,
  labels = [],
  selectedLabelIds = [],
  onLabelFilterChange,
  onArchiveConversation,
  onUnarchiveConversation,
  onMarkAsUnread,
  onMarkAsRead,
  assignedUsers = [],
  selectedAssignedUser = null,
  onAssignedUserChange,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isSearching = false,
  availableSessions = [],
  currentSessionId,
  onSwitchSession,
}: ConversationListPanelProps) {
  const isConnected = sessionStatus === 'working' || sessionStatus === 'connected';
  const formattedPhone = formatPhone(sessionPhone);
  const initials = Array.from(sessionName).slice(0, 2).join("").toUpperCase();

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || isLoadingMore || !loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && onLoadMoreRef.current) {
          onLoadMoreRef.current();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header com info do agente */}
      <div className="flex items-center gap-2 bg-[#f0f2f5] border-b border-[#e9edef] px-2.5 h-[56px] flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#54656f] hover:bg-[#e9edef] flex-shrink-0"
          onClick={onBack}
          title="Voltar para sessoes"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Avatar + Info do agente — clicável para trocar sessão */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-[#e9edef] rounded-lg px-1.5 py-1 transition-colors cursor-pointer">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={sessionAvatar || generateDefaultAvatar(sessionName)} alt={sessionName} />
                  <AvatarFallback className="bg-[#00a884] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#f0f2f5] ${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1">
                  <h2 className="text-[13px] font-semibold text-[#111b21] truncate leading-tight">
                    {safeText(sessionName)}
                  </h2>
                  {availableSessions.length > 1 && (
                    <ChevronDown className="h-3 w-3 text-[#667781] flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {formattedPhone && (
                    <span className="text-[11px] text-[#667781] flex items-center gap-0.5 leading-tight">
                      <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                      {formattedPhone}
                    </span>
                  )}
                  <span className="text-[10px] text-[#8696a0] leading-tight">
                    {formattedPhone ? '·' : ''} {chatCount} conversa{chatCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          {availableSessions.length > 1 && onSwitchSession && (
            <DropdownMenuContent align="start" className="w-[280px]">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Trocar número de envio
              </div>
              <DropdownMenuSeparator />
              {availableSessions.map((s) => {
                const isCurrent = s.id === currentSessionId;
                const sPhone = formatPhone(s.telefone);
                const sConnected = s.status === 'WORKING' || s.status === 'working' || s.status === 'connected';
                return (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => !isCurrent && onSwitchSession(s.id)}
                    className={`flex items-center gap-2 px-2 py-2 ${isCurrent ? 'bg-[#e7f8f0]' : ''}`}
                  >
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${sConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.display_name || s.nome}</p>
                      {sPhone && <p className="text-xs text-muted-foreground">{sPhone}</p>}
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#54656f] hover:bg-[#e9edef] flex-shrink-0"
          onClick={onSync}
          disabled={isSyncing}
          title="Sincronizar conversas"
        >
          <RefreshCw
            className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Search */}
      <div className="bg-[#f0f2f5] px-3 py-1.5 flex-shrink-0">
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00a884] animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f]" />
          )}
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar em todas as conversas"
            className="h-[35px] rounded-lg border-none bg-white pl-10 text-sm text-[#111b21] placeholder:text-[#667781] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <ConversationFilterTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        counts={counts}
        labels={labels}
        selectedLabelIds={selectedLabelIds}
        onLabelFilterChange={onLabelFilterChange}
        assignedUsers={assignedUsers}
        selectedAssignedUser={selectedAssignedUser}
        onAssignedUserChange={onAssignedUserChange}
      />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          /* Loading skeleton */
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex px-3 py-2.5 border-b border-[#f0f2f5]"
              >
                <Skeleton className="h-[46px] w-[46px] rounded-full flex-shrink-0" />
                <div className="flex-1 ml-3 flex flex-col justify-center gap-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : isSearching ? (
          /* Searching state */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <Loader2 className="h-8 w-8 text-[#00a884] animate-spin mb-4" />
            <p className="text-sm text-[#667781]">
              Buscando em todas as conversas...
            </p>
          </div>
        ) : chats.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f2f5] mb-4">
              <MessageSquare className="h-7 w-7 text-[#667781]" />
            </div>
            <p className="text-sm font-medium text-[#111b21] mb-1">
              Nenhuma conversa encontrada
            </p>
            <p className="text-xs text-[#667781] max-w-[200px]">
              {searchTerm
                ? `Nenhum resultado para "${searchTerm}"`
                : "Sincronize as conversas para comecar"}
            </p>
          </div>
        ) : (
          /* Conversation items */
          <>
            {chats.map((chat) => (
              <ConversationItem
                key={chat.chat_id || chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.chat_id}
                onClick={() => onSelectChat(chat.chat_id)}
                onArchive={onArchiveConversation ? () => onArchiveConversation(chat.chat_id) : undefined}
                onUnarchive={onUnarchiveConversation ? () => onUnarchiveConversation(chat.chat_id) : undefined}
                onMarkAsUnread={onMarkAsUnread ? () => onMarkAsUnread(chat.chat_id) : undefined}
                onMarkAsRead={onMarkAsRead ? () => onMarkAsRead(chat.chat_id) : undefined}
              />
            ))}
            {/* Pagination sentinel */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-3">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-xs text-[#667781]">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Carregando mais...</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#8696a0]">Scroll para mais conversas</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
