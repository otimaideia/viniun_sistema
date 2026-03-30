import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter, Target, Eye, Edit, Trash2, Copy, Users, TrendingUp, LayoutList, CalendarDays } from "lucide-react";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import { CampanhaFormModal } from "./CampanhaFormModal";
import { CampanhaViewModal } from "./CampanhaViewModal";
import { CampanhaDeleteDialog } from "./CampanhaDeleteDialog";
import { CampanhaCalendar } from "./CampanhaCalendar";
import type { MarketingCampanha } from "@/types/marketing";

export function CampanhasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState<MarketingCampanha | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "delete" | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");

  const { campanhas, stats, isLoading, refetch } = useMarketingCampanhasAdapter();

  const filteredCampanhas = campanhas.filter((campanha) => {
    const matchesSearch =
      campanha.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campanha.descricao && campanha.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === "all" || campanha.tipo === selectedType;
    const matchesStatus = selectedStatus === "all" || campanha.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAction = (campanha: MarketingCampanha, action: "view" | "edit" | "delete") => {
    setSelectedCampanha(campanha);
    setViewMode(action);
  };

  const closeDialog = () => {
    setSelectedCampanha(null);
    setViewMode(null);
  };

  const handleClone = (campanha: MarketingCampanha) => {
    // Cria uma cópia da campanha sem o id para ser tratada como nova
    const clonedCampanha = {
      ...campanha,
      id: undefined as unknown as string, // Remove o id para criar nova
      nome: `${campanha.nome} (Cópia)`,
      status: 'ativa' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedCampanha(clonedCampanha);
    setViewMode("edit");
  };

  const getTypeLabel = (type: string) => {
    return type === "geral" ? "Geral" : "Unidade Especifica";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativa: "Ativa",
      pausada: "Pausada",
      finalizada: "Finalizada",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      ativa: "default",
      pausada: "secondary",
      finalizada: "outline",
    };
    return variants[status] || "default";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas de Marketing</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de marketing digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1">
                <LayoutList className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                Calendario
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">Todos os Tipos</option>
            <option value="geral">Geral</option>
            <option value="unidade_especifica">Unidade Especifica</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="finalizada">Finalizada</option>
          </select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards de estatisticas */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total de Campanhas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.ativas}</div>
            <div className="text-sm text-muted-foreground">Campanhas Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total de Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">{stats.totalConversoes}</div>
            </div>
            <div className="text-sm text-muted-foreground">Conversoes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {stats.taxaConversao.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Taxa Conversao</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {stats.totalBudget.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
            <div className="text-sm text-muted-foreground">Budget Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendario de Campanhas */}
      {displayMode === "calendar" && (
        <CampanhaCalendar
          campanhas={filteredCampanhas}
          onCampanhaClick={(campanha) => handleAction(campanha, "view")}
        />
      )}

      {/* Lista de Campanhas */}
      {displayMode === "list" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campanhas ({filteredCampanhas.length})
          </CardTitle>
          <CardDescription>Gerencie suas campanhas de marketing</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando campanhas...</p>
            </div>
          ) : filteredCampanhas.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {campanhas.length === 0
                  ? "Nenhuma campanha criada ainda"
                  : "Nenhuma campanha encontrada"}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Campanha
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Status</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Leads</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Budget</th>
                    <th className="text-left p-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampanhas.map((campanha) => (
                    <tr key={campanha.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium">{campanha.nome}</div>
                        {campanha.descricao && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {campanha.descricao.substring(0, 80)}...
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{getTypeLabel(campanha.tipo)}</Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <Badge variant={getStatusVariant(campanha.status)}>
                          {getStatusLabel(campanha.status)}
                        </Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-sm font-medium">{campanha.leads_gerados || 0}</span>
                          </div>
                          <span className="text-muted-foreground">/</span>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-sm font-medium">{campanha.conversoes || 0}</span>
                          </div>
                        </div>
                        {(campanha.leads_gerados || 0) > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {(((campanha.conversoes || 0) / (campanha.leads_gerados || 1)) * 100).toFixed(1)}% conv.
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-sm">
                          {campanha.budget_estimado
                            ? campanha.budget_estimado.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "Nao definido"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(campanha, "view")}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(campanha, "edit")}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleClone(campanha)}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(campanha, "delete")}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Modals */}
      <CampanhaFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setShowAddModal(false);
          refetch();
        }}
      />

      {selectedCampanha && viewMode === "view" && (
        <CampanhaViewModal
          campanha={selectedCampanha}
          open={true}
          onOpenChange={closeDialog}
        />
      )}

      {selectedCampanha && viewMode === "edit" && (
        <CampanhaFormModal
          campanha={selectedCampanha}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}

      {selectedCampanha && viewMode === "delete" && (
        <CampanhaDeleteDialog
          campanha={selectedCampanha}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}
    </div>
  );
}
