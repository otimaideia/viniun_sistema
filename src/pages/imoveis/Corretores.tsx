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
import { Plus, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function Corretores() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-corretores", tenant?.id],
    queryFn: async () => {
      let q = supabase.from("mt_corretores" as any).select("*").is("deleted_at", null).order("nome");
      if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("mt_corretores" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mt-corretores"] }); toast.success("Corretor removido"); setDeleteId(null); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const filtered = items.filter((i: any) => i.nome?.toLowerCase().includes(search.toLowerCase()) || i.creci?.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Corretores</h1><p className="text-muted-foreground">Equipe de corretores de imoveis</p></div>
        <Button asChild><Link to="/corretores/novo"><Plus className="h-4 w-4 mr-2" /> Novo Corretor</Link></Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CRECI</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Imoveis</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]">Acoes</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum corretor encontrado.</TableCell></TableRow>
          ) : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/corretores/${i.id}`)}>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground" />{i.nome}</div></TableCell>
              <TableCell className="font-mono text-xs">{i.creci || "-"}</TableCell><TableCell>{i.email || "-"}</TableCell><TableCell>{i.telefone || "-"}</TableCell>
              <TableCell><Badge variant="secondary">{i.total_imoveis || 0}</Badge></TableCell>
              <TableCell><Badge variant={i.is_active !== false ? "default" : "secondary"}>{i.is_active !== false ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover este corretor?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
