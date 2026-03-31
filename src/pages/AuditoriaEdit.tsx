import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAuditoriaMT,
  useAuditoriasMT,
  AUDITORIA_TIPO_LABELS,
  type AuditoriaTipo,
} from "@/hooks/multitenant/useAuditoriasMT";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import { useUsersMT } from "@/hooks/multitenant/useUsersMT";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { useTenantContext } from "@/contexts/TenantContext";

interface SelectedLead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface FormState {
  tipo: AuditoriaTipo;
  lead_id: string | null;
  cliente_nome: string;
  cliente_telefone: string;
  data_agendada: string;
  hora_agendada: string;
  auditor_id: string | null;
  auditor_nome: string;
  consultora_id: string | null;
  consultora_nome: string;
  servico_nome: string;
  servico_interesse: string;
  proposta_valor: string;
  sessao_atual: number;
  total_sessoes: number;
  notas: string;
}

export default function AuditoriaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { franchise, accessLevel } = useTenantContext();
  const { auditoria, isLoading: isLoadingAuditoria } = useAuditoriaMT(isEditing ? id : undefined);
  const { createAuditoria, updateAuditoria } = useAuditoriasMT();
  const { users } = useUsersMT({ is_active: true });
  const { servicos } = useServicosAdapter();

  // Lead search state
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const leadSearchRef = useRef<HTMLDivElement>(null);

  const { leads: allLeads, isLoading: isLoadingLeads } = useLeadsMT(
    leadSearch.length >= 2 ? { search: leadSearch } : undefined
  );

  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    tipo: 'acompanhamento',
    lead_id: null,
    cliente_nome: '',
    cliente_telefone: '',
    data_agendada: '',
    hora_agendada: '',
    auditor_id: null,
    auditor_nome: '',
    consultora_id: null,
    consultora_nome: '',
    servico_nome: '',
    servico_interesse: '',
    proposta_valor: '',
    sessao_atual: 1,
    total_sessoes: 10,
    notas: '',
  });

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

  // Carregar dados ao editar
  useEffect(() => {
    if (isEditing && auditoria) {
      setForm({
        tipo: auditoria.tipo,
        lead_id: auditoria.lead_id || null,
        cliente_nome: auditoria.cliente_nome || '',
        cliente_telefone: auditoria.cliente_telefone || '',
        data_agendada: auditoria.data_agendada || '',
        hora_agendada: auditoria.hora_agendada || '',
        auditor_id: auditoria.auditor_id || null,
        auditor_nome: auditoria.auditor_nome || '',
        consultora_id: auditoria.consultora_id || null,
        consultora_nome: auditoria.consultora_nome || '',
        servico_nome: auditoria.servico_nome || '',
        servico_interesse: auditoria.servico_interesse || '',
        proposta_valor: auditoria.proposta_valor || '',
        sessao_atual: auditoria.sessao_atual || 1,
        total_sessoes: auditoria.total_sessoes || 10,
        notas: auditoria.notas || '',
      });
      if (auditoria.lead) {
        setSelectedLead({
          id: auditoria.lead.id,
          nome: auditoria.lead.nome,
          telefone: auditoria.lead.telefone || null,
          email: auditoria.lead.email || null,
        });
      }
    }
  }, [isEditing, auditoria]);

  const handleSelectLead = (lead: { id: string; nome: string; telefone?: string | null; email?: string | null }) => {
    setSelectedLead({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone || null,
      email: lead.email || null,
    });
    setForm((f) => ({
      ...f,
      lead_id: lead.id,
      cliente_nome: lead.nome,
      cliente_telefone: lead.telefone || '',
    }));
    setShowLeadDropdown(false);
    setLeadSearch("");
  };

  const handleClearLead = () => {
    setSelectedLead(null);
    setForm((f) => ({
      ...f,
      lead_id: null,
      cliente_nome: '',
      cliente_telefone: '',
    }));
  };

  const handleAuditorChange = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    setForm((f) => ({
      ...f,
      auditor_id: userId,
      auditor_nome: user ? (user.nome_curto || user.nome) : '',
    }));
  };

  const handleConsultoraChange = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    setForm((f) => ({
      ...f,
      consultora_id: userId,
      consultora_nome: user ? (user.nome_curto || user.nome) : '',
    }));
  };

  const handleSubmit = async () => {
    if (!form.cliente_nome.trim()) {
      toast.error('Nome do cliente e obrigatorio');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tipo: form.tipo,
        lead_id: form.lead_id || null,
        cliente_nome: form.cliente_nome,
        cliente_telefone: form.cliente_telefone || null,
        data_agendada: form.data_agendada || null,
        hora_agendada: form.hora_agendada || null,
        auditor_id: form.auditor_id || null,
        auditor_nome: form.auditor_nome || null,
        consultora_id: form.consultora_id || null,
        consultora_nome: form.consultora_nome || null,
        servico_nome: form.servico_nome || null,
        servico_interesse: form.servico_interesse || null,
        proposta_valor: form.proposta_valor || null,
        sessao_atual: form.sessao_atual,
        total_sessoes: form.total_sessoes,
        notas: form.notas || null,
        status: form.data_agendada ? 'agendada' : 'pendente',
      };

      if (isEditing && id) {
        await updateAuditoria(id, payload as Record<string, unknown>);
        toast.success('Auditoria atualizada com sucesso');
        navigate(`/auditorias/${id}`);
      } else {
        const created = await createAuditoria(payload as Record<string, unknown>);
        toast.success('Auditoria criada com sucesso');
        navigate(`/auditorias/${created.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar auditoria');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoadingAuditoria) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Auditoria' : 'Nova Auditoria'}
          </h1>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Auditoria</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as AuditoriaTipo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDITORIA_TIPO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lead Selector */}
            <div className="space-y-2">
              <Label>Cliente / Lead</Label>
              {selectedLead ? (
                <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedLead.nome}</p>
                    {selectedLead.telefone && (
                      <p className="text-xs text-muted-foreground">{selectedLead.telefone}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearLead}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative" ref={leadSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar lead por nome ou telefone..."
                      value={leadSearch}
                      onChange={(e) => {
                        setLeadSearch(e.target.value);
                        setShowLeadDropdown(e.target.value.length >= 2);
                      }}
                      onFocus={() => leadSearch.length >= 2 && setShowLeadDropdown(true)}
                      className="pl-9"
                    />
                  </div>
                  {showLeadDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      {isLoadingLeads ? (
                        <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                      ) : allLeads && allLeads.length > 0 ? (
                        allLeads.slice(0, 10).map((lead: { id: string; nome: string; telefone?: string | null; email?: string | null }) => (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => handleSelectLead(lead)}
                            className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2 text-sm"
                          >
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{lead.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {lead.telefone || lead.email || 'Sem contato'}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground">
                          Nenhum lead encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nome e Telefone (manual se nao tiver lead) */}
            {!selectedLead && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={form.cliente_nome}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.cliente_telefone}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Input
                  type="date"
                  value={form.data_agendada}
                  onChange={(e) => setForm((f) => ({ ...f, data_agendada: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.hora_agendada}
                  onChange={(e) => setForm((f) => ({ ...f, hora_agendada: e.target.value }))}
                />
              </div>
            </div>

            {/* Auditor e Consultora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auditor</Label>
                <Select
                  value={form.auditor_id || ""}
                  onValueChange={handleAuditorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar auditor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome_curto || u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consultora</Label>
                <Select
                  value={form.consultora_id || ""}
                  onValueChange={handleConsultoraChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar consultora" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome_curto || u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Servico e Sessoes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Servico Atual</Label>
                <Select
                  value={form.servico_nome || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, servico_nome: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar servico" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos?.map((s) => (
                      <SelectItem key={s.id} value={s.nome || s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sessao Atual</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.sessao_atual}
                  onChange={(e) => setForm((f) => ({ ...f, sessao_atual: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Sessoes</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.total_sessoes}
                  onChange={(e) => setForm((f) => ({ ...f, total_sessoes: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* Servico de Interesse */}
            <div className="space-y-2">
              <Label>Servico de Interesse (para upsell)</Label>
              <Select
                value={form.servico_interesse || ""}
                onValueChange={(v) => setForm((f) => ({ ...f, servico_interesse: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar servico de interesse" />
                </SelectTrigger>
                <SelectContent>
                  {servicos?.map((s) => (
                    <SelectItem key={s.id} value={s.nome || s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proposta de Valor */}
            <div className="space-y-2">
              <Label>Proposta de Valor</Label>
              <Textarea
                value={form.proposta_valor}
                onChange={(e) => setForm((f) => ({ ...f, proposta_valor: e.target.value }))}
                placeholder="Descreva a proposta de valor para o cliente..."
                rows={3}
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas / Observacoes</Label>
              <Textarea
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Observacoes adicionais..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Salvar Alteracoes' : 'Criar Auditoria'}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
