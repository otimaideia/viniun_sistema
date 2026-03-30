import { useNavigate } from 'react-router-dom';
import { useTabletQueueMT, type QueueAppointment } from '@/hooks/multitenant/useTabletQueueMT';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, Phone, User, Cake, RefreshCw } from 'lucide-react';

// =============================================================================
// HELPERS
// =============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmado': return 'bg-blue-100 text-blue-800';
    case 'em_atendimento': return 'bg-yellow-100 text-yellow-800';
    case 'concluido': return 'bg-green-100 text-green-800';
    case 'nao_compareceu': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'agendado': return 'Agendado';
    case 'confirmado': return 'Confirmado';
    case 'em_atendimento': return 'Em Atendimento';
    case 'concluido': return 'Concluido';
    case 'nao_compareceu': return 'Nao Compareceu';
    default: return status;
  }
}

function getTipoColor(tipo: string): string {
  switch (tipo) {
    case 'avaliacao': return 'bg-purple-100 text-purple-800';
    case 'procedimento_fechado': return 'bg-indigo-100 text-indigo-800';
    case 'cortesia': return 'bg-pink-100 text-pink-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'avaliacao': return 'Avaliacao';
    case 'procedimento_fechado': return 'Procedimento';
    case 'cortesia': return 'Cortesia';
    default: return tipo;
  }
}

function isBirthdayThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const birth = new Date(dateStr + 'T12:00:00');

  // Set birth to current year
  birth.setFullYear(today.getFullYear());

  const diffDays = Math.floor((birth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= -1 && diffDays <= 6;
}

function isBirthdayThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const birth = new Date(dateStr + 'T12:00:00');
  return birth.getMonth() === today.getMonth();
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// =============================================================================
// APPOINTMENT CARD
// =============================================================================

function AppointmentCard({ appointment, onClick }: { appointment: QueueAppointment; onClick: () => void }) {
  const lead = appointment.lead;
  const session = appointment.treatment_session;
  const birthdayWeek = isBirthdayThisWeek(lead?.data_nascimento);
  const birthdayMonth = !birthdayWeek && isBirthdayThisMonth(lead?.data_nascimento);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor: appointment.status === 'em_atendimento'
          ? '#EAB308'
          : appointment.status === 'concluido'
            ? '#22C55E'
            : '#6366F1',
      }}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Client info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold truncate">
                {appointment.cliente_nome || lead?.nome || 'Cliente sem nome'}
              </h3>
              {birthdayWeek && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  <Cake className="h-3 w-3" /> Aniversario esta semana!
                </span>
              )}
              {birthdayMonth && (
                <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  <Cake className="h-3 w-3" /> Aniversariante do mes
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {appointment.hora_inicio}
                {appointment.hora_fim && ` - ${appointment.hora_fim}`}
              </span>
              {(appointment.cliente_telefone || lead?.telefone) && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {appointment.cliente_telefone || lead?.telefone}
                </span>
              )}
            </div>

            {appointment.servico_nome && (
              <p className="text-sm text-muted-foreground">{appointment.servico_nome}</p>
            )}
          </div>

          {/* Right: Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            {/* Session badge */}
            {session ? (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Sessao {session.numero_sessao}
                {session.total_sessoes ? `/${session.total_sessoes}` : ''}
              </Badge>
            ) : appointment.tipo === 'avaliacao' ? (
              <Badge variant="outline" className="text-xs">Avaliacao</Badge>
            ) : null}

            {/* Sessao numero from appointment itself (fallback) */}
            {!session && appointment.sessao_numero && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Sessao {appointment.sessao_numero}
                {appointment.total_sessoes ? `/${appointment.total_sessoes}` : ''}
              </Badge>
            )}

            {/* Type badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTipoColor(appointment.tipo)}`}>
              {getTipoLabel(appointment.tipo)}
            </span>

            {/* Status badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {getStatusLabel(appointment.status)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function TabletQueue() {
  const navigate = useNavigate();
  const {
    appointments,
    stats,
    today,
    isLoading,
    error,
    refetch,
    profissionalNome,
    franchiseNome,
  } = useTabletQueueMT();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg">Erro ao carregar fila</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Minha Fila</h1>
            <p className="text-muted-foreground">
              {profissionalNome && <span className="font-medium">{profissionalNome}</span>}
              {franchiseNome && <span> - {franchiseNome}</span>}
              <span className="ml-2 flex items-center gap-1 inline-flex">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(today)}
              </span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.aguardando}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.em_atendimento}</p>
              <p className="text-xs text-muted-foreground">Em Atendimento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.concluidos}</p>
              <p className="text-xs text-muted-foreground">Concluidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum agendamento para hoje</p>
            <p className="text-sm text-muted-foreground">Seus agendamentos do dia aparecerao aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => navigate(`/tablet/atendimento/${apt.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
