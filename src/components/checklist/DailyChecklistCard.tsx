import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";
import { useChecklistTimerMT } from "@/hooks/multitenant/useChecklistTimerMT";
import { ChecklistItemRow } from "@/components/checklist/ChecklistItemRow";
import {
  DAILY_STATUS_LABELS, DAILY_STATUS_COLORS,
  type MTChecklistDaily, type MTChecklistDailyItem,
} from "@/types/checklist";
import { cn } from "@/lib/utils";

export function DailyChecklistCard({
  daily,
  expandedBlocks,
  toggleBlock,
  onComplete,
  onNotDone,
  onSkip,
  onNonConformity,
}: {
  daily: MTChecklistDaily;
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (key: string) => void;
  onComplete: (itemId: string, requerFoto?: boolean) => void;
  onNotDone: (itemId: string) => void;
  onSkip: (itemId: string) => void;
  onNonConformity: (itemId: string) => void;
}) {
  const items = daily.items || [];
  const execution = useChecklistExecutionMT(daily.id);
  const timer = useChecklistTimerMT(daily.id);

  // Memoize grouping by hora_bloco
  const { itemsByHour, sortedHours } = useMemo(() => {
    const grouped = items.reduce((acc: Record<string, MTChecklistDailyItem[]>, item) => {
      const key = item.hora_bloco?.slice(0, 5) || "sem_horario";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const sorted = Object.keys(grouped).sort((a, b) => {
      if (a === "sem_horario") return 1;
      if (b === "sem_horario") return -1;
      return a.localeCompare(b);
    });

    return { itemsByHour: grouped, sortedHours: sorted };
  }, [items]);

  // Current hour block highlight
  const now = new Date();
  const currentHourStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: daily.template?.cor || "#6366F1" }} />
            {daily.template?.nome || "Checklist"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {daily.hora_inicio?.slice(0, 5)} - {daily.hora_fim?.slice(0, 5)}
            </span>
            <Badge
              style={{
                backgroundColor: DAILY_STATUS_COLORS[daily.status] + "20",
                color: DAILY_STATUS_COLORS[daily.status],
                borderColor: DAILY_STATUS_COLORS[daily.status],
              }}
              variant="outline"
            >
              {DAILY_STATUS_LABELS[daily.status]}
            </Badge>
          </div>
        </div>
        <Progress value={daily.percentual_conclusao} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedHours.map((hour) => {
          const blockItems = itemsByHour[hour];
          const blockKey = `${daily.id}-${hour}`;
          const isExpanded = expandedBlocks[blockKey] !== false; // default open
          const completedCount = blockItems.filter((i) => i.status === "concluido").length;
          const allDone = completedCount === blockItems.length;

          // Highlight current hour
          const isCurrent =
            hour !== "sem_horario" &&
            currentHourStr >= hour &&
            (sortedHours[sortedHours.indexOf(hour) + 1]
              ? currentHourStr < sortedHours[sortedHours.indexOf(hour) + 1]
              : true);

          return (
            <div key={hour}>
              <button
                onClick={() => toggleBlock(blockKey)}
                className={cn(
                  "flex items-center justify-between w-full p-3 rounded-lg transition-colors text-left",
                  isCurrent ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-semibold text-sm">
                    {hour === "sem_horario" ? "Sem horário" : `${hour}`}
                  </span>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">AGORA</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{blockItems.length}
                  </span>
                  {allDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isExpanded && (
                <div className="space-y-2 mt-2 ml-2">
                  {blockItems.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      execution={execution}
                      timer={timer}
                      onComplete={() => onComplete(item.id, item.requer_foto)}
                      onNotDone={() => onNotDone(item.id)}
                      onSkip={() => onSkip(item.id)}
                      onReopen={() => execution.reopenItem.mutate(item.id)}
                      onNonConformity={() => onNonConformity(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
