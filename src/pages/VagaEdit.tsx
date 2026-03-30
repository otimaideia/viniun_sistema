import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Briefcase, DollarSign, FileText, Send } from "lucide-react";
import { useVagasMT, useVagaMT } from "@/hooks/multitenant/useVagasMT";
import { useFranchisesMT } from "@/hooks/multitenant/useFranchisesMT";
import {
  VAGA_STATUS_OPTIONS,
  VAGA_STATUS_CONFIG,
  TIPO_CONTRATO_OPTIONS,
  DEPARTAMENTO_OPTIONS,
  NIVEL_OPTIONS,
  MODALIDADE_OPTIONS,
  VagaStatus,
} from "@/types/recrutamento";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function VagaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { createVaga, updateVaga, isCreating, isUpdating } = useVagasMT();
  const { data: vagaData, isLoading } = useVagaMT(id);
  const { franchises } = useFranchisesMT();

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    requisitos: "",
    beneficios: "",
    departamento: "",
    nivel: "",
    tipo_contrato: "",
    modalidade: "",
    faixa_salarial_min: "",
    faixa_salarial_max: "",
    exibir_salario: false,
    quantidade_vagas: "1",
    franchise_id: "",
    status: "rascunho" as VagaStatus,
    expira_em: "",
  });

  useEffect(() => {
    if (vagaData) {
      setForm({
        titulo: vagaData.titulo,
        descricao: vagaData.descricao || "",
        requisitos: vagaData.requisitos || "",
        beneficios: vagaData.beneficios || "",
        departamento: vagaData.departamento || "",
        nivel: vagaData.nivel || "",
        tipo_contrato: vagaData.tipo_contrato || "",
        modalidade: vagaData.modalidade || "",
        faixa_salarial_min: vagaData.faixa_salarial_min?.toString() || "",
        faixa_salarial_max: vagaData.faixa_salarial_max?.toString() || "",
        exibir_salario: vagaData.exibir_salario,
        quantidade_vagas: vagaData.quantidade_vagas?.toString() || "1",
        franchise_id: vagaData.franchise_id || "",
        status: vagaData.status,
        expira_em: vagaData.expira_em ? vagaData.expira_em.split("T")[0] : "",
      });
    }
  }, [vagaData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      requisitos: form.requisitos || undefined,
      beneficios: form.beneficios || undefined,
      departamento: form.departamento || undefined,
      nivel: form.nivel || undefined,
      tipo_contrato: form.tipo_contrato || undefined,
      modalidade: form.modalidade || undefined,
      faixa_salarial_min: form.faixa_salarial_min ? parseFloat(form.faixa_salarial_min) : undefined,
      faixa_salarial_max: form.faixa_salarial_max ? parseFloat(form.faixa_salarial_max) : undefined,
      exibir_salario: form.exibir_salario,
      quantidade_vagas: parseInt(form.quantidade_vagas) || 1,
      franchise_id: form.franchise_id || undefined,
      status: form.status,
      expira_em: form.expira_em || undefined,
    };

    if (isEditing && id) {
      updateVaga.mutate({ id, ...data }, {
        onSuccess: () => navigate(`/recrutamento/vagas/${id}`),
      });
    } else {
      createVaga.mutate(data, {
        onSuccess: () => navigate("/recrutamento"),
      });
    }
  };

  const set = (field: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && isEditing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (isEditing && !vagaData && !isLoading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Vaga não encontrada</h2>
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
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Vaga" : "Nova Vaga"}
          </h1>
        </div>
        <Button type="submit" disabled={isCreating || isUpdating || !form.titulo.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {isCreating || isUpdating ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título da Vaga *</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex: Esteticista Laser"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Departamento</Label>
                <Select value={form.departamento} onValueChange={(v) => set("departamento", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTAMENTO_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nível</Label>
                <Select value={form.nivel} onValueChange={(v) => set("nivel", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {NIVEL_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Contrato</Label>
                <Select value={form.tipo_contrato} onValueChange={(v) => set("tipo_contrato", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPO_CONTRATO_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={(v) => set("modalidade", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {MODALIDADE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade_vagas">Quantidade de Vagas</Label>
                <Input
                  id="quantidade_vagas"
                  type="number"
                  min="1"
                  value={form.quantidade_vagas}
                  onChange={(e) => set("quantidade_vagas", e.target.value)}
                />
              </div>
              <div>
                <Label>Franquia/Unidade</Label>
                <Select value={form.franchise_id} onValueChange={(v) => set("franchise_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    {(franchises || []).map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia || f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Remuneração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Remuneração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salario_min">Faixa Salarial Mínima</Label>
                <Input
                  id="salario_min"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.faixa_salarial_min}
                  onChange={(e) => set("faixa_salarial_min", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label htmlFor="salario_max">Faixa Salarial Máxima</Label>
                <Input
                  id="salario_max"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.faixa_salarial_max}
                  onChange={(e) => set("faixa_salarial_max", e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch
                id="exibir_salario"
                checked={form.exibir_salario}
                onCheckedChange={(v) => set("exibir_salario", v)}
              />
              <Label htmlFor="exibir_salario" className="cursor-pointer">
                Exibir salário na vaga pública
              </Label>
            </div>

            {/* Publicação */}
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Publicação
              </h3>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: VagaStatus) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAGA_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{VAGA_STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expira_em">Data de Expiração</Label>
                <Input
                  id="expira_em"
                  type="date"
                  value={form.expira_em}
                  onChange={(e) => set("expira_em", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Descrição */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Descrição da Vaga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                placeholder="Descreva a vaga, responsabilidades e dia-a-dia..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requisitos">Requisitos</Label>
                <Textarea
                  id="requisitos"
                  value={form.requisitos}
                  onChange={(e) => set("requisitos", e.target.value)}
                  placeholder="Um requisito por linha..."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="beneficios">Benefícios</Label>
                <Textarea
                  id="beneficios"
                  value={form.beneficios}
                  onChange={(e) => set("beneficios", e.target.value)}
                  placeholder="Um benefício por linha..."
                  rows={5}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
