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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, User, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  telefone2: z.string().optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  cpf_cnpj: z.string().optional().or(z.literal("")),
  rg_inscricao_estadual: z.string().optional().or(z.literal("")),
  tipo_pessoa: z.enum(["PF", "PJ"]).default("PF"),
  // Endereço
  endereco: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  // Observação
  observacao: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function ProprietarioEdit() {
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
      rg_inscricao_estadual: "",
      tipo_pessoa: "PF",
      endereco: "",
      numero: "",
      complemento: "",
      cep: "",
      bairro: "",
      observacao: "",
    },
  });

  const tipoPessoa = form.watch("tipo_pessoa");

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-proprietario", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_owners" as any)
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
        rg_inscricao_estadual: item.rg_inscricao_estadual ?? "",
        tipo_pessoa: item.tipo_pessoa ?? "PF",
        endereco: item.endereco ?? "",
        numero: item.numero ?? "",
        complemento: item.complemento ?? "",
        cep: item.cep ?? "",
        bairro: item.bairro ?? "",
        observacao: item.observacao ?? "",
      });
    }
  }, [item, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(values)) {
        if (key === "tipo_pessoa") {
          cleaned[key] = val;
        } else {
          cleaned[key] = val === "" || val === undefined ? null : val;
        }
      }
      cleaned.nome = values.nome;
      cleaned.tipo_pessoa = values.tipo_pessoa;

      const payload = {
        ...cleaned,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from("mt_property_owners" as any)
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("mt_property_owners" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["mt-proprietarios"] });
      toast.success(isEditing ? "Proprietário atualizado" : "Proprietário criado");
      navigate(`/proprietarios/${data.id}`);
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
          {isEditing ? "Editar Proprietário" : "Novo Proprietário"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          {/* Dados do Proprietário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Dados do Proprietário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="tipo_pessoa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pessoa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PF">Pessoa Física</SelectItem>
                        <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tipoPessoa === "PJ" ? "Razão Social *" : "Nome *"}</FormLabel>
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
                    <FormLabel>{tipoPessoa === "PJ" ? "CNPJ" : "CPF"}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rg_inscricao_estadual" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tipoPessoa === "PJ" ? "Inscrição Estadual" : "RG"}</FormLabel>
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

          {/* Observação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="observacao" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea rows={4} placeholder="Observações sobre o proprietário..." {...field} value={field.value ?? ""} /></FormControl>
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
