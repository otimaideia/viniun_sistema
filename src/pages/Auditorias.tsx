import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  TrendingUp,
  XCircle,
  User,
  Calendar,
  Phone,
} from "lucide-react";
import {
  useAuditoriasMT,
  AUDITORIA_STATUS_CONFIG,
  AUDITORIA_TIPO_LABELS,
  AUDITORIA_TIPO_COLORS,
  type AuditoriaStatus,
  type AuditoriaTipo,
} from "@/hooks/multitenant/useAuditoriasMT";
import { useUsersMT } from "@/hooks/multitenant/useUsersMT";

export default function Auditorias() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterAuditor, setFilterAuditor] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { auditorias, stats, isLoading, refetch } = useAuditoriasMT(
    filterStatus !== "all" || filterAuditor !== "all"
      ? {
          status: filterStatus !== "all" ? (filterStatus as AuditoriaStatus) : undefined,
          auditor_id: filterAuditor !== "all" ? filterAuditor : undefined,
        }
      : undefined
  );
  const { users } = useUsersMT({ is_active: true });

  // Filtrar localmente por tipo e busca
  const filtered = auditorias.filter((a) => {
    if (filterTipo !== "all" && a.tipo !== filterTipo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !a.cliente_nome?.toLowerCase().includes(q) &&
        !a.servico_nome?.toLowerCase().includes(q) &&
        !a.auditor_nome?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Auditorias
            </h1>
            <p className="text-muted-foreground">
              Acompanhamento e conversao de clientes em tratamento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={() => navigate("/auditorias/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Auditoria
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : stats.pendentes + stats.agendadas}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Realizadas</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : stats.realizadas}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Convertidas</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : stats.convertidas}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa Conversao</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : `${stats.taxa_conversao}%`}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, servico ou auditor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(AUDITORIA_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(AUDITORIA_TIPO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAuditor} onValueChange={setFilterAuditor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Auditor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os auditores</SelectItem>
                  {users?.map((u: { id: string; nome?: string }) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome_curto || u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-medium text-muted-foreground">Nenhuma auditoria encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Auditoria" para criar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((auditoria) => {
              const statusConfig = AUDITORIA_STATUS_CONFIG[auditoria.status];
              const tipoColor = AUDITORIA_TIPO_COLORS[auditoria.tipo];
              return (
                <Card
                  key={auditoria.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/auditorias/${auditoria.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base truncate">
                            {auditoria.cliente_nome}
                          </h3>
                          <Badge
                            style={{ backgroundColor: `${tipoColor}20`, color: tipoColor, borderColor: `${tipoColor}40` }}
                            className="border text-xs"
                          >
                            {AUDITORIA_TIPO_LABELS[auditoria.tipo]}
                          </Badge>
                          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs`}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {auditoria.servico_nome && (
                            <span className="flex items-center gap-1">
                              <ClipboardCheck className="h-3.5 w-3.5" />
                              {auditoria.servico_nome}
                            </span>
                          )}
                          {auditoria.sessao_atual != null && auditoria.total_sessoes != null && (
                            <span className="flex items-center gap-1">
                              Sessao {auditoria.sessao_atual}/{auditoria.total_sessoes}
                            </span>
                          )}
                          {auditoria.data_agendada && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(auditoria.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                              {auditoria.hora_agendada && ` ${auditoria.hora_agendada}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {auditoria.auditor_nome && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Auditor: {auditoria.auditor_nome}
                            </span>
                          )}
                          {auditoria.consultora_nome && (
                            <span>Consultora: {auditoria.consultora_nome}</span>
                          )}
                          {auditoria.cliente_telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {auditoria.cliente_telefone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
}
