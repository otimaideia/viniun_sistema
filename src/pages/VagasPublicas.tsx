import { useState, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStorageBucketUpload } from "@/hooks/useStorageBucketUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Briefcase, MapPin, DollarSign, Users, Calendar,
  Send, CheckCircle2, Upload, FileText, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import PublicPageLayout from "@/components/public/PublicPageLayout";
import { useTenantDetection } from "@/hooks/multitenant/useTenantDetection";
import { CepInput } from "@/components/recrutamento/CepInput";
import type { CepAddressData } from "@/components/recrutamento/CepInput";

// =============================================================================
// Cores padrão Viniun (mesmo do PublicPageLayout)
// =============================================================================
const COLORS = {
  purple: "#753DA4",
  lightBlue: "#7CC4DA",
  green: "#25D366",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
};

const LOGO_DEFAULT =
  "/images/landing/viniun-logo.png";

// =============================================================================
// Validação Zod para candidatura pública
// =============================================================================

const candidaturaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  whatsapp: z.string()
    .min(10, "WhatsApp deve ter pelo menos 10 dígitos")
    .max(20, "WhatsApp muito longo")
    .regex(/^[\d\s()+-]+$/, "WhatsApp contém caracteres inválidos"),
  linkedin_url: z.string().max(500).optional().or(z.literal("")),
  experiencia: z.string().max(5000, "Texto muito longo").optional().or(z.literal("")),
  sexo: z.string().min(1, "Sexo é obrigatório"),
  cep: z.string().min(8, "CEP inválido").regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  curriculo_path: z.string().min(1, "Currículo é obrigatório"),
});

// =============================================================================
// Tipos
// =============================================================================

interface VagaPublica {
  id: string;
  titulo: string;
  descricao: string | null;
  requisitos: string | null;
  beneficios: string | null;
  departamento: string | null;
  nivel: string | null;
  tipo_contrato: string | null;
  modalidade: string | null;
  faixa_salarial_min: number | null;
  faixa_salarial_max: number | null;
  exibir_salario: boolean;
  quantidade_vagas: number;
  publicada_em: string | null;
  created_at: string;
  tenant_id: string;
  franchise_id: string | null;
  franchise: { nome_fantasia: string; cidade: string | null; estado: string | null } | null;
  tenant: { nome_fantasia: string; slug: string } | null;
}

interface BrandingInfo {
  logo_url: string | null;
  logo_branco_url: string | null;
  cor_primaria: string;
}

interface FranchiseInfo {
  nome_fantasia: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
}

// =============================================================================
// Hook: buscar vagas públicas (sem auth) — com tenant_id e franchise_id
// =============================================================================

function useVagasPublicas() {
  return useQuery({
    queryKey: ["vagas-publicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_job_positions")
        .select(`
          id, titulo, descricao, requisitos, beneficios,
          departamento, nivel, tipo_contrato, modalidade,
          faixa_salarial_min, faixa_salarial_max, exibir_salario,
          quantidade_vagas, publicada_em, created_at,
          tenant_id, franchise_id,
          franchise:mt_franchises!mt_job_positions_franchise_id_fkey(
            nome_fantasia, cidade, estado
          ),
          tenant:mt_tenants!mt_job_positions_tenant_id_fkey(
            nome_fantasia, slug
          )
        `)
        .eq("status", "aberta")
        .eq("publicada", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as VagaPublica[];
    },
    staleTime: 60_000, // cache 1 min
  });
}

// =============================================================================
// Hook: buscar branding — usa useTenantDetection para detectar tenant correto
// =============================================================================

function useBrandingPublico() {
  const { tenant: detectedTenant } = useTenantDetection();

  const brandingQuery = useQuery({
    queryKey: ["branding-publico", detectedTenant?.id],
    queryFn: async () => {
      if (!detectedTenant?.id) return { branding: null, franchise: null };

      const [brandingRes, franchiseRes] = await Promise.all([
        supabase
          .from("mt_tenant_branding")
          .select("logo_url, logo_branco_url, cor_primaria")
          .eq("tenant_id", detectedTenant.id)
          .single(),
        supabase
          .from("mt_franchises")
          .select("nome_fantasia, cidade, estado, telefone, whatsapp, email")
          .eq("tenant_id", detectedTenant.id)
          .eq("is_active", true)
          .not("endereco", "is", null)
          .order("nome")
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        branding: brandingRes.data as BrandingInfo | null,
        franchise: franchiseRes.data as FranchiseInfo | null,
      };
    },
    enabled: !!detectedTenant?.id,
    staleTime: 300_000, // cache 5 min
  });

  return {
    tenant: detectedTenant,
    branding: brandingQuery.data?.branding || null,
    franchise: brandingQuery.data?.franchise || null,
  };
}

// =============================================================================
// Componente: Upload de currículo inline (para modal público)
// =============================================================================

function PublicFileUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { upload, isUploading, progress } = useStorageBucketUpload({
    bucket: 'curriculos',
    pathPrefix: 'candidaturas/',
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  });
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      toast.error("Tipo de arquivo nao permitido. Use: PDF, DOC ou DOCX");
      if (e.target) e.target.value = "";
      return;
    }

    const result = await upload(file);

    if (result) {
      // Save bucket/path (admins generate signed URL when viewing)
      onChange(`curriculos/${result.path}`);
      setFileName(file.name);
      toast.success("Curriculo enviado com sucesso!");
    } else {
      onChange(null);
    }

    if (e.target) e.target.value = "";
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
        <FileText className="h-5 w-5 text-green-600 shrink-0" />
        <span className="text-sm text-green-700 truncate flex-1">
          {fileName || "Currículo enviado"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => { onChange(null); setFileName(null); }}
          className="shrink-0 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
        id="public-curriculo-upload"
      />
      <label
        htmlFor="public-curriculo-upload"
        className="flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg p-3 cursor-pointer text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando... {progress}%
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Anexar currículo (PDF, DOC — máx. 5MB)
          </>
        )}
      </label>
      {isUploading && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Componente: Card de Vaga (layout produção) — memoizado
// =============================================================================

const VagaCard = memo(function VagaCard({
  vaga,
  onApply,
  primaryColor,
  lightBlueColor,
}: {
  vaga: VagaPublica;
  onApply: () => void;
  primaryColor: string;
  lightBlueColor: string;
}) {
  const location = vaga.franchise
    ? `${vaga.franchise.nome_fantasia}${vaga.franchise.cidade ? ` - ${vaga.franchise.cidade}/${vaga.franchise.estado}` : ""}`
    : vaga.tenant?.nome_fantasia || "";

  const salary =
    vaga.exibir_salario && (vaga.faixa_salarial_min || vaga.faixa_salarial_max)
      ? vaga.faixa_salarial_min && vaga.faixa_salarial_max
        ? `R$ ${vaga.faixa_salarial_min.toLocaleString("pt-BR")} - ${vaga.faixa_salarial_max.toLocaleString("pt-BR")}`
        : vaga.faixa_salarial_max
          ? `Até R$ ${vaga.faixa_salarial_max.toLocaleString("pt-BR")}`
          : `A partir de R$ ${vaga.faixa_salarial_min!.toLocaleString("pt-BR")}`
      : null;

  const publishedDate = vaga.publicada_em || vaga.created_at;

  return (
    <Card
      className="hover:shadow-xl transition-all duration-300 overflow-hidden group"
      style={{ borderLeft: `4px solid ${primaryColor}` }}
    >
      <CardContent className="p-0">
        {/* Header do card */}
        <div
          className="p-6 border-b"
          style={{
            background: `linear-gradient(to right, ${primaryColor}08, ${lightBlueColor}08)`,
          }}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: primaryColor }}
                >
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold mb-2 transition-colors"
                    style={{ color: COLORS.gray900 }}
                  >
                    {vaga.titulo}
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {vaga.tipo_contrato && (
                      <Badge
                        className="font-semibold text-white"
                        style={{ background: primaryColor }}
                      >
                        {vaga.tipo_contrato}
                      </Badge>
                    )}
                    {vaga.modalidade && (
                      <Badge
                        variant="secondary"
                        className="capitalize"
                        style={{
                          background: `${lightBlueColor}15`,
                          color: lightBlueColor,
                          borderColor: `${lightBlueColor}30`,
                        }}
                      >
                        {vaga.modalidade}
                      </Badge>
                    )}
                    {vaga.departamento && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: `${primaryColor}30`,
                          color: primaryColor,
                        }}
                      >
                        {vaga.departamento}
                      </Badge>
                    )}
                    {vaga.nivel && (
                      <Badge variant="outline" className="text-gray-600">
                        {vaga.nivel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={onApply}
              size="lg"
              className="hidden sm:flex shadow-lg hover:shadow-xl transition-all text-white"
              style={{ background: primaryColor }}
            >
              <Send className="w-4 h-4 mr-2" />
              Candidatar-se
            </Button>
          </div>
        </div>

        {/* Informações principais - Grid 4 colunas */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Localização */}
            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: COLORS.gray50 }}>
              <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
              <div>
                <p className="text-xs font-medium" style={{ color: COLORS.gray500 }}>Localização</p>
                <p className="font-semibold" style={{ color: COLORS.gray900 }}>
                  {location || "A definir"}
                </p>
              </div>
            </div>

            {/* Salário */}
            {salary && (
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: COLORS.gray50 }}>
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium" style={{ color: COLORS.gray500 }}>Salário</p>
                  <p className="font-semibold" style={{ color: COLORS.gray900 }}>{salary}</p>
                </div>
              </div>
            )}

            {/* Vagas */}
            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: COLORS.gray50 }}>
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium" style={{ color: COLORS.gray500 }}>Vagas</p>
                <p className="font-semibold" style={{ color: COLORS.gray900 }}>
                  {vaga.quantidade_vagas} {vaga.quantidade_vagas === 1 ? "vaga" : "vagas"}
                </p>
              </div>
            </div>

            {/* Data de Publicação */}
            <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: COLORS.gray50 }}>
              <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium" style={{ color: COLORS.gray500 }}>Publicada</p>
                <p className="font-semibold" style={{ color: COLORS.gray900 }}>
                  {format(new Date(publishedDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Descrição, Requisitos, Benefícios com barras coloridas */}
          <div className="space-y-6">
            {vaga.descricao && (
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.gray900 }}>
                  <div className="w-1 h-5 rounded" style={{ background: primaryColor }} />
                  Descrição da Vaga
                </h3>
                <p className="leading-relaxed whitespace-pre-line" style={{ color: COLORS.gray700 }}>
                  {vaga.descricao}
                </p>
              </div>
            )}

            {vaga.requisitos && (
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.gray900 }}>
                  <div className="w-1 h-5 rounded" style={{ background: lightBlueColor }} />
                  Requisitos
                </h3>
                <p className="leading-relaxed whitespace-pre-line" style={{ color: COLORS.gray700 }}>
                  {vaga.requisitos}
                </p>
              </div>
            )}

            {vaga.beneficios && (
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.gray900 }}>
                  <div className="w-1 h-5 rounded" style={{ background: "#22C55E" }} />
                  Benefícios
                </h3>
                <p className="leading-relaxed whitespace-pre-line" style={{ color: COLORS.gray700 }}>
                  {vaga.beneficios}
                </p>
              </div>
            )}
          </div>

          {/* CTA mobile */}
          <div className="mt-6 pt-6 border-t sm:hidden">
            <Button
              onClick={onApply}
              className="w-full h-12 text-white"
              size="lg"
              style={{ background: primaryColor }}
            >
              <Send className="w-4 h-4 mr-2" />
              Candidatar-se para esta vaga
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// =============================================================================
// Componente: Modal de Candidatura — com Zod, honeypot, upload
// =============================================================================

function CandidaturaModal({
  vaga,
  open,
  onClose,
  primaryColor,
}: {
  vaga: VagaPublica | null;
  open: boolean;
  onClose: () => void;
  primaryColor: string;
}) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    linkedin_url: "",
    experiencia: "",
    curriculo_path: null as string | null,
    sexo: "",
    data_nascimento: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    // Honeypot field — bots preenchem, humanos não veem
    website: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaga) return;

    // Honeypot check — se preenchido, é bot
    if (form.website) {
      // Simula sucesso para não alertar o bot
      setSent(true);
      return;
    }

    // Validação Zod
    const result = candidaturaSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if ((err as {path: string[]}).path[0]) fieldErrors[(err as {path: string[]}).path[0] as string] = (err as {message: string}).message;
      });
      setErrors(fieldErrors);
      toast.error("Verifique os campos destacados");
      return;
    }

    setSending(true);
    setErrors({});

    try {
      const candidateData = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.whatsapp.replace(/[^\d+()-\s]/g, "") || null,
        whatsapp: form.whatsapp.replace(/[^\d+()-\s]/g, "") || null,
        linkedin_url: form.linkedin_url || null,
        experiencia: form.experiencia || null,
        curriculo_url: form.curriculo_path || null,
        sexo: form.sexo || null,
        data_nascimento: form.data_nascimento || null,
        cep: form.cep.replace(/\D/g, "") || null,
        endereco: form.endereco || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        position_id: vaga.id,
        tenant_id: vaga.tenant_id,
      };

      // Verificar se já existe candidatura para esta vaga
      const { data: existing } = await supabase
        .from("mt_candidates")
        .select("id")
        .eq("email", candidateData.email)
        .eq("position_id", vaga.id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Atualizar dados do candidato existente
        const { error } = await supabase
          .from("mt_candidates")
          .update({ ...candidateData, updated_at: new Date().toISOString() })
          .eq("id", existing[0].id);

        if (error) throw error;
        setSent(true);
        toast.success("Candidatura atualizada com sucesso!");
      } else {
        // Criar nova candidatura
        const { error } = await supabase
          .from("mt_candidates")
          .insert({ ...candidateData, status: "novo" });

        if (error) throw error;
        setSent(true);
        toast.success("Candidatura enviada com sucesso!");
      }
    } catch (err: unknown) {
      toast.error(`Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setForm({ nome: "", email: "", whatsapp: "", linkedin_url: "", experiencia: "", curriculo_path: null, sexo: "", data_nascimento: "", cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", website: "" });
    setErrors({});
    onClose();
  };

  if (!vaga) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: primaryColor }}>
            Candidatar-se
          </DialogTitle>
          <DialogDescription>{vaga.titulo}</DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold">Candidatura Enviada!</h3>
            <p className="text-sm text-muted-foreground">
              Obrigado pelo interesse. Entraremos em contato em breve.
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — invisível para humanos */}
            <div className="absolute" style={{ left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true" tabIndex={-1}>
              <label htmlFor="pub-website">Website</label>
              <input
                id="pub-website"
                name="website"
                type="text"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <div>
              <Label htmlFor="pub-nome">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pub-nome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
                maxLength={255}
                placeholder="Seu nome completo"
                className={errors.nome ? "border-red-500" : ""}
              />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pub-email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pub-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  maxLength={255}
                  placeholder="seu@email.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="pub-whatsapp">
                  WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pub-whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  required
                  maxLength={20}
                  placeholder="(00) 00000-0000"
                  className={errors.whatsapp ? "border-red-500" : ""}
                />
                {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pub-linkedin">LinkedIn</Label>
                <Input
                  id="pub-linkedin"
                  value={form.linkedin_url}
                  onChange={(e) => set("linkedin_url", e.target.value)}
                  maxLength={500}
                  placeholder="linkedin.com/in/seu-perfil"
                />
              </div>
            </div>

            {/* Sexo e Data de Nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Sexo <span className="text-red-500">*</span></Label>
                <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sexo && <p className="text-sm text-red-500 mt-1">{errors.sexo}</p>}
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => set("data_nascimento", e.target.value)}
                />
              </div>
            </div>

            {/* CEP — preenche endereço automaticamente (campos hidden) */}
            <div>
              <Label>CEP <span className="text-red-500">*</span></Label>
              <CepInput
                value={form.cep}
                onChange={(cep) => set("cep", cep)}
                onAddressFound={(data: CepAddressData) => {
                  setForm((p) => ({
                    ...p,
                    endereco: data.endereco || p.endereco,
                    bairro: data.bairro || p.bairro,
                    cidade: data.cidade || p.cidade,
                    estado: data.estado || p.estado,
                  }));
                }}
              />
              {errors.cep && <p className="text-sm text-red-500 mt-1">{errors.cep}</p>}
              {form.cidade && (
                <p className="text-xs text-muted-foreground mt-1">
                  {form.endereco && `${form.endereco}, `}{form.bairro && `${form.bairro} - `}{form.cidade}/{form.estado}
                </p>
              )}
            </div>

            {/* Upload de currículo */}
            <div>
              <Label>Currículo <span className="text-red-500">*</span></Label>
              <PublicFileUpload
                value={form.curriculo_path}
                onChange={(url) => setForm((p) => ({ ...p, curriculo_path: url }))}
              />
              {errors.curriculo_path && (
                <p className="text-sm text-red-500 mt-1">{errors.curriculo_path}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pub-experiencia">Conte-nos sobre você</Label>
              <Textarea
                id="pub-experiencia"
                value={form.experiencia}
                onChange={(e) => set("experiencia", e.target.value)}
                placeholder="Sua experiência, formação, por que deseja trabalhar conosco..."
                rows={4}
                maxLength={5000}
              />
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={sending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 text-white"
                style={{ background: primaryColor }}
                disabled={
                  sending ||
                  !form.nome.trim() ||
                  !form.email.trim() ||
                  !form.whatsapp.trim() ||
                  !form.sexo ||
                  !form.cep.replace(/\D/g, "").match(/^\d{8}$/) ||
                  !form.curriculo_path
                }
              >
                {sending ? "Enviando..." : "Enviar Candidatura"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Página Principal
// =============================================================================

export default function VagasPublicas() {
  const { data: vagas, isLoading, error } = useVagasPublicas();
  const { tenant, branding, franchise } = useBrandingPublico();
  const [selectedVaga, setSelectedVaga] = useState<VagaPublica | null>(null);

  const primaryColor = branding?.cor_primaria || COLORS.purple;
  const lightBlueColor = COLORS.lightBlue;
  const logoUrl = branding?.logo_url || LOGO_DEFAULT;
  const vagasCount = vagas?.length || 0;
  const locationText = franchise?.cidade && franchise?.estado
    ? `${franchise.cidade} - ${franchise.estado}`
    : "Praia Grande - SP";

  // Callback memoizado para evitar re-render dos cards
  const handleApply = useCallback((vaga: VagaPublica) => {
    setSelectedVaga(vaga);
  }, []);

  // Aguardar tenant carregar
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PublicPageLayout
      tenant={tenant}
      subtitle="Trabalhe Conosco"
      subtitleIcon={<Briefcase className="h-5 w-5" />}
    >

      {/* ================================================================ */}
      {/* HERO – gradiente purple → lightBlue → purple                     */}
      {/* ================================================================ */}
      <div
        className="relative text-white py-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${lightBlueColor}, ${primaryColor})`,
        }}
      >
        {/* Decorative blur circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Briefcase className="w-5 h-5" />
              <span className="font-semibold">Oportunidades de Carreira</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Trabalhe Conosco
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              Faça parte do nosso time e transforme a vida de milhares de pessoas
            </p>

            {/* Stats badges */}
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Users className="w-5 h-5" />
                <span>+100 unidades</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <MapPin className="w-5 h-5" />
                <span>{locationText}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Briefcase className="w-5 h-5" />
                <span>
                  {vagasCount} {vagasCount === 1 ? "vaga aberta" : "vagas abertas"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LISTA DE VAGAS                                                   */}
      {/* ================================================================ */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-16">
          {isLoading ? (
            <div className="text-center py-12">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                style={{ borderColor: primaryColor }}
              />
              <p className="font-medium" style={{ color: COLORS.gray600 }}>
                Carregando vagas...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p style={{ color: COLORS.gray600 }}>
                Erro ao carregar vagas. Tente novamente.
              </p>
            </div>
          ) : vagasCount === 0 ? (
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: COLORS.gray100 }}
                  >
                    <Briefcase className="w-10 h-10" style={{ color: COLORS.gray400 }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: COLORS.gray900 }}>
                    Nenhuma vaga disponível no momento
                  </h3>
                  <p className="max-w-md mx-auto mb-6" style={{ color: COLORS.gray600 }}>
                    Estamos preparando novas oportunidades! Volte em breve,
                    novas vagas são publicadas regularmente.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Header da lista */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: COLORS.gray900 }}>
                  Vagas Disponíveis
                </h2>
                <p style={{ color: COLORS.gray600 }}>
                  {vagasCount}{" "}
                  {vagasCount === 1 ? "oportunidade encontrada" : "oportunidades encontradas"}
                </p>
              </div>

              {/* Grid de vagas */}
              <div className="space-y-6">
                {vagas!.map((vaga) => (
                  <VagaCard
                    key={vaga.id}
                    vaga={vaga}
                    onApply={() => handleApply(vaga)}
                    primaryColor={primaryColor}
                    lightBlueColor={lightBlueColor}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal de Candidatura */}
      <CandidaturaModal
        vaga={selectedVaga}
        open={!!selectedVaga}
        onClose={() => setSelectedVaga(null)}
        primaryColor={primaryColor}
      />
    </PublicPageLayout>
  );
}
