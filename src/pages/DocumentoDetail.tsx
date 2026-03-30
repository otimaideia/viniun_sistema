import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocumentoMT, useDocumentosMT } from "@/hooks/multitenant/useDocumentosMT";
import { formatFileSize, getFileTypeLabel } from "@/types/documento";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Download, Edit2, Trash2, FileText, File, Image,
  FileSpreadsheet, FileVideo, Calendar, User, Tag, FolderOpen, ExternalLink
} from "lucide-react";

function getFileIcon(mimeType: string, size: string = "h-8 w-8") {
  if (mimeType.startsWith('image/')) return <Image className={`${size} text-green-500`} />;
  if (mimeType.includes('pdf')) return <FileText className={`${size} text-red-500`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className={`${size} text-emerald-600`} />;
  if (mimeType.includes('video')) return <FileVideo className={`${size} text-purple-500`} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className={`${size} text-blue-500`} />;
  return <File className={`${size} text-muted-foreground`} />;
}

export default function DocumentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useDocumentoMT(id);
  const { remove } = useDocumentosMT();

  const handleDelete = () => {
    if (!id) return;
    remove.mutate(id, {
      onSuccess: () => navigate("/documentos"),
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!doc) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Documento não encontrado</h2>
          <Button asChild className="mt-4">
            <Link to="/documentos">Voltar para Documentos</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isImage = doc.arquivo_tipo.startsWith('image/');
  const isPdf = doc.arquivo_tipo.includes('pdf');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/documentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{doc.titulo}</h1>
              <p className="text-muted-foreground text-sm">
                Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" download={doc.arquivo_nome}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/documentos/${doc.id}/editar`}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O documento "{doc.titulo}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview / Info do Arquivo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview para imagens */}
            {isImage && (
              <Card>
                <CardContent className="p-4">
                  <img
                    src={doc.arquivo_url}
                    alt={doc.titulo}
                    className="max-w-full max-h-[500px] rounded-lg mx-auto object-contain"
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview para PDF */}
            {isPdf && (
              <Card>
                <CardContent className="p-4">
                  <iframe
                    src={doc.arquivo_url}
                    title={doc.titulo}
                    className="w-full h-[600px] rounded-lg border"
                  />
                </CardContent>
              </Card>
            )}

            {/* Card genérico para outros tipos */}
            {!isImage && !isPdf && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  {getFileIcon(doc.arquivo_tipo, "h-16 w-16")}
                  <h3 className="text-lg font-medium mt-4">{doc.arquivo_nome}</h3>
                  <p className="text-muted-foreground mt-1">
                    {getFileTypeLabel(doc.arquivo_tipo)} - {formatFileSize(doc.arquivo_tamanho)}
                  </p>
                  <Button asChild className="mt-4">
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Arquivo
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Descrição */}
            {doc.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{doc.descricao}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Metadados */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.arquivo_tipo)}
                  <div>
                    <p className="text-sm font-medium">{doc.arquivo_nome}</p>
                    <p className="text-xs text-muted-foreground">{getFileTypeLabel(doc.arquivo_tipo)}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamanho</span>
                    <span className="font-medium">{formatFileSize(doc.arquivo_tamanho)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data de Upload</span>
                    <span className="font-medium">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {doc.updated_at !== doc.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última Atualização</span>
                      <span className="font-medium">
                        {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {doc.created_by_nome && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enviado por</span>
                      <span className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {doc.created_by_nome}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categoria */}
            {doc.category && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant="outline"
                    className="text-sm"
                    style={doc.category.cor ? { borderColor: doc.category.cor, color: doc.category.cor } : {}}
                  >
                    {doc.category.nome}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
