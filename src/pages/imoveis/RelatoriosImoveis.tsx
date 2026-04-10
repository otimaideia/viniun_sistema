import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyMetrics } from "@/components/imoveis/PropertyMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

export default function RelatoriosImoveis() {
  const { tenant } = useTenantContext();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["mt-imovel-report-metrics", tenant?.id],
    queryFn: async () => {
      const { data: all } = await supabase.from("mt_properties" as any).select("id, situacao, valor_venda, valor_locacao, created_at, mt_property_types!property_type_id(nome), mt_property_purposes!purpose_id(nome)").eq("tenant_id", tenant!.id).is("deleted_at", null);
      const items = all || [];
      const total = items.length;
      const disponiveis = items.filter((i: any) => i.situacao === "disponivel").length;
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: consultas30d } = await supabase.from("mt_property_inquiries" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant!.id).gte("created_at", thirtyDaysAgo.toISOString());

      const tipoStats: Record<string, number> = {};
      const finalidadeStats: Record<string, number> = {};
      const situacaoStats: Record<string, number> = {};
      items.forEach((i: any) => {
        const tipoNome = i.mt_property_types?.nome || "Sem tipo";
        const finalidadeNome = i.mt_property_purposes?.nome || "Sem finalidade";
        tipoStats[tipoNome] = (tipoStats[tipoNome] || 0) + 1;
        finalidadeStats[finalidadeNome] = (finalidadeStats[finalidadeNome] || 0) + 1;
        situacaoStats[i.situacao || "disponivel"] = (situacaoStats[i.situacao || "disponivel"] || 0) + 1;
      });

      return { total, disponiveis, consultas30d: consultas30d || 0, visualizacoes30d: 0, tipoStats: Object.entries(tipoStats).sort((a,b)=>b[1]-a[1]), finalidadeStats: Object.entries(finalidadeStats).sort((a,b)=>b[1]-a[1]), situacaoStats: Object.entries(situacaoStats) };
    },
    enabled: !!tenant,
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Relatorios Imobiliarios</h1><p className="text-muted-foreground">Metricas e analises do modulo imobiliario</p></div>

      <PropertyMetrics metrics={metrics || { total: 0, disponiveis: 0, consultas30d: 0, visualizacoes30d: 0 }} isLoading={isLoading} />

      <Tabs defaultValue="tipo">
        <TabsList><TabsTrigger value="tipo">Por Tipo</TabsTrigger><TabsTrigger value="finalidade">Por Finalidade</TabsTrigger><TabsTrigger value="situacao">Por Situacao</TabsTrigger></TabsList>
        <TabsContent value="tipo">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="h-5 w-5" />Imoveis por Tipo</CardTitle></CardHeader><CardContent>
            {!metrics ? <Skeleton className="h-32 w-full" /> : metrics.tipoStats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
              <div className="space-y-3">{metrics.tipoStats.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between"><span className="text-sm">{name}</span><div className="flex items-center gap-2"><div className="h-2 bg-primary rounded" style={{width: `${Math.max(20, (count / metrics.total) * 200)}px`}} /><Badge variant="secondary">{count}</Badge></div></div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="finalidade">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" />Imoveis por Finalidade</CardTitle></CardHeader><CardContent>
            {!metrics ? <Skeleton className="h-32 w-full" /> : metrics.finalidadeStats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
              <div className="space-y-3">{metrics.finalidadeStats.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between"><span className="text-sm">{name}</span><Badge variant="secondary">{count}</Badge></div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="situacao">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" />Imoveis por Situacao</CardTitle></CardHeader><CardContent>
            {!metrics ? <Skeleton className="h-32 w-full" /> : metrics.situacaoStats.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
              <div className="space-y-3">{metrics.situacaoStats.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between capitalize"><span className="text-sm">{name}</span><Badge variant="secondary">{count}</Badge></div>
              ))}</div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
