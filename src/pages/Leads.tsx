import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LeadStatus, STATUS_CONFIG } from "@/types/lead-mt";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { useResponsibleUsersAdapter } from "@/hooks/useResponsibleUsersAdapter";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlobalFilters } from "@/components/dashboard/GlobalFilters";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ExtendedLead, spreadDadosExtras } from "@/hooks/useLeadsAdapter";
import { DuplicateLeadsModal } from "@/components/leads/DuplicateLeadsModal";

const Leads = () => {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { hasPermission, canAccess } = useUserPermissions();

  // Hook adapter que escolhe automaticamente entre legacy e multi-tenant
  const {
    leads: rawLeads,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatusMutation,
    updateLead: updateLeadMutation,
    deleteLead: deleteLeadMutation
  } = useLeadsAdapter();

  // Converter para array com dados_extras espalhados
  const leads = useMemo(() => (rawLeads || []).map(lead => spreadDadosExtras(lead)), [rawLeads]);

  const { users: responsibleUsers } = useResponsibleUsersAdapter();
  const { createAgendamento, isCreating: isCreatingAgendamento } = useAgendamentosAdapter();
  const { franqueados } = useFranqueadosAdapter();

  // Global filters state
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [origemFilter, setOrigemFilter] = useState<string>("all");
  const [cidadeFilter, setCidadeFilter] = useState<string>("all");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("all");
  const [tableSearch, setTableSearch] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false);

  // Quick schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedulingLead, setSchedulingLead] = useState<ExtendedLead | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // Estado para controlar refresh manual
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Função de refresh com controle de estado
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Derived data
  const origens = useMemo(() =>
    [...new Set(leads.map(lead => lead.origem).filter(Boolean))].sort(),
    [leads]
  );

  const cidades = useMemo(() =>
    [...new Set(leads.map(lead => lead.cidade).filter(Boolean))].sort(),
    [leads]
  );

  // Filter unidades based on selected cidade
  const unidades = useMemo(() => {
    const filteredLeads = cidadeFilter === "all"
      ? leads
      : leads.filter(lead => lead.cidade === cidadeFilter);
    return [...new Set(filteredLeads.map(lead => lead.unidade).filter(Boolean))].sort();
  }, [leads, cidadeFilter]);

  // Reset unidade filter when cidade changes and current unidade is not in the new list
  const handleCidadeFilterChange = (value: string) => {
    setCidadeFilter(value);
    if (value !== "all") {
      const newUnidades = leads.filter(lead => lead.cidade === value).map(l => l.unidade);
      if (!newUnidades.includes(unidadeFilter)) {
        setUnidadeFilter("all");
      }
    }
  };

  // Apply all filters to leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Status filter
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      // Origem filter
      const matchesOrigem = origemFilter === "all" || lead.origem === origemFilter;

      // Cidade filter
      const matchesCidade = cidadeFilter === "all" || lead.cidade === cidadeFilter;

      // Unidade filter
      const matchesUnidade = unidadeFilter === "all" || lead.unidade === unidadeFilter;

      // Responsible filter
      const matchesResponsible = responsibleFilter === "all" || lead.responsible_id === responsibleFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange) {
        const leadDate = new Date(lead.created_at);
        matchesDateRange = leadDate >= dateRange.start && leadDate <= dateRange.end;
      }

      // Table search filter
      let matchesSearch = true;
      if (tableSearch) {
        const searchLower = tableSearch.toLowerCase();
        matchesSearch =
          lead.nome?.toLowerCase().includes(searchLower) ||
          lead.telefone?.includes(tableSearch) ||
          lead.email?.toLowerCase().includes(searchLower);
      }

      return matchesStatus && matchesOrigem && matchesCidade && matchesUnidade && matchesResponsible && matchesDateRange && matchesSearch;
    });
  }, [leads, statusFilter, origemFilter, cidadeFilter, unidadeFilter, responsibleFilter, dateRange, tableSearch]);

  const handleStatusChange = (id: string, status: LeadStatus, lead_source?: "geral" | "promocao") => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleUpdateLead = (updatedLead: ExtendedLead) => {
    updateLeadMutation.mutate({ id: updatedLead.id, ...updatedLead });
  };

  const handleDeleteLead = (id: string, lead_source?: "geral" | "promocao") => {
    if (!hasPermission('leads.delete')) {
      toast.error('Você não tem permissão para excluir leads');
      return;
    }
    deleteLeadMutation.mutate(id);
  };

  const handleScheduleLead = (lead: ExtendedLead) => {
    setSchedulingLead(lead);
    setScheduleDate(new Date());
    setScheduleTime("09:00");
    setScheduleModalOpen(true);
  };

  const handleConfirmSchedule = () => {
    if (!schedulingLead) return;

    // Encontrar a unidade do lead
    const franqueado = franqueados.find(
      (f) =>
        f.id === schedulingLead.franqueado_id ||
        f.nome_fantasia?.toLowerCase() === schedulingLead.unidade?.toLowerCase()
    );

    const payload = {
      nome_lead: schedulingLead.nome,
      telefone_lead: schedulingLead.telefone || null,
      email_lead: schedulingLead.email || null,
      data_agendamento: format(scheduleDate, "yyyy-MM-dd"),
      hora_inicio: scheduleTime,
      hora_fim: null,
      unidade_id: franqueado?.id || null,
      servico: schedulingLead.servico || "Avaliação",
      status: "agendado" as const,
      observacoes: null,
      responsavel_id: schedulingLead.responsible_id || null,
      lead_id: schedulingLead.id,
      lead_type: "geral" as const,
    };

    createAgendamento(payload);

    // Atualizar status do lead para "Avaliação Agendada"
    updateStatusMutation.mutate({ id: schedulingLead.id, status: "agendado" });

    toast.success("Agendamento criado com sucesso!");
    setScheduleModalOpen(false);
    setSchedulingLead(null);
  };

  const handleBulkStatusChange = (ids: string[], status: LeadStatus) => {
    ids.forEach(id => {
      updateStatusMutation.mutate({ id, status });
    });
    toast.success(`Status de ${ids.length} lead${ids.length > 1 ? "s" : ""} atualizado para "${status}"`);
  };

  const handleBulkDelete = (ids: string[]) => {
    if (!hasPermission('leads.delete')) {
      toast.error('Você não tem permissão para excluir leads');
      return;
    }
    ids.forEach(id => {
      deleteLeadMutation.mutate(id);
    });
    toast.success(`${ids.length} lead${ids.length > 1 ? "s" : ""} excluído${ids.length > 1 ? "s" : ""}`);
  };

  const handleDownloadCSV = () => {
    const headers = ["Nome", "Sobrenome", "Telefone", "Email", "Unidade", "Cidade", "Estado", "Status", "Interesse", "Origem", "Gênero", "Responsável", "Data Criação", "Última Atualização"];
    const rows = filteredLeads.map((lead) => {
      const responsavel = responsibleUsers.find(u => u.id === lead.responsible_id);
      return [
        lead.nome,
        lead.sobrenome || "",
        lead.telefone,
        lead.email,
        lead.unidade,
        lead.cidade,
        lead.estado || "",
        STATUS_CONFIG[lead.status]?.label || lead.status,
        lead.interesse || "",
        lead.origem,
        lead.genero || "",
        responsavel?.name || "",
        new Date(lead.created_at).toLocaleDateString("pt-BR"),
        lead.updated_at ? new Date(lead.updated_at).toLocaleDateString("pt-BR") : "",
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell || ""}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Header skeleton */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
            {/* Search skeleton */}
            <Skeleton className="h-10 w-full sm:w-80" />
            {/* Filters skeleton */}
            <Skeleton className="h-14 rounded-xl" />
            {/* Table skeleton */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex gap-4">
                {[120, 100, 80, 100, 140, 80, 100].map((w, i) => (
                  <Skeleton key={i} className="h-4" style={{ width: w }} />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-t border-border flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24 hidden lg:block" />
                  <Skeleton className="h-4 w-20 hidden md:block" />
                  <Skeleton className="h-6 w-20 hidden xl:block rounded-full" />
                  <Skeleton className="h-7 w-32 rounded" />
                  <Skeleton className="h-4 w-16 hidden sm:block" />
                  <div className="ml-auto flex gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Erro ao carregar leads</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
            </p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Listagem de Leads</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredLeads.length} de {leads.length} leads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDuplicatesModalOpen(true)}
                  className="h-9"
                  title="Analisar leads duplicados"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicados
                </Button>
                {hasPermission('leads.create') && (
                  <Button
                    onClick={() => navigate("/leads/novo")}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lead
                  </Button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {/* Global Filters */}
            <GlobalFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              origemFilter={origemFilter}
              onOrigemFilterChange={setOrigemFilter}
              cidadeFilter={cidadeFilter}
              onCidadeFilterChange={handleCidadeFilterChange}
              unidadeFilter={unidadeFilter}
              onUnidadeFilterChange={setUnidadeFilter}
              responsibleFilter={responsibleFilter}
              onResponsibleFilterChange={setResponsibleFilter}
              responsibleUsers={responsibleUsers}
              origens={origens}
              cidades={cidades}
              unidades={unidades}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onDownloadCSV={handleDownloadCSV}
            />

            {/* Leads Table */}
            <LeadsTable
              leads={filteredLeads}
              onStatusChange={handleStatusChange}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onScheduleLead={handleScheduleLead}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkDelete={hasPermission('leads.delete') ? handleBulkDelete : undefined}
            />

            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Mostrando {filteredLeads.length} de {leads.length} leads
            </p>

            {/* Duplicate Leads Modal */}
            <DuplicateLeadsModal
              open={duplicatesModalOpen}
              onOpenChange={setDuplicatesModalOpen}
              leads={leads}
            />

            {/* Quick Schedule Modal */}
            <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Agendar Avaliação
                  </DialogTitle>
                </DialogHeader>

                {schedulingLead && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">{schedulingLead.nome}</p>
                      <p className="text-sm text-muted-foreground">{schedulingLead.telefone}</p>
                      {schedulingLead.unidade && (
                        <p className="text-xs text-muted-foreground mt-1">{schedulingLead.unidade}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Data do Agendamento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduleDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduleDate}
                            onSelect={(date) => date && setScheduleDate(date)}
                            locale={ptBR}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirmSchedule} disabled={isCreatingAgendamento}>
                        {isCreatingAgendamento && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar Agendamento
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
