import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Calendar, ClipboardCheck, Star } from "lucide-react";
import { useEntrevistasMT, useEntrevistaMT } from "@/hooks/multitenant/useEntrevistasMT";
import { useCandidatosMT } from "@/hooks/multitenant/useCandidatosMT";
import { useUsersAdapter } from "@/hooks/useUsersAdapter";
import {
  ENTREVISTA_STATUS_OPTIONS,
  ENTREVISTA_STATUS_CONFIG,
  ENTREVISTA_TIPO_CONFIG,
  RECOMENDACAO_CONFIG,
  EntrevistaTipo,
  EntrevistaStatus,
  Recomendacao,
} from "@/types/recrutamento";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EntrevistaEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { createEntrevista, updateEntrevista, isCreating, isUpdating } = useEntrevistasMT();
  const { data: entrevistaData, isLoading } = useEntrevistaMT(id);
  const { candidatos } = useCandidatosMT();
  const { users } = useUsersAdapter({ allTenantUsers: true });

  const preSelectedCandidato = searchParams.get("candidato") || "";

  const [form, setForm] = useState({
    candidate_id: preSelectedCandidato,
    position_id: "",
    data_entrevista: "",
    hora_entrevista: "",
    duracao_minutos: "60",
    tipo: "presencial" as EntrevistaTipo,
    local_ou_link: "",
    entrevistador_id: "",
    entrevistador_nome: "",
    etapa: "1",
    etapa_nome: "",
    status: "agendada" as EntrevistaStatus,
    nota: "",
    feedback: "",
    recomendacao: "" as Recomendacao | "",
  });

  // Auto-select position_id from candidate
  useEffect(() => {
    if (form.candidate_id && !isEditing) {
      const cand = candidatos.find((c) => c.id === form.candidate_id);
      if (cand?.position_id) {
        setForm((prev) => ({ ...prev, position_id: cand.position_id || "" }));
      }
    }
  }, [form.candidate_id, candidatos, isEditing]);

  // Load existing data in edit mode
  useEffect(() => {
    if (entrevistaData) {
      const dt = new Date(entrevistaData.data_entrevista);
      setForm({
        candidate_id: entrevistaData.candidate_id,
        position_id: entrevistaData.position_id,
        data_entrevista: dt.toISOString().split("T")[0],
        hora_entrevista: dt.toTimeString().slice(0, 5),
        duracao_minutos: entrevistaData.duracao_minutos?.toString() || "60",
        tipo: entrevistaData.tipo || "presencial",
        local_ou_link: entrevistaData.local_ou_link || "",
        entrevistador_id: entrevistaData.entrevistador_id || "",
        entrevistador_nome: entrevistaData.entrevistador_nome || "",
        etapa: entrevistaData.etapa?.toString() || "1",
        etapa_nome: entrevistaData.etapa_nome || "",
        status: entrevistaData.status,
        nota: entrevistaData.nota?.toString() || "",
        feedback: entrevistaData.feedback || "",
        recomendacao: entrevistaData.recomendacao || "",
      });
    }
  }, [entrevistaData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dataEntrevista = new Date(`${form.data_entrevista}T${form.hora_entrevista}`);

    if (isEditing && id) {
      updateEntrevista.mutate(
        {
          id,
          candidate_id: form.candidate_id,
          position_id: form.position_id,
          data_entrevista: dataEntrevista.toISOString(),
          duracao_minutos: parseInt(form.duracao_minutos) || 60,
          tipo: form.tipo,
          local_ou_link: form.local_ou_link || undefined,
          entrevistador_id: form.entrevistador_id || undefined,
          entrevistador_nome: form.entrevistador_nome || undefined,
          etapa: parseInt(form.etapa) || 1,
          etapa_nome: form.etapa_nome || undefined,
          status: form.status,
          nota: form.nota ? parseInt(form.nota) : undefined,
          feedback: form.feedback || undefined,
          recomendacao: (form.recomendacao as Recomendacao) || undefined,
        },
        { onSuccess: () => navigate(`/recrutamento/entrevistas/${id}`) },
      );
    } else {
      createEntrevista.mutate(
        {
          candidate_id: form.candidate_id,
          position_id: form.position_id,
          data_entrevista: dataEntrevista.toISOString(),
          duracao_minutos: parseInt(form.duracao_minutos) || 60,
          tipo: form.tipo,
          local_ou_link: form.local_ou_link || undefined,
          entrevistador_id: form.entrevistador_id || undefined,
          entrevistador_nome: form.entrevistador_nome || undefined,
          etapa: parseInt(form.etapa) || 1,
          etapa_nome: form.etapa_nome || undefined,
        },
        { onSuccess: () => navigate("/recrutamento") },
      );
    }
  };

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const localLabel =
    form.tipo === "video" ? "Link da Reunião" : form.tipo === "telefone" ? "Telefone de Contato" : "Endereço / Local";

  if (isLoading && isEditing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isEditing && !entrevistaData && !isLoading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Entrevista não encontrada</h2>
        <Button variant="link" onClick={() => navigate("/recrutamento")}>
          Voltar para Recrutamento
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Entrevista" : "Nova Entrevista"}</h1>
        </div>
        <Button
          type="submit"
          disabled={isCreating || isUpdating || !form.candidate_id || !form.data_entrevista || !form.hora_entrevista}
        >
          <Save className="h-4 w-4 mr-2" />
          {isCreating || isUpdating ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Candidato *</Label>
              <Select value={form.candidate_id} onValueChange={(v) => set("candidate_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o candidato" />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.position?.titulo ? `(${c.position.titulo})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={form.data_entrevista}
                  onChange={(e) => set("data_entrevista", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="hora">Horário *</Label>
                <Input
                  id="hora"
                  type="time"
                  value={form.hora_entrevista}
                  onChange={(e) => set("hora_entrevista", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duracao">Duração (min)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min="15"
                  step="15"
                  value={form.duracao_minutos}
                  onChange={(e) => set("duracao_minutos", e.target.value)}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: EntrevistaTipo) => set("tipo", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ENTREVISTA_TIPO_CONFIG) as EntrevistaTipo[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {ENTREVISTA_TIPO_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="local_ou_link">{localLabel}</Label>
              <Input
                id="local_ou_link"
                value={form.local_ou_link}
                onChange={(e) => set("local_ou_link", e.target.value)}
                placeholder={localLabel}
              />
            </div>

            <div>
              <Label>Entrevistador</Label>
              <Select value={form.entrevistador_id} onValueChange={(v) => set("entrevistador_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="etapa">Etapa</Label>
                <Input
                  id="etapa"
                  type="number"
                  min="1"
                  value={form.etapa}
                  onChange={(e) => set("etapa", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="etapa_nome">Nome da Etapa</Label>
                <Input
                  id="etapa_nome"
                  value={form.etapa_nome}
                  onChange={(e) => set("etapa_nome", e.target.value)}
                  placeholder="Ex: Triagem, Técnica, Final"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Avaliação (only in edit mode) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {isEditing ? "Avaliação" : "Status"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: EntrevistaStatus) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTREVISTA_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ENTREVISTA_STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isEditing && (
              <>
                <div>
                  <Label>Nota (1-10)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set("nota", n === parseInt(form.nota) ? "" : String(n))}
                        className={`h-9 w-9 rounded-full text-sm font-medium border transition-colors ${
                          parseInt(form.nota) >= n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-input"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {form.nota && (
                    <p className="text-sm text-muted-foreground mt-1">Nota: {form.nota}/10</p>
                  )}
                </div>

                <div>
                  <Label>Recomendação</Label>
                  <Select value={form.recomendacao} onValueChange={(v) => set("recomendacao", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RECOMENDACAO_CONFIG) as Recomendacao[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {RECOMENDACAO_CONFIG[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={form.feedback}
                    onChange={(e) => set("feedback", e.target.value)}
                    placeholder="Observações sobre o desempenho do candidato..."
                    rows={6}
                  />
                </div>
              </>
            )}

            {!isEditing && (
              <p className="text-sm text-muted-foreground py-4">
                A avaliação (nota, feedback e recomendação) pode ser preenchida após a entrevista, editando este registro.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
