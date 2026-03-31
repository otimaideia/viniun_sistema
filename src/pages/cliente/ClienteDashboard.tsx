import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClienteLayout, ClienteAgendamentoCard } from '@/components/cliente';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { useClienteAgendamentosAdapter } from '@/hooks/useClienteAgendamentosAdapter';
import { useClienteHistorico } from '@/hooks/useClienteHistorico';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Sparkles, ChevronRight, Loader2, CalendarCheck, CalendarX, History, MapPin, DoorOpen, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { lead } = useClienteAuthContext();
  const {
    proximoAgendamento,
    agendamentosFuturos,
    agendamentosPassados,
    isLoading,
    fazerCheckin,
    registrarComparecimento,
    error,
  } = useClienteAgendamentosAdapter(lead?.id || null);

  const {
    treatmentPlans,
    activePlans,
    totalSessoesRestantes,
    totalPresencas,
    totalFaltas,
    taxaPresenca,
  } = useClienteHistorico(lead?.id || null);

  const [franchises, setFranchises] = useState<{ id: string; nome_fantasia: string; cidade: string }[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);

  // Buscar franquias do tenant do lead
  useEffect(() => {
    if (!lead?.tenant_id) return;
    supabase
      .from('mt_franchises')
      .select('id, nome_fantasia, cidade')
      .eq('tenant_id', lead.tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('nome_fantasia')
      .then(({ data }) => {
        setFranchises(data || []);
        // Auto-selecionar se lead já tem franchise
        if (lead.franchise_id) {
          setSelectedFranchise(lead.franchise_id);
        } else if (data?.length === 1) {
          setSelectedFranchise(data[0].id);
        }
      });
  }, [lead?.tenant_id, lead?.franchise_id]);

  const handleCheckin = async () => {
    if (!proximoAgendamento) return;

    const success = await fazerCheckin(proximoAgendamento.id);
    if (success) {
      toast.success('Check-in realizado com sucesso!');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleWalkIn = async () => {
    if (!selectedFranchise || !lead) {
      toast.error('Selecione a unidade onde você está');
      return;
    }

    setIsRegistering(true);
    const success = await registrarComparecimento(selectedFranchise, lead);
    setIsRegistering(false);

    if (success) {
      toast.success('Presença registrada com sucesso!');
      setShowWalkIn(false);
    } else if (error) {
      toast.error(error);
    }
  };

  const firstName = lead?.nome?.split(' ')[0] || 'Cliente';

  return (
    <ClienteLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header - Mobile only (desktop shows in layout) */}
        <div className="lg:hidden">
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {firstName}!
          </h1>
          <p className="text-gray-500">
            Bem-vindo(a) ao seu portal Viniun
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Banner: Complete seu perfil */}
            {lead && !lead.cpf && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-amber-800">Complete seu perfil</p>
                    <p className="text-sm text-amber-600">Adicione seu CPF e foto para uma experiência melhor.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    onClick={() => navigate('/cliente/perfil')}
                  >
                    Atualizar
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Desktop Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-[#662E8E] to-[#4a2268] text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80">Próximos</p>
                      <p className="text-3xl font-bold">{agendamentosFuturos.length}</p>
                      <p className="text-sm text-white/80">agendamentos</p>
                    </div>
                    <CalendarCheck className="h-12 w-12 text-white/30" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Realizados</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {agendamentosPassados.filter(a => a.status === 'realizado').length}
                      </p>
                      <p className="text-sm text-gray-500">sessões</p>
                    </div>
                    <History className="h-12 w-12 text-gray-200" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Cancelados</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {agendamentosPassados.filter(a => a.status === 'cancelado').length}
                      </p>
                      <p className="text-sm text-gray-500">agendamentos</p>
                    </div>
                    <CalendarX className="h-12 w-12 text-gray-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Walk-in - Registrar Comparecimento */}
            {!showWalkIn ? (
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50/50 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowWalkIn(true)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <DoorOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900">Estou na unidade</p>
                    <p className="text-sm text-green-700">Registrar presença sem agendamento prévio</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-green-400" />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                    <DoorOpen className="h-5 w-5" />
                    Registrar Presença
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-green-700">
                    Selecione a unidade onde você está para registrar sua presença:
                  </p>
                  <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {franchises.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {f.nome_fantasia} - {f.cidade}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleWalkIn}
                      disabled={!selectedFranchise || isRegistering}
                    >
                      {isRegistering ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <DoorOpen className="h-4 w-4 mr-2" />
                      )}
                      Confirmar Presença
                    </Button>
                    <Button variant="outline" onClick={() => setShowWalkIn(false)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Próximo agendamento - Takes 2 columns on desktop */}
              <div className="lg:col-span-2 space-y-6">
                {proximoAgendamento ? (
                  <Card className="border-[#662E8E]/30 bg-gradient-to-r from-[#662E8E]/5 to-transparent">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#662E8E]" />
                        Próximo Agendamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ClienteAgendamentoCard
                        agendamento={proximoAgendamento}
                        onCheckin={handleCheckin}
                        onRemarcar={() => navigate('/cliente/agendamentos')}
                        onCancelar={() => navigate('/cliente/agendamentos')}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-700 mb-2 text-lg">
                        Nenhum agendamento próximo
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Entre em contato com a unidade Viniun mais próxima para agendar sua sessão
                      </p>
                      <Button
                        variant="outline"
                        className="border-[#662E8E] text-[#662E8E] hover:bg-[#662E8E]/5"
                      >
                        Ver histórico
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Outros agendamentos futuros */}
                {agendamentosFuturos.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Outros Agendamentos</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/cliente/agendamentos')}
                          className="text-[#662E8E] hover:text-[#4a2268]"
                        >
                          Ver todos
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agendamentosFuturos.slice(1, 4).map((ag) => (
                        <div
                          key={ag.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => navigate('/cliente/agendamentos')}
                        >
                          <div className="w-12 h-12 rounded-full bg-[#662E8E]/10 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-6 w-6 text-[#662E8E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {ag.servico || 'Sessão'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(() => {
                                const dateStr = ag.data_agendamento?.includes('T')
                                  ? ag.data_agendamento.split('T')[0]
                                  : ag.data_agendamento;
                                try {
                                  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
                                    day: 'numeric',
                                    month: 'short',
                                  });
                                } catch {
                                  return '-';
                                }
                              })()} às {ag.hora_inicio?.substring(0, 5) || '-'}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Resumo de Presença */}
                {(totalPresencas > 0 || totalFaltas > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#662E8E]" />
                        Minha Presença
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Taxa de presença</span>
                        <span className={`text-lg font-bold ${
                          taxaPresenca >= 80 ? 'text-green-600' : taxaPresenca >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>{taxaPresenca}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-600">{totalPresencas}</p>
                          <p className="text-xs text-green-700">Presenças</p>
                        </div>
                        <div className="text-center p-2 bg-amber-50 rounded-lg">
                          <p className="text-lg font-bold text-amber-600">{totalFaltas}</p>
                          <p className="text-xs text-amber-700">Faltas</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[#662E8E] hover:text-[#4a2268]"
                        onClick={() => navigate('/cliente/historico')}
                      >
                        Ver histórico completo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Planos de Tratamento Ativos */}
                {treatmentPlans.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#662E8E]" />
                        Meus Tratamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {treatmentPlans.slice(0, 3).map(plan => {
                        const progress = plan.total_sessoes > 0
                          ? Math.round((plan.sessoes_concluidas / plan.total_sessoes) * 100)
                          : 0;
                        return (
                          <div key={plan.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700 truncate">{plan.servico_nome || 'Tratamento'}</span>
                              <span className="text-xs text-gray-500">{plan.sessoes_concluidas}/{plan.total_sessoes}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        );
                      })}
                      {activePlans > 0 && (
                        <p className="text-xs text-gray-500 text-center">
                          {totalSessoesRestantes} sessões restantes
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[#662E8E] hover:text-[#4a2268]"
                        onClick={() => navigate('/cliente/servicos')}
                      >
                        Ver todos os serviços
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Ações Rápidas */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4 gap-3"
                      onClick={() => navigate('/cliente/agendamentos')}
                    >
                      <Calendar className="h-5 w-5 text-[#662E8E]" />
                      <span className="font-medium">Agendamentos</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4 gap-3"
                      onClick={() => navigate('/cliente/servicos')}
                    >
                      <Sparkles className="h-5 w-5 text-[#662E8E]" />
                      <span className="font-medium">Meus Serviços</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4 gap-3"
                      onClick={() => navigate('/cliente/historico')}
                    >
                      <History className="h-5 w-5 text-[#662E8E]" />
                      <span className="font-medium">Histórico</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4 gap-3"
                      onClick={() => navigate('/cliente/perfil')}
                    >
                      <Clock className="h-5 w-5 text-[#662E8E]" />
                      <span className="font-medium">Meus Dados</span>
                    </Button>
                  </CardContent>
                </Card>

                {/* Info card */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Precisa de ajuda?</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Entre em contato com a unidade Viniun mais próxima para agendar ou remarcar suas sessões.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Falar com a unidade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </ClienteLayout>
  );
}
