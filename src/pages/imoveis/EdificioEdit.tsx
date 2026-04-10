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
import { ArrowLeft, Save, Loader2, Building2, MapPin, Users, FileText } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  construtora_id: z.string().optional().or(z.literal("")),
  ano_construcao: z.coerce.number().min(1900).max(2100).optional().or(z.literal("" as any)),
  total_unidades: z.coerce.number().min(0).optional().or(z.literal("" as any)),
  total_andares: z.coerce.number().min(0).optional().or(z.literal("" as any)),
  valor_condominio: z.coerce.number().min(0).optional().or(z.literal("" as any)),
  // Endereço
  endereco: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  // Síndico
  sindico_nome: z.string().optional().or(z.literal("")),
  sindico_telefone: z.string().optional().or(z.literal("")),
  sindico_email: z.string().email("Email inválido").optional().or(z.literal("")),
  sindico_celular: z.string().optional().or(z.literal("")),
  // Porteiro 1
  porteiro1_nome: z.string().optional().or(z.literal("")),
  porteiro1_telefone: z.string().optional().or(z.literal("")),
  porteiro1_email: z.string().email("Email inválido").optional().or(z.literal("")),
  porteiro1_celular: z.string().optional().or(z.literal("")),
  // Porteiro 2
  porteiro2_nome: z.string().optional().or(z.literal("")),
  porteiro2_telefone: z.string().optional().or(z.literal("")),
  porteiro2_email: z.string().email("Email inválido").optional().or(z.literal("")),
  porteiro2_celular: z.string().optional().or(z.literal("")),
  // Zelador
  zelador_nome: z.string().optional().or(z.literal("")),
  zelador_telefone: z.string().optional().or(z.literal("")),
  zelador_email: z.string().email("Email inválido").optional().or(z.literal("")),
  zelador_celular: z.string().optional().or(z.literal("")),
  // Descrição
  descricao: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function EdificioEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      construtora_id: "",
      ano_construcao: "" as any,
      total_unidades: "" as any,
      total_andares: "" as any,
      valor_condominio: "" as any,
      endereco: "",
      numero: "",
      complemento: "",
      cep: "",
      sindico_nome: "",
      sindico_telefone: "",
      sindico_email: "",
      sindico_celular: "",
      porteiro1_nome: "",
      porteiro1_telefone: "",
      porteiro1_email: "",
      porteiro1_celular: "",
      porteiro2_nome: "",
      porteiro2_telefone: "",
      porteiro2_email: "",
      porteiro2_celular: "",
      zelador_nome: "",
      zelador_telefone: "",
      zelador_email: "",
      zelador_celular: "",
      descricao: "",
    },
  });

  // Load existing building
  const { data: edificio, isLoading } = useQuery({
    queryKey: ["mt-edificio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_buildings" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  // Load construtoras for dropdown
  const { data: construtoras } = useQuery({
    queryKey: ["mt-construtoras-select", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_construtoras" as any)
        .select("id, nome")
        .eq("tenant_id", tenant?.id)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
    enabled: !!tenant?.id,
  });

  useEffect(() => {
    if (edificio) {
      form.reset({
        nome: edificio.nome ?? "",
        construtora_id: edificio.construtora_id ?? "",
        ano_construcao: edificio.ano_construcao ?? ("" as any),
        total_unidades: edificio.total_unidades ?? ("" as any),
        total_andares: edificio.total_andares ?? ("" as any),
        valor_condominio: edificio.valor_condominio ?? ("" as any),
        endereco: edificio.endereco ?? "",
        numero: edificio.numero ?? "",
        complemento: edificio.complemento ?? "",
        cep: edificio.cep ?? "",
        sindico_nome: edificio.sindico_nome ?? "",
        sindico_telefone: edificio.sindico_telefone ?? "",
        sindico_email: edificio.sindico_email ?? "",
        sindico_celular: edificio.sindico_celular ?? "",
        porteiro1_nome: edificio.porteiro1_nome ?? "",
        porteiro1_telefone: edificio.porteiro1_telefone ?? "",
        porteiro1_email: edificio.porteiro1_email ?? "",
        porteiro1_celular: edificio.porteiro1_celular ?? "",
        porteiro2_nome: edificio.porteiro2_nome ?? "",
        porteiro2_telefone: edificio.porteiro2_telefone ?? "",
        porteiro2_email: edificio.porteiro2_email ?? "",
        porteiro2_celular: edificio.porteiro2_celular ?? "",
        zelador_nome: edificio.zelador_nome ?? "",
        zelador_telefone: edificio.zelador_telefone ?? "",
        zelador_email: edificio.zelador_email ?? "",
        zelador_celular: edificio.zelador_celular ?? "",
        descricao: edificio.descricao ?? "",
      });
    }
  }, [edificio, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Clean empty strings to null for optional fields
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(values)) {
        cleaned[key] = val === "" || val === undefined ? null : val;
      }
      // nome is required, keep as string
      cleaned.nome = values.nome;

      const payload = {
        ...cleaned,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from("mt_buildings" as any)
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("mt_buildings" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["mt-edificios"] });
      toast.success(isEditing ? "Edifício atualizado" : "Edifício criado");
      navigate(`/edificios/${data.id}`);
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

  const ContactFields = ({
    prefix,
    label,
  }: {
    prefix: "sindico" | "porteiro1" | "porteiro2" | "zelador";
    label: string;
  }) => (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground">{label}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}_nome` as keyof FormValues}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}_telefone` as keyof FormValues}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}_celular` as keyof FormValues}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Celular</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}_email` as keyof FormValues}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Edifício" : "Novo Edifício"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          {/* Dados do Edifício */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Dados do Edifício
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="construtora_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Construtora</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {construtoras?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ano_construcao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano de Construção</FormLabel>
                    <FormControl><Input type="number" min={1900} max={2100} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_unidades" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Unidades</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_andares" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Andares</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_condominio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Condomínio (R$)</FormLabel>
                    <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
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

          {/* Contatos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Contatos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ContactFields prefix="sindico" label="Síndico" />
              <ContactFields prefix="porteiro1" label="Porteiro 1" />
              <ContactFields prefix="porteiro2" label="Porteiro 2" />
              <ContactFields prefix="zelador" label="Zelador" />
            </CardContent>
          </Card>

          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea rows={5} placeholder="Descrição do edifício..." {...field} value={field.value ?? ""} /></FormControl>
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
