import { useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Lead, LeadStatus, STATUS_OPTIONS, STATUS_CONFIG } from "@/types/lead-mt";
import { StatusSelect } from "./StatusSelect";
import { QuickActionButtons } from "./QuickActionButtons";
import { ResponsibleSelect } from "./ResponsibleSelect";
import { LastActionCell } from "./LastActionCell";
import { LeadHistoryDrawer } from "./LeadHistoryDrawer";
// REMOVIDO: LeadFormModal - seguindo padrão de navegação por URL (CLAUDE.md)
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, MessageCircle, ArrowUpDown, Pencil, Trash2, CalendarPlus, Users, X, CheckSquare } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cleanPhoneNumber, formatPhoneForTable } from "@/utils/phone";
import { ptBR } from "date-fns/locale";

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-pink-500", "bg-purple-500", "bg-blue-500", "bg-cyan-500",
  "bg-teal-500", "bg-green-500", "bg-orange-500", "bg-red-500",
  "bg-indigo-500", "bg-amber-500",
];

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    // Array.from trata surrogate pairs (emojis) corretamente
    const first = Array.from(parts[0])[0] || "?";
    return /\d/.test(first) ? "#" : first.toUpperCase();
  }
  const a = Array.from(parts[0])[0] || "";
  const b = Array.from(parts[parts.length - 1])[0] || "";
  return (a + b).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const LeadAvatar = memo(function LeadAvatar({ nome, fotoUrl }: { nome: string; fotoUrl?: string | null }) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-border"
        onError={(e) => {
          // Se a imagem falhar, esconde e mostra iniciais
          (e.target as HTMLImageElement).style.display = "none";
          const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
          if (next) next.style.display = "flex";
        }}
      />
    );
  }
  const color = getAvatarColor(nome);
  const initials = getInitials(nome);
  return (
    <div
      className={`h-7 w-7 rounded-full ${color} shrink-0 flex items-center justify-center`}
    >
      <span className="text-[10px] font-semibold text-white leading-none">{initials}</span>
    </div>
  );
});
// ─────────────────────────────────────────────────────────────────────────────

// Helper para formatar datas com segurança
const safeFormat = (dateValue: string | null | undefined, formatStr: string): string => {
  if (!dateValue) return '-';
  const date = parseISO(dateValue);
  return isValid(date) ? format(date, formatStr, { locale: ptBR }) : '-';
};
import { toast } from "sonner";
import { useResponsibleUsersAdapter } from "@/hooks/useResponsibleUsersAdapter";
import { useLeadHistoryAdapter } from "@/hooks/useLeadsAdapter";
import { ExtendedLead } from "@/hooks/useLeadsAdapter";
import { useWhatsAppUnreadByLeadMT } from "@/hooks/multitenant/useWhatsAppUnreadByLeadMT";

interface LeadsTableProps {
  leads: ExtendedLead[];
  onStatusChange: (id: string, status: LeadStatus, lead_source?: "geral" | "promocao") => void;
  onUpdateLead: (lead: ExtendedLead) => void;
  onDeleteLead?: (id: string, lead_source?: "geral" | "promocao") => void;
  onScheduleLead?: (lead: ExtendedLead) => void;
  onBulkStatusChange?: (ids: string[], status: LeadStatus) => void;
  onBulkDelete?: (ids: string[]) => void;
}

type SortField = "nome" | "created_at" | "status";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 25;

export function LeadsTable({ leads, onStatusChange, onUpdateLead, onDeleteLead, onScheduleLead, onBulkStatusChange, onBulkDelete }: LeadsTableProps) {
  const navigate = useNavigate();
  const [selectedLead, setSelectedLead] = useState<ExtendedLead | null>(null);
  // REMOVIDO: editingLead - agora usa navegação por URL
  const [deletingLead, setDeletingLead] = useState<ExtendedLead | null>(null);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { users: responsibleUsers, assignResponsible } = useResponsibleUsersAdapter();
  const { recordHistory } = useLeadHistoryAdapter();
  const { unreadByLead } = useWhatsAppUnreadByLeadMT();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let comparison = 0;
      if (sortField === "nome") {
        comparison = (a.nome || '').localeCompare(b.nome || '');
      } else if (sortField === "created_at") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
      } else if (sortField === "status") {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [leads, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = sortedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleWhatsApp = (lead: ExtendedLead) => {
    const cleanPhone = cleanPhoneNumber(lead.telefone);
    const codigoPais = lead.whatsapp_codigo_pais || lead.telefone_codigo_pais || '55';
    const primeiroNome = lead.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Olá ${primeiroNome}! 😊 Tudo bem? Aqui é da YESlaser! Vi que você demonstrou interesse nos nossos tratamentos. Posso te ajudar com mais informações?`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  const handleQuickStatusChange = async (lead: ExtendedLead, newStatus: LeadStatus) => {
    setUpdatingLeadId(lead.id);
    
    try {
      // Update status first (most important action)
      onStatusChange(lead.id, newStatus, lead.lead_source);

      // Try to record history, but don't block on failure
      recordHistory({
        leadId: lead.id,
        actionType: getActionTypeFromStatus(newStatus),
        actionDescription: getActionDescriptionFromStatus(lead.status, newStatus),
        oldValue: lead.status,
        newValue: newStatus,
      }).catch((error) => {
        console.warn("Histórico não registrado:", error);
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleResponsibleChange = (lead: ExtendedLead, newResponsibleId: string | null) => {
    const currentResponsible = responsibleUsers.find(u => u.id === lead.responsible_id);
    assignResponsible({
      leadId: lead.id,
      responsibleId: newResponsibleId,
      previousResponsibleName: currentResponsible?.name,
    });
  };

  const getActionTypeFromStatus = (status: LeadStatus): string => {
    switch (status) {
      case "contato":
        return "ligacao";
      case "agendado":
        return "agendamento";
      case "confirmado":
      case "atendido":
        return "status_change";
      case "convertido":
        return "conversao";
      case "perdido":
      case "cancelado":
        return "perda";
      default:
        return "status_change";
    }
  };

  const getActionDescriptionFromStatus = (oldStatus: LeadStatus, newStatus: LeadStatus): string => {
    const STATUS_LABELS: Record<string, string> = {
      novo: "Novo",
      contato: "Em Contato",
      agendado: "Agendado",
      confirmado: "Confirmado",
      atendido: "Atendido",
      convertido: "Convertido",
      perdido: "Perdido",
      cancelado: "Cancelado",
      aguardando: "Aguardando",
      recontato: "Recontato",
    };
    const oldLabel = STATUS_LABELS[oldStatus] || oldStatus;
    const newLabel = STATUS_LABELS[newStatus] || newStatus;

    switch (newStatus) {
      case "contato":
        return "Contato iniciado";
      case "agendado":
        return "Avaliação agendada";
      case "confirmado":
        return "Presença confirmada";
      case "atendido":
        return "Atendimento realizado";
      case "convertido":
        return "Lead convertido em cliente";
      default:
        return `Status alterado de "${oldLabel}" para "${newLabel}"`;
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const getResponsibleName = (responsibleId: string | null | undefined) => {
    if (!responsibleId) return undefined;
    return responsibleUsers.find(u => u.id === responsibleId)?.name;
  };

  // Bulk selection helpers
  const allPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id));
  const somePageSelected = paginatedLeads.some(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      paginatedLeads.forEach(l => newSet.delete(l.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedLeads.forEach(l => newSet.add(l.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = (status: LeadStatus) => {
    if (onBulkStatusChange) {
      onBulkStatusChange(Array.from(selectedIds), status);
      clearSelection();
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
      setBulkDeleting(false);
    }
  };

  return (
    <>
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 mb-2 rounded-lg border bg-primary/5 border-primary/20 p-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select onValueChange={(v) => handleBulkStatusChange(v as LeadStatus)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Alterar status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status} className={`text-xs font-medium ${STATUS_CONFIG[status]?.color || ""}`}>
                    {STATUS_CONFIG[status]?.label || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleting(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[40px] px-2">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todos"
                    className={somePageSelected && !allPageSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none min-w-[120px]"
                  onClick={() => handleSort("nome")}
                >
                  <div className="flex items-center gap-1">
                    Nome
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead className="hidden md:table-cell">Unidade</TableHead>
                <TableHead className="hidden xl:table-cell">Responsável</TableHead>
                <TableHead 
                  className="cursor-pointer select-none w-[100px]"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1 text-xs">
                    Status
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="hidden 2xl:table-cell text-xs">Última Ação</TableHead>
                <TableHead 
                  className="hidden sm:table-cell cursor-pointer select-none"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1 text-xs">
                    Data
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-40">
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Nenhum lead encontrado</p>
                      <p className="text-xs text-muted-foreground">Tente ajustar os filtros ou crie um novo lead</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paginatedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={`group cursor-pointer hover:bg-muted/50 ${selectedIds.has(lead.id) ? "bg-primary/5" : ""}`}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <TableCell className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                      aria-label={`Selecionar ${lead.nome}`}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <LeadAvatar nome={lead.nome} fotoUrl={(lead as any).foto_url} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm truncate max-w-[150px] hover:text-primary">
                            {lead.nome}
                          </p>
                          {lead.lead_source === "promocao" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200 shrink-0">
                              LP
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground lg:hidden">{formatPhoneForTable(lead.telefone, lead.telefone_codigo_pais || '55')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-2">
                    <div className="space-y-0">
                      <p className="text-sm">{formatPhoneForTable(lead.telefone, lead.telefone_codigo_pais || '55')}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[100px] block">{lead.unidade}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell py-2">
                    <ResponsibleSelect
                      value={lead.responsible_id || null}
                      users={responsibleUsers}
                      onValueChange={(userId) => handleResponsibleChange(lead, userId)}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <StatusSelect 
                      value={lead.status} 
                      onValueChange={(status) => handleQuickStatusChange(lead, status)} 
                    />
                  </TableCell>
                  <TableCell className="hidden 2xl:table-cell py-2">
                    <LastActionCell
                      actionType={lead.last_action_type || null}
                      actionTimestamp={lead.last_action_timestamp || null}
                    />
                  </TableCell>
                  <TableCell
                    className="hidden sm:table-cell text-xs text-muted-foreground py-2"
                    title={safeFormat(lead.created_at, "dd/MM/yyyy 'às' HH:mm")}
                  >
                    {safeFormat(lead.created_at, "dd/MM/yy")}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <QuickActionButtons
                        currentStatus={lead.status}
                        onStatusChange={(status) => handleQuickStatusChange(lead, status)}
                        isUpdating={updatingLeadId === lead.id}
                        compact
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedLead(lead)}
                        title="Ver histórico"
                        aria-label={`Ver histórico de ${lead.nome}`}
                      >
                        <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/leads/${lead.id}/editar`)}
                        title="Editar lead"
                        aria-label={`Editar ${lead.nome}`}
                      >
                        <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                      {onScheduleLead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-primary"
                          onClick={() => onScheduleLead(lead)}
                          title="Agendar avaliação"
                          aria-label={`Agendar avaliação para ${lead.nome}`}
                        >
                          <CalendarPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      )}
                      {onDeleteLead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingLead(lead)}
                          title="Excluir lead"
                          aria-label={`Excluir ${lead.nome}`}
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      )}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-7 sm:w-7 text-success hover:text-success hover:bg-success/10"
                          onClick={() => handleWhatsApp(lead)}
                          title="WhatsApp"
                          aria-label={`Enviar WhatsApp para ${lead.nome}`}
                        >
                          <MessageCircle className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        {unreadByLead.get(lead.id) && (
                          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                            {unreadByLead.get(lead.id)!.unread_count > 9 ? '9+' : unreadByLead.get(lead.id)!.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border px-4 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((page, idx) => (
                  <PaginationItem key={idx}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <LeadHistoryDrawer
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onStatusChange={onStatusChange}
        onUpdateLead={onUpdateLead}
        responsibleName={getResponsibleName(selectedLead?.responsible_id)}
      />

      {/* REMOVIDO: LeadFormModal - agora usa navegação por URL /leads/:id/editar */}

      <AlertDialog open={!!deletingLead} onOpenChange={(open) => !open && setDeletingLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead "{deletingLead?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingLead && onDeleteLead) {
                  onDeleteLead(deletingLead.id, deletingLead.lead_source);
                  setDeletingLead(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleting} onOpenChange={setBulkDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} leads</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
