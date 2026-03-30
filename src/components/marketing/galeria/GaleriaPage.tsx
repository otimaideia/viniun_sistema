import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Download,
  ExternalLink,
  Filter,
  Grid3X3,
  LayoutGrid,
  Image as ImageIcon,
  Video,
  Palette,
  X,
  FolderSync,
  RefreshCw,
} from "lucide-react";
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";
import type { MarketingAsset } from "@/types/marketing";
import { DriveSyncModal } from "./DriveSyncModal";

type ViewMode = "grid" | "masonry";

export function GaleriaPage() {
  const { assets, isLoading, refetch } = useMarketingAssetsAdapter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedAsset, setSelectedAsset] = useState<MarketingAsset | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Filter only visual assets (images, banners, logos, arte_social)
  const visualAssets = useMemo(() => {
    return assets.filter(
      (asset) =>
        asset.tipo !== "video" &&
        asset.ativo &&
        (filterType === "all" || asset.tipo === filterType) &&
        (filterCategoria === "all" || asset.categoria === filterCategoria) &&
        (searchTerm === "" ||
          asset.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ))
    );
  }, [assets, filterType, filterCategoria, searchTerm]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    assets.forEach((asset) => {
      if (asset.categoria) cats.add(asset.categoria);
    });
    return Array.from(cats).sort();
  }, [assets]);

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      imagem: "Imagem",
      banner: "Banner",
      logo: "Logo",
      arte_social: "Arte Social",
    };
    return types[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "imagem":
        return <ImageIcon className="h-4 w-4" />;
      case "banner":
        return <LayoutGrid className="h-4 w-4" />;
      case "logo":
        return <Palette className="h-4 w-4" />;
      case "arte_social":
        return <Grid3X3 className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Galeria de Artes</h1>
          <p className="text-muted-foreground">
            {visualAssets.length === 1
              ? "1 arte disponível"
              : `${visualAssets.length} artes disponíveis`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setSyncModalOpen(true)}
            className="gap-2"
          >
            <FolderSync className="h-4 w-4" />
            <span className="hidden sm:inline">Sincronizar Drive</span>
          </Button>
          <div className="border-l border-border h-6 mx-1" />
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "masonry" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("masonry")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="imagem">Imagem</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="arte_social">Arte Social</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {visualAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma arte encontrada</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filterType !== "all" || filterCategoria !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Adicione assets do tipo imagem, banner, logo ou arte social"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4"
          }
        >
          {visualAssets.map((asset) => (
            <Card
              key={asset.id}
              className={`group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary ${
                viewMode === "masonry" ? "break-inside-avoid mb-4" : ""
              }`}
              onClick={() => setSelectedAsset(asset)}
            >
              <div
                className={`relative ${
                  viewMode === "grid" ? "aspect-square" : ""
                } overflow-hidden bg-muted`}
              >
                <img
                  src={asset.file_url}
                  alt={asset.nome}
                  className={`w-full ${
                    viewMode === "grid"
                      ? "h-full object-cover"
                      : "object-contain"
                  } transition-transform group-hover:scale-105`}
                  loading="lazy"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" asChild>
                    <a
                      href={asset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a
                      href={asset.file_url}
                      download={asset.nome}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="gap-1">
                    {getTypeIcon(asset.tipo)}
                    {getTypeLabel(asset.tipo)}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-3">
                <p className="font-medium truncate" title={asset.nome}>
                  {asset.nome}
                </p>
                {asset.dimensoes?.width && asset.dimensoes?.height && (
                  <p className="text-xs text-muted-foreground">
                    {asset.dimensoes.width} x {asset.dimensoes.height}px
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog
        open={!!selectedAsset}
        onOpenChange={() => setSelectedAsset(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{selectedAsset?.nome}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={selectedAsset?.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={selectedAsset?.file_url}
                    download={selectedAsset?.nome}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Preview */}
            <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={selectedAsset?.file_url}
                alt={selectedAsset?.nome}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              {selectedAsset && (
                <Badge variant="outline" className="gap-1">
                  {getTypeIcon(selectedAsset.tipo)}
                  {getTypeLabel(selectedAsset.tipo)}
                </Badge>
              )}
              {selectedAsset?.categoria && (
                <Badge variant="outline">{selectedAsset.categoria}</Badge>
              )}
              {selectedAsset?.dimensoes?.width &&
                selectedAsset?.dimensoes?.height && (
                  <Badge variant="secondary">
                    {selectedAsset.dimensoes.width} x{" "}
                    {selectedAsset.dimensoes.height}px
                  </Badge>
                )}
              {selectedAsset?.mt_franchises?.nome_fantasia && (
                <Badge variant="secondary">
                  {selectedAsset.mt_franchises.nome_fantasia}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {selectedAsset?.tags && selectedAsset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedAsset.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {selectedAsset?.descricao && (
              <p className="text-sm text-muted-foreground">
                {selectedAsset.descricao}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Drive Sync Modal */}
      <DriveSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
      />
    </div>
  );
}
