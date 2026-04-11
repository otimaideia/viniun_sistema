import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PropostaStatus } from "@/types/proposta-imovel-mt";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviadas" },
  { value: "aceita", label: "Aceitas" },
  { value: "rejeitada", label: "Rejeitadas" },
  { value: "expirada", label: "Expiradas" },
];

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800 border-gray-300",
  enviada: "bg-blue-100 text-blue-800 border-blue-300",
  visualizada: "bg-cyan-100 text-cyan-800 border-cyan-300",
  aceita: "bg-green-100 text-green-800 border-green-300",
  rejeitada: "bg-red-100 text-red-800 border-red-300",
  contraproposta: "bg-amber-100 text-amber-800 border-amber-300",
  contrapropostada: "bg-amber-100 text-amber-800 border-amber-300",
  expirada: "bg-orange-100 text-orange-800 border-orange-300",
  cancelada: "bg-gray-100 text-gray-600 border-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  aceita: "Aceita",
  rejeitada: "Rejeitada",
  contraproposta: "Contraproposta",
  contrapropostada: "Contraproposta",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function PropostasImoveis() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-propostas-imoveis", tenant?.id, franchise?.id, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("mt_property_proposals" as any)
        .select("*, property:mt_properties!property_id(id, titulo, ref_code), lead:mt_leads!lead_id(id, nome, email)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (accessLevel === "tenant" && tenant) q = q.eq("tenant_id", tenant.id);
      else if (accessLevel === "franchise" && franchise) q = q.eq("franchise_id", franchise.id);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const filtered = items.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.numero?.toLowerCase().includes(s) ||
      i.property?.titulo?.toLowerCase().includes(s) ||
      i.lead?.nome?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas de Imoveis</h1>
          <p className="text-muted-foreground">Gerencie propostas comerciais para imoveis</p>
        </div>
        <Button asChild>
          <Link to="/imoveis/propostas/novo">
            <Plus className="h-4 w-4 mr-2" /> Nova Proposta
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por numero, imovel ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Imovel</TableHead>
                  <TableHead>Cliente/Lead</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma proposta encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/imoveis/propostas/${item.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{item.numero || "-"}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate font-medium">{item.property?.titulo || "-"}</div>
                        {item.property?.ref_code && (
                          <span className="text-xs text-muted-foreground">Ref: {item.property.ref_code}</span>
                        )}
                      </TableCell>
                      <TableCell>{item.lead?.nome || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.valor_proposta)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[item.status] || "bg-gray-100"}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.validade_ate ? format(new Date(item.validade_ate), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
