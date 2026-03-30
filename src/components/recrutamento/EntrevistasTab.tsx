import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, MoreVertical, Edit, Trash2, Calendar, User,
  CheckCircle2, XCircle, Eye, Video, MapPin, Phone, AlertTriangle,
} from "lucide-react";
import { useEntrevistasMT } from "@/hooks/multitenant/useEntrevistasMT";
import {
  ENTREVISTA_STATUS_CONFIG, ENTREVISTA_STATUS_OPTIONS,
  ENTREVISTA_TIPO_CONFIG, EntrevistaTipo,
} from "@/types/recrutamento";
import { cn } from "@/lib/utils";

const TIPO_ICON: Record<EntrevistaTipo, typeof MapPin> = {
  presencial: MapPin,
  video: Video,
  telefone: Phone,
};

export function EntrevistasTab() {
  const navigate = useNavigate();
  const { entrevistas, isLoading, updateStatus, deleteEntrevista } = useEntrevistasMT();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");

  const today = new Date();

  const filteredEntrevistas = entrevistas.filter((e) => {
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchTipo = filterTipo === "all" || e.tipo === filterTipo;

    let matchPeriod = true;
    const entrevistaDate = parseISO(e.data_entrevista);
    if (filterPeriod === "today") {
      matchPeriod = isSameDay(entrevistaDate, today);
    } else if (filterPeriod === "upcoming") {
      matchPeriod = entrevistaDate > today && (e.status === "agendada" || e.status === "confirmada");
    } else if (filterPeriod === "past") {
      matchPeriod = entrevistaDate < today;
    }

    return matchStatus && matchPeriod && matchTipo;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Entrevistas ({entrevistas.length})
          </CardTitle>
          <Button onClick={() => navigate("/recrutamento/entrevistas/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entrevista
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {ENTREVISTA_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{ENTREVISTA_STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="upcoming">Próximas</SelectItem>
              <SelectItem value="past">Passadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(ENTREVISTA_TIPO_CONFIG) as EntrevistaTipo[]).map((t) => (
                <SelectItem key={t} value={t}>{ENTREVISTA_TIPO_CONFIG[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredEntrevistas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma entrevista encontrada</p>
            <p className="text-sm">Clique em "Nova Entrevista" para agendar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entrevistador</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntrevistas.map((ent) => {
                  const statusConfig = ENTREVISTA_STATUS_CONFIG[ent.status];
                  const entrevistaDate = parseISO(ent.data_entrevista);
                  const isToday = isSameDay(entrevistaDate, today);
                  const TipoIcon = TIPO_ICON[ent.tipo || "presencial"];
                  const tipoLabel = ENTREVISTA_TIPO_CONFIG[ent.tipo || "presencial"]?.label || "-";

                  return (
                    <TableRow
                      key={ent.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/recrutamento/entrevistas/${ent.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className={cn("font-medium text-sm", isToday && "text-primary")}>
                            {format(entrevistaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {isToday && <Badge variant="outline" className="text-xs mt-0.5">Hoje</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ent.candidate ? (
                          <p className="font-medium text-sm">{ent.candidate.nome}</p>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ent.position ? (
                          <p className="text-sm">{ent.position.titulo}</p>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <TipoIcon className="h-3 w-3" />
                          {tipoLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ent.entrevistador ? (
                          <span className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            {ent.entrevistador.nome}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ent.nota ? (
                          <span className={cn(
                            "text-sm font-medium",
                            ent.nota >= 7 ? "text-emerald-600" : ent.nota >= 5 ? "text-amber-600" : "text-red-600",
                          )}>
                            {ent.nota}/10
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ent.etapa_nome || `Etapa ${ent.etapa}`}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border text-xs", statusConfig.bg, statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/entrevistas/${ent.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/entrevistas/${ent.id}/editar`)}>
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(ent.status === "agendada" || ent.status === "confirmada") && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ent.id, status: "realizada" })}>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Marcar Realizada
                              </DropdownMenuItem>
                            )}
                            {(ent.status === "agendada" || ent.status === "confirmada") && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ent.id, status: "no_show" })}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" /> Não Compareceu
                              </DropdownMenuItem>
                            )}
                            {ent.status !== "cancelada" && ent.status !== "realizada" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: ent.id, status: "cancelada" })}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" /> Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteEntrevista.mutate(ent.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
