import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyCard, MTProperty } from "@/components/imoveis/PropertyCard";
import { PropertyStatusBadge } from "@/components/imoveis/PropertyStatusBadge";
import { PropertyFilters, PropertyFiltersData } from "@/components/imoveis/PropertyFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FILTERS: PropertyFiltersData = {
  search: "", tipo: "all", finalidade: "all", cidade: "all", bairro: "all",
  dormitoriosMin: "", valorMin: "", valorMax: "",
  destaque: false, lancamento: false, financiamento: false,
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Imoveis() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [filters, setFilters] = useState<PropertyFiltersData>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: imoveis = [], isLoading } = useQuery({
    queryKey: ["mt-imoveis", tenant?.id, franchise?.id, filters, page],
    queryFn: async () => {
      let q = supabase
        .from("mt_properties" as any)
        .select("*, mt_property_types!property_type_id(id, nome), mt_property_purposes!purpose_id(id, nome), location_cidade:mt_locations!location_cidade_id(id, nome), location_bairro:mt_locations!location_bairro_id(id, nome)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (accessLevel === "tenant" && tenant) {
        q = q.eq("tenant_id", tenant.id);
      } else if (accessLevel === "franchise" && franchise) {
        q = q.eq("franchise_id", franchise.id);
      }

      if (filters.search) {
        q = q.or(`titulo.ilike.%${filters.search}%,ref_code.ilike.%${filters.search}%,endereco.ilike.%${filters.search}%`);
      }
      if (filters.tipo !== "all") q = q.eq("property_type_id", filters.tipo);
      if (filters.finalidade !== "all") q = q.eq("purpose_id", filters.finalidade);
      if (filters.destaque) q = q.eq("destaque", true);
      if (filters.lancamento) q = q.eq("lancamento", true);
      if (filters.financiamento) q = q.eq("aceita_financiamento", true);
      if (filters.dormitoriosMin) q = q.gte("dormitorios", parseInt(filters.dormitoriosMin));
      if (filters.valorMin) q = q.gte("valor_venda", parseFloat(filters.valorMin));
      if (filters.valorMax) q = q.lte("valor_venda", parseFloat(filters.valorMax));

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTProperty[];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["mt-imovel-tipos-filter", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_types" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return (data || []).map((t: any) => ({ value: t.id, label: t.nome }));
    },
    enabled: !!tenant,
  });

  const { data: finalidades = [] } = useQuery({
    queryKey: ["mt-imovel-finalidades-filter", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_purposes" as any)
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      return (data || []).map((f: any) => ({ value: f.id, label: f.nome }));
    },
    enabled: !!tenant,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de imóveis
            {tenant && <span> - {tenant.nome_fantasia}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button asChild>
            <Link to="/imoveis/novo">
              <Plus className="h-4 w-4 mr-2" /> Novo Imóvel
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PropertyFilters
            filters={filters}
            onFiltersChange={setFilters}
            tipos={tipos}
            finalidades={finalidades}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imoveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum imóvel encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  imoveis.map((imovel) => (
                    <TableRow
                      key={imovel.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/imoveis/${imovel.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{imovel.ref_code || "-"}</TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {imovel.titulo || "-"}
                      </TableCell>
                      <TableCell>{imovel.mt_property_types?.nome || "-"}</TableCell>
                      <TableCell>{imovel.mt_property_purposes?.nome || "-"}</TableCell>
                      <TableCell>{imovel.location_cidade?.nome || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(imovel.valor_venda || imovel.valor_locacao)}
                      </TableCell>
                      <TableCell>
                        <PropertyStatusBadge situacao={imovel.situacao} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {imoveis.map((imovel) => (
            <PropertyCard
              key={imovel.id}
              property={imovel}
              onClick={() => navigate(`/imoveis/${imovel.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {imoveis.length} imóveis
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={imoveis.length < pageSize}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
