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
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import type { MarketingTemplate } from "@/types/marketing";

interface TemplateDeleteDialogProps {
  template: MarketingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TemplateDeleteDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: TemplateDeleteDialogProps) {
  const { deleteTemplate, isDeleting } = useMarketingTemplatesAdapter();

  const handleDelete = async () => {
    try {
      await deleteTemplate(template.id);
      onSuccess();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Template</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o template "{template.nome_template}"? Esta acao nao
            pode ser desfeita.
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
