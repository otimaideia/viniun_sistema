import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  TrendingUp,
  Target,
  Plus,
  BarChart3,
  FileText,
  ImageIcon,
  Palette,
  Users,
} from "lucide-react";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";
import { CampaignAlerts } from "./CampaignAlerts";

export function MarketingDashboard() {
  const navigate = useNavigate();

  const { templates, isLoading: loadingTemplates } = useMarketingTemplatesAdapter();
  const { campanhas, stats: campanhaStats, isLoading: loadingCampanhas } = useMarketingCampanhasAdapter();
  const { assets, stats: assetStats, isLoading: loadingAssets } = useMarketingAssetsAdapter();

  const isLoading = loadingTemplates || loadingCampanhas || loadingAssets;

  const activeTemplates = templates.filter((t) => t.ativo).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativa":
        return "bg-green-500";
      case "pausada":
        return "bg-yellow-500";
      case "finalizada":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ativa":
        return "Ativa";
      case "pausada":
        return "Pausada";
      case "finalizada":
        return "Finalizada";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral das suas campanhas e estrategias de marketing
          </p>
        </div>
        <Button onClick={() => navigate("/marketing/campanhas")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Cards de estatisticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campanhas Ativas</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "..." : campanhaStats.ativas}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget Total</p>
                <p className="text-3xl font-bold">
                  {isLoading
                    ? "..."
                    : campanhaStats.totalBudget.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Templates Ativos</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : activeTemplates}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assets Criados</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : assetStats.total}</p>
              </div>
              <ImageIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de métricas de performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "..." : campanhaStats.totalLeads}
                </p>
              </div>
              <Users className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversoes</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "..." : campanhaStats.totalConversoes}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Conversao</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "..." : `${campanhaStats.taxaConversao.toFixed(1)}%`}
                </p>
              </div>
              <Target className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campanhas Pausadas</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "..." : campanhaStats.pausadas}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de campanhas */}
      <CampaignAlerts onCampanhaClick={() => navigate("/marketing/campanhas")} />

      {/* Acoes rapidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/marketing/campanhas")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Campanhas</CardTitle>
                <CardDescription>Gerencie suas campanhas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crie e gerencie campanhas de marketing para suas franquias
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/marketing/templates")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Templates</CardTitle>
                <CardDescription>Modelos de mensagens</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Templates para WhatsApp, email e redes sociais
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/marketing/galeria")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Palette className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Galeria de Artes</CardTitle>
                <CardDescription>Artes graficas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie artes para suas campanhas
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate("/marketing/assets")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ImageIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Assets</CardTitle>
                <CardDescription>Galeria de materiais</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Imagens, videos e banners para suas campanhas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campanhas recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campanhas Recentes
          </CardTitle>
          <CardDescription>Ultimas campanhas criadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando campanhas...</p>
            </div>
          ) : campanhas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Nenhuma campanha criada ainda</p>
              <Button onClick={() => navigate("/marketing/campanhas")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campanhas.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/marketing/campanhas")}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(campaign.status)}`} />
                    <div>
                      <p className="font-medium">{campaign.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.tipo === "geral" ? "Geral" : "Unidade Especifica"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {campaign.budget_estimado
                        ? campaign.budget_estimado.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "N/A"}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
