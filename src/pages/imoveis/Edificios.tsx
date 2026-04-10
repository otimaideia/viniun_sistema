import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Trash2, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Edificios() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: edificios = [], isLoading } = useQuery({
    queryKey: ["mt-edificios", tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from("mt_buildings" as any)
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_buildings" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-edificios"] });
      toast.success("Edifício removido");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const filtered = edificios.filter((e: any) =>
    e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.endereco?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edifícios</h1>
          <p className="text-muted-foreground">Empreendimentos e condomínios</p>
        </div>
        <Button asChild>
          <Link to="/edificios/novo"><Plus className="h-4 w-4 mr-2" /> Novo Edifício</Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar edifícios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Construtora</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum edifício encontrado.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((e: any) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/edificios/${e.id}`)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {e.nome}
                      </div>
                    </TableCell>
                    <TableCell>{e.endereco || "-"}</TableCell>
                    <TableCell>{e.construtora_nome || "-"}</TableCell>
                    <TableCell>{e.total_unidades || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "ativo" ? "default" : "secondary"}>
                        {e.status || "ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este edifício?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
