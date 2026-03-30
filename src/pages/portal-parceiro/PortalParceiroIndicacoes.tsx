import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParceriaAuthContext } from "@/contexts/ParceriaAuthContext";
import { ParceriaLayout } from "@/components/parceiro-portal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  Building2,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ParceriaIndicacao, IndicacaoStatus } from "@/types/parceria";
import { indicacaoStatusLabels, indicacaoStatusColors } from "@/types/parceria";

// =====================================================
// Portal do Parceiro - Lista de Indicações
// =====================================================

export default function PortalParceiroIndicacoes() {
  const { parceria, isLoading: isAuthLoading } = useParceriaAuthContext();

  // =====================================================
  // State: Filtros
  // =====================================================

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IndicacaoStatus | "all">("all");

  // =====================================================
  // Query: Buscar Indicações
  // =====================================================

  const {
    data: indicacoes = [],
    isLoading: isLoadingIndicacoes,
  } = useQuery({
    queryKey: ["portal-parceria-indicacoes", parceria?.id, statusFilter],
    queryFn: async () => {
      if (!parceria?.id) return [];

      let query = supabase
        .from("mt_partnership_referrals")
        .select(`
          *,
          lead:mt_leads!lead_id(
            id, nome, email, whatsapp, status, created_at
          )
        `)
        .eq("parceria_id", parceria.id)
        .order("data_indicacao", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ParceriaIndicacao[];
    },
    enabled: !!parceria?.id,
  });

  // =====================================================
  // Dados Filtrados
  // =====================================================

  const filteredIndicacoes = indicacoes.filter((indicacao) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      indicacao.lead?.nome?.toLowerCase().includes(searchLower) ||
      indicacao.lead?.email?.toLowerCase().includes(searchLower) ||
      indicacao.lead?.whatsapp?.includes(search)
    );
  });

  // =====================================================
  // Métricas
  // =====================================================

  const metrics = {
    total: indicacoes.length,
    pendentes: indicacoes.filter((i) => i.status === "pendente").length,
    convertidas: indicacoes.filter((i) => i.status === "convertido").length,
    perdidas: indicacoes.filter((i) => i.status === "perdido").length,
    taxa: indicacoes.length > 0
      ? Math.round((indicacoes.filter((i) => i.status === "convertido").length / indicacoes.length) * 100)
      : 0,
  };

  // =====================================================
  // Helpers
  // =====================================================

  const getStatusIcon = (status: IndicacaoStatus) => {
    switch (status) {
      case "convertido":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pendente":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "perdido":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "cancelado":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  // =====================================================
  // Renderização: Loading
  // =====================================================

  if (isAuthLoading) {
    return (
      <ParceriaLayout>
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </ParceriaLayout>
    );
  }

  // =====================================================
  // Renderização: Parceria Não Encontrada
  // =====================================================

  if (!parceria) {
    return (
      <ParceriaLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Parceria não encontrada</h2>
            <p className="text-muted-foreground">
              Não foi possível carregar os dados da parceria.
            </p>
          </CardContent>
        </Card>
      </ParceriaLayout>
    );
  }

  // =====================================================
  // Renderização Principal
  // =====================================================

  return (
    <ParceriaLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/parceiro/portal">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Minhas Indicações</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as suas indicações e conversões
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{metrics.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.convertidas}</p>
                <p className="text-xs text-muted-foreground">Convertidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.taxa}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as IndicacaoStatus | "all")}
            >
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="convertido">Convertidas</SelectItem>
                <SelectItem value="perdido">Perdidas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Indicações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Indicações
          </CardTitle>
          <CardDescription>
            {filteredIndicacoes.length} indicações encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingIndicacoes ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredIndicacoes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Nenhuma indicação encontrada com os filtros aplicados"
                  : "Você ainda não possui indicações"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndicacoes.map((indicacao) => (
                    <TableRow key={indicacao.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {indicacao.lead?.nome || "—"}
                          </p>
                          {indicacao.codigo_usado && (
                            <p className="text-xs text-muted-foreground">
                              Código: {indicacao.codigo_usado}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {indicacao.lead?.email && (
                            <p className="text-muted-foreground">
                              {indicacao.lead.email}
                            </p>
                          )}
                          {indicacao.lead?.whatsapp && (
                            <p className="text-muted-foreground">
                              {indicacao.lead.whatsapp}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(indicacao.data_indicacao), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(indicacao.status)}
                          <Badge
                            variant="secondary"
                            className={indicacaoStatusColors[indicacao.status]}
                          >
                            {indicacaoStatusLabels[indicacao.status]}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </ParceriaLayout>
  );
}
