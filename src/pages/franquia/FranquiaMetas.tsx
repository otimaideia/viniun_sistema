import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useMetasAdapter } from "@/hooks/useMetasAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  Calendar
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { META_TIPOS, MetaStatus, getMetaTipoConfig, getMetaCategoria, formatMetaValor } from "@/types/meta";

const getStatusBadge = (status: MetaStatus) => {
  switch (status) {
    case "atingida":
      return <Badge className="bg-green-600">Atingida</Badge>;
    case "proxima":
      return <Badge className="bg-blue-600">Quase lá!</Badge>;
    case "expirada":
      return <Badge variant="destructive">Expirada</Badge>;
    default:
      return <Badge variant="secondary">Em Andamento</Badge>;
  }
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "leads":
      return <Users className="h-5 w-5" />;
    case "conversoes":
      return <TrendingUp className="h-5 w-5" />;
    case "receita":
      return <DollarSign className="h-5 w-5" />;
    case "agendamentos":
      return <Calendar className="h-5 w-5" />;
    default:
      return <Target className="h-5 w-5" />;
  }
};

const FranquiaMetas = () => {
  const { profile } = useUserProfileAdapter();
  const { metas, isLoading, stats } = useMetasAdapter(profile?.franqueado_id || undefined);

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Minhas Metas</h1>
        <p className="text-muted-foreground">
          Acompanhe o progresso das suas metas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atingidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.atingidas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{stats.em_andamento}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progresso Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.progresso_medio}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma meta definida para sua unidade
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metas.map((meta) => {
            const diasRestantes = differenceInDays(new Date(meta.data_fim), new Date());
            const tipoInfo = META_TIPOS.find((t) => t.value === meta.tipo);

            return (
              <Card key={meta.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getTipoIcon(meta.tipo)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{meta.titulo}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {tipoInfo?.label}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(meta.status || "em_andamento")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {meta.valor_atual.toLocaleString()} / {meta.valor_meta.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={meta.percentual || 0} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{meta.percentual || 0}%</span>
                      <span>
                        {diasRestantes < 0
                          ? `Expirou há ${Math.abs(diasRestantes)} dias`
                          : diasRestantes === 0
                            ? "Expira hoje"
                            : `${diasRestantes} dias restantes`}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>
                      {format(new Date(meta.data_inicio), "dd/MM/yy", { locale: ptBR })} - {format(new Date(meta.data_fim), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FranquiaMetas;
