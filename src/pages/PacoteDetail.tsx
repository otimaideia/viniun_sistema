import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePackageMT, usePackagesMT } from '@/hooks/multitenant/usePackagesMT';
import { Label } from '@/components/ui/label';
import { InfluenciadoraSelect } from '@/components/shared/InfluenciadoraSelect';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Calendar,
  Tag,
  Percent,
  ShoppingBag,
  Sparkles,
  CheckCircle,
  XCircle,
  Star,
  Megaphone,
  TrendingUp,
  Link2,
  Copy,
  ExternalLink,
  Share2,
} from 'lucide-react';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function PacoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pacote, isLoading } = usePackageMT(id);
  const { deletePacote } = usePackagesMT();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [influenciadoraCodigo, setInfluenciadoraCodigo] = useState('');

  const handleDelete = async () => {
    if (!pacote) return;
    setIsDeleting(true);
    try {
      await deletePacote.mutateAsync(pacote.id);
      toast.success('Pacote excluido com sucesso!');
      navigate('/servicos');
    } catch (error) {
      toast.error('Erro ao excluir pacote');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const descontoPercent = pacote?.desconto_percentual
    ? Number(pacote.desconto_percentual)
    : pacote?.preco_original && pacote?.preco_pacote && Number(pacote.preco_original) > 0
      ? Math.round((1 - Number(pacote.preco_pacote) / Number(pacote.preco_original)) * 100)
      : 0;

  const isVigente = pacote
    ? (!pacote.data_inicio || new Date(pacote.data_inicio) <= new Date()) &&
      (!pacote.data_fim || new Date(pacote.data_fim) >= new Date())
    : false;

  if (isLoading) {
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

  if (!pacote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/servicos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Pacote nao encontrado</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">O pacote solicitado nao foi encontrado.</p>
            <Button className="mt-4" onClick={() => navigate('/servicos')}>
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/servicos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-purple-500" />
              <h1 className="text-2xl font-bold">{pacote.nome}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {pacote.codigo ? `#${pacote.codigo} - ` : ''}Detalhes do pacote
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/servicos/pacotes/${pacote.id}/editar`}>
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

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={pacote.is_active ? 'default' : 'secondary'}>
          {pacote.is_active ? (
            <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Ativo</>
          ) : (
            <><XCircle className="h-3.5 w-3.5 mr-1" /> Inativo</>
          )}
        </Badge>
        {pacote.is_promocional && (
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
            <Megaphone className="h-3.5 w-3.5 mr-1" /> Promocional
          </Badge>
        )}
        {pacote.destaque && (
          <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
            <Star className="h-3.5 w-3.5 mr-1" /> Destaque
          </Badge>
        )}
        {isVigente ? (
          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Vigente
          </Badge>
        ) : (pacote.data_inicio || pacote.data_fim) ? (
          <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Fora da vigencia
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna 1: Imagem + Pricing */}
        <div className="space-y-6">
          {/* Imagem */}
          <Card>
            <CardContent className="p-6">
              {pacote.imagem_url ? (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={pacote.imagem_url}
                    alt={pacote.nome}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Pacote';
                    }}
                  />
                  {descontoPercent > 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      -{descontoPercent}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex flex-col items-center justify-center relative">
                  <Package className="h-16 w-16 text-purple-300 dark:text-purple-600" />
                  <span className="text-sm text-muted-foreground mt-2">Sem imagem</span>
                  {descontoPercent > 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      -{descontoPercent}%
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Card */}
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Precificacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Number(pacote.preco_original) > 0 && Number(pacote.preco_original) !== Number(pacote.preco_pacote) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Soma dos itens:</span>
                  <span className="text-sm line-through text-muted-foreground">
                    {formatCurrency(Number(pacote.preco_original))}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Preco do pacote:</span>
                <span className="text-xl font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(Number(pacote.preco_pacote))}
                </span>
              </div>
              {descontoPercent > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" /> Desconto:
                    </span>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      {descontoPercent}% OFF
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Economia:</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(Number(pacote.preco_original) - Number(pacote.preco_pacote))}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Link de Compra */}
          {pacote.url && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-green-600" />
                  Link de Compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={pacote.url}
                    readOnly
                    className="text-xs bg-white dark:bg-background"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(pacote.url!);
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
                    onClick={() => window.open(pacote.url!, '_blank')}
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
                        const separator = pacote.url!.includes('?') ? '&' : '?';
                        const trackingUrl = `${pacote.url}${separator}influenciadores=${influenciadoraCodigo.trim()}`;
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
                      {pacote.url}{pacote.url!.includes('?') ? '&' : '?'}influenciadores={influenciadoraCodigo.trim()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna 2-3: Info + Itens */}
        <div className="md:col-span-2 space-y-6">
          {/* Informacoes */}
          <Card>
            <CardHeader>
              <CardTitle>Informacoes do Pacote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pacote.descricao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descricao</label>
                  <p className="text-foreground mt-1 whitespace-pre-wrap">{pacote.descricao}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {pacote.categoria && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Categoria
                    </label>
                    <p className="mt-1">
                      <Badge variant="outline">{pacote.categoria}</Badge>
                    </p>
                  </div>
                )}

                {(pacote.data_inicio || pacote.data_fim) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Vigencia
                    </label>
                    <p className="text-sm mt-1">
                      {pacote.data_inicio ? formatDate(pacote.data_inicio) : 'Sem inicio'}
                      {' ate '}
                      {pacote.data_fim ? formatDate(pacote.data_fim) : 'Sem fim'}
                    </p>
                  </div>
                )}

                {pacote.campanha && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Megaphone className="h-4 w-4" /> Campanha vinculada
                    </label>
                    <p className="text-sm mt-1">
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                        {(pacote.campanha as any)?.nome || 'Campanha'}
                      </Badge>
                    </p>
                  </div>
                )}

                {pacote.max_vendas && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> Vendas
                    </label>
                    <p className="text-sm mt-1">
                      {pacote.vendas_realizadas || 0} / {pacote.max_vendas}
                    </p>
                  </div>
                )}
              </div>

              {pacote.tags && pacote.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {pacote.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span>Criado em: </span>
                  <span className="text-foreground">{formatDate(pacote.created_at)}</span>
                </div>
                <div>
                  <span>Atualizado em: </span>
                  <span className="text-foreground">{formatDate(pacote.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itens do Pacote */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Itens do Pacote
                </span>
                <Badge variant="secondary">{pacote.items?.length || 0} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pacote.items && pacote.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preco Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacote.items.map((item) => {
                      const service = item.service;
                      const precoUnit = item.preco_unitario != null
                        ? Number(item.preco_unitario)
                        : service?.preco != null
                          ? Number(service.preco)
                          : 0;
                      const subtotal = precoUnit * (item.quantidade || 1);

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {service?.imagem_url ? (
                                <img
                                  src={service.imagem_url}
                                  alt={service?.nome}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                  {service?.tipo === 'produto' ? (
                                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{service?.nome || 'Item removido'}</p>
                                <div className="flex items-center gap-1.5">
                                  {service?.tipo === 'produto' ? (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                                      Produto
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-200 text-green-600">
                                      Servico
                                    </Badge>
                                  )}
                                  {service?.categoria && (
                                    <span className="text-xs text-muted-foreground">{service.categoria}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.quantidade || 1}x
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(precoUnit)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(subtotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum item no pacote</p>
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
            <AlertDialogTitle>Excluir Pacote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pacote "{pacote.nome}"?
              Esta acao removera o pacote e todos os seus itens vinculados.
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
    </div>
  );
}
