import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDepartments, useDepartment } from "@/hooks/multitenant/useDepartments";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";

// Schema de validação
const departmentSchema = z.object({
  codigo: z.string().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e underscore"),
  nome: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  descricao: z.string().max(500, "Máximo 500 caracteres").optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida"),
  icone: z.string().min(1, "Selecione um ícone"),
  parent_id: z.string().optional(),
  scope: z.enum(["global", "tenant", "franchise"]),
  ordem: z.number().min(0).max(999),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

// Ícones disponíveis para seleção
const AVAILABLE_ICONS = [
  "Building2", "Users", "Megaphone", "TrendingUp", "Headphones", "DollarSign",
  "Wrench", "Monitor", "FileText", "CheckCircle", "MapPin", "Package",
  "Scale", "Phone", "GraduationCap", "Crown", "Briefcase", "Mail",
  "MessageSquare", "Settings", "Shield", "Star", "Target", "Zap",
  "Heart", "Award", "Camera", "Clipboard", "Clock", "Coffee",
];

// Cores predefinidas
const PRESET_COLORS = [
  "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4",
  "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B",
  "#FFC107", "#FF9800", "#FF5722", "#795548", "#607D8B", "#6B7280",
];

function IconPreview({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (LucideIcons as any)[iconName] || Building2;
  return <Icon className={className} />;
}

export default function DepartamentoEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const parentIdFromUrl = searchParams.get("parent");
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!id;
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { departments, createDepartment, updateDepartment } = useDepartments();
  const { department: existingDepartment, isLoading } = useDepartment(id);

  // Determinar escopo padrão baseado no nível de acesso
  const getDefaultScope = () => {
    if (accessLevel === 'platform') return 'global';
    if (accessLevel === 'franchise') return 'franchise';
    return 'tenant';
  };

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      cor: "#6B7280",
      icone: "Building2",
      parent_id: parentIdFromUrl || "",
      scope: getDefaultScope(),
      ordem: 0,
    },
  });

  // Preencher formulário quando carregar departamento existente
  useEffect(() => {
    if (existingDepartment && isEditing) {
      const scope = existingDepartment.franchise_id
        ? 'franchise'
        : existingDepartment.tenant_id
        ? 'tenant'
        : 'global';

      form.reset({
        codigo: existingDepartment.codigo,
        nome: existingDepartment.nome,
        descricao: existingDepartment.descricao || "",
        cor: existingDepartment.cor,
        icone: existingDepartment.icone,
        parent_id: existingDepartment.parent_id || "",
        scope,
        ordem: existingDepartment.ordem,
      });
    }
  }, [existingDepartment, isEditing, form]);

  const onSubmit = async (values: DepartmentFormValues) => {
    setIsSaving(true);
    try {
      const departmentData = {
        codigo: values.codigo,
        nome: values.nome,
        descricao: values.descricao || null,
        cor: values.cor,
        icone: values.icone,
        parent_id: values.parent_id || null,
        ordem: values.ordem,
        // Definir tenant_id e franchise_id baseado no escopo
        tenant_id: values.scope === 'global' ? null : tenant?.id,
        franchise_id: values.scope === 'franchise' ? franchise?.id : null,
      };

      if (isEditing) {
        await updateDepartment(id!, departmentData);
        toast.success("Departamento atualizado com sucesso");
      } else {
        await createDepartment(departmentData);
        toast.success("Departamento criado com sucesso");
      }

      navigate("/configuracoes/departamentos");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("duplicate")) {
        toast.error("Já existe um departamento com este código");
      } else {
        toast.error(isEditing ? "Erro ao atualizar departamento" : "Erro ao criar departamento");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrar departamentos para seleção de pai (excluir o próprio e seus filhos)
  const parentOptions = departments.filter((dept) => {
    if (isEditing && dept.id === id) return false;
    if (isEditing && dept.parent_id === id) return false;
    return !dept.parent_id; // Apenas departamentos raiz podem ser pais
  });

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Departamento" : "Novo Departamento"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informações do departamento"
              : "Preencha as informações para criar um novo departamento"
            }
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Nome, código e descrição do departamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Marketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: marketing"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador único (letras minúsculas, números e _)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva as responsabilidades do departamento..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ordem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de exibição</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Escopo, hierarquia e visual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escopo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o escopo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accessLevel === 'platform' && (
                            <SelectItem value="global">
                              Global (disponível para todos)
                            </SelectItem>
                          )}
                          {(accessLevel === 'platform' || accessLevel === 'tenant') && (
                            <SelectItem value="tenant">
                              Empresa (disponível para todas franquias)
                            </SelectItem>
                          )}
                          <SelectItem value="franchise">
                            Franquia (apenas esta unidade)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define onde este departamento será visível
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento Pai</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhum (departamento raiz)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum (departamento raiz)</SelectItem>
                          {parentOptions.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              <div className="flex items-center gap-2">
                                <IconPreview iconName={dept.icone} className="h-4 w-4" />
                                {dept.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecione para criar um subdepartamento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded-lg border"
                              style={{ backgroundColor: field.value }}
                            />
                            <Input
                              type="text"
                              placeholder="#000000"
                              {...field}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`h-6 w-6 rounded border-2 transition-all ${
                                  field.value === color ? 'border-foreground scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: form.watch('cor') + '20' }}
                            >
                              <IconPreview
                                iconName={field.value}
                                className="h-5 w-5"
                                style={{ color: form.watch('cor') } as any}
                              />
                            </div>
                            <span className="text-sm font-medium">{field.value}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {AVAILABLE_ICONS.map((iconName) => (
                              <button
                                key={iconName}
                                type="button"
                                className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  field.value === iconName
                                    ? 'border-primary bg-primary/10'
                                    : 'border-transparent hover:border-muted-foreground/30'
                                }`}
                                onClick={() => field.onChange(iconName)}
                                title={iconName}
                              >
                                <IconPreview iconName={iconName} className="h-5 w-5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancelar
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
                  {isEditing ? "Salvar Alterações" : "Criar Departamento"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
