import { useState } from "react";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Users,
  TrendingUp,
  Target,
  ArrowRight
} from "lucide-react";

const FranquiaFunil = () => {
  const { profile } = useUserProfileAdapter();
  const [selectedFunil, setSelectedFunil] = useState<string>("default");

  const { data, isLoading } = useQuery({
    queryKey: ["franquia-funil", profile?.franchise_id],
    queryFn: async () => {
      if (!profile?.franchise_id) return null;

      const { data: leads } = await supabase
        .from("mt_leads")
        .select("id, nome, telefone, status")
        .eq("franchise_id", profile.franchise_id)
        .order("created_at", { ascending: false });

      const allLeads = leads || [];

      const stats = {
        total: allLeads.length,
        novos: allLeads.filter((l) => !l.status || l.status === "novo").length,
        em_contato: allLeads.filter((l) => l.status === "em_contato").length,
        agendados: allLeads.filter((l) => l.status === "agendado").length,
        convertidos: allLeads.filter((l) => l.status === "convertido" || l.status === "ganho").length,
        perdidos: allLeads.filter((l) => l.status === "perdido").length,
      };

      const leadsByStatus: Record<string, typeof allLeads> = {
        novo: allLeads.filter((l) => !l.status || l.status === "novo"),
        em_contato: allLeads.filter((l) => l.status === "em_contato"),
        agendado: allLeads.filter((l) => l.status === "agendado"),
        convertido: allLeads.filter((l) => l.status === "convertido" || l.status === "ganho"),
        perdido: allLeads.filter((l) => l.status === "perdido"),
      };

      const byStatus: Record<string, number> = {
        novo: stats.novos,
        em_contato: stats.em_contato,
        agendado: stats.agendados,
        convertido: stats.convertidos,
        perdido: stats.perdidos,
      };

      return { stats, leadsByStatus, byStatus };
    },
    enabled: !!profile?.franchise_id,
  });

  const etapas = [
    { id: "novo", nome: "Novos", cor: "bg-blue-500" },
    { id: "em_contato", nome: "Em Contato", cor: "bg-amber-500" },
    { id: "agendado", nome: "Agendados", cor: "bg-purple-500" },
    { id: "convertido", nome: "Convertidos", cor: "bg-green-500" },
    { id: "perdido", nome: "Perdidos", cor: "bg-red-500" },
  ];

  if (!profile?.franchise_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const totalLeads = data?.stats?.total || 0;
  const taxaConversao = totalLeads > 0
    ? Math.round(((data?.stats?.convertidos || 0) / totalLeads) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <p className="text-muted-foreground">
            Visualize o progresso dos seus leads
          </p>
        </div>
        <Select value={selectedFunil} onValueChange={setSelectedFunil}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione o funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Funil Padrão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total no Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{data?.stats?.total || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{taxaConversao}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Etapas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{etapas.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Funis Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">1</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil Visual */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {etapas.map((etapa, index) => {
            const count = data?.byStatus?.[etapa.id] || 0;
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
            const width = Math.max(30, 100 - (index * 15));

            return (
              <div key={etapa.id} className="relative">
                <div
                  className={`${etapa.cor} rounded-lg p-4 text-white transition-all hover:opacity-90`}
                  style={{ width: `${width}%`, marginLeft: `${(100 - width) / 2}%` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{etapa.nome}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {count} leads
                      </Badge>
                    </div>
                    <span className="text-sm opacity-80">{percentage}%</span>
                  </div>
                </div>
                {index < etapas.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Kanban (Últimos 5 por Etapa)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {etapas.map((etapa) => (
                <div key={etapa.id} className="space-y-2">
                  <div className={`${etapa.cor} text-white text-center py-2 rounded-t-lg font-medium`}>
                    {etapa.nome}
                  </div>
                  <div className="border rounded-b-lg p-2 min-h-[120px] bg-muted/20">
                    {data?.leadsByStatus?.[etapa.id]?.slice(0, 5).map((lead: Record<string, unknown>) => (
                      <div
                        key={lead.id}
                        className="bg-background rounded p-2 mb-2 text-sm border hover:shadow-sm transition-shadow"
                      >
                        <p className="font-medium truncate">{lead.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.telefone}</p>
                      </div>
                    )) || (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhum lead
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaFunil;
