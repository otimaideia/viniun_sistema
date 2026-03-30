import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";
import { CATEGORIAS_PADRAO } from "@/types/checklist";

export function AddItemDialog({
  dailyId, titulo, setTitulo, hora, setHora, prioridade, setPrioridade, categoria, setCategoria, onClose,
}: {
  dailyId: string;
  titulo: string;
  setTitulo: (v: string) => void;
  hora: string;
  setHora: (v: string) => void;
  prioridade: string;
  setPrioridade: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  onClose: () => void;
}) {
  const execution = useChecklistExecutionMT(dailyId);

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    execution.addAdHocItem.mutate(
      {
        titulo: titulo.trim(),
        hora_bloco: hora || undefined,
        prioridade,
        categoria: categoria || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Item ao Checklist</DialogTitle>
          <DialogDescription>
            Adicione uma tarefa ad-hoc ao checklist do colaborador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              placeholder="Nome da tarefa..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Horário</label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Categoria</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_PADRAO.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!titulo.trim() || execution.addAdHocItem.isPending}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
