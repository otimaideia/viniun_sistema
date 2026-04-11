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
import { Plus, Search, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "pendente_assinatura", label: "Pendente Assinatura" },
  { value: "assinado", label: "Assinados" },
  { value: "em_execucao", label: "Em Execucao" },
  { value: "finalizado", label: "Finalizados" },
];

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  pendente_assinatura: "bg-yellow-100 text-yellow-800",
  assinado: "bg-blue-100 text-blue-800",
  em_execucao: "bg-green-100 text-green-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
  suspenso: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pendente_assinatura: "Pendente Assinatura",
  assinado: "Assinado",
  em_execucao: "Em Execucao",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
};

const TIPO_LABELS: Record<string, string> = {
  venda: "Venda",
  locacao: "Locacao",
  permuta: "Permuta",
  cessao: "Cessao",
  compromisso: "Compromisso",
  outro: "Outro",
};

const TIPO_COLORS: Record<string, string> = {
  venda: "bg-purple-100 text-purple-800",
  locacao: "bg-blue-100 text-blue-800",
  permuta: "bg-amber-100 text-amber-800",
  cessao: "bg-teal-100 text-teal-800",
  compromisso: "bg-indigo-100 text-indigo-800",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ContratosImoveis() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt-contratos-imoveis", tenant?.id, franchise?.id, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("mt_property_contracts" as any)
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
          <h1 className="text-2xl font-bold">Contratos de Imoveis</h1>
          <p className="text-muted-foreground">Gerencie contratos de venda, locacao e outros</p>
        </div>
        <Button asChild>
          <Link to="/imoveis/contratos/novo">
            <Plus className="h-4 w-4 mr-2" /> Novo Contrato
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
        <TabsList className="flex-wrap">
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Imovel</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inicio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhum contrato encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/imoveis/contratos/${item.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{item.numero || "-"}</TableCell>
                      <TableCell>
                        <Badge className={TIPO_COLORS[item.tipo] || "bg-gray-100"}>
                          {TIPO_LABELS[item.tipo] || item.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate font-medium">{item.property?.titulo || "-"}</div>
                      </TableCell>
                      <TableCell>{item.lead?.nome || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.valor_contrato)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[item.status] || "bg-gray-100"}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.data_inicio ? format(new Date(item.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : "-"}
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
