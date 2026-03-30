import { AlertTriangle, Zap, Shield, DollarSign, ArrowRightLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RoutingDecision, ProviderType } from '@/types/whatsapp-hybrid';
import { formatCostBRL, PROVIDER_TYPE_LABELS } from '@/types/whatsapp-hybrid';

interface RoutingDecisionBannerProps {
  decision: RoutingDecision | null;
  onSwitchProvider?: (provider: ProviderType) => void;
  onConfirmSend?: () => void;
  canForceProvider?: boolean;
}

export function RoutingDecisionBanner({
  decision,
  onSwitchProvider,
  onConfirmSend,
  canForceProvider = false,
}: RoutingDecisionBannerProps) {
  if (!decision) return null;

  const isWaha = decision.provider === 'waha';
  const isFree = decision.is_free;

  // Não mostrar banner para mensagens grátis via WAHA (caso mais comum)
  if (isWaha && isFree && !decision.requires_template) {
    return null;
  }

  return (
    <Alert className={`py-2 px-3 ${
      decision.requires_confirmation
        ? 'border-yellow-300 bg-yellow-50'
        : isFree
          ? 'border-green-200 bg-green-50'
          : 'border-blue-200 bg-blue-50'
    }`}>
      <AlertDescription className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Provider icon */}
          {isWaha ? (
            <Zap className="h-3.5 w-3.5 text-green-600 shrink-0" />
          ) : (
            <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          )}

          {/* Provider name */}
          <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${
            isWaha ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'
          }`}>
            {PROVIDER_TYPE_LABELS[decision.provider]}
          </Badge>

          {/* Reason (truncated) */}
          <span className="text-muted-foreground truncate">
            {decision.reason}
          </span>

          {/* Cost */}
          {!isFree && (
            <span className="flex items-center gap-0.5 text-orange-600 font-medium shrink-0">
              <DollarSign className="h-3 w-3" />
              {formatCostBRL(decision.estimated_cost)}
            </span>
          )}
          {isFree && (
            <Badge variant="outline" className="text-[10px] px-1 border-green-300 text-green-600 shrink-0">
              Grátis
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Switch provider button */}
          {canForceProvider && decision.fallback_available && decision.fallback_provider && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => onSwitchProvider?.(decision.fallback_provider!)}
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Usar {PROVIDER_TYPE_LABELS[decision.fallback_provider]}
            </Button>
          )}

          {/* Confirm button for paid messages */}
          {decision.requires_confirmation && (
            <Button
              size="sm"
              className="h-6 text-[10px] px-2 bg-yellow-600 hover:bg-yellow-700"
              onClick={onConfirmSend}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Confirmar Envio
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
