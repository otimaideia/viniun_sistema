import { ClienteLayout } from '@/components/cliente';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { useClienteAgendamentosAdapter } from '@/hooks/useClienteAgendamentosAdapter';
import { useClienteHistorico } from '@/hooks/useClienteHistorico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  History, Loader2, Calendar, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, Clock, MapPin
} from 'lucide-react';

const statusDisplay: Record<string, { label: string; color: string; icon: any }> = {
  concluido: { label: 'Realizado', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  realizado: { label: 'Realizado', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock },
  agendado: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  nao_compareceu: { label: 'Não Compareceu', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  remarcado: { label: 'Remarcado', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ArrowRight },
};

const tipoDisplay: Record<string, { label: string; color: string }> = {
  avaliacao: { label: 'Avaliação', color: 'bg-emerald-100 text-emerald-700' },
  procedimento_fechado: { label: 'Procedimento', color: 'bg-blue-100 text-blue-700' },
  cortesia: { label: 'Cortesia', color: 'bg-amber-100 text-amber-700' },
};

export default function ClienteHistorico() {
  const { lead } = useClienteAuthContext();
  const { agendamentos, isLoading: isLoadingAgendamentos } = useClienteAgendamentosAdapter(lead?.id || null);
  const {
    totalPresencas,
    totalFaltas,
    totalCancelados,
    taxaPresenca,
    isLoading: isLoadingHistorico,
  } = useClienteHistorico(lead?.id || null);

  const isLoading = isLoadingAgendamentos || isLoadingHistorico;

  // Separar agendamentos por categoria
  const agendamentosRealizados = agendamentos.filter(a =>
    ['concluido', 'realizado', 'em_atendimento', 'confirmado'].includes(a.status || '')
  );
  const agendamentosFaltados = agendamentos.filter(a => a.status === 'nao_compareceu');
  const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado');

  return (
    <ClienteLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-500">Todos os seus agendamentos e presenças</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        ) : (
          <>
            {/* Resumo de Presença */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{totalPresencas}</p>
                  <p className="text-sm text-gray-500">Presenças</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{totalFaltas}</p>
                  <p className="text-sm text-gray-500">Faltas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{totalCancelados}</p>
                  <p className="text-sm text-gray-500">Cancelados</p>
                </CardContent>
              </Card>
              <Card className={taxaPresenca >= 80 ? 'border-green-200' : taxaPresenca >= 50 ? 'border-amber-200' : 'border-red-200'}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${
                    taxaPresenca >= 80 ? 'text-green-600' : taxaPresenca >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>{taxaPresenca}%</p>
                  <p className="text-sm text-gray-500">Taxa Presença</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs com todos os agendamentos */}
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-4 mb-6">
                <TabsTrigger value="todos" className="text-xs sm:text-sm data-[state=active]:bg-[#662E8E] data-[state=active]:text-white">
                  Todos ({agendamentos.length})
                </TabsTrigger>
                <TabsTrigger value="presencas" className="text-xs sm:text-sm">
                  Presenças ({agendamentosRealizados.length})
                </TabsTrigger>
                <TabsTrigger value="faltas" className="text-xs sm:text-sm">
                  Faltas ({agendamentosFaltados.length})
                </TabsTrigger>
                <TabsTrigger value="cancelados" className="text-xs sm:text-sm">
                  Cancelados ({agendamentosCancelados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todos">
                <AppointmentList appointments={agendamentos} />
              </TabsContent>
              <TabsContent value="presencas">
                <AppointmentList appointments={agendamentosRealizados} emptyMessage="Nenhuma presença registrada" />
              </TabsContent>
              <TabsContent value="faltas">
                <AppointmentList appointments={agendamentosFaltados} emptyMessage="Nenhuma falta registrada" />
              </TabsContent>
              <TabsContent value="cancelados">
                <AppointmentList appointments={agendamentosCancelados} emptyMessage="Nenhum cancelamento" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ClienteLayout>
  );
}

function AppointmentList({ appointments, emptyMessage = 'Nenhum agendamento encontrado' }: {
  appointments: any[];
  emptyMessage?: string;
}) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((ag) => {
        const status = statusDisplay[ag.status] || statusDisplay.pendente;
        const tipo = tipoDisplay[ag.tipo] || tipoDisplay.avaliacao;
        const StatusIcon = status.icon;

        const dateStr = ag.data_agendamento?.includes('T')
          ? ag.data_agendamento.split('T')[0]
          : ag.data_agendamento;
        let dateFormatted = '-';
        try {
          dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        } catch {}

        return (
          <Card key={ag.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  ag.status === 'concluido' || ag.status === 'realizado' ? 'bg-green-100' :
                  ag.status === 'nao_compareceu' ? 'bg-amber-100' :
                  ag.status === 'cancelado' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  <StatusIcon className={`h-5 w-5 ${
                    ag.status === 'concluido' || ag.status === 'realizado' ? 'text-green-600' :
                    ag.status === 'nao_compareceu' ? 'text-amber-600' :
                    ag.status === 'cancelado' ? 'text-red-600' :
                    'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-gray-900">
                      {ag.servico_nome || ag.servico || 'Sessão'}
                    </p>
                    <Badge variant="outline" className={`text-xs ${tipo.color}`}>
                      {tipo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateFormatted}
                    </span>
                    {ag.hora_inicio && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {ag.hora_inicio.substring(0, 5)}
                      </span>
                    )}
                    {ag.unidade_nome && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {ag.unidade_nome}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`${status.color} flex-shrink-0`}>
                  {status.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
