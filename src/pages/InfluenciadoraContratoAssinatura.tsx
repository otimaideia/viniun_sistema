import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  ScrollText,
  UserCheck,
  Plus,
  Trash2,
  Instagram,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useContractSignaturePublicMT,
  getMissingFields,
  REQUIRED_FIELDS,
  type PublicSocialNetwork,
} from "@/hooks/multitenant/useContractSignaturePublicMT";
import { ContratoTemplate, type TemplateTipo } from "@/components/influenciadoras/ContratoTemplate";
import { AssinaturaDigitalCanvas } from "@/components/contratos/AssinaturaDigitalCanvas";

type SignatureStep = 'validacao' | 'completar_cadastro' | 'preview' | 'aditivos' | 'assinatura' | 'concluido';

const ESTADO_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const ESTADO_CIVIL_OPTIONS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];

const PLATAFORMAS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "youtube", label: "YouTube", icon: "🎬" },
  { value: "twitter", label: "Twitter/X", icon: "🐦" },
  { value: "facebook", label: "Facebook", icon: "📘" },
  { value: "kwai", label: "Kwai", icon: "🎥" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "pinterest", label: "Pinterest", icon: "📌" },
];

interface SocialNetworkForm {
  plataforma: string;
  usuario: string;
  url: string;
  seguidores: string;
}

export default function InfluenciadoraContratoAssinatura() {
  const { contratoId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState<SignatureStep>('validacao');
  const [identityData, setIdentityData] = useState({
    whatsapp: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAditivos, setAcceptedAditivos] = useState(false);
  const [signatureCanvas, setSignatureCanvas] = useState<string | null>(null);

  // Profile completion form
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [socialForms, setSocialForms] = useState<SocialNetworkForm[]>([]);

  // Hook PÚBLICO — NÃO depende de TenantContext
  const {
    contrato,
    influenciadora,
    branding,
    tenant,
    franchise,
    documento,
    socialNetworks,
    aditivos,
    isLoading,
    isError,
    error,
    identityValidated,
    validateIdentity,
    updateProfile,
    registerSignature,
  } = useContractSignaturePublicMT(contratoId, sessionToken || undefined);

  // Initialize profile form with existing data when influenciadora loads
  useEffect(() => {
    if (influenciadora && identityValidated) {
      const initial: Record<string, string> = {};
      REQUIRED_FIELDS.forEach(f => {
        const val = (influenciadora as Record<string, unknown>)[f.key];
        if (val && typeof val === 'string') {
          initial[f.key] = val;
        }
      });
      setProfileForm(initial);

      // Initialize social networks forms
      if (socialNetworks.length > 0) {
        setSocialForms(socialNetworks.map(sn => ({
          plataforma: sn.plataforma,
          usuario: sn.usuario || sn.username || '',
          url: sn.url || '',
          seguidores: String(sn.seguidores || ''),
        })));
      } else {
        // Pre-add Instagram if the influencer has it in the profile
        const igUser = (influenciadora as Record<string, unknown>).instagram;
        if (igUser && typeof igUser === 'string') {
          setSocialForms([{ plataforma: 'instagram', usuario: igUser, url: '', seguidores: '' }]);
        }
      }
    }
  }, [influenciadora, identityValidated, socialNetworks]);

  // Check missing fields
  const { missingProfile, missingSocialNetworks } = getMissingFields(influenciadora, socialNetworks);
  const hasAnySocialInForm = socialForms.some(s => s.plataforma && s.usuario.trim());
  const needsProfileCompletion = missingProfile.length > 0 || (missingSocialNetworks && !hasAnySocialInForm);

  // Preparar dados para o ContratoTemplate (preview visual)
  const templateTipo: TemplateTipo = (contrato?.template_tipo as TemplateTipo) ??
    (contrato?.tipo === "permuta" ? "contrato_permuta" : "contrato_normal");

  const contratoData = contrato && influenciadora ? {
    template_tipo: templateTipo,
    influenciadora_nome: influenciadora.nome_completo || influenciadora.nome_artistico || influenciadora.nome || "",
    influenciadora_cpf: influenciadora.cpf || undefined,
    influenciadora_rg: influenciadora.rg || undefined,
    influenciadora_email: influenciadora.email || undefined,
    influenciadora_telefone: influenciadora.whatsapp || influenciadora.telefone || undefined,
    influenciadora_cidade: influenciadora.cidade || undefined,
    influenciadora_estado: influenciadora.estado || undefined,
    influenciadora_cep: influenciadora.cep || undefined,
    influenciadora_rua: influenciadora.endereco || undefined,
    influenciadora_numero: influenciadora.numero || undefined,
    influenciadora_bairro: influenciadora.bairro || undefined,
    influenciadora_estado_civil: influenciadora.estado_civil || undefined,
    influenciadora_profissao: influenciadora.profissao || undefined,
    influenciadora_naturalidade: influenciadora.naturalidade || undefined,
    contrato_numero: `${tenant?.slug?.toUpperCase() ?? "YLS"}-INF-${contrato.data_inicio ? new Date(contrato.data_inicio).toISOString().substring(0, 7).replace("-", "") : "000000"}-${contrato.id?.substring(0, 4).toUpperCase()}`,
    contrato_tipo: contrato.tipo,
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim,
    valor_mensal: contrato.valor_mensal as number | null | undefined,
    valor_por_post: contrato.valor_por_post as number | null | undefined,
    percentual_comissao: contrato.percentual_comissao as number | null | undefined,
    valor_comissao_fixa: contrato.valor_comissao_fixa as number | null | undefined,
    credito_permuta: contrato.credito_permuta as number | null | undefined,
    posts_mes: contrato.posts_mes as number | null | undefined,
    stories_mes: contrato.stories_mes as number | null | undefined,
    reels_mes: contrato.reels_mes as number | null | undefined,
    servicos_permuta: contrato.servicos_permuta ?? [],
    empresa_nome: tenant?.nome_fantasia || "Empresa",
    empresa_cnpj: tenant?.cnpj || undefined,
    empresa_cidade: tenant?.cidade || undefined,
    empresa_estado: tenant?.estado || undefined,
    empresa_representante: franchise?.responsavel_nome?.trim() || undefined,
    franquia_nome: franchise?.nome_fantasia || franchise?.nome || undefined,
    franquia_cnpj: franchise?.cnpj || undefined,
    franquia_endereco: franchise?.endereco || undefined,
    franquia_cidade: franchise?.cidade || undefined,
    franquia_estado: franchise?.estado || undefined,
    franquia_cep: franchise?.cep || undefined,
    eh_menor: influenciadora.eh_menor || false,
    responsavel_legal_nome: influenciadora.responsavel_legal_nome || undefined,
    responsavel_legal_cpf: influenciadora.responsavel_legal_cpf || undefined,
    responsavel_legal_rg: influenciadora.responsavel_legal_rg || undefined,
    responsavel_legal_parentesco: influenciadora.responsavel_legal_parentesco || undefined,
  } : null;

  const handleValidateIdentity = async () => {
    if (!identityData.whatsapp) {
      toast.error("Informe seu WhatsApp");
      return;
    }

    try {
      const result = await validateIdentity.mutateAsync(identityData);

      if (result.sucesso) {
        // After validation, check if profile needs completion
        // We'll transition to completar_cadastro — the step itself will check if anything is missing
        setCurrentStep('completar_cadastro');
      }
    } catch (error) {
      console.error("Erro na validação:", error);
    }
  };

  const handleProfileUpdate = async () => {
    // Validate required fields
    const stillMissing = REQUIRED_FIELDS.filter(f => {
      const val = profileForm[f.key];
      return !val || val.trim() === '';
    });

    if (stillMissing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${stillMissing.map(f => f.label).join(', ')}`);
      return;
    }

    // Validate at least one social network
    const validSocials = socialForms.filter(s => s.plataforma && s.usuario.trim());
    if (validSocials.length === 0) {
      toast.error('Adicione pelo menos uma rede social');
      return;
    }

    try {
      // Build profile data — only send fields that changed
      const profileData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(profileForm)) {
        const currentVal = influenciadora ? (influenciadora as Record<string, unknown>)[key] : null;
        if (value && value !== currentVal) {
          profileData[key] = value;
        }
      }

      const socialNetworksPayload = validSocials.map(s => ({
        plataforma: s.plataforma,
        usuario: s.usuario.trim(),
        url: s.url?.trim() || undefined,
        seguidores: s.seguidores ? parseInt(s.seguidores) || 0 : 0,
      }));

      await updateProfile.mutateAsync({
        profileData: Object.keys(profileData).length > 0 ? profileData : undefined,
        socialNetworks: socialNetworksPayload,
      });

      // Go to next step
      if (aditivos.length > 0) {
        setCurrentStep('aditivos');
      } else {
        setCurrentStep('preview');
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    }
  };

  const handleSkipProfileCompletion = () => {
    // If no missing required fields, allow skip
    if (missingProfile.length === 0 && !missingSocialNetworks) {
      if (aditivos.length > 0) {
        setCurrentStep('aditivos');
      } else {
        setCurrentStep('preview');
      }
    }
  };

  const handleSign = async () => {
    if (!signatureCanvas) {
      toast.error("Por favor, desenhe sua assinatura");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Você deve aceitar os termos do contrato");
      return;
    }

    try {
      await registerSignature.mutateAsync({
        canvas_data: signatureCanvas,
        user_agent: navigator.userAgent,
      });

      setCurrentStep('concluido');
    } catch (error) {
      console.error("Erro ao assinar:", error);
    }
  };

  // Social network helpers
  const addSocialNetwork = () => {
    setSocialForms(prev => [...prev, { plataforma: '', usuario: '', url: '', seguidores: '' }]);
  };

  const removeSocialNetwork = (index: number) => {
    setSocialForms(prev => prev.filter((_, i) => i !== index));
  };

  const updateSocialNetwork = (index: number, field: keyof SocialNetworkForm, value: string) => {
    setSocialForms(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  // Step labels para o indicador
  const steps: { key: SignatureStep; label: string }[] = [
    { key: 'validacao', label: 'Identidade' },
    { key: 'completar_cadastro', label: 'Cadastro' },
    { key: 'preview', label: 'Contrato' },
    ...(aditivos.length > 0 ? [{ key: 'aditivos' as SignatureStep, label: 'Aditivos' }] : []),
    { key: 'assinatura', label: 'Assinar' },
    { key: 'concluido', label: 'Concluído' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Token inválido ou não fornecido
  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              Link Inválido
            </CardTitle>
            <CardDescription>
              Este link de assinatura é inválido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para receber um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro ao carregar
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              Erro ao Acessar
            </CardTitle>
            <CardDescription>
              {(error as Error)?.message || "O link pode ter expirado ou ser inválido."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para receber um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header com branding do tenant */}
        <Card>
          <CardHeader className="text-center">
            {branding?.logo_url && (
              <img
                src={branding.logo_url}
                alt={tenant?.nome_fantasia || 'Logo'}
                className="h-12 mx-auto mb-4 object-contain"
              />
            )}
            <CardTitle className="text-2xl md:text-3xl">Assinatura Digital de Contrato</CardTitle>
            <CardDescription>
              {tenant?.nome_fantasia && `${tenant.nome_fantasia} — `}
              Processo seguro e validado de assinatura eletrônica
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Steps Indicator — Responsivo */}
        <div className="flex justify-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto px-2">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm md:text-base ${
                    index <= currentStepIndex
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-background text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] md:text-xs mt-1 text-center whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-4 sm:w-6 md:w-12 h-0.5 mt-[-12px] ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step: Validação de Identidade */}
        {currentStep === 'validacao' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Validação de Identidade
              </CardTitle>
              <CardDescription>
                Confirme seus dados cadastrados para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  value={identityData.whatsapp}
                  onChange={(e) => setIdentityData({ ...identityData, whatsapp: e.target.value })}
                  maxLength={15}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o número de WhatsApp cadastrado na sua parceria
                </p>
              </div>

              <Button
                onClick={handleValidateIdentity}
                disabled={validateIdentity.isPending}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {validateIdentity.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Validar e Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Completar Cadastro */}
        {currentStep === 'completar_cadastro' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-primary" />
                Complete seu Cadastro
              </CardTitle>
              <CardDescription>
                {missingProfile.length > 0 || missingSocialNetworks
                  ? 'Preencha os dados abaixo para poder assinar o contrato'
                  : 'Confira seus dados e adicione redes sociais se necessário'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Missing fields alert */}
              {missingProfile.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
                    Campos obrigatórios pendentes:
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {missingProfile.map(f => f.label).join(', ')}
                  </p>
                </div>
              )}

              {/* Dados Pessoais */}
              <div>
                <h3 className="font-semibold text-base mb-3">Dados Pessoais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="pf-nome_completo">Nome completo *</Label>
                    <Input
                      id="pf-nome_completo"
                      placeholder="Nome completo (como no RG)"
                      value={profileForm.nome_completo || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, nome_completo: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-cpf">CPF *</Label>
                    <Input
                      id="pf-cpf"
                      placeholder="000.000.000-00"
                      value={profileForm.cpf || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, cpf: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-rg">RG *</Label>
                    <Input
                      id="pf-rg"
                      placeholder="00.000.000-0"
                      value={profileForm.rg || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, rg: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-email">E-mail *</Label>
                    <Input
                      id="pf-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={profileForm.email || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-naturalidade">Naturalidade *</Label>
                    <Input
                      id="pf-naturalidade"
                      placeholder="Cidade onde nasceu"
                      value={profileForm.naturalidade || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, naturalidade: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-estado_civil">Estado Civil *</Label>
                    <Select
                      value={profileForm.estado_civil || ''}
                      onValueChange={(v) => setProfileForm(p => ({ ...p, estado_civil: v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADO_CIVIL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-profissao">Profissão *</Label>
                    <Input
                      id="pf-profissao"
                      placeholder="Sua profissão"
                      value={profileForm.profissao || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, profissao: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="font-semibold text-base mb-3">Endereço</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-cep">CEP *</Label>
                    <Input
                      id="pf-cep"
                      placeholder="00000-000"
                      value={profileForm.cep || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, cep: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="pf-endereco">Rua / Endereço *</Label>
                    <Input
                      id="pf-endereco"
                      placeholder="Rua, Avenida..."
                      value={profileForm.endereco || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, endereco: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-numero">Número *</Label>
                    <Input
                      id="pf-numero"
                      placeholder="Nº"
                      value={profileForm.numero || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, numero: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-bairro">Bairro *</Label>
                    <Input
                      id="pf-bairro"
                      placeholder="Bairro"
                      value={profileForm.bairro || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, bairro: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-cidade">Cidade *</Label>
                    <Input
                      id="pf-cidade"
                      placeholder="Cidade"
                      value={profileForm.cidade || ''}
                      onChange={(e) => setProfileForm(p => ({ ...p, cidade: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-estado">Estado *</Label>
                    <Select
                      value={profileForm.estado || ''}
                      onValueChange={(v) => setProfileForm(p => ({ ...p, estado: v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADO_OPTIONS.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Redes Sociais */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">Redes Sociais *</h3>
                    <p className="text-xs text-muted-foreground">Adicione pelo menos uma rede social</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSocialNetwork}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {socialForms.length === 0 && (
                  <div className="border border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-6 text-center bg-amber-50/50 dark:bg-amber-950/50">
                    <AtSign className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      Nenhuma rede social cadastrada
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSocialNetwork}
                      className="h-10"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Rede Social
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {socialForms.map((sn, index) => (
                    <div key={sn.plataforma ? `${sn.plataforma}-${index}` : `sn-${index}`} className="border rounded-lg p-3 bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Rede Social #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSocialNetwork(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Plataforma</Label>
                          <Select
                            value={sn.plataforma}
                            onValueChange={(v) => updateSocialNetwork(index, 'plataforma', v)}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATAFORMAS.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.icon} {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Usuário / @</Label>
                          <Input
                            placeholder="@seu_usuario"
                            value={sn.usuario}
                            onChange={(e) => updateSocialNetwork(index, 'usuario', e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>URL do perfil</Label>
                          <Input
                            placeholder="https://instagram.com/..."
                            value={sn.url}
                            onChange={(e) => updateSocialNetwork(index, 'url', e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Seguidores</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 15000"
                            value={sn.seguidores}
                            onChange={(e) => updateSocialNetwork(index, 'seguidores', e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('validacao')}
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleProfileUpdate}
                  disabled={updateProfile.isPending}
                  className="flex-1 h-12 text-base font-semibold"
                  size="lg"
                >
                  {updateProfile.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar e Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview do Contrato */}
        {currentStep === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                Revisão do Contrato
              </CardTitle>
              <CardDescription>
                Leia atentamente antes de assinar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contratoData ? (
                <>
                  {/* Preview visual completo do contrato */}
                  <div className="max-h-[60vh] overflow-y-auto border rounded-lg p-4 sm:p-6 bg-white dark:bg-gray-950">
                    <ContratoTemplate data={contratoData} hideButtons />
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Importante:</strong> Leia todo o contrato antes de prosseguir com a assinatura.
                      A assinatura digital tem a mesma validade jurídica que uma assinatura física.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('completar_cadastro')}
                      className="flex-1 h-12 text-base"
                      size="lg"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={() => {
                        if (aditivos.length > 0 && !acceptedAditivos) {
                          setCurrentStep('aditivos');
                        } else {
                          setCurrentStep('assinatura');
                        }
                      }}
                      className="flex-1 h-12 text-base font-semibold"
                      size="lg"
                    >
                      Prosseguir para Assinatura
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Documento não disponível</p>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('assinatura')}
                    className="mt-4"
                  >
                    Prosseguir mesmo assim
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Aditivos Contratuais */}
        {currentStep === 'aditivos' && aditivos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-6 w-6 text-primary" />
                Aditivos Contratuais
              </CardTitle>
              <CardDescription>
                O contrato possui {aditivos.length} aditivo(s). Revise as alterações antes de assinar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="multiple" defaultValue={aditivos.map((_, i) => `aditivo-${i}`)}>
                {aditivos.map((aditivo, index) => (
                  <AccordionItem key={aditivo.id} value={`aditivo-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Aditivo nº {aditivo.aditivo_numero || index + 1}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(aditivo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {aditivo.motivo && (
                          <div>
                            <p className="text-sm font-medium">Motivo:</p>
                            <p className="text-sm text-muted-foreground">{aditivo.motivo}</p>
                          </div>
                        )}

                        {/* Preview visual completo do aditivo */}
                        {contratoData && (
                          <div className="max-h-[40vh] overflow-y-auto border rounded-lg p-4 bg-white dark:bg-gray-950 mt-3">
                            <ContratoTemplate
                              data={{
                                ...contratoData,
                                template_tipo: "aditivo",
                                aditivo_numero: aditivo.aditivo_numero || index + 1,
                                aditivo_descricao: aditivo.aditivo_descricao || aditivo.motivo || undefined,
                                aditivo_dados_anteriores: aditivo.dados_anteriores as Record<string, any> || undefined,
                                aditivo_dados_novos: aditivo.dados_novos as Record<string, any> || undefined,
                              }}
                              hideButtons
                            />
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="accept-aditivos"
                  checked={acceptedAditivos}
                  onCheckedChange={(checked) => setAcceptedAditivos(checked as boolean)}
                />
                <label
                  htmlFor="accept-aditivos"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Li e concordo com todas as alterações dos aditivos contratuais acima.
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('preview')}
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => setCurrentStep('assinatura')}
                  disabled={!acceptedAditivos}
                  className="flex-1 h-12 text-base font-semibold"
                  size="lg"
                >
                  Prosseguir para Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Assinatura */}
        {currentStep === 'assinatura' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-6 w-6 text-primary" />
                Assinatura Digital
              </CardTitle>
              <CardDescription>
                Desenhe sua assinatura no campo abaixo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full overflow-x-auto">
                <AssinaturaDigitalCanvas
                  onSignatureChange={(data) => setSignatureCanvas(data)}
                  width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 80 : 600)}
                  height={200}
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Declaro que li e concordo com todos os termos deste contrato
                  {aditivos.length > 0 && ` e seus ${aditivos.length} aditivo(s)`}.
                  Compreendo que esta assinatura digital possui a mesma validade jurídica de uma assinatura manuscrita.
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (aditivos.length > 0) {
                      setCurrentStep('aditivos');
                    } else {
                      setCurrentStep('preview');
                    }
                  }}
                  className="flex-1 h-12 text-base"
                  size="lg"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={registerSignature.isPending || !acceptedTerms}
                  className="flex-1 h-12 text-base font-semibold"
                  size="lg"
                >
                  {registerSignature.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assinar Contrato
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Concluído */}
        {currentStep === 'concluido' && (
          <Card>
            <CardContent className="text-center py-8 md:py-12">
              <CheckCircle2 className="h-16 w-16 md:h-20 md:w-20 text-green-600 mx-auto mb-4 md:mb-6" />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Contrato Assinado!</h2>
              <p className="text-muted-foreground mb-4 md:mb-6">
                Sua assinatura foi registrada com sucesso em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <Badge variant="default" className="mb-4 md:mb-6">
                Documento Autenticado Digitalmente
              </Badge>
              {aditivos.length > 0 && (
                <p className="text-sm text-muted-foreground mb-2">
                  Incluindo {aditivos.length} aditivo(s) contratual(is).
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Um certificado de autenticidade foi gerado e anexado ao contrato.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
