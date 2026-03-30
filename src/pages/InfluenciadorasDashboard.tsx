import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Users,
  TrendingUp,
  Share2,
  Instagram,
  Crown,
  Ban,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatSeguidores } from "@/types/influenciadora";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

const InfluenciadorasDashboard = () => {
  const {
    influenciadoras,
    kpis,
    ranking,
    isLoading,
    handleStatusChange,
  } = useInfluenciadorasAdapter();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Influenciadoras</h1>
            <p className="text-sm text-muted-foreground">
              {kpis?.total_influenciadoras || 0} cadastradas
            </p>
          </div>
          <Button asChild>
            <Link to="/influenciadoras/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Influenciadora
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 animate-fade-in">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.total_influenciadoras || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis?.influenciadoras_ativas || 0} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Indicações</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.total_indicacoes || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis?.indicacoes_convertidas || 0} convertidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis?.taxa_conversao || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa de conversão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alcance</CardTitle>
              <Instagram className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatSeguidores(kpis?.total_seguidores || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis?.engajamento_medio || 0}% engajamento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Top 10 */}
        <Card className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top 10 Influenciadoras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma influenciadora com indicações ainda
              </p>
            ) : (
              <div className="space-y-3">
                {ranking.map((item, index) => (
                  <div
                    key={item.influenciadora_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                            ? "bg-amber-600 text-white"
                            : "bg-muted-foreground/20 text-muted-foreground"
                        }`}
                      >
                        {item.posicao}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.foto_perfil} />
                        <AvatarFallback>
                          {safeGetInitials(item.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {item.nome_artistico || item.nome_completo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{item.codigo_indicacao}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{item.total_indicacoes}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.taxa_conversao}% conversão
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pendentes de Aprovação */}
        {kpis && kpis.influenciadoras_pendentes > 0 && (
          <Card
            className="border-yellow-500/50 animate-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Ban className="h-5 w-5" />
                Pendentes de Aprovação ({kpis.influenciadoras_pendentes})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {influenciadoras
                  .filter((inf) => inf.status === "pendente")
                  .slice(0, 5)
                  .map((inf) => (
                    <div
                      key={inf.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={inf.foto_perfil} />
                          <AvatarFallback>
                            {safeGetInitials(inf.nome_completo)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{inf.nome_completo}</p>
                          <p className="text-xs text-muted-foreground">
                            {inf.whatsapp}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-green-600 hover:text-green-700"
                          onClick={() => handleStatusChange(inf.id, "aprovado")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-600 hover:text-red-700"
                          onClick={() => handleStatusChange(inf.id, "rejeitado")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InfluenciadorasDashboard;
