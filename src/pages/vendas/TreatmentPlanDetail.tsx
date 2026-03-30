import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, User, AlertTriangle, CheckCircle2,
  Pause, Play, X, CalendarPlus, MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTreatmentPlanMT, useTreatmentSessionsMT } from '@/hooks/multitenant/useTreatmentPlansMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import {
  TREATMENT_PLAN_STATUS_LABELS,
  TREATMENT_SESSION_STATUS_LABELS,
  RECURRENCE_TYPE_LABELS,
  SCHEDULE_STRATEGY_LABELS,
} from '@/types/treatment-plan';
import type { TreatmentPlanStatus, TreatmentSessionStatus } from '@/types/treatment-plan';

const STATUS_COLORS: Record<TreatmentPlanStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  ativo: 'bg-green-100 text-green-800',
  pausado: 'bg-orange-100 text-orange-800',
  concluido: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-red-100 text-red-800',
};

const SESSION_STATUS_COLORS: Record<TreatmentSessionStatus, string> = {
  pendente: 'bg-gray-100 text-gray-800',
  agendado: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-indigo-100 text-indigo-800',
  em_atendimento: 'bg-purple-100 text-purple-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  nao_compareceu: 'bg-orange-100 text-orange-800',
  reagendado: 'bg-yellow-100 text-yellow-800',
};

interface ProfissionalOption {
  id: string;
  nome: string;
}

export default function TreatmentPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { plan, isLoading } = useTreatmentPlanMT(planId);
  const { sessions, scheduleSession, completeSession, cancelSession } = useTreatmentSessionsMT(planId);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleHora, setScheduleHora] = useState('');
  const [scheduleHoraFim, setScheduleHoraFim] = useState('');
  const [scheduleProfissionalId, setScheduleProfissionalId] = useState('');
  const [scheduleProfissionalNome, setScheduleProfissionalNome] = useState('');
  const [scheduleObs, setScheduleObs] = useState('');
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  // Fetch profissionais on dialog open
  const openScheduleDialog = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setScheduleDate('');
    setScheduleHora('');
    setScheduleHoraFim('');
    setScheduleProfissionalId('');
    setScheduleProfissionalNome('');
    setScheduleObs('');

    if (tenant?.id) {
      const { data } = await supabase
        .from('mt_users')
        .select('id, nome')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('nome');
      if (data) setProfissionais(data as ProfissionalOption[]);
    }

    setScheduleDialogOpen(true);
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleHora || !scheduleProfissionalId) {
      return;
    }
    setIsScheduling(true);
    try {
      await scheduleSession({
        treatment_session_id: selectedSessionId,
        data_agendamento: scheduleDate,
        hora_inicio: scheduleHora,
        hora_fim: scheduleHoraFim || undefined,
        profissional_id: scheduleProfissionalId,
        profissional_nome: scheduleProfissionalNome,
        observacoes: scheduleObs || undefined,
      });
      setScheduleDialogOpen(false);
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card><CardContent className="p-8"><div className="h-64 bg-muted animate-pulse rounded" /></CardContent></Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Plano nao encontrado</CardContent></Card>
      </div>
    );
  }

  const progresso = plan.total_sessoes > 0
    ? (plan.sessoes_concluidas / plan.total_sessoes) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <Link to="/vendas/tratamentos" className="hover:text-foreground">Tratamentos</Link>
            <span>/</span>
            <span>{plan.cliente_nome}</span>
          </div>
          <h1 className="text-2xl font-bold">{plan.cliente_nome}</h1>
          <p className="text-muted-foreground">{plan.service?.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${STATUS_COLORS[plan.status]} text-sm`}>
            {TREATMENT_PLAN_STATUS_LABELS[plan.status]}
          </Badge>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>

      {/* Inadimplencia Alert */}
      {!plan.pagamento_em_dia && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <div className="font-semibold text-red-800">Cliente Inadimplente</div>
                <p className="text-sm text-red-600">
                  Agendamento de novas sessoes esta bloqueado ate a regularizacao do pagamento.
                  {plan.data_proximo_pagamento && (
                    <span> Proximo pagamento: {new Date(plan.data_proximo_pagamento).toLocaleDateString('pt-BR')}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span className="font-bold">{plan.sessoes_concluidas}/{plan.total_sessoes}</span>
              </div>
              <Progress value={progresso} className="h-3" />
              <p className="text-xs text-muted-foreground">{progresso.toFixed(0)}% concluido</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recorrencia</span>
            </div>
            <div className="font-semibold">
              {RECURRENCE_TYPE_LABELS[plan.recorrencia_tipo] || plan.recorrencia_tipo}
            </div>
            <p className="text-xs text-muted-foreground">
              A cada {plan.recorrencia_intervalo_dias} dias
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Estrategia</span>
            </div>
            <div className="font-semibold text-sm">
              {SCHEDULE_STRATEGY_LABELS[plan.geracao_agenda] || plan.geracao_agenda}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Profissional Pref.</span>
            </div>
            <div className="font-semibold text-sm">
              {plan.profissional_preferencial?.nome || 'Nao definido'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Link */}
      {plan.sale && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Venda vinculada: </span>
                <span className="font-medium">#{plan.sale.numero_venda}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/vendas/${plan.sale_id}`}>Ver Venda</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Sessoes ({sessions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions && sessions.length > 0 ? (
              sessions.map((session) => {
                const isPendente = session.status === 'pendente';
                const isConcluido = session.status === 'concluido';
                const canSchedule = isPendente && plan.status === 'ativo' && plan.pagamento_em_dia;

                return (
                  <div
                    key={session.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      isConcluido ? 'bg-green-50 border-green-200' :
                      session.status === 'cancelado' ? 'bg-red-50 border-red-200' :
                      session.status === 'agendado' ? 'bg-blue-50 border-blue-200' :
                      'bg-background'
                    }`}
                  >
                    {/* Session number */}
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold ${
                      isConcluido ? 'bg-green-200 text-green-800' :
                      session.status === 'agendado' ? 'bg-blue-200 text-blue-800' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {session.numero_sessao}
                    </div>

                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Sessao {session.numero_sessao}/{plan.total_sessoes}
                        </span>
                        <Badge className={SESSION_STATUS_COLORS[session.status]}>
                          {TREATMENT_SESSION_STATUS_LABELS[session.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {session.data_prevista && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Previsto: {new Date(session.data_prevista).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {session.data_realizada && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Realizado: {new Date(session.data_realizada).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {session.profissional_nome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {session.profissional_nome}
                          </span>
                        )}
                        {session.hora_inicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.hora_inicio}
                            {session.hora_fim && ` - ${session.hora_fim}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {canSchedule && (
                        <Button
                          size="sm"
                          onClick={() => openScheduleDialog(session.id)}
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                          Agendar
                        </Button>
                      )}
                      {isPendente && !plan.pagamento_em_dia && plan.bloquear_se_inadimplente && (
                        <Badge variant="destructive" className="text-xs">
                          Bloqueado
                        </Badge>
                      )}
                      {(session.status === 'agendado' || session.status === 'confirmado') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => completeSession(session.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar Concluida
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelSession(session.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar Sessao
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma sessao encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {plan.observacoes && (
        <Card>
          <CardHeader><CardTitle>Observacoes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{plan.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Sessao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Horario Inicio *</Label>
                <Input
                  type="time"
                  value={scheduleHora}
                  onChange={(e) => setScheduleHora(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Horario Fim</Label>
                <Input
                  type="time"
                  value={scheduleHoraFim}
                  onChange={(e) => setScheduleHoraFim(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select
                value={scheduleProfissionalId}
                onValueChange={(v) => {
                  setScheduleProfissionalId(v);
                  const prof = profissionais.find(p => p.id === v);
                  setScheduleProfissionalNome(prof?.nome || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea
                value={scheduleObs}
                onChange={(e) => setScheduleObs(e.target.value)}
                placeholder="Observacoes sobre o agendamento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={isScheduling || !scheduleDate || !scheduleHora || !scheduleProfissionalId}
            >
              {isScheduling ? 'Agendando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
