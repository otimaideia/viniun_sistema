import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Upload,
  Link,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorageUploadAdapter } from "@/hooks/useStorageUploadAdapter";

interface ImageItem {
  id?: string;
  url: string;
  ordem: number;
  legenda?: string | null;
}

interface ServicoImageGalleryProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  servicoId?: string;
  disabled?: boolean;
}

export function ServicoImageGallery({
  images,
  onChange,
  servicoId,
  disabled
}: ServicoImageGalleryProps) {
  const [newUrl, setNewUrl] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadMultipleImages, isUploading, progress } = useStorageUploadAdapter();

  // Adicionar imagem via URL
  const addImageByUrl = () => {
    if (!newUrl.trim()) return;

    const newImage: ImageItem = {
      url: newUrl.trim(),
      ordem: images.length,
    };

    onChange([...images, newImage]);
    setNewUrl("");
  };

  // Upload de arquivos
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!servicoId) {
      // Se não tem servicoId, salvar como URL temporária (base64)
      const fileArray = Array.from(files);
      const newImages: ImageItem[] = [];

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        const url = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        newImages.push({
          url,
          ordem: images.length + newImages.length,
        });
      }

      onChange([...images, ...newImages]);
      return;
    }

    // Upload para Supabase Storage
    const fileArray = Array.from(files);
    const results = await uploadMultipleImages(fileArray, servicoId);

    const newImages: ImageItem[] = results.map((result, index) => ({
      url: result.url,
      ordem: images.length + index,
    }));

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }
  }, [images, onChange, servicoId, uploadMultipleImages]);

  // Remover imagem
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index).map((img, i) => ({
      ...img,
      ordem: i,
    }));
    onChange(newImages);
  };

  // Drag and drop para reordenar
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      ordem: i,
    }));

    onChange(reorderedImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Drag and drop para upload de arquivos
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Preview em tela cheia
  const openPreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
  };

  const navigatePreview = (direction: "prev" | "next") => {
    if (previewIndex === null) return;
    const newIndex = direction === "prev"
      ? (previewIndex - 1 + images.length) % images.length
      : (previewIndex + 1) % images.length;
    setPreviewIndex(newIndex);
  };

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Galeria de Imagens ({images.length})
      </Label>

      {/* Grid de imagens existentes */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((image, index) => (
            <div
              key={image.id || `new-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group aspect-square rounded-lg overflow-hidden border-2 transition-all",
                draggedIndex === index ? "opacity-50 border-primary" : "border-transparent",
                !disabled && "cursor-move"
              )}
            >
              <img
                src={image.url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Erro";
                }}
              />

              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {!disabled && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => openPreview(index)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={() => removeImage(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              {/* Número da ordem */}
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>

              {/* Indicador de arrastar */}
              {!disabled && (
                <div className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded opacity-0 group-hover:opacity-100">
                  <GripVertical className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Área de adicionar imagens */}
      {!disabled && (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          {/* Tab de Upload */}
          <TabsContent value="upload" className="mt-3">
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDraggingOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {isUploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Enviando imagens...</p>
                  <Progress value={progress} className="w-full max-w-xs mx-auto" />
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    Arraste imagens aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WEBP ou GIF (máx. 5MB cada)
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            {!servicoId && images.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                As imagens serão enviadas ao servidor quando você salvar o serviço
              </p>
            )}
          </TabsContent>

          {/* Tab de URL */}
          <TabsContent value="url" className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Cole a URL da imagem..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImageByUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addImageByUrl}
                disabled={!newUrl.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Preview da URL sendo digitada */}
            {newUrl && (
              <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={newUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/48x48?text=?";
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {newUrl}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {images.length === 0 && disabled && (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma imagem adicionada
          </p>
        </div>
      )}

      {/* Modal de preview em tela cheia */}
      <Dialog open={previewIndex !== null} onOpenChange={() => closePreview()}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <DialogTitle className="text-white">
              Imagem {previewIndex !== null ? previewIndex + 1 : 0} de {images.length}
            </DialogTitle>
          </DialogHeader>

          {previewIndex !== null && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={images[previewIndex].url}
                alt={`Imagem ${previewIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />

              {/* Navegação */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={() => navigatePreview("prev")}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={() => navigatePreview("next")}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Botão fechar */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={closePreview}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}

          {/* Miniaturas */}
          {images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto bg-black/80">
              {images.map((image, index) => (
                <button
                  key={image.id || `thumb-${index}`}
                  onClick={() => setPreviewIndex(index)}
                  className={cn(
                    "h-16 w-16 rounded overflow-hidden flex-shrink-0 border-2 transition-all",
                    index === previewIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img
                    src={image.url}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
