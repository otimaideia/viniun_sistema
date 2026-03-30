import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera } from "lucide-react";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";
import { useChecklistPhotoUpload } from "@/hooks/multitenant/useChecklistPhotoUpload";

export function ObservationDialog({
  open, action, dailyId, itemId, obsText, setObsText, onClose, requerFoto,
}: {
  open: boolean;
  action: "complete" | "notdone";
  dailyId: string;
  itemId: string;
  obsText: string;
  setObsText: (v: string) => void;
  onClose: () => void;
  requerFoto?: boolean;
}) {
  const execution = useChecklistExecutionMT(dailyId);
  const photoUpload = useChecklistPhotoUpload(dailyId);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const isComplete = action === "complete";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    let fotoUrl: string | undefined;

    if (photoFile) {
      const url = await photoUpload.uploadPhoto(itemId, photoFile);
      if (url) fotoUrl = url;
    }

    if (isComplete) {
      execution.completeItem.mutate({ itemId, observacoes: obsText || undefined, fotoUrl }, { onSuccess: onClose });
    } else {
      execution.markNotDone.mutate({ itemId, observacoes: obsText || undefined }, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isComplete ? "Concluir Item" : "Marcar como Não Feito"}</DialogTitle>
          <DialogDescription>
            {isComplete
              ? "Descreva o que foi feito nesta tarefa para documentar a execução."
              : "Informe o motivo pelo qual o item não foi feito."}
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium">
            {isComplete ? "O que foi feito? *" : "Motivo *"}
          </label>
          <Textarea
            placeholder={isComplete ? "Descreva o que foi realizado nesta tarefa..." : "Motivo..."}
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
            rows={3}
            className="mt-1"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right mt-0.5">{obsText.length}/500</p>
        </div>

        {/* Upload de foto */}
        {isComplete && (
          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <Camera className="h-4 w-4" />
              {requerFoto ? 'Foto obrigatória *' : 'Foto (opcional)'}
            </label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="text-sm"
            />
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="mt-2 rounded-md max-h-32 object-cover" />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant={isComplete ? "default" : "destructive"}
            disabled={
              execution.completeItem.isPending || execution.markNotDone.isPending || photoUpload.uploading
              || !obsText.trim()
              || (isComplete && requerFoto && !photoFile)
            }
          >
            {photoUpload.uploading ? "Enviando foto..." : isComplete ? "Concluir" : "Marcar Não Feito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
