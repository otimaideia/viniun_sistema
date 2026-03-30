import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenantDetection } from "@/hooks/multitenant/useTenantDetection";
import PublicPageLayout from "@/components/public/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInputInternational, cleanPhoneNumber } from "@/components/ui/phone-input-international";
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
  User,
  Camera,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Sparkles,
  Upload,
  X,
  Share2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { validateCPF, cleanCPF } from "@/utils/cpf";
import LandingPageInfluenciadora from "@/components/influenciadoras/LandingPageInfluenciadora";
import type {
  InfluenciadoraFormData,
  InfluenciadoraTipo,
  InfluenciadoraTamanho,
  RedeSocialPlataforma,
  RedeSocialFormData,
} from "@/types/influenciadora";

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const TIPOS_INFLUENCIADORA: { value: InfluenciadoraTipo; label: string }[] = [
  { value: "influenciador", label: "Influenciador(a)" },
  { value: "ugc_creator", label: "UGC Creator" },
  { value: "ambos", label: "Influenciador + UGC" },
];

const TAMANHOS_INFLUENCIADORA: { value: InfluenciadoraTamanho; label: string }[] = [
  { value: "nano", label: "Nano (1k-10k seguidores)" },
  { value: "micro", label: "Micro (10k-50k seguidores)" },
  { value: "medio", label: "Médio (50k-500k seguidores)" },
  { value: "macro", label: "Macro (500k-1M seguidores)" },
  { value: "mega", label: "Mega (1M+ seguidores)" },
];

const PLATAFORMAS: { value: RedeSocialPlataforma; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter/X" },
  { value: "kwai", label: "Kwai" },
];

const STEPS = [
  { id: 1, title: "Dados Pessoais", icon: User },
  { id: 2, title: "Redes Sociais", icon: Share2 },
  { id: 3, title: "Perfil", icon: Camera },
  { id: 4, title: "Termos", icon: FileCheck },
];

const CadastroInfluenciadora = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Detecta o tenant automaticamente: domínio customizado em prod, ?tenant= em dev
  const { tenant: detectedTenant, isLoading: isTenantLoading, error: tenantDetectionError } = useTenantDetection();

  // Se o usuário está logado e o tenant detectado é o fallback (franqueadora),
  // tenta buscar o tenant real do usuário autenticado
  const [authTenant, setAuthTenant] = useState<typeof detectedTenant>(null);
  useEffect(() => {
    if (isTenantLoading) return;
    // Só buscar se caiu no fallback (franqueadora/plataforma)
    if (detectedTenant && detectedTenant.slug !== 'franqueadora') return;

    let mounted = true;
    const fetchAuthTenant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { data: mtUser } = await (supabase.from('mt_users') as any)
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!mtUser?.tenant_id || !mounted) return;

      const { data: tenantData } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('id', mtUser.tenant_id)
        .eq('is_active', true)
        .maybeSingle();
      if (tenantData && mounted) setAuthTenant(tenantData);
    };
    fetchAuthTenant();
    return () => { mounted = false; };
  }, [detectedTenant, isTenantLoading]);

  // Prioridade: tenant do usuário logado > tenant detectado pela URL
  const tenant = authTenant || detectedTenant;

  // Detecta franchise pelo query param ?franchise= (slug da franquia)
  // Fallback automático: quando não há ?franchise=, detecta pelo domínio atual
  // (ex: app.yeslaserpraiagrande.com.br → cidade "Praia Grande" → YESlaser Praia Grande)
  const franchiseSlugParam = new URLSearchParams(window.location.search).get("franchise");
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  useEffect(() => {
    if (!tenant?.id) return;
    let mounted = true;

    const lookupBySlug = async (slug: string) => {
      const { data, error } = await supabase
        .from("mt_franchises")
        .select("id")
        .eq("slug", slug)
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) { console.error('[Cadastro] Erro ao buscar franquia:', error.message); return; }
      if (data?.id) setFranchiseId(data.id);
    };

    const lookupByDomain = async () => {
      // Busca todas as franquias do tenant para matching
      const { data: franchises } = await supabase
        .from("mt_franchises")
        .select("id, cidade, slug, nome_fantasia")
        .eq("tenant_id", tenant.id);
      if (!mounted || !franchises || franchises.length === 0) return;

      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '');

      // 1. Tenta extrair cidade do hostname
      // Ex: "www.yeslaserpraiagrande.com.br" → "praiagrande"
      // Ex: "www.depilacaoalaserpraiagrande.com.br" → "depilacaoalaserpraiagrande" (contém "praiagrande")
      const hostname = window.location.hostname;
      const tenantSlug = normalize(tenant.slug || '');
      const hostParts = hostname.split('.');
      const basePart = hostParts.find(p => p.length > 6 && p !== 'app' && p !== 'www') || '';
      const baseNorm = normalize(basePart);
      // Remove o slug do tenant para isolar a cidade
      const cityNorm = baseNorm.replace(tenantSlug, '').replace(/[^a-z0-9]/g, '');

      // 2. Tenta match pela cidade no domínio
      let match = null;
      if (cityNorm.length >= 3) {
        match = franchises.find(f => {
          const cidadeNorm = normalize(f.cidade || '');
          if (!cidadeNorm || cidadeNorm === 'naoinformado') return false;
          return cidadeNorm.includes(cityNorm) || cityNorm.includes(cidadeNorm);
        });
      }

      // 3. Se não encontrou pela cidade extraída, tenta match no domínio completo
      // (ex: "depilacaoalaserpraiagrande" contém "praiagrande")
      if (!match && baseNorm.length >= 3) {
        match = franchises.find(f => {
          const cidadeNorm = normalize(f.cidade || '');
          if (!cidadeNorm || cidadeNorm === 'naoinformado' || cidadeNorm.length < 4) return false;
          return baseNorm.includes(cidadeNorm);
        });
      }

      // 4. Fallback: se o tenant tem apenas uma franquia "real" (com nome_fantasia), usa ela
      if (!match) {
        const reais = franchises.filter(f => f.nome_fantasia && f.nome_fantasia.trim().length > 0);
        if (reais.length === 1) {
          match = reais[0];
          console.log(`[Cadastro] Franquia única do tenant: ${match.nome_fantasia}`);
        }
      }

      if (match?.id) {
        console.log(`[Cadastro] Franquia detectada pelo domínio: ${match.nome_fantasia} (${match.cidade})`);
        setFranchiseId(match.id);
      } else {
        // 5. Fallback: se usuário está logado, usa a franquia vinculada
        console.warn('[Cadastro] Nenhuma franquia detectada pelo domínio:', hostname);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && mounted) {
            const { data: mtUser } = await (supabase.from('mt_users') as any)
              .select('franchise_id')
              .eq('auth_user_id', user.id)
              .maybeSingle();
            if (mtUser?.franchise_id && mounted) {
              console.log('[Cadastro] Franquia do usuário logado:', mtUser.franchise_id);
              setFranchiseId(mtUser.franchise_id);
              return;
            }
          }
        } catch (e) {
          // User not logged in - expected for public page
        }
      }
    };

    if (franchiseSlugParam) {
      lookupBySlug(franchiseSlugParam).catch(err => console.error('[Cadastro] Erro inesperado ao buscar franquia:', err));
    } else {
      lookupByDomain().catch(err => console.error('[Cadastro] Erro ao detectar franquia por domínio:', err));
    }

    return () => { mounted = false; };
  }, [franchiseSlugParam, tenant?.id, tenant?.slug]);

  // Carrega dados completos da franquia e branding para a landing page
  const [franchiseData, setFranchiseData] = useState<{
    nome_fantasia?: string; cidade?: string; endereco?: string; numero?: string;
    bairro?: string; estado?: string; cep?: string; telefone?: string;
    whatsapp?: string; email?: string; horario_funcionamento?: Record<string, { abre: string; fecha: string } | null> | null;
    instagram?: string; tiktok?: string; facebook?: string; website?: string;
    google_maps_url?: string; google_maps_embed_url?: string; latitude?: number; longitude?: number;
  } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    let mounted = true;

    // Carregar branding (logo)
    supabase
      .from("mt_tenant_branding")
      .select("logo_url")
      .eq("tenant_id", tenant.id)
      .single()
      .then(({ data }) => {
        if (data?.logo_url && mounted) setLogoUrl(data.logo_url);
      });

    // Carregar dados completos da franquia (se temos franchiseId)
    if (franchiseId) {
      supabase
        .from("mt_franchises")
        .select("nome_fantasia, cidade, endereco, numero, bairro, estado, cep, telefone, whatsapp, email, horario_funcionamento, instagram, tiktok, facebook, website, google_maps_url, google_maps_embed_url, latitude, longitude")
        .eq("id", franchiseId)
        .single()
        .then(({ data }) => {
          if (data && mounted) setFranchiseData(data);
        });
    }

    return () => { mounted = false; };
  }, [tenant?.id, franchiseId]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  // Form state
  const [formData, setFormData] = useState<InfluenciadoraFormData & { telefone_codigo_pais?: string; whatsapp_codigo_pais?: string; codigo?: string }>({
    nome_completo: "",
    nome_artistico: "",
    email: "",
    telefone: "",
    telefone_codigo_pais: "55",
    whatsapp: "",
    whatsapp_codigo_pais: "55",
    cpf: "",
    data_nascimento: "",
    genero: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    foto_perfil: "",
    biografia: "",
    tipo: "influenciador",
    tamanho: undefined,
    aceite_termos: false,
    codigo: "",
  });

  const [redesSociais, setRedesSociais] = useState<RedeSocialFormData[]>([
    { plataforma: "instagram", username: "", url: "", seguidores: 0 },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setPhotoFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    updateField("foto_perfil", "");
  };

  const uploadPhoto = async (influenciadoraId: string): Promise<string | null> => {
    if (!photoFile) return null;

    setIsUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `influenciadoras/${influenciadoraId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("influenciadoras-fotos")
        .upload(fileName, photoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        // Se o bucket não existir, tenta criar
        if (error.message.includes("Bucket not found")) {
          toast.error("Bucket de fotos não configurado. Contate o administrador.");
        } else {
          toast.error("Erro ao enviar foto");
        }
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("influenciadoras-fotos")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const updateField = (field: keyof InfluenciadoraFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Busca automática de endereço pelo CEP via ViaCEP
  const handleCepChange = async (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    updateField("cep", formatted);
    if (digits.length === 8) {
      setIsLookingUpCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            cep: formatted,
            endereco: data.logradouro || prev.endereco,
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

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const addRedeSocial = () => {
    setRedesSociais((prev) => [
      ...prev,
      { plataforma: "instagram", username: "", url: "", seguidores: 0 },
    ]);
  };

  const removeRedeSocial = (index: number) => {
    setRedesSociais((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRedeSocial = (
    index: number,
    field: keyof RedeSocialFormData,
    value: unknown
  ) => {
    setRedesSociais((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.nome_completo?.trim()) {
        newErrors.nome_completo = "Nome é obrigatório";
      }
      if (!formData.whatsapp?.trim()) {
        newErrors.whatsapp = "WhatsApp é obrigatório";
      } else {
        const cleanWhatsApp = cleanPhoneNumber(formData.whatsapp);
        if (cleanWhatsApp.length < 8) {
          newErrors.whatsapp = "WhatsApp inválido";
        }
      }
      // CPF obrigatório
      if (!formData.cpf?.trim()) {
        newErrors.cpf = "CPF é obrigatório";
      } else {
        const cpfLimpo = cleanCPF(formData.cpf);
        if (cpfLimpo.length !== 11) {
          newErrors.cpf = "CPF deve ter 11 dígitos";
        } else if (!validateCPF(formData.cpf)) {
          newErrors.cpf = "CPF inválido";
        }
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }
    }

    if (step === 2) {
      const hasValidRedeSocial = redesSociais.some(
        (r) => r.username?.trim() && r.seguidores && r.seguidores > 0
      );
      if (!hasValidRedeSocial) {
        newErrors.redes = "Adicione pelo menos uma rede social com seguidores";
      }
    }

    if (step === 4) {
      if (!formData.aceite_termos) {
        newErrors.aceite_termos = "Você precisa aceitar os termos";
      }
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
      // Calcular total de seguidores
      const totalSeguidores = redesSociais.reduce(
        (sum, r) => sum + (r.seguidores || 0),
        0
      );

      // Gerar/validar código de indicação
      let codigoFinal = formData.codigo?.trim().toUpperCase() || "";
      if (!codigoFinal) {
        // Auto-gerar do primeiro nome + sufixo aleatório
        const primeiroNome = formData.nome_completo.trim().split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
        const sufixo = Math.floor(100 + Math.random() * 900).toString();
        codigoFinal = `${primeiroNome}${sufixo}`;
      }
      // Verificar unicidade
      const { data: codigoExiste } = await supabase
        .from("mt_influencers")
        .select("id")
        .eq("codigo", codigoFinal)
        .eq("tenant_id", tenant!.id)
        .maybeSingle();
      if (codigoExiste) {
        // Adicionar sufixo para garantir unicidade
        codigoFinal = `${codigoFinal}${Math.floor(10 + Math.random() * 90)}`;
      }

      // Criar influenciadora primeiro (sem foto)
      const { data: influenciadora, error: infError } = await supabase
        .from("mt_influencers")
        .insert({
          tenant_id: tenant!.id,
          franchise_id: franchiseId || null,
          nome_completo: formData.nome_completo,
          nome_artistico: formData.nome_artistico || null,
          email: formData.email || null,
          telefone: formData.telefone ? cleanPhoneNumber(formData.telefone) : null,
          telefone_codigo_pais: formData.telefone_codigo_pais || "55",
          whatsapp: cleanPhoneNumber(formData.whatsapp),
          whatsapp_codigo_pais: formData.whatsapp_codigo_pais || "55",
          cpf: formData.cpf?.replace(/\D/g, "") || null,
          data_nascimento: formData.data_nascimento || null,
          genero: formData.genero || null,
          cep: formData.cep || null,
          endereco: formData.endereco || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          pais: formData.pais || "Brasil",
          foto_perfil: null, // Será atualizado após upload
          biografia: formData.biografia || null,
          tipo: formData.tipo,
          tamanho: formData.tamanho || null,
          total_seguidores: totalSeguidores,
          codigo: codigoFinal,
          status: "pendente",
          ativo: true,
          aceite_termos: true,
          aceite_termos_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (infError) throw infError;

      // Upload da foto se houver
      if (photoFile && influenciadora) {
        const photoUrl = await uploadPhoto(influenciadora.id);
        if (photoUrl) {
          // Atualizar influenciadora com URL da foto
          await supabase
            .from("mt_influencers")
            .update({ foto_perfil: photoUrl })
            .eq("id", influenciadora.id);
        }
      }

      // Criar redes sociais
      const redesValidas = redesSociais.filter((r) => r.username?.trim());
      if (redesValidas.length > 0 && influenciadora) {
        const { error: redesError } = await supabase
          .from("mt_influencer_social_networks")
          .insert(
            redesValidas.map((r) => ({
              influencer_id: influenciadora.id,
              tenant_id: tenant!.id,
              plataforma: r.plataforma,
              username: r.username,
              url: r.url || null,
              seguidores: r.seguidores || 0,
            }))
          );

        if (redesError) {
          console.error("Erro ao salvar redes sociais:", redesError);
        }
      }

      // Criar contrato padrão (template permuta) automaticamente
      if (influenciadora) {
        const hoje = new Date();
        const fimContrato = new Date(hoje);
        fimContrato.setMonth(fimContrato.getMonth() + 6);

        const { error: contratoError } = await supabase
          .from("mt_influencer_contracts")
          .insert({
            influencer_id: influenciadora.id,
            tenant_id: tenant!.id,
            franchise_id: franchiseId || null,
            tipo: "permuta",
            template_tipo: "contrato_permuta",
            data_inicio: hoje.toISOString().split("T")[0],
            data_fim: fimContrato.toISOString().split("T")[0],
            credito_permuta: 3000,
            posts_mes: 1,
            stories_mes: 10,
            reels_mes: 2,
            status: "ativo",
            servicos_permuta: ["axila", "virilha", "meia_perna", "drenagem", "revitalizacao_facial", "limpeza_pele", "pump_gluteo"],
          });

        if (contratoError) {
          console.error("Erro ao criar contrato padrão:", contratoError);
        }
      }

      setIsSuccess(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao realizar cadastro. Tente novamente.");
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
            <h2 className="text-xl font-bold text-gray-800 mb-2">Página não encontrada</h2>
            <p className="text-gray-600">Este link de cadastro não está configurado. Solicite um novo link com a equipe.</p>
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
        subtitle="Programa de Influenciadoras"
        subtitleIcon={<Sparkles className="h-5 w-5" />}
        accentColor="#db2777"
      >
        <div className="flex items-center justify-center p-4 py-16">
          <Card className="w-full max-w-lg text-center">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Cadastro Realizado!
              </h1>
              <p className="text-gray-600 mb-6">
                Seu cadastro foi enviado com sucesso e está aguardando aprovação.
                Você receberá uma mensagem no WhatsApp assim que for aprovado.
              </p>
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Próximos passos:</strong> Nossa equipe irá analisar seu
                  perfil e entrar em contato em até 48 horas úteis.
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full">
                Voltar ao Início
              </Button>
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
      subtitle="Programa de Influenciadoras"
      subtitleIcon={<Sparkles className="h-5 w-5" />}
      accentColor="#db2777"
      hideHeader
      hideFooter
    >
      {/* Landing Page */}
      <LandingPageInfluenciadora
        tenantName={tenant?.nome_fantasia || "YESlaser"}
        accentColor="#db2777"
        onScrollToForm={scrollToForm}
        franchiseName={franchiseData?.nome_fantasia || undefined}
        franchiseCity={franchiseData?.cidade || undefined}
        franchiseAddress={
          franchiseData
            ? [franchiseData.endereco, franchiseData.numero, franchiseData.bairro, franchiseData.cidade && franchiseData.estado ? `${franchiseData.cidade}/${franchiseData.estado}` : null, franchiseData.cep ? `CEP ${franchiseData.cep}` : null].filter(Boolean).join(", ")
            : undefined
        }
        franchisePhone={franchiseData?.whatsapp || franchiseData?.telefone || undefined}
        franchiseEmail={franchiseData?.email || undefined}
        franchiseHours={
          franchiseData?.horario_funcionamento?.segunda
            ? `Seg-Sex: ${franchiseData.horario_funcionamento.segunda.abre} - ${franchiseData.horario_funcionamento.segunda.fecha}${franchiseData.horario_funcionamento.sabado ? ` | Sab: ${franchiseData.horario_funcionamento.sabado.abre} - ${franchiseData.horario_funcionamento.sabado.fecha}` : ""}`
            : undefined
        }
        logoUrl={logoUrl || undefined}
        franchiseState={franchiseData?.estado || undefined}
        franchiseInstagram={franchiseData?.instagram || undefined}
        franchiseTiktok={franchiseData?.tiktok || undefined}
        franchiseFacebook={franchiseData?.facebook || undefined}
        franchiseWebsite={franchiseData?.website || undefined}
        franchiseMapUrl={franchiseData?.google_maps_url || undefined}
        franchiseMapEmbedUrl={franchiseData?.google_maps_embed_url || undefined}
        franchiseLat={franchiseData?.latitude || undefined}
        franchiseLng={franchiseData?.longitude || undefined}
      >

      {/* Formulário de Cadastro */}
      <div ref={formRef} className="max-w-2xl mx-auto px-4 py-8 pt-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  currentStep >= step.id ? "text-pink-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= step.id
                      ? "bg-pink-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = STEPS[currentStep - 1].icon;
                return <StepIcon className="h-5 w-5 text-pink-600" />;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Preencha seus dados pessoais para começar"}
              {currentStep === 2 &&
                "Adicione suas redes sociais para conhecermos seu perfil"}
              {currentStep === 3 &&
                "Conte-nos mais sobre você e seu trabalho"}
              {currentStep === 4 &&
                "Revise os termos e finalize seu cadastro"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Dados Pessoais */}
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.nome_completo}
                      onChange={(e) =>
                        updateField("nome_completo", e.target.value)
                      }
                      className={errors.nome_completo ? "border-destructive" : ""}
                    />
                    {errors.nome_completo && (
                      <p className="text-xs text-destructive">
                        {errors.nome_completo}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Artístico</Label>
                    <Input
                      placeholder="@seu_nome"
                      value={formData.nome_artistico || ""}
                      onChange={(e) =>
                        updateField("nome_artistico", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WhatsApp *</Label>
                    <PhoneInputInternational
                      value={formData.whatsapp}
                      countryCode={formData.whatsapp_codigo_pais || "55"}
                      onChange={(value) => updateField("whatsapp", value)}
                      onCountryChange={(code) => updateField("whatsapp_codigo_pais", code)}
                      error={!!errors.whatsapp}
                      showCountryName
                    />
                    {errors.whatsapp && (
                      <p className="text-xs text-destructive">
                        {errors.whatsapp}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      CPF <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf || ""}
                      onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                      maxLength={14}
                      className={errors.cpf ? "border-red-500" : ""}
                    />
                    {errors.cpf && <p className="text-sm text-red-500">{errors.cpf}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.data_nascimento || ""}
                      onChange={(e) => updateField("data_nascimento", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select
                      value={formData.genero || ""}
                      onValueChange={(v) => updateField("genero", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                        <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Endereço completo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        value={formData.cep || ""}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                      />
                      {isLookingUpCep && (
                        <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      placeholder="Rua, Avenida, etc."
                      value={formData.endereco || ""}
                      onChange={(e) => updateField("endereco", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      placeholder="Nº"
                      value={formData.numero || ""}
                      onChange={(e) => updateField("numero", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Complemento</Label>
                    <Input
                      placeholder="Apto, Bloco, etc."
                      value={formData.complemento || ""}
                      onChange={(e) => updateField("complemento", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={formData.bairro || ""}
                      onChange={(e) => updateField("bairro", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.cidade || ""}
                      onChange={(e) => updateField("cidade", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={formData.estado || ""}
                      onValueChange={(v) => updateField("estado", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BRASIL.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label>País</Label>
                    <Input
                      value={formData.pais || "Brasil"}
                      onChange={(e) => updateField("pais", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Redes Sociais */}
            {currentStep === 2 && (
              <>
                {errors.redes && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {errors.redes}
                  </div>
                )}

                {redesSociais.map((rede, index) => (
                  <div
                    key={rede.plataforma ? `${rede.plataforma}-${index}` : `rede-${index}`}
                    className="p-4 rounded-lg border bg-gray-50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Rede Social #{index + 1}</h4>
                      {redesSociais.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeRedeSocial(index)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plataforma</Label>
                        <Select
                          value={rede.plataforma}
                          onValueChange={(v) =>
                            updateRedeSocial(
                              index,
                              "plataforma",
                              v as RedeSocialPlataforma
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATAFORMAS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Seguidores</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 10000"
                          value={rede.seguidores || ""}
                          onChange={(e) =>
                            updateRedeSocial(
                              index,
                              "seguidores",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                          placeholder="@seu_usuario"
                          value={rede.username || ""}
                          onChange={(e) =>
                            updateRedeSocial(index, "username", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL do Perfil</Label>
                        <Input
                          placeholder="https://..."
                          value={rede.url || ""}
                          onChange={(e) =>
                            updateRedeSocial(index, "url", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addRedeSocial}
                  className="w-full"
                >
                  + Adicionar Outra Rede Social
                </Button>
              </>
            )}

            {/* Step 3: Perfil */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Criador *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) =>
                        updateField("tipo", v as InfluenciadoraTipo)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_INFLUENCIADORA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho (Total de Seguidores)</Label>
                    <Select
                      value={formData.tamanho || ""}
                      onValueChange={(v) =>
                        updateField("tamanho", v as InfluenciadoraTamanho)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAMANHOS_INFLUENCIADORA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Foto de Perfil</Label>
                  <div className="flex items-center gap-4">
                    {/* Preview da foto */}
                    <Avatar className="h-20 w-20 border-2 border-pink-200">
                      <AvatarImage src={photoPreview || undefined} />
                      <AvatarFallback className="bg-pink-50 text-pink-600">
                        <Camera className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Botões de upload/remover */}
                    <div className="flex-1 space-y-2">
                      {!photoPreview ? (
                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors">
                          <Upload className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Clique para enviar sua foto
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Foto selecionada
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={removePhoto}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remover
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG ou GIF. Máximo 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Biografia / Sobre você</Label>
                  <Textarea
                    placeholder="Conte um pouco sobre você, seu nicho e estilo de conteúdo..."
                    value={formData.biografia || ""}
                    onChange={(e) => updateField("biografia", e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo 500 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Código de Indicação</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: MARIA, JOAO123, INFLUENCER (deixe em branco para gerar automaticamente)"
                      value={formData.codigo || ""}
                      onChange={(e) =>
                        updateField("codigo", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                      }
                      maxLength={20}
                      className={errors.codigo ? "border-destructive" : ""}
                    />
                  </div>
                  {errors.codigo && (
                    <p className="text-xs text-destructive">{errors.codigo}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Apenas letras e números, sem espaços. Será usado no seu link de indicação. Se não preencher, geramos automaticamente.
                  </p>
                </div>
              </>
            )}

            {/* Step 4: Termos */}
            {currentStep === 4 && (
              <>
                <div className="p-4 rounded-lg bg-gray-50 border space-y-4 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold">
                    Termos de Uso do Programa de Influenciadoras YESlaser
                  </h4>
                  <p className="text-sm text-gray-600">
                    Ao participar do Programa de Influenciadoras YESlaser, você
                    concorda com os seguintes termos:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc pl-4 space-y-2">
                    <li>
                      Você deve ter pelo menos 18 anos de idade e ser legalmente
                      capaz de celebrar acordos.
                    </li>
                    <li>
                      Todas as informações fornecidas devem ser verdadeiras e
                      atualizadas.
                    </li>
                    <li>
                      Você concorda em receber comunicações da YESlaser via
                      WhatsApp para promoções e atualizações do programa.
                    </li>
                    <li>
                      O código de indicação é pessoal e intransferível, e deve
                      ser utilizado de forma ética.
                    </li>
                    <li>
                      A YESlaser se reserva o direito de aprovar ou rejeitar
                      cadastros sem necessidade de justificativa.
                    </li>
                    <li>
                      Comissões e pagamentos serão realizados conforme acordo
                      específico a ser firmado após aprovação.
                    </li>
                    <li>
                      Seus dados pessoais serão tratados conforme nossa Política
                      de Privacidade.
                    </li>
                  </ul>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="aceite_termos"
                    checked={formData.aceite_termos}
                    onCheckedChange={(checked) =>
                      updateField("aceite_termos", checked)
                    }
                  />
                  <div>
                    <Label htmlFor="aceite_termos" className="cursor-pointer">
                      Li e aceito os Termos de Uso do Programa de Influenciadoras
                    </Label>
                    {errors.aceite_termos && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.aceite_termos}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-pink-200 bg-pink-50">
                  <h4 className="font-semibold text-pink-800 mb-2">
                    Resumo do seu cadastro
                  </h4>
                  <div className="text-sm text-pink-700 space-y-1">
                    <p>
                      <strong>Nome:</strong> {formData.nome_completo}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> {formData.whatsapp}
                    </p>
                    <p>
                      <strong>Tipo:</strong>{" "}
                      {
                        TIPOS_INFLUENCIADORA.find((t) => t.value === formData.tipo)
                          ?.label
                      }
                    </p>
                    <p>
                      <strong>Redes Sociais:</strong>{" "}
                      {redesSociais
                        .filter((r) => r.username)
                        .map((r) => r.plataforma)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalizar Cadastro
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
      </LandingPageInfluenciadora>
    </PublicPageLayout>
  );
};

export default CadastroInfluenciadora;
