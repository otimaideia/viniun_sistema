import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LocationCascadeSelect } from "@/components/imoveis/LocationCascadeSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const imovelSchema = z.object({
  titulo: z.string().min(3, "Mínimo 3 caracteres").max(200, "Máximo 200 caracteres"),
  referencia: z.string().max(50).optional(),
  tipo_id: z.string().optional(),
  finalidade_id: z.string().optional(),
  situacao: z.string().default("disponivel"),
  descricao: z.string().max(5000).optional(),
  // Location
  cep: z.string().max(10).optional(),
  endereco: z.string().max(255).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(100).optional(),
  estado_id: z.string().optional(),
  cidade_id: z.string().optional(),
  bairro_id: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  // Rooms/Areas
  dormitorios: z.coerce.number().min(0).default(0),
  suites: z.coerce.number().min(0).default(0),
  banheiros: z.coerce.number().min(0).default(0),
  vagas_garagem: z.coerce.number().min(0).default(0),
  area_total: z.coerce.number().min(0).optional(),
  area_util: z.coerce.number().min(0).optional(),
  area_terreno: z.coerce.number().min(0).optional(),
  andar: z.coerce.number().min(0).optional(),
  ano_construcao: z.coerce.number().min(1900).max(2100).optional(),
  // Prices
  valor_venda: z.coerce.number().min(0).optional(),
  valor_locacao: z.coerce.number().min(0).optional(),
  valor_condominio: z.coerce.number().min(0).optional(),
  valor_iptu: z.coerce.number().min(0).optional(),
  aceita_financiamento: z.boolean().default(false),
  aceita_permuta: z.boolean().default(false),
  // Flags
  destaque: z.boolean().default(false),
  lancamento: z.boolean().default(false),
  exclusividade: z.boolean().default(false),
  // SEO
  meta_title: z.string().max(100).optional(),
  meta_description: z.string().max(300).optional(),
  slug: z.string().max(200).optional(),
  foto_principal_url: z.string().url().optional().or(z.literal("")),
});

type ImovelFormValues = z.infer<typeof imovelSchema>;

export default function ImovelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<ImovelFormValues>({
    resolver: zodResolver(imovelSchema),
    defaultValues: {
      titulo: "",
      referencia: "",
      situacao: "disponivel",
      descricao: "",
      dormitorios: 0,
      suites: 0,
      banheiros: 0,
      vagas_garagem: 0,
      aceita_financiamento: false,
      aceita_permuta: false,
      destaque: false,
      lancamento: false,
      exclusividade: false,
    },
  });

  const { data: imovel, isLoading: loadingImovel } = useQuery({
    queryKey: ["mt-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_properties" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (imovel) {
      form.reset({
        titulo: imovel.titulo || "",
        referencia: imovel.referencia || "",
        tipo_id: imovel.tipo_id || "",
        finalidade_id: imovel.finalidade_id || "",
        situacao: imovel.situacao || "disponivel",
        descricao: imovel.descricao || "",
        cep: imovel.cep || "",
        endereco: imovel.endereco || "",
        numero: imovel.numero || "",
        complemento: imovel.complemento || "",
        estado_id: imovel.estado_id || "",
        cidade_id: imovel.cidade_id || "",
        bairro_id: imovel.bairro_id || "",
        latitude: imovel.latitude?.toString() || "",
        longitude: imovel.longitude?.toString() || "",
        dormitorios: imovel.dormitorios || 0,
        suites: imovel.suites || 0,
        banheiros: imovel.banheiros || 0,
        vagas_garagem: imovel.vagas_garagem || 0,
        area_total: imovel.area_total || undefined,
        area_util: imovel.area_util || undefined,
        area_terreno: imovel.area_terreno || undefined,
        andar: imovel.andar || undefined,
        ano_construcao: imovel.ano_construcao || undefined,
        valor_venda: imovel.valor_venda || undefined,
        valor_locacao: imovel.valor_locacao || undefined,
        valor_condominio: imovel.valor_condominio || undefined,
        valor_iptu: imovel.valor_iptu || undefined,
        aceita_financiamento: imovel.aceita_financiamento || false,
        aceita_permuta: imovel.aceita_permuta || false,
        destaque: imovel.destaque || false,
        lancamento: imovel.lancamento || false,
        exclusividade: imovel.exclusividade || false,
        meta_title: imovel.meta_title || "",
        meta_description: imovel.meta_description || "",
        slug: imovel.slug || "",
        foto_principal_url: imovel.foto_principal_url || "",
      });
    }
  }, [imovel, form]);

  const { data: tipos = [] } = useQuery({
    queryKey: ["mt-imovel-tipos", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_types" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return data || [];
    },
    enabled: !!tenant,
  });

  const { data: finalidades = [] } = useQuery({
    queryKey: ["mt-imovel-finalidades", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_purposes" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return data || [];
    },
    enabled: !!tenant,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ImovelFormValues) => {
      // Mapear nomes do form → nomes da tabela mt_properties
      const payload: Record<string, any> = {
        titulo: values.titulo,
        ref_code: values.referencia || null,
        property_type_id: values.tipo_id || null,
        purpose_id: values.finalidade_id || null,
        situacao: values.situacao || 'disponivel',
        descricao: values.descricao || null,
        cep: values.cep || null,
        endereco: values.endereco || null,
        numero: values.numero || null,
        complemento: values.complemento || null,
        location_estado_id: values.estado_id || null,
        location_cidade_id: values.cidade_id || null,
        location_bairro_id: values.bairro_id || null,
        latitude: values.latitude ? parseFloat(values.latitude) : null,
        longitude: values.longitude ? parseFloat(values.longitude) : null,
        dormitorios: values.dormitorios || 0,
        suites: values.suites || 0,
        banheiros: values.banheiros || 0,
        garagens: values.vagas_garagem || 0,
        area_total: values.area_total || null,
        area_util: values.area_util || null,
        area_terreno: values.area_terreno || null,
        valor_venda: values.valor_venda || null,
        valor_locacao: values.valor_locacao || null,
        valor_condominio: values.valor_condominio || null,
        valor_iptu: values.valor_iptu || null,
        aceita_financiamento: values.aceita_financiamento || false,
        destaque: values.destaque || false,
        lancamento: values.lancamento || false,
        seo_title: values.meta_title || null,
        seo_descricao: values.meta_description || null,
        slug: values.slug || null,
        foto_destaque_url: values.foto_principal_url || null,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from("mt_properties" as any)
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("mt_properties" as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["mt-imoveis"] });
      queryClient.invalidateQueries({ queryKey: ["mt-imovel", id] });
      toast.success(isEditing ? "Imóvel atualizado com sucesso" : "Imóvel criado com sucesso");
      navigate(`/imoveis/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const onSubmit = (values: ImovelFormValues) => {
    saveMutation.mutate(values);
  };

  if (isEditing && loadingImovel) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Imóvel" : "Novo Imóvel"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? `Editando: ${imovel?.titulo}` : "Preencha os dados do imóvel"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basico">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="localizacao">Localização</TabsTrigger>
              <TabsTrigger value="comodos">Cômodos</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="financiamento">Financ.</TabsTrigger>
              <TabsTrigger value="flags">Opções</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="basico">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Dados principais do imóvel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="titulo" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Título *</FormLabel>
                        <FormControl><Input placeholder="Apartamento 3 quartos no centro" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="referencia" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referência</FormLabel>
                        <FormControl><Input placeholder="REF-001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="situacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Situação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="disponivel">Disponível</SelectItem>
                            <SelectItem value="vendido">Vendido</SelectItem>
                            <SelectItem value="alugado">Alugado</SelectItem>
                            <SelectItem value="reservado">Reservado</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tipo_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(tipos as any[]).map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="finalidade_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finalidade *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(finalidades as any[]).map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea rows={5} placeholder="Descreva o imóvel..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="foto_principal_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Foto Principal</FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localizacao">
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LocationCascadeSelect
                    estadoId={form.watch("estado_id") || ""}
                    cidadeId={form.watch("cidade_id") || ""}
                    bairroId={form.watch("bairro_id") || ""}
                    onChange={({ estadoId, cidadeId, bairroId }) => {
                      form.setValue("estado_id", estadoId);
                      form.setValue("cidade_id", cidadeId);
                      form.setValue("bairro_id", bairroId);
                    }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="cep" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endereco" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl><Input placeholder="Rua, Avenida..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="numero" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl><Input placeholder="123" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="complemento" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Complemento</FormLabel>
                        <FormControl><Input placeholder="Apto 101, Bloco B" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl><Input placeholder="-23.5505" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl><Input placeholder="-46.6333" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comodos">
              <Card>
                <CardHeader>
                  <CardTitle>Cômodos e Áreas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="dormitorios" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dormitórios</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="suites" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suítes</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="banheiros" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banheiros</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vagas_garagem" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vagas Garagem</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="area_total" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Total (m²)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="area_util" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Útil (m²)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="area_terreno" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Terreno (m²)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="andar" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Andar</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="ano_construcao" render={({ field }) => (
                    <FormItem className="max-w-[200px]">
                      <FormLabel>Ano de Construção</FormLabel>
                      <FormControl><Input type="number" min="1900" max="2100" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="precos">
              <Card>
                <CardHeader>
                  <CardTitle>Preços e Valores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="valor_venda" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Venda (R$)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_locacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Locação (R$/mês)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_condominio" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condomínio (R$/mês)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_iptu" render={({ field }) => (
                      <FormItem>
                        <FormLabel>IPTU (R$/ano)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financiamento">
              <Card>
                <CardHeader>
                  <CardTitle>Financiamento e Permuta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="aceita_financiamento" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Aceita Financiamento</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="aceita_permuta" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Aceita Permuta</FormLabel>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flags">
              <Card>
                <CardHeader>
                  <CardTitle>Opções e Destaques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="destaque" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="!mt-0">Imóvel em Destaque</FormLabel>
                        <FormDescription>Aparece em posição privilegiada nas listagens</FormDescription>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lancamento" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="!mt-0">Lançamento</FormLabel>
                        <FormDescription>Marcar como novo lançamento</FormDescription>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="exclusividade" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="!mt-0">Exclusividade</FormLabel>
                        <FormDescription>Imóvel com exclusividade de venda/locação</FormDescription>
                      </div>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo">
              <Card>
                <CardHeader>
                  <CardTitle>SEO e URL</CardTitle>
                  <CardDescription>Configurações para mecanismos de busca</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (URL)</FormLabel>
                      <FormControl><Input placeholder="apartamento-3-quartos-centro" {...field} /></FormControl>
                      <FormDescription>URL amigável do imóvel</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meta_title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl><Input placeholder="Título para SEO" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="meta_description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl><Textarea rows={3} placeholder="Descrição para SEO" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Salvar Alterações" : "Criar Imóvel"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
