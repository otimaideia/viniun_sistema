import { Lead, LeadStatus, STATUS_CONFIG, STATUS_OPTIONS } from "@/types/lead-mt";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

interface StatusFunnelProps {
  leads: Lead[];
}

export function StatusFunnel({ leads }: StatusFunnelProps) {
  const total = leads.length;

  const statusCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = leads.filter((lead) => lead.status === status).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  const maxCount = Math.max(...Object.values(statusCounts), 1);

  if (total === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Funil de Conversão</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Nenhum lead encontrado</p>
          <Link
            to="/leads/novo"
            className="text-sm text-primary hover:underline"
          >
            Criar primeiro lead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Funil de Conversão</h3>
        <span className="text-xs text-muted-foreground">{total} leads</span>
      </div>
      <div className="space-y-3">
        {STATUS_OPTIONS.map((status) => {
          const count = statusCounts[status];
          const config = STATUS_CONFIG[status];
          const percentage = (count / maxCount) * 100;
          const percentOfTotal = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={status} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className={cn("font-medium", config.color)}>{config.label}</span>
                <span className="text-muted-foreground">
                  {count} <span className="text-xs">({percentOfTotal}%)</span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    status === "convertido" ? "bg-success" :
                    status === "perdido" || status === "cancelado" ? "bg-muted-foreground" :
                    "bg-primary"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
