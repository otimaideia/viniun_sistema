import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";

export function FinalizeDialog({
  dailyId, status, setStatus, obs, setObs, onClose,
}: {
  dailyId: string;
  status: "concluido" | "incompleto" | "cancelado";
  setStatus: (v: "concluido" | "incompleto" | "cancelado") => void;
  obs: string;
  setObs: (v: string) => void;
  onClose: () => void;
}) {
  const execution = useChecklistExecutionMT(dailyId);

  return (
    <AlertDialog open onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar Checklist</AlertDialogTitle>
          <AlertDialogDescription>
            Defina o status final e adicione observações se necessário.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Status final</label>
            <Select value={status} onValueChange={(v) => setStatus(v as "concluido" | "incompleto" | "cancelado")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="incompleto">Incompleto</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Observações do gestor</label>
            <Textarea
              placeholder="Observações..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              execution.finalize.mutate(
                { status, observacoes: obs || undefined },
                { onSuccess: onClose }
              );
            }}
          >
            Finalizar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
