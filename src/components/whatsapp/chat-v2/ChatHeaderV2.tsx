import React, { useState, useEffect, useReducer } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Bot,
  BrainCircuit,
  UserCheck,
  User,
  Search,
  Users,
  ExternalLink,
  Clock,
  Zap,
  Cloud,
  CheckCircle2,
  XCircle,
  Timer,
  Archive,
  ArchiveRestore,
  BellOff,
  Pin,
  Tag,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WhatsAppConversa } from "@/types/whatsapp-chat";
import { getInitials, formatPhone, safeText, getWaitingTime, getUrgencyColors } from "./helpers";
import { cn } from "@/lib/utils";

interface ChatHeaderV2Props {
  chat: WhatsAppConversa | null;
  onToggleCrmPanel: () => void;
  crmPanelOpen: boolean;
  onToggleAiPanel?: () => void;
  aiPanelOpen?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  isBotActive?: boolean;
  onToggleBot?: () => void;
  assignedUserName?: string | null;
  // Presença e typing
  isContactOnline?: boolean;
  isContactTyping?: boolean;
  lastSeen?: string | null;
  // Híbrido
  isHybridEnabled?: boolean;
  routingProvider?: 'waha' | 'meta_cloud_api' | null;
  windowOpen?: boolean;
  windowTimeRemaining?: string | null;
  windowType?: '24h' | '72h' | null;
  // Ações de conversa
  onArchive?: () => void;
  onUnarchive?: () => void;
  onMarkAsUnread?: () => void;
  isArchived?: boolean;
  // Block/unblock
  onBlockContact?: () => void;
  onUnblockContact?: () => void;
  isBlocked?: boolean;
  // Search
  onSearchInConversation?: () => void;
}

export function ChatHeaderV2({
  chat,
  onToggleCrmPanel,
  crmPanelOpen,
  onToggleAiPanel,
  aiPanelOpen = false,
  onBack,
  showBackButton = false,
  isBotActive = false,
  onToggleBot,
  assignedUserName,
  isContactOnline = false,
  isContactTyping = false,
  lastSeen = null,
  isHybridEnabled = false,
  routingProvider = null,
  windowOpen = false,
  windowTimeRemaining = null,
  windowType = null,
  onArchive,
  onUnarchive,
  onMarkAsUnread,
  isArchived = false,
  onBlockContact,
  onUnblockContact,
  isBlocked = false,
  onSearchInConversation,
}: ChatHeaderV2Props) {
  if (!chat) return null;

  // Force re-render every 30s to recalculate waiting time
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const interval = setInterval(forceUpdate, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials = getInitials(chat.nome_contato);
  const displayName = safeText(chat.nome_contato) || safeText(chat.numero_telefone) || "Contato";

  // Presença: typing > online > telefone
  const presenceText = isContactTyping
    ? null // rendered separately with animation
    : isContactOnline
      ? "online"
      : lastSeen
        ? `visto por último ${lastSeen}`
        : null;
  const subtitle = chat.is_group
    ? "Grupo"
    : presenceText || formatPhone(chat.numero_telefone) || "";

  // Tempo sem resposta
  const waitingInfo = getWaitingTime(chat.last_customer_message_at);

  return (
    <div className="flex h-[60px] items-center justify-between border-b border-[#e9edef] bg-[#f0f2f5] px-4 flex-shrink-0">
      {/* Left side: back + avatar + contact info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile back button */}
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#54656f] hover:bg-[#e9edef] flex-shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-[42px] w-[42px] rounded-full bg-[#dfe5e7] flex items-center justify-center font-semibold text-[#667781] text-sm overflow-hidden cursor-pointer">
            {chat.foto_url ? (
              <img
                src={chat.foto_url}
                alt={displayName}
                className="h-full w-full object-cover rounded-full"
              />
            ) : chat.is_group ? (
              <Users className="h-5 w-5 text-[#667781]" />
            ) : (
              initials
            )}
          </div>
          {/* Online indicator dot */}
          {isContactOnline && !chat.is_group && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#25d366] border-2 border-[#f0f2f5]" />
          )}
        </div>

        {/* Contact name + status */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-[#111b21] truncate leading-tight">
            {displayName}
          </h3>
          <div className="flex items-center gap-1.5">
            {/* Typing indicator */}
            {isContactTyping && (
              <p className="text-xs text-[#00a884] truncate leading-tight font-medium animate-pulse">
                digitando...
              </p>
            )}
            {/* Online indicator */}
            {!isContactTyping && isContactOnline && (
              <p className="text-xs text-[#00a884] truncate leading-tight">
                online
              </p>
            )}
            {/* Default subtitle (phone/lastSeen) */}
            {!isContactTyping && !isContactOnline && subtitle && (
              <p className="text-xs text-[#667781] truncate leading-tight">
                {subtitle}
              </p>
            )}

            {/* Indicador de tempo sem resposta no header */}
            {waitingInfo && waitingInfo.urgency !== 'none' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium ${
                        getUrgencyColors(waitingInfo.urgency).bg
                      } ${getUrgencyColors(waitingInfo.urgency).text}`}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {waitingInfo.text}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Aguardando resposta há {waitingInfo.text}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Right side: actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Indicador de Janela (24h/72h) - hidden on small screens */}
        {isHybridEnabled && !chat.is_group && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "hidden sm:flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium",
                    windowOpen
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-red-50 text-red-500 border border-red-200"
                  )}
                >
                  {windowOpen ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      {windowTimeRemaining || `${windowType || '24h'}`}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Fechada
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                {windowOpen ? (
                  <div className="space-y-0.5">
                    <p className="font-medium text-emerald-600">Janela {windowType || '24h'} aberta</p>
                    <p>Tempo restante: {windowTimeRemaining}</p>
                    <p className="text-emerald-500">Mensagens gratuitas via Meta</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="font-medium text-red-500">Janela fechada</p>
                    <p>WAHA: mensagens normais (grátis)</p>
                    <p>Meta: apenas templates (pagos)</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Indicador de Provider ativo */}
        {isHybridEnabled && routingProvider && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "hidden sm:flex items-center gap-0.5 rounded-full px-1.5 py-1",
                    routingProvider === 'waha'
                      ? "bg-green-50 text-green-600"
                      : "bg-blue-50 text-blue-600"
                  )}
                >
                  {routingProvider === 'waha' ? (
                    <Zap className="h-3 w-3" />
                  ) : (
                    <Cloud className="h-3 w-3" />
                  )}
                  <span className="text-[10px] font-medium">
                    {routingProvider === 'waha' ? 'WAHA' : 'Meta'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {routingProvider === 'waha'
                  ? 'Enviando via WAHA (gratuito)'
                  : 'Enviando via Meta Cloud API'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Bot toggle */}
        {onToggleBot && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full",
              isBotActive
                ? "text-[#00a884] bg-[#00a884]/10 hover:bg-[#00a884]/20"
                : "text-[#54656f] hover:bg-[#e9edef]"
            )}
            onClick={onToggleBot}
            title={isBotActive ? "Chatbot ativo - clique para desativar" : "Ativar chatbot"}
          >
            <Bot className="h-5 w-5" />
          </Button>
        )}

        {/* AI Panel toggle */}
        {onToggleAiPanel && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full",
                    aiPanelOpen
                      ? "text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                      : "text-[#54656f] hover:bg-[#e9edef]"
                  )}
                  onClick={onToggleAiPanel}
                >
                  <BrainCircuit className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {aiPanelOpen ? "Fechar Agentes IA" : "Abrir Agentes IA"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Assigned user badge */}
        {assignedUserName && (
          <div className="hidden md:flex items-center gap-1 rounded-full bg-[#e7f8f0] px-2.5 py-1">
            <UserCheck className="h-3.5 w-3.5 text-[#00a884]" />
            <span className="text-xs font-medium text-[#00a884] max-w-[80px] truncate">
              {safeText(assignedUserName)}
            </span>
          </div>
        )}

        {/* CRM panel toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-full",
            crmPanelOpen
              ? "text-[#00a884] bg-[#00a884]/10 hover:bg-[#00a884]/20"
              : "text-[#54656f] hover:bg-[#e9edef]"
          )}
          onClick={onToggleCrmPanel}
          title={crmPanelOpen ? "Fechar painel CRM" : "Abrir painel CRM"}
        >
          <User className="h-5 w-5" />
        </Button>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[#54656f] hover:bg-[#e9edef] rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="gap-2" onClick={onSearchInConversation}>
              <Search className="h-4 w-4" />
              Buscar na conversa
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2">
              <User className="h-4 w-4" />
              Ver contato
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onMarkAsUnread && (
              <DropdownMenuItem className="gap-2" onClick={onMarkAsUnread}>
                <BellOff className="h-4 w-4" />
                Marcar como não lida
              </DropdownMenuItem>
            )}

            {isArchived ? (
              onUnarchive && (
                <DropdownMenuItem className="gap-2" onClick={onUnarchive}>
                  <ArchiveRestore className="h-4 w-4" />
                  Restaurar conversa
                </DropdownMenuItem>
              )
            ) : (
              onArchive && (
                <DropdownMenuItem className="gap-2" onClick={onArchive}>
                  <Archive className="h-4 w-4" />
                  Arquivar conversa
                </DropdownMenuItem>
              )
            )}

            {!chat.is_group && (onBlockContact || onUnblockContact) && (
              <>
                <DropdownMenuSeparator />
                {isBlocked ? (
                  onUnblockContact && (
                    <DropdownMenuItem className="gap-2" onClick={onUnblockContact}>
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      Desbloquear contato
                    </DropdownMenuItem>
                  )
                ) : (
                  onBlockContact && (
                    <DropdownMenuItem className="gap-2 text-red-600" onClick={onBlockContact}>
                      <Ban className="h-4 w-4" />
                      Bloquear contato
                    </DropdownMenuItem>
                  )
                )}
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem className="gap-2" asChild>
              <a href="/whatsapp" className="flex items-center gap-2 no-underline">
                <ExternalLink className="h-4 w-4" />
                Voltar para sessoes
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
