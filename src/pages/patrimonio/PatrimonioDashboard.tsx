import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAssetMetricsMT } from '@/hooks/multitenant/usePatrimonioMT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Package, TrendingDown, DollarSign, Wrench, Plus, ArrowRight, AlertTriangle } from 'lucide-react';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '@/types/patrimonio';
import { formatBRL } from '@/lib/depreciation';
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
} from 'recharts';

export default function PatrimonioDashboard() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const { data: metrics, isLoading } = useAssetMetricsMT();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const m = metrics || {
    total_ativos: 0,
    valor_total_aquisicao: 0,
    valor_total_contabil: 0,
    depreciacao_total: 0,
    por_status: {},
    por_categoria: [],
    proximas_manutencoes: 0,
    ativos_totalmente_depreciados: 0,
  };

  const statusData = Object.entries(m.por_status).map(([status, count]) => ({
    name: ASSET_STATUS_LABELS[status as keyof typeof ASSET_STATUS_LABELS] || status,
    value: count as number,
  }));

  const STATUS_PIE_COLORS = ['#4CAF50', '#2196F3', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Patrimônio
            {tenant && <span className="text-muted-foreground text-lg font-normal">- {tenant.nome_fantasia}</span>}
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de ativos fixos e depreciação</p>
        </div>
        <Button onClick={() => navigate('/patrimonio/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ativo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Ativos</p>
                <p className="text-3xl font-bold">{m.total_ativos}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
                <p className="text-2xl font-bold">{formatBRL(m.valor_total_aquisicao)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Contábil</p>
                <p className="text-2xl font-bold">{formatBRL(m.valor_total_contabil)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Depreciação Total</p>
                <p className="text-2xl font-bold">{formatBRL(m.depreciacao_total)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(m.proximas_manutencoes > 0 || m.ativos_totalmente_depreciados > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {m.proximas_manutencoes > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Wrench className="h-5 w-5 text-yellow-600" />
                <span className="text-sm"><strong>{m.proximas_manutencoes}</strong> manutenções agendadas</span>
              </CardContent>
            </Card>
          )}
          {m.ativos_totalmente_depreciados > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm"><strong>{m.ativos_totalmente_depreciados}</strong> ativos totalmente depreciados ainda em operação</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valor por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {m.por_categoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={m.por_categoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="categoria" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatBRL(value)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {m.por_categoria.map((entry, idx) => (
                      <Cell key={idx} fill={entry.cor || '#8884d8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum ativo cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={STATUS_PIE_COLORS[idx % STATUS_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum ativo cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate('/patrimonio/ativos')}>
          <Package className="h-4 w-4 mr-2" />
          Ver Todos os Ativos
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="outline" onClick={() => navigate('/patrimonio/categorias')}>
          Gerenciar Categorias
        </Button>
        <Button variant="outline" onClick={() => navigate('/patrimonio/relatorios')}>
          Relatórios
        </Button>
      </div>
    </div>
  );
}
