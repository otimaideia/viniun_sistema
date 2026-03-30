import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useInfluencerReferralsMT } from "@/hooks/multitenant/useInfluencerReferralsMT";
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
import { Search, RefreshCw, Download, ExternalLink, MessageCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    convertido: "Convertido",
    cancelado: "Cancelado",
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    convertido: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return colors[status] || "";
};

const buildWhatsAppLink = (phone: string, leadName: string, influencerName: string) => {
  const firstName = leadName.split(" ")[0];
  const cleanPhone = phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  const message = encodeURIComponent(
    `Olá, ${firstName}! Tudo bem? 😊\n\n` +
    `A *${influencerName}* te indicou e você ganhou *10 sessões de depilação a laser GRATUITAS* em área P! 🎁\n\n` +
    `Para garantir suas sessões, é só agendar uma *avaliação gratuita* aqui na *YESlaser Praia Grande*. A avaliação é rápida, sem compromisso, e nossa especialista vai analisar sua pele e tirar todas as suas dúvidas.\n\n` +
    `📅 Quer agendar? Me conta qual o melhor dia e horário para você!\n\n` +
    `📍 Estamos na Praia Grande - SP\n\n` +
    `Te esperamos! 💜`
  );

  return `https://wa.me/${phoneWithCountry}?text=${message}`;
};

const formatCurrency = (value: number | null) => {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const InfluenciadorasIndicacoes = () => {
  const navigate = useNavigate();
  const { influenciadoras, isLoading: isLoadingInfluencers } = useInfluenciadorasAdapter();

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [influenciadoraFilter, setInfluenciadoraFilter] = useState<string>("all");

  // Hook real de indicações MT
  const {
    referrals,
    isLoading: isLoadingReferrals,
    refetch,
    stats: hookStats,
  } = useInfluencerReferralsMT({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    influencer_id: influenciadoraFilter !== "all" ? influenciadoraFilter : undefined,
  });

  const isLoading = isLoadingInfluencers || isLoadingReferrals;

  // Filtrar indicações por busca de texto
  const filteredIndicacoes = useMemo(() => {
    if (!searchTerm) return referrals;

    const search = searchTerm.toLowerCase();
    return referrals.filter((ref) => {
      const influencerName = ref.influencer?.nome_artistico || ref.influencer?.nome || "";
      const leadName = ref.lead?.nome || "";
      const leadEmail = ref.lead?.email || "";
      const leadPhone = ref.lead?.telefone || "";

      return (
        influencerName.toLowerCase().includes(search) ||
        ref.codigo_usado.toLowerCase().includes(search) ||
        leadName.toLowerCase().includes(search) ||
        leadEmail.toLowerCase().includes(search) ||
        leadPhone.includes(search)
      );
    });
  }, [referrals, searchTerm]);

  // Estatísticas (usar do hook + taxa de conversão)
  const stats = useMemo(() => {
    return {
      total: hookStats.total,
      convertidos: hookStats.convertidos,
      pendentes: hookStats.pendentes,
      taxaConversao: hookStats.total > 0 ? Math.round((hookStats.convertidos / hookStats.total) * 100) : 0,
      totalComissoes: hookStats.comissao_total,
    };
  }, [hookStats]);

  const handleDownloadCSV = () => {
    const headers = [
      "Influenciadora",
      "Código",
      "Lead",
      "E-mail",
      "Telefone",
      "Status",
      "Data Indicação",
      "Data Conversão",
      "Valor Serviço",
      "Comissão",
    ];
    const rows = filteredIndicacoes.map((ref) => [
      ref.influencer?.nome_artistico || ref.influencer?.nome || "-",
      ref.codigo_usado,
      ref.lead?.nome || "Pendente",
      ref.lead?.email || "-",
      ref.lead?.telefone || "-",
      getStatusLabel(ref.status),
      formatDate(ref.created_at),
      formatDate(ref.data_conversao),
      formatCurrency(ref.valor_servico),
      formatCurrency(ref.comissao),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `indicacoes_${new Date().toISOString().split("T")[0]}.csv`);
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
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
            <h1 className="text-2xl font-bold">Indicações de Influenciadoras</h1>
            <p className="text-sm text-muted-foreground">
              Total: {stats.total} indicações
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convertidos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.convertidos}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  <p className="text-2xl font-bold">{stats.taxaConversao}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={influenciadoraFilter} onValueChange={setInfluenciadoraFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Influenciadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {influenciadoras.map((inf) => (
                  <SelectItem key={inf.id} value={inf.id}>
                    {inf.nome_artistico || inf.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
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

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              asChild
            >
              <Link to="/influenciadoras/indicacoes/configuracoes">
                <Settings className="h-4 w-4" />
              </Link>
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
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden lg:table-cell">Contato</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">Comissão</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndicacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma indicação encontrada
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIndicacoes.map((ref) => {
                    const influencerName = ref.influencer?.nome_artistico || ref.influencer?.nome || "Desconhecido";
                    const leadName = ref.lead?.nome || "Lead Pendente";
                    const leadEmail = ref.lead?.email || "-";
                    const leadPhone = ref.lead?.telefone || "-";

                    return (
                      <TableRow key={ref.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {influencerName}
                            </span>
                            <span className="text-xs text-muted-foreground md:hidden">
                              {ref.codigo_usado}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="px-2 py-0.5 bg-muted rounded text-xs">
                            {ref.codigo_usado}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {leadName}
                            </span>
                            <span className="text-xs text-muted-foreground lg:hidden">
                              {leadPhone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col text-sm">
                            <span>{leadEmail}</span>
                            <span className="text-xs text-muted-foreground">
                              {leadPhone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={getStatusColor(ref.status)}>
                            {getStatusLabel(ref.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden xl:table-cell">
                          <span className={ref.comissao ? "font-bold text-green-600" : "text-muted-foreground"}>
                            {formatCurrency(ref.comissao)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center hidden xl:table-cell">
                          <div className="flex flex-col text-xs">
                            <span className="text-muted-foreground">
                              {formatDate(ref.created_at)}
                            </span>
                            {ref.data_conversao && (
                              <span className="text-green-600">
                                ✓ {formatDate(ref.data_conversao)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {leadPhone && leadPhone !== "-" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Enviar mensagem no WhatsApp"
                                asChild
                              >
                                <a
                                  href={buildWhatsAppLink(leadPhone, leadName, influencerName)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {ref.lead_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                title="Ver lead"
                                onClick={() => navigate(`/leads/${ref.lead_id}`)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Informação sobre dados reais */}
        {filteredIndicacoes.length === 0 && !isLoading && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ <strong>Nenhuma indicação registrada ainda.</strong> As indicações serão registradas automaticamente quando leads forem criados através de formulários com códigos de influenciadoras.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InfluenciadorasIndicacoes;
