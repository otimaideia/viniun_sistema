import { forwardRef } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { DIAS_SEMANA_SHORT, ATTENDANCE_STATUS_LABELS } from '@/types/produtividade';
import type { TimeCardEntry, TimeCardSummary } from '@/types/produtividade';
import { minutesToTime } from '@/hooks/multitenant/useTimeCardMT';

interface CartaoPontoPrintLayoutProps {
  employeeName: string;
  employeeCargo: string;
  employeeCpf?: string;
  employeeAdmissao?: string;
  yearMonth: string;
  days: TimeCardEntry[];
  summary: TimeCardSummary;
  companyName?: string;
}

export const CartaoPontoPrintLayout = forwardRef<HTMLDivElement, CartaoPontoPrintLayoutProps>(
  ({ employeeName, employeeCargo, employeeCpf, employeeAdmissao, yearMonth, days, summary, companyName }, ref) => {
    const { logoUrl } = useBranding();

    const [year, month] = yearMonth.split('-');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthLabel = `${monthNames[Number(month) - 1]} / ${year}`;

    const formatTime = (ts: string | null) => {
      if (!ts) return '—';
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
            th, td { border: 1px solid #333; padding: 3px 6px; font-size: 11px; }
            th { background: #e5e7eb; font-weight: bold; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-auto" />}
            <div>
              <h1 className="text-lg font-bold">{companyName || 'Empresa'}</h1>
              <p className="text-xs text-gray-600">Cartão de Ponto</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{monthLabel}</p>
          </div>
        </div>

        {/* Dados do funcionário */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
          <div><strong>Nome:</strong> {employeeName}</div>
          <div><strong>Cargo:</strong> {employeeCargo}</div>
          <div><strong>CPF:</strong> {employeeCpf || '—'}</div>
          <div><strong>Admissão:</strong> {employeeAdmissao || '—'}</div>
        </div>

        {/* Tabela diária */}
        <table>
          <thead>
            <tr>
              <th className="w-10">Dia</th>
              <th className="w-10">Sem.</th>
              <th>Entrada</th>
              <th>Saída Alm.</th>
              <th>Volta Alm.</th>
              <th>Saída</th>
              <th>Horas</th>
              <th>Atraso</th>
              <th>H.E.</th>
              <th>Obs</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const isOff = day.status === 'domingo' || day.status === 'feriado' || day.status === 'folga';
              return (
                <tr key={day.data} style={isOff ? { backgroundColor: '#f3f4f6' } : {}}>
                  <td className="text-center font-mono">{day.data.substring(8, 10)}</td>
                  <td className="text-center">{DIAS_SEMANA_SHORT[day.weekday]}</td>
                  {(() => {
                    const punches: string[] = [];
                    const sorted = [...day.records].sort((a, b) => (a.checkin_em || '').localeCompare(b.checkin_em || ''));
                    sorted.forEach(r => {
                      if (r.checkin_em) punches.push(r.checkin_em);
                      if (r.checkout_em) punches.push(r.checkout_em);
                    });
                    const p = (i: number) => punches[i] ? formatTime(punches[i]) : '—';
                    return (
                      <>
                        <td className="text-center">{isOff ? '—' : p(0)}</td>
                        <td className="text-center">{isOff ? '—' : p(1)}</td>
                        <td className="text-center">{isOff ? '—' : p(2)}</td>
                        <td className="text-center">{isOff ? '—' : p(3)}</td>
                      </>
                    );
                  })()}
                  <td className="text-center font-mono">
                    {day.hours_worked_minutes > 0 ? minutesToTime(day.hours_worked_minutes) : '—'}
                  </td>
                  <td className="text-center font-mono" style={day.late_minutes > 0 ? { color: 'red' } : {}}>
                    {day.late_minutes > 0 ? minutesToTime(day.late_minutes) : '—'}
                  </td>
                  <td className="text-center font-mono" style={day.overtime_minutes > 0 ? { color: 'blue' } : {}}>
                    {day.overtime_minutes > 0 ? minutesToTime(day.overtime_minutes) : '—'}
                  </td>
                  <td className="text-xs">
                    {isOff ? ATTENDANCE_STATUS_LABELS[day.status] : (day.status === 'falta' ? 'FALTA' : (day.observacoes || ''))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
              <td colSpan={6} className="text-right">TOTAIS:</td>
              <td className="text-center font-mono">{minutesToTime(summary.total_hours_worked_minutes)}</td>
              <td className="text-center font-mono" style={{ color: 'red' }}>
                {summary.total_late_minutes > 0 ? minutesToTime(summary.total_late_minutes) : '—'}
              </td>
              <td className="text-center font-mono" style={{ color: 'blue' }}>
                {summary.total_overtime_minutes > 0 ? minutesToTime(summary.total_overtime_minutes) : '—'}
              </td>
              <td>{summary.total_days_worked} dias | {summary.faltas} faltas</td>
            </tr>
          </tfoot>
        </table>

        {/* Resumo */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
          <div><strong>Horas Esperadas:</strong> {minutesToTime(summary.total_expected_hours_minutes)}</div>
          <div><strong>Horas Trabalhadas:</strong> {minutesToTime(summary.total_hours_worked_minutes)}</div>
          <div>
            <strong>Saldo:</strong>{' '}
            <span style={{ color: summary.balance_minutes >= 0 ? 'green' : 'red' }}>
              {summary.balance_minutes >= 0 ? '+' : '-'}{minutesToTime(Math.abs(summary.balance_minutes))}
            </span>
          </div>
        </div>

        {/* Assinaturas */}
        <div className="mt-12 grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-xs">Funcionário</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-xs">Responsável</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Documento gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    );
  }
);

CartaoPontoPrintLayout.displayName = 'CartaoPontoPrintLayout';
