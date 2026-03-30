import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Printer } from "lucide-react";
import { useTenantContext } from "@/contexts/TenantContext";

import { useProductivityProfessionalsMT } from "@/hooks/multitenant/useProductivityMT";
import { useProfessionalScheduleMT } from "@/hooks/multitenant/useProfessionalScheduleMT";
import { DIAS_SEMANA_LABELS, DIAS_SEMANA_SHORT } from "@/types/produtividade";
import { EscalaPrintLayout } from "@/components/produtividade/EscalaPrintLayout";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function EscalaMensalPrint() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const printRef = useRef<HTMLDivElement>(null);

  const { professionals } = useProductivityProfessionalsMT('mei');
  const { schedule, getWorkingDaysInMonth } = useProfessionalScheduleMT(selectedUserId || undefined);

  const selectedProf = professionals.find(p => p.user_id === selectedUserId);

  // Gera os dias do mês com status
  const monthDays = useMemo(() => {
    if (!yearMonth) return [];
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDates = new Set(getWorkingDaysInMonth(yearMonth));

    // Map escala por dia da semana
    const scheduleMap = new Map(schedule.map(s => [s.dia_semana, s]));

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      const sched = scheduleMap.get(weekday);
      const isWorking = workingDates.has(dateStr);

      return {
        dateStr,
        day,
        weekday,
        isWorking,
        hora_inicio: sched ? (typeof sched.hora_inicio === 'string' ? sched.hora_inicio.substring(0, 5) : '08:00') : '08:00',
        hora_fim: sched ? (typeof sched.hora_fim === 'string' ? sched.hora_fim.substring(0, 5) : '18:00') : '18:00',
      };
    });
  }, [yearMonth, schedule, getWorkingDaysInMonth]);

  // Totais
  const totalWorkingDays = monthDays.filter(d => d.isWorking).length;
  const totalHours = monthDays.reduce((sum, d) => {
    if (!d.isWorking) return sum;
    const [hi, mi] = d.hora_inicio.split(':').map(Number);
    const [hf, mf] = d.hora_fim.split(':').map(Number);
    return sum + ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const [year, month] = yearMonth.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="space-y-6 p-6">
      {/* Print Layout */}
      {selectedProf && (
        <EscalaPrintLayout
          ref={printRef}
          professionalName={selectedProf.nome}
          professionalCargo={selectedProf.cargo}
          yearMonth={yearMonth}
          days={monthDays}
          totalWorkingDays={totalWorkingDays}
          totalHours={totalHours}
          companyName={tenant?.nome_fantasia}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate('/produtividade')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Escala Mensal para Impressão</h1>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <div className="space-y-2">
          <Label>Profissional MEI</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder="Selecione um profissional..." /></SelectTrigger>
            <SelectContent>
              {professionals.map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.nome} ({p.cargo}) — Diária R$ {p.salario_base.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mês/Ano</Label>
          <Input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} />
        </div>
      </div>

      {!selectedUserId && (
        <Card className="no-print">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Selecione um profissional para ver a escala do mês
          </CardContent>
        </Card>
      )}

      {selectedUserId && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 no-print">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Dias de Trabalho</p>
                <p className="text-2xl font-bold">{totalWorkingDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total de Horas</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Mês</p>
                <p className="text-2xl font-bold">{monthNames[Number(month) - 1]} {year}</p>
              </CardContent>
            </Card>
          </div>

          {/* Print Button */}
          <div className="no-print">
            <Button onClick={handlePrint} variant="default">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Escala
            </Button>
          </div>

          {/* Preview Table */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="text-lg">
                Escala — {selectedProf?.nome} — {monthNames[Number(month) - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Dia</TableHead>
                    <TableHead className="w-24">Dia da Semana</TableHead>
                    <TableHead className="text-center">Horário Início</TableHead>
                    <TableHead className="text-center">Horário Fim</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthDays.map(day => {
                    const isDomingo = day.weekday === 0;
                    const isOff = !day.isWorking || isDomingo;
                    const calcHours = () => {
                      const [hi, mi] = day.hora_inicio.split(':').map(Number);
                      const [hf, mf] = day.hora_fim.split(':').map(Number);
                      return ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
                    };

                    return (
                      <TableRow key={day.dateStr} className={isOff ? 'bg-muted/40 text-muted-foreground' : ''}>
                        <TableCell className="font-mono">{String(day.day).padStart(2, '0')}</TableCell>
                        <TableCell>{DIAS_SEMANA_LABELS[day.weekday]}</TableCell>
                        <TableCell className="text-center">{day.isWorking ? day.hora_inicio : '—'}</TableCell>
                        <TableCell className="text-center">{day.isWorking ? day.hora_fim : '—'}</TableCell>
                        <TableCell className="text-center font-mono">
                          {day.isWorking ? `${calcHours().toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {isDomingo ? (
                            <Badge variant="outline">Domingo</Badge>
                          ) : day.isWorking ? (
                            <Badge variant="default">Trabalha</Badge>
                          ) : (
                            <Badge variant="secondary">Folga</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={4} className="text-right">TOTAIS:</TableCell>
                    <TableCell className="text-center font-mono">{totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-center">{totalWorkingDays} dias</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
