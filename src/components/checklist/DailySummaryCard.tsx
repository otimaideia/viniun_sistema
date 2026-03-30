import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DAILY_STATUS_LABELS, DAILY_STATUS_COLORS, type MTChecklistDaily } from "@/types/checklist";

export function DailySummaryCard({ daily }: { daily: MTChecklistDaily }) {
  const color = DAILY_STATUS_COLORS[daily.status];
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: daily.template?.cor || color }} />
      <CardContent className="pt-5 pb-4">
        <p className="text-sm font-medium truncate">{daily.template?.nome || "Checklist"}</p>
        <div className="mt-2">
          <Progress value={daily.percentual_conclusao} className="h-2" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-bold">{Math.round(daily.percentual_conclusao)}%</span>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: color, color }}
          >
            {DAILY_STATUS_LABELS[daily.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {daily.items_concluidos}/{daily.total_items} itens
        </p>
      </CardContent>
    </Card>
  );
}
