import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useDocumentosMT, useDocumentCategoriesMT } from "@/hooks/multitenant/useDocumentosMT";
import { formatFileSize, getFileTypeLabel } from "@/types/documento";
import type { MTDocumentFilters, MTDocumentCategory } from "@/types/documento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText, Plus, Search, Download, Trash2, Eye, Edit2,
  FolderOpen, File, Image, FileSpreadsheet, FileVideo,
  Tag, Calendar, User, Filter, FolderPlus, X
} from "lucide-react";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (mimeType.includes('video')) return <FileVideo className="h-5 w-5 text-purple-500" />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export default function Documentos() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Category management dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCor, setNewCatCor] = useState("#6366f1");

  const filters: MTDocumentFilters = useMemo(() => ({
    search: search || undefined,
    category_id: selectedCategory || undefined,
  }), [search, selectedCategory]);

  const { data: documentos, isLoading, remove } = useDocumentosMT(filters);
  const { data: categories, create: createCategory, remove: removeCategory } = useDocumentCategoriesMT();

  const handleDelete = (id: string) => {
    remove.mutate(id, { onSuccess: () => setDeleteId(null) });
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    createCategory.mutate({ nome: newCatName.trim(), cor: newCatCor }, {
      onSuccess: () => {
        setNewCatName("");
        setNewCatCor("#6366f1");
      },
    });
  };

  // Contagem por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documentos.length };
    documentos.forEach(doc => {
      const catId = doc.category_id || 'sem-categoria';
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [documentos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Documentos
            {tenant && <span className="text-muted-foreground text-lg font-normal ml-2">({tenant.nome_fantasia})</span>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de documentos gerais da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-1" />
            Categorias
          </Button>
          <Button asChild>
            <Link to="/documentos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição ou nome do arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias ({categoryCounts.all || 0})</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  {cat.cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.cor }} />}
                  {cat.nome} ({categoryCounts[cat.id] || 0})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || selectedCategory) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSelectedCategory(""); }}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Lista de Documentos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum documento encontrado</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              {search || selectedCategory
                ? "Tente ajustar os filtros de busca."
                : "Comece enviando seu primeiro documento."}
            </p>
            {!search && !selectedCategory && (
              <Button asChild className="mt-4">
                <Link to="/documentos/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Enviar Documento
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Ícone do tipo */}
                  <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                    {getFileIcon(doc.arquivo_tipo)}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/documentos/${doc.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {doc.titulo}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <File className="h-3 w-3" />
                        {doc.arquivo_nome}
                      </span>
                      <span>{formatFileSize(doc.arquivo_tamanho)}</span>
                      <span>{getFileTypeLabel(doc.arquivo_tipo)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {doc.created_by_nome && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.created_by_nome}
                        </span>
                      )}
                    </div>
                    {doc.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{doc.descricao}</p>
                    )}
                  </div>

                  {/* Categoria badge */}
                  <div className="hidden sm:flex flex-col items-end gap-2">
                    {doc.category && (
                      <Badge variant="outline" className="whitespace-nowrap" style={doc.category.cor ? { borderColor: doc.category.cor, color: doc.category.cor } : {}}>
                        {doc.category.nome}
                      </Badge>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                        {doc.tags.length > 2 && <Badge variant="secondary" className="text-xs">+{doc.tags.length - 2}</Badge>}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild title="Visualizar">
                      <Link to={`/documentos/${doc.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Download">
                      <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" download={doc.arquivo_nome}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Editar">
                      <Link to={`/documentos/${doc.id}/editar`}>
                        <Edit2 className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog open={deleteId === doc.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteId(doc.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O documento "{doc.titulo}" será removido. Esta ação pode ser desfeita pelo administrador.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de gestão de categorias */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Categorias de Documentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Criar nova categoria */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Nova categoria</Label>
                <Input
                  placeholder="Nome da categoria"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
              </div>
              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={newCatCor}
                  onChange={(e) => setNewCatCor(e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
              </div>
              <Button size="sm" onClick={handleCreateCategory} disabled={!newCatName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de categorias existentes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {cat.cor && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />}
                      <span className="text-sm font-medium">{cat.nome}</span>
                      <span className="text-xs text-muted-foreground">({categoryCounts[cat.id] || 0} docs)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeCategory.mutate(cat.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
