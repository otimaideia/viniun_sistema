import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Palette,
  Webhook,
  BarChart3,
  Plus,
  Trash2,
  GripVertical,
  Copy,
  ExternalLink,
  Zap,
  Building2,
  Pencil,
  ListPlus,
  Repeat2,
  Users,
} from "lucide-react";
import { useFormulariosAdapter } from "@/hooks/useFormulariosAdapter";
import { useFormularioCamposAdapter } from "@/hooks/useFormularioCamposAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useUserRoleAdapter } from "@/hooks/useUserRoleAdapter";
import { useTeams } from "@/hooks/multitenant/useTeams";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import type {
  Formulario,
  FormularioInsert,
  FormularioCampo,
  FormularioCampoTipo,
  FormularioCampoLargura,
  FormularioModo,
  FormularioAcaoPosEnvio,
  FormularioStatus,
  CAMPO_TIPOS_LABELS,
  CAMPO_TIPOS_ICONS,
} from "@/types/formulario";

// Schema de validação
const formularioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  slug: z.string().min(3, "Slug deve ter pelo menos 3 caracteres").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  descricao: z.string().optional(),
  status: z.enum(["rascunho", "ativo", "inativo", "arquivado"]),
  modo: z.enum(["simples", "wizard"]),
  titulo: z.string().optional(),
  subtitulo: z.string().optional(),
  texto_botao: z.string().optional(),
  mensagem_sucesso: z.string().optional(),
  acao_pos_envio: z.enum(["mensagem", "redirect", "whatsapp"]),
  redirect_url: z.string().optional(),
  whatsapp_numero: z.string().optional(),
  whatsapp_mensagem: z.string().optional(),
  webhook_ativo: z.boolean(),
  webhook_url: z.string().optional(),
  recaptcha_ativo: z.boolean(),
  honeypot_ativo: z.boolean(),
  capturar_utms: z.boolean(),
  capturar_ip: z.boolean(),
  cor_primaria: z.string().optional(),
  cor_botao: z.string().optional(),
  cor_botao_texto: z.string().optional(),
});

type FormularioFormData = z.infer<typeof formularioSchema>;

const CAMPO_TIPOS: { value: FormularioCampoTipo; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "tel", label: "Telefone" },
  { value: "cpf", label: "CPF" },
  { value: "cep", label: "CEP" },
  { value: "select", label: "Seleção" },
  { value: "textarea", label: "Texto longo" },
  { value: "checkbox", label: "Caixa de seleção" },
  { value: "radio", label: "Opção única" },
  { value: "date", label: "Data" },
  { value: "number", label: "Número" },
  { value: "hidden", label: "Oculto" },
  { value: "servico", label: "Serviços" },
  { value: "file", label: "Arquivo" },
  { value: "rating", label: "Avaliação" },
  { value: "range", label: "Intervalo" },
  { value: "indicados", label: "Indicação de Amigos" },
];

const LARGURAS: { value: FormularioCampoLargura; label: string }[] = [
  { value: "full", label: "100%" },
  { value: "half", label: "50%" },
  { value: "third", label: "33%" },
];

export default function FormularioEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { getFormulario, createFormulario, updateFormulario, isCreating, isUpdating } = useFormulariosAdapter();
  const { campos, createCampo, updateCampo, deleteCampo, reorderCampos, isLoading: camposLoading } = useFormularioCamposAdapter(id);
  const { franqueados } = useFranqueadosAdapter();
  const { unidadeId, isAdmin } = useUserProfileAdapter();
  const { isSuperAdmin } = useUserRoleAdapter();

  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [selectedFranqueadoId, setSelectedFranqueadoId] = useState<string>("");

  // Round Robin states
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(false);
  const [roundRobinMode, setRoundRobinMode] = useState<'team' | 'department'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  // Equipes e Departamentos para round robin
  const { teams } = useTeams();
  const { departments } = useDepartments();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormularioFormData>({
    resolver: zodResolver(formularioSchema),
    defaultValues: {
      nome: "",
      slug: "",
      descricao: "",
      status: "rascunho",
      modo: "simples",
      titulo: "",
      subtitulo: "",
      texto_botao: "Enviar",
      mensagem_sucesso: "Cadastro realizado com sucesso!",
      acao_pos_envio: "mensagem",
      webhook_ativo: false,
      recaptcha_ativo: false,
      honeypot_ativo: true,
      capturar_utms: true,
      capturar_ip: false,
      cor_primaria: "#10b981",
      cor_botao: "#10b981",
      cor_botao_texto: "#ffffff",
    },
  });

  // Carregar formulário existente
  useEffect(() => {
    if (isEditing && id) {
      loadFormulario();
    }
  }, [id, isEditing]);

  const loadFormulario = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getFormulario(id);
      if (data) {
        // Verificar se é formulário de sistema e usuário não é super admin
        if (data.is_system && !isSuperAdmin) {
          toast.error("Este é um formulário padrão do sistema e não pode ser editado.");
          navigate("/formularios");
          return;
        }
        setFormulario(data);
        setSelectedFranqueadoId(data.franqueado_id);
        // Carregar valores de Round Robin
        const extData = data as Record<string, unknown>;
        setRoundRobinEnabled((extData.round_robin_enabled as boolean) ?? false);
        setRoundRobinMode((extData.round_robin_mode as string) || 'team');
        setSelectedTeamId((extData.team_id as string) || '');
        setSelectedDepartmentId((extData.department_id as string) || '');
        // Popular form
        Object.keys(data).forEach((key) => {
          const value = data[key as keyof Formulario];
          if (value !== undefined && value !== null) {
            setValue(key as keyof FormularioFormData, value as FormularioFormData[keyof FormularioFormData]);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar formulário:", error);
      toast.error("Erro ao carregar formulário");
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar slug automaticamente
  const nome = watch("nome");
  useEffect(() => {
    if (!isEditing && nome) {
      const slug = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setValue("slug", slug);
    }
  }, [nome, isEditing, setValue]);

  // Salvar formulário
  const onSubmit = async (data: FormularioFormData) => {
    try {
      // Determinar franqueado_id - admin pode deixar null (central)
      let franqueadoId: string | null = null;

      if (isAdmin) {
        // Admin pode criar formulários da central (sem franquia)
        franqueadoId = selectedFranqueadoId || null;
      } else {
        // Franqueado sempre vincula à sua unidade
        franqueadoId = unidadeId || null;
        if (!franqueadoId) {
          toast.error("Erro: unidade não identificada");
          return;
        }
      }

      const formularioData: Partial<FormularioInsert> & Record<string, unknown> = {
        ...data,
        franqueado_id: franqueadoId,
        ativo: data.status === "ativo",
        whatsapp_incluir_dados: true,
        webhook_retry: true,
        mostrar_progresso: true,
        permitir_voltar: true,
        cep_auto_fill: true,
        // Round Robin
        round_robin_enabled: roundRobinEnabled,
        round_robin_mode: roundRobinEnabled ? roundRobinMode : 'team',
        team_id: roundRobinEnabled && roundRobinMode === 'team' ? (selectedTeamId || null) : null,
        department_id: roundRobinEnabled && roundRobinMode === 'department' ? (selectedDepartmentId || null) : null,
      };

      if (isEditing && id) {
        await updateFormulario({ id, ...formularioData });
        toast.success("Formulário atualizado!");
      } else {
        const created = await createFormulario(formularioData as FormularioInsert);
        toast.success("Formulário criado!");
        navigate(`/formularios/${created.id}/editar`);
      }
    } catch (error) {
      console.error("Erro ao salvar formulário:", error);
      toast.error("Erro ao salvar formulário");
    }
  };

  // Adicionar novo campo
  const handleAddCampo = async () => {
    if (!id) {
      toast.error("Salve o formulário primeiro para adicionar campos");
      return;
    }

    try {
      await createCampo({
        formulario_id: id,
        nome: `campo_${(campos?.length || 0) + 1}`,
        tipo: "text",
        label: `Campo ${(campos?.length || 0) + 1}`,
        obrigatorio: false,
        ordem: (campos?.length || 0),
        largura: "full",
        ativo: true,
        etapa: 1,
      });
      toast.success("Campo adicionado!");
    } catch (error) {
      console.error("Erro ao adicionar campo:", error);
      toast.error("Erro ao adicionar campo");
    }
  };

  // Atualizar campo
  const handleUpdateCampo = async (campoId: string, updates: Partial<FormularioCampo>) => {
    try {
      await updateCampo({ id: campoId, ...updates });
    } catch (error) {
      console.error("Erro ao atualizar campo:", error);
      toast.error("Erro ao atualizar campo");
    }
  };

  // Deletar campo
  const handleDeleteCampo = async (campoId: string) => {
    if (!confirm("Tem certeza que deseja remover este campo?")) return;
    try {
      await deleteCampo(campoId);
      toast.success("Campo removido!");
    } catch (error) {
      console.error("Erro ao remover campo:", error);
      toast.error("Erro ao remover campo");
    }
  };

  // Copiar URL do formulário
  const handleCopyUrl = () => {
    const slug = watch("slug");
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(isEditing ? `/formularios/${id}` : "/formularios")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing && formulario ? `Editar: ${formulario.nome}` : "Novo Formulário"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditing ? "Atualize as informações do formulário" : "Configure seu novo formulário"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <Button variant="outline" onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/form/${watch("slug")}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </>
            )}
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating || isUpdating}
            >
              <Save className="h-4 w-4 mr-2" />
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isEditing ? "campos" : "geral"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">
              Configurações Gerais
            </TabsTrigger>
            <TabsTrigger value="campos" disabled={!isEditing}>
              Campos do Formulário
            </TabsTrigger>
            <TabsTrigger value="integracao">
              Integrações
            </TabsTrigger>
            <TabsTrigger value="visual">
              Estilo
            </TabsTrigger>
          </TabsList>

          {/* Tab Geral */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Configure o nome e identificação do formulário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Franquia */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label>Franquia</Label>
                      <Select
                        value={selectedFranqueadoId || "central"}
                        onValueChange={(v) => setSelectedFranqueadoId(v === "central" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a franquia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="central">
                            🏢 Formulário da Central (Global)
                          </SelectItem>
                          {franqueados.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome_fantasia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Formulários da Central podem ser acessados por todas as franquias
                      </p>
                    </div>
                  )}

                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Formulário *</Label>
                    <Input
                      id="nome"
                      {...register("nome")}
                      placeholder="Ex: Cadastro de Leads"
                    />
                    {errors.nome && (
                      <p className="text-sm text-destructive">{errors.nome.message}</p>
                    )}
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL) *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/form/</span>
                      <Input
                        id="slug"
                        {...register("slug")}
                        placeholder="cadastro-leads"
                      />
                    </div>
                    {errors.slug && (
                      <p className="text-sm text-destructive">{errors.slug.message}</p>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      {...register("descricao")}
                      placeholder="Descrição interna do formulário"
                      rows={3}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(v) => setValue("status", v as FormularioStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Modo */}
                  <div className="space-y-2">
                    <Label>Modo</Label>
                    <Select
                      value={watch("modo")}
                      onValueChange={(v) => setValue("modo", v as FormularioModo)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simples">Simples (Uma página)</SelectItem>
                        <SelectItem value="wizard">Wizard (Multi-etapas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Textos do Formulário */}
              <Card>
                <CardHeader>
                  <CardTitle>Textos do Formulário</CardTitle>
                  <CardDescription>Personalize os textos exibidos para o usuário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      {...register("titulo")}
                      placeholder="Ex: Agende sua avaliação gratuita"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subtitulo">Subtítulo</Label>
                    <Input
                      id="subtitulo"
                      {...register("subtitulo")}
                      placeholder="Ex: Preencha seus dados e entraremos em contato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="texto_botao">Texto do Botão</Label>
                    <Input
                      id="texto_botao"
                      {...register("texto_botao")}
                      placeholder="Enviar"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensagem_sucesso">Mensagem de Sucesso</Label>
                    <Textarea
                      id="mensagem_sucesso"
                      {...register("mensagem_sucesso")}
                      placeholder="Cadastro realizado com sucesso!"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ação Pós-Envio */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Ação Pós-Envio</CardTitle>
                  <CardDescription>O que acontece após o usuário enviar o formulário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ação</Label>
                    <Select
                      value={watch("acao_pos_envio")}
                      onValueChange={(v) => setValue("acao_pos_envio", v as FormularioAcaoPosEnvio)}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensagem">Exibir mensagem de sucesso</SelectItem>
                        <SelectItem value="redirect">Redirecionar para URL</SelectItem>
                        <SelectItem value="whatsapp">Abrir WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watch("acao_pos_envio") === "redirect" && (
                    <div className="space-y-2">
                      <Label htmlFor="redirect_url">URL de Redirecionamento</Label>
                      <Input
                        id="redirect_url"
                        {...register("redirect_url")}
                        placeholder="https://exemplo.com/obrigado"
                      />
                    </div>
                  )}

                  {watch("acao_pos_envio") === "whatsapp" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp_numero">Número do WhatsApp</Label>
                        <Input
                          id="whatsapp_numero"
                          {...register("whatsapp_numero")}
                          placeholder="5511999999999"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp_mensagem">Mensagem</Label>
                        <Textarea
                          id="whatsapp_mensagem"
                          {...register("whatsapp_mensagem")}
                          placeholder="Olá! Acabei de me cadastrar..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Campos */}
          <TabsContent value="campos" className="space-y-6">
            {/* Header dos Campos */}
            <div>
              <h2 className="text-xl font-semibold">Campos do Formulário</h2>
              <p className="text-sm text-muted-foreground">
                {campos?.length || 0} campo(s) configurado(s)
              </p>
            </div>

            {/* Botões de Atalho */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!id) {
                    toast.error("Salve o formulário primeiro");
                    return;
                  }
                  // Adicionar campos básicos: Nome, Email, WhatsApp
                  // campo_lead mapeia para a tabela mt_leads
                  const basicos = [
                    { nome: "nome", label: "Nome completo", tipo: "text" as FormularioCampoTipo, obrigatorio: true, campo_lead: "nome" },
                    { nome: "email", label: "E-mail", tipo: "email" as FormularioCampoTipo, obrigatorio: true, largura: "half" as FormularioCampoLargura, campo_lead: "email" },
                    { nome: "whatsapp", label: "WhatsApp", tipo: "tel" as FormularioCampoTipo, obrigatorio: true, largura: "half" as FormularioCampoLargura, campo_lead: "whatsapp" },
                  ];
                  for (let i = 0; i < basicos.length; i++) {
                    await createCampo({
                      formulario_id: id,
                      ...basicos[i],
                      ordem: (campos?.length || 0) + i,
                      ativo: true,
                      etapa: 1,
                    });
                  }
                  toast.success("Campos básicos adicionados!");
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Adicionar Campos Básicos
              </Button>

              <Button variant="outline" onClick={handleAddCampo}>
                <Plus className="h-4 w-4 mr-2" />
                Campo de Lead
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  if (!id) {
                    toast.error("Salve o formulário primeiro");
                    return;
                  }
                  await createCampo({
                    formulario_id: id,
                    nome: "servicos",
                    tipo: "servico",
                    label: "Serviços de Interesse",
                    obrigatorio: false,
                    ordem: campos?.length || 0,
                    largura: "full",
                    ativo: true,
                    etapa: 1,
                  });
                  toast.success("Campo de serviços adicionado!");
                }}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Serviços da Unidade
              </Button>

              <Button
                className="bg-green-500 hover:bg-green-600"
                onClick={handleAddCampo}
              >
                <Plus className="h-4 w-4 mr-2" />
                Campo Personalizado
              </Button>
            </div>

            {/* Lista de Campos */}
            {camposLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : campos && campos.length > 0 ? (
              <div className="space-y-3">
                {campos
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((campo, index) => (
                    <Card key={campo.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          {/* Drag Handle */}
                          <div className="cursor-move text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-5 w-5" />
                          </div>

                          {/* Número */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                            {index + 1}
                          </div>

                          {/* Info do Campo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{campo.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {CAMPO_TIPOS.find(t => t.value === campo.tipo)?.label || campo.tipo}
                              </Badge>
                              {campo.obrigatorio && (
                                <Badge className="bg-red-500 hover:bg-red-500 text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              {campo.largura && campo.largura !== "full" && (
                                <Badge variant="secondary" className="text-xs">
                                  {campo.largura === "half" ? "50%" : "33%"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {campo.nome}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // A edição inline já está disponível na seção expandida abaixo deste item.
                                // Scroll para o campo editável correspondente para melhor UX.
                                const fieldElement = document.getElementById(`campo-edit-${campo.id}`);
                                if (fieldElement) {
                                  fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  fieldElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                                  setTimeout(() => fieldElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
                                } else {
                                  toast.info("Edite os campos abaixo na lista expandida");
                                }
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCampo(campo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Campos Editáveis (expandido) */}
                        <div id={`campo-edit-${campo.id}`} className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-4 transition-all rounded-md">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Label</Label>
                            <Input
                              value={campo.label}
                              onChange={(e) => handleUpdateCampo(campo.id, { label: e.target.value })}
                              placeholder="Label do campo"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Nome (ID)</Label>
                            <Input
                              value={campo.nome}
                              onChange={(e) => handleUpdateCampo(campo.id, { nome: e.target.value })}
                              placeholder="nome_campo"
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tipo</Label>
                            <Select
                              value={campo.tipo}
                              onValueChange={(v) => handleUpdateCampo(campo.id, { tipo: v as FormularioCampoTipo })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CAMPO_TIPOS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Largura</Label>
                            <Select
                              value={campo.largura || "full"}
                              onValueChange={(v) => handleUpdateCampo(campo.id, { largura: v as FormularioCampoLargura })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LARGURAS.map((l) => (
                                  <SelectItem key={l.value} value={l.value}>
                                    {l.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Placeholder */}
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-xs text-muted-foreground">Placeholder</Label>
                            <Input
                              value={campo.placeholder || ""}
                              onChange={(e) => handleUpdateCampo(campo.id, { placeholder: e.target.value })}
                              placeholder="Texto de placeholder"
                            />
                          </div>

                          {/* Obrigatório */}
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Switch
                              checked={campo.obrigatorio}
                              onCheckedChange={(v) => handleUpdateCampo(campo.id, { obrigatorio: v })}
                            />
                            <Label className="text-sm">Campo obrigatório</Label>
                          </div>

                          {/* Opções para select/radio/checkbox */}
                          {(campo.tipo === "select" || campo.tipo === "radio") && (
                            <div className="space-y-1 md:col-span-4">
                              <Label className="text-xs text-muted-foreground">Opções (uma por linha)</Label>
                              <Textarea
                                value={(campo.opcoes || []).join("\n")}
                                onChange={(e) =>
                                  handleUpdateCampo(campo.id, {
                                    opcoes: e.target.value.split("\n").filter((v) => v.trim()),
                                  })
                                }
                                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                rows={3}
                              />
                            </div>
                          )}

                          {/* Configuração de Indicados */}
                          {campo.tipo === "indicados" && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Mínimo de indicações</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={campo.indicados_config?.min_indicados ?? 1}
                                  onChange={(e) =>
                                    handleUpdateCampo(campo.id, {
                                      indicados_config: {
                                        ...campo.indicados_config,
                                        min_indicados: parseInt(e.target.value) || 0,
                                        max_indicados: campo.indicados_config?.max_indicados ?? 5,
                                        campos_por_indicado: campo.indicados_config?.campos_por_indicado || [
                                          { nome: 'nome_amigo', label: 'Nome do Amigo', tipo: 'text', obrigatorio: true, placeholder: 'Nome completo' },
                                          { nome: 'whatsapp_amigo', label: 'WhatsApp', tipo: 'tel', obrigatorio: true, placeholder: '(00) 00000-0000', mascara: '(99) 99999-9999' },
                                        ],
                                      },
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">0 = não obrigatório</p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Máximo de indicações</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={campo.indicados_config?.max_indicados ?? 5}
                                  onChange={(e) =>
                                    handleUpdateCampo(campo.id, {
                                      indicados_config: {
                                        ...campo.indicados_config,
                                        min_indicados: campo.indicados_config?.min_indicados ?? 1,
                                        max_indicados: parseInt(e.target.value) || 5,
                                        campos_por_indicado: campo.indicados_config?.campos_por_indicado || [
                                          { nome: 'nome_amigo', label: 'Nome do Amigo', tipo: 'text', obrigatorio: true, placeholder: 'Nome completo' },
                                          { nome: 'whatsapp_amigo', label: 'WhatsApp', tipo: 'tel', obrigatorio: true, placeholder: '(00) 00000-0000', mascara: '(99) 99999-9999' },
                                        ],
                                      },
                                    })
                                  }
                                />
                                <p className="text-xs text-muted-foreground">Até 20 indicações</p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <ListPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhum campo adicionado</p>
                    <p className="text-sm mt-1">Use os botões acima para adicionar campos ao formulário</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Visual */}
          <TabsContent value="visual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalização Visual</CardTitle>
                <CardDescription>Customize as cores do formulário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="cor_primaria">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="cor_primaria"
                        {...register("cor_primaria")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...register("cor_primaria")}
                        placeholder="#10b981"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cor_botao">Cor do Botão</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="cor_botao"
                        {...register("cor_botao")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...register("cor_botao")}
                        placeholder="#10b981"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cor_botao_texto">Cor do Texto do Botão</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="cor_botao_texto"
                        {...register("cor_botao_texto")}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        {...register("cor_botao_texto")}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Integração */}
          <TabsContent value="integracao" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Webhook */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhook</CardTitle>
                  <CardDescription>Envie os dados para uma URL externa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="webhook_ativo">Webhook Ativo</Label>
                    <Switch
                      id="webhook_ativo"
                      checked={watch("webhook_ativo")}
                      onCheckedChange={(v) => setValue("webhook_ativo", v)}
                    />
                  </div>

                  {watch("webhook_ativo") && (
                    <div className="space-y-2">
                      <Label htmlFor="webhook_url">URL do Webhook</Label>
                      <Input
                        id="webhook_url"
                        {...register("webhook_url")}
                        placeholder="https://api.exemplo.com/webhook"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Segurança */}
              <Card>
                <CardHeader>
                  <CardTitle>Segurança</CardTitle>
                  <CardDescription>Configurações de segurança do formulário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>reCAPTCHA</Label>
                      <p className="text-sm text-muted-foreground">Proteção contra bots</p>
                    </div>
                    <Switch
                      checked={watch("recaptcha_ativo")}
                      onCheckedChange={(v) => setValue("recaptcha_ativo", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Honeypot</Label>
                      <p className="text-sm text-muted-foreground">Campo oculto anti-spam</p>
                    </div>
                    <Switch
                      checked={watch("honeypot_ativo")}
                      onCheckedChange={(v) => setValue("honeypot_ativo", v)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição de Leads (Round Robin) */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Repeat2 className="h-5 w-5" />
                    Distribuição de Leads (Round Robin)
                  </CardTitle>
                  <CardDescription>Distribua leads automaticamente entre membros da equipe ou departamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Round Robin Ativo</Label>
                      <p className="text-sm text-muted-foreground">Distribuir leads rotativamente</p>
                    </div>
                    <Switch
                      checked={roundRobinEnabled}
                      onCheckedChange={setRoundRobinEnabled}
                    />
                  </div>

                  {roundRobinEnabled && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label>Modo de Distribuição</Label>
                        <Select value={roundRobinMode} onValueChange={(v) => setRoundRobinMode(v as 'team' | 'department')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Por Equipe
                              </div>
                            </SelectItem>
                            <SelectItem value="department">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Por Departamento
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {roundRobinMode === 'team' && (
                        <div className="space-y-2">
                          <Label>Equipe</Label>
                          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma equipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {(teams || []).map((team: { id: string; nome: string }) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!selectedTeamId && (
                            <p className="text-xs text-amber-600">Selecione uma equipe para ativar o round robin</p>
                          )}
                        </div>
                      )}

                      {roundRobinMode === 'department' && (
                        <div className="space-y-2">
                          <Label>Departamento</Label>
                          <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um departamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {(departments || []).map((dept: { id: string; nome: string }) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!selectedDepartmentId && (
                            <p className="text-xs text-amber-600">Selecione um departamento para ativar o round robin</p>
                          )}
                        </div>
                      )}

                      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                        Os leads serão distribuídos rotativamente entre os membros ativos {roundRobinMode === 'team' ? 'da equipe' : 'do departamento'} selecionado.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rastreamento */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Rastreamento</CardTitle>
                  <CardDescription>Capture dados de rastreamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Capturar UTMs</Label>
                        <p className="text-sm text-muted-foreground">utm_source, utm_medium, etc.</p>
                      </div>
                      <Switch
                        checked={watch("capturar_utms")}
                        onCheckedChange={(v) => setValue("capturar_utms", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Capturar IP</Label>
                        <p className="text-sm text-muted-foreground">Endereço IP do visitante</p>
                      </div>
                      <Switch
                        checked={watch("capturar_ip")}
                        onCheckedChange={(v) => setValue("capturar_ip", v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
