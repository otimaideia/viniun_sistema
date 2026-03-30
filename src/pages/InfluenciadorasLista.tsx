import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Ban,
  Copy,
  RefreshCw,
  Download,
  Send,
  ClipboardCheck,
  ClipboardX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
import {
  Influenciadora,
  InfluenciadoraStatus,
  InfluenciadoraFilters,
  getStatusLabel,
  getStatusColor,
  getTipoLabel,
  getTamanhoLabel,
} from "@/types/influenciadora";

const InfluenciadorasLista = () => {
  const navigate = useNavigate();
  const { franqueados } = useFranqueadosAdapter();

  // Filtros
  const [filters, setFilters] = useState<InfluenciadoraFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Hook de dados (usando adapter MT)
  const {
    influenciadoras,
    isLoading,
    isFetching,
    refetch,
    updateStatus,
    toggleAtivo,
    deleteInfluenciadora,
  } = useInfluenciadorasAdapter(filters);

  // Filtrar por busca
  const filteredInfluenciadoras = useMemo(() => {
    if (!searchTerm) return influenciadoras;
    const search = searchTerm.toLowerCase();
    return influenciadoras.filter(
      (inf) =>
        inf.nome_completo?.toLowerCase().includes(search) ||
        inf.nome_artistico?.toLowerCase().includes(search) ||
        inf.email?.toLowerCase().includes(search) ||
        inf.whatsapp?.includes(search) ||
        inf.codigo_indicacao?.toLowerCase().includes(search)
    );
  }, [influenciadoras, searchTerm]);

  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);

  const handleStatusChange = (id: string, status: InfluenciadoraStatus) => {
    updateStatus({ id, status });
  };

  const handleAprovar = async (inf: Influenciadora) => {
    setIsApproving(inf.id);
    try {
      const { error: updateError } = await supabase
        .from("mt_influencers")
        .update({ status: "aprovado", is_active: true, updated_at: new Date().toISOString() })
        .eq("id", inf.id);
      if (updateError) throw updateError;
      refetch();
      const tenantId = inf.tenant_id;
      if (tenantId) {
        const portalUrl = `${window.location.origin}/influenciadores/login`;
        const { error } = await supabase.functions.invoke("send-welcome", {
          body: { influenciadoraId: inf.id, tenantId, portalUrl },
        });
        if (error) {
          toast.warning("Aprovada! Mas houve um erro ao enviar a mensagem de boas-vindas.");
        } else {
          toast.success(`${inf.nome_completo || inf.nome_artistico} aprovada! Boas-vindas enviadas por WhatsApp/email.`);
        }
      } else {
        toast.success(`${inf.nome_completo || inf.nome_artistico} aprovada!`);
      }
    } catch {
      toast.error("Erro ao aprovar influenciadora.");
    } finally {
      setIsApproving(null);
    }
  };

  const handleReenviarBoasVindas = async (inf: Influenciadora) => {
    setIsResending(inf.id);
    try {
      const tenantId = inf.tenant_id;
      if (!tenantId) { toast.error("Tenant não identificado."); return; }
      const portalUrl = `${window.location.origin}/influenciadores/login`;
      const { error } = await supabase.functions.invoke("send-welcome", {
        body: { influenciadoraId: inf.id, tenantId, portalUrl },
      });
      if (error) {
        toast.error("Erro ao reenviar mensagem de boas-vindas.");
      } else {
        toast.success(`Boas-vindas reenviadas para ${inf.nome_completo || inf.nome_artistico}!`);
      }
    } catch {
      toast.error("Erro ao reenviar mensagem.");
    } finally {
      setIsResending(null);
    }
  };

  const handleToggleAtivo = (id: string, ativo: boolean) => {
    toggleAtivo({ id, ativo });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteInfluenciadora(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado!");
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Nome",
      "Nome Artístico",
      "WhatsApp",
      "Email",
      "Código",
      "Indicações",
      "Status",
      "Tipo",
      "Seguidores",
      "Engajamento",
    ];
    const rows = filteredInfluenciadoras.map((inf) => [
      inf.nome_completo,
      inf.nome_artistico || "",
      inf.whatsapp,
      inf.email || "",
      inf.codigo_indicacao || "",
      inf.quantidade_indicacoes,
      getStatusLabel(inf.status),
      getTipoLabel(inf.tipo),
      inf.total_seguidores,
      `${inf.taxa_engajamento_media}%`,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `influenciadoras_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lista de Influenciadoras</h1>
            <p className="text-sm text-muted-foreground">
              Total: {filteredInfluenciadoras.length} influenciadoras
            </p>
          </div>
          <Button asChild>
            <Link to="/influenciadoras/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Influenciadora
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar influenciadoras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={filters.status || "all"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  status: v === "all" ? undefined : (v as InfluenciadoraStatus),
                })
              }
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.franqueado_id || "all"}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  franqueado_id: v === "all" ? undefined : v,
                })
              }
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Franquia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {franqueados.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome_fantasia || f.nome_franquia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleDownloadCSV}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influenciadora</TableHead>
                  <TableHead className="hidden md:table-cell">Código</TableHead>
                  <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                  <TableHead className="text-center">Indicações</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Onboarding</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInfluenciadoras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma influenciadora encontrada
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInfluenciadoras.map((inf) => (
                    <TableRow
                      key={inf.id}
                      className={!inf.ativo ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={inf.foto_perfil} />
                            <AvatarFallback>
                              {safeGetInitials(inf.nome_completo)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {inf.nome_artistico || inf.nome_completo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inf.whatsapp}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <code className="px-2 py-0.5 bg-muted rounded text-xs">
                            {inf.codigo_indicacao}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              handleCopyCode(inf.codigo_indicacao || "")
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {getTipoLabel(inf.tipo)}
                        </span>
                        {inf.tamanho && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({getTamanhoLabel(inf.tamanho)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {inf.quantidade_indicacoes}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {inf.responsavel ? (
                          <div>
                            <p className="text-sm font-medium">{inf.responsavel.nome}</p>
                            {inf.responsavel.cargo && (
                              <p className="text-xs text-muted-foreground">{inf.responsavel.cargo}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={getStatusColor(inf.status)}>
                          {getStatusLabel(inf.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {inf.onboarding_completed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <ClipboardCheck className="h-3 w-3" />
                            Concluído
                          </Badge>
                        ) : inf.aceite_termos ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                            <ClipboardCheck className="h-3 w-3" />
                            Termos aceitos
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1">
                            <ClipboardX className="h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inf.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-600 hover:text-green-700 border-green-300"
                              onClick={() => handleAprovar(inf)}
                              disabled={isApproving === inf.id}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {isApproving === inf.id ? "..." : "Aprovar"}
                            </Button>
                          )}
                          {inf.status === "aprovado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-blue-600 hover:text-blue-700 border-blue-300"
                              onClick={() => handleReenviarBoasVindas(inf)}
                              disabled={isResending === inf.id}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {isResending === inf.id ? "..." : "Reenviar"}
                            </Button>
                          )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/influenciadoras/${inf.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/influenciadoras/${inf.id}/editar`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {inf.status === "pendente" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleAprovar(inf)}
                                  className="text-green-600"
                                  disabled={isApproving === inf.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {isApproving === inf.id ? "Aprovando..." : "Aprovar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(inf.id, "rejeitado")
                                  }
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeitar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {inf.status === "aprovado" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleReenviarBoasVindas(inf)}
                                  className="text-blue-600"
                                  disabled={isResending === inf.id}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {isResending === inf.id ? "Enviando..." : "Reenviar Boas-vindas"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(inf.id, "suspenso")
                                  }
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleAtivo(inf.id, !inf.ativo)
                              }
                            >
                              {inf.ativo ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setDeletingId(inf.id);
                                setDeleteDialogOpen(true);
                              }}
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
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta influenciadora? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default InfluenciadorasLista;
