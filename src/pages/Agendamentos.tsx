import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  UserX,
  Filter,
  RefreshCw,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useAgendamentoMetricsAdapter } from "@/hooks/useAgendamentoMetricsAdapter";
import {
  AgendamentoWithDetails,
  AGENDAMENTO_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  AgendamentoStatus,
  AppointmentType,
} from "@/types/agendamento";
import { AgendamentoCard } from "@/components/agendamentos/AgendamentoCard";
import { AgendamentoKPICards } from "@/components/agendamentos/AgendamentoKPICards";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { toast } from "sonner";

export default function Agendamentos() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterServico, setFilterServico] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterProfissional, setFilterProfissional] = useState<string>("all");

  const { hasPermission } = useUserPermissions();
  const { agendamentos, isLoading, refetch, updateStatus, deleteAgendamento } = useAgendamentosAdapter();
  const { metrics } = useAgendamentoMetricsAdapter();

  // Extrair serviços e profissionais únicos dos agendamentos
  const servicosUnicos = useMemo(() => {
    const servicos = new Set<string>();
    agendamentos.forEach((a) => {
      const nome = a.servico || a.servico_nome;
      if (nome) servicos.add(nome);
    });
    return Array.from(servicos).sort();
  }, [agendamentos]);

  const profissionaisUnicos = useMemo(() => {
    const profissionais = new Map<string, string>();
    agendamentos.forEach((a) => {
      if (a.profissional_id && a.profissional_nome) {
        profissionais.set(a.profissional_id, a.profissional_nome);
      }
    });
    return Array.from(profissionais.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [agendamentos]);

  // Filtrar agendamentos
  const filteredAgendamentos = agendamentos.filter((a) => {
    // Filtro por data selecionada
    const agendamentoDate = parseISO(a.data_agendamento);
    if (!isSameDay(agendamentoDate, selectedDate)) return false;

    // Filtro por serviço
    if (filterServico !== "all") {
      const servicoNome = a.servico || a.servico_nome;
      if (servicoNome !== filterServico) return false;
    }

    // Filtro por profissional
    if (filterProfissional !== "all" && a.profissional_id !== filterProfissional) return false;

    // Filtro por status
    if (filterStatus !== "all" && a.status !== filterStatus) return false;

    // Filtro por tipo
    if (filterTipo !== "all" && ((a as Record<string, unknown>).tipo as string || 'avaliacao') !== filterTipo) return false;

    return true;
  });

  // Datas com agendamentos para destacar no calendário
  const datesWithAgendamentos = agendamentos.reduce((acc, a) => {
    const dateStr = a.data_agendamento;
    if (!acc.includes(dateStr)) acc.push(dateStr);
    return acc;
  }, [] as string[]);

  const handleEdit = (agendamento: AgendamentoWithDetails) => {
    navigate(`/agendamentos/${agendamento.id}/editar`);
  };

  const handleStatusChange = (id: string, status: AgendamentoStatus) => {
    if (!hasPermission('agendamentos.edit')) {
      toast.error('Você não tem permissão para alterar status de agendamentos');
      return;
    }
    updateStatus({ id, status });
  };

  const handleDelete = (id: string) => {
    if (!hasPermission('agendamentos.delete')) {
      toast.error('Você não tem permissão para excluir agendamentos');
      return;
    }
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
      deleteAgendamento(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Agendamentos
            </h1>
            <p className="text-muted-foreground">
              Gerencie os agendamentos de atendimento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {hasPermission('agendamentos.create') && (
              <Button onClick={() => navigate("/agendamentos/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <AgendamentoKPICards metrics={metrics} isLoading={isLoading} />

        {/* Main Content */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Calendar + Filters */}
          <div className="space-y-4">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Calendário</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-md"
                  modifiers={{
                    hasAgendamento: datesWithAgendamentos.map((d) => parseISO(d)),
                  }}
                  modifiersStyles={{
                    hasAgendamento: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      textUnderlineOffset: "4px",
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Serviço</label>
                  <Select value={filterServico} onValueChange={setFilterServico}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os serviços" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os serviços</SelectItem>
                      {servicosUnicos.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {profissionaisUnicos.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Profissional</label>
                    <Select value={filterProfissional} onValueChange={setFilterProfissional}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os profissionais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os profissionais</SelectItem>
                        {profissionaisUnicos.map(([id, nome]) => (
                          <SelectItem key={id} value={id}>
                            {nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {(Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full inline-block"
                              style={{ backgroundColor: APPOINTMENT_TYPE_COLORS[key] }}
                            />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {Object.entries(AGENDAMENTO_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agendamentos List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <Badge variant="secondary">
                  {filteredAgendamentos.length} agendamento{filteredAgendamentos.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredAgendamentos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nenhum agendamento para este dia</p>
                  <p className="text-sm">Clique em "Novo Agendamento" para criar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAgendamentos
                    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                    .map((agendamento) => (
                      <AgendamentoCard
                        key={agendamento.id}
                        agendamento={agendamento}
                        onEdit={handleEdit}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
