import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { getTenantUrl } from "@/hooks/multitenant/useTenantDetection";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  TableIcon,
  Users,
  TrendingUp,
  Share2,
  Instagram,
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
  Crown,
  Link as LinkIcon,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Influenciadora,
  InfluenciadoraStatus,
  InfluenciadoraFilters,
  getStatusLabel,
  getStatusColor,
  getTipoLabel,
  getTamanhoLabel,
  formatSeguidores,
  formatCurrency,
} from "@/types/influenciadora";

const Influenciadoras = () => {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { franqueados } = useFranqueadosAdapter();

  const handleCopyRegistrationLink = () => {
    const slug = tenant?.slug || "yeslaser";
    const path = "/influenciadores";
    // Em produção gera URL limpa (sem ?tenant=); em dev usa ?tenant=slug
    const link = getTenantUrl(slug, path).startsWith("http")
      ? getTenantUrl(slug, path)
      : `${window.location.origin}${getTenantUrl(slug, path)}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de cadastro copiado!");
  };

  // Filtros
  const [filters, setFilters] = useState<InfluenciadoraFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Hook de dados (usando adapter MT)
  const {
    influenciadoras,
    kpis,
    ranking,
    isLoading,
    isFetching,
    refetch,
    updateStatus,
    toggleAtivo,
    delete: deleteInfluenciadora,
    isDeleting,
  } = useInfluenciadorasAdapter({ ...filters, search: searchTerm });

  // Filtrar por busca local
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

  const handleStatusChange = (id: string, status: InfluenciadoraStatus) => {
    updateStatus({ id, status });
  };

  const handleAprovar = async (inf: Influenciadora) => {
    setIsApproving(inf.id);
    try {
      // 1. Atualizar status para aprovado diretamente no banco
      const { error: updateError } = await supabase
        .from("mt_influencers")
        .update({ status: "aprovado", is_active: true, updated_at: new Date().toISOString() })
        .eq("id", inf.id);

      if (updateError) throw updateError;

      // Recarregar lista
      refetch();

      // 2. Enviar boas-vindas (WhatsApp + Email)
      const tenantId = inf.tenant_id || tenant?.id;
      if (tenantId) {
        const portalUrl = `${window.location.origin}/influenciadores/login`;
        const { error } = await supabase.functions.invoke("send-welcome", {
          body: { influenciadoraId: inf.id, tenantId, portalUrl },
        });
        if (error) {
          toast.warning("Aprovada! Mas houve um erro ao enviar a mensagem de boas-vindas.");
        } else {
          toast.success(`${inf.nome_completo || inf.nome_artistico} aprovada! Mensagem de boas-vindas enviada por WhatsApp/email.`);
        }
      } else {
        toast.success(`${inf.nome_completo || inf.nome_artistico} aprovada com sucesso!`);
      }
    } catch (err) {
      toast.error("Erro ao aprovar influenciadora.");
    } finally {
      setIsApproving(null);
    }
  };

  const [isResending, setIsResending] = useState<string | null>(null);

  const handleReenviarBoasVindas = async (inf: Influenciadora) => {
    setIsResending(inf.id);
    try {
      const tenantId = inf.tenant_id || tenant?.id;
      if (!tenantId) {
        toast.error("Tenant não identificado.");
        return;
      }
      const portalUrl = `${window.location.origin}/influenciadores/login`;
      const { error } = await supabase.functions.invoke("send-welcome", {
        body: { influenciadoraId: inf.id, tenantId, portalUrl },
      });
      if (error) {
        toast.error("Erro ao reenviar mensagem de boas-vindas.");
      } else {
        toast.success(`Mensagem de boas-vindas reenviada para ${inf.nome_completo || inf.nome_artistico}!`);
      }
    } catch (err) {
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

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `influenciadoras_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            <Skeleton className="h-12 sm:h-14 rounded-lg" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 sm:h-32 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-72 sm:h-96 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Influenciadoras
                </h1>
                <Badge variant="secondary" className="hidden sm:flex">
                  {kpis?.total_influenciadoras || 0} cadastradas
                </Badge>
              </div>
              <Button size="sm" variant="outline" className="h-9" onClick={handleCopyRegistrationLink} title="Copiar link de cadastro público">
                <LinkIcon className="h-4 w-4 mr-1" />
                Link de Cadastro
              </Button>
              <Button size="sm" asChild className="h-9">
                <Link to="/influenciadoras/novo">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Influenciadora
                </Link>
              </Button>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="lista" className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 animate-fade-in">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {kpis?.total_influenciadoras || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {kpis?.influenciadoras_ativas || 0} ativas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Indicações</CardTitle>
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {kpis?.total_indicacoes || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {kpis?.indicacoes_convertidas || 0} convertidas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {kpis?.taxa_conversao || 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Taxa de conversão
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Alcance</CardTitle>
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatSeguidores(kpis?.total_seguidores || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {kpis?.engajamento_medio || 0}% engajamento
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Ranking Top 10 */}
                <Card className="animate-fade-in" style={{ animationDelay: "50ms" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Top 10 Influenciadoras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ranking.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma influenciadora com indicações ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {ranking.map((item, index) => (
                          <div
                            key={item.influenciadora_id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0
                                    ? "bg-yellow-500 text-white"
                                    : index === 1
                                    ? "bg-gray-400 text-white"
                                    : index === 2
                                    ? "bg-amber-600 text-white"
                                    : "bg-muted-foreground/20 text-muted-foreground"
                                }`}
                              >
                                {item.posicao}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={item.foto_perfil} />
                                <AvatarFallback>
                                  {safeGetInitials(item.nome_completo)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {item.nome_artistico || item.nome_completo}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{item.codigo_indicacao}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{item.total_indicacoes}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.taxa_conversao}% conversão
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pendentes de Aprovação */}
                {kpis && kpis.influenciadoras_pendentes > 0 && (
                  <Card
                    className="border-yellow-500/50 animate-fade-in"
                    style={{ animationDelay: "100ms" }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-600">
                        <Ban className="h-5 w-5" />
                        Pendentes de Aprovação ({kpis.influenciadoras_pendentes})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {influenciadoras
                          .filter((inf) => inf.status === "pendente")
                          .slice(0, 5)
                          .map((inf) => (
                            <div
                              key={inf.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={inf.foto_perfil} />
                                  <AvatarFallback>
                                    {safeGetInitials(inf.nome_completo)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{inf.nome_completo}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {inf.whatsapp}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-green-600 hover:text-green-700"
                                  onClick={() => handleAprovar(inf)}
                                  disabled={isApproving === inf.id}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {isApproving === inf.id ? "Aprovando..." : "Aprovar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-red-600 hover:text-red-700"
                                  onClick={() => handleStatusChange(inf.id, "rejeitado")}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejeitar
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Lista Tab */}
              <TabsContent value="lista" className="mt-4 space-y-4">
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
                          <TableHead className="hidden xl:table-cell">Último Acesso</TableHead>
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
                                <div className="flex flex-wrap gap-1">
                                  <Badge className={getStatusColor(inf.status)}>
                                    {getStatusLabel(inf.status)}
                                  </Badge>
                                  {inf.eh_menor && (
                                    <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">
                                      Menor
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                {inf.ultimo_login ? (
                                  <span
                                    className="text-sm text-muted-foreground"
                                    title={format(new Date(inf.ultimo_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  >
                                    {formatDistanceToNow(new Date(inf.ultimo_login), { addSuffix: true, locale: ptBR })}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Nunca</span>
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
                                          disabled={isResending === inf.id}
                                          className="text-blue-600"
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

                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  Total: {filteredInfluenciadoras.length} influenciadoras
                </p>
              </TabsContent>
            </Tabs>

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
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Excluindo..." : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Influenciadoras;
