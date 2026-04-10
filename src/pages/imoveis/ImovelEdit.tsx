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
  salas: z.coerce.number().min(0).default(0),
  cozinhas: z.coerce.number().min(0).default(0),
  dep_empregada: z.coerce.number().min(0).default(0),
  area_total: z.coerce.number().min(0).optional(),
  area_util: z.coerce.number().min(0).optional(),
  area_construida: z.coerce.number().min(0).optional(),
  area_privada: z.coerce.number().min(0).optional(),
  area_terreno: z.coerce.number().min(0).optional(),
  // Prices
  valor_venda: z.coerce.number().min(0).optional(),
  valor_locacao: z.coerce.number().min(0).optional(),
  valor_condominio: z.coerce.number().min(0).optional(),
  valor_iptu: z.coerce.number().min(0).optional(),
  valor_temporada: z.coerce.number().min(0).optional(),
  valor_promocao: z.coerce.number().min(0).optional(),
  aceita_financiamento: z.boolean().default(false),
  // Financing - Caixa
  financiamento_caixa: z.boolean().default(false),
  financ_caixa_valor_entrada: z.coerce.number().min(0).optional(),
  financ_caixa_valor_parcela: z.coerce.number().min(0).optional(),
  financ_caixa_qtd_parcelas: z.coerce.number().min(0).optional(),
  financ_caixa_observacoes: z.string().max(1000).optional(),
  // Financing - Construtora
  financiamento_construtora: z.boolean().default(false),
  financ_const_valor_entrada: z.coerce.number().min(0).optional(),
  financ_const_valor_parcela: z.coerce.number().min(0).optional(),
  financ_const_qtd_parcelas: z.coerce.number().min(0).optional(),
  financ_const_observacoes: z.string().max(1000).optional(),
  // People / Relations
  owner_id: z.string().optional(),
  captador_id: z.string().optional(),
  corretor_id: z.string().optional(),
  building_id: z.string().optional(),
  // Flags
  destaque: z.boolean().default(false),
  lancamento: z.boolean().default(false),
  // SEO
  meta_title: z.string().max(100).optional(),
  meta_description: z.string().max(300).optional(),
  slug: z.string().max(200).optional(),
  video_youtube_url: z.string().max(500).optional(),
  tour_virtual_url: z.string().max(500).optional(),
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
      salas: 0,
      cozinhas: 0,
      dep_empregada: 0,
      aceita_financiamento: false,
      financiamento_caixa: false,
      financiamento_construtora: false,
      destaque: false,
      lancamento: false,
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
        referencia: imovel.ref_code || "",
        tipo_id: imovel.property_type_id || "",
        finalidade_id: imovel.purpose_id || "",
        situacao: imovel.situacao || "disponivel",
        descricao: imovel.descricao || "",
        cep: imovel.cep || "",
        endereco: imovel.endereco || "",
        numero: imovel.numero || "",
        complemento: imovel.complemento || "",
        estado_id: imovel.location_estado_id || "",
        cidade_id: imovel.location_cidade_id || "",
        bairro_id: imovel.location_bairro_id || "",
        latitude: imovel.latitude?.toString() || "",
        longitude: imovel.longitude?.toString() || "",
        dormitorios: imovel.dormitorios || 0,
        suites: imovel.suites || 0,
        banheiros: imovel.banheiros || 0,
        vagas_garagem: imovel.garagens || 0,
        salas: imovel.salas || 0,
        cozinhas: imovel.cozinhas || 0,
        dep_empregada: imovel.dep_empregada || 0,
        area_total: imovel.area_total || undefined,
        area_util: imovel.area_util || undefined,
        area_construida: imovel.area_construida || undefined,
        area_privada: imovel.area_privada || undefined,
        area_terreno: imovel.area_terreno || undefined,
        valor_venda: imovel.valor_venda || undefined,
        valor_locacao: imovel.valor_locacao || undefined,
        valor_condominio: imovel.valor_condominio || undefined,
        valor_iptu: imovel.valor_iptu || undefined,
        valor_temporada: imovel.valor_temporada || undefined,
        valor_promocao: imovel.valor_promocao || undefined,
        aceita_financiamento: imovel.aceita_financiamento || false,
        financiamento_caixa: imovel.financiamento_caixa || false,
        financ_caixa_valor_entrada: imovel.financ_caixa_valor_entrada || undefined,
        financ_caixa_valor_parcela: imovel.financ_caixa_valor_parcela || undefined,
        financ_caixa_qtd_parcelas: imovel.financ_caixa_qtd_parcelas || undefined,
        financ_caixa_observacoes: imovel.financ_caixa_observacoes || "",
        financiamento_construtora: imovel.financiamento_construtora || false,
        financ_const_valor_entrada: imovel.financ_const_valor_entrada || undefined,
        financ_const_valor_parcela: imovel.financ_const_valor_parcela || undefined,
        financ_const_qtd_parcelas: imovel.financ_const_qtd_parcelas || undefined,
        financ_const_observacoes: imovel.financ_const_observacoes || "",
        owner_id: imovel.owner_id || "",
        captador_id: imovel.captador_id || "",
        corretor_id: imovel.corretor_id || "",
        building_id: imovel.building_id || "",
        destaque: imovel.destaque || false,
        lancamento: imovel.lancamento || false,
        meta_title: imovel.seo_title || "",
        meta_description: imovel.seo_descricao || "",
        slug: imovel.slug || "",
        video_youtube_url: imovel.video_youtube_url || "",
        tour_virtual_url: imovel.tour_virtual_url || "",
        foto_principal_url: imovel.foto_destaque_url || "",
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

  const { data: owners = [] } = useQuery({
    queryKey: ["mt-property-owners", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_owners" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return data || [];
    },
    enabled: !!tenant,
  });

  const { data: captadores = [] } = useQuery({
    queryKey: ["mt-captadores", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_captadores" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return data || [];
    },
    enabled: !!tenant,
  });

  const { data: corretores = [] } = useQuery({
    queryKey: ["mt-corretores", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_corretores" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return data || [];
    },
    enabled: !!tenant,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ["mt-buildings", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_buildings" as any)
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
        salas: values.salas || 0,
        cozinhas: values.cozinhas || 0,
        dep_empregada: values.dep_empregada || 0,
        area_total: values.area_total || null,
        area_util: values.area_util || null,
        area_construida: values.area_construida || null,
        area_privada: values.area_privada || null,
        area_terreno: values.area_terreno || null,
        valor_venda: values.valor_venda || null,
        valor_locacao: values.valor_locacao || null,
        valor_condominio: values.valor_condominio || null,
        valor_iptu: values.valor_iptu || null,
        valor_temporada: values.valor_temporada || null,
        valor_promocao: values.valor_promocao || null,
        aceita_financiamento: values.aceita_financiamento || false,
        financiamento_caixa: values.financiamento_caixa || false,
        financ_caixa_valor_entrada: values.financ_caixa_valor_entrada || null,
        financ_caixa_valor_parcela: values.financ_caixa_valor_parcela || null,
        financ_caixa_qtd_parcelas: values.financ_caixa_qtd_parcelas || null,
        financ_caixa_observacoes: values.financ_caixa_observacoes || null,
        financiamento_construtora: values.financiamento_construtora || false,
        financ_const_valor_entrada: values.financ_const_valor_entrada || null,
        financ_const_valor_parcela: values.financ_const_valor_parcela || null,
        financ_const_qtd_parcelas: values.financ_const_qtd_parcelas || null,
        financ_const_observacoes: values.financ_const_observacoes || null,
        owner_id: values.owner_id || null,
        captador_id: values.captador_id || null,
        corretor_id: values.corretor_id || null,
        building_id: values.building_id || null,
        destaque: values.destaque || false,
        lancamento: values.lancamento || false,
        seo_title: values.meta_title || null,
        seo_descricao: values.meta_description || null,
        slug: values.slug || null,
        video_youtube_url: values.video_youtube_url || null,
        tour_virtual_url: values.tour_virtual_url || null,
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
                    <FormField control={form.control} name="salas" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salas</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cozinhas" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cozinhas</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dep_empregada" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dep. Empregada</FormLabel>
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
                    <FormField control={form.control} name="area_construida" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Construída (m²)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="area_privada" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área Privada (m²)</FormLabel>
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
                  </div>
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
                    <FormField control={form.control} name="valor_temporada" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporada (R$/dia)</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="valor_promocao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promoção (R$)</FormLabel>
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
                <CardContent className="space-y-6">
                  <FormField control={form.control} name="aceita_financiamento" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Aceita Financiamento</FormLabel>
                    </FormItem>
                  )} />

                  <div className="border rounded-lg p-4 space-y-4">
                    <FormField control={form.control} name="financiamento_caixa" render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="!mt-0 font-semibold">Financiamento Caixa</FormLabel>
                      </FormItem>
                    )} />
                    {form.watch("financiamento_caixa") && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="financ_caixa_valor_entrada" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Entrada (R$)</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_caixa_valor_parcela" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Parcela (R$)</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_caixa_qtd_parcelas" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qtd. Parcelas</FormLabel>
                            <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_caixa_observacoes" render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Observacoes Caixa</FormLabel>
                            <FormControl><Textarea rows={2} placeholder="Observacoes sobre financiamento Caixa..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <FormField control={form.control} name="financiamento_construtora" render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="!mt-0 font-semibold">Financiamento Construtora</FormLabel>
                      </FormItem>
                    )} />
                    {form.watch("financiamento_construtora") && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="financ_const_valor_entrada" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Entrada (R$)</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_const_valor_parcela" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Parcela (R$)</FormLabel>
                            <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_const_qtd_parcelas" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qtd. Parcelas</FormLabel>
                            <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="financ_const_observacoes" render={({ field }) => (
                          <FormItem className="md:col-span-3">
                            <FormLabel>Observacoes Construtora</FormLabel>
                            <FormControl><Textarea rows={2} placeholder="Observacoes sobre financiamento Construtora..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </div>
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

                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-4">Responsáveis e Vínculo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="owner_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proprietário</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(owners as any[]).map((o) => (
                                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="captador_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Captador</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(captadores as any[]).map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="corretor_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corretor</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(corretores as any[]).map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="building_id" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edifício</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(buildings as any[]).map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
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
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-4">Mídia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="video_youtube_url" render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL YouTube</FormLabel>
                          <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="tour_virtual_url" render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Tour Virtual</FormLabel>
                          <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
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
