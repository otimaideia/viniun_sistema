import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, User, MapPin, Settings } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  telefone2: z.string().optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  cpf_cnpj: z.string().optional().or(z.literal("")),
  // Endereço
  endereco: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  // Classificação
  tipo_cadastro: z.string().optional().or(z.literal("")),
  grupo: z.string().optional().or(z.literal("")),
  receber_email: z.boolean().default(true),
  // Observação
  observacao: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const TIPO_CADASTRO_OPTIONS = [
  { value: "comprador", label: "Comprador" },
  { value: "locatario", label: "Locatário" },
  { value: "investidor", label: "Investidor" },
  { value: "comprador_locatario", label: "Comprador/Locatário" },
];

const GRUPO_OPTIONS = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "rural", label: "Rural" },
  { value: "misto", label: "Misto" },
];

export default function ClienteEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      telefone2: "",
      celular: "",
      cpf_cnpj: "",
      endereco: "",
      numero: "",
      complemento: "",
      cep: "",
      bairro: "",
      tipo_cadastro: "",
      grupo: "",
      receber_email: true,
      observacao: "",
    },
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-cliente-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_clients" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (item) {
      form.reset({
        nome: item.nome ?? "",
        email: item.email ?? "",
        telefone: item.telefone ?? "",
        telefone2: item.telefone2 ?? "",
        celular: item.celular ?? "",
        cpf_cnpj: item.cpf_cnpj ?? "",
        endereco: item.endereco ?? "",
        numero: item.numero ?? "",
        complemento: item.complemento ?? "",
        cep: item.cep ?? "",
        bairro: item.bairro ?? "",
        tipo_cadastro: item.tipo_cadastro ?? "",
        grupo: item.grupo ?? "",
        receber_email: item.receber_email ?? true,
        observacao: item.observacao ?? "",
      });
    }
  }, [item, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(values)) {
        if (key === "receber_email") {
          cleaned[key] = val;
        } else {
          cleaned[key] = val === "" || val === undefined ? null : val;
        }
      }
      cleaned.nome = values.nome;

      const payload = {
        ...cleaned,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from("mt_property_clients" as any)
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("mt_property_clients" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["mt-clientes-imoveis"] });
      toast.success(isEditing ? "Cliente atualizado" : "Cliente criado");
      navigate(`/clientes-imoveis/${data.id}`);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  if (isEditing && isLoading) {
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
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Cliente" : "Novo Cliente"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf_cnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="telefone2" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone 2</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="celular" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <FormField control={form.control} name="endereco" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="complemento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bairro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cep" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Classificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Classificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="tipo_cadastro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cadastro</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {TIPO_CADASTRO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="grupo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {GRUPO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="receber_email" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Receber Email</FormLabel>
                      <FormDescription>
                        Cliente aceita receber comunicações por email
                      </FormDescription>
                    </div>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Observação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="observacao" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea rows={4} placeholder="Observações sobre o cliente..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Actions */}
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
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
