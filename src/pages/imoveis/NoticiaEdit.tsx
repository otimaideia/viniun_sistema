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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({ titulo: z.string().min(3), subtitulo: z.string().optional(), conteudo: z.string().optional(), autor: z.string().optional(), imagem_url: z.string().optional(), slug: z.string().optional(), meta_title: z.string().optional(), meta_description: z.string().optional(), publicado: z.boolean().default(false) });
type FV = z.infer<typeof schema>;

export default function NoticiaEdit() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { tenant, franchise } = useTenantContext(); const qc = useQueryClient(); const isEditing = !!id;
  const form = useForm<FV>({ resolver: zodResolver(schema), defaultValues: { titulo: "", publicado: false } });
  const { data: item, isLoading } = useQuery({ queryKey: ["mt-noticia", id], queryFn: async () => { const { data, error } = await supabase.from("mt_property_news" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: isEditing });
  useEffect(() => { if (item) form.reset(item); }, [item, form]);
  const saveMut = useMutation({
    mutationFn: async (v: FV) => { const p = { ...v, tenant_id: tenant?.id, franchise_id: franchise?.id, updated_at: new Date().toISOString() }; if (isEditing) { const { data, error } = await supabase.from("mt_property_news" as any).update(p).eq("id", id!).select().single(); if (error) throw error; return data; } const { data, error } = await supabase.from("mt_property_news" as any).insert(p).select().single(); if (error) throw error; return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-noticias"] }); toast.success(isEditing ? "Atualizada" : "Criada"); navigate("/imoveis/conteudo"); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });
  if (isEditing && isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button><h1 className="text-2xl font-bold">{isEditing ? "Editar Noticia" : "Nova Noticia"}</h1></div>
      <Form {...form}><form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-6">
        <Card><CardHeader><CardTitle className="text-base">Conteudo</CardTitle></CardHeader><CardContent className="space-y-4">
          <FormField control={form.control} name="titulo" render={({ field }) => (<FormItem><FormLabel>Titulo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="subtitulo" render={({ field }) => (<FormItem><FormLabel>Subtitulo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="autor" render={({ field }) => (<FormItem><FormLabel>Autor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="imagem_url" render={({ field }) => (<FormItem><FormLabel>URL da Imagem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="conteudo" render={({ field }) => (<FormItem><FormLabel>Conteudo</FormLabel><FormControl><Textarea rows={10} {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="slug" render={({ field }) => (<FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="publicado" render={({ field }) => (<FormItem className="flex items-center gap-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0">Publicado</FormLabel></FormItem>)} />
        </CardContent></Card>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button><Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{isEditing ? "Salvar" : "Criar"}</Button></div>
      </form></Form>
    </div>
  );
}
