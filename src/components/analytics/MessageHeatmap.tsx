import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HeatmapCell } from "@/types/lead-analytics";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value: number, max: number): string {
  if (value === 0) return "bg-muted/30";
  const intensity = value / max;
  if (intensity < 0.15) return "bg-pink-100 dark:bg-pink-950";
  if (intensity < 0.3) return "bg-pink-200 dark:bg-pink-900";
  if (intensity < 0.5) return "bg-pink-300 dark:bg-pink-800";
  if (intensity < 0.7) return "bg-pink-400 dark:bg-pink-700";
  if (intensity < 0.85) return "bg-pink-500 dark:bg-pink-600";
  return "bg-pink-600 dark:bg-pink-500";
}

interface Props {
  data: HeatmapCell[];
  showReceived?: boolean;
}

export function MessageHeatmap({ data, showReceived = true }: Props) {
  const { grid, maxVal } = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    let max = 0;
    data.forEach((cell) => {
      map.set(`${cell.dow}-${cell.hour}`, cell);
      const val = showReceived ? cell.recebidas : cell.total;
      if (val > max) max = val;
    });
    return { grid: map, maxVal: max };
  }, [data, showReceived]);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0.5 mb-1">
          <div />
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0.5">
            {HOURS.map((hour) => (
              <>
                <div key={`label-${hour}`} className="text-right text-xs text-muted-foreground pr-2 flex items-center justify-end">
                  {String(hour).padStart(2, "0")}h
                </div>
                {Array.from({ length: 7 }, (_, dow) => {
                  const cell = grid.get(`${dow}-${hour}`);
                  const val = cell ? (showReceived ? cell.recebidas : cell.total) : 0;

                  return (
                    <Tooltip key={`${dow}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-5 rounded-sm cursor-default transition-colors ${getColor(val, maxVal)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">{DAYS[dow]} {String(hour).padStart(2, "0")}h</p>
                        {cell ? (
                          <>
                            <p>Recebidas: {cell.recebidas}</p>
                            <p>Enviadas: {cell.enviadas}</p>
                            <p>Total: {cell.total}</p>
                          </>
                        ) : (
                          <p>Sem mensagens</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-xs text-muted-foreground">Menos</span>
          <div className="h-3 w-3 rounded-sm bg-muted/30" />
          <div className="h-3 w-3 rounded-sm bg-pink-100 dark:bg-pink-950" />
          <div className="h-3 w-3 rounded-sm bg-pink-200 dark:bg-pink-900" />
          <div className="h-3 w-3 rounded-sm bg-pink-400 dark:bg-pink-700" />
          <div className="h-3 w-3 rounded-sm bg-pink-600 dark:bg-pink-500" />
          <span className="text-xs text-muted-foreground">Mais</span>
        </div>
      </div>
    </div>
  );
}
