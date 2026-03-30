import { forwardRef } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { DIAS_SEMANA_SHORT, DIAS_SEMANA_LABELS } from '@/types/produtividade';

interface EscalaDayInfo {
  dateStr: string;
  day: number;
  weekday: number;
  isWorking: boolean;
  hora_inicio: string;
  hora_fim: string;
}

interface EscalaPrintLayoutProps {
  professionalName: string;
  professionalCargo: string;
  yearMonth: string;
  days: EscalaDayInfo[];
  totalWorkingDays: number;
  totalHours: number;
  companyName?: string;
}

export const EscalaPrintLayout = forwardRef<HTMLDivElement, EscalaPrintLayoutProps>(
  ({ professionalName, professionalCargo, yearMonth, days, totalWorkingDays, totalHours, companyName }, ref) => {
    const { logoUrl } = useBranding();

    const [year, month] = yearMonth.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthLabel = `${monthNames[Number(month) - 1]} / ${year}`;

    // Calcula horas de um dia
    const calcHours = (inicio: string, fim: string) => {
      const [hi, mi] = inicio.split(':').map(Number);
      const [hf, mf] = fim.split(':').map(Number);
      return ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
    };

    return (
      <div ref={ref} className="print-layout hidden print:block p-8 text-black bg-white text-sm">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-layout, .print-layout * { visibility: visible; }
            .print-layout { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 4px 8px; font-size: 12px; }
            th { background: #e5e7eb; font-weight: bold; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-auto" />}
            <div>
              <h1 className="text-lg font-bold">{companyName || 'Empresa'}</h1>
              <p className="text-xs text-gray-600">Escala de Trabalho Mensal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{monthLabel}</p>
          </div>
        </div>

        {/* Dados da profissional */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><strong>Profissional:</strong> {professionalName}</div>
          <div><strong>Cargo:</strong> {professionalCargo}</div>
        </div>

        {/* Tabela */}
        <table>
          <thead>
            <tr>
              <th className="w-12">Dia</th>
              <th className="w-20">Dia da Semana</th>
              <th>Horário Início</th>
              <th>Horário Fim</th>
              <th>Horas</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const isDomingo = day.weekday === 0;
              const isOff = !day.isWorking || isDomingo;
              return (
                <tr key={day.dateStr} style={isOff ? { backgroundColor: '#f3f4f6', color: '#6b7280' } : {}}>
                  <td className="text-center font-mono">{String(day.day).padStart(2, '0')}</td>
                  <td className="text-center">{DIAS_SEMANA_LABELS[day.weekday]}</td>
                  <td className="text-center">{day.isWorking ? day.hora_inicio : '—'}</td>
                  <td className="text-center">{day.isWorking ? day.hora_fim : '—'}</td>
                  <td className="text-center font-mono">
                    {day.isWorking ? `${calcHours(day.hora_inicio, day.hora_fim).toFixed(1)}h` : '—'}
                  </td>
                  <td className="text-center font-medium">
                    {isDomingo ? 'DOMINGO' : day.isWorking ? 'TRABALHA' : 'FOLGA'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
              <td colSpan={4} className="text-right">TOTAIS:</td>
              <td className="text-center font-mono">{totalHours.toFixed(1)}h</td>
              <td className="text-center">{totalWorkingDays} dias</td>
            </tr>
          </tfoot>
        </table>

        {/* Assinatura */}
        <div className="mt-16">
          <div className="w-80 mx-auto text-center">
            <div className="border-t border-black pt-2">
              <p className="text-sm font-medium">{professionalName}</p>
              <p className="text-xs text-gray-600">Assinatura do Profissional</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm">Data: ____/____/________</p>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Documento gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    );
  }
);

EscalaPrintLayout.displayName = 'EscalaPrintLayout';
