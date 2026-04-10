import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Pedidos() {
  const navigate = useNavigate(); const { tenant, accessLevel } = useTenantContext();
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-pedidos", tenant?.id],
    queryFn: async () => { let q = supabase.from("mt_property_orders" as any).select("*").order("created_at", { ascending: false }); if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id); const { data, error } = await q; if (error) throw error; return data || []; },
    enabled: !!tenant || accessLevel === "platform",
  });
  const filtered = items.filter((i: any) => i.numero?.includes(search) || i.cliente_nome?.toLowerCase().includes(search.toLowerCase()));
  const fmtCurrency = (v: number | null) => v ? new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(v) : "-";
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Pedidos</h1><p className="text-muted-foreground">Pedidos e reservas de imoveis</p></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por numero ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Numero</TableHead><TableHead>Cliente</TableHead><TableHead>Imovel</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
          ) : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/pedidos/${i.id}`)}>
              <TableCell className="font-mono text-xs"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-muted-foreground" />{i.numero || i.id.slice(0,8)}</div></TableCell>
              <TableCell className="font-medium">{i.cliente_nome || "-"}</TableCell>
              <TableCell>{i.imovel_titulo || "-"}</TableCell>
              <TableCell>{fmtCurrency(i.valor)}</TableCell>
              <TableCell><Badge variant={i.status === "aprovado" ? "default" : i.status === "pendente" ? "secondary" : i.status === "cancelado" ? "destructive" : "outline"}>{i.status || "pendente"}</Badge></TableCell>
              <TableCell className="text-xs">{i.created_at ? format(new Date(i.created_at), "dd/MM/yy HH:mm", {locale:ptBR}) : "-"}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}
