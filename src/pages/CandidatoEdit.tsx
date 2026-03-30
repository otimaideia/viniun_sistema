import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User, Briefcase, Link as LinkIcon, FileText, MapPin, AlertTriangle } from "lucide-react";
import { useCandidatosMT, useCandidatoMT } from "@/hooks/multitenant/useCandidatosMT";
import { useVagasMT } from "@/hooks/multitenant/useVagasMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CepInput } from "@/components/recrutamento/CepInput";
import { FileUpload } from "@/components/recrutamento/FileUpload";
import {
  CANDIDATO_STATUS_OPTIONS,
  CANDIDATO_STATUS_CONFIG,
  FORMACAO_OPTIONS,
  DISPONIBILIDADE_OPTIONS,
  UF_OPTIONS,
  CandidatoStatus,
} from "@/types/recrutamento";

// ---- CPF: máscara + validação ----
function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  // Todos dígitos iguais é inválido
  if (/^(\d)\1{10}$/.test(digits)) return false;
  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;
  return true;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function CandidatoEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { tenant, franchise, accessLevel } = useTenantContext();
  const { createCandidato, updateCandidato, isCreating, isUpdating } = useCandidatosMT();
  const { data: candidatoData, isLoading } = useCandidatoMT(id);
  const { vagas } = useVagasMT();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    whatsapp: "",
    cpf: "",
    data_nascimento: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    position_id: searchParams.get("vaga") || "",
    formacao: "",
    experiencia: "",
    pretensao_salarial: "",
    disponibilidade: "",
    curriculo_url: null as string | null,
    linkedin_url: "",
    portfolio_url: "",
    status: "novo" as CandidatoStatus,
    notas: "",
  });

  useEffect(() => {
    if (candidatoData) {
      setForm({
        nome: candidatoData.nome,
        email: candidatoData.email || "",
        telefone: candidatoData.telefone || "",
        whatsapp: candidatoData.whatsapp || "",
        cpf: candidatoData.cpf || "",
        data_nascimento: candidatoData.data_nascimento || "",
        cep: candidatoData.cep || "",
        endereco: candidatoData.endereco || "",
        numero: candidatoData.numero || "",
        complemento: candidatoData.complemento || "",
        bairro: candidatoData.bairro || "",
        cidade: candidatoData.cidade || "",
        estado: candidatoData.estado || "",
        position_id: candidatoData.position_id || "",
        formacao: candidatoData.formacao || "",
        experiencia: candidatoData.experiencia || "",
        pretensao_salarial: candidatoData.pretensao_salarial?.toString() || "",
        disponibilidade: candidatoData.disponibilidade || "",
        curriculo_url: candidatoData.curriculo_url,
        linkedin_url: candidatoData.linkedin_url || "",
        portfolio_url: candidatoData.portfolio_url || "",
        status: candidatoData.status,
        notas: candidatoData.notas || "",
      });
    }
  }, [candidatoData]);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);

  const checkDuplicate = async (): Promise<boolean> => {
    if (!form.email.trim()) return false;
    let query = supabase
      .from('mt_candidates')
      .select('id, nome, email')
      .eq('email', form.email.trim().toLowerCase())
      .neq('id', id || '00000000-0000-0000-0000-000000000000');

    if (accessLevel === 'tenant' && tenant) {
      query = query.eq('tenant_id', tenant.id);
    } else if (accessLevel === 'franchise' && franchise) {
      query = query.eq('franchise_id', franchise.id);
    }

    const { data: existing } = await query.limit(1);

    if (existing && existing.length > 0) {
      setDuplicateWarning(`Já existe um candidato com este email: ${existing[0].nome}`);
      return true;
    }
    setDuplicateWarning(null);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CPF se preenchido
    if (form.cpf && !validateCPF(form.cpf)) {
      setCpfError("CPF inválido");
      toast.error("CPF informado é inválido. Verifique os dígitos.");
      return;
    }
    setCpfError(null);

    // Verificar duplicata por email ao criar
    if (!isEditing) {
      const isDuplicate = await checkDuplicate();
      if (isDuplicate) {
        toast.warning('Candidato com este email já existe. Verifique antes de continuar.');
        return;
      }
    }

    const data = {
      nome: form.nome,
      email: form.email,
      telefone: form.telefone || undefined,
      whatsapp: form.whatsapp || undefined,
      cpf: form.cpf || undefined,
      data_nascimento: form.data_nascimento || undefined,
      cep: form.cep?.replace(/\D/g, "") || undefined,
      endereco: form.endereco || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      position_id: form.position_id || undefined,
      formacao: form.formacao || undefined,
      experiencia: form.experiencia || undefined,
      pretensao_salarial: form.pretensao_salarial ? parseFloat(form.pretensao_salarial) : undefined,
      disponibilidade: form.disponibilidade || undefined,
      curriculo_url: form.curriculo_url || undefined,
      linkedin_url: form.linkedin_url || undefined,
      portfolio_url: form.portfolio_url || undefined,
      status: form.status,
      notas: form.notas || undefined,
    };

    if (isEditing && id) {
      updateCandidato.mutate({ id, ...data }, {
        onSuccess: () => navigate(`/recrutamento/candidatos/${id}`),
      });
    } else {
      createCandidato.mutate(data, {
        onSuccess: () => navigate("/recrutamento"),
      });
    }
  };

  const set = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && isEditing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (isEditing && !candidatoData && !isLoading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Candidato não encontrado</h2>
        <Button variant="link" onClick={() => navigate("/recrutamento")}>Voltar para Recrutamento</Button>
      </div>
    );
  }

  const vagasAbertas = vagas.filter((v) => v.status === "aberta");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Candidato" : "Novo Candidato"}</h1>
        </div>
        <Button type="submit" disabled={isCreating || isUpdating || !form.nome.trim() || !form.email.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {isCreating || isUpdating ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => { set("email", e.target.value); setDuplicateWarning(null); }} onBlur={() => !isEditing && form.email && checkDuplicate()} placeholder="email@exemplo.com" required />
                {duplicateWarning && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{duplicateWarning}</p>
                )}
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={16} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={16} />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={form.cpf} onChange={(e) => { set("cpf", maskCPF(e.target.value)); setCpfError(null); }} onBlur={() => { if (form.cpf && !validateCPF(form.cpf)) setCpfError("CPF inválido"); else setCpfError(null); }} placeholder="000.000.000-00" maxLength={14} className={cpfError ? "border-red-500" : ""} />
                {cpfError && <p className="text-xs text-red-600 mt-1">{cpfError}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input id="data_nascimento" type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Endereço + Profissional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>CEP</Label>
                <CepInput
                  value={form.cep}
                  onChange={(cep) => set("cep", cep)}
                  onAddressFound={(data) => {
                    setForm((prev) => ({
                      ...prev,
                      endereco: data.endereco || prev.endereco,
                      bairro: data.bairro || prev.bairro,
                      cidade: data.cidade || prev.cidade,
                      estado: data.estado || prev.estado,
                    }));
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, Avenida..." />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Nº" />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, Bloco..." />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Bairro" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Cidade" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h3 className="font-medium flex items-center gap-2"><Briefcase className="h-4 w-4" />Profissional</h3>
              <div>
                <Label>Vaga</Label>
                <Select value={form.position_id} onValueChange={(v) => set("position_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a vaga" /></SelectTrigger>
                  <SelectContent>
                    {vagasAbertas.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Formação</Label>
                  <Select value={form.formacao} onValueChange={(v) => set("formacao", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FORMACAO_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Disponibilidade</Label>
                  <Select value={form.disponibilidade} onValueChange={(v) => set("disponibilidade", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {DISPONIBILIDADE_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="pretensao">Pretensão Salarial</Label>
                <Input id="pretensao" type="number" step="0.01" min="0" value={form.pretensao_salarial} onChange={(e) => set("pretensao_salarial", e.target.value)} placeholder="R$ 0,00" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Links e Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" />Links e Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Currículo</Label>
              <FileUpload value={form.curriculo_url} onChange={(url) => set("curriculo_url", url)} />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input id="linkedin_url" value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <Label htmlFor="portfolio_url">Portfólio</Label>
              <Input id="portfolio_url" value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: CandidatoStatus) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANDIDATO_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{CANDIDATO_STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="experiencia">Experiência Profissional</Label>
              <Textarea id="experiencia" value={form.experiencia} onChange={(e) => set("experiencia", e.target.value)} placeholder="Descreva experiência profissional relevante..." rows={4} />
            </div>
            <div>
              <Label htmlFor="notas">Notas Internas</Label>
              <Textarea id="notas" value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Anotações sobre o candidato..." rows={4} />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
