import { GripVertical, Settings, Power, PowerOff, Trash2, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { WhatsAppRoutingRule } from '@/types/whatsapp-hybrid';
import { CONDITION_TYPE_LABELS, PROVIDER_TYPE_LABELS } from '@/types/whatsapp-hybrid';

interface RoutingRuleCardProps {
  rule: WhatsAppRoutingRule;
  index: number;
  onEdit?: (rule: WhatsAppRoutingRule) => void;
  onToggle?: (id: string, isActive: boolean) => void;
  onDelete?: (id: string) => void;
  isDragging?: boolean;
}

const PROVIDER_PREF_LABELS: Record<string, string> = {
  waha: 'WAHA',
  meta_cloud_api: 'Meta Cloud API',
  cheapest: 'Mais barato',
  fastest: 'Mais rápido',
};

export function RoutingRuleCard({
  rule,
  index,
  onEdit,
  onToggle,
  onDelete,
  isDragging = false,
}: RoutingRuleCardProps) {
  return (
    <Card className={`transition-all ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''} ${!rule.is_active ? 'opacity-50' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Priority number */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>

          {/* Rule info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{rule.nome}</span>
              {rule.franchise && (
                <Badge variant="outline" className="text-[10px] px-1">
                  {rule.franchise.nome}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {/* Condition */}
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {CONDITION_TYPE_LABELS[rule.condition_type] || rule.condition_type}
              </Badge>

              {/* Arrow */}
              <span className="text-muted-foreground text-xs">→</span>

              {/* Provider preference */}
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 ${
                  rule.preferred_provider === 'waha'
                    ? 'border-green-300 text-green-700'
                    : rule.preferred_provider === 'meta_cloud_api'
                      ? 'border-blue-300 text-blue-700'
                      : 'border-purple-300 text-purple-700'
                }`}
              >
                {PROVIDER_PREF_LABELS[rule.preferred_provider] || rule.preferred_provider}
              </Badge>

              {/* Fallback */}
              {rule.fallback_provider && (
                <>
                  <span className="text-muted-foreground text-[10px]">fallback:</span>
                  <Badge variant="outline" className="text-[10px] px-1">
                    {PROVIDER_TYPE_LABELS[rule.fallback_provider]}
                  </Badge>
                </>
              )}

              {/* Flags */}
              {rule.require_confirmation && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" title="Requer confirmação" />
              )}
              {rule.alert_before_cost && (
                <DollarSign className="h-3 w-3 text-orange-500" title="Alerta de custo" />
              )}
            </div>
          </div>

          {/* Toggle + Actions */}
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={(v) => onToggle?.(rule.id, v)}
              className="scale-75"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit?.(rule)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(rule.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
