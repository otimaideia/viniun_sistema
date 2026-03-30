import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteRemarcarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: {
    id: string;
    data_agendamento: string;
    hora_inicio: string;
    servico?: string | null;
  } | null;
  onConfirm: (novaData: string, novaHora: string) => Promise<boolean>;
}

// Horários disponíveis (simplificado - em produção viria da API)
const HORARIOS_DISPONIVEIS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export function ClienteRemarcarModal({
  open,
  onOpenChange,
  agendamento,
  onConfirm,
}: ClienteRemarcarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    const novaData = format(selectedDate, 'yyyy-MM-dd');
    const success = await onConfirm(novaData, selectedTime);
    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      setSelectedDate(undefined);
      setSelectedTime('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedDate(undefined);
    setSelectedTime('');
  };

  // Desabilitar datas passadas e próximos 1 dia (margem de segurança)
  const disabledDays = (date: Date) => {
    return isBefore(date, addDays(startOfToday(), 1));
  };

  // Formatar data atual do agendamento com segurança
  const formatDataAtual = () => {
    if (!agendamento?.data_agendamento) return '-';
    try {
      return format(new Date(agendamento.data_agendamento + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Não renderizar se não houver agendamento selecionado
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[#662E8E]" />
            Remarcar Agendamento
          </DialogTitle>
          <DialogDescription>
            {agendamento?.servico && (
              <span className="font-medium text-gray-700 block mt-1">
                {agendamento.servico}
              </span>
            )}
            <span className="text-sm">
              Data atual: {formatDataAtual()} às {agendamento?.hora_inicio?.substring(0, 5) || '-'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Calendário */}
          <div className="space-y-2">
            <Label className="text-gray-700">Selecione a nova data</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                locale={ptBR}
                className="rounded-md border"
                classNames={{
                  day_selected: 'bg-[#662E8E] text-white hover:bg-[#4a2268] focus:bg-[#4a2268]',
                  day_today: 'bg-[#662E8E]/10 text-[#662E8E]',
                }}
              />
            </div>
          </div>

          {/* Horário */}
          {selectedDate && (
            <div className="space-y-2">
              <Label className="text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Selecione o horário
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um horário" />
                </SelectTrigger>
                <SelectContent>
                  {HORARIOS_DISPONIVEIS.map((hora) => (
                    <SelectItem key={hora} value={hora}>
                      {hora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resumo */}
          {selectedDate && selectedTime && (
            <div className="bg-[#662E8E]/5 rounded-lg p-4 border border-[#662E8E]/20">
              <p className="text-sm text-gray-600 mb-1">Nova data e horário:</p>
              <p className="font-semibold text-[#662E8E]">
                {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="font-semibold text-[#662E8E]">
                às {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            className="w-full sm:w-auto bg-[#662E8E] hover:bg-[#4a2268]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Remarcando...
              </>
            ) : (
              'Confirmar Remarcação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
