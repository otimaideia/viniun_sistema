import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePromocoesMT } from "@/hooks/multitenant/usePromocoesMT";
import { useServicosMT } from "@/hooks/multitenant/useServicosMT";
import { usePromocaoServicesMT } from "@/hooks/multitenant/usePromocaoServicesMT";
import { usePromocaoAssetsMT } from "@/hooks/multitenant/usePromocaoAssetsMT";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Tag, Upload, Trash2, Image, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const promocaoSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  codigo: z.string().optional(),
  tipo: z.enum(["desconto", "pacote", "lancamento", "evento", "sazonal"]),
  descricao: z.string().optional(),
  desconto_tipo: z.enum(["percentual", "fixo"]).optional(),
  desconto_valor: z.coerce.number().min(0).optional(),
  valor_minimo: z.coerce.number().min(0).optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  max_usos: z.coerce.number().min(0).optional(),
  banner_url: z.string().optional(),
  cor_destaque: z.string().optional(),
  publico_alvo: z.string().optional(),
  is_public: z.boolean().default(false),
  termos: z.string().optional(),
});

type PromocaoFormData = z.infer<typeof promocaoSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 30);
}

const TIPO_OPTIONS = [
  { value: "desconto", label: "Desconto" },
  { value: "pacote", label: "Pacote" },
  { value: "lancamento", label: "Lançamento" },
  { value: "evento", label: "Evento" },
  { value: "sazonal", label: "Sazonal" },
];

const PUBLICO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "novos_clientes", label: "Novos Clientes" },
  { value: "clientes_recorrentes", label: "Clientes Recorrentes" },
  { value: "indicacoes", label: "Indicações" },
  { value: "influenciadoras", label: "Influenciadoras" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PromocaoEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { tenant, accessLevel } = useTenantContext();
  const {
    promocoes,
    isLoading,
    createPromocao,
    updatePromocao,
  } = usePromocoesMT();

  const { servicos, isLoading: isLoadingServicos } = useServicosMT();
  const { services: existingServices, addServices, removeService, updateServiceOverride } = usePromocaoServicesMT(id);
  const { assets, uploadAsset, deleteAsset, isUploading, isDeleting } = usePromocaoAssetsMT(id);

  const promocao = id ? (promocoes || []).find((p) => p.id === id) : null;

  // Selected services with optional price override
  const [selectedServices, setSelectedServices] = useState<
    { service_id: string; preco_promocional: number | null }[]
  >([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PromocaoFormData>({
    resolver: zodResolver(promocaoSchema),
    defaultValues: {
      titulo: "",
      codigo: "",
      tipo: "desconto",
      descricao: "",
      desconto_tipo: "percentual",
      desconto_valor: undefined,
      valor_minimo: undefined,
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: "",
      max_usos: undefined,
      banner_url: "",
      cor_destaque: "#E91E63",
      publico_alvo: "todos",
      is_public: false,
      termos: "",
    },
  });

  const titulo = watch("titulo");
  const codigo = watch("codigo");
  const isPublic = watch("is_public");

  // Auto-generate codigo from titulo when creating
  useEffect(() => {
    if (!isEditing && titulo && !codigo) {
      setValue("codigo", slugify(titulo));
    }
  }, [titulo, isEditing, codigo, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (promocao && isEditing) {
      reset({
        titulo: promocao.titulo || "",
        codigo: promocao.codigo || "",
        tipo: promocao.tipo || "desconto",
        descricao: promocao.descricao || "",
        desconto_tipo: promocao.desconto_tipo || "percentual",
        desconto_valor: promocao.desconto_valor ?? undefined,
        valor_minimo: promocao.valor_minimo ?? undefined,
        data_inicio: promocao.data_inicio ? promocao.data_inicio.substring(0, 10) : "",
        data_fim: promocao.data_fim ? promocao.data_fim.substring(0, 10) : "",
        max_usos: promocao.max_usos ?? undefined,
        banner_url: promocao.banner_url || "",
        cor_destaque: promocao.cor_destaque || "#E91E63",
        publico_alvo: promocao.publico_alvo || "todos",
        is_public: promocao.is_public ?? false,
        termos: promocao.termos || "",
      });

      // Load services from promotion
      if (promocao.services && promocao.services.length > 0) {
        setSelectedServices(
          promocao.services.map((s) => ({
            service_id: s.service_id,
            preco_promocional: s.preco_promocional ?? null,
          }))
        );
      }
    }
  }, [promocao, isEditing, reset]);

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.service_id === serviceId);
      if (exists) {
        return prev.filter((s) => s.service_id !== serviceId);
      }
      return [...prev, { service_id: serviceId, preco_promocional: null }];
    });
  };

  const updateServicePrice = (serviceId: string, price: number | null) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.service_id === serviceId ? { ...s, preco_promocional: price } : s
      )
    );
  };

  // Asset upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const isImage = file.type.startsWith("image/");
    const tipo = isImage ? "banner" : "documento";

    try {
      await uploadAsset.mutateAsync({
        promotionId: id,
        file,
        tipo: tipo as "banner" | "documento",
      });
    } catch {
      // toast already handled by hook
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: PromocaoFormData) => {
    try {
      // Sanitize data: convert empty strings to null for optional fields
      const promotionData: Record<string, any> = {
        titulo: data.titulo,
        codigo: data.codigo || undefined,
        tipo: data.tipo,
        descricao: data.descricao || null,
        desconto_tipo: data.desconto_tipo || null,
        desconto_valor: data.desconto_valor && !isNaN(data.desconto_valor) ? data.desconto_valor : null,
        valor_minimo: data.valor_minimo && !isNaN(data.valor_minimo) ? data.valor_minimo : null,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        max_usos: data.max_usos && !isNaN(data.max_usos) ? data.max_usos : null,
        banner_url: data.banner_url || null,
        cor_destaque: data.cor_destaque || null,
        publico_alvo: data.publico_alvo || 'todos',
        is_public: data.is_public ?? false,
        termos: data.termos || null,
      };

      let promotionId = id;

      if (isEditing && id) {
        await updatePromocao.mutateAsync({ id, ...promotionData });
      } else {
        const created = await createPromocao.mutateAsync(promotionData);
        promotionId = created.id;
      }

      // Save services if promotion was created/updated successfully
      if (promotionId && selectedServices.length > 0) {
        // Get current services to determine what to add/remove
        const currentServiceIds = (existingServices || []).map((s) => s.service_id);
        const newServiceIds = selectedServices.map((s) => s.service_id);

        // Remove services that were unselected
        const toRemove = (existingServices || []).filter(
          (s) => !newServiceIds.includes(s.service_id)
        );
        for (const svc of toRemove) {
          await removeService.mutateAsync(svc.id);
        }

        // Add services that are new
        const toAdd = selectedServices
          .filter((s) => !currentServiceIds.includes(s.service_id))
          .map((s) => s.service_id);

        if (toAdd.length > 0) {
          const added = await addServices.mutateAsync({
            promotionId: promotionId,
            serviceIds: toAdd,
          });

          // Update price overrides for newly added services
          for (const addedSvc of added) {
            const selected = selectedServices.find((s) => s.service_id === addedSvc.service_id);
            if (selected?.preco_promocional != null) {
              await updateServiceOverride.mutateAsync({
                id: addedSvc.id,
                preco_promocional: selected.preco_promocional,
              });
            }
          }
        }

        // Update price overrides for existing services that were kept
        const keptServices = (existingServices || []).filter(
          (s) => newServiceIds.includes(s.service_id)
        );
        for (const kept of keptServices) {
          const selected = selectedServices.find((s) => s.service_id === kept.service_id);
          const newPrice = selected?.preco_promocional ?? null;
          if (newPrice !== (kept.preco_promocional ?? null)) {
            await updateServiceOverride.mutateAsync({
              id: kept.id,
              preco_promocional: newPrice,
            });
          }
        }
      } else if (promotionId && selectedServices.length === 0 && existingServices && existingServices.length > 0) {
        // Remove all services if none selected
        for (const svc of existingServices) {
          await removeService.mutateAsync(svc.id);
        }
      }

      toast.success(isEditing ? "Promoção atualizada com sucesso" : "Promoção criada com sucesso");
      navigate("/promocoes");
    } catch (error: unknown) {
      toast.error(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Loading / not found states
  if (isLoading && isEditing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (isEditing && !promocao && !isLoading) {
    return (
      <div className="text-center py-12">
        <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Promoção não encontrada</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/promocoes">Voltar às Promoções</Link>
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/promocoes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isEditing ? "Editar Promoção" : "Nova Promoção"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Altere os dados da promoção"
              : "Cadastre uma nova promoção"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Info Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados principais da promoção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                {...register("titulo")}
                placeholder="Ex: Black Friday - 50% OFF"
              />
              {errors.titulo && (
                <p className="text-sm text-destructive">{errors.titulo.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  {...register("codigo")}
                  placeholder="auto-gerado"
                />
                <p className="text-xs text-muted-foreground">
                  Gerado automaticamente a partir do título
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={watch("tipo")}
                  onValueChange={(value: string) => setValue("tipo", value as "desconto" | "pacote" | "lancamento" | "evento" | "sazonal")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Descreva os detalhes da promoção..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Desconto */}
        <Card>
          <CardHeader>
            <CardTitle>Desconto</CardTitle>
            <CardDescription>Configure o tipo e valor do desconto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desconto_tipo">Tipo de Desconto</Label>
                <Select
                  value={watch("desconto_tipo") || "percentual"}
                  onValueChange={(value: string) => setValue("desconto_tipo", value as "percentual" | "fixo")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desconto_valor">
                  Valor do Desconto{" "}
                  {watch("desconto_tipo") === "percentual" ? "(%)" : "(R$)"}
                </Label>
                <Input
                  id="desconto_valor"
                  type="number"
                  min={0}
                  step={watch("desconto_tipo") === "percentual" ? 1 : 0.01}
                  {...register("desconto_valor")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_minimo">Valor Mínimo (R$)</Label>
                <Input
                  id="valor_minimo"
                  type="number"
                  min={0}
                  step={0.01}
                  {...register("valor_minimo")}
                  placeholder="0,00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validade */}
        <Card>
          <CardHeader>
            <CardTitle>Validade</CardTitle>
            <CardDescription>Período de vigência da promoção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  {...register("data_inicio")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término</Label>
                <Input
                  id="data_fim"
                  type="date"
                  {...register("data_fim")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_usos">Máximo de Usos</Label>
                <Input
                  id="max_usos"
                  type="number"
                  min={0}
                  {...register("max_usos")}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual */}
        <Card>
          <CardHeader>
            <CardTitle>Visual</CardTitle>
            <CardDescription>Aparência da promoção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banner_url">URL do Banner</Label>
                <Input
                  id="banner_url"
                  {...register("banner_url")}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor_destaque">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor_destaque"
                    type="color"
                    className="w-14 h-10 p-1 cursor-pointer"
                    {...register("cor_destaque")}
                  />
                  <Input
                    value={watch("cor_destaque") || ""}
                    onChange={(e) => setValue("cor_destaque", e.target.value)}
                    placeholder="#E91E63"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mídia e Banners */}
        <Card>
          <CardHeader>
            <CardTitle>Mídia e Banners</CardTitle>
            <CardDescription>
              Imagens e documentos associados à promoção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Salve a promoção primeiro para adicionar mídia.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Upload button + hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAssetUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  {isUploading ? "Enviando..." : "Enviar Arquivo"}
                </Button>

                {/* Assets grid */}
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma mídia adicionada ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {assets.map((asset) => {
                      const isImage = asset.mime_type?.startsWith("image/");
                      return (
                        <div
                          key={asset.id}
                          className="relative border rounded-lg p-2 flex flex-col items-center gap-2 group"
                        >
                          {/* Thumbnail or icon */}
                          {isImage ? (
                            <img
                              src={asset.url}
                              alt={asset.titulo || "Asset"}
                              className="w-full h-24 object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {/* Title + badge */}
                          <div className="w-full flex items-center gap-1 min-w-0">
                            <p className="text-xs truncate flex-1" title={asset.titulo || ""}>
                              {asset.titulo || "Sem título"}
                            </p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {asset.tipo}
                            </Badge>
                          </div>

                          {/* Delete button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                            disabled={isDeleting}
                            onClick={() => deleteAsset.mutate(asset.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Inclusos</CardTitle>
            <CardDescription>
              Selecione os serviços que participam desta promoção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingServicos ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !servicos || servicos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum serviço cadastrado
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {servicos
                  .filter((s) => s.is_active)
                  .map((servico) => {
                    const isSelected = selectedServices.some(
                      (s) => s.service_id === servico.id
                    );
                    const serviceEntry = selectedServices.find(
                      (s) => s.service_id === servico.id
                    );

                    return (
                      <div
                        key={servico.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isSelected ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleService(servico.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {servico.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Preço: {formatCurrency(servico.preco)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">
                              Preço promo:
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-28 h-8 text-sm"
                              placeholder="Original"
                              value={serviceEntry?.preco_promocional ?? ""}
                              onChange={(e) =>
                                updateServicePrice(
                                  servico.id,
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            {selectedServices.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {selectedServices.length} serviço(s) selecionado(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Opções adicionais da promoção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publico_alvo">Público-Alvo</Label>
                <Select
                  value={watch("publico_alvo") || "todos"}
                  onValueChange={(value) => setValue("publico_alvo", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLICO_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="is_public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setValue("is_public", checked)}
                />
                <Label htmlFor="is_public">Promoção pública (visível no site)</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="termos">Termos e Condições</Label>
              <Textarea
                id="termos"
                {...register("termos")}
                placeholder="Descreva os termos e condições da promoção..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/promocoes">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createPromocao.isPending || updatePromocao.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSubmitting || createPromocao.isPending || updatePromocao.isPending
              ? "Salvando..."
              : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PromocaoEdit;
