import type { EngagementBucket } from "@/types/lead-analytics";
import { AlertTriangle, MessageCircle, MessageSquare, MessagesSquare, Heart } from "lucide-react";

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  sem_resposta: { color: "text-red-600", bg: "bg-red-500", icon: AlertTriangle },
  resposta_unica: { color: "text-orange-600", bg: "bg-orange-400", icon: MessageCircle },
  engajamento_baixo: { color: "text-amber-600", bg: "bg-amber-400", icon: MessageSquare },
  conversa_ativa: { color: "text-green-600", bg: "bg-green-500", icon: MessagesSquare },
  relacionamento: { color: "text-blue-600", bg: "bg-blue-500", icon: Heart },
};

interface Props {
  data: EngagementBucket[];
  total?: number;
}

export function EngagementFunnel({ data, total }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((bucket) => {
        const config = LEVEL_CONFIG[bucket.level] || LEVEL_CONFIG.sem_resposta;
        const Icon = config.icon;
        const widthPercent = Math.max((bucket.count / maxCount) * 100, 8);

        return (
          <div key={bucket.level} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="font-medium">{bucket.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums">{bucket.count}</span>
                <span className="text-muted-foreground text-xs">({bucket.percentage}%)</span>
              </div>
            </div>
            <div className="h-6 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${config.bg} transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 20 && (
                  <span className="text-xs font-semibold text-white">
                    {bucket.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary alert */}
      {data.length >= 2 && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            {(() => {
              const dead = data.filter((d) =>
                d.level === "sem_resposta" || d.level === "resposta_unica"
              );
              const totalDead = dead.reduce((sum, d) => sum + d.percentage, 0);
              return `${totalDead.toFixed(1)}% das conversas morrem com 0 ou 1 resposta da clínica`;
            })()}
          </p>
        </div>
      )}
    </div>
  );
}
