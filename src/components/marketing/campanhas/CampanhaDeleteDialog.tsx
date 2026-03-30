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
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import type { MarketingCampanha } from "@/types/marketing";

interface CampanhaDeleteDialogProps {
  campanha: MarketingCampanha;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampanhaDeleteDialog({
  campanha,
  open,
  onOpenChange,
  onSuccess,
}: CampanhaDeleteDialogProps) {
  const { deleteCampanha, isDeleting } = useMarketingCampanhasAdapter();

  const handleDelete = async () => {
    try {
      await deleteCampanha(campanha.id);
      onSuccess();
    } catch (error) {
      console.error("Erro ao excluir campanha:", error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a campanha "{campanha.nome}"? Esta acao nao pode ser
            desfeita. Todos os assets associados a esta campanha serao desvinculados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
