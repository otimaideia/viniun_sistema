import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Filter, ImageIcon, Eye, Edit, Trash2 } from "lucide-react";
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";
import { AssetFormModal } from "./AssetFormModal";
import { AssetViewModal } from "./AssetViewModal";
import { AssetDeleteDialog } from "./AssetDeleteDialog";
import type { MarketingAsset, AssetCategoria } from "@/types/marketing";
import { ASSET_CATEGORY_OPTIONS } from "@/types/marketing";

export function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketingAsset | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "delete" | null>(null);

  const { assets, stats, isLoading, refetch } = useMarketingAssetsAdapter();

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.descricao && asset.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === "all" || asset.tipo === selectedType;
    const matchesCategory = selectedCategory === "all" || asset.categoria === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const getCategoryLabel = (category: string | null | undefined) => {
    if (!category) return null;
    const option = ASSET_CATEGORY_OPTIONS.find((opt) => opt.value === category);
    return option?.label || category;
  };

  const handleAction = (asset: MarketingAsset, action: "view" | "edit" | "delete") => {
    setSelectedAsset(asset);
    setViewMode(action);
  };

  const closeDialog = () => {
    setSelectedAsset(null);
    setViewMode(null);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      imagem: "Imagem",
      video: "Video",
      banner: "Banner",
      logo: "Logo",
      arte_social: "Arte Social",
    };
    return types[type] || type;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets de Marketing</h1>
          <p className="text-muted-foreground">
            Galeria de imagens, banners e artes de marketing
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Asset
        </Button>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">Todos os Tipos</option>
            <option value="imagem">Imagens</option>
            <option value="banner">Banners</option>
            <option value="video">Vídeos</option>
            <option value="logo">Logos</option>
            <option value="arte_social">Artes Sociais</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">Todas as Categorias</option>
            {ASSET_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de estatisticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total de Assets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.imagens}</div>
            <div className="text-sm text-muted-foreground">Imagens</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.banners}</div>
            <div className="text-sm text-muted-foreground">Banners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.videos}</div>
            <div className="text-sm text-muted-foreground">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.artesSociais}</div>
            <div className="text-sm text-muted-foreground">Artes Sociais</div>
          </CardContent>
        </Card>
      </div>

      {/* Galeria de Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Galeria de Assets ({filteredAssets.length})
          </CardTitle>
          <CardDescription>Visualize e gerencie seus assets de marketing</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {assets.length === 0
                  ? "Nenhum asset criado ainda"
                  : "Nenhum asset encontrado"}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Primeiro Asset
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.map((asset) => (
                <Card
                  key={asset.id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {asset.tipo === "video" ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                        <span className="ml-2">Video</span>
                      </div>
                    ) : (
                      <img
                        src={asset.file_url}
                        alt={asset.nome}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={getTypeVariant(asset.tipo)} className="text-xs">
                        {getTypeLabel(asset.tipo)}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1 line-clamp-1">{asset.nome}</h3>
                    {asset.categoria && (
                      <Badge variant="outline" className="text-xs mb-2">
                        {getCategoryLabel(asset.categoria)}
                      </Badge>
                    )}
                    {asset.descricao && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {asset.descricao}
                      </p>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.file_size)}
                      </p>

                      {asset.dimensoes?.width && asset.dimensoes?.height && (
                        <p className="text-xs text-muted-foreground">
                          {asset.dimensoes.width} x {asset.dimensoes.height}px
                        </p>
                      )}

                      {asset.tags && asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={tag || `tag-${index}`} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {asset.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{asset.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAction(asset, "view")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAction(asset, "edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAction(asset, "delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {!asset.ativo && (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AssetFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setShowAddModal(false);
          refetch();
        }}
      />

      {selectedAsset && viewMode === "view" && (
        <AssetViewModal
          asset={selectedAsset}
          open={true}
          onOpenChange={closeDialog}
        />
      )}

      {selectedAsset && viewMode === "edit" && (
        <AssetFormModal
          asset={selectedAsset}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}

      {selectedAsset && viewMode === "delete" && (
        <AssetDeleteDialog
          asset={selectedAsset}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}
    </div>
  );
}
