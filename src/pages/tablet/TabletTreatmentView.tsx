import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAgendamentoMT, useAgendamentosMT } from '@/hooks/multitenant/useAgendamentosMT';
import { useTreatmentTimerMT, formatSeconds } from '@/hooks/multitenant/useTreatmentTimerMT';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Play,
  Pause,
  Square,
  ArrowLeft,
  Phone,
  Mail,
  Cake,
  User,
  Calendar,
  Clock,
  CalendarPlus,
  Thermometer,
  Instagram,
  FileText,
  CheckCircle2,
} from 'lucide-react';

// =============================================================================
// HELPERS
// =============================================================================

function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'avaliacao': return 'Avaliacao';
    case 'procedimento_fechado': return 'Procedimento Fechado';
    case 'cortesia': return 'Cortesia';
    default: return tipo;
  }
}

function getTipoColor(tipo: string): string {
  switch (tipo) {
    case 'avaliacao': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'procedimento_fechado': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getTemperaturaColor(temp?: string): string {
  switch (temp) {
    case 'quente': return 'bg-red-100 text-red-800';
    case 'morno': return 'bg-yellow-100 text-yellow-800';
    case 'frio': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function isBirthdayThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const birth = new Date(dateStr + 'T12:00:00');
  birth.setFullYear(today.getFullYear());
  const diffDays = Math.floor((birth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= -1 && diffDays <= 6;
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function TabletTreatmentView() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useTenantContext();

  const { appointment, isLoading: isLoadingApt, refetch: refetchApt } = useAgendamentoMT(appointmentId);
  const { updateStatus } = useAgendamentosMT({});

  const {
    activeTimer,
    displayFormatted,
    isRunning,
    isPaused,
    isStopped,
    isLoading: isLoadingTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTreatmentTimerMT(appointmentId);

  // Local state
  const [observacoes, setObservacoes] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  // Lead info from appointment
  const lead = appointment?.lead as Record<string, unknown> | undefined;
  const treatmentSession = appointment?.treatment_session as Record<string, unknown> | undefined;

  // Handle timer actions
  const handleStart = useCallback(() => {
    if (!user?.id) {
      toast.error('Usuario nao identificado');
      return;
    }
    startTimer.mutate({
      profissionalId: user.id,
      treatmentSessionId: treatmentSession?.id,
    });

    // Also mark appointment as em_atendimento if not already
    if (appointment && appointment.status !== 'em_atendimento') {
      updateStatus(appointment.id, 'em_atendimento').catch(console.error);
    }
  }, [user?.id, treatmentSession?.id, appointment]);

  const handlePause = useCallback(() => {
    if (activeTimer) {
      pauseTimer.mutate(activeTimer.id);
    }
  }, [activeTimer]);

  const handleResume = useCallback(() => {
    if (activeTimer) {
      resumeTimer.mutate(activeTimer.id);
    }
  }, [activeTimer]);

  const handleStop = useCallback(async () => {
    if (activeTimer) {
      stopTimer.mutate({ timerId: activeTimer.id, observacoes });
    }
  }, [activeTimer, observacoes]);

  // Finish appointment
  const handleFinish = useCallback(async () => {
    if (!appointment) return;
    setIsFinishing(true);

    try {
      // Stop timer if still running
      if (activeTimer && activeTimer.timer_status !== 'stopped') {
        await stopTimer.mutateAsync({ timerId: activeTimer.id, observacoes });
      }

      // Update appointment observacoes if provided
      if (observacoes) {
        await supabase
          .from('mt_appointments')
          .update({
            observacoes: observacoes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointment.id);
      }

      // Mark as concluido (this triggers treatment plan updates via useAgendamentosMT)
      await updateStatus(appointment.id, 'concluido');

      toast.success('Atendimento finalizado com sucesso');
      navigate('/tablet/fila');
    } catch (err: unknown) {
      console.error('Erro ao finalizar atendimento:', err);
      toast.error(`Erro ao finalizar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsFinishing(false);
    }
  }, [appointment, activeTimer, observacoes, updateStatus, navigate]);

  // Reschedule next session
  const handleReschedule = useCallback(async () => {
    if (!appointment || !rescheduleDate || !rescheduleTime) {
      toast.error('Selecione data e horario');
      return;
    }

    try {
      // Calculate hora_fim
      const [h, m] = rescheduleTime.split(':').map(Number);
      const endMinutes = h * 60 + m + (appointment.duracao_minutos || 60);
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
      const endM = String(endMinutes % 60).padStart(2, '0');

      // Determine next session number
      const nextSessao = (appointment.sessao_numero || 1) + 1;

      await supabase
        .from('mt_appointments')
        .insert({
          tenant_id: appointment.tenant_id,
          franchise_id: appointment.franchise_id,
          lead_id: appointment.lead_id,
          tipo: appointment.tipo,
          cliente_nome: appointment.cliente_nome,
          cliente_telefone: appointment.cliente_telefone,
          cliente_email: appointment.cliente_email,
          servico_id: appointment.servico_id,
          servico_nome: appointment.servico_nome,
          profissional_id: appointment.profissional_id,
          profissional_nome: appointment.profissional_nome,
          data_agendamento: rescheduleDate,
          hora_inicio: rescheduleTime,
          hora_fim: `${endH}:${endM}`,
          duracao_minutos: appointment.duracao_minutos || 60,
          status: 'agendado',
          confirmado: false,
          is_recorrente: appointment.is_recorrente,
          recorrencia_id: appointment.recorrencia_id,
          venda_id: appointment.venda_id,
          sessao_numero: nextSessao,
          total_sessoes: appointment.total_sessoes,
          origem: 'tablet',
        });

      toast.success(`Proxima sessao agendada para ${formatDateBR(rescheduleDate)} as ${rescheduleTime}`);
      setShowReschedule(false);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch (err: unknown) {
      toast.error(`Erro ao reagendar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }, [appointment, rescheduleDate, rescheduleTime]);

  // Loading state
  if (isLoadingApt || isLoadingTimer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg text-muted-foreground">Agendamento nao encontrado</p>
        <Button onClick={() => navigate('/tablet/fila')}>Voltar para Fila</Button>
      </div>
    );
  }

  const birthdayWeek = isBirthdayThisWeek(lead?.data_nascimento);

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-4 p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tablet/fila')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Fila
        </Button>

        {/* Birthday banner */}
        {birthdayWeek && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-800">
            <Cake className="h-5 w-5" />
            <span className="font-medium">Aniversario esta semana! Parabenize o(a) cliente.</span>
          </div>
        )}

        {/* Client Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              {appointment.cliente_nome || lead?.nome || 'Cliente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {(appointment.cliente_telefone || lead?.telefone) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{appointment.cliente_telefone || lead?.telefone}</span>
                </div>
              )}
              {(appointment.cliente_email || lead?.email) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{appointment.cliente_email || lead?.email}</span>
                </div>
              )}
              {lead?.instagram_id && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Instagram className="h-4 w-4" />
                  <span>@{lead.instagram_id.replace('@', '')}</span>
                </div>
              )}
              {lead?.data_nascimento && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cake className="h-4 w-4" />
                  <span>{formatDateBR(lead.data_nascimento)}</span>
                </div>
              )}
              {lead?.origem && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Origem: {lead.origem}</span>
                </div>
              )}
              {lead?.temperatura && (
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTemperaturaColor(lead.temperatura)}`}>
                    {lead.temperatura.charAt(0).toUpperCase() + lead.temperatura.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informacoes da Sessao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Type badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTipoColor(appointment.tipo)}`}>
                {getTipoLabel(appointment.tipo)}
              </span>

              {/* Session number */}
              {(treatmentSession?.numero_sessao || appointment.sessao_numero) && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Sessao {treatmentSession?.numero_sessao || appointment.sessao_numero}
                  {(treatmentSession?.total_sessoes || appointment.total_sessoes) &&
                    ` de ${treatmentSession?.total_sessoes || appointment.total_sessoes}`}
                </Badge>
              )}
            </div>

            {/* Service info */}
            {(appointment.servico_nome || treatmentSession?.servico_nome) && (
              <p className="text-sm">
                <span className="text-muted-foreground">Servico: </span>
                <span className="font-medium">{appointment.servico_nome || treatmentSession?.servico_nome}</span>
              </p>
            )}

            {/* Time info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {appointment.hora_inicio}
                {appointment.hora_fim && ` - ${appointment.hora_fim}`}
                {appointment.duracao_minutos && ` (${appointment.duracao_minutos} min)`}
              </span>
            </div>

            {/* Linked venda */}
            {appointment.venda_id && (
              <p className="text-sm text-muted-foreground">
                Vinculado a venda #{(appointment as Record<string, unknown>).venda ? ((appointment as Record<string, unknown>).venda as Record<string, string>)?.numero_venda : appointment.venda_id.slice(0, 8)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timer Section */}
        <Card className="border-2">
          <CardContent className="py-8 px-4">
            {/* Timer display */}
            <div className="text-center mb-6">
              <p className="font-mono text-5xl sm:text-6xl font-bold tracking-wider tabular-nums">
                {displayFormatted}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isRunning && 'Cronometro em andamento'}
                {isPaused && 'Cronometro pausado'}
                {isStopped && !activeTimer && 'Pronto para iniciar'}
                {isStopped && activeTimer && 'Cronometro finalizado'}
              </p>
            </div>

            {/* Timer controls */}
            <div className="flex items-center justify-center gap-4">
              {isStopped && !activeTimer && (
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={startTimer.isPending}
                  className="gap-2 h-14 px-8 text-lg"
                >
                  {startTimer.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  Iniciar
                </Button>
              )}

              {isRunning && (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handlePause}
                    disabled={pauseTimer.isPending}
                    className="gap-2 h-14 px-6 text-lg"
                  >
                    {pauseTimer.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                    Pausar
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStop}
                    disabled={stopTimer.isPending}
                    className="gap-2 h-14 px-6 text-lg"
                  >
                    {stopTimer.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                    Parar
                  </Button>
                </>
              )}

              {isPaused && (
                <>
                  <Button
                    size="lg"
                    onClick={handleResume}
                    disabled={resumeTimer.isPending}
                    className="gap-2 h-14 px-6 text-lg"
                  >
                    {resumeTimer.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                    Retomar
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStop}
                    disabled={stopTimer.isPending}
                    className="gap-2 h-14 px-6 text-lg"
                  >
                    {stopTimer.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                    Parar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Reschedule next session */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={() => setShowReschedule(!showReschedule)}
              >
                <CalendarPlus className="h-4 w-4" />
                Reagendar Proxima Sessao
              </Button>

              {showReschedule && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="reschedule-date">Data</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleDate}
                      onChange={e => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reschedule-time">Horario</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleTime}
                      onChange={e => setRescheduleTime(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleReschedule} className="w-full">
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observacoes */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label htmlFor="observacoes">Observacoes do Atendimento</Label>
              <Textarea
                id="observacoes"
                placeholder="Notas sobre o atendimento, reacoes do cliente, produtos utilizados..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Finish button */}
          <Button
            size="lg"
            className="w-full gap-2 h-14 text-lg"
            onClick={handleFinish}
            disabled={isFinishing}
          >
            {isFinishing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            Finalizar Atendimento
          </Button>
        </div>
      </div>
    </div>
  );
}
