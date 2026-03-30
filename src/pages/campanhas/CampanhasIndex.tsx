import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCampanhasAdapter } from "@/hooks/useCampanhasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { CAMPANHA_TIPOS, CAMPANHA_STATUS, CampanhaStatus } from "@/types/campanha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Megaphone,
  Target,
  Users,
  DollarSign,
  CheckCircle2,
  PauseCircle,
  XCircle,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusBadge = (status: CampanhaStatus) => {
  switch (status) {
    case "ativa":
      return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</Badge>;
    case "pausada":
      return <Badge className="bg-amber-600"><PauseCircle className="h-3 w-3 mr-1" />Pausada</Badge>;
    case "finalizada":
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Finalizada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getTipoIcon = (tipo: string) => {
  const tipoInfo = CAMPANHA_TIPOS.find((t) => t.value === tipo);
  return tipoInfo?.icon || "Megaphone";
};

const CampanhasIndex = () => {
  const navigate = useNavigate();
  const { franqueados } = useFranqueadosAdapter();
  const { isAdmin, profile } = useUserProfileAdapter();
  const [franqueadoFilter, setFranqueadoFilter] = useState<string>("all");

  const franqueadoId = isAdmin
    ? (franqueadoFilter === "all" ? undefined : franqueadoFilter)
    : profile?.franqueado_id || undefined;

  // Hook de campanhas (usando adapter MT)
  const {
    campanhas,
    isLoading,
    stats,
    deleteCampanha,
    isDeleting
  } = useCampanhasAdapter({ franqueadoId });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredCampanhas = campanhas.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesTipo = tipoFilter === "all" || c.tipo === tipoFilter;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteCampanha(deleteId);
      setDeleteId(null);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.ativas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Leads Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.leads_total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-lg sm:text-xl font-bold">{formatCurrency(stats.orcamento_total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Campanhas de Marketing</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas campanhas e acompanhe o ROI
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/campanhas/novo">
              <Plus className="h-4 w-4 mr-1" />
              Nova Campanha
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {CAMPANHA_TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CAMPANHA_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={franqueadoFilter} onValueChange={setFranqueadoFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Franquia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as franquias</SelectItem>
                  {franqueados.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                    <TableHead>Campanha</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Orçamento</TableHead>
                    <TableHead className="hidden sm:table-cell">Leads</TableHead>
                    <TableHead className="hidden lg:table-cell">CPL</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampanhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        Nenhuma campanha encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampanhas.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/campanhas/${c.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.nome}</p>
                            {c.franqueado_nome && (
                              <p className="text-xs text-muted-foreground">{c.franqueado_nome}</p>
                            )}
                            <div className="flex gap-2 mt-1 md:hidden">
                              <Badge variant="outline" className="text-xs">
                                {CAMPANHA_TIPOS.find((t) => t.value === c.tipo)?.label}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {CAMPANHA_TIPOS.find((t) => t.value === c.tipo)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(c.status)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatCurrency(c.orcamento_mensal)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{c.leads_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(c.cpl)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              asChild
                              title="Ver detalhes"
                            >
                              <Link to={`/campanhas/${c.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              asChild
                              title="Editar"
                            >
                              <Link to={`/campanhas/${c.id}/editar`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setDeleteId(c.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
            Mostrando {filteredCampanhas.length} de {campanhas.length} campanhas
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampanhasIndex;
