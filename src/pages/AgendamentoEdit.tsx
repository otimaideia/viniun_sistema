import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import { useUsersMT } from "@/hooks/multitenant/useUsersMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Agendamento,
  AppointmentType,
  AGENDAMENTO_STATUS_OPTIONS,
  AGENDAMENTO_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_DESCRIPTIONS,
} from "@/types/agendamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Calendar, ClipboardCheck, Heart, Stethoscope, AlertTriangle, Search, User, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

// Helper para adicionar minutos ao horário
const addMinutesToTime = (time: string, minutes: number): string => {
  if (!time) return "";
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
};

const TIPO_ICONS: Record<AppointmentType, typeof Calendar> = {
  avaliacao: Stethoscope,
  procedimento_fechado: ClipboardCheck,
  cortesia: Heart,
};

interface SelectedLead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface LeadVenda {
  id: string;
  numero_venda: string;
  valor_total: number;
  status: string;
  created_at: string;
  items: string[];
}

interface TreatmentSession {
  id: string;
  treatment_plan_id: string;
  numero_sessao: number;
  status: string;
  data_prevista: string | null;
  profissional_nome: string | null;
  total_sessoes: number;
  sessoes_concluidas: number;
}

interface SaleRow {
  id: string;
  numero_venda: string;
  valor_total: number;
  status: string;
  created_at: string;
}

interface SaleItemRow {
  descricao: string;
}

interface TreatmentPlanRow {
  id: string;
  service_id: string | null;
  total_sessoes: number;
  sessoes_concluidas: number;
  status: string;
}

interface TreatmentSessionRow {
  id: string;
  treatment_plan_id: string;
  numero_sessao: number;
  status: string;
  data_prevista: string | null;
  profissional_nome: string | null;
}

// Tipo para o franqueado retornado pelo adapter
interface FranqueadoOption {
  id: string;
  nome_fantasia: string;
  franchise_id?: string;
}

// Tipo para serviço
interface ServicoOption {
  id: string;
  nome: string;
  ativo?: boolean;
}

// Tipo para vinculo franqueado-serviço
interface FranqueadoServicoVinculo {
  franqueado_id: string;
  servico_id: string;
}

// Tipo para dados do agendamento expandido
interface AgendamentoExpanded extends Agendamento {
  nome_lead?: string | null;
  telefone_lead?: string | null;
  email_lead?: string | null;
  profissional_id?: string | null;
  profissional_nome?: string | null;
  consultora_id?: string | null;
  consultora_nome?: string | null;
  venda_id?: string | null;
  treatment_session_id?: string | null;
  cortesia_motivo?: string | null;
  sessao_numero?: number | null;
  total_sessoes?: number | null;
}

// Tipo para lead retornado pela busca
interface LeadSearchResult {
  id: string;
  nome: string;
  name?: string;
  telefone?: string | null;
  phone?: string | null;
  email?: string | null;
  temperatura?: string | null;
}

interface FormState {
  tipo: AppointmentType;
  lead_id: string | null;
  nome_lead: string;
  telefone_lead: string;
  email_lead: string;
  data_agendamento: string;
  hora_inicio: string;
  hora_fim: string;
  unidade_id: string | null;
  profissional_id: string | null;
  servicos: string[];
  status: Agendamento["status"];
  observacoes: string;
  lead_type: "geral" | "promocao";
  consultora_id: string | null;
  // Procedimento Fechado
  venda_id: string | null;
  treatment_session_id: string | null;
  // Cortesia
  cortesia_motivo: string;
  sessao_numero: number;
  total_sessoes: number;
}

export default function AgendamentoEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { franchise, accessLevel } = useTenantContext();
  const { user } = useAuth();
  const { agendamentos, isLoading, createAgendamento, updateAgendamento, isCreating, isUpdating } = useAgendamentosAdapter();
  const { franqueados } = useFranqueadosAdapter();
  const { servicos, franchiseServices: franqueadoServicos } = useServicosAdapter();

  // Usuários MT (profissionais e consultoras)
  const { users } = useUsersMT({ is_active: true });

  // Pre-fill from query params (e.g. from LeadDetail "Agendar" button)
  const prefilledLeadNome = searchParams.get("lead_nome") || "";
  const prefilledLeadId = searchParams.get("lead_id") || "";
  const prefilledLeadTelefone = searchParams.get("lead_telefone") || "";
  const prefilledLeadEmail = searchParams.get("lead_email") || "";
  const prefilledTipo = (searchParams.get("tipo") as AppointmentType) || "avaliacao";
  const prefilledVendaId = searchParams.get("venda_id") || "";

  // Lead search state
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(
    prefilledLeadId
      ? { id: prefilledLeadId, nome: decodeURIComponent(prefilledLeadNome), telefone: prefilledLeadTelefone || null, email: prefilledLeadEmail || null }
      : null
  );
  const leadSearchRef = useRef<HTMLDivElement>(null);

  // Vendas do lead selecionado (para tipo procedimento_fechado)
  const [leadVendas, setLeadVendas] = useState<LeadVenda[]>([]);
  const [isLoadingVendas, setIsLoadingVendas] = useState(false);

  // Treatment sessions da venda selecionada
  const [treatmentSessions, setTreatmentSessions] = useState<TreatmentSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Buscar leads para o combobox
  const { leads: allLeads, isLoading: isLoadingLeads } = useLeadsMT(
    leadSearch.length >= 2 ? { search: leadSearch } : undefined
  );

  // Encontrar o usuário logado na lista (precisa estar antes dos useEffects)
  const currentUser = useMemo(() => {
    if (!users || !user) return null;
    return users.find((u) => u.email === user.email);
  }, [users, user]);

  // Determinar unidade padrão
  const defaultUnidadeId = useMemo(() => {
    if (accessLevel === 'franchise' && franchise?.id) {
      // Encontrar o franqueado correspondente à franchise do contexto
      const match = franqueados.find(f =>
        f.id === franchise.id || f.franchise_id === franchise.id
      );
      return match?.id || franchise.id;
    }
    return null;
  }, [accessLevel, franchise, franqueados]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leadSearchRef.current && !leadSearchRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [form, setForm] = useState<FormState>({
    tipo: prefilledTipo,
    lead_id: prefilledLeadId || null,
    nome_lead: prefilledLeadNome ? decodeURIComponent(prefilledLeadNome) : "",
    telefone_lead: prefilledLeadTelefone || "",
    email_lead: prefilledLeadEmail || "",
    data_agendamento: "",
    hora_inicio: "",
    hora_fim: "",
    unidade_id: null, // será setado no useEffect abaixo
    profissional_id: null,
    consultora_id: null, // será auto-preenchido com usuário logado
    servicos: [],
    status: "agendado",
    observacoes: "",
    lead_type: "geral",
    venda_id: prefilledVendaId || null,
    treatment_session_id: null,
    cortesia_motivo: "",
    sessao_numero: 1,
    total_sessoes: 10,
  });

  // Pré-selecionar unidade quando franquia logada
  useEffect(() => {
    if (!isEditing && defaultUnidadeId && !form.unidade_id) {
      setForm((f) => ({ ...f, unidade_id: defaultUnidadeId }));
    }
  }, [defaultUnidadeId, isEditing, form.unidade_id]);

  // Auto-preencher consultora com o usuário logado
  useEffect(() => {
    if (!isEditing && currentUser && !form.consultora_id) {
      setForm((f) => ({ ...f, consultora_id: currentUser.id }));
    }
  }, [currentUser, isEditing, form.consultora_id]);

  const agendamento = agendamentos.find(a => a.id === id);

  // Buscar vendas do lead quando selecionado (para procedimento_fechado)
  useEffect(() => {
    const fetchVendas = async () => {
      if (!selectedLead?.id || form.tipo !== 'procedimento_fechado') {
        setLeadVendas([]);
        return;
      }

      setIsLoadingVendas(true);
      try {
        const { data: vendas, error } = await supabase
          .from('mt_sales')
          .select('id, numero_venda, valor_total, status, created_at')
          .eq('lead_id', selectedLead.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Buscar itens de cada venda
        const vendasWithItems: LeadVenda[] = [];
        for (const venda of ((vendas || []) as SaleRow[])) {
          const { data: items } = await supabase
            .from('mt_sale_items')
            .select('descricao')
            .eq('sale_id', venda.id);

          vendasWithItems.push({
            ...venda,
            items: ((items || []) as SaleItemRow[]).map(i => i.descricao).filter(Boolean),
          });
        }

        setLeadVendas(vendasWithItems);
      } catch (err) {
        console.error('Erro ao buscar vendas do lead:', err);
      } finally {
        setIsLoadingVendas(false);
      }
    };

    fetchVendas();
  }, [selectedLead?.id, form.tipo]);

  // Buscar treatment sessions quando venda é selecionada
  useEffect(() => {
    const fetchSessions = async () => {
      if (!form.venda_id || form.tipo !== 'procedimento_fechado') {
        setTreatmentSessions([]);
        return;
      }

      setIsLoadingSessions(true);
      try {
        // Buscar treatment plans da venda
        const { data: plans } = await supabase
          .from('mt_treatment_plans')
          .select('id, service_id, total_sessoes, sessoes_concluidas, status')
          .eq('sale_id', form.venda_id)
          .is('deleted_at', null);

        if (!plans || plans.length === 0) {
          setTreatmentSessions([]);
          return;
        }

        // Buscar sessions pendentes de todos os plans
        const typedPlans = plans as unknown as TreatmentPlanRow[];
        const planIds = typedPlans.map(p => p.id);
        const { data: sessions } = await supabase
          .from('mt_treatment_sessions')
          .select('id, treatment_plan_id, numero_sessao, status, data_prevista, profissional_nome')
          .in('treatment_plan_id', planIds)
          .in('status', ['pendente', 'agendado'])
          .order('numero_sessao', { ascending: true });

        // Enriquecer com info do plano
        const typedSessions = (sessions || []) as unknown as TreatmentSessionRow[];
        const enriched: TreatmentSession[] = typedSessions.map(s => {
          const plan = typedPlans.find(p => p.id === s.treatment_plan_id);
          return {
            ...s,
            total_sessoes: plan?.total_sessoes || 0,
            sessoes_concluidas: plan?.sessoes_concluidas || 0,
          };
        });

        setTreatmentSessions(enriched);
      } catch (err) {
        console.error('Erro ao buscar sessions:', err);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [form.venda_id, form.tipo]);

  // Selecionar lead
  const handleSelectLead = (lead: LeadSearchResult) => {
    setSelectedLead({
      id: lead.id,
      nome: lead.nome || lead.name || "",
      telefone: lead.telefone || lead.phone || null,
      email: lead.email || null,
    });
    setForm((f) => ({
      ...f,
      lead_id: lead.id,
      nome_lead: lead.nome || lead.name || "",
      telefone_lead: lead.telefone || lead.phone || "",
      email_lead: lead.email || "",
      venda_id: null, // Limpar venda ao trocar lead
    }));
    setLeadSearch("");
    setShowLeadDropdown(false);
  };

  // Limpar lead selecionado
  const handleClearLead = () => {
    setSelectedLead(null);
    setForm((f) => ({
      ...f,
      lead_id: null,
      nome_lead: "",
      telefone_lead: "",
      email_lead: "",
      venda_id: null,
    }));
    setLeadSearch("");
    setLeadVendas([]);
  };

  // Serviços disponíveis para a unidade selecionada
  const servicosDisponiveis = useMemo(() => {
    if (!servicos) return [];
    if (!form.unidade_id) return servicos;
    if (!franqueadoServicos) return servicos;
    const vinculos = franqueadoServicos.filter((fs) => (fs as FranqueadoServicoVinculo).franqueado_id === form.unidade_id);
    if (vinculos.length === 0) return servicos;
    return servicos.filter(s => vinculos.some(v => v.servico_id === s.id));
  }, [form.unidade_id, servicos, franqueadoServicos]);

  // Usuários filtrados pela unidade (para profissionais)
  const profissionais = useMemo(() => {
    if (!users) return [];
    if (!form.unidade_id) return users;
    return users.filter(u => !u.franchise_id || u.franchise_id === form.unidade_id);
  }, [users, form.unidade_id]);

  // Consultoras (filtradas por cargo)
  const consultoras = useMemo(() => {
    if (!users) return [];
    return users;
  }, [users]);

  // Auto-preencher hora_fim quando hora_inicio muda
  const handleHoraInicioChange = (value: string) => {
    setForm((f) => ({
      ...f,
      hora_inicio: value,
      hora_fim: addMinutesToTime(value, 30),
    }));
  };

  useEffect(() => {
    if (isEditing && agendamento) {
      const servicosArray = agendamento.servico
        ? agendamento.servico.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const agData = agendamento as AgendamentoExpanded;

      // Set selected lead from existing appointment
      if (agData.lead_id) {
        setSelectedLead({
          id: agData.lead_id,
          nome: agendamento.nome_lead || "",
          telefone: agendamento.telefone_lead || null,
          email: agendamento.email_lead || null,
        });
      }

      setForm({
        tipo: agData.tipo || "avaliacao",
        lead_id: agData.lead_id || null,
        nome_lead: agendamento.nome_lead || "",
        telefone_lead: agendamento.telefone_lead || "",
        email_lead: agendamento.email_lead || "",
        data_agendamento: agendamento.data_agendamento,
        hora_inicio: agendamento.hora_inicio,
        hora_fim: agendamento.hora_fim || addMinutesToTime(agendamento.hora_inicio, 30),
        unidade_id: agendamento.unidade_id,
        profissional_id: agData.profissional_id || null,
        consultora_id: agData.consultora_id || null,
        servicos: servicosArray,
        status: agendamento.status,
        observacoes: agendamento.observacoes || "",
        lead_type: agendamento.lead_type || "geral",
        venda_id: agData.venda_id || null,
        treatment_session_id: agData.treatment_session_id || null,
        cortesia_motivo: agData.cortesia_motivo || "",
        sessao_numero: agData.sessao_numero || 1,
        total_sessoes: agData.total_sessoes || 10,
      });
    }
  }, [agendamento, isEditing]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (isEditing && !agendamento) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Agendamento não encontrado</h2>
          <p className="text-muted-foreground mb-4">O agendamento solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/agendamentos")}>Voltar para Agendamentos</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLead) {
      toast.error("Selecione um lead para vincular ao agendamento");
      return;
    }

    if (!form.data_agendamento || !form.hora_inicio) {
      toast.error("Data e hora de início são obrigatórios");
      return;
    }

    if (form.tipo === "cortesia" && !form.cortesia_motivo.trim()) {
      toast.error("O motivo da cortesia é obrigatório");
      return;
    }

    if (form.tipo === "procedimento_fechado" && !form.venda_id) {
      toast.error("Selecione a venda vinculada ao procedimento");
      return;
    }

    const servicosString = form.servicos.length > 0 ? form.servicos.join(", ") : null;

    // Encontrar nomes do profissional e consultora
    const profissional = users?.find(u => u.id === form.profissional_id);
    const consultora = users?.find(u => u.id === form.consultora_id);

    const payload: Record<string, unknown> = {
      lead_id: selectedLead.id,
      selected_lead_id: selectedLead.id,
      nome_lead: form.nome_lead,
      telefone_lead: form.telefone_lead || null,
      email_lead: form.email_lead || null,
      data_agendamento: form.data_agendamento,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim || null,
      unidade_id: form.unidade_id,
      profissional_id: form.profissional_id || null,
      profissional_nome: profissional?.nome || profissional?.nome_curto || null,
      responsavel_id: form.profissional_id || null,
      responsavel_nome: profissional?.nome || profissional?.nome_curto || null,
      consultora_id: form.consultora_id || null,
      consultora_nome: consultora?.nome || consultora?.nome_curto || null,
      sessao_numero: form.sessao_numero || null,
      total_sessoes: form.total_sessoes || null,
      servico: servicosString,
      status: form.status,
      observacoes: form.observacoes || null,
      lead_type: form.lead_type,
      tipo: form.tipo,
    };

    // Campos específicos por tipo
    if (form.tipo === "procedimento_fechado") {
      payload.venda_id = form.venda_id;
      payload.treatment_session_id = form.treatment_session_id;
    }

    if (form.tipo === "cortesia") {
      payload.cortesia_motivo = form.cortesia_motivo;
      if (form.sessao_numero > 1) {
        payload.observacoes = `Sessão ${form.sessao_numero} de cortesia. ${form.observacoes || ''}`.trim();
      }
    }

    if (isEditing && agendamento) {
      updateAgendamento({ id: agendamento.id, ...payload });
    } else {
      createAgendamento(payload as Record<string, unknown>);
    }

    navigate("/agendamentos");
  };

  const isSaving = isCreating || isUpdating;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/agendamentos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? "Editar Agendamento" : "Novo Agendamento"}
              </h1>
              {isEditing && agendamento?.nome_lead && (
                <p className="text-sm text-muted-foreground">{agendamento.nome_lead}</p>
              )}
              {currentUser && !isEditing && (
                <p className="text-sm text-muted-foreground">
                  Agendado por: {currentUser.nome_curto || currentUser.nome || user?.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Agendamento */}
              {!isEditing && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Tipo de Agendamento</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(["avaliacao", "procedimento_fechado", "cortesia"] as AppointmentType[]).map((tipo) => {
                      const Icon = TIPO_ICONS[tipo];
                      const isSelected = form.tipo === tipo;
                      const colors = APPOINTMENT_TYPE_COLORS[tipo];
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, tipo, venda_id: null }))}
                          className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                          }`}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${colors}20`, color: colors }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-sm">{APPOINTMENT_TYPE_LABELS[tipo]}</span>
                          <span className="text-xs text-muted-foreground text-center">
                            {APPOINTMENT_TYPE_DESCRIPTIONS[tipo]}
                          </span>
                          {isSelected && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Badge de tipo quando editando */}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Tipo:</Label>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${APPOINTMENT_TYPE_COLORS[form.tipo]}20`,
                      color: APPOINTMENT_TYPE_COLORS[form.tipo],
                    }}
                  >
                    {APPOINTMENT_TYPE_LABELS[form.tipo] || form.tipo}
                  </Badge>
                </div>
              )}

              {/* Cortesia: Aviso */}
              {form.tipo === "cortesia" && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Requer aprovação do gerente
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Agendamentos de cortesia ficam com status &quot;Pendente&quot; até serem aprovados por um gerente.
                    </p>
                  </div>
                </div>
              )}

              {/* Cortesia: Motivo e Sessão */}
              {form.tipo === "cortesia" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Label>Motivo da Cortesia *</Label>
                    <Textarea
                      value={form.cortesia_motivo}
                      onChange={(e) => setForm((f) => ({ ...f, cortesia_motivo: e.target.value }))}
                      rows={2}
                      placeholder="Descreva o motivo para a cortesia..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº da Sessão</Label>
                    <Select
                      value={String(form.sessao_numero)}
                      onValueChange={(v) => setForm((f) => ({ ...f, sessao_numero: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}ª sessão
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Lead (obrigatório) */}
              <div className="space-y-4">
                <h3 className="font-medium">Lead *</h3>

                {selectedLead ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedLead.nome}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        {selectedLead.telefone && <span>{selectedLead.telefone}</span>}
                        {selectedLead.email && <span>{selectedLead.email}</span>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleClearLead}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div ref={leadSearchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={leadSearch}
                        onChange={(e) => {
                          setLeadSearch(e.target.value);
                          setShowLeadDropdown(e.target.value.length >= 2);
                        }}
                        onFocus={() => leadSearch.length >= 2 && setShowLeadDropdown(true)}
                        placeholder="Buscar lead por nome, telefone ou email..."
                        className="pl-9"
                      />
                    </div>

                    {showLeadDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                        {isLoadingLeads ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Buscando...</span>
                          </div>
                        ) : allLeads && allLeads.length > 0 ? (
                          allLeads.slice(0, 20).map((lead: LeadSearchResult) => (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => handleSelectLead(lead)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                            >
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lead.nome || lead.name}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  {(lead.telefone || lead.phone) && <span>{lead.telefone || lead.phone}</span>}
                                  {lead.email && <span>{lead.email}</span>}
                                </div>
                              </div>
                              {lead.temperatura && (
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {lead.temperatura}
                                </Badge>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum lead encontrado para &quot;{leadSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}

                    {leadSearch.length > 0 && leadSearch.length < 2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Digite pelo menos 2 caracteres para buscar
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Procedimento Fechado: Selecionar Venda */}
              {form.tipo === "procedimento_fechado" && selectedLead && (
                <div className="space-y-3">
                  <Label className="font-medium">Venda Vinculada *</Label>
                  {isLoadingVendas ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando vendas...</span>
                    </div>
                  ) : leadVendas.length > 0 ? (
                    <div className="space-y-2">
                      {leadVendas.map((venda) => {
                        const isSelected = form.venda_id === venda.id;
                        return (
                          <button
                            key={venda.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, venda_id: venda.id }))}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  Venda #{venda.numero_venda || venda.id.slice(0, 8)}
                                </span>
                                <Badge variant={venda.status === 'ganha' ? 'default' : 'secondary'} className="text-xs">
                                  {venda.status}
                                </Badge>
                              </div>
                              {venda.items.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {venda.items.join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-medium shrink-0">
                              R$ {(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma venda encontrada para este lead
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Crie uma venda primeiro antes de agendar um procedimento fechado
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Procedimento Fechado: Selecionar Sessão do Plano */}
              {form.tipo === "procedimento_fechado" && form.venda_id && treatmentSessions.length > 0 && (
                <div className="space-y-3">
                  <Label className="font-medium">Sessão do Tratamento</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {treatmentSessions.map((session: TreatmentSession) => {
                      const isSelected = form.treatment_session_id === session.id;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setForm((f) => ({
                            ...f,
                            treatment_session_id: session.id,
                            sessao_numero: session.numero_sessao,
                            total_sessoes: session.total_sessoes,
                          }))}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : session.status === 'agendado'
                              ? "border-amber-300 bg-amber-50"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <span className="text-lg font-bold">{session.numero_sessao}ª</span>
                          <p className="text-xs text-muted-foreground">de {session.total_sessoes}</p>
                          {session.status === 'agendado' && (
                            <Badge variant="outline" className="text-xs mt-1">já agendada</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Procedimento Fechado: Loading sessions */}
              {form.tipo === "procedimento_fechado" && form.venda_id && isLoadingSessions && (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando sessões do tratamento...</span>
                </div>
              )}

              {/* Data e Horário */}
              <div className="space-y-4">
                <h3 className="font-medium">Data e Horário</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={form.data_agendamento || ""}
                      onChange={(e) => setForm((f) => ({ ...f, data_agendamento: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Início *</Label>
                    <Input
                      type="time"
                      value={form.hora_inicio || ""}
                      onChange={(e) => handleHoraInicioChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={form.hora_fim || ""}
                      onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Preenchido automaticamente (+30 min)
                    </p>
                  </div>
                </div>
              </div>

              {/* Unidade, Profissional, Consultora */}
              <div className="space-y-4">
                <h3 className="font-medium">Unidade e Equipe</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={form.unidade_id || "none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, unidade_id: v === "none" ? null : v, servicos: [], profissional_id: null }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {franqueados.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {accessLevel === 'franchise' && form.unidade_id && (
                      <p className="text-xs text-muted-foreground">Pré-selecionada pela sua franquia</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Profissional (Esteticista/Aplicadora)</Label>
                    <Select
                      value={form.profissional_id || "none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, profissional_id: v === "none" ? null : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {profissionais.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome_curto || u.nome} {u.cargo ? `(${u.cargo})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Consultora (quem agendou)</Label>
                    <Select
                      value={form.consultora_id || "none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, consultora_id: v === "none" ? null : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a consultora" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {consultoras.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome_curto || u.nome} {u.cargo ? `(${u.cargo})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentUser && form.consultora_id === currentUser.id && (
                      <p className="text-xs text-muted-foreground">Você (auto-preenchido)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Serviços */}
              <div className="space-y-2">
                <Label>Serviços</Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {servicosDisponiveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum serviço disponível</p>
                  ) : (
                    servicosDisponiveis.map((servico: ServicoOption) => (
                      <div key={servico.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-servico-${servico.id}`}
                          checked={form.servicos.includes(servico.nome)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm((f) => ({ ...f, servicos: [...f.servicos, servico.nome] }));
                            } else {
                              setForm((f) => ({ ...f, servicos: f.servicos.filter((s) => s !== servico.nome) }));
                            }
                          }}
                        />
                        <label
                          htmlFor={`edit-servico-${servico.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {servico.nome}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {form.servicos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.servicos.length} serviço(s) selecionado(s): {form.servicos.join(", ")}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status || "agendado"}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Agendamento["status"] }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENDAMENTO_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {AGENDAMENTO_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes || ""}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Observações adicionais..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/agendamentos")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
