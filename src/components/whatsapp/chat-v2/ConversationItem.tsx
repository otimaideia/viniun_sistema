import React, { useState, useEffect, useReducer } from "react";
import { Clock, Users, Pin, Archive, ArchiveRestore, BellOff, BellRing, User } from "lucide-react";
import { WhatsAppConversa } from "@/types/whatsapp-chat";
import { getInitials, formatConversationTime, safeText, getWaitingTime, getUrgencyColors } from "./helpers";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ConversationItemProps {
  chat: WhatsAppConversa;
  isSelected: boolean;
  onClick: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onMarkAsUnread?: () => void;
  onMarkAsRead?: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = React.memo(({
  chat,
  isSelected,
  onClick,
  onArchive,
  onUnarchive,
  onMarkAsUnread,
  onMarkAsRead,
}) => {
  const initials = getInitials(chat.nome_contato);
  const labels = chat.labels || [];
  const [imgError, setImgError] = useState(false);

  // Reset imgError when avatar URL changes
  useEffect(() => { setImgError(false); }, [chat.foto_url]);

  // Force re-render every 30s to recalculate waiting time
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const interval = setInterval(forceUpdate, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcular tempo sem resposta (só se última msg foi do cliente)
  const waitingInfo = getWaitingTime(chat.last_customer_message_at);
  const urgencyColors = waitingInfo ? getUrgencyColors(waitingInfo.urgency) : null;
  const isArchived = chat.status === 'arquivada';
  const hasUnread = (chat.unread_count || 0) > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      className={`flex px-3 py-2.5 cursor-pointer border-b border-[#f0f2f5] transition-colors hover:bg-[#f5f6f6] ${
        isSelected ? "bg-[#f0f2f5]" : ""
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className={`relative w-[46px] h-[46px] rounded-full flex items-center justify-center mr-3 flex-shrink-0 font-semibold text-[15px] overflow-hidden ${
        chat.is_group ? 'bg-[#00a884]/10 text-[#00a884]' : 'bg-[#dfe5e7] text-[#667781]'
      }`}>
        {chat.foto_url && !imgError ? (
          <img
            src={chat.foto_url}
            alt={safeText(chat.nome_contato) || (chat.is_group ? "Grupo" : "Contato")}
            className="w-full h-full object-cover rounded-full"
            onError={() => setImgError(true)}
          />
        ) : chat.is_group ? (
          <Users className="h-6 w-6" />
        ) : (
          initials
        )}
        {/* Indicador de urgência no avatar */}
        {waitingInfo && waitingInfo.urgency !== 'none' && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${
              waitingInfo.urgency === 'critical' ? 'bg-red-500' :
              waitingInfo.urgency === 'high' ? 'bg-orange-500' :
              waitingInfo.urgency === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
          >
            <Clock className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Header: name + time */}
        <div className="flex items-center justify-between">
          <span className="font-normal text-[15px] text-[#111b21] truncate">
            {safeText(chat.nome_contato) || safeText(chat.numero_telefone) || "Contato"}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 ml-1.5">
            {chat.is_pinned && (
              <Pin className="h-3 w-3 text-[#00a884] rotate-45" />
            )}
            <span className="text-xs text-[#667781]">
              {formatConversationTime(chat.ultima_mensagem_at)}
            </span>
          </div>
        </div>

        {/* Preview + badge */}
        <div className="text-[13px] text-[#667781] truncate flex items-center mt-0.5">
          <span className="flex-1 overflow-hidden text-ellipsis leading-[20px]">
            {safeText(chat.ultima_mensagem_texto) || "Nova conversa"}
          </span>
          {(chat.unread_count || 0) > 0 && (
            <span className="bg-[#25d366] text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold ml-auto flex-shrink-0 px-1">
              {chat.unread_count}
            </span>
          )}
        </div>

        {/* Tempo sem resposta + Labels */}
        <div className="flex items-center gap-1 mt-1 overflow-hidden">
          {/* Tempo sem resposta */}
          {waitingInfo && waitingInfo.urgency !== 'none' && urgencyColors && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight whitespace-nowrap border ${urgencyColors.bg} ${urgencyColors.text} ${urgencyColors.border}`}
              title={`Aguardando resposta há ${waitingInfo.text}`}
            >
              <Clock className="h-2.5 w-2.5" />
              {waitingInfo.text}
            </span>
          )}

          {/* Responsável */}
          {chat.assigned_user_name && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight whitespace-nowrap bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]"
              title={`Responsável: ${chat.assigned_user_name}`}
            >
              <User className="h-2.5 w-2.5" />
              {chat.assigned_user_name.split(' ')[0]}
            </span>
          )}

          {/* Labels */}
          {labels.slice(0, waitingInfo?.urgency !== 'none' ? 2 : 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight whitespace-nowrap"
              style={{
                backgroundColor: label.color ? `${label.color}20` : '#e5e7eb',
                color: label.color || '#6b7280',
                border: `1px solid ${label.color ? `${label.color}40` : '#d1d5db'}`,
              }}
              title={safeText(label.name)}
            >
              {safeText(label.name)}
            </span>
          ))}
          {labels.length > (waitingInfo?.urgency !== 'none' ? 2 : 3) && (
            <span className="text-[10px] text-[#8696a0] font-medium whitespace-nowrap">
              +{labels.length - (waitingInfo?.urgency !== 'none' ? 2 : 3)}
            </span>
          )}
        </div>
      </div>
    </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        {hasUnread ? (
          onMarkAsRead && (
            <ContextMenuItem onClick={onMarkAsRead} className="gap-2">
              <BellRing className="h-4 w-4" />
              Marcar como lida
            </ContextMenuItem>
          )
        ) : (
          onMarkAsUnread && (
            <ContextMenuItem onClick={onMarkAsUnread} className="gap-2">
              <BellOff className="h-4 w-4" />
              Marcar como não lida
            </ContextMenuItem>
          )
        )}

        <ContextMenuSeparator />

        {isArchived ? (
          onUnarchive && (
            <ContextMenuItem onClick={onUnarchive} className="gap-2">
              <ArchiveRestore className="h-4 w-4" />
              Restaurar conversa
            </ContextMenuItem>
          )
        ) : (
          onArchive && (
            <ContextMenuItem onClick={onArchive} className="gap-2">
              <Archive className="h-4 w-4" />
              Arquivar conversa
            </ContextMenuItem>
          )
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
