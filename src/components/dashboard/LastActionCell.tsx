import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LastActionCellProps {
  actionType: string | null;
  actionTimestamp: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  "contact_initiated": "Contato iniciado",
  "scheduled": "Agendamento criado",
  "confirmed": "Presença confirmada",
  "converted": "Convertido",
  "responsible_changed": "Responsável alterado",
  "note_added": "Nota adicionada",
  "status_changed": "Status alterado",
};

export function LastActionCell({ actionType, actionTimestamp }: LastActionCellProps) {
  if (!actionTimestamp || !actionType) {
    return (
      <span className="text-sm text-muted-foreground/60">Sem ações</span>
    );
  }

  const date = new Date(actionTimestamp);
  const daysSinceAction = differenceInDays(new Date(), date);
  const formattedDate = format(date, "dd MMM yyyy, HH:mm", { locale: ptBR });
  const relativeTime = formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  const label = ACTION_LABELS[actionType] || actionType;

  // Determinar cor baseado no tempo
  const getColorClass = () => {
    if (daysSinceAction >= 14) return "text-destructive";
    if (daysSinceAction >= 7) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("text-sm cursor-help", getColorClass())}>
          <span className="block truncate max-w-[140px]">
            {label}
          </span>
          <span className="text-xs opacity-70">{relativeTime}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formattedDate}</p>
      </TooltipContent>
    </Tooltip>
  );
}
