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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({ nome: z.string().min(2), edificio_nome: z.string().optional(), vigencia_inicio: z.string().optional(), vigencia_fim: z.string().optional(), descricao: z.string().optional(), is_active: z.boolean().default(true) });
type FV = z.infer<typeof schema>;

export default function TabelaPrecoEdit() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { tenant, franchise } = useTenantContext(); const qc = useQueryClient(); const isEditing = !!id;
  const form = useForm<FV>({ resolver: zodResolver(schema), defaultValues: { nome: "", is_active: true } });
  const { data: item, isLoading } = useQuery({ queryKey: ["mt-tabela-preco", id], queryFn: async () => { const { data, error } = await supabase.from("mt_property_price_tables" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: isEditing });
  useEffect(() => { if (item) form.reset(item); }, [item, form]);
  const saveMut = useMutation({
    mutationFn: async (v: FV) => { const p = { ...v, tenant_id: tenant?.id, franchise_id: franchise?.id, updated_at: new Date().toISOString() }; if (isEditing) { const { data, error } = await supabase.from("mt_property_price_tables" as any).update(p).eq("id", id!).select().single(); if (error) throw error; return data; } const { data, error } = await supabase.from("mt_property_price_tables" as any).insert(p).select().single(); if (error) throw error; return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-tabelas-preco"] }); toast.success(isEditing ? "Atualizada" : "Criada"); navigate("/imoveis/tabelas-preco"); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });
  if (isEditing && isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button><h1 className="text-2xl font-bold">{isEditing ? "Editar Tabela" : "Nova Tabela de Preco"}</h1></div>
      <Form {...form}><form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-6">
        <Card><CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="edificio_nome" render={({ field }) => (<FormItem><FormLabel>Empreendimento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="vigencia_inicio" render={({ field }) => (<FormItem><FormLabel>Vigencia Inicio</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="vigencia_fim" render={({ field }) => (<FormItem><FormLabel>Vigencia Fim</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descricao</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="is_active" render={({ field }) => (<FormItem className="flex items-center gap-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Tabela Ativa</FormLabel></FormItem>)} />
        </CardContent></Card>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button><Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{isEditing ? "Salvar" : "Criar"}</Button></div>
      </form></Form>
    </div>
  );
}
