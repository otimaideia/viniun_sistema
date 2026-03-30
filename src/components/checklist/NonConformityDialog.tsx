import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";

export function NonConformityDialog({
  open, dailyId, itemId, ncDesc, setNcDesc, ncAction, setNcAction, onClose,
}: {
  open: boolean;
  dailyId: string;
  itemId: string;
  ncDesc: string;
  setNcDesc: (v: string) => void;
  ncAction: string;
  setNcAction: (v: string) => void;
  onClose: () => void;
}) {
  const execution = useChecklistExecutionMT(dailyId);

  const handleSubmit = () => {
    if (!ncDesc.trim()) return;
    execution.flagNonConformity.mutate(
      { itemId, descricao: ncDesc, acao: ncAction },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Registrar Não-Conformidade</DialogTitle>
          <DialogDescription>
            Descreva o problema encontrado e a ação corretiva necessária.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Descrição do problema *</label>
            <Textarea
              placeholder="Descreva o que está errado..."
              value={ncDesc}
              onChange={(e) => setNcDesc(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Ação corretiva</label>
            <Textarea
              placeholder="O que precisa ser feito para corrigir..."
              value={ncAction}
              onChange={(e) => setNcAction(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!ncDesc.trim() || execution.flagNonConformity.isPending}
          >
            Registrar NC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
