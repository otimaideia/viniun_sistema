import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePasswordVaultMT, usePasswordVaultEntryMT, usePasswordVaultFoldersMT } from "@/hooks/multitenant/usePasswordVaultMT";
import { VAULT_CATEGORY_OPTIONS, type VaultEntryFormData } from "@/types/password-vault";
import {
  generatePassword,
  calculateStrength,
  getStrengthInfo,
  DEFAULT_PASSWORD_OPTIONS,
  type PasswordOptions,
} from "@/lib/password-generator";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Save,
  Folder,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

// Form schema
const vaultEntrySchema = z.object({
  nome: z.string().min(2, "Minimo 2 caracteres").max(255),
  descricao: z.string().max(1000).optional().or(z.literal("")),
  url: z.string().max(2048).optional().or(z.literal("")),
  categoria: z.enum([
    "credencial", "api_key", "token", "certificado",
    "env_var", "conexao_db", "integracao",
  ]),
  folder_id: z.string().optional(),
  username: z.string().max(500).optional().or(z.literal("")),
  value: z.string(), // Required for create, optional for edit (validated in onSubmit)
  tags: z.string().optional(), // comma-separated, parsed later
  expires_at: z.string().optional().or(z.literal("")),
  rotation_days: z.coerce.number().min(0).max(365).optional(),
  notas: z.string().max(5000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof vaultEntrySchema>;

const CofreSenhasEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { createEntry, updateEntry, revealValue } = usePasswordVaultMT();
  const { entry, isLoading: isEntryLoading } = usePasswordVaultEntryMT(id);
  const { folders } = usePasswordVaultFoldersMT();

  // Password visibility
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password generator
  const [genOptions, setGenOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [showGenerator, setShowGenerator] = useState(false);

  // Extra fields (dynamic key-value)
  const [extraFields, setExtraFields] = useState<Array<{ key: string; value: string }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(vaultEntrySchema),
    defaultValues: {
      nome: "",
      descricao: "",
      url: "",
      categoria: "credencial",
      folder_id: "none",
      username: "",
      value: "",
      tags: "",
      expires_at: "",
      rotation_days: undefined,
      notas: "",
    },
  });

  // Load entry data for editing
  useEffect(() => {
    if (isEditing && entry) {
      form.reset({
        nome: entry.nome || "",
        descricao: entry.descricao || "",
        url: entry.url || "",
        categoria: entry.categoria,
        folder_id: entry.folder_id || "none",
        username: entry.username || "",
        value: "", // Don't pre-fill encrypted value
        tags: entry.tags.join(", "),
        expires_at: entry.expires_at ? entry.expires_at.split("T")[0] : "",
        rotation_days: entry.rotation_days || undefined,
        notas: entry.notas || "",
      });

      if (entry.campos_extras && Object.keys(entry.campos_extras).length > 0) {
        setExtraFields(
          Object.entries(entry.campos_extras).map(([key, value]) => ({ key, value }))
        );
      }
    }
  }, [isEditing, entry, form]);

  // Current value strength
  const currentValue = form.watch("value");
  const strengthScore = currentValue ? calculateStrength(currentValue) : 0;
  const strengthInfo = currentValue ? getStrengthInfo(strengthScore) : null;

  // Generate password
  const handleGenerate = () => {
    const password = generatePassword(genOptions);
    form.setValue("value", password, { shouldValidate: true });
    setShowValue(true);
  };

  // Add extra field
  const addExtraField = () => {
    setExtraFields([...extraFields, { key: "", value: "" }]);
  };

  const removeExtraField = (index: number) => {
    setExtraFields(extraFields.filter((_, i) => i !== index));
  };

  const updateExtraField = (index: number, field: "key" | "value", val: string) => {
    const updated = [...extraFields];
    updated[index][field] = val;
    setExtraFields(updated);
  };

  // Submit
  const onSubmit = async (values: FormValues) => {
    // Validate: value is required for new entries
    if (!isEditing && !values.value) {
      form.setError("value", { message: "Valor obrigatorio para nova credencial" });
      return;
    }

    setIsSaving(true);
    try {
      const formData: VaultEntryFormData = {
        nome: values.nome,
        descricao: values.descricao || undefined,
        url: values.url || undefined,
        categoria: values.categoria,
        folder_id: values.folder_id && values.folder_id !== "none" ? values.folder_id : undefined,
        username: values.username || undefined,
        value: values.value || "",
        tags: values.tags
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        expires_at: values.expires_at || undefined,
        rotation_days: values.rotation_days || undefined,
        notas: values.notas || undefined,
        campos_extras: extraFields.length > 0
          ? Object.fromEntries(extraFields.filter((f) => f.key).map((f) => [f.key, f.value]))
          : undefined,
      };

      if (isEditing && id) {
        await updateEntry(id, formData);
      } else {
        await createEntry(formData);
      }

      navigate("/configuracoes/cofre-senhas");
    } catch {
      // Error handled by hook toast
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isEntryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/cofre-senhas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-red-600" />
            {isEditing ? "Editar Credencial" : "Nova Credencial"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing
              ? "Atualize as informacoes da credencial"
              : "Adicione uma nova credencial ao cofre seguro"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacoes Basicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Supabase Dashboard, WAHA API Key..." {...field} />
                    </FormControl>
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
                      <Input placeholder="Breve descricao do que e essa credencial" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VAULT_CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="folder_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pasta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem pasta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem pasta</SelectItem>
                          {folders.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              <span className="flex items-center gap-1">
                                <Folder className="h-3 w-3" style={{ color: f.cor }} />
                                {f.nome}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://exemplo.com/dashboard"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>URL do servico ou dashboard (opcional)</FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credenciais</CardTitle>
              <CardDescription>
                {isEditing
                  ? "Deixe o campo valor em branco para manter o valor atual"
                  : "Insira o usuario e senha/chave"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario / Email</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@exemplo.com" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor / Senha / Chave *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <div className="relative flex-1">
                          <Input
                            type={showValue ? "text" : "password"}
                            placeholder={isEditing ? "(manter valor atual)" : "Insira a senha ou chave"}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowValue(!showValue)}
                          >
                            {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowGenerator(!showGenerator)}
                      >
                        <Wand2 className="h-4 w-4 mr-1" /> Gerar
                      </Button>
                    </div>
                    <FormMessage />
                    {isEditing && (
                      <FormDescription>
                        Deixe em branco para manter o valor criptografado atual
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />

              {/* Strength indicator */}
              {currentValue && strengthInfo && (
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${strengthInfo.score}%`,
                          backgroundColor: strengthInfo.color,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${strengthInfo.textColor}`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Password Generator */}
              {showGenerator && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Gerador de Senha</Label>
                      <Button type="button" size="sm" onClick={handleGenerate}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Gerar Senha
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Comprimento: {genOptions.length}
                      </Label>
                      <Slider
                        value={[genOptions.length]}
                        onValueChange={([v]) => setGenOptions({ ...genOptions, length: v })}
                        min={8}
                        max={128}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Maiusculas (A-Z)</Label>
                        <Switch
                          checked={genOptions.uppercase}
                          onCheckedChange={(v) => setGenOptions({ ...genOptions, uppercase: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Minusculas (a-z)</Label>
                        <Switch
                          checked={genOptions.lowercase}
                          onCheckedChange={(v) => setGenOptions({ ...genOptions, lowercase: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Numeros (0-9)</Label>
                        <Switch
                          checked={genOptions.numbers}
                          onCheckedChange={(v) => setGenOptions({ ...genOptions, numbers: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Simbolos (!@#$)</Label>
                        <Switch
                          checked={genOptions.symbols}
                          onCheckedChange={(v) => setGenOptions({ ...genOptions, symbols: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Tags & Expiration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags e Expiracao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="producao, waha, supabase (separadas por virgula)" {...field} />
                    </FormControl>
                    <FormDescription>Separe as tags por virgula</FormDescription>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Expiracao</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Quando a credencial expira (opcional)</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rotation_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rotacao (dias)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          placeholder="90"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Lembrete para trocar a cada N dias</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes & Extra Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas e Campos Extras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anotacoes adicionais sobre esta credencial..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Dynamic extra fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Campos Extras</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExtraField}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Campo
                  </Button>
                </div>
                {extraFields.length > 0 ? (
                  <div className="space-y-2">
                    {extraFields.map((field, index) => (
                      <div key={field.key || `field-${index}`} className="flex gap-2">
                        <Input
                          placeholder="Nome do campo"
                          value={field.key}
                          onChange={(e) => updateExtraField(index, "key", e.target.value)}
                          className="w-1/3"
                        />
                        <Input
                          placeholder="Valor"
                          value={field.value}
                          onChange={(e) => updateExtraField(index, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeExtraField(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo extra. Adicione para guardar informacoes adicionais.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/configuracoes/cofre-senhas")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : isEditing ? "Atualizar" : "Salvar Credencial"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CofreSenhasEdit;
