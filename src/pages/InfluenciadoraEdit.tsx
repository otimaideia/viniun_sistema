import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  MapPin,
  Instagram,
  Plus,
  Trash2,
  Link as LinkIcon,
  Users,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { useSocialMediaFetchAdapter, parseUsernameFromUrl } from "@/hooks/useSocialMediaFetchAdapter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { differenceInYears } from "date-fns";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
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
  { value: "nano", label: "Nano (1k-10k)" },
  { value: "micro", label: "Micro (10k-50k)" },
  { value: "medio", label: "Médio (50k-500k)" },
  { value: "macro", label: "Macro (500k-1M)" },
  { value: "mega", label: "Mega (1M+)" },
];

const PLATAFORMAS_REDES: { value: RedeSocialPlataforma; label: string; icon: string; placeholder: string }[] = [
  { value: "instagram", label: "Instagram", icon: "📸", placeholder: "@username" },
  { value: "tiktok", label: "TikTok", icon: "🎵", placeholder: "@username" },
  { value: "youtube", label: "YouTube", icon: "▶️", placeholder: "@channel" },
  { value: "facebook", label: "Facebook", icon: "👤", placeholder: "facebook.com/..." },
  { value: "twitter", label: "Twitter/X", icon: "🐦", placeholder: "@username" },
  { value: "kwai", label: "Kwai", icon: "🎬", placeholder: "@username" },
  { value: "linkedin", label: "LinkedIn", icon: "💼", placeholder: "linkedin.com/in/..." },
  { value: "pinterest", label: "Pinterest", icon: "📌", placeholder: "@username" },
];

const emptyForm: InfluenciadoraFormData = {
  nome_completo: "",
  nome_artistico: "",
  email: "",
  telefone: "",
  whatsapp: "",
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
  franchise_id: undefined, // MT
  franqueado_id: undefined, // Legacy
  unidade_id: undefined, // Legacy
  responsavel_id: undefined,
};

const emptyRedeSocial: RedeSocialFormData = {
  plataforma: "instagram",
  username: "",
  url: "",
  seguidores: 0,
  taxa_engajamento: 0,
};

const InfluenciadoraEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { tenant, franchise } = useTenantContext(); // Pegar franquia do usuário logado

  const { franqueados } = useFranqueadosAdapter();

  const {
    createAsync,
    updateAsync,
    getInfluenciadora,
    isCreating,
    isUpdating,
    checkWhatsAppExists,
    checkEmailExists,
    checkCPFExists,
  } = useInfluenciadorasAdapter();

  const [form, setForm] = useState<InfluenciadoraFormData>(emptyForm);

  // Buscar usuários do tenant para seletor de responsável
  // IMPORTANTE: deve ficar após useState(form) para evitar TDZ
  const { data: usuariosDisponiveis = [] } = useQuery({
    queryKey: ['mt-users-responsavel', tenant?.id, form.franchise_id || form.franqueado_id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      let q = supabase
        .from('mt_users')
        .select('id, nome, cargo, avatar_url, franchise_id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('nome', { ascending: true });

      // Se há franquia selecionada, filtrar por ela
      const franchiseId = form.franchise_id || form.franqueado_id;
      if (franchiseId) {
        q = q.eq('franchise_id', franchiseId);
      }

      const { data, error } = await q;
      if (error) return [];
      return data as { id: string; nome: string; cargo: string | null; avatar_url: string | null; franchise_id: string | null }[];
    },
    enabled: !!tenant?.id,
  });
  const [redesSociais, setRedesSociais] = useState<RedeSocialFormData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [existingRedesIds, setExistingRedesIds] = useState<Record<string, string>>({});

  // Hook para auto-fetch de dados de redes sociais
  const {
    fetchProfile,
    isAutoFetchSupported,
    getFetchStatus,
    getError: getFetchError,
    supportedPlatforms,
  } = useSocialMediaFetchAdapter();

  const isSaving = isCreating || isUpdating;

  // Pré-selecionar franquia do usuário logado ao criar nova influenciadora
  // Usar flag para evitar loop infinito
  const didPreSelectFranchise = useRef(false);
  useEffect(() => {
    if (!isEditing && franchise?.id && !didPreSelectFranchise.current) {
      didPreSelectFranchise.current = true;
      setForm((prev) => ({
        ...prev,
        franchise_id: franchise.id,
        franqueado_id: franchise.id,
      }));
    }
  }, [isEditing, franchise]);

  // Carregar dados se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      loadInfluenciadora(id);
    }
  }, [id, isEditing]);

  const loadInfluenciadora = async (influenciadoraId: string) => {
    setIsLoading(true);
    try {
      const data = await getInfluenciadora(influenciadoraId);
      if (data) {
        setForm({
          nome_completo: data.nome_completo || "",
          nome_artistico: data.nome_artistico || "",
          email: data.email || "",
          telefone: data.telefone || "",
          whatsapp: data.whatsapp || "",
          cpf: data.cpf || "",
          data_nascimento: data.data_nascimento || "",
          genero: data.genero || "",
          rg: data.rg || "",
          estado_civil: data.estado_civil || "",
          profissao: data.profissao || "",
          naturalidade: data.naturalidade || "",
          cep: data.cep || "",
          endereco: data.endereco || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          pais: data.pais || "Brasil",
          foto_perfil: data.foto_perfil || "",
          biografia: data.biografia || "",
          tipo: data.tipo || "influenciador",
          tamanho: data.tamanho,
          franchise_id: data.franchise_id, // MT
          franqueado_id: data.franqueado_id || data.franchise_id, // Legacy: fallback
          unidade_id: data.unidade_id, // Legacy
          responsavel_id: (data as unknown as { responsavel_id?: string }).responsavel_id || undefined,
          eh_menor: data.eh_menor || false,
          responsavel_legal_nome: data.responsavel_legal_nome || "",
          responsavel_legal_cpf: data.responsavel_legal_cpf || "",
          responsavel_legal_rg: data.responsavel_legal_rg || "",
          responsavel_legal_email: data.responsavel_legal_email || "",
          responsavel_legal_telefone: data.responsavel_legal_telefone || "",
          responsavel_legal_parentesco: data.responsavel_legal_parentesco || "",
        });

        // Carregar redes sociais existentes
        if (data.redes_sociais && data.redes_sociais.length > 0) {
          const redes = data.redes_sociais.map((r) => ({
            plataforma: r.plataforma,
            username: r.username || "",
            url: r.url || "",
            seguidores: r.seguidores || 0,
            taxa_engajamento: r.taxa_engajamento || 0,
          }));
          setRedesSociais(redes);

          // Mapear IDs existentes para update
          const idsMap: Record<string, string> = {};
          data.redes_sociais.forEach((r) => {
            idsMap[r.plataforma] = r.id;
          });
          setExistingRedesIds(idsMap);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar influenciadora");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof InfluenciadoraFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Auto-detect minor age from data_nascimento
  const calculatedAge = form.data_nascimento
    ? differenceInYears(new Date(), new Date(form.data_nascimento + 'T00:00:00'))
    : null;
  const isMinor = calculatedAge !== null && calculatedAge < 18;

  // Auto-set eh_menor when birth date changes
  useEffect(() => {
    if (form.data_nascimento) {
      const age = differenceInYears(new Date(), new Date(form.data_nascimento + 'T00:00:00'));
      const menor = age < 18;
      if (form.eh_menor !== menor) {
        setForm((prev) => ({ ...prev, eh_menor: menor }));
      }
    }
  }, [form.data_nascimento]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!form.nome_completo?.trim()) {
      newErrors.nome_completo = "Nome é obrigatório";
    }

    if (!form.whatsapp?.trim()) {
      newErrors.whatsapp = "WhatsApp é obrigatório";
    } else {
      const whatsappExists = await checkWhatsAppExists(form.whatsapp, id);
      if (whatsappExists) {
        newErrors.whatsapp = "WhatsApp já cadastrado";
      }
    }

    if (form.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Email inválido";
      } else {
        const emailExists = await checkEmailExists(form.email, id);
        if (emailExists) {
          newErrors.email = "Email já cadastrado";
        }
      }
    }

    if (form.cpf?.trim()) {
      const cleanCPF = form.cpf.replace(/\D/g, "");
      if (cleanCPF.length !== 11) {
        newErrors.cpf = "CPF inválido";
      } else {
        const cpfExists = await checkCPFExists(form.cpf, id);
        if (cpfExists) {
          newErrors.cpf = "CPF já cadastrado";
        }
      }
    }

    // Validação de responsável legal para menores
    if (isMinor) {
      if (!form.responsavel_legal_nome?.trim()) {
        newErrors.responsavel_legal_nome = "Nome do responsável é obrigatório para menores";
      }
      if (!form.responsavel_legal_cpf?.trim()) {
        newErrors.responsavel_legal_cpf = "CPF do responsável é obrigatório para menores";
      } else {
        const cleanCPFResp = form.responsavel_legal_cpf.replace(/\D/g, "");
        if (cleanCPFResp.length !== 11) {
          newErrors.responsavel_legal_cpf = "CPF do responsável inválido";
        }
      }
      if (!form.responsavel_legal_telefone?.trim()) {
        newErrors.responsavel_legal_telefone = "Telefone do responsável é obrigatório para menores";
      }
      if (!form.responsavel_legal_parentesco?.trim()) {
        newErrors.responsavel_legal_parentesco = "Parentesco é obrigatório para menores";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    try {
      let influenciadoraId = id;

      if (isEditing && id) {
        await updateAsync({ id, data: form });
      } else {
        const result = await createAsync(form);
        if (result?.id) {
          influenciadoraId = result.id;
        }
      }

      // Salvar redes sociais se houver ID
      if (influenciadoraId && redesSociais.length > 0) {
        await saveRedesSociais(influenciadoraId);
      }

      toast.success(isEditing ? "Influenciadora atualizada!" : "Influenciadora criada!");
      navigate("/influenciadoras");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar influenciadora");
    }
  };

  const saveRedesSociais = async (influenciadoraId: string) => {
    for (const rede of redesSociais) {
      if (!rede.username && !rede.url) continue;

      const existingId = existingRedesIds[rede.plataforma];
      const data = {
        influenciadora_id: influenciadoraId,
        plataforma: rede.plataforma,
        username: rede.username,
        url: rede.url,
        seguidores: rede.seguidores || 0,
        taxa_engajamento: rede.taxa_engajamento || 0,
        verificado: false,
      };

      if (existingId) {
        await supabase
          .from("mt_influencer_social_networks")
          .update(data)
          .eq("id", existingId);
      } else {
        await supabase
          .from("mt_influencer_social_networks")
          .insert(data);
      }
    }
  };

  const addRedeSocial = () => {
    // Encontrar próxima plataforma não usada
    const usadas = new Set(redesSociais.map((r) => r.plataforma));
    const proxima = PLATAFORMAS_REDES.find((p) => !usadas.has(p.value));
    if (proxima) {
      setRedesSociais([
        ...redesSociais,
        { ...emptyRedeSocial, plataforma: proxima.value },
      ]);
    } else {
      toast.error("Todas as plataformas já foram adicionadas");
    }
  };

  const removeRedeSocial = (index: number) => {
    setRedesSociais(redesSociais.filter((_, i) => i !== index));
  };

  const updateRedeSocial = (
    index: number,
    field: keyof RedeSocialFormData,
    value: unknown
  ) => {
    setRedesSociais((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  // Handler para auto-fetch de dados da rede social
  const handleAutoFetch = async (index: number) => {
    const rede = redesSociais[index];
    if (!rede) return;

    // Determinar o valor a usar para busca (username ou URL)
    let searchValue = rede.username || rede.url || "";

    // Se for uma URL, tentar extrair o username
    if (searchValue.includes("http") || searchValue.includes(".com")) {
      const extracted = parseUsernameFromUrl(searchValue, rede.plataforma);
      if (extracted) {
        searchValue = extracted;
      }
    }

    if (!searchValue) {
      toast.error("Digite um username ou URL para buscar");
      return;
    }

    const key = `${rede.plataforma}-${index}`;
    const profile = await fetchProfile(rede.plataforma, searchValue, key);

    if (profile && !profile.error) {
      // Atualizar os campos com os dados obtidos
      setRedesSociais((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          return {
            ...r,
            username: profile.username || r.username,
            seguidores: profile.followers || r.seguidores,
            taxa_engajamento: profile.engagement_rate || r.taxa_engajamento,
          };
        })
      );

      // Se obteve foto e não tem foto de perfil ainda, usar a do perfil
      if (profile.profile_picture_url && !form.foto_perfil) {
        updateField("foto_perfil", profile.profile_picture_url);
      }
    }
  };

  // Handler para auto-fetch no blur do username (se seguidores = 0)
  const handleUsernameBlur = async (index: number) => {
    const rede = redesSociais[index];
    if (!rede) return;

    // Só busca automaticamente se não tem seguidores definidos
    if (rede.seguidores && rede.seguidores > 0) return;

    // Precisa ter username ou URL
    if (!rede.username && !rede.url) return;

    // Só busca para plataformas suportadas
    if (!isAutoFetchSupported(rede.plataforma)) return;

    // Buscar dados automaticamente
    await handleAutoFetch(index);
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9)
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const calcularTotalSeguidores = () => {
    return redesSociais.reduce((sum, r) => sum + (r.seguidores || 0), 0);
  };

  const formatSeguidores = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/influenciadoras">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Editar Influenciadora" : "Nova Influenciadora"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Atualize os dados da influenciadora"
                : "Preencha os dados para cadastrar uma nova influenciadora"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Informações básicas da influenciadora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto + Nome */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={form.foto_perfil} />
                    <AvatarFallback className="text-2xl">
                      {form.nome_completo ? safeGetInitials(form.nome_completo) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground">Foto de Perfil</p>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={form.nome_completo}
                        onChange={(e) => updateField("nome_completo", e.target.value)}
                        className={errors.nome_completo ? "border-destructive" : ""}
                      />
                      {errors.nome_completo && (
                        <p className="text-xs text-destructive">{errors.nome_completo}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Artístico</Label>
                      <Input
                        placeholder="@nome_no_instagram"
                        value={form.nome_artistico || ""}
                        onChange={(e) => updateField("nome_artistico", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>URL da Foto de Perfil</Label>
                    <Input
                      placeholder="https://exemplo.com/foto.jpg ou deixe em branco para usar foto do Instagram"
                      value={form.foto_perfil || ""}
                      onChange={(e) => updateField("foto_perfil", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A foto será carregada automaticamente das redes sociais cadastradas
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.whatsapp}
                    onChange={(e) => updateField("whatsapp", formatPhone(e.target.value))}
                    maxLength={15}
                    className={errors.whatsapp ? "border-destructive" : ""}
                  />
                  {errors.whatsapp && (
                    <p className="text-xs text-destructive">{errors.whatsapp}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.telefone || ""}
                    onChange={(e) => updateField("telefone", formatPhone(e.target.value))}
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={form.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={form.cpf || ""}
                    onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                    maxLength={14}
                    className={errors.cpf ? "border-destructive" : ""}
                  />
                  {errors.cpf && (
                    <p className="text-xs text-destructive">{errors.cpf}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Data de Nascimento
                    {calculatedAge !== null && (
                      <span className="font-normal text-xs text-muted-foreground">
                        ({calculatedAge} anos)
                      </span>
                    )}
                    {isMinor && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
                        Menor de Idade
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={form.data_nascimento || ""}
                    onChange={(e) => updateField("data_nascimento", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select
                    value={form.genero || ""}
                    onValueChange={(v) => updateField("genero", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Dados Pessoais Adicionais (para contrato) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    placeholder="00.000.000-0"
                    value={form.rg || ""}
                    onChange={(e) => updateField("rg", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado Civil</Label>
                  <Select
                    value={form.estado_civil || ""}
                    onValueChange={(v) => updateField("estado_civil", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input
                    placeholder="Ex: Influenciadora Digital"
                    value={form.profissao || ""}
                    onChange={(e) => updateField("profissao", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Naturalidade</Label>
                  <Input
                    placeholder="Ex: São Paulo/SP"
                    value={form.naturalidade || ""}
                    onChange={(e) => updateField("naturalidade", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>
                Localização da influenciadora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    placeholder="00000-000"
                    value={form.cep || ""}
                    onChange={(e) => updateField("cep", e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    placeholder="Rua, Avenida, etc."
                    value={form.endereco || ""}
                    onChange={(e) => updateField("endereco", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    placeholder="Nº"
                    value={form.numero || ""}
                    onChange={(e) => updateField("numero", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Apto, Bloco, etc."
                    value={form.complemento || ""}
                    onChange={(e) => updateField("complemento", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={form.bairro || ""}
                    onChange={(e) => updateField("bairro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade || ""}
                    onChange={(e) => updateField("cidade", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={form.estado || ""}
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
                    value={form.pais || "Brasil"}
                    onChange={(e) => updateField("pais", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Responsável Legal (condicional - menor de idade) */}
          {isMinor && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  Responsável Legal
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 ml-2">
                    Menor de Idade ({calculatedAge} anos)
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Obrigatório para influenciadores menores de 18 anos. O responsável legal assinará o contrato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo do Responsável *</Label>
                    <Input
                      placeholder="Nome completo"
                      value={form.responsavel_legal_nome || ""}
                      onChange={(e) => updateField("responsavel_legal_nome", e.target.value)}
                      className={errors.responsavel_legal_nome ? "border-destructive" : ""}
                    />
                    {errors.responsavel_legal_nome && (
                      <p className="text-xs text-destructive">{errors.responsavel_legal_nome}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Parentesco *</Label>
                    <Select
                      value={form.responsavel_legal_parentesco || ""}
                      onValueChange={(v) => updateField("responsavel_legal_parentesco", v)}
                    >
                      <SelectTrigger className={errors.responsavel_legal_parentesco ? "border-destructive" : ""}>
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="tutor_legal">Tutor Legal</SelectItem>
                        <SelectItem value="avo">Avô/Avó</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.responsavel_legal_parentesco && (
                      <p className="text-xs text-destructive">{errors.responsavel_legal_parentesco}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF do Responsável *</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={form.responsavel_legal_cpf || ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                        updateField("responsavel_legal_cpf", v);
                      }}
                      maxLength={14}
                      className={errors.responsavel_legal_cpf ? "border-destructive" : ""}
                    />
                    {errors.responsavel_legal_cpf && (
                      <p className="text-xs text-destructive">{errors.responsavel_legal_cpf}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>RG do Responsável</Label>
                    <Input
                      placeholder="RG"
                      value={form.responsavel_legal_rg || ""}
                      onChange={(e) => updateField("responsavel_legal_rg", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone do Responsável *</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={form.responsavel_legal_telefone || ""}
                      onChange={(e) => updateField("responsavel_legal_telefone", e.target.value)}
                      className={errors.responsavel_legal_telefone ? "border-destructive" : ""}
                    />
                    {errors.responsavel_legal_telefone && (
                      <p className="text-xs text-destructive">{errors.responsavel_legal_telefone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email do Responsável</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={form.responsavel_legal_email || ""}
                      onChange={(e) => updateField("responsavel_legal_email", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card: Redes Sociais */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Instagram className="h-5 w-5" />
                    Redes Sociais
                  </CardTitle>
                  <CardDescription>
                    Perfis e seguidores em cada plataforma
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total de Seguidores</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatSeguidores(calcularTotalSeguidores())}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {redesSociais.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Instagram className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">
                    Nenhuma rede social cadastrada
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={addRedeSocial}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Rede Social
                  </Button>
                </div>
              ) : (
                <>
                  {redesSociais.map((rede, index) => {
                    const plataforma = PLATAFORMAS_REDES.find(
                      (p) => p.value === rede.plataforma
                    );
                    return (
                      <div
                        key={rede.plataforma ? `${rede.plataforma}-${index}` : `rede-${index}`}
                        className="p-4 rounded-lg border bg-card space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{plataforma?.icon}</span>
                            <Select
                              value={rede.plataforma}
                              onValueChange={(v) =>
                                updateRedeSocial(index, "plataforma", v as RedeSocialPlataforma)
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PLATAFORMAS_REDES.map((p) => (
                                  <SelectItem
                                    key={p.value}
                                    value={p.value}
                                    disabled={
                                      redesSociais.some(
                                        (r, i) => i !== index && r.plataforma === p.value
                                      )
                                    }
                                  >
                                    {p.icon} {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* Status do auto-fetch */}
                            {getFetchStatus(`${rede.plataforma}-${index}`) === 'success' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {getFetchStatus(`${rede.plataforma}-${index}`) === 'error' && (
                              <AlertCircle className="h-4 w-4 text-amber-500" title={getFetchError(`${rede.plataforma}-${index}`) || ''} />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Botão Auto-Fetch */}
                            {isAutoFetchSupported(rede.plataforma) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAutoFetch(index)}
                                disabled={getFetchStatus(`${rede.plataforma}-${index}`) === 'fetching' || (!rede.username && !rede.url)}
                                className="text-xs"
                              >
                                {getFetchStatus(`${rede.plataforma}-${index}`) === 'fetching' ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Auto-buscar
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeRedeSocial(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Username</Label>
                            <Input
                              placeholder={plataforma?.placeholder || "@username"}
                              value={rede.username || ""}
                              onChange={(e) =>
                                updateRedeSocial(index, "username", e.target.value)
                              }
                              onBlur={() => handleUsernameBlur(index)}
                            />
                            {isAutoFetchSupported(rede.plataforma) && (
                              <p className="text-[10px] text-muted-foreground">
                                {supportedPlatforms.notes[rede.plataforma.toLowerCase()] || "Auto-busca disponível"}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">URL do Perfil</Label>
                            <Input
                              placeholder="https://..."
                              value={rede.url || ""}
                              onChange={(e) =>
                                updateRedeSocial(index, "url", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Seguidores</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
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
                          <div className="space-y-2">
                            <Label className="text-xs">Engajamento (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="0.0"
                              value={rede.taxa_engajamento || ""}
                              onChange={(e) =>
                                updateRedeSocial(
                                  index,
                                  "taxa_engajamento",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addRedeSocial}
                    disabled={redesSociais.length >= PLATAFORMAS_REDES.length}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Outra Rede Social
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card: Perfil Profissional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Perfil Profissional
              </CardTitle>
              <CardDescription>
                Tipo de trabalho e classificação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => updateField("tipo", v as InfluenciadoraTipo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_INFLUENCIADORA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho (Seguidores)</Label>
                  <Select
                    value={form.tamanho || ""}
                    onValueChange={(v) =>
                      updateField("tamanho", v ? (v as InfluenciadoraTamanho) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAMANHOS_INFLUENCIADORA.map((tam) => (
                        <SelectItem key={tam.value} value={tam.value}>
                          {tam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  placeholder="Conte um pouco sobre você, seu nicho e estilo de conteúdo..."
                  value={form.biografia || ""}
                  onChange={(e) => updateField("biografia", e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {(form.biografia || "").length}/500 caracteres
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Vinculação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Vinculação
              </CardTitle>
              <CardDescription>
                Define quem pode gerenciar esta influenciadora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Franquia Vinculada</Label>
                <Select
                  value={form.franchise_id || form.franqueado_id || "global"}
                  onValueChange={(v) => {
                    const newValue = v === "global" ? undefined : v;
                    updateField("franchise_id", newValue);
                    updateField("franqueado_id", newValue); // Legacy: manter sincronizado
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      🌐 Global (todas as franquias)
                    </SelectItem>
                    {franqueados.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia || f.nome_franquia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Consultora Responsável</Label>
                <Select
                  value={form.responsavel_id || "nenhum"}
                  onValueChange={(v) => updateField("responsavel_id", v === "nenhum" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">
                      — Sem responsável definido
                    </SelectItem>
                    {usuariosDisponiveis.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                        {u.cargo ? ` — ${u.cargo}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {usuariosDisponiveis.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.franchise_id || form.franqueado_id
                      ? "Nenhum usuário encontrado nesta franquia."
                      : "Selecione uma franquia para ver as consultoras disponíveis."}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Sobre a vinculação</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>
                    <strong>Global:</strong> A influenciadora aparece para todas as
                    unidades e pode receber promoções de qualquer franquia.
                  </li>
                  <li>
                    <strong>Por Franquia:</strong> A influenciadora é exclusiva
                    da unidade selecionada e só aparece para ela.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button type="button" variant="outline" asChild>
              <Link to="/influenciadoras">Cancelar</Link>
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
                  {isEditing ? "Atualizar" : "Criar Influenciadora"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default InfluenciadoraEdit;
