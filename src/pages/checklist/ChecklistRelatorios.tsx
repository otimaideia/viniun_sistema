import { useState } from 'react';
import {
  BarChart3, TrendingUp, Users, AlertTriangle, Clock, CheckCircle2,
  XCircle, SkipForward, Calendar, Filter,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  useDailyReport, useTrendReport, useEmployeeComparison,
  useMostMissedItems, useTimeAnalysis, useNCReport,
} from '@/hooks/multitenant/useChecklistReportsMT';
import { formatSeconds } from '@/hooks/multitenant/useChecklistTimerMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { ShieldAlert } from 'lucide-react';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  concluido: '#22c55e',
  nao_feito: '#ef4444',
  pulado: '#f59e0b',
  pendente: '#94a3b8',
  em_andamento: '#3b82f6',
  incompleto: '#f97316',
  cancelado: '#6b7280',
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export default function ChecklistRelatorios() {
  const { accessLevel } = useTenantContext();
  const isGestor = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);

  // Período padrão: últimos 30 dias
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

  // Queries
  const { data: dailyData, isLoading: loadingDaily } = useDailyReport(selectedDate);
  const { data: trendData, isLoading: loadingTrend } = useTrendReport(startDate, endDate);
  const { data: employeeData, isLoading: loadingEmployees } = useEmployeeComparison(startDate, endDate);
  const { data: missedData, isLoading: loadingMissed } = useMostMissedItems(startDate, endDate);
  const { data: timeData, isLoading: loadingTime } = useTimeAnalysis(startDate, endDate);
  const { data: ncData, isLoading: loadingNC } = useNCReport(startDate, endDate);

  // KPIs do dia
  const totalChecklists = dailyData?.length || 0;
  const avgConclusion = totalChecklists > 0
    ? Math.round(dailyData!.reduce((s, r) => s + r.percentual_conclusao, 0) / totalChecklists)
    : 0;
  const totalNCs = ncData?.length || 0;

  // Tempo médio do período
  const totalTimeItems = timeData?.reduce((s, t) => s + t.real_min, 0) || 0;

  // Distribuição de status (do dia)
  const statusCounts: Record<string, number> = {};
  dailyData?.forEach(row => {
    row.items?.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
  });
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status === 'concluido' ? 'Concluído' : status === 'nao_feito' ? 'Não feito' : status === 'pulado' ? 'Pulado' : status === 'pendente' ? 'Pendente' : status,
    value: count,
    fill: STATUS_COLORS[status] || '#94a3b8',
  }));

  if (!isGestor) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
          <ShieldAlert className="h-16 w-16" />
          <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
          <p>Relatórios estão disponíveis apenas para gestores e administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Relatórios de Checklist
          </h1>
          <p className="text-sm text-muted-foreground">Análise de produtividade e conformidade</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Dia (relatório diário)</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Período início</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Período fim</label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Checklists do Dia</p>
                <p className="text-2xl font-bold">{totalChecklists}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">% Conclusão Médio</p>
                <p className="text-2xl font-bold">{avgConclusion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Não-Conformidades</p>
                <p className="text-2xl font-bold">{totalNCs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo Total (período)</p>
                <p className="text-2xl font-bold">{totalTimeItems}min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência de Conclusão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendência de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
            ) : !trendData?.length ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={formatDate} fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip
                    formatter={(val: number) => [`${val}%`, 'Conclusão']}
                    labelFormatter={(label: string) => formatDate(label)}
                  />
                  <Line type="monotone" dataKey="percentual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Status (Dia) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Status do Dia ({formatDate(selectedDate)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
            ) : !pieData.length ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados para o dia</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparação entre Colaboradores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Comparação entre Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmployees ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
            ) : !employeeData?.length ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, employeeData.length * 40)}>
                <BarChart data={employeeData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} fontSize={12} />
                  <YAxis type="category" dataKey="nome" fontSize={12} width={75} />
                  <Tooltip formatter={(val: number) => [`${val}%`, 'Conclusão']} />
                  <Bar dataKey="percentual" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {employeeData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.percentual >= 90 ? '#22c55e' : entry.percentual >= 70 ? '#3b82f6' : entry.percentual >= 50 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Items Mais Perdidos (Pareto) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Top 10 — Itens Mais Perdidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMissed ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
            ) : !missedData?.length ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, missedData.length * 35)}>
                <BarChart data={missedData} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="titulo"
                    fontSize={11}
                    width={115}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip />
                  <Bar dataKey="vezes" fill="#ef4444" radius={[0, 4, 4, 0]} name="Vezes perdido" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Row 3: Tempo Planejado vs Real */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempo Planejado vs Real (por categoria)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTime ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : !timeData?.length ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Sem dados de tempo no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" fontSize={12} />
                <YAxis fontSize={12} label={{ value: 'minutos', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(val: number) => [`${val} min`]} />
                <Legend />
                <Bar dataKey="planejado_min" fill="#94a3b8" name="Planejado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real_min" fill="#3b82f6" name="Real" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela: Relatório Diário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Relatório do Dia — {formatDate(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDaily ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !dailyData?.length ? (
            <p className="text-muted-foreground">Sem checklists para este dia</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Colaborador</th>
                    <th className="pb-2 font-medium">Template</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-center">Itens</th>
                    <th className="pb-2 font-medium text-center">Conclusão</th>
                    <th className="pb-2 font-medium text-center">NCs</th>
                    <th className="pb-2 font-medium text-center">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map(row => {
                    const totalTime = row.items?.reduce((s, i) => s + (i.timer_elapsed_seconds || 0), 0) || 0;
                    const ncs = row.items?.filter(i => i.has_nao_conformidade).length || 0;
                    return (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2">{row.user?.nome || '—'}</td>
                        <td className="py-2">
                          {row.template && (
                            <Badge variant="outline" style={{ borderColor: row.template.cor, color: row.template.cor }}>
                              {row.template.nome}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <Badge
                            variant={row.status === 'concluido' ? 'default' : 'secondary'}
                            className={
                              row.status === 'concluido' ? 'bg-green-100 text-green-800' :
                              row.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                              row.status === 'incompleto' ? 'bg-orange-100 text-orange-800' :
                              ''
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-green-600">{row.items_concluidos}</span>
                          {' / '}
                          {row.total_items}
                        </td>
                        <td className="py-2 text-center font-mono">
                          <span className={
                            row.percentual_conclusao >= 90 ? 'text-green-600' :
                            row.percentual_conclusao >= 70 ? 'text-blue-600' :
                            row.percentual_conclusao >= 50 ? 'text-amber-600' :
                            'text-red-600'
                          }>
                            {row.percentual_conclusao}%
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          {ncs > 0 ? (
                            <Badge variant="destructive" className="text-xs">{ncs}</Badge>
                          ) : '—'}
                        </td>
                        <td className="py-2 text-center font-mono text-xs">
                          {totalTime > 0 ? formatSeconds(totalTime) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela: Não-Conformidades */}
      {(ncData?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Não-Conformidades no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Colaborador</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Descrição</th>
                    <th className="pb-2 font-medium">Ação Tomada</th>
                  </tr>
                </thead>
                <tbody>
                  {ncData?.map(nc => (
                    <tr key={nc.id} className="border-b last:border-0">
                      <td className="py-2">{nc.daily?.data ? formatDate(nc.daily.data) : '—'}</td>
                      <td className="py-2">{nc.daily?.user?.nome || '—'}</td>
                      <td className="py-2 font-medium">{nc.titulo}</td>
                      <td className="py-2 text-muted-foreground">{nc.nao_conformidade_descricao || '—'}</td>
                      <td className="py-2 text-muted-foreground">{nc.nao_conformidade_acao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </DashboardLayout>
  );
}
