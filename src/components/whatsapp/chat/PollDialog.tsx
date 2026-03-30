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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, BarChart2 } from "lucide-react";
import { toast } from "sonner";

interface PollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (poll: PollData) => Promise<{ success: boolean; error?: string }>;
  isSending?: boolean;
}

export interface PollData {
  question: string;
  options: string[];
  allowMultipleAnswers: boolean;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 12;

export function PollDialog({
  open,
  onOpenChange,
  onSend,
  isSending = false,
}: PollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) {
      toast.error(`Máximo de ${MAX_OPTIONS} opções`);
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) {
      toast.error(`Mínimo de ${MIN_OPTIONS} opções`);
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("A pergunta é obrigatória");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < MIN_OPTIONS) {
      toast.error(`Informe pelo menos ${MIN_OPTIONS} opções`);
      return;
    }

    const pollData: PollData = {
      question: question.trim(),
      options: validOptions,
      allowMultipleAnswers: allowMultiple,
    };

    try {
      const result = await onSend(pollData);
      if (result.success) {
        toast.success("Enquete enviada com sucesso!");
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao enviar enquete");
      }
    } catch (error) {
      toast.error("Erro ao enviar enquete");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Criar Enquete
          </DialogTitle>
          <DialogDescription>
            Crie uma enquete para enviar na conversa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pergunta */}
          <div className="space-y-2">
            <Label htmlFor="question">Pergunta *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Digite sua pergunta..."
              maxLength={255}
              required
            />
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <Label>Opções *</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {options.map((option, index) => (
                <div key={`poll-option-${index}`} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    maxLength={100}
                  />
                  {options.length > MIN_OPTIONS && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Opção
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {options.length}/{MAX_OPTIONS} opções
            </p>
          </div>

          {/* Múltiplas respostas */}
          <div className="flex items-center justify-between">
            <Label htmlFor="allowMultiple" className="cursor-pointer">
              Permitir múltiplas respostas
            </Label>
            <Switch
              id="allowMultiple"
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar Enquete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PollDialog;
