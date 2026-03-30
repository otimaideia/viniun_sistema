import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Calendar,
  DollarSign,
  MessageSquare,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  Star,
  FileText,
  Loader2,
  Sparkles,
  Check,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useFormulariosAdapter } from "@/hooks/useFormulariosAdapter";
import { useFormularioTemplatesAdapter } from "@/hooks/useFormularioTemplatesAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { supabase } from "@/integrations/supabase/client";
import type {
  FormularioTemplate,
  FormularioTemplateCategoria,
} from "@/types/formulario";

// Mapeamento de icones por categoria
const CATEGORY_ICONS: Record<FormularioTemplateCategoria, React.ElementType> = {
  lead_capture: UserPlus,
  agendamento: Calendar,
  orcamento: DollarSign,
  contato: MessageSquare,
  pesquisa: ClipboardList,
  cadastro: UserCheck,
  evento: CalendarCheck,
  avaliacao: Star,
  indicacao: Users,
};

export default function FormularioNovo() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get("template");

  const { franqueados } = useFranqueadosAdapter();
  const { unidadeId, isAdmin } = useUserProfileAdapter();
  const { createFormulario, isCreating } = useFormulariosAdapter();
  const {
    templates,
    templatesByCategory,
    categoriesWithTemplates,
    isLoading: templatesLoading,
    getTemplateById,
    incrementUsage,
  } = useFormularioTemplatesAdapter();

  const [step, setStep] = useState<"template" | "dados">(templateId ? "dados" : "template");
  const [selectedTemplate, setSelectedTemplate] = useState<FormularioTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    franqueado_id: unidadeId || "",
  });

  // Carregar template se vier na URL
  useEffect(() => {
    if (templateId && templateId !== "blank") {
      loadTemplate(templateId);
    } else if (templateId === "blank") {
      setSelectedTemplate(null);
      setStep("dados");
    }
  }, [templateId]);

  // Atualizar franqueado_id quando unidadeId carregar
  useEffect(() => {
    if (unidadeId && !formData.franqueado_id) {
      setFormData((prev) => ({ ...prev, franqueado_id: unidadeId }));
    }
  }, [unidadeId]);

  const loadTemplate = async (id: string) => {
    const template = await getTemplateById(id);
    if (template) {
      setSelectedTemplate(template);
      setStep("dados");
    }
  };

  // Gerar slug automatico
  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Selecionar template e ir para dados
  const handleSelectTemplate = (template: FormularioTemplate | null) => {
    if (template) {
      setSearchParams({ template: template.id });
      incrementUsage(template.id);
    } else {
      setSearchParams({ template: "blank" });
    }
    setSelectedTemplate(template);
    setStep("dados");
  };

  // Criar formulario
  const handleCreate = async () => {
    if (!formData.nome) {
      toast.error("Preencha o nome do formulario");
      return;
    }

    const slug = formData.slug || generateSlug(formData.nome);

    try {
      // Dados base do formulario
      const baseData = selectedTemplate?.config || {};

      // Campos essenciais que sabemos existir na tabela
      const formularioData = {
        nome: formData.nome,
        slug,
        franqueado_id: formData.franqueado_id || null,
        status: "rascunho" as const,
        ativo: false,
        modo: baseData.modo || "simples",
        acao_pos_envio: baseData.acao_pos_envio || "mensagem",
        mensagem_sucesso: baseData.mensagem_sucesso || "Obrigado! Entraremos em contato em breve.",
        titulo: baseData.titulo || null,
        subtitulo: baseData.subtitulo || null,
        texto_botao: baseData.texto_botao || "Enviar",
        cor_primaria: baseData.cor_primaria || "#10b981",
        webhook_ativo: false,
        recaptcha_ativo: false,
        wizard_config: baseData.wizard_config || null,
      };

      const created = await createFormulario(formularioData as any);

      // Se tem template com campos, criar os campos
      if (created && selectedTemplate?.campos?.length) {
        for (const campo of selectedTemplate.campos) {
          await supabase.from("mt_form_fields").insert({
            formulario_id: created.id,
            nome: campo.nome,
            tipo: campo.tipo,
            label: campo.label,
            placeholder: campo.placeholder,
            obrigatorio: campo.obrigatorio,
            ordem: campo.ordem,
            largura: campo.largura,
            ativo: true,
            opcoes: campo.opcoes,
            mascara: campo.mascara,
            etapa: campo.etapa,
            campo_lead: campo.campo_lead,
            indicados_config: campo.indicados_config,
          });
        }
      }

      // Toast já é exibido pelo hook
      navigate(`/formularios/${created.id}/editar`);
    } catch (error) {
      console.error("Erro ao criar formulario:", error);
      toast.error("Erro ao criar formulario");
    }
  };

  // Voltar para selecao de template
  const handleBack = () => {
    setSearchParams({});
    setSelectedTemplate(null);
    setStep("template");
  };

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templatesByCategory[activeCategory as FormularioTemplateCategoria] || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step === "template" ? navigate("/formularios") : handleBack())}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Formulario</h1>
            <p className="text-muted-foreground">
              {step === "template"
                ? "Escolha um template ou comece do zero"
                : selectedTemplate
                ? `Baseado em "${selectedTemplate.nome}"`
                : "Formulario em branco"}
            </p>
          </div>
        </div>

        {/* Step 1: Selecao de Template */}
        {step === "template" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Escolha um Template
              </CardTitle>
              <CardDescription>
                Selecione um modelo pre-configurado ou comece do zero
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tabs de Categorias */}
              <Tabs
                value={activeCategory}
                onValueChange={setActiveCategory}
                className="space-y-4"
              >
                <TabsList className="w-full justify-start gap-1 h-auto flex-wrap p-1">
                  <TabsTrigger value="all" className="text-xs">
                    Todos
                  </TabsTrigger>
                  {categoriesWithTemplates.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.categoria];
                    return (
                      <TabsTrigger
                        key={cat.categoria}
                        value={cat.categoria}
                        className="text-xs gap-1"
                      >
                        <Icon className="h-3 w-3" />
                        {cat.label}
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {cat.count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value={activeCategory}>
                  {templatesLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* Card Em Branco */}
                      <Card
                        className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                        onClick={() => handleSelectTemplate(null)}
                      >
                        <CardHeader className="p-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-base">Em Branco</CardTitle>
                          <CardDescription className="text-xs">
                            Comece do zero e crie seu formulario
                          </CardDescription>
                        </CardHeader>
                      </Card>

                      {/* Templates */}
                      {filteredTemplates.map((template) => {
                        const Icon = CATEGORY_ICONS[template.categoria] || FileText;
                        return (
                          <Card
                            key={template.id}
                            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-start justify-between">
                                <div
                                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                                  style={{
                                    backgroundColor: `${template.config?.cor_primaria || "#10b981"}20`,
                                  }}
                                >
                                  <Icon
                                    className="h-5 w-5"
                                    style={{
                                      color: template.config?.cor_primaria || "#10b981",
                                    }}
                                  />
                                </div>
                                {template.is_premium && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-base mt-2">{template.nome}</CardTitle>
                              <CardDescription className="text-xs line-clamp-2">
                                {template.descricao}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 pt-0">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{template.campos?.length || 0} campos</span>
                                <span>{template.uso_count || 0} usos</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Dados do Formulario */}
        {step === "dados" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Dados do Formulario</CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? `Sera criado com ${selectedTemplate.campos?.length || 0} campos do template`
                  : "Sera criado em branco para voce configurar manualmente"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Formulario *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => {
                    const nome = e.target.value;
                    setFormData({
                      ...formData,
                      nome,
                      slug: generateSlug(nome),
                    });
                  }}
                  placeholder="Ex: Cadastro Promocao Janeiro"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/form/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="cadastro-promocao-janeiro"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  URL final: {window.location.origin}/form/{formData.slug || "seu-slug"}
                </p>
              </div>

              {/* Franquia (opcional) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Franquia (opcional)</Label>
                  <Select
                    value={formData.franqueado_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, franqueado_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma (formulario global)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (formulario global)</SelectItem>
                      {franqueados.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para criar um formulario disponivel para todas as unidades
                  </p>
                </div>
              )}

              {/* Info do Template */}
              {selectedTemplate && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${selectedTemplate.config?.cor_primaria || "#10b981"}20`,
                      }}
                    >
                      {(() => {
                        const Icon = CATEGORY_ICONS[selectedTemplate.categoria] || FileText;
                        return (
                          <Icon
                            className="h-5 w-5"
                            style={{
                              color: selectedTemplate.config?.cor_primaria || "#10b981",
                            }}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <p className="font-medium">{selectedTemplate.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.campos?.length || 0} campos serao adicionados
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botoes */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Criar Formulario
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
