import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Target,
  BarChart3,
  Megaphone,
  ArrowRight,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAdCampaignsMT } from '@/hooks/multitenant/useAdCampaignsMT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function TrafficDashboard() {
  const { tenant } = useTenantContext();
  const { stats, isLoading } = useAdCampaignsMT();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Campanhas',
      value: stats?.total ?? 0,
      icon: Megaphone,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Campanhas Ativas',
      value: stats?.active ?? 0,
      icon: Target,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Total Investido',
      value: formatCurrency(stats?.totalSpent ?? 0),
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Leads Gerados',
      value: stats?.totalLeads ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Vendas',
      value: stats?.totalSales ?? 0,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Receita Gerada',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'ROAS Medio',
      value: `${(stats?.avgRoas ?? 0).toFixed(2)}x`,
      icon: BarChart3,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <span className="text-foreground">Gestor de Trafego</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestor de Trafego</h1>
          <p className="text-muted-foreground">
            Visao geral das campanhas de anuncios
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie suas campanhas de anuncios no Meta, Google e TikTok.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/ia/trafego/campanhas" className="flex items-center gap-2">
                Ver Campanhas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Atribuicao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Relatorio de atribuicao de leads e vendas por campanha.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/ia/trafego/atribuicao" className="flex items-center gap-2">
                Ver Relatorio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Criativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analise de performance dos criativos de anuncios.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/ia/trafego/criativos" className="flex items-center gap-2">
                Ver Analise
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
