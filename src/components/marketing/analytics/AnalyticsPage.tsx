import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Target,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  Users,
  Percent,
} from "lucide-react";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import { useMarketingAssetsAdapter } from "@/hooks/useMarketingAssetsAdapter";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function AnalyticsPage() {
  const { templates, isLoading: loadingTemplates } = useMarketingTemplatesAdapter();
  const { campanhas, isLoading: loadingCampanhas } = useMarketingCampanhasAdapter();
  const { assets, isLoading: loadingAssets } = useMarketingAssetsAdapter();

  const isLoading = loadingTemplates || loadingCampanhas || loadingAssets;

  // Calculate stats
  const stats = useMemo(() => {
    const activeCampaigns = campanhas.filter((c) => c.status === "ativa").length;
    const pausedCampaigns = campanhas.filter((c) => c.status === "pausada").length;
    const finishedCampaigns = campanhas.filter((c) => c.status === "finalizada").length;

    const totalBudget = campanhas.reduce((sum, c) => sum + (c.budget_estimado || 0), 0);
    const totalBudgetReal = campanhas.reduce((sum, c) => sum + (c.budget_real || 0), 0);
    const activeBudget = campanhas
      .filter((c) => c.status === "ativa")
      .reduce((sum, c) => sum + (c.budget_estimado || 0), 0);

    const totalLeads = campanhas.reduce((sum, c) => sum + (c.leads_gerados || 0), 0);
    const totalConversoes = campanhas.reduce((sum, c) => sum + (c.conversoes || 0), 0);
    const totalReceita = campanhas.reduce((sum, c) => sum + (c.receita_gerada || 0), 0);

    const taxaConversao = totalLeads > 0 ? (totalConversoes / totalLeads) * 100 : 0;
    const cpl = totalLeads > 0 ? totalBudgetReal / totalLeads : 0;
    const cac = totalConversoes > 0 ? totalBudgetReal / totalConversoes : 0;
    const roi = totalBudgetReal > 0 ? ((totalReceita - totalBudgetReal) / totalBudgetReal) * 100 : 0;

    const activeTemplates = templates.filter((t) => t.ativo).length;

    return {
      campaigns: {
        total: campanhas.length,
        active: activeCampaigns,
        paused: pausedCampaigns,
        finished: finishedCampaigns,
      },
      budget: {
        total: totalBudget,
        real: totalBudgetReal,
        active: activeBudget,
      },
      leads: {
        total: totalLeads,
        conversoes: totalConversoes,
        taxaConversao,
      },
      roi: {
        cpl,
        cac,
        roi,
        receita: totalReceita,
      },
      templates: {
        total: templates.length,
        active: activeTemplates,
      },
      assets: {
        total: assets.length,
        active: assets.filter((a) => a.ativo).length,
      },
    };
  }, [campanhas, templates, assets]);

  // Performance por Canal
  const channelPerformance = useMemo(() => {
    const channels: Record<string, {
      campanhas: number;
      leads: number;
      conversoes: number;
      budget: number;
      receita: number;
    }> = {};

    campanhas.forEach((c) => {
      c.canais?.forEach((canal) => {
        if (!channels[canal]) {
          channels[canal] = { campanhas: 0, leads: 0, conversoes: 0, budget: 0, receita: 0 };
        }
        channels[canal].campanhas += 1;
        channels[canal].leads += c.leads_gerados || 0;
        channels[canal].conversoes += c.conversoes || 0;
        channels[canal].budget += c.budget_real || 0;
        channels[canal].receita += c.receita_gerada || 0;
      });
    });

    const channelLabels: Record<string, string> = {
      whatsapp: "WhatsApp",
      email: "Email",
      facebook: "Facebook",
      instagram: "Instagram",
      google: "Google Ads",
      tiktok: "TikTok",
    };

    return Object.entries(channels)
      .map(([canal, data]) => ({
        canal: channelLabels[canal] || canal,
        ...data,
        cpl: data.leads > 0 ? data.budget / data.leads : 0,
        taxaConversao: data.leads > 0 ? (data.conversoes / data.leads) * 100 : 0,
        roi: data.budget > 0 ? ((data.receita - data.budget) / data.budget) * 100 : 0,
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [campanhas]);

  // Charts data
  const templatesByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    templates.forEach((t) => {
      grouped[t.tipo] = (grouped[t.tipo] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name: name === "whatsapp" ? "WhatsApp" :
            name === "email" ? "Email" :
            name === "social_media" ? "Redes Sociais" :
            name === "landing_page" ? "Landing Page" : name,
      value,
    }));
  }, [templates]);

  const assetsByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    assets.forEach((a) => {
      grouped[a.tipo] = (grouped[a.tipo] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name: name === "imagem" ? "Imagem" :
            name === "video" ? "Video" :
            name === "banner" ? "Banner" :
            name === "logo" ? "Logo" :
            name === "arte_social" ? "Arte Social" : name,
      value,
    }));
  }, [assets]);

  const campaignsByStatus = useMemo(() => {
    return [
      { name: "Ativas", value: stats.campaigns.active, color: "#22c55e" },
      { name: "Pausadas", value: stats.campaigns.paused, color: "#f59e0b" },
      { name: "Finalizadas", value: stats.campaigns.finished, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [stats.campaigns]);

  const campaignsByChannel = useMemo(() => {
    const channels: Record<string, number> = {};
    campanhas.forEach((c) => {
      c.canais?.forEach((canal) => {
        channels[canal] = (channels[canal] || 0) + 1;
      });
    });
    return Object.entries(channels)
      .map(([name, value]) => ({
        name: name === "whatsapp" ? "WhatsApp" :
              name === "email" ? "Email" :
              name === "facebook" ? "Facebook" :
              name === "instagram" ? "Instagram" :
              name === "google" ? "Google Ads" :
              name === "tiktok" ? "TikTok" : name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [campanhas]);

  const monthlyBudget = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    campanhas.forEach((c) => {
      if (c.data_inicio && c.budget_estimado) {
        const date = new Date(c.data_inicio);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + c.budget_estimado;
      }
    });
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, value]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        budget: value,
      }));
  }, [campanhas]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics de Marketing</h1>
        <p className="text-muted-foreground">
          Metricas e insights do modulo de marketing
        </p>
      </div>

      {/* KPI Cards - Campanhas e Orçamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
                <p className="text-2xl font-bold">{stats.campaigns.active}</p>
                <p className="text-xs text-muted-foreground">
                  de {stats.campaigns.total} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget Total</p>
                <p className="text-2xl font-bold">
                  {stats.budget.total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.budget.real.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}{" "}
                  utilizado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900">
                <Users className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{stats.leads.total}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.leads.conversoes} conversoes ({stats.leads.taxaConversao.toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                <Percent className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ROI Geral</p>
                <p className={`text-2xl font-bold ${stats.roi.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.roi.roi.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Receita: {stats.roi.receita.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Templates, Assets e Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{stats.templates.total}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.templates.active} ativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <ImageIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-2xl font-bold">{stats.assets.total}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.assets.active} ativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-900">
                <Target className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPL Medio</p>
                <p className="text-2xl font-bold">
                  {stats.roi.cpl > 0
                    ? stats.roi.cpl.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Custo por Lead</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900">
                <TrendingUp className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CAC Medio</p>
                <p className="text-2xl font-bold">
                  {stats.roi.cac > 0
                    ? stats.roi.cac.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Custo por Cliente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Canal */}
      {channelPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance por Canal
            </CardTitle>
            <CardDescription>
              Metricas detalhadas de cada canal de marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Canal</th>
                    <th className="text-right p-3 font-medium">Campanhas</th>
                    <th className="text-right p-3 font-medium">Leads</th>
                    <th className="text-right p-3 font-medium">Conversoes</th>
                    <th className="text-right p-3 font-medium">Taxa Conv.</th>
                    <th className="text-right p-3 font-medium">CPL</th>
                    <th className="text-right p-3 font-medium">Budget</th>
                    <th className="text-right p-3 font-medium">Receita</th>
                    <th className="text-right p-3 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {channelPerformance.map((channel) => (
                    <tr key={channel.canal} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{channel.canal}</td>
                      <td className="p-3 text-right">{channel.campanhas}</td>
                      <td className="p-3 text-right text-blue-600 font-medium">
                        {channel.leads}
                      </td>
                      <td className="p-3 text-right text-green-600 font-medium">
                        {channel.conversoes}
                      </td>
                      <td className="p-3 text-right">
                        {channel.taxaConversao.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right">
                        {channel.cpl > 0
                          ? channel.cpl.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {channel.budget.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="p-3 text-right">
                        {channel.receita.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className={`p-3 text-right font-medium ${channel.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {channel.budget > 0 ? `${channel.roi.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Status das Campanhas
            </CardTitle>
            <CardDescription>Distribuicao por status</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={campaignsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {campaignsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhuma campanha cadastrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns by Channel Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Campanhas por Canal
            </CardTitle>
            <CardDescription>Canais de divulgacao utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsByChannel.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={campaignsByChannel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum canal cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates por Tipo
            </CardTitle>
            <CardDescription>Distribuicao de templates</CardDescription>
          </CardHeader>
          <CardContent>
            {templatesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={templatesByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {templatesByType.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum template cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assets by Type Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Assets por Tipo
            </CardTitle>
            <CardDescription>Distribuicao de assets</CardDescription>
          </CardHeader>
          <CardContent>
            {assetsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={assetsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum asset cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Budget Line Chart */}
        {monthlyBudget.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Budget Mensal
              </CardTitle>
              <CardDescription>Investimento em campanhas por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyBudget}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) =>
                      value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })
                    }
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
