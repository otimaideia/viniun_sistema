import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TotemAgendamento } from '@/types/checkin';
import { Calendar, Clock, Sparkles, Check, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TotemAgendamentoCardProps {
  agendamento: TotemAgendamento;
  onCheckin: () => void;
  isLoading?: boolean;
}

export function TotemAgendamentoCard({
  agendamento,
  onCheckin,
  isLoading,
}: TotemAgendamentoCardProps) {
  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  const formatDate = (date: string) => {
    // Handle both "YYYY-MM-DD" and full ISO datetime "YYYY-MM-DDTHH:mm:ss+00:00"
    const dateOnly = date.includes('T') ? date.split('T')[0] : date;
    const d = new Date(dateOnly + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (d.getTime() === today.getTime()) {
      return 'Hoje';
    }

    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Card className={cn(
      'bg-white shadow-xl overflow-hidden',
      'transform transition-all duration-300',
      agendamento.ja_fez_checkin && 'ring-2 ring-green-500'
    )}>
      {/* Header com status */}
      <div className={cn(
        'px-6 py-3 flex items-center justify-between',
        agendamento.ja_fez_checkin
          ? 'bg-green-500 text-white'
          : 'bg-[#662E8E] text-white'
      )}>
        <span className="font-semibold">
          {agendamento.ja_fez_checkin ? 'Check-in Realizado' : 'Agendamento Encontrado'}
        </span>
        <Badge variant="secondary" className="bg-white/20 text-white border-0">
          {agendamento.status === 'confirmado' ? 'Confirmado' : 'Agendado'}
        </Badge>
      </div>

      <CardContent className="p-6">
        {/* Nome do cliente */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          {agendamento.lead_nome}
        </h2>

        {/* Informações do agendamento */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-10 h-10 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#662E8E]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Data</p>
              <p className="font-semibold text-gray-900">
                {formatDate(agendamento.data_agendamento)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-10 h-10 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#662E8E]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Horário</p>
              <p className="font-semibold text-gray-900">
                {formatTime(agendamento.hora_inicio)}
                {agendamento.hora_fim && ` - ${formatTime(agendamento.hora_fim)}`}
              </p>
            </div>
          </div>

          {agendamento.servico && (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#662E8E]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Serviço</p>
                <p className="font-semibold text-gray-900">{agendamento.servico}</p>
              </div>
            </div>
          )}
        </div>

        {/* Botão de check-in */}
        {agendamento.ja_fez_checkin ? (
          <div className="flex items-center justify-center gap-2 py-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <span className="text-green-700 font-semibold">Presença confirmada!</span>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600"
            onClick={onCheckin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Confirmando...
              </>
            ) : (
              <>
                <Check className="h-6 w-6 mr-2" />
                Confirmar Chegada
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
