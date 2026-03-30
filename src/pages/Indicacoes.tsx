import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIndicacoesAdapter } from "@/hooks/useIndicacoesAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndicacaoLeaderboard, IndicacaoHistorico } from "@/components/indicacoes";
import { ConversionKPICard } from "@/components/dashboard/ConversionKPICard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  MessageCircle,
  UserPlus,
  Users,
  TrendingUp,
  Percent,
  RefreshCw,
  GitBranch,
  Trophy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  ArrowRightLeft,
} from "lucide-react";
import { INDICACAO_STATUS_LABELS, INDICACAO_STATUS_COLORS } from "@/types/indicacao";

const ITEMS_PER_PAGE = 25;

export default function Indicacoes() {
  const navigate = useNavigate();
  const { indicacoes, kpis, leaderboard, isLoading, refetch } = useIndicacoesAdapter();
  const { franqueados } = useFranqueadosAdapter();
  const { unidadeId, isUnidade } = useUserProfileAdapter();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [franquiaFilter, setFranquiaFilter] = useState<string>("all");

  // Filtrar indicacoes
  const filteredIndicacoes = useMemo(() => {
    let result = indicacoes;

    // Filtro por status
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    // Filtro por franquia (para admin/central)
    if (!isUnidade && franquiaFilter !== "all") {
      result = result.filter(
        (i) =>
          i.lead_indicador?.franqueado_id === franquiaFilter ||
          i.lead_indicado?.franqueado_id === franquiaFilter
      );
    }

    // Filtro por busca
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.lead_indicado?.nome?.toLowerCase().includes(searchLower) ||
          i.lead_indicado?.email?.toLowerCase().includes(searchLower) ||
          i.lead_indicado?.whatsapp?.includes(search) ||
          i.lead_indicador?.nome?.toLowerCase().includes(searchLower) ||
          i.campanha?.toLowerCase().includes(searchLower) ||
          i.origem?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [indicacoes, search, statusFilter, franquiaFilter, isUnidade]);

  const totalPages = Math.ceil(filteredIndicacoes.length / ITEMS_PER_PAGE);
  const paginatedIndicacoes = filteredIndicacoes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleWhatsApp = (telefone: string | undefined) => {
    if (!telefone) return;
    const cleanPhone = telefone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "convertido":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "perdido":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Indicacoes</h1>
          <p className="text-muted-foreground">
            Indicacoes de leads e influenciadoras
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 animate-fade-in">
        <ConversionKPICard
          title="Total Indicacoes"
          value={kpis?.total_indicacoes || 0}
          icon={UserPlus}
          isPercentage={false}
        />
        <ConversionKPICard
          title="Leads que Indicaram"
          value={kpis?.total_leads_que_indicaram || 0}
          icon={Users}
          isPercentage={false}
        />
        <ConversionKPICard
          title="Media por Lead"
          value={kpis?.media_indicacoes_por_lead || 0}
          icon={Percent}
          isPercentage={false}
        />
        <ConversionKPICard
          title="Taxa Conversao"
          value={kpis?.taxa_conversao_global || 0}
          icon={TrendingUp}
          isPercentage={true}
        />
        <ConversionKPICard
          title="Ultimo Mes"
          value={kpis?.indicacoes_ultimo_mes || 0}
          icon={GitBranch}
          isPercentage={false}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Historico
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
        </TabsList>

        {/* Tab Historico */}
        <TabsContent value="historico" className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar indicacoes..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro por Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Franquia (apenas admin/central) */}
              {!isUnidade && franqueados.length > 0 && (
                <Select value={franquiaFilter} onValueChange={setFranquiaFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Franquia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Franquias</SelectItem>
                    {franqueados.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Tabela de Indicacoes */}
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="min-w-[140px]">Indicado</TableHead>
                      <TableHead className="hidden md:table-cell">Indicado por</TableHead>
                      <TableHead className="hidden lg:table-cell">Origem</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[80px]">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIndicacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma indicacao encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedIndicacoes.map((indicacao) => (
                        <TableRow
                          key={indicacao.id}
                          className="group cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            indicacao.lead_indicado_id &&
                            navigate(`/leads/${indicacao.lead_indicado_id}`)
                          }
                        >
                          {/* Indicado */}
                          <TableCell className="py-2">
                            <div>
                              <p className="font-medium text-sm truncate max-w-[150px]">
                                {indicacao.lead_indicado?.nome || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {indicacao.lead_indicado?.whatsapp || indicacao.lead_indicado?.email}
                              </p>
                            </div>
                          </TableCell>

                          {/* Indicador */}
                          <TableCell className="hidden md:table-cell py-2">
                            <div>
                              <p className="font-medium text-sm truncate max-w-[120px]">
                                {indicacao.lead_indicador?.nome || "N/A"}
                              </p>
                              {indicacao.codigo_usado && (
                                <p className="text-xs text-muted-foreground">
                                  Codigo: {indicacao.codigo_usado}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Origem */}
                          <TableCell className="hidden lg:table-cell py-2">
                            {indicacao.origem === 'Influenciadora' ? (
                              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                                <Star className="h-3 w-3 mr-1" />
                                Influenciadora
                              </Badge>
                            ) : indicacao.origem === 'Indicação de Lead' ? (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                Lead
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {indicacao.origem || indicacao.campanha || '-'}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Data */}
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2">
                            {indicacao.data_indicacao
                              ? format(new Date(indicacao.data_indicacao), "dd MMM yyyy", {
                                  locale: ptBR,
                                })
                              : "-"}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(indicacao.status)}
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  INDICACAO_STATUS_COLORS[
                                    indicacao.status as keyof typeof INDICACAO_STATUS_COLORS
                                  ] || ""
                                }`}
                              >
                                {INDICACAO_STATUS_LABELS[
                                  indicacao.status as keyof typeof INDICACAO_STATUS_LABELS
                                ] || indicacao.status}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Acoes */}
                          <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {indicacao.lead_indicado?.whatsapp && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50"
                                  onClick={() =>
                                    handleWhatsApp(indicacao.lead_indicado?.whatsapp)
                                  }
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  indicacao.lead_indicado_id &&
                                  navigate(`/leads/${indicacao.lead_indicado_id}`)
                                }
                                title="Ver Lead"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Proxima
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground text-center">
            Total: {filteredIndicacoes.length} indicacoes
          </p>
        </TabsContent>

        {/* Tab Leaderboard */}
        <TabsContent value="leaderboard">
          <IndicacaoLeaderboard leaderboard={leaderboard} isLoading={isLoading} limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
