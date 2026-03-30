import { useMemo } from "react";
import { Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { useWhatsAppWindowMT } from "@/hooks/multitenant/useWhatsAppWindowsMT";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConversationWindowCardProps {
  conversationId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expirada";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m restantes`;
  }
  return `${minutes}m restantes`;
}

function getProgressPercent(ms: number, totalHours: number): number {
  if (ms <= 0) return 0;
  const totalMs = totalHours * 60 * 60 * 1000;
  return Math.min(100, (ms / totalMs) * 100);
}

function getProgressColor(percent: number): string {
  if (percent <= 0) return "bg-gray-300";
  if (percent < 25) return "bg-red-500";
  if (percent < 50) return "bg-amber-500";
  return "bg-emerald-500";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#f0f2f5] animate-pulse" />
        <div className="h-4 w-24 rounded bg-[#f0f2f5] animate-pulse" />
      </div>
      <div className="w-full h-2 rounded-full bg-[#f0f2f5] animate-pulse" />
      <div className="h-3 w-32 mx-auto rounded bg-[#f0f2f5] animate-pulse" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calculated window status from conversation data
// ---------------------------------------------------------------------------

interface CalculatedWindow {
  isOpen: boolean;
  lastCustomerMessageAt: string | null;
  lastMessageAt: string | null;
  expiresAt: string | null;
  timeRemainingMs: number;
  messagesSent: number;
  windowHours: number;
}

function useConversationFallback(conversationId: string | null) {
  return useQuery({
    queryKey: ["mt-conversation-window-fallback", conversationId],
    queryFn: async (): Promise<CalculatedWindow | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("mt_whatsapp_conversations")
        .select("last_customer_message_at, last_message_at, last_message_from")
        .eq("id", conversationId)
        .maybeSingle();

      if (error || !data) return null;

      const lastCustomerMsg = data.last_customer_message_at;
      if (!lastCustomerMsg) return null;

      const windowHours = 24;
      const windowMs = windowHours * 60 * 60 * 1000;
      const lastCustomerTime = new Date(lastCustomerMsg).getTime();
      const expiresAt = new Date(lastCustomerTime + windowMs).toISOString();
      const timeRemainingMs = Math.max(0, lastCustomerTime + windowMs - Date.now());

      return {
        isOpen: timeRemainingMs > 0,
        lastCustomerMessageAt: lastCustomerMsg,
        lastMessageAt: data.last_message_at,
        expiresAt,
        timeRemainingMs,
        messagesSent: 0,
        windowHours,
      };
    },
    enabled: !!conversationId,
    refetchInterval: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ConversationWindowCard({ conversationId }: ConversationWindowCardProps) {
  // Try the dedicated windows table first
  const {
    window: windowData,
    windowStatus,
    isOpen: windowIsOpen,
    timeRemaining,
    isLoading: isLoadingWindow,
  } = useWhatsAppWindowMT(conversationId || undefined);

  // Fallback: calculate from conversation data
  const { data: fallbackData, isLoading: isLoadingFallback } =
    useConversationFallback(windowData ? null : conversationId);

  const isLoading = isLoadingWindow || (!windowData && isLoadingFallback);

  // Determine which data source to use
  const hasWindowTable = !!windowData && !!windowStatus;
  const hasFallback = !hasWindowTable && !!fallbackData;

  // Unified display values
  const displayData = useMemo(() => {
    if (hasWindowTable && windowStatus) {
      return {
        isOpen: windowIsOpen,
        isExpiring: windowIsOpen && windowStatus.time_remaining_ms < 3600 * 1000,
        timeRemainingMs: windowStatus.time_remaining_ms,
        lastCustomerMessageAt: windowData!.last_customer_message_at,
        messagesSent: windowStatus.messages_sent,
        windowType: windowStatus.window_type as "24h" | "72h",
        windowHours: windowStatus.window_type === "72h" ? 72 : 24,
        progress: getProgressPercent(
          windowStatus.time_remaining_ms,
          windowStatus.window_type === "72h" ? 72 : 24
        ),
      };
    }

    if (hasFallback && fallbackData) {
      return {
        isOpen: fallbackData.isOpen,
        isExpiring:
          fallbackData.isOpen && fallbackData.timeRemainingMs < 3600 * 1000,
        timeRemainingMs: fallbackData.timeRemainingMs,
        lastCustomerMessageAt: fallbackData.lastCustomerMessageAt,
        messagesSent: 0,
        windowType: "24h" as const,
        windowHours: 24,
        progress: getProgressPercent(fallbackData.timeRemainingMs, 24),
      };
    }

    return null;
  }, [hasWindowTable, hasFallback, windowStatus, windowIsOpen, windowData, fallbackData]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // No data at all
  if (!displayData) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f2f5]">
          <Clock className="h-5 w-5 text-[#667781]" />
        </div>
        <p className="text-xs text-[#667781] text-center">
          Nenhuma janela de conversa ativa.
        </p>
        <p className="text-[10px] text-[#8696a0] text-center">
          A janela abre quando o cliente envia uma mensagem.
        </p>
      </div>
    );
  }

  const progressColor = getProgressColor(displayData.progress);

  // Status display
  const statusConfig = displayData.isOpen
    ? displayData.isExpiring
      ? {
          dotColor: "bg-amber-500",
          textColor: "text-amber-600",
          label: "Expirando",
          Icon: AlertTriangle,
        }
      : {
          dotColor: "bg-emerald-500",
          textColor: "text-emerald-600",
          label: "Janela Aberta",
          Icon: CheckCircle,
        }
    : {
        dotColor: "bg-red-500",
        textColor: "text-red-600",
        label: "Janela Fechada",
        Icon: XCircle,
      };

  return (
    <div className="space-y-0">
      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2.5 h-2.5 rounded-full ${statusConfig.dotColor} ${
            displayData.isOpen ? "animate-pulse" : ""
          }`}
        />
        <span className={`text-sm font-medium ${statusConfig.textColor}`}>
          {statusConfig.label}
        </span>
        <span className="text-[10px] bg-[#f0f2f5] text-[#667781] rounded px-1.5 py-0.5 ml-auto">
          {displayData.windowType === "72h" ? "72 horas" : "24 horas"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-[#f0f2f5] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${displayData.progress}%` }}
        />
      </div>

      {/* Time remaining text */}
      <p className="text-xs text-[#667781] text-center mb-3">
        {displayData.isOpen
          ? formatTimeRemaining(displayData.timeRemainingMs)
          : "Expirada"}
      </p>

      {/* Info rows */}
      <div className="space-y-1.5">
        {/* Last customer message */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#667781]">Ultima msg cliente</span>
          <span className="text-xs text-[#111b21]">
            {displayData.lastCustomerMessageAt
              ? format(
                  new Date(displayData.lastCustomerMessageAt),
                  "dd/MM HH:mm",
                  { locale: ptBR }
                )
              : "-"}
          </span>
        </div>

        {/* Messages sent (only show if from dedicated table) */}
        {hasWindowTable && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#667781]">Mensagens enviadas</span>
            <span className="text-xs text-[#111b21] flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-[#667781]" />
              {displayData.messagesSent}
            </span>
          </div>
        )}

        {/* Window type */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#667781]">Tipo</span>
          <span className="text-xs text-[#111b21]">
            {displayData.windowType === "72h" ? "72 horas" : "24 horas"}
          </span>
        </div>

        {/* Data source indicator */}
        {hasFallback && (
          <p className="text-[10px] text-[#8696a0] italic text-center mt-1">
            Calculado a partir da ultima mensagem
          </p>
        )}
      </div>

      {/* Closed state warning */}
      {!displayData.isOpen && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2 mt-3">
          <p className="text-xs text-red-600">
            A janela de conversa expirou. Para enviar mensagens, utilize
            templates aprovados pela Meta (mensagens cobradas).
          </p>
        </div>
      )}
    </div>
  );
}
