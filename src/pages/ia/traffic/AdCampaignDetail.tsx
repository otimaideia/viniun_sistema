import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Edit,
  TrendingUp,
  Users,
  MousePointer,
  Eye as EyeIcon,
  DollarSign,
  ShoppingCart,
  CalendarDays,
  Target,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { AdCampaign } from '@/types/ad-campaigns';
import { CAMPAIGN_STATUS_LABELS, PLATFORM_LABELS } from '@/types/ad-campaigns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

export default function AdCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['mt-ad-campaign', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AdCampaign;
    },
    enabled: !!id,
  });

  if (isLoading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusInfo = CAMPAIGN_STATUS_LABELS[campaign.status] || {
    label: campaign.status,
    color: 'text-gray-600 bg-gray-100',
  };
  const platformInfo = PLATFORM_LABELS[campaign.plataforma] || {
    label: campaign.plataforma,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <Link to="/ia/trafego" className="hover:text-foreground">
          Trafego
        </Link>
        <span>/</span>
        <Link to="/ia/trafego/campanhas" className="hover:text-foreground">
          Campanhas
        </Link>
        <span>/</span>
        <span className="text-foreground">{campaign.nome}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.nome}</h1>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <Badge variant="outline">{platformInfo.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {campaign.tipo && `${campaign.tipo} - `}
            {campaign.objetivo && `${campaign.objetivo} - `}
            Criada em {formatDate(campaign.created_at)}
            {tenant && ` | ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button onClick={() => navigate(`/ia/trafego/campanhas/${id}/editar`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Campaign Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investido</p>
                <p className="text-lg font-bold">{formatCurrency(campaign.budget_gasto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orc. Diario</p>
                <p className="text-lg font-bold">
                  {campaign.budget_diario ? formatCurrency(campaign.budget_diario) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Periodo</p>
                <p className="text-sm font-medium">
                  {formatDate(campaign.data_inicio)} - {formatDate(campaign.data_fim)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orc. Total</p>
                <p className="text-lg font-bold">
                  {campaign.budget_total ? formatCurrency(campaign.budget_total) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeIcon className="h-5 w-5" />
            Metricas de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-sm text-muted-foreground">Impressoes</p>
              <p className="text-xl font-bold">{formatNumber(campaign.impressions)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alcance</p>
              <p className="text-xl font-bold">{formatNumber(campaign.alcance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliques</p>
              <p className="text-xl font-bold">{formatNumber(campaign.cliques)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CTR</p>
              <p className="text-xl font-bold">{formatPercent(campaign.ctr)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPC</p>
              <p className="text-xl font-bold">{formatCurrency(campaign.cpc)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPM</p>
              <p className="text-xl font-bold">{formatCurrency(campaign.cpm)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Funil de Conversao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Leads Gerados</p>
              <p className="text-3xl font-bold text-blue-600">{campaign.leads_gerados}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Qualificados</p>
              <p className="text-3xl font-bold text-purple-600">
                {campaign.leads_qualificados}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Agendamentos</p>
              <p className="text-3xl font-bold text-orange-600">{campaign.agendamentos}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Vendas</p>
              <p className="text-3xl font-bold text-green-600">{campaign.vendas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Metricas de ROI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-sm text-muted-foreground">Receita</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(campaign.receita_gerada)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPL</p>
              <p className="text-xl font-bold">{formatCurrency(campaign.cpl)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPA</p>
              <p className="text-xl font-bold">{formatCurrency(campaign.cpa)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPV</p>
              <p className="text-xl font-bold">{formatCurrency(campaign.cpv)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ROAS</p>
              <p className="text-xl font-bold">{campaign.roas.toFixed(2)}x</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className="text-xl font-bold">{formatPercent(campaign.roi_percent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UTM Info */}
      {(campaign.utm_source || campaign.utm_medium || campaign.utm_campaign) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Rastreamento UTM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {campaign.utm_source && (
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{campaign.utm_source}</p>
                </div>
              )}
              {campaign.utm_medium && (
                <div>
                  <p className="text-sm text-muted-foreground">Medium</p>
                  <p className="font-medium">{campaign.utm_medium}</p>
                </div>
              )}
              {campaign.utm_campaign && (
                <div>
                  <p className="text-sm text-muted-foreground">Campaign</p>
                  <p className="font-medium">{campaign.utm_campaign}</p>
                </div>
              )}
              {campaign.utm_content && (
                <div>
                  <p className="text-sm text-muted-foreground">Content</p>
                  <p className="font-medium">{campaign.utm_content}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
