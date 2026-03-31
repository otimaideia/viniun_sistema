import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Activity, Calendar, ClipboardCheck, RefreshCw, Lock, DollarSign, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { useProductivityProfessionalsMT, useProductivityDailyMT } from "@/hooks/multitenant/useProductivityMT";
import { useProfessionalScheduleMT } from "@/hooks/multitenant/useProfessionalScheduleMT";
import { useProfessionalAttendanceMT } from "@/hooks/multitenant/useProfessionalAttendanceMT";
import { DIAS_SEMANA_LABELS, DIAS_SEMANA_SHORT, ATTENDANCE_STATUS_LABELS } from "@/types/produtividade";
import type { AttendanceStatus } from "@/types/produtividade";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Produtividade() {
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [generatingAttendance, setGeneratingAttendance] = useState(false);
  const [generatingProductivity, setGeneratingProductivity] = useState(false);

  const { professionals, isLoading: loadingProfs } = useProductivityProfessionalsMT();
  const { schedule, saveSchedule, getWorkingDaysInMonth, isLoading: loadingSchedule } = useProfessionalScheduleMT(selectedUserId || undefined);
  const { attendance, updateAttendanceStatus, generateFromSchedule, isLoading: loadingAttendance } = useProfessionalAttendanceMT(selectedUserId || undefined, yearMonth);
  const { dailyRecords, generateProductivity, isLoading: loadingDaily } = useProductivityDailyMT(selectedUserId || undefined, yearMonth);

  // Schedule state: 7 days with toggle + hours
  const [scheduleForm, setScheduleForm] = useState<Array<{ dia_semana: number; hora_inicio: string; hora_fim: string; is_active: boolean }>>(
    Array.from({ length: 7 }, (_, i) => ({ dia_semana: i, hora_inicio: '08:00', hora_fim: '18:00', is_active: i > 0 && i < 7 }))
  );

  // Sync schedule form when data loads
  useMemo(() => {
    if (schedule.length > 0) {
      const newForm = Array.from({ length: 7 }, (_, i) => {
        const existing = schedule.find(s => s.dia_semana === i);
        return {
          dia_semana: i,
          hora_inicio: existing?.hora_inicio || '08:00',
          hora_fim: existing?.hora_fim || '18:00',
          is_active: !!existing,
        };
      });
      setScheduleForm(newForm);
    }
  }, [schedule]);

  const handleSaveSchedule = async () => {
    if (!selectedUserId) { toast.error('Selecione um profissional'); return; }
    setSavingSchedule(true);
    try {
      await saveSchedule(selectedUserId, scheduleForm);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleGenerateAttendance = async () => {
    if (!selectedUserId) { toast.error('Selecione um profissional'); return; }
    setGeneratingAttendance(true);
    try {
      const workingDays = getWorkingDaysInMonth(yearMonth);
      await generateFromSchedule(selectedUserId, yearMonth, workingDays);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setGeneratingAttendance(false);
    }
  };

  const handleGenerateProductivity = async () => {
    if (!selectedUserId) { toast.error('Selecione um profissional'); return; }
    setGeneratingProductivity(true);
    try {
      await generateProductivity(selectedUserId, yearMonth);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setGeneratingProductivity(false);
    }
  };

  const toggleAttendance = async (date: string, currentStatus?: string) => {
    const statusCycle: AttendanceStatus[] = ['presente', 'falta', 'folga', 'feriado'];
    const currentIdx = statusCycle.indexOf((currentStatus || 'presente') as AttendanceStatus);
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];
    try {
      await updateAttendanceStatus(date, nextStatus);
    } catch (err: unknown) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  // Attendance map for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: AttendanceStatus; id: string }>();
    attendance.forEach(a => map.set(a.data, { status: a.status, id: a.id }));
    return map;
  }, [attendance]);

  // Daily records map
  const dailyMap = useMemo(() => {
    const map = new Map<string, typeof dailyRecords[0]>();
    dailyRecords.forEach(d => map.set(d.data, d));
    return map;
  }, [dailyRecords]);

  // Generate all days for the month
  const monthDays = useMemo(() => {
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      return { dateStr, day, weekday, weekdayName: DIAS_SEMANA_SHORT[weekday] };
    });
  }, [yearMonth]);

  // Totals for productivity tab
  const totals = useMemo(() => {
    let dias = 0, diarias = 0, comissoes = 0, pago = 0, diasDiaria = 0, diasComissao = 0;
    dailyRecords.forEach(d => {
      if (d.presente) {
        dias++;
        pago += d.valor_pago;
        if (d.tipo_pagamento === 'comissao') { diasComissao++; comissoes += d.total_comissoes; }
        else { diasDiaria++; diarias += d.diaria_minima; }
      }
    });
    return { dias, diarias, comissoes, pago, diasDiaria, diasComissao, media: dias > 0 ? pago / dias : 0 };
  }, [dailyRecords]);

  // Chart data
  const chartData = useMemo(() => {
    return dailyRecords
      .filter(d => d.presente)
      .map(d => ({
        data: d.data.substring(8, 10), // just day number
        'Diária Mín.': d.diaria_minima,
        'Comissões': d.total_comissoes,
        'Valor Pago': d.valor_pago,
      }));
  }, [dailyRecords]);

  const statusBadge = (status: AttendanceStatus) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      presente: 'default',
      falta: 'destructive',
      folga: 'secondary',
      feriado: 'outline',
      domingo: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{ATTENDANCE_STATUS_LABELS[status]}</Badge>;
  };

  const selectedProf = professionals.find(p => p.user_id === selectedUserId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Produtividade</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/produtividade/resumo')}>
          <Users className="h-4 w-4 mr-2" />
          Resumo Mensal
        </Button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Profissional</Label>
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
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Selecione um profissional para começar</CardContent></Card>
      )}

      {selectedUserId && (
        <Tabs defaultValue="escala">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="escala"><Calendar className="h-4 w-4 mr-1" /> Escala</TabsTrigger>
            <TabsTrigger value="presenca"><ClipboardCheck className="h-4 w-4 mr-1" /> Presença</TabsTrigger>
            <TabsTrigger value="produtividade"><TrendingUp className="h-4 w-4 mr-1" /> Produtividade</TabsTrigger>
          </TabsList>

          {/* ===== TAB: ESCALA ===== */}
          <TabsContent value="escala">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Escala Semanal — {selectedProf?.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {scheduleForm.map((day, idx) => (
                    <div key={day.dia_semana} className={`flex items-center gap-4 p-3 rounded-lg border ${day.is_active ? 'bg-background' : 'bg-muted/50'}`}>
                      <Switch
                        checked={day.is_active}
                        onCheckedChange={(checked) => {
                          const newForm = [...scheduleForm];
                          newForm[idx] = { ...newForm[idx], is_active: checked };
                          setScheduleForm(newForm);
                        }}
                      />
                      <span className="w-24 font-medium">{DIAS_SEMANA_LABELS[day.dia_semana]}</span>
                      {day.is_active && (
                        <>
                          <Input
                            type="time"
                            value={day.hora_inicio}
                            onChange={e => {
                              const newForm = [...scheduleForm];
                              newForm[idx] = { ...newForm[idx], hora_inicio: e.target.value };
                              setScheduleForm(newForm);
                            }}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            value={day.hora_fim}
                            onChange={e => {
                              const newForm = [...scheduleForm];
                              newForm[idx] = { ...newForm[idx], hora_fim: e.target.value };
                              setScheduleForm(newForm);
                            }}
                            className="w-32"
                          />
                        </>
                      )}
                      {!day.is_active && <span className="text-muted-foreground text-sm">Não trabalha</span>}
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveSchedule} disabled={savingSchedule}>
                  {savingSchedule ? 'Salvando...' : 'Salvar Escala'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: PRESENÇA ===== */}
          <TabsContent value="presenca">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Presença — {yearMonth}</CardTitle>
                <Button size="sm" onClick={handleGenerateAttendance} disabled={generatingAttendance}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${generatingAttendance ? 'animate-spin' : ''}`} />
                  {generatingAttendance ? 'Gerando...' : 'Gerar pela Escala'}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Dia</TableHead>
                      <TableHead className="w-20">Dia Sem.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthDays.map(({ dateStr, day, weekday, weekdayName }) => {
                      const att = attendanceMap.get(dateStr);
                      const status = att?.status || (weekday === 0 ? 'domingo' : undefined);
                      const isGray = status === 'domingo' || status === 'feriado' || status === 'folga' || status === 'falta';
                      return (
                        <TableRow key={dateStr} className={isGray ? 'bg-muted/40' : ''}>
                          <TableCell className="font-mono">{String(day).padStart(2, '0')}</TableCell>
                          <TableCell>{weekdayName}</TableCell>
                          <TableCell>{status ? statusBadge(status as AttendanceStatus) : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                          <TableCell className="text-right">
                            {weekday !== 0 && (
                              <Button size="sm" variant="ghost" onClick={() => toggleAttendance(dateStr, status)}>
                                Alterar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 flex gap-2 text-sm text-muted-foreground">
                  <span>Presentes: {attendance.filter(a => a.status === 'presente').length}</span>
                  <span>|</span>
                  <span>Faltas: {attendance.filter(a => a.status === 'falta').length}</span>
                  <span>|</span>
                  <span>Folgas: {attendance.filter(a => a.status === 'folga').length}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: PRODUTIVIDADE ===== */}
          <TabsContent value="produtividade">
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-2xl font-bold text-green-600">R$ {totals.pago.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
                    <p className="text-2xl font-bold">{totals.dias}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Média Diária</p>
                    <p className="text-2xl font-bold">R$ {totals.media.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Diária / Comissão</p>
                    <p className="text-2xl font-bold">{totals.diasDiaria} / {totals.diasComissao}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleGenerateProductivity} disabled={generatingProductivity}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${generatingProductivity ? 'animate-spin' : ''}`} />
                  {generatingProductivity ? 'Calculando...' : 'Calcular Produtividade'}
                </Button>
              </div>

              {/* Productivity Table (Excel style) */}
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Dia</TableHead>
                        <TableHead className="w-16">Dia Sem.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Diária Mín.</TableHead>
                        <TableHead className="text-right">Produtividade</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthDays.map(({ dateStr, day, weekday, weekdayName }) => {
                        const att = attendanceMap.get(dateStr);
                        const daily = dailyMap.get(dateStr);
                        const status = att?.status || (weekday === 0 ? 'domingo' : undefined);
                        const isGray = !daily?.presente;
                        return (
                          <TableRow key={dateStr} className={isGray ? 'bg-muted/40 text-muted-foreground' : ''}>
                            <TableCell className="font-mono">{String(day).padStart(2, '0')}</TableCell>
                            <TableCell>{weekdayName}</TableCell>
                            <TableCell>{status ? statusBadge(status as AttendanceStatus) : '—'}</TableCell>
                            <TableCell className="text-right font-mono">{daily?.presente ? `R$ ${daily.diaria_minima.toFixed(2)}` : '—'}</TableCell>
                            <TableCell className="text-right font-mono">{daily?.total_comissoes ? `R$ ${daily.total_comissoes.toFixed(2)}` : '—'}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${daily?.presente ? 'text-green-600' : ''}`}>
                              {daily?.presente ? `R$ ${daily.valor_pago.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell>
                              {daily?.tipo_pagamento === 'comissao' && <Badge className="bg-blue-100 text-blue-800">Comissão</Badge>}
                              {daily?.tipo_pagamento === 'diaria' && <Badge variant="secondary">Diária</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3}>TOTAIS</TableCell>
                        <TableCell className="text-right font-mono">R$ {totals.diarias.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">R$ {totals.comissoes.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">R$ {totals.pago.toFixed(2)}</TableCell>
                        <TableCell>{totals.dias} dias</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>

              {/* Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Produtividade Diária</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="Diária Mín." fill="#94a3b8" />
                        <Bar dataKey="Comissões" fill="#3b82f6" />
                        <Bar dataKey="Valor Pago" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
