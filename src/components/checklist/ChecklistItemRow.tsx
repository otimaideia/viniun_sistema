import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, AlertTriangle, SkipForward, RotateCcw,
  Camera, MessageSquare, XCircle, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { TaskTimer } from "@/components/checklist/TaskTimer";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";
import { useChecklistTimerMT } from "@/hooks/multitenant/useChecklistTimerMT";
import {
  PRIORIDADE_LABELS, PRIORIDADE_COLORS,
  type MTChecklistDailyItem, type ChecklistItemStatus,
} from "@/types/checklist";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<ChecklistItemStatus, React.ElementType> = {
  pendente: Circle,
  concluido: CheckCircle2,
  nao_feito: AlertTriangle,
  pulado: SkipForward,
};

/** Check if timer has been used (running, paused, or has elapsed time) */
export function hasTimerActivity(item: MTChecklistDailyItem): boolean {
  return item.timer_status === 'running' || item.timer_status === 'paused' || (item.timer_elapsed_seconds != null && item.timer_elapsed_seconds > 0);
}

export function ChecklistItemRow({
  item,
  execution,
  timer,
  onComplete,
  onNotDone,
  onSkip,
  onReopen,
  onNonConformity,
}: {
  item: MTChecklistDailyItem;
  execution: ReturnType<typeof useChecklistExecutionMT>;
  timer: ReturnType<typeof useChecklistTimerMT>;
  onComplete: () => void;
  onNotDone: () => void;
  onSkip: () => void;
  onReopen: () => void;
  onNonConformity: () => void;
}) {
  const StatusIcon = STATUS_ICONS[item.status];
  const isPending = item.status === "pendente";
  const isDone = item.status === "concluido";

  const handleCompleteClick = () => {
    if (!hasTimerActivity(item)) {
      toast.warning("Inicie o timer antes de concluir a tarefa", {
        description: "Pressione ▶ Play para cronometrar o tempo da tarefa.",
      });
      return;
    }
    onComplete();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        isDone && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        item.status === "nao_feito" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
        item.status === "pulado" && "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-60",
        isPending && "bg-card hover:bg-muted/50"
      )}
    >
      {/* Quick complete button */}
      <button
        onClick={() => {
          if (isPending) {
            handleCompleteClick();
          } else if (!isDone) {
            onReopen();
          }
        }}
        disabled={isDone}
        className={cn(
          "mt-0.5 flex-shrink-0 transition-colors",
          isPending && "text-muted-foreground hover:text-green-500",
          isDone && "text-green-500",
          item.status === "nao_feito" && "text-amber-500 hover:text-muted-foreground",
          item.status === "pulado" && "text-gray-400 hover:text-muted-foreground"
        )}
      >
        <StatusIcon className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-medium", isDone && "line-through text-muted-foreground")}>
            {item.titulo}
          </span>
          {item.is_obrigatorio && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
          )}
          {item.is_ad_hoc && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Adicionado</Badge>
          )}
          {item.has_nao_conformidade && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">NC</Badge>
          )}
        </div>

        {item.descricao && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.descricao}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              borderColor: PRIORIDADE_COLORS[item.prioridade as keyof typeof PRIORIDADE_COLORS],
              color: PRIORIDADE_COLORS[item.prioridade as keyof typeof PRIORIDADE_COLORS],
            }}
          >
            {PRIORIDADE_LABELS[item.prioridade as keyof typeof PRIORIDADE_LABELS]}
          </Badge>
          {item.categoria && (
            <Badge variant="outline" className="text-[10px]">{item.categoria}</Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{item.duracao_min}min</span>
          {item.requer_foto && <Camera className="h-3 w-3 text-muted-foreground" />}
          {item.requer_observacao && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
          <TaskTimer
            item={item}
            onStart={(id) => timer.startTimer.mutate(id)}
            onPause={(id, it) => timer.pauseTimer.mutate({ itemId: id, currentItem: it })}
            onStop={(id, it) => timer.stopTimer.mutate({ itemId: id, currentItem: it })}
            disabled={item.status !== 'pendente' && item.timer_status !== 'running' && item.timer_status !== 'paused'}
          />
        </div>

        {/* Done info */}
        {isDone && item.concluido_em && (
          <p className="text-[10px] text-green-600 mt-1">
            Concluído às {new Date(item.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {item.observacoes && (
          <p className="text-xs text-muted-foreground mt-1 italic">"{item.observacoes}"</p>
        )}
      </div>

      {/* Action buttons with labels */}
      {isPending && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 justify-start" onClick={handleCompleteClick}>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            <span className="text-green-600">Concluir</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 justify-start" onClick={onNotDone}>
            <XCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-amber-600">Não feito</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 justify-start" onClick={onSkip}>
            <SkipForward className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Pular</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 justify-start" onClick={onNonConformity}>
            <Flag className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <span className="text-red-600">NC</span>
          </Button>
        </div>
      )}
      {!isPending && !isDone && (
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onReopen} title="Reabrir">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
