import { useState } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Globe, RefreshCw, Loader2, FileDown } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortaisImoveis() {
  const { tenant } = useTenantContext();
  const qc = useQueryClient();

  const { data: portais = [], isLoading } = useQuery({
    queryKey: ["mt-portais-imoveis", tenant?.id],
    queryFn: async () => { const { data, error } = await supabase.from("mt_property_portals" as any).select("*").eq("tenant_id", tenant!.id).is("deleted_at", null).order("nome"); if (error) throw error; return data || []; },
    enabled: !!tenant,
  });

  const { data: fila = [] } = useQuery({
    queryKey: ["mt-portais-fila", tenant?.id],
    queryFn: async () => { const { data } = await supabase.from("mt_property_portal_queue" as any).select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false }).limit(20); return data || []; },
    enabled: !!tenant,
  });

  const togglePortal = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { const { error } = await supabase.from("mt_property_portals" as any).update({ is_active, updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-portais-imoveis"] }); toast.success("Portal atualizado"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Portais Imobiliários</h1><p className="text-muted-foreground">Integração com portais de anúncios (ZAP, OLX, VivaReal, etc.)</p></div>
        <Button asChild><Link to="/imoveis/portais/exportar"><FileDown className="h-4 w-4 mr-2" />Exportar XML</Link></Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portais.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /><CardTitle className="text-base">{p.nome}</CardTitle></div>
                <Switch checked={p.is_active} onCheckedChange={(c) => togglePortal.mutate({ id: p.id, is_active: c })} />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{p.url || "URL nao configurada"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                  {p.last_sync && <span className="text-xs text-muted-foreground">Sync: {format(new Date(p.last_sync), "dd/MM HH:mm", {locale:ptBR})}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {portais.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum portal configurado.</p>}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Fila de Publicacao</CardTitle><CardDescription>Ultimas publicacoes nos portais</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Imovel</TableHead><TableHead>Portal</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
            <TableBody>{fila.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum item na fila.</TableCell></TableRow>
            ) : fila.map((f: any) => (
              <TableRow key={f.id}><TableCell>{f.imovel_titulo || f.imovel_id}</TableCell><TableCell>{f.portal_nome || "-"}</TableCell>
              <TableCell><Badge variant={f.status === "publicado" ? "default" : f.status === "erro" ? "destructive" : "secondary"}>{f.status}</Badge></TableCell>
              <TableCell className="text-xs">{f.created_at ? format(new Date(f.created_at), "dd/MM HH:mm", {locale:ptBR}) : "-"}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
