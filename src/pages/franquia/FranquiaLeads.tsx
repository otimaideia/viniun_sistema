import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Users,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  novo: { label: "Novo", color: "bg-blue-600", icon: Clock },
  em_contato: { label: "Em Contato", color: "bg-amber-600", icon: Phone },
  agendado: { label: "Agendado", color: "bg-purple-600", icon: Clock },
  convertido: { label: "Convertido", color: "bg-green-600", icon: CheckCircle2 },
  ganho: { label: "Ganho", color: "bg-green-600", icon: CheckCircle2 },
  perdido: { label: "Perdido", color: "bg-red-600", icon: XCircle },
};

const FranquiaLeads = () => {
  const { profile } = useUserProfileAdapter();
  const { franchise } = useTenantContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // Usa o adapter que automaticamente escolhe entre legacy e MT
  // No MT, o contexto de franchise é aplicado automaticamente via RLS
  const { leads, isLoading } = useLeadsAdapter({
    // O filtro franchise_id é aplicado automaticamente no MT via contexto
    // No legacy, o adapter ainda usa a query interna que filtra por franqueado
  });

  // Calcular estatísticas
  const stats = useMemo(() => ({
    total: leads.length,
    novos: leads.filter((l: any) => l.status === "novo" || !l.status).length,
    emContato: leads.filter((l: any) => l.status === "em_contato" || l.status === "contato").length,
    convertidos: leads.filter((l: any) => l.status === "convertido" || l.status === "ganho").length,
  }), [leads]);

  const filteredLeads = useMemo(() => leads.filter((lead: any) => {
    const matchesSearch =
      !search ||
      lead.nome?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.telefone?.includes(search);

    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "novos" && (!lead.status || lead.status === "novo")) ||
      (statusFilter === "em_contato" && (lead.status === "em_contato" || lead.status === "contato")) ||
      (statusFilter === "convertidos" && (lead.status === "convertido" || lead.status === "ganho"));

    return matchesSearch && matchesStatus;
  }), [leads, search, statusFilter]);

  // Verifica se o usuário tem acesso à franquia (no legacy usa profile, no MT usa franchise)
  const hasFranchiseAccess = profile?.franqueado_id || franchise?.id;

  if (!hasFranchiseAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meus Leads</h1>
        <p className="text-muted-foreground">
          Gerencie os leads da sua unidade
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.total || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Novos</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">{stats.novos || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600">{stats.emContato || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{stats.convertidos || 0}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="novos">Novos</TabsTrigger>
                <TabsTrigger value="em_contato">Em Contato</TabsTrigger>
                <TabsTrigger value="convertidos">Convertidos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum lead encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map((lead) => {
                const status = statusConfig[lead.status || "novo"] || statusConfig.novo;
                const StatusIcon = status.icon;

                return (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{lead.nome}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                            {lead.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.telefone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {lead.servico_interesse && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          Interesse: <span className="text-foreground">{lead.servico_interesse}</span>
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Mostrando {filteredLeads.length} de {leads.length} leads
      </p>
    </div>
  );
};

export default FranquiaLeads;
