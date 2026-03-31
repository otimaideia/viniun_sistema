import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Copy,
  Link as LinkIcon,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  Users,
  Target,
  Gift,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";

import { useParceriasAdapter } from "@/hooks/useParceriasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { getTenantUrl } from "@/hooks/multitenant/useTenantDetection";
import {
  PARCERIA_STATUS_LABELS,
  PARCERIA_STATUS_COLORS,
  RAMOS_ATIVIDADE,
  formatarCNPJ,
  gerarLinkIndicacaoParceria,
} from "@/types/parceria";
import type { Parceria, ParceriaStatus, ParceriaFilters } from "@/types/parceria";

// =====================================================
// Componente: KPI Card
// =====================================================

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
}

function KPICard({ title, value, subtitle, icon, trend }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? "+" : ""}
            {trend}% vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// Componente Principal
// =====================================================

export default function Parcerias() {
  // Estado dos filtros
  const [filters, setFilters] = useState<ParceriaFilters>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { tenant } = useTenantContext();

  // Hook de parcerias (usando adapter MT)
  const {
    parcerias,
    kpis,
    isLoading,
    deleteParceria,
    isDeleting,
  } = useParceriasAdapter({ filters });

  // Handlers
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value === "all" ? undefined : (value as ParceriaStatus),
    }));
  };

  const handleRamoFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      ramo_atividade: value === "all" ? undefined : value,
    }));
  };

  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado!");
  };

  const handleCopyLink = (codigo: string) => {
    const link = gerarLinkIndicacaoParceria(codigo);
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleCopyRegistrationLink = () => {
    const slug = tenant?.slug || "viniun";
    const path = "/parceiro/cadastro";
    // Em produção gera URL limpa (sem ?tenant=); em dev usa ?tenant=slug
    const link = getTenantUrl(slug, path).startsWith("http")
      ? getTenantUrl(slug, path)
      : `${window.location.origin}${getTenantUrl(slug, path)}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de cadastro copiado!");
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteParceria(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parcerias</h1>
          <p className="text-muted-foreground">
            Gerencie suas parcerias empresariais e acompanhe indicações
          </p>
        </div>
        <Button variant="outline" onClick={handleCopyRegistrationLink} title="Copiar link de cadastro público para parceiros">
          <LinkIcon className="mr-2 h-4 w-4" />
          Link de Cadastro
        </Button>
        <Button asChild>
          <Link to="/parcerias/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova Parceria
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total de Parcerias"
          value={kpis?.total_parcerias || 0}
          subtitle={`${kpis?.parcerias_ativas || 0} ativas`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <KPICard
          title="Total de Indicações"
          value={kpis?.total_indicacoes || 0}
          subtitle={`${kpis?.indicacoes_pendentes || 0} pendentes`}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${kpis?.taxa_conversao || 0}%`}
          subtitle={`${kpis?.indicacoes_convertidas || 0} convertidas`}
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          title="Benefícios Ativos"
          value={kpis?.beneficios_ativos || 0}
          subtitle="Em todas as parcerias"
          icon={<Gift className="h-4 w-4" />}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ, código..."
                  className="pl-8"
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Select onValueChange={handleStatusFilter} defaultValue="all">
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={handleRamoFilter} defaultValue="all">
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Ramo de Atividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ramos</SelectItem>
                {RAMOS_ATIVIDADE.map((ramo) => (
                  <SelectItem key={ramo} value={ramo}>
                    {ramo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parcerias</CardTitle>
          <CardDescription>
            {parcerias.length} {parcerias.length === 1 ? "parceria encontrada" : "parcerias encontradas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : parcerias.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma parceria encontrada</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.status || filters.ramo_atividade
                  ? "Tente ajustar os filtros"
                  : "Comece criando sua primeira parceria"}
              </p>
              {!filters.search && !filters.status && !filters.ramo_atividade && (
                <Button asChild className="mt-4">
                  <Link to="/parcerias/novo">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Parceria
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Ramo</TableHead>
                    <TableHead>Indicações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcerias.map((parceria) => (
                    <TableRow key={parceria.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {parceria.logo_url ? (
                            <img
                              src={parceria.logo_url}
                              alt={parceria.nome_fantasia}
                              className="h-10 w-10 rounded-lg object-contain bg-muted"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{parceria.nome_fantasia}</div>
                            {parceria.cnpj && (
                              <div className="text-sm text-muted-foreground">
                                {formatarCNPJ(parceria.cnpj)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {parceria.codigo_indicacao && (
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {parceria.codigo_indicacao}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyCode(parceria.codigo_indicacao!)}
                              title="Copiar código"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{parceria.ramo_atividade}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{parceria.quantidade_indicacoes || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={PARCERIA_STATUS_COLORS[parceria.status]}>
                          {PARCERIA_STATUS_LABELS[parceria.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/parcerias/${parceria.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/parcerias/${parceria.id}/editar`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {parceria.codigo_indicacao && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleCopyCode(parceria.codigo_indicacao!)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar Código
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCopyLink(parceria.codigo_indicacao!)}
                                >
                                  <LinkIcon className="mr-2 h-4 w-4" />
                                  Copiar Link
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    to={`/parceiro/${parceria.codigo_indicacao}`}
                                    target="_blank"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir Portal
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(parceria.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta parceria? Esta ação não pode ser desfeita.
              Todas as indicações associadas também serão removidas.
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
    </div>
  );
}
