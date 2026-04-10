import { Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyMetrics } from "@/components/imoveis/PropertyMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, UserCheck, MessageSquare, FileText,
  ArrowRight, TrendingUp, Home, Settings,
} from "lucide-react";

export default function ImoveisDashboard() {
  const { tenant, accessLevel } = useTenantContext();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["mt-imovel-metrics", tenant?.id],
    queryFn: async () => {
      const { data: all } = await supabase
        .from("mt_properties" as any)
        .select("id, situacao", { count: "exact" })
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null);

      const total = all?.length || 0;
      const disponiveis = all?.filter((i: any) => i.situacao === "disponivel").length || 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: consultas30d } = await supabase
        .from("mt_property_inquiries" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { count: visualizacoes30d } = await supabase
        .from("mt_property_views" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      return {
        total,
        disponiveis,
        consultas30d: consultas30d || 0,
        visualizacoes30d: visualizacoes30d || 0,
      };
    },
    enabled: !!tenant,
  });

  const { data: recentConsultas = [] } = useQuery({
    queryKey: ["mt-imovel-consultas-recent", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_inquiries" as any)
        .select("id, nome, email, telefone, mensagem, status, created_at, imovel_id")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant,
  });

  const { data: tipoStats = [] } = useQuery({
    queryKey: ["mt-imovel-tipo-stats", tenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_properties" as any)
        .select("tipo_nome")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null);

      const counts: Record<string, number> = {};
      (data || []).forEach((i: any) => {
        const tipo = i.tipo_nome || "Sem tipo";
        counts[tipo] = (counts[tipo] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
    enabled: !!tenant,
  });

  const quickLinks = [
    { label: "Imóveis", icon: Home, href: "/imoveis", description: "Catálogo completo" },
    { label: "Consultas", icon: MessageSquare, href: "/imoveis/consultas", description: "Consultas recebidas" },
    { label: "Corretores", icon: UserCheck, href: "/corretores", description: "Equipe de corretores" },
    { label: "Proprietários", icon: Users, href: "/proprietarios", description: "Donos dos imóveis" },
    { label: "Edifícios", icon: Building2, href: "/edificios", description: "Empreendimentos" },
    { label: "Relatórios", icon: TrendingUp, href: "/imoveis/relatorios", description: "Métricas e análises" },
    { label: "Configurações", icon: Settings, href: "/imoveis/configuracoes", description: "Tipos e finalidades" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Imobiliário</h1>
        <p className="text-muted-foreground">
          Visão geral do módulo imobiliário
          {tenant && ` - ${tenant.nome_fantasia}`}
        </p>
      </div>

      <PropertyMetrics
        metrics={metrics || { total: 0, disponiveis: 0, consultas30d: 0, visualizacoes30d: 0 }}
        isLoading={metricsLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Imóveis por tipo */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Imóveis por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {tipoStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              <div className="space-y-3">
                {tipoStats.map((stat: any) => (
                  <div key={stat.name} className="flex items-center justify-between">
                    <span className="text-sm">{stat.name}</span>
                    <Badge variant="secondary">{stat.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultas recentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Consultas Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/imoveis/consultas">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentConsultas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma consulta recente.</p>
            ) : (
              <div className="space-y-3">
                {recentConsultas.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.email} - {c.telefone}</p>
                    </div>
                    <Badge variant={c.status === "novo" ? "default" : "secondary"}>
                      {c.status || "novo"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Card key={link.href} className="hover:shadow-md transition-shadow">
            <Link to={link.href}>
              <CardContent className="pt-6 text-center space-y-2">
                <link.icon className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
