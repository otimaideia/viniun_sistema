import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { useProductivityMonthlyMT, useProductivityDailyMT, useProductivityProfessionalsMT } from "@/hooks/multitenant/useProductivityMT";
import { useProfessionalAttendanceMT } from "@/hooks/multitenant/useProfessionalAttendanceMT";
import { useProfessionalScheduleMT } from "@/hooks/multitenant/useProfessionalScheduleMT";
import { PRODUCTIVITY_STATUS_LABELS } from "@/types/produtividade";
import type { ProductivityStatus } from "@/types/produtividade";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function ProdutividadeResumo() {
  const navigate = useNavigate();
  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const { professionals } = useProductivityProfessionalsMT();
  const { monthlySummaries, isLoading, generateMonthlySummary, closeMonth, markAsPaid } = useProductivityMonthlyMT({
    competencia: yearMonth,
    status: statusFilter as ProductivityStatus || undefined,
  });
  const { generateProductivity } = useProductivityDailyMT();

  const handleGenerateAll = async () => {
    if (professionals.length === 0) {
      toast.error('Nenhum profissional MEI cadastrado');
      return;
    }
    setGenerating(true);
    try {
      let count = 0;
      for (const prof of professionals) {
        // Generate daily productivity
        await generateProductivity(prof.user_id, yearMonth);
        // Generate monthly summary
        await generateMonthlySummary(prof.user_id, yearMonth);
        count++;
      }
      toast.success(`Resumo gerado para ${count} profissionais`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const statusBadge = (status: ProductivityStatus) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aberto: 'outline',
      fechado: 'secondary',
      pago: 'default',
    };
    return <Badge variant={variants[status] || 'outline'}>{PRODUCTIVITY_STATUS_LABELS[status]}</Badge>;
  };

  // Totals
  const totalGeral = monthlySummaries.reduce((sum, s) => sum + s.total_pago, 0);
  const totalDias = monthlySummaries.reduce((sum, s) => sum + s.dias_trabalhados, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/produtividade')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Resumo Mensal de Produtividade</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Mês/Ano</Label>
          <Input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button className="w-full" onClick={handleGenerateAll} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Todos'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-2xl font-bold text-green-600">R$ {totalGeral.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Profissionais</p>
            <p className="text-2xl font-bold">{monthlySummaries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Dias</p>
            <p className="text-2xl font-bold">{totalDias}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : monthlySummaries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum resumo encontrado para {yearMonth}. Clique em "Gerar Todos" para calcular.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Dias Trab.</TableHead>
                  <TableHead className="text-center">Dias Diária</TableHead>
                  <TableHead className="text-center">Dias Comissão</TableHead>
                  <TableHead className="text-right">Total Diárias</TableHead>
                  <TableHead className="text-right">Total Comissões</TableHead>
                  <TableHead className="text-right">Total a Pagar</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySummaries.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s.user as any)?.nome || '—'}</TableCell>
                    <TableCell className="text-center">{s.dias_trabalhados}</TableCell>
                    <TableCell className="text-center">{s.dias_diaria}</TableCell>
                    <TableCell className="text-center">{s.dias_comissao}</TableCell>
                    <TableCell className="text-right font-mono">R$ {s.total_diarias.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">R$ {s.total_comissoes.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">R$ {s.total_pago.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {s.status === 'aberto' && (
                          <Button size="sm" variant="outline" onClick={() => closeMonth(s.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Fechar
                          </Button>
                        )}
                        {s.status === 'fechado' && (
                          <Button size="sm" onClick={() => markAsPaid(s.id)}>
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{totalDias}</TableCell>
                  <TableCell className="text-center">{monthlySummaries.reduce((s, m) => s + m.dias_diaria, 0)}</TableCell>
                  <TableCell className="text-center">{monthlySummaries.reduce((s, m) => s + m.dias_comissao, 0)}</TableCell>
                  <TableCell className="text-right font-mono">R$ {monthlySummaries.reduce((s, m) => s + m.total_diarias, 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">R$ {monthlySummaries.reduce((s, m) => s + m.total_comissoes, 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">R$ {totalGeral.toFixed(2)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
