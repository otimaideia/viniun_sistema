import { Link } from "react-router-dom";
import { Lead } from "@/types/lead-mt";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users } from "lucide-react";

const safeParseDate = (dateValue: string | null | undefined): Date | null => {
  if (!dateValue) return null;
  const date = parseISO(dateValue);
  return isValid(date) ? date : null;
};

interface RecentLeadsProps {
  leads: Lead[];
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  const recentLeads = [...leads]
    .sort((a, b) => {
      const dateA = safeParseDate(a.created_at)?.getTime() || 0;
      const dateB = safeParseDate(b.created_at)?.getTime() || 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  if (recentLeads.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Leads Recentes</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Nenhum lead recente</p>
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
        <h3 className="text-sm font-medium text-foreground">Leads Recentes</h3>
        <Link
          to="/leads"
          className="text-xs text-primary hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <div className="space-y-1">
        {recentLeads.map((lead) => (
          <Link
            key={lead.id}
            to={`/leads/${lead.id}`}
            className="flex items-center justify-between gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate text-sm">{lead.nome}</p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const date = safeParseDate(lead.created_at);
                  return date
                    ? formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
                    : '-';
                })()}
              </p>
            </div>
            <LeadStatusBadge status={lead.status} size="sm" />
          </Link>
        ))}
      </div>
    </div>
  );
}
