import { ClienteLayout } from '@/components/cliente';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { useClienteHistorico } from '@/hooks/useClienteHistorico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2, Clock, XCircle, Gift, Calendar } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Clock },
  concluido: { label: 'Concluído', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
};

const sessionStatusConfig: Record<string, { label: string; color: string }> = {
  concluido: { label: 'Realizada', color: 'bg-green-100 text-green-700' },
  agendado: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-600' },
  cancelado: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  nao_compareceu: { label: 'Faltou', color: 'bg-amber-100 text-amber-700' },
};

export default function ClienteServicos() {
  const { lead } = useClienteAuthContext();
  const {
    treatmentPlans,
    activePlans,
    totalSessoesRestantes,
    cortesias,
    totalCortesias,
    isLoading,
  } = useClienteHistorico(lead?.id || null);

  return (
    <ClienteLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Meus Serviços</h1>
          <p className="text-gray-500">Acompanhe seus planos de tratamento e cortesias</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-[#662E8E]">{activePlans}</p>
                  <p className="text-sm text-gray-500">Planos Ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalSessoesRestantes}</p>
                  <p className="text-sm text-gray-500">Sessões Restantes</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{totalCortesias}</p>
                  <p className="text-sm text-gray-500">Cortesias</p>
                </CardContent>
              </Card>
            </div>

            {/* Planos de Tratamento */}
            {treatmentPlans.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#662E8E]" />
                  Planos de Tratamento
                </h2>

                {treatmentPlans.map((plan) => {
                  const progress = plan.total_sessoes > 0
                    ? Math.round((plan.sessoes_concluidas / plan.total_sessoes) * 100)
                    : 0;
                  const config = statusConfig[plan.status] || statusConfig.pendente;

                  return (
                    <Card key={plan.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base">{plan.servico_nome || 'Tratamento'}</CardTitle>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Barra de Progresso */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-500">
                              {plan.sessoes_concluidas} de {plan.total_sessoes} sessões
                            </span>
                            <span className="text-sm font-semibold text-[#662E8E]">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Lista de Sessões */}
                        {plan.sessions && plan.sessions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Sessões:</p>
                            <div className="divide-y">
                              {plan.sessions
                                .sort((a, b) => a.numero_sessao - b.numero_sessao)
                                .map((session) => {
                                  const sConfig = sessionStatusConfig[session.status] || sessionStatusConfig.pendente;
                                  return (
                                    <div
                                      key={session.id}
                                      className="flex items-center justify-between py-2 text-sm"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                                          {session.numero_sessao}
                                        </span>
                                        <div>
                                          {session.data_realizada ? (
                                            <span className="text-gray-700">
                                              {new Date(session.data_realizada + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </span>
                                          ) : session.data_prevista ? (
                                            <span className="text-gray-500">
                                              Prevista: {new Date(session.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Sem data</span>
                                          )}
                                          {session.profissional_nome && (
                                            <span className="text-gray-400 ml-2">- {session.profissional_nome}</span>
                                          )}
                                        </div>
                                      </div>
                                      <Badge variant="outline" className={`text-xs ${sConfig.color}`}>
                                        {sConfig.label}
                                      </Badge>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-700 mb-2 text-lg">
                    Nenhum plano de tratamento
                  </h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Quando você contratar um serviço, seus planos de tratamento aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Cortesias */}
            {cortesias.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-600" />
                  Cortesias ({cortesias.length})
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cortesias.map((c) => (
                    <Card key={c.id} className="border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Gift className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {c.servico_nome || 'Cortesia'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {c.data_agendamento
                                ? new Date(c.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR')
                                : '-'}
                            </p>
                          </div>
                          <Badge variant="outline" className={
                            c.status === 'concluido' ? 'bg-green-100 text-green-700' :
                            c.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>
                            {c.status === 'concluido' ? 'Realizada' :
                             c.status === 'cancelado' ? 'Cancelada' :
                             'Pendente'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ClienteLayout>
  );
}
