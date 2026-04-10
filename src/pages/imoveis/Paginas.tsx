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
import { Plus, Search, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Paginas() {
  const navigate = useNavigate(); const { tenant, accessLevel } = useTenantContext(); const qc = useQueryClient();
  const [search, setSearch] = useState(""); const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-paginas", tenant?.id], queryFn: async () => { let q = supabase.from("mt_property_pages" as any).select("*").is("deleted_at", null).order("titulo"); if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id); const { data, error } = await q; if (error) throw error; return data || []; }, enabled: !!tenant || accessLevel === "platform",
  });
  const deleteMut = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("mt_property_pages" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-paginas"] }); toast.success("Removida"); setDeleteId(null); } });
  const filtered = items.filter((i: any) => i.titulo?.toLowerCase().includes(search.toLowerCase()) || i.slug?.includes(search.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Paginas</h1><p className="text-muted-foreground">Paginas do site imobiliario</p></div>
        <Button asChild><Link to="/imoveis/conteudo/paginas/novo"><Plus className="h-4 w-4 mr-2" /> Nova Pagina</Link></Button></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Titulo</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]">Acoes</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma pagina encontrada.</TableCell></TableRow>
          ) : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/conteudo/paginas/${i.id}/editar`)}>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{i.titulo}</div></TableCell>
              <TableCell className="font-mono text-xs">{i.slug || "-"}</TableCell>
              <TableCell><Badge variant={i.publicado ? "default" : "secondary"}>{i.publicado ? "Publicada" : "Rascunho"}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover esta pagina?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
