import { useState, useCallback, useEffect } from "react";
import { Calendar, Plus, Check, X, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useServicosMT } from "@/hooks/multitenant/useServicosMT";
import type { MTLead } from "@/types/lead-mt";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScheduleCardProps {
  leadId: string;
  lead?: MTLead | null;
  /** Pré-preencher formulário com serviço da venda recorrente */
  prefillServiceId?: string | null;
  prefillServiceName?: string | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentRow {
  id: string;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim?: string;
  status: string;
  servico_nome?: string;
  servico_id?: string;
  observacoes?: string;
  franchise?: {
    id: string;
    nome_fantasia?: string;
    nome?: string;
  } | null;
  service?: {
    id: string;
    nome: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pendente: { bg: "bg-amber-100", text: "text-amber-600", label: "Pendente" },
  agendado: { bg: "bg-blue-100", text: "text-blue-600", label: "Agendado" },
  confirmado: { bg: "bg-emerald-100", text: "text-emerald-600", label: "Confirmado" },
  em_atendimento: { bg: "bg-purple-100", text: "text-purple-600", label: "Em Atendimento" },
  concluido: { bg: "bg-gray-100", text: "text-gray-600", label: "Concluido" },
  cancelado: { bg: "bg-red-100", text: "text-red-600", label: "Cancelado" },
  nao_compareceu: { bg: "bg-orange-100", text: "text-orange-600", label: "Faltou" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-[#f0f2f5] rounded-lg p-2.5 space-y-1.5">
          <div className="h-4 w-28 rounded bg-white/60 animate-pulse" />
          <div className="h-3 w-20 rounded bg-white/60 animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ScheduleCard({ leadId, lead, prefillServiceId, prefillServiceName }: ScheduleCardProps) {
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formServiceId, setFormServiceId] = useState("");

  // Auto-abrir formulário e pré-preencher quando vem de uma venda com sessões
  useEffect(() => {
    if (prefillServiceId) {
      setShowForm(true);
      setFormServiceId(prefillServiceId);
    }
  }, [prefillServiceId]);

  // Fetch upcoming appointments for this lead
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["mt-appointments", "lead", leadId],
    queryFn: async () => {
      let q = supabase
        .from("mt_appointments")
        .select(
          "id, data_agendamento, hora_inicio, hora_fim, status, servico_nome, servico_id, observacoes, franchise:mt_franchises(id, nome_fantasia)"
        )
        .eq("lead_id", leadId);

      if (tenant) {
        q = q.eq("tenant_id", tenant.id);
      }

      const { data, error } = await q
        .gte("data_agendamento", new Date().toISOString().split("T")[0])
        .order("data_agendamento", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data || []) as AppointmentRow[];
    },
    enabled: !!leadId && !!tenant,
  });

  // Fetch services for the select
  const { data: servicesData } = useServicosMT({ is_active: true });
  const services = (servicesData || []).filter(
    (s: any) => s.disponivel_agendamento !== false
  );

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (input: {
      data_agendamento: string;
      hora_inicio: string;
      servico_id?: string;
      servico_nome?: string;
    }) => {
      const { error } = await supabase.from("mt_appointments").insert({
        lead_id: leadId,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id || null,
        cliente_nome: lead?.nome || "Sem nome",
        cliente_telefone: lead?.telefone || lead?.whatsapp || null,
        cliente_email: lead?.email || null,
        data_agendamento: input.data_agendamento,
        hora_inicio: input.hora_inicio,
        duracao_minutos: 60,
        status: "pendente",
        confirmado: false,
        is_recorrente: false,
        origem: "whatsapp_crm",
        servico_id: input.servico_id || null,
        servico_nome: input.servico_nome || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-appointments", "lead", leadId] });
      toast.success("Agendamento criado!");
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar agendamento: ${err.message}`);
    },
  });

  // Confirm appointment mutation
  const confirmAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_appointments")
        .update({
          status: "confirmado",
          confirmado: true,
          confirmado_em: new Date().toISOString(),
          confirmado_via: "whatsapp_crm",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-appointments", "lead", leadId] });
      toast.success("Agendamento confirmado!");
    },
  });

  // Cancel appointment mutation
  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_appointments")
        .update({
          status: "cancelado",
          cancelado_em: new Date().toISOString(),
          cancelado_por: "whatsapp_crm",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-appointments", "lead", leadId] });
      toast.success("Agendamento cancelado.");
    },
  });

  const resetForm = useCallback(() => {
    setShowForm(false);
    setFormDate("");
    setFormTime("");
    setFormServiceId("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formDate || !formTime) {
      toast.error("Preencha data e horario.");
      return;
    }

    const selectedService = services.find((s: any) => s.id === formServiceId);
    createAppointment.mutate({
      data_agendamento: formDate,
      hora_inicio: formTime,
      servico_id: formServiceId || undefined,
      servico_nome: selectedService?.nome || undefined,
    });
  }, [formDate, formTime, formServiceId, services, createAppointment]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const upcomingAppointments = appointments || [];
  const hasAppointments = upcomingAppointments.length > 0;
  const isMutating =
    createAppointment.isPending ||
    confirmAppointment.isPending ||
    cancelAppointment.isPending;

  return (
    <div className="space-y-2">
      {/* Empty state */}
      {!hasAppointments && !showForm && (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f2f5]">
            <Calendar className="h-5 w-5 text-[#667781]" />
          </div>
          <p className="text-xs text-[#667781] text-center">
            Nenhum agendamento futuro
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-[#00a884] hover:text-[#00a884]/80 hover:bg-[#00a884]/5 gap-1"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3 w-3" />
            Agendar
          </Button>
        </div>
      )}

      {/* Appointment list */}
      {hasAppointments && (
        <>
          {upcomingAppointments.map((apt) => {
            const statusCfg = getStatusConfig(apt.status);
            const canConfirm =
              apt.status === "pendente" || apt.status === "agendado";
            const canCancel =
              apt.status !== "cancelado" &&
              apt.status !== "concluido" &&
              apt.status !== "nao_compareceu";

            return (
              <div
                key={apt.id}
                className="bg-[#f0f2f5] rounded-lg p-2.5"
              >
                {/* Date and status */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111b21]">
                    {format(
                      new Date(apt.data_agendamento + "T00:00:00"),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}{" "}
                    as {apt.hora_inicio?.slice(0, 5)}
                  </span>
                  <span
                    className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${statusCfg.bg} ${statusCfg.text}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Service */}
                {apt.servico_nome && (
                  <p className="text-xs text-[#667781] truncate">
                    {apt.servico_nome}
                  </p>
                )}

                {/* Franchise */}
                {apt.franchise && (
                  <p className="text-xs text-[#667781] truncate">
                    {(apt.franchise as any).nome_fantasia || (apt.franchise as any).nome}
                  </p>
                )}

                {/* Action buttons */}
                {(canConfirm || canCancel) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {canConfirm && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => confirmAppointment.mutate(apt.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded px-2 py-1 transition-colors disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        Confirmar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => cancelAppointment.mutate(apt.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded px-2 py-1 transition-colors disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add button when list exists */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-[#00a884] hover:text-[#00a884]/80 hover:bg-[#00a884]/5 rounded py-1.5 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Novo agendamento
            </button>
          )}
        </>
      )}

      {/* New appointment form */}
      {showForm && (
        <div className="bg-[#f0f2f5] rounded-lg p-2.5 space-y-2">
          <p className="text-xs font-medium text-[#111b21] mb-1">
            Novo Agendamento
          </p>

          {/* Banner de serviço da venda */}
          {prefillServiceName && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
              <p className="text-[10px] text-emerald-600 font-medium">Agendar sessao da venda:</p>
              <p className="text-xs text-emerald-800 font-semibold">{prefillServiceName}</p>
            </div>
          )}

          {/* Date */}
          <Input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="h-8 text-xs bg-white border-[#e9edef]"
          />

          {/* Time */}
          <Input
            type="time"
            value={formTime}
            onChange={(e) => setFormTime(e.target.value)}
            className="h-8 text-xs bg-white border-[#e9edef]"
          />

          {/* Service select */}
          <Select value={formServiceId} onValueChange={setFormServiceId}>
            <SelectTrigger className="h-8 text-xs bg-white border-[#e9edef]">
              <SelectValue placeholder="Servico (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {services.map((svc: any) => (
                <SelectItem key={svc.id} value={svc.id} className="text-xs">
                  {svc.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createAppointment.isPending || !formDate || !formTime}
              className="h-7 text-xs bg-[#00a884] hover:bg-[#00a884]/90 text-white flex-1 gap-1"
            >
              {createAppointment.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetForm}
              disabled={createAppointment.isPending}
              className="h-7 text-xs text-[#667781]"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
