import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, ImageIcon, CheckCircle, AlertCircle, Files } from "lucide-react";
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { toast } from "sonner";
import type { MarketingAsset, AssetTipo, AssetCategoria, MarketingAssetFormData } from "@/types/marketing";
import { ASSET_TYPE_OPTIONS, ASSET_CATEGORY_OPTIONS } from "@/types/marketing";

interface AssetFormModalProps {
  asset?: MarketingAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FileWithPreview {
  file: File;
  previewUrl: string;
  dimensions?: { width: number; height: number };
}

export function AssetFormModal({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: AssetFormModalProps) {
  const isEditing = !!asset;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createAsset, updateAsset, uploadFile, uploadMultipleAssets, isCreating, isUpdating, isUploading: isUploadingSingle } =
    useMarketingAssetsAdapter();
  const { campanhas } = useMarketingCampanhasAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const [formData, setFormData] = useState<MarketingAssetFormData>({
    nome: "",
    descricao: "",
    tipo: "imagem",
    categoria: null,
    unidade_id: null,
    campanha_id: null,
    file_url: "",
    file_size: undefined,
    file_type: "",
    tags: [],
    dimensoes: {},
    ativo: true,
  });

  // Para upload único
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Para upload em lote
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; current: string }>({
    completed: 0,
    total: 0,
    current: "",
  });
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (asset) {
      setFormData({
        nome: asset.nome,
        descricao: asset.descricao || "",
        tipo: asset.tipo,
        categoria: asset.categoria || "",
        unidade_id: asset.unidade_id || null,
        campanha_id: asset.campanha_id || null,
        file_url: asset.file_url,
        file_size: asset.file_size,
        file_type: asset.file_type,
        tags: asset.tags || [],
        dimensoes: asset.dimensoes || {},
        ativo: asset.ativo,
      });
      setPreviewUrl(asset.file_url);
      setIsBatchMode(false);
    } else {
      setFormData({
        nome: "",
        descricao: "",
        tipo: "imagem",
        categoria: null,
        unidade_id: null,
        campanha_id: null,
        file_url: "",
        file_size: undefined,
        file_type: "",
        tags: [],
        dimensoes: {},
        ativo: true,
      });
      setPreviewUrl("");
      setSelectedFile(null);
      setSelectedFiles([]);
    }
  }, [asset, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1 && !isBatchMode) {
      // Modo upload único
      const file = files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormData({
        ...formData,
        nome: formData.nome || file.name.split(".")[0],
        file_type: file.type,
        file_size: file.size,
      });

      // Get image dimensions
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          setFormData((prev) => ({
            ...prev,
            dimensoes: { width: img.width, height: img.height },
          }));
        };
        img.src = URL.createObjectURL(file);
      }
    } else {
      // Modo upload em lote
      setIsBatchMode(true);
      const newFiles: FileWithPreview[] = Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      // Obter dimensões para imagens
      newFiles.forEach((fileData) => {
        if (fileData.file.type.startsWith("image/")) {
          const img = new Image();
          img.onload = () => {
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.file === fileData.file
                  ? { ...f, dimensions: { width: img.width, height: img.height } }
                  : f
              )
            );
          };
          img.src = fileData.previewUrl;
        }
      });

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isBatchMode && selectedFiles.length > 0) {
        // Upload em lote
        setIsUploadingBatch(true);
        setUploadProgress({ completed: 0, total: selectedFiles.length, current: "" });

        const results = await uploadMultipleAssets(
          selectedFiles.map((f) => f.file),
          {
            tipo: formData.tipo,
            categoria: formData.categoria,
            unidade_id: formData.unidade_id,
            campanha_id: formData.campanha_id,
            tags: formData.tags,
            ativo: formData.ativo,
          },
          (completed, total, fileName) => {
            setUploadProgress({ completed, total, current: fileName });
          }
        );

        setIsUploadingBatch(false);

        if (results.success > 0) {
          toast.success(`${results.success} asset(s) criado(s) com sucesso!`);
        }
        if (results.failed > 0) {
          toast.error(`${results.failed} arquivo(s) falharam: ${results.errors.join(", ")}`);
        }

        onSuccess();
      } else {
        // Upload único
        let fileUrl = formData.file_url;

        if (selectedFile) {
          fileUrl = await uploadFile({ file: selectedFile });
        }

        const dataToSave = {
          ...formData,
          file_url: fileUrl,
        };

        if (isEditing && asset) {
          await updateAsset(asset.id, dataToSave);
        } else {
          await createAsset(dataToSave);
        }
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao salvar asset:", error);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isLoading = isCreating || isUpdating || isUploadingSingle || isUploadingBatch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Asset" : isBatchMode ? "Upload em Lote" : "Novo Asset"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite as informacoes do asset de marketing"
              : isBatchMode
              ? `Fazendo upload de ${selectedFiles.length} arquivo(s)`
              : "Faca upload de um novo asset de marketing (selecione multiplos arquivos para upload em lote)"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload Area */}
          <div className="space-y-2">
            <Label>Arquivo(s)</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isBatchMode && selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Files className="h-8 w-8" />
                    <span className="font-medium">{selectedFiles.length} arquivo(s) selecionado(s)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {selectedFiles.slice(0, 8).map((fileData, index) => (
                      <div key={fileData.file.name || `file-${index}`} className="relative group">
                        <img
                          src={fileData.previewUrl}
                          alt={fileData.file.name}
                          className="w-full h-16 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {fileData.file.name}
                        </p>
                      </div>
                    ))}
                    {selectedFiles.length > 8 && (
                      <div className="w-full h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                        +{selectedFiles.length - 8} mais
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles([]);
                      setIsBatchMode(false);
                    }}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              ) : previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl("");
                      setFormData({ ...formData, file_url: "" });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <p>Clique para fazer upload ou arraste arquivo(s)</p>
                  <p className="text-sm">PNG, JPG, GIF, MP4 (max 10MB)</p>
                  <p className="text-xs text-primary">Selecione multiplos arquivos para upload em lote</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Progress bar for batch upload */}
          {isUploadingBatch && uploadProgress.total > 0 && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Fazendo upload...</span>
                <span>{uploadProgress.completed} / {uploadProgress.total}</span>
              </div>
              <Progress value={(uploadProgress.completed / uploadProgress.total) * 100} />
              <p className="text-xs text-muted-foreground">
                Processando: {uploadProgress.current}
              </p>
            </div>
          )}

          {/* Form fields for single upload or batch settings */}
          {!isBatchMode && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Banner Black Friday"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: AssetTipo) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Batch mode simplified settings */}
          {isBatchMode && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Configurações para todos os arquivos:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: AssetTipo) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoria || "sem_categoria"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        categoria: value === "sem_categoria" ? null : (value as AssetCategoria),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_categoria">Sem categoria</SelectItem>
                      {ASSET_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria || "sem_categoria"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    categoria: value === "sem_categoria" ? null : (value as AssetCategoria),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_categoria">Sem categoria</SelectItem>
                  {ASSET_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campanha_id">Campanha</Label>
              <Select
                value={formData.campanha_id || "nenhuma"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    campanha_id: value === "nenhuma" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma campanha</SelectItem>
                  {campanhas.map((campanha) => (
                    <SelectItem key={campanha.id} value={campanha.id}>
                      {campanha.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade_id">Unidade</Label>
            <Select
              value={formData.unidade_id || "geral"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  unidade_id: value === "geral" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Geral (todas as unidades)</SelectItem>
                {franqueados.map((franqueado) => (
                  <SelectItem key={franqueado.id} value={franqueado.id}>
                    {franqueado.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isBatchMode && (
            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descricao do asset..."
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Adicionar tag..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
            <Label htmlFor="ativo">Asset ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!isEditing && !selectedFile && !formData.file_url && selectedFiles.length === 0)}
            >
              {isLoading
                ? "Salvando..."
                : isBatchMode
                ? `Upload ${selectedFiles.length} Arquivo(s)`
                : isEditing
                ? "Salvar Alteracoes"
                : "Upload Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
