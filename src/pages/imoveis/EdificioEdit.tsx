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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  construtora_nome: z.string().optional(),
  total_unidades: z.coerce.number().min(0).optional(),
  total_andares: z.coerce.number().min(0).optional(),
  total_torres: z.coerce.number().min(0).optional(),
  ano_entrega: z.coerce.number().min(1900).max(2100).optional(),
  descricao: z.string().optional(),
  status: z.string().default("ativo"),
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
    defaultValues: { nome: "", status: "ativo" },
  });

  const { data: edificio, isLoading } = useQuery({
    queryKey: ["mt-edificio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mt_buildings" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (edificio) form.reset(edificio);
  }, [edificio, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, tenant_id: tenant?.id, franchise_id: franchise?.id, updated_at: new Date().toISOString() };
      if (isEditing) {
        const { data, error } = await supabase.from("mt_buildings" as any).update(payload).eq("id", id!).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("mt_buildings" as any).insert(payload).select().single();
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

  if (isEditing && isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{isEditing ? "Editar Edifício" : "Novo Edifício"}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Edifício</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="construtora_nome" render={({ field }) => (
                  <FormItem><FormLabel>Construtora</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endereco" render={({ field }) => (
                  <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bairro" render={({ field }) => (
                  <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cidade" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cep" render={({ field }) => (
                  <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="total_unidades" render={({ field }) => (
                  <FormItem><FormLabel>Total de Unidades</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="total_andares" render={({ field }) => (
                  <FormItem><FormLabel>Total de Andares</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="total_torres" render={({ field }) => (
                  <FormItem><FormLabel>Total de Torres</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ano_entrega" render={({ field }) => (
                  <FormItem><FormLabel>Ano de Entrega</FormLabel><FormControl><Input type="number" min="1900" max="2100" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
