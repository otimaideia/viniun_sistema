import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useRedeTabelasMT } from "@/hooks/multitenant/useRedeTabelasMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Trash2, Network, Eye, Building2, Users, TrendingUp,
  Globe, Lock, Users2,
} from "lucide-react";
import type { NetworkTableStatus, NetworkTableVisibilidade } from "@/types/rede-imoveis-mt";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  ativa: { label: "Ativa", variant: "default" },
  pausada: { label: "Pausada", variant: "secondary" },
  encerrada: { label: "Encerrada", variant: "destructive" },
};

const VISIBILIDADE_ICONS: Record<string, React.ReactNode> = {
  publica: <Globe className="h-3.5 w-3.5" />,
  parceiros: <Users2 className="h-3.5 w-3.5" />,
  privada: <Lock className="h-3.5 w-3.5" />,
};

const TIPO_LABELS: Record<string, string> = {
  venda: "Venda",
  locacao: "Locação",
  temporada: "Temporada",
  lancamento: "Lançamento",
  misto: "Misto",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function RedeTabelas() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVisibilidade, setFilterVisibilidade] = useState<string>("all");
  const [tab, setTab] = useState("rede");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    search: search || undefined,
    status: (filterStatus !== "all" ? filterStatus : undefined) as NetworkTableStatus | undefined,
    visibilidade: (filterVisibilidade !== "all" ? filterVisibilidade : undefined) as NetworkTableVisibilidade | undefined,
  };

  const { data: tabelas = [], minhasTabelas = [], isLoading, remove } = useRedeTabelasMT(filters);

  const tabelasRede = tabelas.filter((t) => t.tenant_id !== tenant?.id);

  const displayList = tab === "rede" ? tabelasRede : minhasTabelas;

  const totalImoveis = (minhasTabelas || []).reduce((acc, t) => acc + (t.total_imoveis || 0), 0);
  const totalInteresses = (minhasTabelas || []).reduce((acc, t) => acc + (t.total_interesses || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" /> Tabelas Colaborativas
          </h1>
          <p className="text-muted-foreground">
            Rede de imóveis compartilhados entre parceiros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/imoveis/rede/parcerias">
              <Users className="h-4 w-4 mr-2" /> Parcerias
            </Link>
          </Button>
          <Button asChild>
            <Link to="/imoveis/rede/novo">
              <Plus className="h-4 w-4 mr-2" /> Nova Tabela
            </Link>
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Minhas Tabelas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(minhasTabelas || []).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tabelas da Rede</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{tabelasRede.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Imóveis Compartilhados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalImoveis}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Interesses Recebidos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalInteresses}</div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rede">
            <Globe className="h-4 w-4 mr-1" /> Rede ({tabelasRede.length})
          </TabsTrigger>
          <TabsTrigger value="minhas">
            <Building2 className="h-4 w-4 mr-1" /> Minhas Tabelas ({(minhasTabelas || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Filtros */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar tabela..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
          {tab === "rede" && (
            <Select value={filterVisibilidade} onValueChange={setFilterVisibilidade}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Visibilidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="publica">Pública</SelectItem>
                <SelectItem value="parceiros">Parceiros</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="rede" className="mt-4">
          <TabelasList
            items={displayList.filter((t) => !search || t.nome.toLowerCase().includes(search.toLowerCase()))}
            isLoading={isLoading}
            onNavigate={(id) => navigate(`/imoveis/rede/${id}`)}
            showTenant
          />
        </TabsContent>

        <TabsContent value="minhas" className="mt-4">
          <TabelasList
            items={(minhasTabelas || []).filter((t) => !search || t.nome.toLowerCase().includes(search.toLowerCase()))}
            isLoading={isLoading}
            onNavigate={(id) => navigate(`/imoveis/rede/${id}`)}
            onDelete={(id) => setDeleteId(id)}
          />
        </TabsContent>
      </Tabs>

      {/* Confirm Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>Remover esta tabela da rede? Os imóveis não serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componente: Lista de Tabelas ---

function TabelasList({
  items,
  isLoading,
  onNavigate,
  onDelete,
  showTenant,
}: {
  items: any[];
  isLoading: boolean;
  onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
  showTenant?: boolean;
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma tabela encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tabela</TableHead>
              {showTenant && <TableHead>Empresa</TableHead>}
              <TableHead>Tipo</TableHead>
              <TableHead>Visibilidade</TableHead>
              <TableHead className="text-center">Imóveis</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              {onDelete && <TableHead className="w-[60px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => onNavigate(item.id)}>
                <TableCell>
                  <div className="font-medium">{item.nome}</div>
                  {item.descricao && <div className="text-xs text-muted-foreground line-clamp-1">{item.descricao}</div>}
                </TableCell>
                {showTenant && (
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{item.tenant?.nome_fantasia || "-"}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline">{TIPO_LABELS[item.tipo] || item.tipo}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {VISIBILIDADE_ICONS[item.visibilidade]}
                    <span className="text-sm capitalize">{item.visibilidade}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-medium">{item.total_imoveis || 0}</span>
                </TableCell>
                <TableCell>
                  {item.comissao_tipo === "fixo"
                    ? formatCurrency(item.comissao_valor_fixo)
                    : `${item.comissao_percentual || 0}%`}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_LABELS[item.status]?.variant || "secondary"}>
                    {STATUS_LABELS[item.status]?.label || item.status}
                  </Badge>
                </TableCell>
                {onDelete && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
