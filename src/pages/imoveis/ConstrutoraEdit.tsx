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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(2, "Minimo 2 caracteres"),
  razao_social: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  website: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  descricao: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ConstrutoraEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nome: "" } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-construtora", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mt_construtoras" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  useEffect(() => { if (item) form.reset(item); }, [item, form]);

  const saveMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, tenant_id: tenant?.id, franchise_id: franchise?.id, updated_at: new Date().toISOString() };
      if (isEditing) {
        const { data, error } = await supabase.from("mt_construtoras" as any).update(payload).eq("id", id!).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await supabase.from("mt_construtoras" as any).insert(payload).select().single();
      if (error) throw error; return data;
    },
    onSuccess: (d: any) => { queryClient.invalidateQueries({ queryKey: ["mt-construtoras"] }); toast.success(isEditing ? "Atualizada" : "Criada"); navigate(`/construtoras/${d.id}`); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  if (isEditing && isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{isEditing ? "Editar Construtora" : "Nova Construtora"}</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Dados da Construtora</CardTitle></CardHeader>
            <CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="razao_social" render={({ field }) => (<FormItem><FormLabel>Razao Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cnpj" render={({ field }) => (<FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="estado" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descricao</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
          </CardContent></Card>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{isEditing ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
