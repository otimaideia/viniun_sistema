import { useState } from 'react';
import { ClienteLayout, ClienteAgendamentoCard, ClienteRemarcarModal } from '@/components/cliente';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { useClienteAgendamentosAdapter } from '@/hooks/useClienteAgendamentosAdapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, History, Loader2, CalendarCheck, CalendarX } from 'lucide-react';
import { toast } from 'sonner';

export default function ClienteAgendamentos() {
  const { lead } = useClienteAuthContext();
  const {
    agendamentosFuturos,
    agendamentosPassados,
    isLoading,
    fazerCheckin,
    cancelarAgendamento,
    remarcarAgendamento,
    error,
  } = useClienteAgendamentosAdapter(lead?.id || null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [remarcarModalOpen, setRemarcarModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<typeof agendamentosFuturos[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckin = async (agendamentoId: string) => {
    setIsProcessing(true);
    const success = await fazerCheckin(agendamentoId);
    setIsProcessing(false);

    if (success) {
      toast.success('Check-in realizado com sucesso!');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleCancelar = (agendamentoId: string) => {
    setSelectedId(agendamentoId);
    setCancelDialogOpen(true);
  };

  const confirmCancelar = async () => {
    if (!selectedId) return;

    setIsProcessing(true);
    const success = await cancelarAgendamento(selectedId);
    setIsProcessing(false);
    setCancelDialogOpen(false);

    if (success) {
      toast.success('Agendamento cancelado');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleRemarcar = (agendamento: typeof agendamentosFuturos[0]) => {
    setSelectedAgendamento(agendamento);
    setRemarcarModalOpen(true);
  };

  const confirmRemarcar = async (novaData: string, novaHora: string): Promise<boolean> => {
    if (!selectedAgendamento) return false;

    setIsProcessing(true);
    const success = await remarcarAgendamento(selectedAgendamento.id, novaData, novaHora);
    setIsProcessing(false);

    if (success) {
      toast.success('Agendamento remarcado com sucesso!');
      setSelectedAgendamento(null);
      return true;
    } else if (error) {
      toast.error(error);
    }
    return false;
  };

  return (
    <ClienteLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-gray-500">Gerencie suas sessões na Viniun</p>
          </div>

          {/* Stats - Desktop only */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#662E8E]/10 rounded-lg">
              <CalendarCheck className="h-5 w-5 text-[#662E8E]" />
              <span className="font-semibold text-[#662E8E]">{agendamentosFuturos.length}</span>
              <span className="text-sm text-[#662E8E]">próximos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
              <History className="h-5 w-5 text-gray-500" />
              <span className="font-semibold text-gray-700">{agendamentosPassados.length}</span>
              <span className="text-sm text-gray-500">no histórico</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        ) : (
          <Tabs defaultValue="futuros" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="futuros" className="gap-2 data-[state=active]:bg-[#662E8E] data-[state=active]:text-white">
                <Calendar className="h-4 w-4" />
                Próximos ({agendamentosFuturos.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="h-4 w-4" />
                Histórico ({agendamentosPassados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="futuros">
              {agendamentosFuturos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-700 mb-2 text-lg">
                      Nenhum agendamento futuro
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Entre em contato com a unidade Viniun para agendar sua próxima sessão
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {agendamentosFuturos.map((ag) => (
                    <ClienteAgendamentoCard
                      key={ag.id}
                      agendamento={ag}
                      onCheckin={() => handleCheckin(ag.id)}
                      onRemarcar={() => handleRemarcar(ag)}
                      onCancelar={() => handleCancelar(ag.id)}
                      isLoading={isProcessing}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico">
              {agendamentosPassados.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-700 mb-2 text-lg">
                      Nenhum agendamento no histórico
                    </h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Seus agendamentos anteriores aparecerão aqui
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {agendamentosPassados.map((ag) => (
                    <ClienteAgendamentoCard
                      key={ag.id}
                      agendamento={ag}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-red-500" />
              Cancelar Agendamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Não, manter
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelar}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de remarcação */}
      <ClienteRemarcarModal
        open={remarcarModalOpen}
        onOpenChange={setRemarcarModalOpen}
        agendamento={selectedAgendamento}
        onConfirm={confirmRemarcar}
      />
    </ClienteLayout>
  );
}
