import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Clock, Image, Trash2 } from "lucide-react";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";
import { formatSeconds } from "@/hooks/multitenant/useChecklistTimerMT";
import { type MTChecklistDaily } from "@/types/checklist";

export function DailyDetailDialog({ daily, onClose }: { daily: MTChecklistDaily; onClose: () => void }) {
  const items = daily.items || [];
  const execution = useChecklistExecutionMT(daily.id);

  const itemsByHour = items.reduce((acc: Record<string, typeof items>, item) => {
    const key = item.hora_bloco?.slice(0, 5) || "sem_horario";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedHours = Object.keys(itemsByHour).sort((a, b) => {
    if (a === "sem_horario") return 1;
    if (b === "sem_horario") return -1;
    return a.localeCompare(b);
  });

  const totalTime = items.reduce((s, i) => s + (i.timer_elapsed_seconds || 0), 0);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: daily.template?.cor || "#6366F1" }} />
            {daily.user?.nome} — {daily.template?.nome}
          </DialogTitle>
          <DialogDescription>
            {daily.items_concluidos}/{daily.total_items} itens concluídos ({Math.round(daily.percentual_conclusao)}%)
            {totalTime > 0 && ` • Tempo total: ${formatSeconds(totalTime)}`}
          </DialogDescription>
        </DialogHeader>
        <Progress value={daily.percentual_conclusao} className="h-2" />

        <div className="space-y-4 mt-2">
          {sortedHours.map((hour) => (
            <div key={hour}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {hour === "sem_horario" ? "Sem horário" : hour}
                </span>
              </div>
              <div className="space-y-1 ml-6">
                {itemsByHour[hour].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 text-sm py-1.5 group"
                  >
                    {item.status === "concluido" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : item.status === "nao_feito" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={item.status === "concluido" ? "line-through text-muted-foreground" : ""}>
                          {item.titulo}
                        </span>
                        {item.is_ad_hoc && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">ad-hoc</Badge>
                        )}
                        {item.has_nao_conformidade && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">NC</Badge>
                        )}
                      </div>
                      {/* Metadata row: tempo, foto, horário concluído */}
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.timer_elapsed_seconds > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatSeconds(item.timer_elapsed_seconds)}
                          </span>
                        )}
                        {item.foto_url && (
                          <a
                            href={item.foto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            <Image className="h-3 w-3" />
                            Foto
                          </a>
                        )}
                        {item.observacoes && (
                          <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                            {item.observacoes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                      {item.concluido_em && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {item.is_ad_hoc && item.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-500"
                          onClick={() => execution.removeAdHocItem.mutate(item.id)}
                          title="Remover item ad-hoc"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
