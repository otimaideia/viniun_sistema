import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Trash2, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Noticias() {
  const navigate = useNavigate(); const { tenant, accessLevel } = useTenantContext(); const qc = useQueryClient();
  const [search, setSearch] = useState(""); const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-noticias", tenant?.id], queryFn: async () => { let q = supabase.from("mt_property_news" as any).select("*").is("deleted_at", null).order("created_at", { ascending: false }); if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id); const { data, error } = await q; if (error) throw error; return data || []; }, enabled: !!tenant || accessLevel === "platform",
  });
  const deleteMut = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("mt_property_news" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-noticias"] }); toast.success("Removida"); setDeleteId(null); } });
  const filtered = items.filter((i: any) => i.titulo?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Noticias</h1><p className="text-muted-foreground">Blog e noticias do site imobiliario</p></div>
        <Button asChild><Link to="/imoveis/conteudo/noticias/novo"><Plus className="h-4 w-4 mr-2" /> Nova Noticia</Link></Button></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Titulo</TableHead><TableHead>Autor</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead className="w-[80px]">Acoes</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma noticia encontrada.</TableCell></TableRow>
          ) : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/conteudo/noticias/${i.id}/editar`)}>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-muted-foreground" />{i.titulo}</div></TableCell>
              <TableCell>{i.autor || "-"}</TableCell>
              <TableCell><Badge variant={i.publicado ? "default" : "secondary"}>{i.publicado ? "Publicado" : "Rascunho"}</Badge></TableCell>
              <TableCell className="text-xs">{i.created_at ? format(new Date(i.created_at), "dd/MM/yy", {locale:ptBR}) : "-"}</TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover esta noticia?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
