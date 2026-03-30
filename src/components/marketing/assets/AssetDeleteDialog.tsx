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
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";
import type { MarketingAsset } from "@/types/marketing";

interface AssetDeleteDialogProps {
  asset: MarketingAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssetDeleteDialog({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: AssetDeleteDialogProps) {
  const { deleteAsset, isDeleting } = useMarketingAssetsAdapter();

  const handleDelete = async () => {
    try {
      await deleteAsset(asset.id);
      onSuccess();
    } catch (error) {
      console.error("Erro ao excluir asset:", error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Asset</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o asset "{asset.nome}"? Esta acao nao pode ser desfeita
            e o arquivo sera removido permanentemente.
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
