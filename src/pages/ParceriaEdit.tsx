import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  User,
  Image as ImageIcon,
  Gift,
  Settings,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneInputInternational } from "@/components/ui/phone-input-international";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useParceriasAdapter } from "@/hooks/useParceriasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useParceriaBeneficiosAdapter } from "@/hooks/useParceriaBeneficiosAdapter";
import { useParceriaLogoUploadAdapter, getPathFromLogoUrl } from "@/hooks/useParceriaLogoUploadAdapter";
import {
  RAMOS_ATIVIDADE,
  PORTE_EMPRESA_LABELS,
  BENEFICIO_TIPO_LABELS,
  type PorteEmpresa,
  type BeneficioTipo,
  type ParceriaInsert,
  type ParceriaBeneficioInsert,
} from "@/types/parceria";

// =====================================================
// Schema de Validação
// =====================================================

const parceriaSchema = z.object({
  // Dados da Empresa
  razao_social: z.string().min(3, "Razão social é obrigatória"),
  nome_fantasia: z.string().min(2, "Nome fantasia é obrigatório"),
  cnpj: z.string().optional().nullable(),
  inscricao_estadual: z.string().optional().nullable(),
  codigo_indicacao: z.string().optional().nullable(),
  ramo_atividade: z.string().min(1, "Ramo de atividade é obrigatório"),
  segmento: z.string().optional().nullable(),
  porte: z.string().optional().nullable(),

  // Endereço
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),

  // Responsável
  responsavel_nome: z.string().min(3, "Nome do responsável é obrigatório"),
  responsavel_cargo: z.string().optional().nullable(),
  responsavel_email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  responsavel_telefone: z.string().optional().nullable(),
  responsavel_telefone_codigo_pais: z.string().default("55"),
  responsavel_whatsapp: z.string().optional().nullable(),
  responsavel_whatsapp_codigo_pais: z.string().default("55"),

  // Branding
  logo_url: z.string().optional().nullable(),
  logo_path: z.string().optional().nullable(),
  descricao_curta: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
  descricao_completa: z.string().optional().nullable(),
  website: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  instagram: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),

  // Vinculação
  franqueado_id: z.string().optional().nullable(),
  unidade_id: z.string().optional().nullable(),
  responsavel_id: z.string().optional().nullable(),
  status: z.enum(["ativo", "inativo", "pendente", "suspenso"]),
  data_inicio_parceria: z.string().optional().nullable(),
  data_fim_parceria: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

type ParceriaFormData = z.infer<typeof parceriaSchema>;

const beneficioSchema = z.object({
  titulo: z.string().min(3, "Título é obrigatório"),
  descricao: z.string().optional().nullable(),
  tipo: z.string(),
  valor: z.string().optional().nullable(),
  validade_inicio: z.string().optional().nullable(),
  validade_fim: z.string().optional().nullable(),
  ativo: z.boolean(),
  destaque: z.boolean(),
});

type BeneficioFormData = z.infer<typeof beneficioSchema>;

// =====================================================
// Componente Principal
// =====================================================

export default function ParceriaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Estados
  const [activeTab, setActiveTab] = useState("empresa");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [novoBeneficio, setNovoBeneficio] = useState<Partial<BeneficioFormData> | null>(null);

  // Contexto de tenant
  const { tenant } = useTenantContext();

  // Hooks - usando adapter
  const { parcerias, createParceria, updateParceria, isCreating, isUpdating, checkCNPJExists, isLoading: isLoadingParceria } = useParceriasAdapter();
  const parceria = parcerias.find(p => p.id === id);
  const { uploadLogo, deleteLogo, isUploading } = useParceriaLogoUploadAdapter();
  const {
    beneficios,
    createBeneficio,
    updateBeneficio,
    deleteBeneficio,
    isCreating: isCreatingBeneficio,
  } = useParceriaBeneficiosAdapter(id);

  // Form
  const form = useForm<ParceriaFormData>({
    resolver: zodResolver(parceriaSchema),
    defaultValues: {
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      ramo_atividade: "",
      responsavel_nome: "",
      responsavel_id: null,
      status: "ativo",
    },
  });

  // Buscar consultoras disponíveis
  const franqueadoId = form.watch("franqueado_id");
  const { data: usuariosDisponiveis = [] } = useQuery({
    queryKey: ["mt-users-responsavel-parceria", tenant?.id, franqueadoId],
    queryFn: async () => {
      if (!tenant?.id) return [];
      let q = supabase
        .from("mt_users")
        .select("id, nome, cargo, franchise_id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("nome", { ascending: true });
      if (franqueadoId) {
        q = q.eq("franchise_id", franqueadoId);
      }
      const { data, error } = await q;
      if (error) return [];
      return data as { id: string; nome: string; cargo: string | null; franchise_id: string | null }[];
    },
    enabled: !!tenant?.id,
  });

  // Carregar dados ao editar
  useEffect(() => {
    if (parceria) {
      form.reset({
        razao_social: parceria.razao_social,
        nome_fantasia: parceria.nome_fantasia,
        cnpj: parceria.cnpj || "",
        inscricao_estadual: parceria.inscricao_estadual || "",
        codigo_indicacao: parceria.codigo_indicacao || "",
        ramo_atividade: parceria.ramo_atividade,
        segmento: parceria.segmento || "",
        porte: parceria.porte || "",
        cep: parceria.cep || "",
        endereco: parceria.endereco || "",
        numero: parceria.numero || "",
        complemento: parceria.complemento || "",
        bairro: parceria.bairro || "",
        cidade: parceria.cidade || "",
        estado: parceria.estado || "",
        responsavel_nome: parceria.responsavel_nome,
        responsavel_cargo: parceria.responsavel_cargo || "",
        responsavel_email: parceria.responsavel_email || "",
        responsavel_telefone: parceria.responsavel_telefone || "",
        responsavel_telefone_codigo_pais: parceria.responsavel_telefone_codigo_pais || "55",
        responsavel_whatsapp: parceria.responsavel_whatsapp || "",
        responsavel_whatsapp_codigo_pais: parceria.responsavel_whatsapp_codigo_pais || "55",
        logo_url: parceria.logo_url || "",
        logo_path: parceria.logo_path || "",
        descricao_curta: parceria.descricao_curta || "",
        descricao_completa: parceria.descricao_completa || "",
        website: parceria.website || "",
        instagram: parceria.instagram || "",
        facebook: parceria.facebook || "",
        linkedin: parceria.linkedin || "",
        franqueado_id: parceria.franqueado_id || "",
        unidade_id: parceria.unidade_id || "",
        responsavel_id: (parceria as unknown as { responsavel_id?: string | null }).responsavel_id || null,
        status: parceria.status,
        data_inicio_parceria: parceria.data_inicio_parceria || "",
        data_fim_parceria: parceria.data_fim_parceria || "",
        observacoes: parceria.observacoes || "",
      });

      if (parceria.logo_url) {
        setLogoPreview(parceria.logo_url);
      }
    }
  }, [parceria, form]);

  // Buscar CEP
  const buscarCEP = useCallback(async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("endereco", data.logradouro);
        form.setValue("bairro", data.bairro);
        form.setValue("cidade", data.localidade);
        form.setValue("estado", data.uf);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  }, [form]);

  // Handle Logo
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setLogoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit
  const onSubmit = async (data: ParceriaFormData) => {
    try {
      // Validar CNPJ duplicado
      if (data.cnpj) {
        const cnpjExists = await checkCNPJExists(data.cnpj, id);
        if (cnpjExists) {
          form.setError("cnpj", { message: "CNPJ já cadastrado em outra parceria" });
          setActiveTab("empresa");
          return;
        }
      }

      let parceriaId = id;
      let logoUrl = data.logo_url;
      let logoPath = data.logo_path;

      // Se criando, criar parceria primeiro
      if (!isEditing) {
        const newParceria = await createParceria({
          ...data,
          logo_url: null,
          logo_path: null,
        } as ParceriaInsert);
        parceriaId = newParceria.id;
      }

      // Upload de logo se houver
      if (logoFile && parceriaId) {
        // Deletar logo anterior se existir
        if (logoPath) {
          await deleteLogo(logoPath);
        }

        const result = await uploadLogo(logoFile, parceriaId);
        if (result) {
          logoUrl = result.url;
          logoPath = result.path;
        }
      }

      // Se editando ou se houve upload de logo
      if (isEditing || logoUrl) {
        await updateParceria({
          id: parceriaId!,
          data: {
            ...data,
            logo_url: logoUrl,
            logo_path: logoPath,
          } as any,
        });
      }

      navigate(`/parcerias/${parceriaId}`);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  // Adicionar Benefício
  const handleAddBeneficio = async () => {
    if (!novoBeneficio?.titulo || !novoBeneficio?.tipo || !id) {
      toast.error("Preencha os campos obrigatórios do benefício");
      return;
    }

    try {
      await createBeneficio({
        parceria_id: id,
        titulo: novoBeneficio.titulo,
        descricao: novoBeneficio.descricao || null,
        tipo: novoBeneficio.tipo as BeneficioTipo,
        valor: novoBeneficio.valor || null,
        validade_inicio: novoBeneficio.validade_inicio || null,
        validade_fim: novoBeneficio.validade_fim || null,
        ativo: novoBeneficio.ativo ?? true,
        destaque: novoBeneficio.destaque ?? false,
        ordem: beneficios.length,
      });
      setNovoBeneficio(null);
    } catch (error) {
      console.error("Erro ao adicionar benefício:", error);
    }
  };

  // Loading
  if (isEditing && isLoadingParceria) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isSaving = isCreating || isUpdating || isUploading;

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/parcerias">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Editar Parceria" : "Nova Parceria"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? `Editando: ${parceria?.nome_fantasia}`
              : "Cadastre uma nova empresa parceira"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="empresa" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empresa</span>
              </TabsTrigger>
              <TabsTrigger value="endereco" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Endereço</span>
              </TabsTrigger>
              <TabsTrigger value="responsavel" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Responsável</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger value="beneficios" className="flex items-center gap-2" disabled={!isEditing}>
                <Gift className="h-4 w-4" />
                <span className="hidden sm:inline">Benefícios</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Empresa */}
            <TabsContent value="empresa">
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Empresa</CardTitle>
                  <CardDescription>Informações básicas da empresa parceira</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="razao_social"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão Social *</FormLabel>
                          <FormControl>
                            <Input placeholder="Razão social da empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nome_fantasia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Fantasia *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome fantasia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inscricao_estadual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Estadual</FormLabel>
                          <FormControl>
                            <Input placeholder="Inscrição estadual" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="codigo_indicacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de Indicação</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={isEditing ? "Ex: PARC12345" : "Auto-gerado se vazio"}
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormDescription>
                            Código usado para rastrear indicações desta parceria. Se vazio, será gerado automaticamente.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="ramo_atividade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ramo de Atividade *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o ramo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RAMOS_ATIVIDADE.map((ramo) => (
                                <SelectItem key={ramo} value={ramo}>
                                  {ramo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="segmento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento</FormLabel>
                          <FormControl>
                            <Input placeholder="Segmento específico" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="porte"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porte</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o porte" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(PORTE_EMPRESA_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Endereço */}
            <TabsContent value="endereco">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>Localização da empresa parceira</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00000-000"
                              {...field}
                              value={field.value || ""}
                              onBlur={(e) => {
                                field.onBlur();
                                buscarCEP(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Digite o CEP para buscar o endereço</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, Avenida..." {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="Nº" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Sala, Andar..." {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Bairro" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="UF" maxLength={2} {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Responsável */}
            <TabsContent value="responsavel">
              <Card>
                <CardHeader>
                  <CardTitle>Responsável</CardTitle>
                  <CardDescription>Contato principal da parceria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="responsavel_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Responsável *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsavel_cargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <FormControl>
                            <Input placeholder="Cargo na empresa" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="responsavel_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@empresa.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsavel_telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <PhoneInputInternational
                              value={field.value || ""}
                              countryCode={form.watch("responsavel_telefone_codigo_pais") || "55"}
                              onChange={field.onChange}
                              onCountryChange={(code) => form.setValue("responsavel_telefone_codigo_pais", code)}
                              onBlur={field.onBlur}
                              showCountryName
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsavel_whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <PhoneInputInternational
                              value={field.value || ""}
                              countryCode={form.watch("responsavel_whatsapp_codigo_pais") || "55"}
                              onChange={field.onChange}
                              onCountryChange={(code) => form.setValue("responsavel_whatsapp_codigo_pais", code)}
                              onBlur={field.onBlur}
                              showCountryName
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Branding */}
            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Branding & Links</CardTitle>
                  <CardDescription>Logo, descrição e redes sociais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <Label>Logo da Empresa</Label>
                    <div className="flex items-start gap-6">
                      <div className="relative">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Preview do logo"
                            className="h-32 w-32 rounded-lg object-contain border bg-muted"
                          />
                        ) : (
                          <div className="h-32 w-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoSelect}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button type="button" variant="outline" asChild>
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            {logoPreview ? "Trocar Logo" : "Enviar Logo"}
                          </label>
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          JPEG, PNG, WebP ou GIF. Máximo 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Descrições */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="descricao_curta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição Curta</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Breve descrição da empresa (exibida no painel do cliente)"
                              className="resize-none"
                              rows={3}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>Máximo 500 caracteres</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="descricao_completa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição Completa</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descrição detalhada da empresa e da parceria"
                              rows={5}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Links */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.empresa.com.br" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@empresa" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="facebook"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input placeholder="URL do Facebook" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn</FormLabel>
                            <FormControl>
                              <Input placeholder="URL do LinkedIn" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Benefícios */}
            <TabsContent value="beneficios">
              <Card>
                <CardHeader>
                  <CardTitle>Benefícios Oferecidos</CardTitle>
                  <CardDescription>
                    Cadastre os benefícios exclusivos para clientes indicados por esta parceria
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditing ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Salve a parceria primeiro para adicionar benefícios
                    </div>
                  ) : (
                    <>
                      {/* Lista de Benefícios */}
                      {beneficios.length > 0 && (
                        <div className="space-y-3">
                          {beneficios.map((beneficio) => (
                            <div
                              key={beneficio.id}
                              className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{beneficio.titulo}</span>
                                  {beneficio.destaque && (
                                    <Badge variant="secondary">Destaque</Badge>
                                  )}
                                  {!beneficio.ativo && (
                                    <Badge variant="outline">Inativo</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {BENEFICIO_TIPO_LABELS[beneficio.tipo]}
                                  {beneficio.valor && ` - ${beneficio.valor}`}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteBeneficio(beneficio.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulário de Novo Benefício */}
                      {novoBeneficio !== null ? (
                        <Card className="border-dashed">
                          <CardContent className="pt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Título *</Label>
                                <Input
                                  placeholder="Ex: 10 Sessões Grátis"
                                  value={novoBeneficio.titulo || ""}
                                  onChange={(e) =>
                                    setNovoBeneficio({ ...novoBeneficio, titulo: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo *</Label>
                                <Select
                                  value={novoBeneficio.tipo || ""}
                                  onValueChange={(value) =>
                                    setNovoBeneficio({ ...novoBeneficio, tipo: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(BENEFICIO_TIPO_LABELS).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>Valor/Quantidade</Label>
                                <Input
                                  placeholder="Ex: 10%, R$ 50, 10 sessões"
                                  value={novoBeneficio.valor || ""}
                                  onChange={(e) =>
                                    setNovoBeneficio({ ...novoBeneficio, valor: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Validade Início</Label>
                                <Input
                                  type="date"
                                  value={novoBeneficio.validade_inicio || ""}
                                  onChange={(e) =>
                                    setNovoBeneficio({ ...novoBeneficio, validade_inicio: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Validade Fim</Label>
                                <Input
                                  type="date"
                                  value={novoBeneficio.validade_fim || ""}
                                  onChange={(e) =>
                                    setNovoBeneficio({ ...novoBeneficio, validade_fim: e.target.value })
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Textarea
                                placeholder="Descrição detalhada do benefício"
                                value={novoBeneficio.descricao || ""}
                                onChange={(e) =>
                                  setNovoBeneficio({ ...novoBeneficio, descricao: e.target.value })
                                }
                              />
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={novoBeneficio.ativo ?? true}
                                  onCheckedChange={(checked) =>
                                    setNovoBeneficio({ ...novoBeneficio, ativo: checked })
                                  }
                                />
                                <Label>Ativo</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={novoBeneficio.destaque ?? false}
                                  onCheckedChange={(checked) =>
                                    setNovoBeneficio({ ...novoBeneficio, destaque: checked })
                                  }
                                />
                                <Label>Destaque</Label>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={handleAddBeneficio}
                                disabled={isCreatingBeneficio}
                              >
                                {isCreatingBeneficio ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="mr-2 h-4 w-4" />
                                )}
                                Adicionar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setNovoBeneficio(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed"
                          onClick={() => setNovoBeneficio({ ativo: true, destaque: false })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Benefício
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Configurações */}
            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações</CardTitle>
                  <CardDescription>Status e vinculação da parceria</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ativo">Ativo</SelectItem>
                              <SelectItem value="inativo">Inativo</SelectItem>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="suspenso">Suspenso</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsavel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consultora Responsável</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(v === "nenhum" ? null : v)}
                            value={field.value || "nenhum"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nenhum">— Sem responsável definido</SelectItem>
                              {usuariosDisponiveis.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.nome}{u.cargo ? ` — ${u.cargo}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="data_inicio_parceria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="data_fim_parceria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Término</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>Deixe em branco para parceria sem prazo</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Internas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Anotações internas sobre a parceria"
                            rows={4}
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/parcerias">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Salvar Alterações" : "Criar Parceria"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
