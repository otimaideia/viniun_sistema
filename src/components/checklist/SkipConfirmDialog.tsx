import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useChecklistExecutionMT } from "@/hooks/multitenant/useChecklistExecutionMT";

export function SkipConfirmDialog({
  open, dailyId, itemId, onClose,
}: {
  open: boolean;
  dailyId: string;
  itemId: string;
  onClose: () => void;
}) {
  const execution = useChecklistExecutionMT(dailyId);

  return (
    <AlertDialog open={open} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pular este item?</AlertDialogTitle>
          <AlertDialogDescription>
            O item será marcado como pulado. Você pode reabri-lo depois se necessário.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              execution.skipItem.mutate({ itemId }, { onSuccess: onClose });
            }}
          >
            Pular
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
