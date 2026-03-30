import { Link, useParams, useNavigate } from "react-router-dom";
import { useRoomMT, useRoomSchedulesMT, useRoomAssignmentsMT } from "@/hooks/multitenant/useRoomsMT";
import { useAgendamentosMT } from "@/hooks/multitenant/useAgendamentosMT";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  DoorOpen,
  Calendar,
  Clock,
  Users,
  Wrench,
  DollarSign,
  Loader2,
  Ruler,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useRoomsMT, type RoomType } from "@/hooks/multitenant/useRoomsMT";
import { toast } from "sonner";

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  laser: "Laser",
  injetaveis: "Injetáveis",
  estetica: "Estética",
  avaliacao: "Avaliação",
  multiuso: "Multiuso",
};

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function SalaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const { room, isLoading, error } = useRoomMT(id);
  const { schedules, isLoading: schedulesLoading } = useRoomSchedulesMT(id);
  const { assignments, isLoading: assignmentsLoading } = useRoomAssignmentsMT(id);
  const { deleteRoom } = useRoomsMT();

  // Today's appointments
  const today = new Date().toISOString().split("T")[0];
  const { appointments: todayAppointments, isLoading: aptsLoading } = useAgendamentosMT({
    startDate: today,
    endDate: today,
  });

  // Filter appointments for this room (via mt_room_appointments - simplified: show all for now)
  // In a real scenario, you'd join with mt_room_appointments

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteRoom(id);
      toast.success("Sala removida");
      navigate("/configuracoes/salas");
    } catch {
      toast.error("Erro ao remover sala");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Sala não encontrada</p>
        <Button variant="outline" onClick={() => navigate("/configuracoes/salas")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/salas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DoorOpen className="h-6 w-6 text-primary" />
              {room.nome}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{ROOM_TYPE_LABELS[room.tipo]}</Badge>
              <Badge variant={room.is_active ? "default" : "secondary"}>
                {room.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/configuracoes/salas/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Capacidade</p>
                <p className="text-xl font-bold">{room.capacidade}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="text-xl font-bold">{room.area_m2 ? `${room.area_m2} m²` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal</p>
                <p className="text-xl font-bold">
                  {room.custo_mensal
                    ? `R$ ${room.custo_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Equipamentos</p>
                <p className="text-xl font-bold">{(room.equipamentos || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipamentos List */}
      {room.equipamentos && room.equipamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {room.equipamentos.map((eq, i) => (
                <Badge key={i} variant="outline" className="text-sm">
                  <Wrench className="h-3 w-3 mr-1" />
                  {eq}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum horário configurado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((sched) => (
                  <TableRow key={sched.id}>
                    <TableCell className="font-medium">
                      {DAY_LABELS[sched.dia_semana]}
                    </TableCell>
                    <TableCell>{sched.hora_inicio}</TableCell>
                    <TableCell>{sched.hora_fim}</TableCell>
                    <TableCell>
                      {sched.is_active ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assigned Professionals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profissionais Alocados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum profissional alocado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.profissional_nome}</TableCell>
                    <TableCell>
                      {a.dia_semana !== undefined && a.dia_semana !== null
                        ? DAY_LABELS[a.dia_semana]
                        : "Todos"}
                    </TableCell>
                    <TableCell>
                      {a.hora_inicio && a.hora_fim
                        ? `${a.hora_inicio} - ${a.hora_fim}`
                        : "Integral"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? "default" : "secondary"}>
                        {a.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Franchise info */}
      {room.franchise && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Franquia</p>
            <p className="font-medium">{room.franchise.nome} ({room.franchise.codigo})</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a sala "{room.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
