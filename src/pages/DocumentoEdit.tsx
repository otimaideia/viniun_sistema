import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useDocumentoMT, useDocumentosMT, useDocumentCategoriesMT, useDocumentUpload } from "@/hooks/multitenant/useDocumentosMT";
import { formatFileSize, getFileTypeLabel } from "@/types/documento";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Upload, File, X, Loader2, FileText, Image,
  FileSpreadsheet, FileVideo, Tag, Save
} from "lucide-react";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="h-8 w-8 text-emerald-600" />;
  if (mimeType.includes('video')) return <FileVideo className="h-8 w-8 text-purple-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

export default function DocumentoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { tenant, accessLevel } = useTenantContext();
  const { data: existingDoc, isLoading: isLoadingDoc } = useDocumentoMT(id);
  const { create, update } = useDocumentosMT();
  const { data: categories } = useDocumentCategoriesMT();
  const { uploadFile } = useDocumentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{ nome: string; tipo: string; tamanho: number; url?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Preencher formulário no modo edição
  useEffect(() => {
    if (isEditing && existingDoc) {
      setTitulo(existingDoc.titulo);
      setDescricao(existingDoc.descricao || "");
      setCategoryId(existingDoc.category_id || "");
      setTags(existingDoc.tags || []);
      setFilePreview({
        nome: existingDoc.arquivo_nome,
        tipo: existingDoc.arquivo_tipo,
        tamanho: existingDoc.arquivo_tamanho,
        url: existingDoc.arquivo_url,
      });
    }
  }, [isEditing, existingDoc]);

  const handleFileSelect = (selectedFile: File) => {
    // Limite de 50MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite: 50MB");
      return;
    }
    setFile(selectedFile);
    setFilePreview({
      nome: selectedFile.name,
      tipo: selectedFile.type || 'application/octet-stream',
      tamanho: selectedFile.size,
    });
    // Auto-preencher título se vazio
    if (!titulo) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitulo(nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleAddTag = () => {
    const tag = tagsInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagsInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error("Informe o título do documento");
      return;
    }

    if (!isEditing && !file) {
      toast.error("Selecione um arquivo para enviar");
      return;
    }

    setIsUploading(true);

    try {
      if (isEditing && id) {
        // Atualizar metadados
        await update.mutateAsync({
          id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          category_id: categoryId || null,
          tags: tags.length > 0 ? tags : null,
        });
        navigate(`/documentos/${id}`);
      } else {
        // Upload + criar registro
        if (!file) return;

        const uploadResult = await uploadFile(file);

        await create.mutateAsync({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          category_id: categoryId || null,
          arquivo_url: uploadResult.url,
          arquivo_nome: uploadResult.nome,
          arquivo_tipo: uploadResult.tipo,
          arquivo_tamanho: uploadResult.tamanho,
          tags: tags.length > 0 ? tags : null,
        });
        navigate("/documentos");
      }
    } catch (error: unknown) {
      console.error("Erro ao salvar documento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar documento");
    } finally {
      setIsUploading(false);
    }
  };

  if (isEditing && isLoadingDoc) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Documento" : "Novo Documento"}
          </h1>
        </div>

        {/* Upload de Arquivo */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              {!filePreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">
                    Clique ou arraste um arquivo aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Qualquer formato - Máximo 50MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {getFileIcon(filePreview.tipo)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{filePreview.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {getFileTypeLabel(filePreview.tipo)} - {formatFileSize(filePreview.tamanho)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFile(null); setFilePreview(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Arquivo existente (edição) */}
        {isEditing && filePreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivo Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {getFileIcon(filePreview.tipo)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{filePreview.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {getFileTypeLabel(filePreview.tipo)} - {formatFileSize(filePreview.tamanho)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações do Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Contrato de Parceria 2026"
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o conteúdo do documento..."
                rows={3}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {cat.cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />}
                        {cat.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag} disabled={!tagsInput.trim()}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isUploading || (!isEditing && !file) || !titulo.trim()}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Salvando..." : "Enviando..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Salvar Alterações" : "Enviar Documento"}
              </>
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
