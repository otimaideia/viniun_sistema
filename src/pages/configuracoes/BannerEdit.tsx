import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteBannersMT, type MTSiteBanner } from "@/hooks/multitenant/useSiteBannersMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  ArrowLeft,
  Save,
  Loader2,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const POSICAO_OPTIONS = [
  { value: "hero", label: "Hero (Principal)" },
  { value: "lateral", label: "Lateral" },
  { value: "footer", label: "Footer (Rodape)" },
  { value: "popup", label: "Popup" },
  { value: "categoria", label: "Categoria" },
];

const bannerSchema = z.object({
  titulo: z.string().min(2, "Minimo 2 caracteres").max(200),
  subtitulo: z.string().max(500).optional().or(z.literal("")),
  imagem_url: z.string().url("URL invalida").min(1, "URL da imagem e obrigatoria"),
  imagem_mobile_url: z.string().url("URL invalida").optional().or(z.literal("")),
  link_url: z.string().url("URL invalida").optional().or(z.literal("")),
  link_texto: z.string().max(100).optional().or(z.literal("")),
  posicao: z.string().min(1, "Selecione a posicao"),
  cor_fundo: z.string().max(20).optional().or(z.literal("")),
  cor_texto: z.string().max(20).optional().or(z.literal("")),
  ordem: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
  data_inicio: z.string().optional().or(z.literal("")),
  data_fim: z.string().optional().or(z.literal("")),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

export default function BannerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isSaving, setIsSaving] = useState(false);

  const { create, update } = useSiteBannersMT();

  // Load banner data for editing
  const { data: banner, isLoading: bannerLoading } = useQuery({
    queryKey: ['mt-site-banner', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from('mt_site_banners')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as MTSiteBanner;
    },
    enabled: !!id,
  });

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      titulo: "",
      subtitulo: "",
      imagem_url: "",
      imagem_mobile_url: "",
      link_url: "",
      link_texto: "",
      posicao: "hero",
      cor_fundo: "",
      cor_texto: "",
      ordem: 0,
      is_active: true,
      data_inicio: "",
      data_fim: "",
    },
  });

  // Load existing data into form
  useEffect(() => {
    if (banner && isEditing) {
      form.reset({
        titulo: banner.titulo || "",
        subtitulo: banner.subtitulo || "",
        imagem_url: banner.imagem_url || "",
        imagem_mobile_url: banner.imagem_mobile_url || "",
        link_url: banner.link_url || "",
        link_texto: banner.link_texto || "",
        posicao: banner.posicao || "hero",
        cor_fundo: banner.cor_fundo || "",
        cor_texto: banner.cor_texto || "",
        ordem: banner.ordem || 0,
        is_active: banner.is_active ?? true,
        data_inicio: banner.data_inicio ? banner.data_inicio.split("T")[0] : "",
        data_fim: banner.data_fim ? banner.data_fim.split("T")[0] : "",
      });
    }
  }, [banner, isEditing, form]);

  const watchImageUrl = form.watch("imagem_url");
  const watchCorFundo = form.watch("cor_fundo");
  const watchCorTexto = form.watch("cor_texto");
  const watchTitulo = form.watch("titulo");
  const watchSubtitulo = form.watch("subtitulo");

  const onSubmit = async (values: BannerFormValues) => {
    setIsSaving(true);
    try {
      const bannerData = {
        titulo: values.titulo,
        subtitulo: values.subtitulo || null,
        imagem_url: values.imagem_url,
        imagem_mobile_url: values.imagem_mobile_url || null,
        link_url: values.link_url || null,
        link_texto: values.link_texto || null,
        posicao: values.posicao,
        cor_fundo: values.cor_fundo || null,
        cor_texto: values.cor_texto || null,
        ordem: values.ordem,
        is_active: values.is_active,
        data_inicio: values.data_inicio || null,
        data_fim: values.data_fim || null,
      };

      if (isEditing && id) {
        await update.mutateAsync({ id, ...bannerData });
      } else {
        await create.mutateAsync(bannerData);
      }

      navigate("/configuracoes/banners");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar banner");
    } finally {
      setIsSaving(false);
    }
  };

  if (bannerLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/banners")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            {isEditing ? "Editar Banner" : "Novo Banner"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? `Editando: ${banner?.titulo}` : "Preencha os dados do novo banner"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informacoes Basicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Promocao de Verao" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitulo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Texto complementar do banner"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="posicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posicao *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a posicao" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POSICAO_OPTIONS.map((opt) => (
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
                  name="ordem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormDescription>Menor = aparece primeiro</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
              <CardDescription>URLs das imagens do banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="imagem_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem (Desktop) *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/banner.jpg" {...field} />
                    </FormControl>
                    <FormDescription>Tamanho recomendado: 1920x600px</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imagem_mobile_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem (Mobile)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.com/banner-mobile.jpg" {...field} />
                    </FormControl>
                    <FormDescription>Opcional. Tamanho recomendado: 768x400px</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Link */}
          <Card>
            <CardHeader>
              <CardTitle>Link</CardTitle>
              <CardDescription>Destino ao clicar no banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="link_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com/pagina" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="link_texto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do Botao</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Saiba mais" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Aparencia</CardTitle>
              <CardDescription>Cores e estilo do banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cor_fundo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="#E91E63" {...field} />
                        </FormControl>
                        {field.value && (
                          <div
                            className="w-10 h-10 rounded border flex-shrink-0"
                            style={{ backgroundColor: field.value }}
                          />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cor_texto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="#FFFFFF" {...field} />
                        </FormControl>
                        {field.value && (
                          <div
                            className="w-10 h-10 rounded border flex-shrink-0"
                            style={{ backgroundColor: field.value }}
                          />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Status */}
          <Card>
            <CardHeader>
              <CardTitle>Periodo e Status</CardTitle>
              <CardDescription>Controle de exibicao do banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-base">Banner Ativo</FormLabel>
                      <FormDescription>
                        Banner sera exibido no site quando ativo
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Opcional. Deixe vazio para exibir imediatamente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Opcional. Deixe vazio para exibir indefinidamente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {watchImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: watchCorFundo || "#f3f4f6",
                  }}
                >
                  <img
                    src={watchImageUrl}
                    alt="Preview do banner"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {(watchTitulo || watchSubtitulo) && (
                    <div
                      className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent"
                      style={{ color: watchCorTexto || "#ffffff" }}
                    >
                      {watchTitulo && (
                        <h3 className="text-lg font-bold">{watchTitulo}</h3>
                      )}
                      {watchSubtitulo && (
                        <p className="text-sm opacity-90">{watchSubtitulo}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Salvar Alteracoes" : "Criar Banner"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/configuracoes/banners")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
