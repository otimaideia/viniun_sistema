import { LeadStatus, STATUS_CONFIG } from "@/types/lead-mt";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Phone,
  CalendarCheck,
  CheckCircle2,
  Trophy,
  XCircle,
  Clock,
  PhoneForwarded,
  UserCheck,
  Ban,
} from "lucide-react";

const STATUS_ICONS: Record<LeadStatus, React.ElementType> = {
  novo: Inbox,
  contato: Phone,
  agendado: CalendarCheck,
  confirmado: CheckCircle2,
  atendido: UserCheck,
  convertido: Trophy,
  perdido: XCircle,
  cancelado: Ban,
  aguardando: Clock,
  recontato: PhoneForwarded,
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
}

export function LeadStatusBadge({ status, size = "md" }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;

  const Icon = STATUS_ICONS[status];

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
      config.bg,
      config.color,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      {Icon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {config.label}
    </span>
  );
}
