import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePromocoesMT } from "@/hooks/multitenant/usePromocoesMT";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Tag,
  TrendingUp,
  Users,
  ShoppingBag,
  Target,
  Calendar,
  ExternalLink,
  Clock,
  Percent,
  DollarSign,
  Play,
  Pause,
  XCircle,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

type PromocaoStatus = "rascunho" | "ativa" | "pausada" | "expirada" | "cancelada";

const TIPO_LABELS: Record<string, string> = {
  desconto: "Desconto",
  pacote: "Pacote",
  lancamento: "Lançamento",
  evento: "Evento",
  sazonal: "Sazonal",
};

const PUBLICO_LABELS: Record<string, string> = {
  todos: "Todos",
  novos_clientes: "Novos Clientes",
  clientes_recorrentes: "Clientes Recorrentes",
  indicacoes: "Indicações",
  influenciadoras: "Influenciadoras",
};

const getStatusBadge = (status: PromocaoStatus) => {
  switch (status) {
    case "ativa":
      return <Badge className="bg-green-600">Ativa</Badge>;
    case "rascunho":
      return <Badge variant="secondary">Rascunho</Badge>;
    case "pausada":
      return <Badge variant="outline">Pausada</Badge>;
    case "expirada":
      return <Badge variant="destructive">Expirada</Badge>;
    case "cancelada":
      return <Badge variant="destructive">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
};

const formatDateTime = (date: string | null | undefined) => {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PromocaoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const { promocoes, isLoading, softDelete, updateStatus, duplicatePromocao } = usePromocoesMT();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const promocao = (promocoes || []).find((p) => p.id === id);

  const handleDelete = () => {
    if (id) {
      softDelete.mutate(id);
      navigate("/promocoes");
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Not found
  if (!promocao) {
    return (
      <div className="text-center py-12">
        <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Promoção não encontrada</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/promocoes">Voltar às Promoções</Link>
        </Button>
      </div>
    );
  }

  const servicos = promocao.services || [];
  const influenciadoras = promocao.subscriptions || [];
  const log_usos = promocao.uses || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/promocoes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">{promocao.titulo}</h1>
              {getStatusBadge(promocao.status)}
            </div>
            {promocao.codigo && (
              <p className="text-sm text-muted-foreground mt-1">
                Código: <code className="bg-muted px-2 py-0.5 rounded">{promocao.codigo}</code>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Status actions */}
          {(promocao.status === "rascunho" || promocao.status === "pausada") && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => updateStatus.mutate({ id: promocao.id, status: "ativa" })}
              disabled={updateStatus.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Ativar
            </Button>
          )}
          {promocao.status === "ativa" && (
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ id: promocao.id, status: "pausada" })}
              disabled={updateStatus.isPending}
            >
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/promocoes/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  duplicatePromocao.mutate(promocao.id);
                  setTimeout(() => navigate("/promocoes"), 500);
                }}
                disabled={duplicatePromocao.isPending}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {(promocao.status === "ativa" || promocao.status === "pausada") && (
                <DropdownMenuItem
                  onClick={() => updateStatus.mutate({ id: promocao.id, status: "cancelada" })}
                >
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  Cancelar Promoção
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">
                {promocao.usos_count ?? 0}
                {promocao.max_usos ? `/${promocao.max_usos}` : ""}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Leads Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold">
                {(promocao.subscriptions || []).reduce((sum, s) => sum + (s.total_leads || 0), 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xl sm:text-2xl font-bold">
                {(promocao.subscriptions || []).reduce((sum, s) => sum + (s.total_vendas || 0), 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Influenciadoras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
              <span className="text-xl sm:text-2xl font-bold">
                {influenciadoras.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Promoção</CardTitle>
          <CardDescription>Informações completas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo</h4>
              <Badge variant="outline">
                {TIPO_LABELS[promocao.tipo] || promocao.tipo}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Desconto</h4>
              <div className="flex items-center gap-1">
                {promocao.desconto_tipo === "percentual" ? (
                  <Percent className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {promocao.desconto_tipo === "percentual"
                    ? `${promocao.desconto_valor ?? 0}%`
                    : formatCurrency(promocao.desconto_valor)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Valor Mínimo</h4>
              <span className="text-sm">{formatCurrency(promocao.valor_minimo)}</span>
            </div>
            {promocao.max_usos && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Limite de Usos</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {promocao.usos_count ?? 0} / {promocao.max_usos}
                  </span>
                  {(promocao.usos_count ?? 0) >= promocao.max_usos && (
                    <Badge variant="destructive" className="text-[10px]">Esgotado</Badge>
                  )}
                  {(promocao.usos_count ?? 0) >= promocao.max_usos * 0.8 && (promocao.usos_count ?? 0) < promocao.max_usos && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Quase esgotando</Badge>
                  )}
                </div>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Período</h4>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(promocao.data_inicio)} - {formatDate(promocao.data_fim)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Público-Alvo</h4>
              <span className="text-sm">
                {PUBLICO_LABELS[promocao.publico_alvo] || promocao.publico_alvo || "Todos"}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Visibilidade</h4>
              <Badge variant={promocao.is_public ? "default" : "secondary"}>
                {promocao.is_public ? "Pública" : "Interna"}
              </Badge>
            </div>
          </div>

          {promocao.descricao && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h4>
                <p className="text-sm whitespace-pre-wrap">{promocao.descricao}</p>
              </div>
            </>
          )}

          {promocao.termos && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Termos e Condições
                </h4>
                <p className="text-sm whitespace-pre-wrap">{promocao.termos}</p>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Informações do Sistema
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado em:</span>
                <span>{formatDateTime(promocao.created_at)}</span>
              </div>
              {promocao.updated_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Atualizado em:</span>
                  <span>{formatDateTime(promocao.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços Inclusos */}
      <Card>
        <CardHeader>
          <CardTitle>Serviços Inclusos</CardTitle>
          <CardDescription>
            {servicos.length} serviço(s) vinculado(s) a esta promoção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {servicos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum serviço vinculado
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Preço Original</TableHead>
                    <TableHead>Preço Promocional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicos.map((s: any, idx: number) => (
                    <TableRow key={s.id || idx}>
                      <TableCell className="font-medium">
                        {s.service?.nome || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(s.service?.preco)}</TableCell>
                      <TableCell>
                        {s.preco_promocional != null
                          ? formatCurrency(s.preco_promocional)
                          : s.desconto_valor != null
                            ? `${s.desconto_tipo === 'percentual' ? `${s.desconto_valor}%` : formatCurrency(s.desconto_valor)}`
                            : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Influenciadoras Aderidas */}
      <Card>
        <CardHeader>
          <CardTitle>Influenciadoras Aderidas</CardTitle>
          <CardDescription>
            Influenciadoras que estão divulgando esta promoção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {influenciadoras.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma influenciadora aderiu a esta promoção
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Link</TableHead>
                    <TableHead className="hidden md:table-cell">Leads</TableHead>
                    <TableHead className="hidden md:table-cell">Vendas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {influenciadoras.map((sub: any, idx: number) => (
                    <TableRow key={sub.id || idx}>
                      <TableCell className="font-medium">
                        {sub.influencer?.nome || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sub.status === "aderido" ? "default" : "secondary"}
                          className={sub.status === "aderido" ? "bg-green-600" : ""}
                        >
                          {sub.status || "pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {sub.link_gerado ? (
                          <a
                            href={sub.link_gerado}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                          >
                            Ver link
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {sub.total_leads ?? 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {sub.total_vendas ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log de Uso */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Uso</CardTitle>
          <CardDescription>Histórico recente de utilização</CardDescription>
        </CardHeader>
        <CardContent>
          {log_usos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum uso registrado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {log_usos.slice(0, 20).map((log: any, idx: number) => (
                <div
                  key={log.id || idx}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {log.lead?.nome || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.source || "Uso da promoção"}
                        {log.desconto_aplicado != null && ` • Desconto: ${formatCurrency(log.desconto_aplicado)}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a promoção "{promocao.titulo}"? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={softDelete.isPending}
            >
              {softDelete.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromocaoDetail;
