import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useCampanhasAdapter } from "@/hooks/useCampanhasAdapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight,
  ExternalLink
} from "lucide-react";

const tipoIcons: Record<string, string> = {
  google_ads: "🔍",
  meta_ads: "📘",
  tiktok_ads: "🎵",
  linkedin_ads: "💼",
  organico: "🌱",
  indicacao: "🤝",
};

const FranquiaCampanhas = () => {
  const { profile } = useUserProfileAdapter();
  const { campanhas, isLoading } = useCampanhasAdapter(profile?.franqueado_id || undefined);

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const campanhasAtivas = campanhas.filter((c) => c.status === "ativa");
  const totalOrcamento = campanhasAtivas.reduce((acc, c) => acc + (c.orcamento_mensal || 0), 0);
  const totalLeads = campanhas.reduce((acc, c) => acc + (c.total_leads || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-600">Ativa</Badge>;
      case "pausada":
        return <Badge variant="secondary">Pausada</Badge>;
      case "finalizada":
        return <Badge variant="outline">Finalizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">
            Campanhas de marketing da sua unidade
          </p>
        </div>
        <Button asChild>
          <Link to="/campanhas">
            Ver Todas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{campanhas.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{campanhasAtivas.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{totalLeads}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold">
                R$ {totalOrcamento.toLocaleString("pt-BR")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Ativas</CardTitle>
          <CardDescription>
            Campanhas de marketing em execução
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : campanhas.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                Nenhuma campanha cadastrada
              </p>
              <Button variant="outline" asChild>
                <Link to="/campanhas/novo">
                  Criar Campanha
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campanhas.slice(0, 5).map((campanha) => {
                const cpl = campanha.total_leads && campanha.orcamento_mensal
                  ? (campanha.orcamento_mensal / campanha.total_leads).toFixed(2)
                  : null;

                return (
                  <Link
                    key={campanha.id}
                    to={`/campanhas/${campanha.id}`}
                    className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {tipoIcons[campanha.tipo] || "📣"}
                        </span>
                        <div>
                          <p className="font-medium">{campanha.nome}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {campanha.tipo.replace("_", " ")}
                            </Badge>
                            {cpl && (
                              <Badge variant="secondary" className="text-xs">
                                CPL: R$ {cpl}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {getStatusBadge(campanha.status)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {campanha.total_leads || 0} leads
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link para mais */}
      {campanhas.length > 5 && (
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/campanhas">
              Ver todas as {campanhas.length} campanhas
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default FranquiaCampanhas;
