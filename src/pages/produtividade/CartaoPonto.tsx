import { useState, useRef, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, Printer, LogIn, LogOut, Pencil, ChevronDown, ChevronUp, Camera, MapPin, History, AlertTriangle, X, Settings, FileText, Paperclip, ShieldCheck, Trash2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/contexts/TenantContext";

import { useProductivityProfessionalsMT } from "@/hooks/multitenant/useProductivityMT";
import { useTimeCardMT, minutesToTime } from "@/hooks/multitenant/useTimeCardMT";
import { DIAS_SEMANA_SHORT, ATTENDANCE_STATUS_LABELS, JUSTIFICATIVA_TIPO_LABELS } from "@/types/produtividade";
import type { AttendanceStatus, TimeCardEntry, AttendanceAuditEntry, AttendanceRecord, JustificativaTipo } from "@/types/produtividade";
import { CartaoPontoPrintLayout } from "@/components/produtividade/CartaoPontoPrintLayout";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatDateTime = (ts: string | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const formatTime = (ts: string | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatDate = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const origemLabel = (origem: string | null) => {
  switch (origem) {
    case 'totem': return 'Totem';
    case 'admin': return 'Admin';
    case 'self_service': return 'Self-service';
    default: return origem || '—';
  }
};

export default function CartaoPonto() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dayAuditLogs, setDayAuditLogs] = useState<AttendanceAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [manualDialog, setManualDialog] = useState<{
    open: boolean;
    date: string;
    entries: Array<{ id?: string; checkin: string; checkout: string }>;
    deletedIds: string[];
    motivo: string;
  }>({ open: false, date: '', entries: [], deletedIds: [], motivo: '' });
  const [justifyDialog, setJustifyDialog] = useState<{
    open: boolean;
    date: string;
    tipo: JustificativaTipo;
    observacoes: string;
    file: File | null;
    existingUrl: string | null;
    existingTipo: JustificativaTipo | null;
    existingObs: string | null;
  }>({ open: false, date: '', tipo: 'atestado', observacoes: '', file: null, existingUrl: null, existingTipo: null, existingObs: null });
  const [isSavingJustify, setIsSavingJustify] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { professionals: allProfessionals } = useProductivityProfessionalsMT('clt');
  const professionals = allProfessionals.filter((p, i, arr) => arr.findIndex(x => x.user_id === p.user_id) === i);
  const { days, summary, isLoading: loadingCard, clockIn, clockOut, manualEntry, manualEntryMulti, justifyAbsence, removeJustification, fetchDayAuditLog } = useTimeCardMT(
    selectedUserId || undefined,
    yearMonth
  );

  const selectedProf = professionals.find(p => p.user_id === selectedUserId);

  // Load audit logs when expanding a day
  useEffect(() => {
    if (!expandedDay) return;
    setLoadingAudit(true);
    fetchDayAuditLog(expandedDay).then(logs => {
      setDayAuditLogs(logs);
      setLoadingAudit(false);
    });
  }, [expandedDay, fetchDayAuditLog]);

  const handleClockIn = async () => {
    try {
      await clockIn();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleManualSave = async () => {
    try {
      const validEntries = manualDialog.entries.filter(e => e.checkin || e.checkout);
      if (validEntries.length === 0) {
        toast.error('Preencha ao menos uma batida');
        return;
      }
      await manualEntryMulti(
        manualDialog.date,
        validEntries,
        manualDialog.deletedIds,
        manualDialog.motivo
      );
      setManualDialog({ open: false, date: '', entries: [], deletedIds: [], motivo: '' });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleJustifySave = async () => {
    setIsSavingJustify(true);
    try {
      await justifyAbsence(
        justifyDialog.date,
        justifyDialog.tipo,
        justifyDialog.observacoes,
        justifyDialog.file || undefined,
      );
      setJustifyDialog({ open: false, date: '', tipo: 'atestado', observacoes: '', file: null, existingUrl: null, existingTipo: null, existingObs: null });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSavingJustify(false);
    }
  };

  const handleRemoveJustification = async (date: string) => {
    try {
      await removeJustification(date, 'Remoção de justificativa pelo administrador');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleDayDetail = (dateStr: string) => {
    setExpandedDay(prev => prev === dateStr ? null : dateStr);
  };

  const statusBadge = (status: AttendanceStatus) => {
    if (status === 'falta_justificada') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
          <ShieldCheck className="h-3 w-3 mr-1" />
          {ATTENDANCE_STATUS_LABELS[status]}
        </Badge>
      );
    }
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      presente: 'default',
      falta: 'destructive',
      folga: 'secondary',
      feriado: 'outline',
      domingo: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{ATTENDANCE_STATUS_LABELS[status]}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Print Layout (hidden, shown only on print) */}
      {selectedProf && (
        <CartaoPontoPrintLayout
          ref={printRef}
          employeeName={selectedProf.nome}
          employeeCargo={selectedProf.cargo}
          yearMonth={yearMonth}
          days={days}
          summary={summary}
          companyName={tenant?.nome_fantasia}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/produtividade')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Cartão de Ponto</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/produtividade/ponto/config')}>
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </Button>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
        <div className="space-y-2">
          <Label>Funcionário CLT</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder="Selecione um funcionário..." /></SelectTrigger>
            <SelectContent>
              {professionals.map(p => (
                <SelectItem key={p.id} value={p.user_id}>
                  {p.nome} ({p.cargo})
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
            Selecione um funcionário CLT para ver o cartão de ponto
          </CardContent>
        </Card>
      )}

      {selectedUserId && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 no-print">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Horas Trabalhadas</p>
                <p className="text-xl font-bold">{minutesToTime(summary.total_hours_worked_minutes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Horas Esperadas</p>
                <p className="text-xl font-bold">{minutesToTime(summary.total_expected_hours_minutes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${summary.balance_minutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.balance_minutes >= 0 ? '+' : '-'}{minutesToTime(Math.abs(summary.balance_minutes))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Atrasos</p>
                <p className="text-xl font-bold text-amber-600">{minutesToTime(summary.total_late_minutes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Horas Extra</p>
                <p className="text-xl font-bold text-blue-600">{minutesToTime(summary.total_overtime_minutes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Faltas</p>
                <p className="text-xl font-bold text-red-600">{summary.faltas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Justificadas</p>
                <p className="text-xl font-bold text-amber-600">{summary.faltas_justificadas}</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 no-print">
            <Button onClick={handleClockIn} variant="default">
              <LogIn className="h-4 w-4 mr-2" />
              Registrar Entrada
            </Button>
            <Button onClick={handleClockOut} variant="secondary">
              <LogOut className="h-4 w-4 mr-2" />
              Registrar Saída
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          {/* Time Card Table */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="text-lg">Cartão de Ponto — {selectedProf?.nome}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-12">Dia</TableHead>
                    <TableHead className="w-12">Sem.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Entrada</TableHead>
                    <TableHead className="text-center">Saída Alm.</TableHead>
                    <TableHead className="text-center">Volta Alm.</TableHead>
                    <TableHead className="text-center">Saída</TableHead>
                    <TableHead className="text-center">Horas</TableHead>
                    <TableHead className="text-center">Atraso</TableHead>
                    <TableHead className="text-center">H.E.</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map(day => {
                    const isOff = day.status === 'domingo' || day.status === 'feriado' || day.status === 'folga';
                    const isExpanded = expandedDay === day.data;
                    const hasRecords = day.records.length > 0;
                    const hasPhotos = day.records.some(r => r.checkin_selfie_url || r.checkout_selfie_url);
                    const hasJustification = day.records.some(r => r.justificativa_url || r.justificativa_observacoes);
                    const isExpandable = (hasRecords && !isOff) || hasJustification;

                    return (
                      <Fragment key={day.data}>
                        <TableRow
                          className={`${isOff ? 'bg-muted/40 text-muted-foreground' : ''} ${day.status === 'falta_justificada' ? 'bg-amber-50/50' : ''} ${isExpandable ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                          onClick={() => isExpandable && toggleDayDetail(day.data)}
                        >
                          <TableCell className="px-2">
                            {isExpandable && (
                              isExpanded
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono">{day.data.substring(8, 10)}</TableCell>
                          <TableCell>{DIAS_SEMANA_SHORT[day.weekday]}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {statusBadge(day.status)}
                              {hasJustification && <Paperclip className="h-3 w-3 text-amber-500" />}
                              {hasPhotos && <Camera className="h-3 w-3 text-muted-foreground" />}
                              {day.records.length > 1 && (
                                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1">
                                  {day.records.length}x
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {/* 4 batidas reais: Entrada, Saída Almoço, Volta Almoço, Saída */}
                          {(() => {
                            // Flatten all punches from records into chronological order
                            const punches: string[] = [];
                            const sortedRecords = [...day.records].sort((a, b) =>
                              (a.checkin_em || '').localeCompare(b.checkin_em || '')
                            );
                            sortedRecords.forEach(r => {
                              if (r.checkin_em) punches.push(r.checkin_em);
                              if (r.checkout_em) punches.push(r.checkout_em);
                            });
                            const p = (i: number) => punches[i] ? formatTime(punches[i]) : '—';
                            return (
                              <>
                                <TableCell className="text-center font-mono">{isOff ? '—' : p(0)}</TableCell>
                                <TableCell className="text-center font-mono">{isOff ? '—' : p(1)}</TableCell>
                                <TableCell className="text-center font-mono">{isOff ? '—' : p(2)}</TableCell>
                                <TableCell className="text-center font-mono">{isOff ? '—' : p(3)}</TableCell>
                              </>
                            );
                          })()}
                          <TableCell className="text-center font-mono font-medium">
                            {day.hours_worked_minutes > 0 ? minutesToTime(day.hours_worked_minutes) : '—'}
                          </TableCell>
                          <TableCell className={`text-center font-mono ${day.late_minutes > 0 ? 'text-amber-600' : ''}`}>
                            {day.late_minutes > 0 ? minutesToTime(day.late_minutes) : '—'}
                          </TableCell>
                          <TableCell className={`text-center font-mono ${day.overtime_minutes > 0 ? 'text-blue-600' : ''}`}>
                            {day.overtime_minutes > 0 ? minutesToTime(day.overtime_minutes) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              {!isOff && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Ajuste manual"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManualDialog({
                                      open: true,
                                      date: day.data,
                                      entries: day.records.length > 0
                                        ? day.records.map(r => ({
                                            id: r.id,
                                            checkin: r.checkin_em ? formatTime(r.checkin_em) : '',
                                            checkout: r.checkout_em ? formatTime(r.checkout_em) : '',
                                          }))
                                        : [{ checkin: '', checkout: '' }],
                                      deletedIds: [],
                                      motivo: '',
                                    });
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {(day.status === 'falta' || day.status === 'falta_justificada') && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-7 w-7 ${day.status === 'falta_justificada' ? 'text-amber-600' : 'text-red-500'}`}
                                  title={day.status === 'falta_justificada' ? 'Ver/editar justificativa' : 'Justificar falta'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const record = day.records[0];
                                    setJustifyDialog({
                                      open: true,
                                      date: day.data,
                                      tipo: record?.justificativa_tipo || 'atestado',
                                      observacoes: record?.justificativa_observacoes || '',
                                      file: null,
                                      existingUrl: record?.justificativa_url || null,
                                      existingTipo: record?.justificativa_tipo || null,
                                      existingObs: record?.justificativa_observacoes || null,
                                    });
                                  }}
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Day Detail */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={12} className="bg-accent/20 p-0">
                              <DayDetail
                                day={day}
                                auditLogs={dayAuditLogs}
                                loadingAudit={loadingAudit}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell />
                    <TableCell colSpan={7} className="text-right font-semibold">TOTAIS:</TableCell>
                    <TableCell className="text-center font-mono">{minutesToTime(summary.total_hours_worked_minutes)}</TableCell>
                    <TableCell className="text-center font-mono text-amber-600">
                      {summary.total_late_minutes > 0 ? minutesToTime(summary.total_late_minutes) : '—'}
                    </TableCell>
                    <TableCell className="text-center font-mono text-blue-600">
                      {summary.total_overtime_minutes > 0 ? minutesToTime(summary.total_overtime_minutes) : '—'}
                    </TableCell>
                    <TableCell>{summary.total_days_worked} dias</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Manual Entry Dialog - MULTI REGISTROS */}
      <Dialog open={manualDialog.open} onOpenChange={(open) => !open && setManualDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ajuste Manual — {manualDialog.date}
            </DialogTitle>
            <DialogDescription>
              Alterações manuais ficam registradas no log de auditoria para fins jurídicos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {manualDialog.entries.map((entry, idx) => {
              const labels = idx === 0
                ? ['Entrada Manhã', 'Saída Almoço']
                : idx === 1
                  ? ['Retorno Almoço', 'Saída']
                  : idx === 2
                    ? ['Entrada Extra', 'Saída Extra']
                    : [`Entrada #${idx + 1}`, `Saída #${idx + 1}`];
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Batida #{idx + 1} — {labels[0]} / {labels[1]}
                    </span>
                    {manualDialog.entries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => {
                          setManualDialog(prev => ({
                            ...prev,
                            entries: prev.entries.filter((_, i) => i !== idx),
                            deletedIds: entry.id ? [...prev.deletedIds, entry.id] : prev.deletedIds,
                          }));
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{labels[0]}</Label>
                      <Input
                        type="time"
                        value={entry.checkin}
                        onChange={e => {
                          const newEntries = [...manualDialog.entries];
                          newEntries[idx] = { ...newEntries[idx], checkin: e.target.value };
                          setManualDialog(prev => ({ ...prev, entries: newEntries }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{labels[1]}</Label>
                      <Input
                        type="time"
                        value={entry.checkout}
                        onChange={e => {
                          const newEntries = [...manualDialog.entries];
                          newEntries[idx] = { ...newEntries[idx], checkout: e.target.value };
                          setManualDialog(prev => ({ ...prev, entries: newEntries }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setManualDialog(prev => ({
                ...prev,
                entries: [...prev.entries, { checkin: '', checkout: '' }],
              }));
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Batida
          </Button>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Motivo da Alteração <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Descreva o motivo da alteração manual (obrigatório para fins jurídicos)..."
              value={manualDialog.motivo}
              onChange={e => setManualDialog(prev => ({ ...prev, motivo: e.target.value }))}
              rows={2}
            />
            {manualDialog.motivo.length > 0 && manualDialog.motivo.length < 5 && (
              <p className="text-xs text-destructive">Mínimo de 5 caracteres</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialog(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button
              onClick={handleManualSave}
              disabled={!manualDialog.motivo || manualDialog.motivo.trim().length < 5}
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Justify Absence Dialog */}
      <Dialog open={justifyDialog.open} onOpenChange={(open) => !open && setJustifyDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Justificar Falta — {justifyDialog.date}
            </DialogTitle>
            <DialogDescription>
              Anexe um documento (atestado, declaração, etc.) para justificar a falta. Sem justificativa, será considerada falta injustificada.
            </DialogDescription>
          </DialogHeader>

          {/* Se já tem justificativa, mostrar dados existentes */}
          {justifyDialog.existingUrl && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                Falta já justificada
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Tipo: {JUSTIFICATIVA_TIPO_LABELS[justifyDialog.existingTipo!] || justifyDialog.existingTipo}
              </p>
              {justifyDialog.existingObs && (
                <p className="text-xs text-amber-700 mt-0.5">Obs: {justifyDialog.existingObs}</p>
              )}
              <a
                href={justifyDialog.existingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" /> Ver documento anexado
              </a>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Justificativa <span className="text-destructive">*</span></Label>
              <Select
                value={justifyDialog.tipo}
                onValueChange={(v) => setJustifyDialog(prev => ({ ...prev, tipo: v as JustificativaTipo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JUSTIFICATIVA_TIPO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Observações <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo da falta (ex: consulta médica, exame, etc.)..."
                value={justifyDialog.observacoes}
                onChange={e => setJustifyDialog(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
              {justifyDialog.observacoes.length > 0 && justifyDialog.observacoes.length < 5 && (
                <p className="text-xs text-destructive">Mínimo de 5 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Paperclip className="h-4 w-4" />
                Anexar Documento
              </Label>
              <Input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    toast.error('Arquivo muito grande (máx. 10MB)');
                    return;
                  }
                  setJustifyDialog(prev => ({ ...prev, file }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Aceita: imagens, PDF, DOC (máx. 10MB)
              </p>
              {justifyDialog.file && (
                <div className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate">{justifyDialog.file.name}</span>
                  <span className="text-muted-foreground">({(justifyDialog.file.size / 1024).toFixed(0)} KB)</span>
                  <button onClick={() => setJustifyDialog(prev => ({ ...prev, file: null }))} className="ml-auto">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {justifyDialog.existingUrl && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleRemoveJustification(justifyDialog.date);
                  setJustifyDialog(prev => ({ ...prev, open: false }));
                }}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover Justificativa
              </Button>
            )}
            <Button variant="outline" onClick={() => setJustifyDialog(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button
              onClick={handleJustifySave}
              disabled={
                isSavingJustify ||
                !justifyDialog.observacoes ||
                justifyDialog.observacoes.trim().length < 5
              }
            >
              {isSavingJustify ? 'Salvando...' : justifyDialog.existingUrl ? 'Atualizar Justificativa' : 'Justificar Falta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Day Detail Component ===

function DayDetail({
  day,
  auditLogs,
  loadingAudit,
}: {
  day: TimeCardEntry;
  auditLogs: AttendanceAuditEntry[];
  loadingAudit: boolean;
}) {
  const hasJustification = day.records.some(r => r.justificativa_url || r.justificativa_observacoes);

  return (
    <div className="p-4 space-y-4">
      {/* Justificativa (se houver) */}
      {hasJustification && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-1 flex items-center gap-1 text-amber-800">
            <ShieldCheck className="h-4 w-4" />
            Justificativa de Falta
          </h4>
          {day.records.filter(r => r.justificativa_observacoes).map(record => (
            <div key={record.id} className="text-sm text-amber-700">
              {record.justificativa_tipo && (
                <p className="text-xs"><span className="font-medium">Tipo:</span> {JUSTIFICATIVA_TIPO_LABELS[record.justificativa_tipo] || record.justificativa_tipo}</p>
              )}
              <p className="text-xs mt-0.5"><span className="font-medium">Observação:</span> {record.justificativa_observacoes}</p>
              {record.justificativa_url && (
                <a
                  href={record.justificativa_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline flex items-center gap-1 mt-1 hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" /> Ver documento anexado
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Batidas do dia */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Registros do Dia ({day.records.length} batida{day.records.length !== 1 ? 's' : ''})
        </h4>
        <div className="grid gap-3">
          {day.records.map((record, idx) => (
            <RecordCard key={record.id} record={record} index={idx} />
          ))}
        </div>
      </div>

      {/* Audit Logs */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <History className="h-4 w-4" />
          Histórico de Alterações
        </h4>
        {loadingAudit ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma alteração manual registrada</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="bg-background border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {log.action === 'manual_edit' ? 'Edição' : log.action === 'manual_create' ? 'Criação' : log.action === 'justificativa' ? 'Justificativa' : log.action === 'remover_justificativa' ? 'Remoção Just.' : log.action}
                    </Badge>
                    <span className="font-medium">{log.changed_by_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium">Motivo:</span> {log.motivo}
                </p>
                {log.old_values && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>Antes: {formatTime(log.old_values.checkin_em)} → {formatTime(log.old_values.checkout_em)}</span>
                    {' | '}
                    <span>Depois: {formatTime(log.new_values?.checkin_em)} → {formatTime(log.new_values?.checkout_em)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === Record Card (individual entry/exit) ===

function RecordCard({ record, index }: { record: AttendanceRecord; index: number }) {
  const [showCheckinPhoto, setShowCheckinPhoto] = useState(false);
  const [showCheckoutPhoto, setShowCheckoutPhoto] = useState(false);

  return (
    <div className="bg-background border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Batida #{index + 1} — {origemLabel(record.registro_origem)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          ID: {record.id.substring(0, 8)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {/* Entrada */}
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <LogIn className="h-3 w-3" /> Entrada
          </p>
          <p className="font-mono font-medium">{formatDateTime(record.checkin_em)}</p>
          {record.checkin_latitude && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {Number(record.checkin_latitude).toFixed(4)}, {Number(record.checkin_longitude).toFixed(4)}
            </p>
          )}
          {record.checkin_selfie_url && (
            <button
              onClick={() => setShowCheckinPhoto(!showCheckinPhoto)}
              className="text-[10px] text-primary underline flex items-center gap-1 mt-0.5 hover:text-primary/80"
            >
              <Camera className="h-3 w-3" />
              {showCheckinPhoto ? 'Ocultar foto' : 'Ver foto entrada'}
            </button>
          )}
        </div>

        {/* Saída */}
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <LogOut className="h-3 w-3" /> Saída
          </p>
          <p className="font-mono font-medium">{formatDateTime(record.checkout_em)}</p>
          {record.checkout_latitude && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {Number(record.checkout_latitude).toFixed(4)}, {Number(record.checkout_longitude).toFixed(4)}
            </p>
          )}
          {record.checkout_selfie_url && (
            <button
              onClick={() => setShowCheckoutPhoto(!showCheckoutPhoto)}
              className="text-[10px] text-primary underline flex items-center gap-1 mt-0.5 hover:text-primary/80"
            >
              <Camera className="h-3 w-3" />
              {showCheckoutPhoto ? 'Ocultar foto' : 'Ver foto saída'}
            </button>
          )}
        </div>

        {/* Observações */}
        {record.observacoes && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-sm">{record.observacoes}</p>
          </div>
        )}
      </div>

      {/* Photos */}
      {(showCheckinPhoto || showCheckoutPhoto) && (
        <div className="mt-3 flex gap-3 flex-wrap">
          {showCheckinPhoto && record.checkin_selfie_url && (
            <div className="relative">
              <p className="text-[10px] text-muted-foreground mb-1">Foto Entrada</p>
              <img
                src={record.checkin_selfie_url}
                alt="Selfie entrada"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            </div>
          )}
          {showCheckoutPhoto && record.checkout_selfie_url && (
            <div className="relative">
              <p className="text-[10px] text-muted-foreground mb-1">Foto Saída</p>
              <img
                src={record.checkout_selfie_url}
                alt="Selfie saída"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
