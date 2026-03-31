import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantDetection } from "@/hooks/multitenant/useTenantDetection";
import PublicPageLayout from "@/components/public/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2,
  User,
  MapPin,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Handshake,
} from "lucide-react";
import { RAMOS_ATIVIDADE } from "@/types/parceria";

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const STEPS = [
  { id: 1, title: "Empresa", icon: Building2 },
  { id: 2, title: "Contato", icon: User },
  { id: 3, title: "Endereço", icon: MapPin },
  { id: 4, title: "Termos", icon: FileCheck },
];

interface FormData {
  nome_empresa: string;
  nome_fantasia: string;
  cnpj: string;
  tipo: string;
  segmento: string;
  website: string;
  descricao: string;
  contato_nome: string;
  contato_cargo: string;
  contato_telefone: string;
  contato_email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  aceite_termos: boolean;
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

export default function CadastroParceiro() {
  // Detecta o tenant automaticamente: domínio customizado em prod, ?tenant= em dev
  const { tenant, isLoading: isTenantLoading, error: tenantDetectionError } = useTenantDetection();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nome_empresa: "",
    nome_fantasia: "",
    cnpj: "",
    tipo: "",
    segmento: "",
    website: "",
    descricao: "",
    contato_nome: "",
    contato_cargo: "",
    contato_telefone: "",
    contato_email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    aceite_termos: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  // Busca automática de endereço pelo CEP via ViaCEP
  const handleCepChange = async (rawValue: string) => {
    const formatted = formatCEP(rawValue);
    updateField("cep", formatted);
    const digits = rawValue.replace(/\D/g, "");
    if (digits.length === 8) {
      setIsLookingUpCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            cep: formatted,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado,
          }));
        }
      } catch {
        // falha silenciosa; usuário pode digitar manualmente
      } finally {
        setIsLookingUpCep(false);
      }
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.nome_empresa.trim()) newErrors.nome_empresa = "Nome da empresa é obrigatório";
      if (!formData.tipo) newErrors.tipo = "Ramo de atividade é obrigatório";
    }

    if (step === 2) {
      if (!formData.contato_nome.trim()) newErrors.contato_nome = "Nome do responsável é obrigatório";
      if (!formData.contato_telefone.trim()) newErrors.contato_telefone = "Telefone é obrigatório";
      if (!formData.contato_email.trim()) {
        newErrors.contato_email = "E-mail é obrigatório";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contato_email)) {
        newErrors.contato_email = "E-mail inválido";
      }
    }

    if (step === 4) {
      if (!formData.aceite_termos) newErrors.aceite_termos = "Você precisa aceitar os termos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!tenant?.id) {
      toast.error("Tenant não encontrado. Verifique o link de cadastro.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("mt_partnerships")
        .insert({
          tenant_id: tenant!.id,
          nome_empresa: formData.nome_empresa.trim(),
          nome_fantasia: formData.nome_fantasia.trim() || formData.nome_empresa.trim(),
          cnpj: formData.cnpj.replace(/\D/g, "") || null,
          tipo: formData.tipo || null,
          segmento: formData.segmento || null,
          website: formData.website.trim() || null,
          descricao: formData.descricao.trim() || null,
          contato_nome: formData.contato_nome.trim() || null,
          contato_cargo: formData.contato_cargo.trim() || null,
          contato_telefone: formData.contato_telefone.replace(/\D/g, "") || null,
          contato_email: formData.contato_email.trim().toLowerCase() || null,
          cep: formData.cep.replace(/\D/g, "") || null,
          logradouro: formData.logradouro.trim() || null,
          numero: formData.numero.trim() || null,
          complemento: formData.complemento.trim() || null,
          bairro: formData.bairro.trim() || null,
          cidade: formData.cidade.trim() || null,
          estado: formData.estado || null,
          status: "pendente",
          is_active: false,
        });

      if (error) throw error;

      setIsSuccess(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao enviar cadastro";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // ── Loading do tenant ──────────────────────────────────────────────────────
  if (isTenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="h-16 bg-white shadow-sm" />
        <div className="max-w-2xl mx-auto w-full px-4 py-8">
          <Skeleton className="h-4 w-48 mb-6 rounded" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Tenant não encontrado ──────────────────────────────────────────────────
  if (tenantDetectionError || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
            <p className="text-gray-600">Este link de cadastro não é válido. Solicite um novo link com a equipe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <PublicPageLayout
        tenant={tenant}
        subtitle="Programa de Parceiros"
        subtitleIcon={<Handshake className="h-5 w-5" />}
        accentColor="#2563EB"
      >
        <div className="flex items-center justify-center p-4 py-16">
          <Card className="w-full max-w-lg text-center">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Cadastro enviado!</h2>
              <p className="text-gray-600 mb-6">
                Recebemos o cadastro de <strong>{formData.nome_empresa}</strong>. Nossa equipe analisará as informações e entrará em contato em breve.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p>📧 Aguarde o contato pelo e-mail <strong>{formData.contato_email}</strong></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPageLayout>
    );
  }

  // ── Formulário principal ───────────────────────────────────────────────────
  return (
    <PublicPageLayout
      tenant={tenant}
      subtitle="Programa de Parceiros"
      subtitleIcon={<Handshake className="h-5 w-5" />}
      accentColor="#2563EB"
    >
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? "bg-blue-600 text-white" :
                    isActive ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    isActive ? "text-blue-600" : isCompleted ? "text-blue-500" : "text-gray-400"
                  }`}>{step.title}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">Passo {currentStep} de {STEPS.length}</p>
        </div>

        {/* Step 1: Dados da Empresa */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informações sobre o seu negócio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_empresa">Razão Social *</Label>
                <Input
                  id="nome_empresa"
                  placeholder="Nome completo da empresa"
                  value={formData.nome_empresa}
                  onChange={(e) => updateField("nome_empresa", e.target.value)}
                />
                {errors.nome_empresa && <p className="text-sm text-red-500">{errors.nome_empresa}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input
                  id="nome_fantasia"
                  placeholder="Nome pelo qual é conhecido (opcional)"
                  value={formData.nome_fantasia}
                  onChange={(e) => updateField("nome_fantasia", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => updateField("cnpj", formatCNPJ(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Ramo de Atividade *</Label>
                <Select value={formData.tipo} onValueChange={(v) => updateField("tipo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ramo de atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {RAMOS_ATIVIDADE.map((ramo) => (
                      <SelectItem key={ramo} value={ramo}>{ramo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-sm text-red-500">{errors.tipo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.seusite.com.br"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição do Negócio</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva brevemente sua empresa e como a parceria pode beneficiar nossos clientes..."
                  value={formData.descricao}
                  onChange={(e) => updateField("descricao", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Dados do Contato */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Dados do Responsável
              </CardTitle>
              <CardDescription>Quem será o contato principal desta parceria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contato_nome">Nome Completo *</Label>
                <Input
                  id="contato_nome"
                  placeholder="Nome do responsável pela parceria"
                  value={formData.contato_nome}
                  onChange={(e) => updateField("contato_nome", e.target.value)}
                />
                {errors.contato_nome && <p className="text-sm text-red-500">{errors.contato_nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_cargo">Cargo</Label>
                <Input
                  id="contato_cargo"
                  placeholder="Ex: Gerente de Marketing, Sócio..."
                  value={formData.contato_cargo}
                  onChange={(e) => updateField("contato_cargo", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_telefone">Telefone / WhatsApp *</Label>
                <Input
                  id="contato_telefone"
                  placeholder="(13) 99999-9999"
                  value={formData.contato_telefone}
                  onChange={(e) => updateField("contato_telefone", formatPhone(e.target.value))}
                />
                {errors.contato_telefone && <p className="text-sm text-red-500">{errors.contato_telefone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_email">E-mail *</Label>
                <Input
                  id="contato_email"
                  type="email"
                  placeholder="email@empresa.com.br"
                  value={formData.contato_email}
                  onChange={(e) => updateField("contato_email", e.target.value)}
                />
                {errors.contato_email && <p className="text-sm text-red-500">{errors.contato_email}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Endereço com CEP automático */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Endereço
              </CardTitle>
              <CardDescription>Digite o CEP para preenchimento automático</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CEP com lookup automático */}
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    maxLength={9}
                  />
                  {isLookingUpCep && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-gray-400">Digite o CEP para preencher o endereço automaticamente</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida..."
                    value={formData.logradouro}
                    onChange={(e) => updateField("logradouro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="Nº"
                    value={formData.numero}
                    onChange={(e) => updateField("numero", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    placeholder="Bairro"
                    value={formData.bairro}
                    onChange={(e) => updateField("bairro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Sala, Andar..."
                    value={formData.complemento}
                    onChange={(e) => updateField("complemento", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    placeholder="Cidade"
                    value={formData.cidade}
                    onChange={(e) => updateField("cidade", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={(v) => updateField("estado", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Termos */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                Termos de Parceria
              </CardTitle>
              <CardDescription>Leia e aceite para concluir o cadastro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm text-blue-900">
                <p className="font-semibold text-base">Resumo do cadastro:</p>
                <p>🏢 <strong>{formData.nome_empresa}</strong>{formData.nome_fantasia && formData.nome_fantasia !== formData.nome_empresa ? ` (${formData.nome_fantasia})` : ""}</p>
                <p>📋 {formData.tipo}</p>
                <p>👤 {formData.contato_nome} — {formData.contato_email}</p>
                {formData.cidade && <p>📍 {formData.logradouro ? `${formData.logradouro}${formData.numero ? `, ${formData.numero}` : ""} — ` : ""}{formData.cidade}{formData.estado ? `, ${formData.estado}` : ""}</p>}
              </div>

              <div className="border rounded-lg p-4 h-40 overflow-y-auto text-sm text-gray-600 bg-gray-50">
                <p className="font-semibold text-gray-800 mb-2">Termos e Condições de Parceria</p>
                <p className="mb-2">Ao se cadastrar como parceiro da {tenant.nome_fantasia || "Viniun"}, você concorda com:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>A {tenant.nome_fantasia || "Viniun"} analisará o cadastro e entrará em contato em até 5 dias úteis;</li>
                  <li>A parceria só será ativada após aprovação pela nossa equipe;</li>
                  <li>Seus dados serão utilizados apenas para contato e gestão da parceria;</li>
                  <li>O código de indicação gerado é exclusivo para uso da sua empresa;</li>
                  <li>A parceria pode ser desativada a qualquer momento por qualquer das partes.</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="aceite_termos"
                  checked={formData.aceite_termos}
                  onCheckedChange={(checked) => updateField("aceite_termos", checked as boolean)}
                />
                <Label htmlFor="aceite_termos" className="text-sm leading-relaxed cursor-pointer">
                  Li e concordo com os termos e condições de parceria da {tenant.nome_fantasia || "Viniun"}
                </Label>
              </div>
              {errors.aceite_termos && <p className="text-sm text-red-500">{errors.aceite_termos}</p>}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep} className="flex-1 sm:flex-none">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {currentStep < STEPS.length ? (
            <Button onClick={nextStep} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !tenant?.id}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enviar Cadastro
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Ao se cadastrar, você concorda com a política de privacidade da {tenant.nome_fantasia || "Viniun"}.
        </p>
      </div>
    </PublicPageLayout>
  );
}
