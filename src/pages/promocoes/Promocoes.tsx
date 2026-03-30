import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePromocoesMT } from "@/hooks/multitenant/usePromocoesMT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tag,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  Users,
  ShoppingBag,
  Target,
  MoreHorizontal,
  Play,
  Pause,
  XCircle,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PROMOCAO_TIPOS = [
  { value: "desconto", label: "Desconto" },
  { value: "pacote", label: "Pacote" },
  { value: "lancamento", label: "Lançamento" },
  { value: "evento", label: "Evento" },
  { value: "sazonal", label: "Sazonal" },
];

const PROMOCAO_STATUS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "expirada", label: "Expirada" },
  { value: "cancelada", label: "Cancelada" },
];

type PromocaoStatus = "rascunho" | "ativa" | "pausada" | "expirada" | "cancelada";

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

const Promocoes = () => {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const {
    promocoes,
    isLoading,
    softDelete,
    updateStatus,
    duplicatePromocao,
    stats,
  } = usePromocoesMT();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredPromocoes = (promocoes || []).filter((p) => {
    const matchesSearch =
      p.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesTipo = tipoFilter === "all" || p.tipo === tipoFilter;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleDelete = () => {
    if (deleteId) {
      softDelete.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">
                {stats?.ativas ?? 0}
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
                {stats?.leads_gerados ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xl sm:text-2xl font-bold">
                {stats?.usos_total ?? 0}
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
                {stats?.influenciadoras_aderidas ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Promoções</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie promoções, descontos e campanhas promocionais
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/promocoes/novo">
              <Plus className="h-4 w-4 mr-1" />
              Nova Promoção
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar promoções..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PROMOCAO_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {PROMOCAO_TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden md:table-cell">Código</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Usos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromocoes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <Tag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        Nenhuma promoção encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPromocoes.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/promocoes/${p.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.titulo}</p>
                            <div className="flex gap-2 mt-1 md:hidden">
                              <Badge variant="outline" className="text-xs">
                                {PROMOCAO_TIPOS.find((t) => t.value === p.tipo)?.label || p.tipo}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {p.codigo || "-"}
                          </code>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {PROMOCAO_TIPOS.find((t) => t.value === p.tipo)?.label || p.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm">
                            {formatDate(p.data_inicio)} - {formatDate(p.data_fim)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>{p.usos_count ?? 0}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              asChild
                              title="Ver detalhes"
                            >
                              <Link to={`/promocoes/${p.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/promocoes/${p.id}/editar`)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => duplicatePromocao.mutate(p.id)}
                                  disabled={duplicatePromocao.isPending}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(p.status === "rascunho" || p.status === "pausada") && (
                                  <DropdownMenuItem
                                    onClick={() => updateStatus.mutate({ id: p.id, status: "ativa" })}
                                  >
                                    <Play className="h-4 w-4 mr-2 text-green-600" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
                                {p.status === "ativa" && (
                                  <DropdownMenuItem
                                    onClick={() => updateStatus.mutate({ id: p.id, status: "pausada" })}
                                  >
                                    <Pause className="h-4 w-4 mr-2 text-amber-600" />
                                    Pausar
                                  </DropdownMenuItem>
                                )}
                                {(p.status === "ativa" || p.status === "pausada") && (
                                  <DropdownMenuItem
                                    onClick={() => updateStatus.mutate({ id: p.id, status: "cancelada" })}
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Cancelar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteId(p.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Mostrando {filteredPromocoes.length} de {(promocoes || []).length} promoções
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta promoção? Esta ação não pode ser
              desfeita.
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

export default Promocoes;
