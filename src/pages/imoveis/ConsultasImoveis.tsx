import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "respondido", label: "Respondido" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "finalizado", label: "Finalizado" },
];

export default function ConsultasImoveis() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-imovel-consultas-list", tenant?.id, statusFilter],
    queryFn: async () => {
      let q = supabase.from("mt_property_inquiries" as any).select("*").order("created_at", { ascending: false });
      if (tenant && accessLevel !== "platform") q = q.eq("tenant_id", tenant.id);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const filtered = items.filter((i: any) => i.nome?.toLowerCase().includes(search.toLowerCase()) || i.email?.toLowerCase().includes(search.toLowerCase()) || i.telefone?.includes(search));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Consultas de Imoveis</h1><p className="text-muted-foreground">Consultas e contatos recebidos</p></div>
      <div className="flex gap-3 items-end">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Mensagem</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma consulta encontrada.</TableCell></TableRow>
          ) : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/consultas/${i.id}`)}>
              <TableCell className="font-medium"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" />{i.nome || "-"}</div></TableCell>
              <TableCell>{i.email || "-"}</TableCell><TableCell>{i.telefone || "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate">{i.mensagem || "-"}</TableCell>
              <TableCell><Badge variant={i.status === "novo" ? "default" : i.status === "respondido" ? "secondary" : "outline"}>{i.status || "novo"}</Badge></TableCell>
              <TableCell className="text-xs">{i.created_at ? format(new Date(i.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}
