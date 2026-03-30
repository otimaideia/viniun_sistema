import { useState } from "react";
import { Link } from "react-router-dom";
import { useRoomsMT, type Room, type RoomType } from "@/hooks/multitenant/useRoomsMT";
import { useOccupancyMT } from "@/hooks/multitenant/useRoomsMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Search,
  DoorOpen,
  Loader2,
  Trash2,
  Eye,
  Pencil,
  Wrench,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  laser: "Laser",
  injetaveis: "Injetáveis",
  estetica: "Estética",
  avaliacao: "Avaliação",
  multiuso: "Multiuso",
};

const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  laser: "bg-pink-100 text-pink-800",
  injetaveis: "bg-blue-100 text-blue-800",
  estetica: "bg-purple-100 text-purple-800",
  avaliacao: "bg-green-100 text-green-800",
  multiuso: "bg-gray-100 text-gray-800",
};

function OccupancyBadge({ taxa }: { taxa: number }) {
  let color = "bg-green-100 text-green-800";
  if (taxa >= 80) color = "bg-red-100 text-red-800";
  else if (taxa >= 60) color = "bg-yellow-100 text-yellow-800";

  return (
    <Badge variant="outline" className={`${color} border-0`}>
      {taxa.toFixed(0)}% ocupação
    </Badge>
  );
}

export default function Salas() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = tipoFilter !== "all" ? { tipo: tipoFilter as RoomType } : undefined;
  const { rooms, isLoading, deleteRoom, toggleActive } = useRoomsMT(filters);
  const { metrics } = useOccupancyMT();

  const filteredRooms = rooms.filter(room =>
    room.nome.toLowerCase().includes(search.toLowerCase())
  );

  const getOccupancy = (roomId: string): number => {
    const m = metrics.find(m => m.room_id === roomId);
    return m?.taxa_ocupacao || 0;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRoom(deleteId);
      setDeleteId(null);
    } catch (err) {
      toast.error("Erro ao remover sala");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleActive(id, !currentActive);
    } catch (err) {
      toast.error("Erro ao alterar status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Salas</h1>
          <p className="text-muted-foreground">
            Gerencie salas, horários e ocupação
          </p>
        </div>
        <Button asChild>
          <Link to="/configuracoes/salas/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar salas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Room Cards Grid */}
      {filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <DoorOpen className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma sala encontrada</p>
            <p className="text-sm">Crie uma nova sala para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const occupancy = getOccupancy(room.id);
            return (
              <Card
                key={room.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  !room.is_active ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{room.nome}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={room.is_active}
                        onCheckedChange={() => handleToggleActive(room.id, room.is_active)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${ROOM_TYPE_COLORS[room.tipo]} border-0`}>
                      {ROOM_TYPE_LABELS[room.tipo]}
                    </Badge>
                    <OccupancyBadge taxa={occupancy} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Capacidade: {room.capacidade}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Wrench className="h-4 w-4" />
                      <span>{(room.equipamentos || []).length} equip.</span>
                    </div>
                  </div>

                  {room.franchise && (
                    <p className="text-xs text-muted-foreground">
                      {room.franchise.nome}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link to={`/configuracoes/salas/${room.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link to={`/configuracoes/salas/${room.id}/editar`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(room.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta sala? Esta ação não pode ser desfeita.
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
