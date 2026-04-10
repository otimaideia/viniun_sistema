import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, User, Briefcase, X } from "lucide-react";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO"
];

const ESPECIALIDADES_OPTIONS = [
  "Residencial", "Comercial", "Industrial", "Rural", "Terrenos",
  "Lançamentos", "Alto Padrão", "Popular", "Locação", "Temporada",
];

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  foto_url: z.string().url("URL inválida").optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  creci: z.string().optional().or(z.literal("")),
  creci_estado: z.string().optional().or(z.literal("")),
  creci_validade: z.string().optional().or(z.literal("")),
  comissao_percentual: z.coerce.number().min(0).max(100).optional().or(z.literal("" as any)),
  observacao: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function CorretorEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [espInput, setEspInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      celular: "",
      foto_url: "",
      data_nascimento: "",
      creci: "",
      creci_estado: "",
      creci_validade: "",
      comissao_percentual: "" as any,
      observacao: "",
    },
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-corretor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_corretores" as any)
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
        celular: item.celular ?? "",
        foto_url: item.foto_url ?? "",
        data_nascimento: item.data_nascimento ? item.data_nascimento.split("T")[0] : "",
        creci: item.creci ?? "",
        creci_estado: item.creci_estado ?? "",
        creci_validade: item.creci_validade ? item.creci_validade.split("T")[0] : "",
        comissao_percentual: item.comissao_percentual ?? ("" as any),
        observacao: item.observacao ?? "",
      });
      setEspecialidades(item.especialidades ?? []);
    }
  }, [item, form]);

  const addEspecialidade = (esp: string) => {
    const trimmed = esp.trim();
    if (trimmed && !especialidades.includes(trimmed)) {
      setEspecialidades((prev) => [...prev, trimmed]);
    }
    setEspInput("");
  };

  const removeEspecialidade = (esp: string) => {
    setEspecialidades((prev) => prev.filter((e) => e !== esp));
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(values)) {
        cleaned[key] = val === "" || val === undefined ? null : val;
      }
      cleaned.nome = values.nome;
      cleaned.especialidades = especialidades;

      const payload = {
        ...cleaned,
        tenant_id: tenant?.id,
        franchise_id: franchise?.id,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from("mt_corretores" as any)
          .update(payload)
          .eq("id", id!)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("mt_corretores" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["mt-corretores"] });
      toast.success(isEditing ? "Corretor atualizado" : "Corretor criado");
      navigate(`/corretores/${data.id}`);
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
          {isEditing ? "Editar Corretor" : "Novo Corretor"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Dados Pessoais
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
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
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
                <FormField control={form.control} name="data_nascimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="foto_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Foto</FormLabel>
                    <FormControl><Input type="url" placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* CRECI e Profissional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Dados Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="creci" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CRECI</FormLabel>
                    <FormControl><Input placeholder="Ex: 123456" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="creci_estado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CRECI Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Selecione</SelectItem>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="creci_validade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade CRECI</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="comissao_percentual" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} step={0.1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Especialidades (tags) */}
              <div className="space-y-2">
                <FormLabel>Especialidades</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {especialidades.map((esp) => (
                    <Badge key={esp} variant="secondary" className="gap-1">
                      {esp}
                      <button
                        type="button"
                        onClick={() => removeEspecialidade(esp)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(val) => {
                      if (val) addEspecialidade(val);
                    }}
                    value=""
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Adicionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES_OPTIONS.filter((e) => !especialidades.includes(e)).map((esp) => (
                        <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ou digite uma nova..."
                      value={espInput}
                      onChange={(e) => setEspInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEspecialidade(espInput);
                        }
                      }}
                      className="w-[200px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addEspecialidade(espInput)}
                      disabled={!espInput.trim()}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="observacao" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea rows={4} placeholder="Observações sobre o corretor..." {...field} value={field.value ?? ""} /></FormControl>
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
