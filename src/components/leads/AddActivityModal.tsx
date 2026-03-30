import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StickyNote,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Calendar,
  RefreshCw,
  CheckSquare,
  Pin,
  Bell,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  LeadActivityType,
  LeadActivityInsert,
  CallResult,
  TaskPriority,
  ActivityAppointmentStatus,
} from "@/types/lead-crm";
import {
  CALL_RESULT_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  ACTIVITY_APPOINTMENT_STATUS_LABELS,
} from "@/types/lead-crm";
import { cn } from "@/lib/utils";

interface AddActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  franqueadoId?: string;
  onSubmit: (data: LeadActivityInsert) => Promise<void>;
  isSubmitting?: boolean;
}

const ACTIVITY_TYPES: {
  value: LeadActivityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "nota",
    label: "Nota",
    icon: StickyNote,
    color: "text-gray-600",
    bgColor: "bg-gray-100 hover:bg-gray-200",
  },
  {
    value: "ligacao",
    label: "Ligacao",
    icon: Phone,
    color: "text-blue-600",
    bgColor: "bg-blue-100 hover:bg-blue-200",
  },
  {
    value: "email",
    label: "E-mail",
    icon: Mail,
    color: "text-purple-600",
    bgColor: "bg-purple-100 hover:bg-purple-200",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 hover:bg-green-200",
  },
  {
    value: "reuniao",
    label: "Reuniao",
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-100 hover:bg-orange-200",
  },
  {
    value: "agendamento",
    label: "Agendamento",
    icon: Calendar,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 hover:bg-cyan-200",
  },
  {
    value: "tarefa",
    label: "Tarefa",
    icon: CheckSquare,
    color: "text-pink-600",
    bgColor: "bg-pink-100 hover:bg-pink-200",
  },
];

export function AddActivityModal({
  open,
  onOpenChange,
  leadId,
  franqueadoId,
  onSubmit,
  isSubmitting = false,
}: AddActivityModalProps) {
  // Estados básicos
  const [tipo, setTipo] = useState<LeadActivityType>("nota");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataAtividade, setDataAtividade] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [dataLembrete, setDataLembrete] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [hasLembrete, setHasLembrete] = useState(false);

  // Estados para ligação
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | undefined>();
  const [resultadoLigacao, setResultadoLigacao] = useState<CallResult | undefined>();

  // Estados para agendamento
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horaAgendamento, setHoraAgendamento] = useState("");
  const [localAgendamento, setLocalAgendamento] = useState("");
  const [statusAgendamento, setStatusAgendamento] = useState<ActivityAppointmentStatus>("pendente");

  // Estados para tarefa
  const [dataPrazo, setDataPrazo] = useState("");
  const [prioridade, setPrioridade] = useState<TaskPriority>("normal");

  const resetForm = () => {
    setTipo("nota");
    setTitulo("");
    setDescricao("");
    setDataAtividade(new Date().toISOString().slice(0, 16));
    setDataLembrete("");
    setIsPinned(false);
    setHasLembrete(false);
    setDuracaoMinutos(undefined);
    setResultadoLigacao(undefined);
    setDataAgendamento("");
    setHoraAgendamento("");
    setLocalAgendamento("");
    setStatusAgendamento("pendente");
    setDataPrazo("");
    setPrioridade("normal");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao.trim()) {
      toast.error("A descricao e obrigatoria");
      return;
    }

    const data: LeadActivityInsert = {
      lead_id: leadId,
      franqueado_id: franqueadoId,
      tipo,
      titulo: titulo.trim() || undefined,
      descricao: descricao.trim(),
      data_atividade: dataAtividade,
      data_lembrete: hasLembrete && dataLembrete ? dataLembrete : undefined,
      is_pinned: isPinned,
    };

    // Adicionar campos específicos de ligação
    if (tipo === "ligacao") {
      data.duracao_minutos = duracaoMinutos;
      data.resultado_ligacao = resultadoLigacao;
    }

    // Adicionar campos específicos de agendamento
    if (tipo === "agendamento") {
      data.data_agendamento = dataAgendamento || undefined;
      data.hora_agendamento = horaAgendamento || undefined;
      data.local_agendamento = localAgendamento || undefined;
      data.status_agendamento = statusAgendamento;
    }

    // Adicionar campos específicos de tarefa
    if (tipo === "tarefa") {
      data.data_prazo = dataPrazo || undefined;
      data.prioridade = prioridade;
    }

    try {
      await onSubmit(data);
      toast.success("Atividade criada com sucesso!");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao criar atividade");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
          <DialogDescription>
            Registre uma nova atividade para este lead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Atividade */}
          <div className="space-y-2">
            <Label>Tipo de Atividade</Label>
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = tipo === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTipo(type.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${type.bgColor} border-current ${type.color}`
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? type.color : ""}`} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Titulo (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo (opcional)</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Titulo da atividade..."
            />
          </div>

          {/* Descricao */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a atividade..."
              rows={3}
              required
            />
          </div>

          {/* Campos específicos de LIGACAO */}
          {tipo === "ligacao" && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Detalhes da Ligacao
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duracaoMinutos" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duracao (minutos)
                  </Label>
                  <Input
                    id="duracaoMinutos"
                    type="number"
                    min={0}
                    value={duracaoMinutos || ""}
                    onChange={(e) => setDuracaoMinutos(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Ex: 5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resultadoLigacao">Resultado</Label>
                  <Select
                    value={resultadoLigacao || ""}
                    onValueChange={(value) => setResultadoLigacao(value as CallResult)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o resultado" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CALL_RESULT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos de AGENDAMENTO */}
          {tipo === "agendamento" && (
            <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <h4 className="font-medium text-cyan-800 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Detalhes do Agendamento
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataAgendamento">Data</Label>
                  <Input
                    id="dataAgendamento"
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horaAgendamento">Hora</Label>
                  <Input
                    id="horaAgendamento"
                    type="time"
                    value={horaAgendamento}
                    onChange={(e) => setHoraAgendamento(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localAgendamento" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local
                </Label>
                <Input
                  id="localAgendamento"
                  value={localAgendamento}
                  onChange={(e) => setLocalAgendamento(e.target.value)}
                  placeholder="Local do agendamento..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusAgendamento">Status</Label>
                <Select
                  value={statusAgendamento}
                  onValueChange={(value) => setStatusAgendamento(value as ActivityAppointmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Campos específicos de TAREFA */}
          {tipo === "tarefa" && (
            <div className="space-y-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
              <h4 className="font-medium text-pink-800 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Detalhes da Tarefa
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataPrazo" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Data Limite
                  </Label>
                  <Input
                    id="dataPrazo"
                    type="date"
                    value={dataPrazo}
                    onChange={(e) => setDataPrazo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={prioridade}
                    onValueChange={(value) => setPrioridade(value as TaskPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <span className={cn("px-2 py-0.5 rounded", TASK_PRIORITY_COLORS[value as TaskPriority])}>
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Data da Atividade */}
          <div className="space-y-2">
            <Label htmlFor="dataAtividade">Data e Hora da Atividade</Label>
            <Input
              id="dataAtividade"
              type="datetime-local"
              value={dataAtividade}
              onChange={(e) => setDataAtividade(e.target.value)}
            />
          </div>

          {/* Lembrete */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="hasLembrete" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Adicionar Lembrete
              </Label>
              <Switch
                id="hasLembrete"
                checked={hasLembrete}
                onCheckedChange={setHasLembrete}
              />
            </div>
            {hasLembrete && (
              <Input
                type="datetime-local"
                value={dataLembrete}
                onChange={(e) => setDataLembrete(e.target.value)}
                placeholder="Data do lembrete"
              />
            )}
          </div>

          {/* Fixar */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isPinned" className="flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Fixar no Topo
            </Label>
            <Switch
              id="isPinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Criar Atividade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddActivityModal;
