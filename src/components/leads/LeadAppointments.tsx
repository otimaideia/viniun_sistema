import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLeadAppointments } from '@/hooks/useLeadAppointments';
import {
  AppointmentWithRelations,
  AppointmentStatus,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_TYPE_LABELS,
} from '@/types/appointment';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LeadAppointmentsProps {
  leadId: string;
  franqueadoId?: string;
  onAddAppointment?: () => void;
}

const STATUS_ICONS: Record<AppointmentStatus, React.ElementType> = {
  agendado: Calendar,
  confirmado: CheckCircle,
  em_andamento: Clock,
  concluido: CheckCircle,
  cancelado: XCircle,
  nao_compareceu: AlertCircle,
  remarcado: Calendar,
};

const LeadAppointments: React.FC<LeadAppointmentsProps> = ({
  leadId,
  onAddAppointment,
}) => {
  const {
    appointments,
    futureAppointments,
    pastAppointments,
    isLoading,
    updateStatus,
    deleteAppointment,
    refetch,
  } = useLeadAppointments(leadId);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      updateStatus({ id, status });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        deleteAppointment(id);
        toast.success('Agendamento excluido com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir agendamento');
      }
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const now = new Date();

  const renderAppointment = (appointment: AppointmentWithRelations) => {
    const StatusIcon = STATUS_ICONS[appointment.status];
    const isPast = new Date(appointment.data_inicio) < now;

    return (
      <div
        key={appointment.id}
        className={cn(
          'p-4 rounded-lg border',
          isPast ? 'bg-muted/30' : 'bg-background'
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            {/* Indicador de cor */}
            <div
              className="w-1 rounded-full"
              style={{ backgroundColor: appointment.cor }}
            />

            <div className="space-y-1">
              {/* Titulo e tipo */}
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  'font-medium',
                  isPast && 'text-muted-foreground'
                )}>
                  {appointment.titulo}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {APPOINTMENT_TYPE_LABELS[appointment.tipo]}
                </Badge>
              </div>

              {/* Data e hora */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(appointment.data_inicio)}
                </span>
                {appointment.data_fim && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ate {new Date(appointment.data_fim).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {/* Descricao */}
              {appointment.descricao && (
                <p className="text-sm text-muted-foreground mt-1">
                  {appointment.descricao}
                </p>
              )}

              {/* Informacoes adicionais */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>
                  Criado {formatDistanceToNow(new Date(appointment.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Status e acoes */}
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1', APPOINTMENT_STATUS_COLORS[appointment.status])}>
              <StatusIcon className="h-3 w-3" />
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {appointment.status === 'agendado' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'confirmado')}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Confirmar
                  </DropdownMenuItem>
                )}
                {['agendado', 'confirmado'].includes(appointment.status) && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'em_andamento')}>
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      Em Andamento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'concluido')}>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Concluido
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'nao_compareceu')}>
                      <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                      Nao Compareceu
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'cancelado')}>
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Cancelar
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(appointment.id)}
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-600" />
              Agendamentos
            </CardTitle>
            <CardDescription>
              {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} registrado{appointments.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {onAddAppointment && (
            <Button size="sm" onClick={onAddAppointment}>
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">
              Nenhum agendamento
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Este lead nao possui agendamentos registrados
            </p>
            {onAddAppointment && (
              <Button variant="outline" onClick={onAddAppointment}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Agendamento
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Agendamentos Futuros */}
            {futureAppointments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Proximos ({futureAppointments.length})
                </h4>
                {futureAppointments.map(renderAppointment)}
              </div>
            )}

            {/* Agendamentos Passados */}
            {pastAppointments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Historico ({pastAppointments.length})
                </h4>
                {pastAppointments.map(renderAppointment)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadAppointments;
