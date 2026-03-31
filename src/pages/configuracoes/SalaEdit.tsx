import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRoomsMT, useRoomMT, useRoomSchedulesMT, useRoomAssignmentsMT, type RoomType } from "@/hooks/multitenant/useRoomsMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Loader2,
  DoorOpen,
  Plus,
  X,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "laser", label: "Principal" },
  { value: "injetaveis", label: "Especializada" },
  { value: "estetica", label: "Serviços" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "multiuso", label: "Multiuso" },
];

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const roomSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres").max(100),
  tipo: z.string().min(1, "Selecione o tipo"),
  capacidade: z.coerce.number().min(1, "Mínimo 1").max(50),
  area_m2: z.coerce.number().min(0).optional().or(z.literal("")),
  custo_mensal: z.coerce.number().min(0).optional().or(z.literal("")),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface ScheduleRow {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  is_active: boolean;
}

interface AssignmentRow {
  id?: string;
  profissional_id: string;
  profissional_nome: string;
  dia_semana?: number;
  hora_inicio?: string;
  hora_fim?: string;
}

export default function SalaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isSaving, setIsSaving] = useState(false);

  const { createRoom, updateRoom } = useRoomsMT();
  const { room, isLoading: roomLoading } = useRoomMT(isEditing ? id : undefined);
  const { schedules, saveAllSchedules } = useRoomSchedulesMT(isEditing ? id : undefined);
  const { assignments, createAssignment, deleteAssignment } = useRoomAssignmentsMT(isEditing ? id : undefined);

  // Equipamentos state
  const [equipamentos, setEquipamentos] = useState<string[]>([]);
  const [newEquipamento, setNewEquipamento] = useState("");

  // Schedule state
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(
    DAY_LABELS.map((_, i) => ({
      dia_semana: i,
      hora_inicio: "08:00",
      hora_fim: "20:00",
      is_active: i >= 1 && i <= 5, // Mon-Fri active by default
    }))
  );

  // Assignment state
  const [newProfName, setNewProfName] = useState("");
  const [newProfId, setNewProfId] = useState("");

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      nome: "",
      tipo: "multiuso",
      capacidade: 1,
      area_m2: "",
      custo_mensal: "",
    },
  });

  // Load existing room data
  useEffect(() => {
    if (room && isEditing) {
      form.reset({
        nome: room.nome,
        tipo: room.tipo,
        capacidade: room.capacidade,
        area_m2: room.area_m2 || "",
        custo_mensal: room.custo_mensal || "",
      });
      setEquipamentos(room.equipamentos || []);
    }
  }, [room, isEditing, form]);

  // Load existing schedules
  useEffect(() => {
    if (schedules.length > 0 && isEditing) {
      const rows = DAY_LABELS.map((_, i) => {
        const existing = schedules.find(s => s.dia_semana === i);
        return {
          dia_semana: i,
          hora_inicio: existing?.hora_inicio || "08:00",
          hora_fim: existing?.hora_fim || "20:00",
          is_active: !!existing?.is_active,
        };
      });
      setScheduleRows(rows);
    }
  }, [schedules, isEditing]);

  const addEquipamento = () => {
    if (!newEquipamento.trim()) return;
    if (equipamentos.includes(newEquipamento.trim())) {
      toast.error("Equipamento já adicionado");
      return;
    }
    setEquipamentos([...equipamentos, newEquipamento.trim()]);
    setNewEquipamento("");
  };

  const removeEquipamento = (index: number) => {
    setEquipamentos(equipamentos.filter((_, i) => i !== index));
  };

  const updateScheduleRow = (index: number, field: keyof ScheduleRow, value: unknown) => {
    const updated = [...scheduleRows];
    (updated[index] as Record<string, unknown>)[field] = value;
    setScheduleRows(updated);
  };

  const handleAddAssignment = async () => {
    if (!newProfName.trim()) {
      toast.error("Informe o nome do profissional");
      return;
    }
    if (isEditing && id) {
      try {
        await createAssignment({
          room_id: id,
          profissional_id: newProfId || crypto.randomUUID(),
          profissional_nome: newProfName.trim(),
        });
        setNewProfName("");
        setNewProfId("");
      } catch {
        toast.error("Erro ao adicionar profissional");
      }
    }
  };

  const onSubmit = async (values: RoomFormValues) => {
    setIsSaving(true);
    try {
      const roomData = {
        nome: values.nome,
        tipo: values.tipo as RoomType,
        capacidade: values.capacidade,
        area_m2: values.area_m2 ? Number(values.area_m2) : null,
        custo_mensal: values.custo_mensal ? Number(values.custo_mensal) : null,
        equipamentos,
      };

      if (isEditing && id) {
        await updateRoom(id, roomData);
        await saveAllSchedules(scheduleRows);
        toast.success("Sala atualizada com sucesso");
        navigate(`/configuracoes/salas/${id}`);
      } else {
        const created = await createRoom(roomData);
        // Save schedules for the new room
        // Note: saveAllSchedules uses roomId from hook, so we need to navigate first
        toast.success("Sala criada com sucesso");
        navigate(`/configuracoes/salas/${created.id}/editar`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar sala");
    } finally {
      setIsSaving(false);
    }
  };

  if (roomLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/salas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DoorOpen className="h-6 w-6 text-primary" />
            {isEditing ? "Editar Sala" : "Nova Sala"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? `Editando: ${room?.nome}` : "Preencha os dados da nova sala"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Sala</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Sala Principal 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_m2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.1} placeholder="Ex: 15.5" {...field} />
                      </FormControl>
                      <FormDescription>Opcional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="custo_mensal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo Mensal (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.01} placeholder="Ex: 1500.00" {...field} />
                      </FormControl>
                      <FormDescription>Opcional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Equipamentos</CardTitle>
              <CardDescription>Adicione os equipamentos disponíveis na sala</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do equipamento"
                  value={newEquipamento}
                  onChange={(e) => setNewEquipamento(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEquipamento())}
                />
                <Button type="button" variant="outline" onClick={addEquipamento}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {equipamentos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {equipamentos.map((eq, i) => (
                    <Badge key={i} variant="secondary" className="text-sm gap-1 pr-1">
                      {eq}
                      <button
                        type="button"
                        onClick={() => removeEquipamento(i)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Funcionamento
              </CardTitle>
              <CardDescription>Configure os dias e horários de operação</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleRows.map((row, i) => (
                    <TableRow key={row.dia_semana}>
                      <TableCell className="font-medium">{DAY_LABELS[row.dia_semana]}</TableCell>
                      <TableCell>
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(v) => updateScheduleRow(i, "is_active", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.hora_inicio}
                          onChange={(e) => updateScheduleRow(i, "hora_inicio", e.target.value)}
                          disabled={!row.is_active}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.hora_fim}
                          onChange={(e) => updateScheduleRow(i, "hora_fim", e.target.value)}
                          disabled={!row.is_active}
                          className="w-28"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Professional Assignments (only in edit mode) */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Profissionais Alocados
                </CardTitle>
                <CardDescription>Vincule profissionais a esta sala</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do profissional"
                    value={newProfName}
                    onChange={(e) => setNewProfName(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={handleAddAssignment}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {assignments.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Dia</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead className="w-12"></TableHead>
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteAssignment(a.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Salvar Alterações" : "Criar Sala"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/configuracoes/salas")}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
