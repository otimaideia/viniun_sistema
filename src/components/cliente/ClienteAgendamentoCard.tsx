import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Sparkles, Check, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgendamentoData {
  id: string;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim?: string | null;
  servico?: string | null;
  status: string;
  unidade_nome?: string;
  unidade_cidade?: string;
  ja_fez_checkin?: boolean;
}

interface ClienteAgendamentoCardProps {
  agendamento: AgendamentoData;
  onCheckin?: () => void;
  onRemarcar?: () => void;
  onCancelar?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

export function ClienteAgendamentoCard({
  agendamento,
  onCheckin,
  onRemarcar,
  onCancelar,
  isLoading,
  showActions = true,
}: ClienteAgendamentoCardProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';

    try {
      // Handle different date formats (YYYY-MM-DD or full ISO string)
      const dateStr = date.includes('T') ? date.split('T')[0] : date;
      const d = new Date(dateStr + 'T00:00:00');

      // Check if date is valid
      if (isNaN(d.getTime())) return '-';

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (d.getTime() === today.getTime()) {
        return 'Hoje';
      }
      if (d.getTime() === tomorrow.getTime()) {
        return 'Amanhã';
      }

      return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '-';
    }
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  // Extract date string (YYYY-MM-DD) from various formats
  const getDateString = (date: string | null | undefined) => {
    if (!date) return '';
    return date.includes('T') ? date.split('T')[0] : date;
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateStr = getDateString(agendamento.data_agendamento);
    return dateStr === today;
  };

  const isPast = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateStr = getDateString(agendamento.data_agendamento);
    return dateStr < today;
  };

  const getStatusBadge = () => {
    switch (agendamento.status) {
      case 'confirmado':
        return <Badge className="bg-green-500">Confirmado</Badge>;
      case 'agendado':
        return <Badge className="bg-blue-500">Agendado</Badge>;
      case 'realizado':
        return <Badge className="bg-purple-500">Realizado</Badge>;
      case 'cancelado':
        return <Badge variant="secondary">Cancelado</Badge>;
      case 'nao_compareceu':
        return <Badge variant="destructive">Não Compareceu</Badge>;
      default:
        return <Badge variant="outline">{agendamento.status}</Badge>;
    }
  };

  const canCheckin = isToday() && !agendamento.ja_fez_checkin &&
    ['agendado', 'confirmado'].includes(agendamento.status);

  const canModify = !isPast() && ['agendado', 'confirmado'].includes(agendamento.status);

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      agendamento.ja_fez_checkin && 'ring-2 ring-green-500',
      isPast() && 'opacity-75'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {agendamento.ja_fez_checkin && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Check-in feito
              </Badge>
            )}
          </div>
        </div>

        {/* Informações */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-[#662E8E]" />
            <span className="font-medium">{formatDate(agendamento.data_agendamento)}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 text-[#662E8E]" />
            <span>
              {formatTime(agendamento.hora_inicio)}
              {agendamento.hora_fim && ` - ${formatTime(agendamento.hora_fim)}`}
            </span>
          </div>

          {agendamento.servico && (
            <div className="flex items-center gap-2 text-gray-600">
              <Sparkles className="h-4 w-4 text-[#662E8E]" />
              <span>{agendamento.servico}</span>
            </div>
          )}

          {agendamento.unidade_nome && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4 text-[#662E8E]" />
              <span>
                {agendamento.unidade_nome}
                {agendamento.unidade_cidade && ` - ${agendamento.unidade_cidade}`}
              </span>
            </div>
          )}
        </div>

        {/* Ações */}
        {showActions && (
          <div className="flex flex-col sm:flex-row gap-2">
            {canCheckin && onCheckin && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 flex-1 sm:flex-none"
                onClick={onCheckin}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" />
                Fazer Check-in
              </Button>
            )}

            <div className="flex gap-2">
              {canModify && onRemarcar && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRemarcar}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Remarcar
                </Button>
              )}

              {canModify && onCancelar && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50"
                  onClick={onCancelar}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
