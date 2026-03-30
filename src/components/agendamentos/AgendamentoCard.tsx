import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Building2,
  User,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  UserX,
  Check,
} from "lucide-react";
import {
  AgendamentoWithDetails,
  AGENDAMENTO_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  AgendamentoStatus,
  AppointmentType,
} from "@/types/agendamento";
import { cn } from "@/lib/utils";

interface AgendamentoCardProps {
  agendamento: AgendamentoWithDetails;
  onEdit: (agendamento: AgendamentoWithDetails) => void;
  onStatusChange: (id: string, status: AgendamentoStatus) => void;
  onDelete: (id: string) => void;
}

const StatusIcon = ({ status }: { status: AgendamentoStatus }) => {
  const icons = {
    agendado: Calendar,
    pendente: Clock,
    confirmado: CheckCircle2,
    realizado: Check,
    cancelado: XCircle,
    nao_compareceu: UserX,
  };
  const Icon = icons[status] || Clock;
  return <Icon className="h-3 w-3" />;
};

export function AgendamentoCard({ agendamento, onEdit, onStatusChange, onDelete }: AgendamentoCardProps) {
  const navigate = useNavigate();
  const statusConfig = AGENDAMENTO_STATUS_CONFIG[agendamento.status];
  const tipo = ((agendamento as any).tipo || 'avaliacao') as AppointmentType;
  const tipoColor = APPOINTMENT_TYPE_COLORS[tipo];

  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card cursor-pointer"
      onClick={() => navigate(`/agendamentos/${agendamento.id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Time and Status */}
        <div className="flex items-start gap-4">
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-bold">{agendamento.hora_inicio.slice(0, 5)}</p>
            {agendamento.hora_fim && (
              <p className="text-xs text-muted-foreground">
                até {agendamento.hora_fim.slice(0, 5)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {/* Lead Name */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{agendamento.nome_lead || "Lead sem nome"}</h3>
              <Badge
                className="border text-xs"
                style={{ backgroundColor: `${tipoColor}15`, color: tipoColor, borderColor: `${tipoColor}40` }}
              >
                {APPOINTMENT_TYPE_LABELS[tipo]}
              </Badge>
              <Badge className={cn("border text-xs", statusConfig.bg, statusConfig.color)}>
                <StatusIcon status={agendamento.status} />
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {agendamento.telefone_lead && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {agendamento.telefone_lead}
                </span>
              )}
              {agendamento.email_lead && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {agendamento.email_lead}
                </span>
              )}
            </div>

            {/* Unit and Service */}
            <div className="flex flex-wrap gap-3 text-sm">
              {agendamento.unidade?.nome_fantasia && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {agendamento.unidade.nome_fantasia}
                </span>
              )}
              {agendamento.servico && (
                <Badge variant="outline" className="text-xs">
                  {agendamento.servico}
                </Badge>
              )}
            </div>

            {/* Responsible */}
            {agendamento.responsavel && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                {agendamento.responsavel.full_name}
              </div>
            )}

            {/* Notes */}
            {agendamento.observacoes && (
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                {agendamento.observacoes}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(agendamento)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onStatusChange(agendamento.id, "confirmado")}
              disabled={agendamento.status === "confirmado"}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
              Confirmar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange(agendamento.id, "realizado")}
              disabled={agendamento.status === "realizado"}
            >
              <Check className="h-4 w-4 mr-2 text-purple-600" />
              Marcar Realizado
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange(agendamento.id, "nao_compareceu")}
              disabled={agendamento.status === "nao_compareceu"}
            >
              <UserX className="h-4 w-4 mr-2 text-amber-600" />
              Não Compareceu
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStatusChange(agendamento.id, "cancelado")}
              disabled={agendamento.status === "cancelado"}
            >
              <XCircle className="h-4 w-4 mr-2 text-red-600" />
              Cancelar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(agendamento.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
