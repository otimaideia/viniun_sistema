import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, ExternalLink } from "lucide-react";
import type { MarketingAsset } from "@/types/marketing";
import { ASSET_CATEGORY_OPTIONS } from "@/types/marketing";

interface AssetViewModalProps {
  asset: MarketingAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetViewModal({ asset, open, onOpenChange }: AssetViewModalProps) {
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      imagem: "Imagem",
      video: "Vídeo",
      banner: "Banner",
      logo: "Logo",
      arte_social: "Arte Social",
    };
    return types[type] || type;
  };

  const getCategoryLabel = (category: string | null | undefined) => {
    if (!category) return null;
    const option = ASSET_CATEGORY_OPTIONS.find((opt) => opt.value === category);
    return option?.label || category;
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      imagem: "default",
      video: "secondary",
      banner: "outline",
      logo: "destructive",
      arte_social: "outline",
    };
    return variants[type] || "default";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset.nome}</DialogTitle>
          <DialogDescription>Detalhes do asset de marketing</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-muted rounded-lg overflow-hidden">
            {asset.tipo === "video" ? (
              <video
                src={asset.file_url}
                controls
                className="w-full max-h-96 object-contain"
              />
            ) : (
              <img
                src={asset.file_url}
                alt={asset.nome}
                className="w-full max-h-96 object-contain"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em Nova Aba
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={asset.file_url} download={asset.nome}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>

          <Separator />

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getTypeVariant(asset.tipo)}>{getTypeLabel(asset.tipo)}</Badge>
            {asset.categoria && <Badge variant="outline">{getCategoryLabel(asset.categoria)}</Badge>}
            {asset.ativo ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>

          {asset.descricao && (
            <div>
              <h4 className="font-medium mb-2">Descricao</h4>
              <p className="text-sm text-muted-foreground">{asset.descricao}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Unidade</h4>
              <p className="text-sm text-muted-foreground">
                {asset.mt_franchises?.nome_fantasia || "Geral (todas as unidades)"}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Campanha</h4>
              <p className="text-sm text-muted-foreground">
                {asset.mt_campaigns?.nome || "Nenhuma"}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tamanho</h4>
              <p className="text-sm text-muted-foreground">{formatFileSize(asset.file_size)}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tipo de Arquivo</h4>
              <p className="text-sm text-muted-foreground">{asset.file_type || "N/A"}</p>
            </div>

            {asset.dimensoes?.width && asset.dimensoes?.height && (
              <div>
                <h4 className="font-medium mb-2">Dimensoes</h4>
                <p className="text-sm text-muted-foreground">
                  {asset.dimensoes.width} x {asset.dimensoes.height}px
                </p>
              </div>
            )}
          </div>

          {asset.tags && asset.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <p>{new Date(asset.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Atualizado em:</span>
              <p>{new Date(asset.updated_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
