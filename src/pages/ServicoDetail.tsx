import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useServicoAdapter, useServicosAdapter } from '@/hooks/useServicosAdapter';
import { useServicoImagensAdapter } from '@/hooks/useServicoImagensAdapter';
import { useServiceCategoriesMT } from '@/hooks/multitenant/useServiceCategoriesMT';
import { toast } from 'sonner';
import { InfluenciadoraSelect } from '@/components/shared/InfluenciadoraSelect';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  CalendarDays,
  Images,
  ChevronLeft,
  ChevronRight,
  Link2,
  Copy,
  ExternalLink,
  ShoppingBag,
  Barcode,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDuracao(minutos: number | null): string {
  if (!minutos) return '-';
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

export default function ServicoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { servico, isLoading } = useServicoAdapter(id);
  const { deleteServico } = useServicosAdapter();
  const { getImagensByServico, isLoadingAll: isLoadingImagens } = useServicoImagensAdapter();
  const { getCategoryLabel } = useServiceCategoriesMT();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [influenciadoraCodigo, setInfluenciadoraCodigo] = useState('');

  const handleDelete = async () => {
    if (!servico) return;
    setIsDeleting(true);
    try {
      deleteServico(servico.id);
      toast.success('Servico excluido com sucesso!');
      navigate('/servicos');
    } catch (error) {
      toast.error('Erro ao excluir servico');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const images = servico ? getImagensByServico(servico.id) : [];
  const allImages = images.length > 0
    ? images.map(img => img.url)
    : servico?.imagem_url
      ? [servico.imagem_url]
      : [];

  if (isLoading || isLoadingImagens) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!servico) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/servicos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Servico nao encontrado</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">O servico solicitado nao foi encontrado.</p>
            <Button className="mt-4" onClick={() => navigate('/servicos')}>
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/servicos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{servico.nome}</h1>
              <p className="text-sm text-muted-foreground">Detalhes do servico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/servicos/${servico.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Galeria de Imagens */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              {allImages.length > 0 ? (
                <div className="space-y-4">
                  {/* Imagem principal */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={allImages[currentImageIndex]}
                      alt={`${servico.nome} - imagem ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Erro';
                      }}
                    />

                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={cn(
                                'h-2 rounded-full transition-all',
                                index === currentImageIndex
                                  ? 'w-6 bg-white'
                                  : 'w-2 bg-white/50 hover:bg-white/75'
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={cn(
                            'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                            index === currentImageIndex ? 'border-primary' : 'border-transparent'
                          )}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Images className="h-4 w-4" />
                    {allImages.length} {allImages.length === 1 ? 'imagem' : 'imagens'}
                  </p>
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex flex-col items-center justify-center">
                  <Sparkles className="h-16 w-16 text-purple-300 dark:text-purple-600" />
                  <span className="text-sm text-muted-foreground mt-2">Sem imagem</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informacoes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Informacoes do Servico
                <Badge variant={servico.ativo ? 'default' : 'secondary'} className="ml-2">
                  {servico.ativo ? (
                    <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Ativo</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 mr-1" /> Inativo</>
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categoria
                  </label>
                  <p className="text-lg font-medium mt-1">
                    {servico.categoria ? (
                      <Badge variant="outline" className="text-sm">
                        {getCategoryLabel(servico.categoria)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Sem categoria</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duracao
                  </label>
                  <p className="text-lg font-medium mt-1">
                    {formatDuracao(servico.duracao_minutos)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Descricao</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {servico.descricao || 'Sem descricao'}
                </p>
              </div>

              {/* Dados do Produto (se tipo = produto) */}
              {servico.tipo === 'produto' && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                  {servico.sku && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Barcode className="h-4 w-4" /> SKU
                      </label>
                      <p className="mt-1 font-mono text-sm">{servico.sku}</p>
                    </div>
                  )}
                  {servico.marca && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" /> Marca
                      </label>
                      <p className="mt-1">{servico.marca}</p>
                    </div>
                  )}
                  {servico.gtin && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">GTIN/EAN</label>
                      <p className="mt-1 font-mono text-sm">{servico.gtin}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Link de Compra (produtos) */}
              {servico.url && (
                <div className="pt-2 border-t space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-green-600" /> Link de Compra
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={servico.url}
                      readOnly
                      className="text-xs bg-muted/50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(servico.url!);
                        toast.success('Link copiado!');
                      }}
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => window.open(servico.url!, '_blank')}
                      title="Abrir link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Gerar link com tracking de influenciadora */}
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" />
                      Link para Influenciadora
                    </Label>
                    <div className="flex gap-2">
                      <InfluenciadoraSelect
                        value={influenciadoraCodigo}
                        onSelect={(codigo) => setInfluenciadoraCodigo(codigo)}
                        className="flex-1"
                      />
                      <Button
                        variant="default"
                        size="sm"
                        disabled={!influenciadoraCodigo.trim()}
                        onClick={() => {
                          const separator = servico.url!.includes('?') ? '&' : '?';
                          const trackingUrl = `${servico.url}${separator}influenciadores=${influenciadoraCodigo.trim()}`;
                          navigator.clipboard.writeText(trackingUrl);
                          toast.success('Link com tracking copiado!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    {influenciadoraCodigo.trim() && (
                      <p className="text-[10px] text-muted-foreground font-mono break-all">
                        {servico.url}{servico.url!.includes('?') ? '&' : '?'}influenciadores={influenciadoraCodigo.trim()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {servico.created_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Criado em
                  </label>
                  <p className="text-foreground mt-1">
                    {new Date(servico.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Servico</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o servico "{servico.nome}"?
              Esta acao nao pode ser desfeita e tambem removera todos os vinculos com franquias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
