import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WindowStatus } from '@/types/whatsapp-hybrid';

interface WindowIndicatorProps {
  windowStatus: WindowStatus | null;
  compact?: boolean;
}

export function WindowIndicator({ windowStatus, compact = false }: WindowIndicatorProps) {
  const [, setTick] = useState(0);

  // Atualizar a cada 30s para countdown
  useEffect(() => {
    if (!windowStatus?.is_open) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [windowStatus?.is_open]);

  if (!windowStatus) {
    return compact ? null : (
      <Badge variant="outline" className="bg-gray-50 text-gray-500 gap-1 text-xs">
        <XCircle className="h-3 w-3" />
        Sem janela
      </Badge>
    );
  }

  if (windowStatus.is_open) {
    const urgency = windowStatus.time_remaining_ms < 3600000; // < 1h
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`gap-1 text-xs font-medium ${
                urgency
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-green-50 text-green-600 border-green-200'
              }`}
            >
              {urgency ? (
                <Timer className="h-3 w-3 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {compact ? windowStatus.time_remaining_text : `Janela ${windowStatus.window_type} - ${windowStatus.time_remaining_text}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <p>Janela de {windowStatus.window_type} aberta</p>
              <p>Expira: {windowStatus.expires_at ? new Date(windowStatus.expires_at).toLocaleString('pt-BR') : '-'}</p>
              <p>Mensagens enviadas: {windowStatus.messages_sent}</p>
              <p className="text-green-500 font-medium">Mensagens gratuitas via Meta</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-red-50 text-red-500 border-red-200 gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {compact ? 'Fechada' : 'Janela fechada'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>Janela 24h expirada</p>
          <p className="text-yellow-500">Meta: apenas templates (pagos)</p>
          <p className="text-green-500">WAHA: mensagens normais (grátis)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
