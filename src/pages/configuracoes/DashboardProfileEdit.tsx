import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDashboardConfigMT } from "@/hooks/multitenant/useDashboardConfigMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Save, Loader2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

// Schema de validacao
const profileSchema = z.object({
  codigo: z
    .string()
    .min(2, "Minimo 2 caracteres")
    .max(50, "Maximo 50 caracteres")
    .regex(/^[a-z0-9_-]+$/, "Apenas letras minusculas, numeros, hifens e underscore"),
  nome: z.string().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
  descricao: z.string().max(500, "Maximo 500 caracteres").optional(),
  icone: z.string().max(50, "Maximo 50 caracteres").optional(),
  cor: z.string().optional(),
  role_codigos_str: z.string().optional(),
  cargos_str: z.string().optional(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  ordem: z.number().min(0).max(999),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Cores predefinidas
const PRESET_COLORS = [
  "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4",
  "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#FFC107", "#FF9800",
  "#FF5722", "#795548", "#607D8B", "#6B7280",
];

export default function DashboardProfileEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!id;
  const { tenant, accessLevel } = useTenantContext();
  const { profiles, createProfile, updateProfile } = useDashboardConfigMT();

  // Find existing profile when editing
  const existingProfile = isEditing
    ? profiles?.find((p) => p.id === id)
    : null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      icone: "",
      cor: "#6B7280",
      role_codigos_str: "",
      cargos_str: "",
      is_default: false,
      is_active: true,
      ordem: 0,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingProfile && isEditing) {
      form.reset({
        codigo: existingProfile.codigo,
        nome: existingProfile.nome,
        descricao: existingProfile.descricao || "",
        icone: existingProfile.icone || "",
        cor: existingProfile.cor || "#6B7280",
        role_codigos_str: (existingProfile.role_codigos || []).join(", "),
        cargos_str: (existingProfile.cargos || []).join(", "),
        is_default: existingProfile.is_default,
        is_active: existingProfile.is_active,
        ordem: existingProfile.ordem,
      });
    }
  }, [existingProfile, isEditing, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const role_codigos = values.role_codigos_str
        ? values.role_codigos_str
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const cargos = values.cargos_str
        ? values.cargos_str
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const profileData = {
        codigo: values.codigo,
        nome: values.nome,
        descricao: values.descricao || undefined,
        icone: values.icone || undefined,
        cor: values.cor || undefined,
        role_codigos,
        cargos,
        is_default: values.is_default,
        is_active: values.is_active,
        ordem: values.ordem,
      };

      if (isEditing) {
        await updateProfile.mutateAsync({ id: id!, ...profileData });
      } else {
        await createProfile.mutateAsync(profileData as Record<string, unknown>);
      }

      navigate("/configuracoes/dashboard-profiles");
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.message?.includes("duplicate")) {
        toast.error("Ja existe um perfil com este codigo");
      } else {
        toast.error(
          isEditing
            ? "Erro ao atualizar perfil"
            : "Erro ao criar perfil"
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && !existingProfile && profiles !== undefined) {
    // Profiles loaded but not found
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Perfil nao encontrado</p>
        <Button variant="outline" onClick={() => navigate("/configuracoes/dashboard-profiles")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  if (isEditing && !existingProfile) {
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/configuracoes/dashboard-profiles")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Perfil de Dashboard" : "Novo Perfil de Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informacoes do perfil"
              : "Preencha as informacoes para criar um novo perfil de dashboard"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Informacoes Basicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Informacoes Basicas
                </CardTitle>
                <CardDescription>
                  Nome, codigo e descricao do perfil
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
                        <Input placeholder="Ex: Gerente Comercial" {...field} />
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
                      <FormLabel>Codigo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: gerente-comercial"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]/g, "")
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador unico (letras minusculas, numeros, hifens e _)
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
                      <FormLabel>Descricao</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o perfil de dashboard..."
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
                      <FormLabel>Ordem de exibicao</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Configuracoes */}
            <Card>
              <CardHeader>
                <CardTitle>Configuracoes</CardTitle>
                <CardDescription>
                  Visual, regras de matching e status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="icone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icone (Lucide)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: LayoutDashboard"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Nome do icone do Lucide React
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
                              className="h-10 w-10 rounded-lg border shrink-0"
                              style={{ backgroundColor: field.value || "#6B7280" }}
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
                                  field.value === color
                                    ? "border-foreground scale-110"
                                    : "border-transparent"
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

                <Separator />

                <FormField
                  control={form.control}
                  name="role_codigos_str"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Codigos</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: tenant_admin, franchise_admin"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Codigos de roles separados por virgula
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cargos_str"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargos</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: gerente, coordenador"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Cargos separados por virgula (matching parcial)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Perfil padrao</FormLabel>
                        <FormDescription>
                          Usado quando nenhum outro perfil corresponder ao usuario
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Ativo</FormLabel>
                        <FormDescription>
                          Perfis inativos nao serao exibidos
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/configuracoes/dashboard-profiles")}
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
                  {isEditing ? "Salvar Alteracoes" : "Criar Perfil"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
