import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface EventData {
  name: string;
  description?: string;
  startTime: number; // Unix timestamp em segundos
  endTime?: number;
  location?: { name: string };
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (event: EventData) => Promise<{ success: boolean; error?: string }>;
}

export function EventDialog({ open, onOpenChange, onSend }: EventDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDate("");
    setTime("");
    setEndDate("");
    setEndTime("");
    setLocationName("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !date || !time) {
      toast.error("Preencha nome, data e hora do evento");
      return;
    }

    setIsLoading(true);

    const startDateTime = new Date(`${date}T${time}`);
    const startTime = Math.floor(startDateTime.getTime() / 1000);

    let endTimeValue: number | undefined;
    if (endDate && endTime) {
      const endDateTime = new Date(`${endDate}T${endTime}`);
      endTimeValue = Math.floor(endDateTime.getTime() / 1000);
    }

    const result = await onSend({
      name: name.trim(),
      description: description.trim() || undefined,
      startTime,
      endTime: endTimeValue,
      location: locationName.trim() ? { name: locationName.trim() } : undefined,
    });

    setIsLoading(false);

    if (result.success) {
      toast.success("Evento enviado!");
      onOpenChange(false);
      resetForm();
    } else {
      toast.error(result.error || "Erro ao enviar evento");
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Nome do Evento *</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reuniao de equipe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Descricao</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">Data de Inicio *</Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Hora de Inicio *</Label>
              <Input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-end-date">Data de Termino</Label>
              <Input
                id="event-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end-time">Hora de Termino</Label>
              <Input
                id="event-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-location">Local</Label>
            <Input
              id="event-location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Sala de reunioes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Evento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
