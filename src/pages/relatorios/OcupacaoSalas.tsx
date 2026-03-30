import { useState, useMemo } from "react";
import { useOccupancyMT, type OccupancyMetrics, type RoomType } from "@/hooks/multitenant/useRoomsMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { FranchiseSelector } from "@/components/multitenant/FranchiseSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DoorOpen,
  Calendar,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  UserX,
} from "lucide-react";

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  laser: "Laser",
  injetaveis: "Injetáveis",
  estetica: "Estética",
  avaliacao: "Avaliação",
  multiuso: "Multiuso",
};

const DAY_LABELS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8-19

function getOccupancyColor(taxa: number): string {
  if (taxa >= 80) return "bg-red-500";
  if (taxa >= 60) return "bg-yellow-500";
  if (taxa >= 40) return "bg-green-500";
  if (taxa > 0) return "bg-green-300";
  return "bg-gray-200";
}

function getOccupancyBg(taxa: number): string {
  if (taxa >= 80) return "border-red-200 bg-red-50";
  if (taxa >= 60) return "border-yellow-200 bg-yellow-50";
  return "border-green-200 bg-green-50";
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  let bgColor = "bg-gray-100";
  if (intensity > 0.75) bgColor = "bg-red-400";
  else if (intensity > 0.5) bgColor = "bg-orange-300";
  else if (intensity > 0.25) bgColor = "bg-yellow-200";
  else if (intensity > 0) bgColor = "bg-green-200";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-8 h-8 rounded-sm ${bgColor} cursor-default`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{value} agendamento{value !== 1 ? "s" : ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function OcupacaoSalas() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [selectedFranchise, setSelectedFranchise] = useState<string | undefined>();
  const { accessLevel } = useTenantContext();

  const dateRange = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);
  const { metrics, isLoading, refetch } = useOccupancyMT(selectedFranchise, dateRange);

  // Calculate global stats
  const avgOccupancy = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.taxa_ocupacao, 0) / metrics.length)
    : 0;
  const avgNoShow = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.taxa_no_show, 0) / metrics.length * 10) / 10
    : 0;
  const alertRooms = metrics.filter(m => m.taxa_ocupacao >= 85);

  // Aggregate heatmap across all rooms
  const aggregateHeatmap = useMemo(() => {
    const map: Record<string, number> = {};
    let maxVal = 0;
    for (const m of metrics) {
      for (const cell of m.heatmap) {
        const key = `${cell.dia_semana}-${cell.hora}`;
        map[key] = (map[key] || 0) + cell.ocupacao;
        if (map[key] > maxVal) maxVal = map[key];
      }
    }
    return { map, maxVal };
  }, [metrics]);

  // Collect all available slots
  const allAvailableSlots = useMemo(() => {
    const slots: { room: string; dia: string; hora: string }[] = [];
    for (const m of metrics) {
      for (const slot of m.horarios_vagos.slice(0, 5)) {
        slots.push({
          room: m.room_nome,
          dia: DAY_LABELS_SHORT[slot.dia_semana],
          hora: slot.hora,
        });
      }
    }
    return slots.slice(0, 20);
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ocupação de Salas</h1>
          <p className="text-muted-foreground">
            Análise de ocupação e disponibilidade
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        {(accessLevel === 'platform' || accessLevel === 'tenant') && (
          <FranchiseSelector
            variant="select"
            showClear
            onSelect={(f) => setSelectedFranchise(f?.id)}
          />
        )}
        <div className="flex items-center gap-2">
          <div>
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Até</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : metrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <DoorOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma sala encontrada</p>
            <p className="text-sm">Cadastre salas para ver métricas de ocupação</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Salas Ativas</p>
                  <p className="text-2xl font-bold">{metrics.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Ocupação Média</p>
                  <p className="text-2xl font-bold">{avgOccupancy}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">No-Show Médio</p>
                  <p className="text-2xl font-bold">{avgNoShow}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Salas em Alerta</p>
                  <p className="text-2xl font-bold">{alertRooms.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Room Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics
              .sort((a, b) => b.taxa_ocupacao - a.taxa_ocupacao)
              .map((m) => (
                <Card key={m.room_id} className={`border-2 ${getOccupancyBg(m.taxa_ocupacao)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DoorOpen className="h-4 w-4" />
                        {m.room_nome}
                      </CardTitle>
                      <Badge variant="outline">{ROOM_TYPE_LABELS[m.room_tipo]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Occupancy bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Ocupação</span>
                        <span className="font-bold">{m.taxa_ocupacao.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getOccupancyColor(m.taxa_ocupacao)}`}
                          style={{ width: `${Math.min(100, m.taxa_ocupacao)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-muted-foreground">Agend.</p>
                        <p className="font-bold">{m.total_agendamentos}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">No-Show</p>
                        <p className="font-bold">{m.no_shows}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Horas</p>
                        <p className="font-bold">{m.horas_ocupadas}/{m.horas_disponiveis}h</p>
                      </div>
                    </div>
                    {m.taxa_no_show > 10 && (
                      <Badge variant="destructive" className="w-full justify-center">
                        <UserX className="h-3 w-3 mr-1" />
                        No-Show: {m.taxa_no_show.toFixed(1)}%
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapa de Calor - Ocupação</CardTitle>
              <CardDescription>Horários (8h-19h) x Dias da semana (todas as salas)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-grid gap-1" style={{ gridTemplateColumns: `80px repeat(${HOURS.length}, 32px)` }}>
                  {/* Header row */}
                  <div className="text-xs text-muted-foreground" />
                  {HOURS.map((h) => (
                    <div key={h} className="text-xs text-center text-muted-foreground">
                      {h}h
                    </div>
                  ))}

                  {/* Data rows */}
                  {DAY_LABELS_SHORT.map((day, dayIdx) => (
                    <>
                      <div key={`label-${dayIdx}`} className="text-sm font-medium flex items-center">
                        {day}
                      </div>
                      {HOURS.map((hora) => {
                        const key = `${dayIdx}-${hora}`;
                        const value = aggregateHeatmap.map[key] || 0;
                        return (
                          <HeatmapCell
                            key={key}
                            value={value}
                            max={aggregateHeatmap.maxVal}
                          />
                        );
                      })}
                    </>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span>Menos</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-sm bg-gray-100" />
                    <div className="w-4 h-4 rounded-sm bg-green-200" />
                    <div className="w-4 h-4 rounded-sm bg-yellow-200" />
                    <div className="w-4 h-4 rounded-sm bg-orange-300" />
                    <div className="w-4 h-4 rounded-sm bg-red-400" />
                  </div>
                  <span>Mais</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No-Show per room */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Taxa de No-Show por Sala
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sala</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Agendamentos</TableHead>
                    <TableHead className="text-center">No-Shows</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics
                    .sort((a, b) => b.taxa_no_show - a.taxa_no_show)
                    .map((m) => (
                      <TableRow key={m.room_id}>
                        <TableCell className="font-medium">{m.room_nome}</TableCell>
                        <TableCell>{ROOM_TYPE_LABELS[m.room_tipo]}</TableCell>
                        <TableCell className="text-center">{m.total_agendamentos}</TableCell>
                        <TableCell className="text-center">{m.no_shows}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={m.taxa_no_show > 10 ? "destructive" : "secondary"}>
                            {m.taxa_no_show.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Available Slots */}
          {allAvailableSlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horários Disponíveis
                </CardTitle>
                <CardDescription>Próximos horários vagos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allAvailableSlots.map((slot, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {slot.room} - {slot.dia} {slot.hora}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expansion Alert */}
          {alertRooms.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  Alerta de Expansão
                </CardTitle>
                <CardDescription className="text-amber-700">
                  As seguintes salas estão com ocupação acima de 85% no período analisado.
                  Considere expandir a capacidade ou redistribuir atendimentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {alertRooms.map((m) => (
                    <Badge key={m.room_id} variant="destructive">
                      {m.room_nome}: {m.taxa_ocupacao.toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
