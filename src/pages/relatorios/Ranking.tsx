import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Medal,
  Users,
  TrendingUp,
  Building2,
  Crown
} from "lucide-react";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

interface FranquiaRanking {
  id: string;
  nome_fantasia: string;
  cidade: string | null;
  estado: string | null;
  leads_total: number;
  leads_convertidos: number;
  taxa_conversao: number;
}

const Ranking = () => {
  const [periodo, setPeriodo] = useState<"semana" | "mes">("mes");
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["ranking-franquias", periodo, tenant?.id, franchise?.id, accessLevel],
    queryFn: async (): Promise<FranquiaRanking[]> => {
      const hoje = new Date();
      let dataInicio: Date;
      let dataFim: Date;

      if (periodo === "semana") {
        dataInicio = startOfWeek(hoje, { weekStartsOn: 1 });
        dataFim = endOfWeek(hoje, { weekStartsOn: 1 });
      } else {
        dataInicio = startOfMonth(hoje);
        dataFim = endOfMonth(hoje);
      }

      // Buscar franqueados com filtro por tenant/franchise
      let franchisesQuery = supabase
        .from("mt_franchises")
        .select("id, nome_fantasia, cidade, estado")
        .eq("status", "Concluído");

      if (accessLevel === 'tenant' && tenant) {
        franchisesQuery = franchisesQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        franchisesQuery = franchisesQuery.eq('id', franchise.id);
      }

      const { data: franqueados } = await franchisesQuery;

      if (!franqueados) return [];

      // Buscar leads do período com filtro por tenant/franchise
      let leadsQuery = supabase
        .from("mt_leads")
        .select("franqueado_id, status")
        .gte("created_at", dataInicio.toISOString())
        .lte("created_at", dataFim.toISOString());

      if (accessLevel === 'tenant' && tenant) {
        leadsQuery = leadsQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        leadsQuery = leadsQuery.eq('franchise_id', franchise.id);
      }

      const { data: leads } = await leadsQuery;

      // Calcular ranking
      const rankingMap = new Map<string, { total: number; convertidos: number }>();

      leads?.forEach((lead) => {
        if (lead.franqueado_id) {
          const current = rankingMap.get(lead.franqueado_id) || { total: 0, convertidos: 0 };
          current.total++;
          if (lead.status === "convertido" || lead.status === "ganho") {
            current.convertidos++;
          }
          rankingMap.set(lead.franqueado_id, current);
        }
      });

      return franqueados
        .map((f) => {
          const stats = rankingMap.get(f.id) || { total: 0, convertidos: 0 };
          return {
            id: f.id,
            nome_fantasia: f.nome_fantasia,
            cidade: f.cidade,
            estado: f.estado,
            leads_total: stats.total,
            leads_convertidos: stats.convertidos,
            taxa_conversao: stats.total > 0 ? Math.round((stats.convertidos / stats.total) * 100) : 0,
          };
        })
        .filter((f) => f.leads_total > 0)
        .sort((a, b) => b.leads_total - a.leads_total);
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const stats = {
    total_leads: ranking?.reduce((acc, f) => acc + f.leads_total, 0) || 0,
    total_convertidos: ranking?.reduce((acc, f) => acc + f.leads_convertidos, 0) || 0,
    franquias_ativas: ranking?.length || 0,
    taxa_media: ranking?.length
      ? Math.round(ranking.reduce((acc, f) => acc + f.taxa_conversao, 0) / ranking.length)
      : 0,
  };

  const top3 = ranking?.slice(0, 3) || [];

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getPodiumBg = (position: number) => {
    switch (position) {
      case 0:
        return "bg-gradient-to-br from-yellow-100 to-yellow-50 border-yellow-300";
      case 1:
        return "bg-gradient-to-br from-gray-100 to-gray-50 border-gray-300";
      case 2:
        return "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-300";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ranking de Franquias</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das unidades
          </p>
        </div>
        <Select value={periodo} onValueChange={(v: "semana" | "mes") => setPeriodo(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total_leads}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.total_convertidos}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{stats.taxa_media}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Franquias Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.franquias_ativas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pódio */}
      {!isLoading && top3.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top 3 do {periodo === "semana" ? "Semana" : "Mês"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-end gap-4">
              {/* 2º Lugar */}
              <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${getPodiumBg(1)} w-32`}>
                <Medal className={`h-8 w-8 ${getMedalColor(1)} mb-2`} />
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="text-lg bg-gray-200">
                    {safeGetInitials(top3[1]?.nome_fantasia || "")}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm text-center line-clamp-2">{top3[1]?.nome_fantasia}</p>
                <p className="text-xs text-muted-foreground">{top3[1]?.leads_total} leads</p>
                <Badge variant="secondary" className="mt-1">{top3[1]?.taxa_conversao}%</Badge>
              </div>

              {/* 1º Lugar */}
              <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${getPodiumBg(0)} w-36 -mt-4`}>
                <Trophy className={`h-10 w-10 ${getMedalColor(0)} mb-2`} />
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarFallback className="text-xl bg-yellow-200">
                    {safeGetInitials(top3[0]?.nome_fantasia || "")}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-center line-clamp-2">{top3[0]?.nome_fantasia}</p>
                <p className="text-sm text-muted-foreground">{top3[0]?.leads_total} leads</p>
                <Badge className="mt-1 bg-yellow-500">{top3[0]?.taxa_conversao}%</Badge>
              </div>

              {/* 3º Lugar */}
              <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${getPodiumBg(2)} w-32`}>
                <Medal className={`h-8 w-8 ${getMedalColor(2)} mb-2`} />
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="text-lg bg-amber-200">
                    {safeGetInitials(top3[2]?.nome_fantasia || "")}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm text-center line-clamp-2">{top3[2]?.nome_fantasia}</p>
                <p className="text-xs text-muted-foreground">{top3[2]?.leads_total} leads</p>
                <Badge variant="secondary" className="mt-1">{top3[2]?.taxa_conversao}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Completa */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : ranking?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado disponível para o período selecionado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Franquia</TableHead>
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Convertidos</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking?.map((f, index) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index < 3 ? (
                          <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                        ) : (
                          <span className="text-muted-foreground w-5 text-center">{index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {safeGetInitials(f.nome_fantasia)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{f.nome_fantasia}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {f.cidade ? `${f.cidade}/${f.estado}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{f.leads_total}</TableCell>
                    <TableCell className="text-right">{f.leads_convertidos}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={f.taxa_conversao >= 30 ? "default" : f.taxa_conversao >= 15 ? "secondary" : "outline"}
                        className={f.taxa_conversao >= 30 ? "bg-green-600" : ""}
                      >
                        {f.taxa_conversao}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Ranking;
