import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePromocaoCadastrosAdapter } from "@/hooks/usePromocaoCadastrosAdapter";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { usePromocaoMetricsAdapter } from "@/hooks/usePromocaoMetricsAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PromocaoFilters } from "@/components/dashboard/PromocaoFilters";
import { PromocaoFunnel } from "@/components/dashboard/PromocaoFunnel";
import { PromocaoTrendChart } from "@/components/dashboard/PromocaoTrendChart";
import { ConversionKPICard } from "@/components/dashboard/ConversionKPICard";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { QuickActionButtons } from "@/components/dashboard/QuickActionButtons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, MessageCircle, Users, UserPlus, Phone, Share2 } from "lucide-react";
import { LeadStatus } from "@/types/lead-mt";

const ITEMS_PER_PAGE = 25;

export default function CadastrosLP() {
  const navigate = useNavigate();
  const { cadastros, isLoading, refetch, updateStatus, isUpdating } = usePromocaoCadastrosAdapter();
  const { indicacoes, refetch: refetchIndicacoes } = usePromocaoIndicacoesAdapter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all");

  const {
    filteredCadastros,
    filteredIndicacoes,
    funnelData,
    cumulativeTrendData,
    unidades,
    totalCadastros,
    totalIndicacoes,
  } = usePromocaoMetricsAdapter(cadastros, indicacoes, dateRange, unidadeFilter);

  const searchFilteredCadastros = useMemo(() => {
    if (!search.trim()) return filteredCadastros;
    const searchLower = search.toLowerCase();
    return filteredCadastros.filter(
      (c) =>
        c.nome.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.telefone.includes(search) ||
        c.unidade?.toLowerCase().includes(searchLower)
    );
  }, [filteredCadastros, search]);

  const totalPages = Math.ceil(searchFilteredCadastros.length / ITEMS_PER_PAGE);
  const paginatedCadastros = searchFilteredCadastros.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleWhatsApp = (cadastro: typeof cadastros[0]) => {
    const cleanPhone = cadastro.telefone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const primeiroNome = cadastro.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Oi ${primeiroNome}! 🌟 Aqui é da Viniun! Vi que você se cadastrou na nossa promoção especial. Que demais! Vou te contar tudo sobre como aproveitar esse benefício, ok?`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${mensagem}`, "_blank");
  };

  const handleRefresh = () => {
    refetch();
    refetchIndicacoes();
  };

  const handleDownloadCSV = () => {
    const headers = ["Nome", "Telefone", "Email", "Gênero", "Unidade", "Aceita Contato", "Indicações", "Data"];
    const rows = searchFilteredCadastros.map((c) => [
      c.nome,
      c.telefone,
      c.email,
      c.genero || "",
      c.unidade || "",
      c.aceita_contato ? "Sim" : "Não",
      c.quantidade_indicacoes || 0,
      new Date(c.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cadastros_lp_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const aceitaContatoCount = filteredCadastros.filter((c) => c.aceita_contato).length;
  const taxaAceitaContato = totalCadastros > 0 ? (aceitaContatoCount / totalCadastros) * 100 : 0;
  const taxaIndicacao = totalCadastros > 0 ? (filteredCadastros.filter(c => (c.quantidade_indicacoes || 0) > 0).length / totalCadastros) * 100 : 0;
  const mediaIndicacoes = totalCadastros > 0 ? totalIndicacoes / totalCadastros : 0;

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
      <div>
        <h1 className="text-2xl font-bold">Cadastros LP</h1>
        <p className="text-muted-foreground">Leads cadastrados nas landing pages das franquias</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-in">
        <ConversionKPICard
          title="Total Cadastros"
          value={totalCadastros}
          icon={Users}
          isPercentage={false}
        />
        <ConversionKPICard
          title="Taxa Aceita Contato"
          value={taxaAceitaContato}
          icon={Phone}
        />
        <ConversionKPICard
          title="Taxa de Indicação"
          value={taxaIndicacao}
          icon={Share2}
        />
        <ConversionKPICard
          title="Total Indicações"
          value={totalIndicacoes}
          icon={UserPlus}
          isPercentage={false}
        />
      </div>

      {/* Funnel and Trend Charts */}
      <div className="grid gap-4 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: "50ms" }}>
        <PromocaoFunnel data={funnelData} />
        <PromocaoTrendChart data={cumulativeTrendData} cumulative />
      </div>

      {/* Table Section */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Lista de Cadastros</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cadastros..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <PromocaoFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          unidadeFilter={unidadeFilter}
          onUnidadeFilterChange={setUnidadeFilter}
          unidades={unidades}
          onRefresh={handleRefresh}
          isRefreshing={false}
          onDownloadCSV={handleDownloadCSV}
        />

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[120px]">Nome</TableHead>
                    <TableHead className="hidden lg:table-cell">Contato</TableHead>
                    <TableHead className="hidden md:table-cell">Unidade</TableHead>
                    <TableHead className="text-center">Indicações</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Data</TableHead>
                    <TableHead className="text-right text-xs w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCadastros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum cadastro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCadastros.map((cadastro) => {
                      const currentStatus: LeadStatus = cadastro.status || "novo";
                      return (
                        <TableRow 
                          key={cadastro.id} 
                          className="group cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/cadastros-lp/${cadastro.id}`)}
                        >
                          <TableCell className="py-2">
                            <div>
                              <p className="font-medium text-sm truncate max-w-[150px]">{cadastro.nome}</p>
                              <p className="text-xs text-muted-foreground lg:hidden">{cadastro.telefone}</p>
                              {cadastro.genero && (
                                <p className="text-xs text-muted-foreground hidden lg:block">{cadastro.genero}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-2">
                            <div className="space-y-0">
                              <p className="text-sm">{cadastro.telefone}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{cadastro.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-2">
                            <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                              {cadastro.unidade || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge variant={cadastro.quantidade_indicacoes ? "default" : "secondary"} className="text-xs">
                              {cadastro.quantidade_indicacoes || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <StatusSelect
                              value={currentStatus}
                              onValueChange={(status) => updateStatus({ id: cadastro.id, status })}
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2">
                            {format(new Date(cadastro.created_at), "dd MMM", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <QuickActionButtons
                                currentStatus={currentStatus}
                                onStatusChange={(status) => updateStatus({ id: cadastro.id, status })}
                                isUpdating={isUpdating}
                                compact
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleWhatsApp(cadastro)}
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Total: {searchFilteredCadastros.length} cadastros
        </p>
      </div>
    </div>
  );
}
