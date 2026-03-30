import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Loader2,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFunisAdapter } from '@/hooks/useFunisAdapter';
import { useFunilMetricsAdapter } from '@/hooks/useFunilMetricsAdapter';
import { FunilMetrics } from '@/components/funil/FunilMetrics';
import {
  FunilChart,
  ValorPorEtapaChart,
  TempoPorEtapaChart,
  ConversaoChart,
  ResponsavelChart,
} from '@/components/funil/FunilMetricsChart';

type PeriodoPreset = '7d' | '30d' | 'mes' | 'custom';

export default function FunilRelatorios() {
  const { funilId } = useParams<{ funilId: string }>();
  const navigate = useNavigate();

  const [selectedFunilId, setSelectedFunilId] = useState<string>(funilId || '');
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('30d');

  const { funis, isLoading: isLoadingFunis } = useFunisAdapter();
  const { overview, etapasMetrics, responsavelMetrics, isLoading: isLoadingMetrics, refetch } =
    useFunilMetricsAdapter(selectedFunilId);

  // Auto-selecionar primeiro funil quando carregar
  if (!selectedFunilId && !isLoadingFunis && funis.length > 0) {
    setSelectedFunilId(funis[0].id);
  }

  // Calcular período baseado no preset
  const getPeriodo = () => {
    const hoje = new Date();
    switch (periodoPreset) {
      case '7d':
        return { inicio: subDays(hoje, 7), fim: hoje };
      case '30d':
        return { inicio: subDays(hoje, 30), fim: hoje };
      case 'mes':
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
      default:
        return { inicio: subDays(hoje, 30), fim: hoje };
    }
  };

  const periodo = getPeriodo();
  const funil = funis.find((f) => f.id === selectedFunilId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Exportar relatório (básico)
  const handleExport = () => {
    if (!overview || !etapasMetrics) return;

    const data = {
      funil: funil?.nome,
      periodo: {
        inicio: format(periodo.inicio, 'dd/MM/yyyy'),
        fim: format(periodo.fim, 'dd/MM/yyyy'),
      },
      resumo: {
        total_leads: overview.total_leads,
        valor_total: overview.total_valor,
        leads_ganhos: overview.leads_ganhos,
        leads_perdidos: overview.leads_perdidos,
        taxa_conversao: overview.taxa_conversao,
      },
      etapas: etapasMetrics.map((e) => ({
        nome: e.etapa_nome,
        total_leads: e.total_leads,
        valor_total: e.valor_total,
        tempo_medio_dias: e.tempo_medio_dias,
      })),
      responsaveis: responsavelMetrics.map((r) => ({
        nome: r.responsavel_nome,
        total_leads: r.total_leads,
        leads_ganhos: r.leads_ganhos,
        taxa_conversao: r.taxa_conversao,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-funil-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/funil')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Relatórios do Funil</h1>
              <p className="text-muted-foreground">
                Métricas e análises de conversão
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!overview}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <label className="text-sm font-medium">Funil</label>
                <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Selecione um funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFunis ? (
                      <div className="p-2 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      funis.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Período</label>
                <Select
                  value={periodoPreset}
                  onValueChange={(v) => setPeriodoPreset(v as PeriodoPreset)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="mes">Este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(periodo.inicio, "dd 'de' MMM", { locale: ptBR })} -{' '}
                {format(periodo.fim, "dd 'de' MMM", { locale: ptBR })}
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedFunilId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecione um funil para ver os relatórios</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Métricas Resumo */}
            <FunilMetrics funilId={selectedFunilId} />

            {/* Gráficos */}
            <Tabs defaultValue="funil" className="space-y-4">
              <TabsList>
                <TabsTrigger value="funil">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Funil
                </TabsTrigger>
                <TabsTrigger value="valor">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Valor
                </TabsTrigger>
                <TabsTrigger value="tempo">
                  <Calendar className="h-4 w-4 mr-2" />
                  Tempo
                </TabsTrigger>
                <TabsTrigger value="equipe">
                  <Users className="h-4 w-4 mr-2" />
                  Equipe
                </TabsTrigger>
              </TabsList>

              <TabsContent value="funil" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FunilChart funilId={selectedFunilId} />
                  <ConversaoChart funilId={selectedFunilId} />
                </div>
              </TabsContent>

              <TabsContent value="valor" className="space-y-4">
                <ValorPorEtapaChart funilId={selectedFunilId} />
              </TabsContent>

              <TabsContent value="tempo" className="space-y-4">
                <TempoPorEtapaChart funilId={selectedFunilId} />
              </TabsContent>

              <TabsContent value="equipe" className="space-y-4">
                <ResponsavelChart funilId={selectedFunilId} />

                {/* Tabela de responsáveis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento por Responsável</CardTitle>
                    <CardDescription>
                      Performance individual da equipe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {responsavelMetrics.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum responsável atribuído
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 font-medium">Responsável</th>
                              <th className="text-right py-2 font-medium">Leads</th>
                              <th className="text-right py-2 font-medium">Valor</th>
                              <th className="text-right py-2 font-medium">Ganhos</th>
                              <th className="text-right py-2 font-medium">Conversão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responsavelMetrics.map((resp) => (
                              <tr key={resp.responsavel_id} className="border-b last:border-0">
                                <td className="py-3">{resp.responsavel_nome}</td>
                                <td className="text-right py-3">{resp.total_leads}</td>
                                <td className="text-right py-3">
                                  {formatCurrency(resp.valor_total)}
                                </td>
                                <td className="text-right py-3">
                                  <Badge variant="outline" className="text-green-600">
                                    {resp.leads_ganhos}
                                  </Badge>
                                </td>
                                <td className="text-right py-3">
                                  <Badge
                                    variant={resp.taxa_conversao >= 30 ? 'default' : 'secondary'}
                                  >
                                    {resp.taxa_conversao}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Tabela de Etapas */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Etapa</CardTitle>
                <CardDescription>Métricas detalhadas de cada etapa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Etapa</th>
                        <th className="text-right py-2 font-medium">Leads</th>
                        <th className="text-right py-2 font-medium">Valor</th>
                        <th className="text-right py-2 font-medium">Tempo Médio</th>
                        <th className="text-right py-2 font-medium">Esfriando</th>
                      </tr>
                    </thead>
                    <tbody>
                      {etapasMetrics.map((etapa) => (
                        <tr key={etapa.etapa_id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: etapa.etapa_cor }}
                              />
                              <span>{etapa.etapa_nome}</span>
                              {etapa.etapa_tipo === 'ganho' && (
                                <Badge variant="outline" className="text-green-600 text-xs">
                                  Ganho
                                </Badge>
                              )}
                              {etapa.etapa_tipo === 'perda' && (
                                <Badge variant="outline" className="text-red-500 text-xs">
                                  Perda
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3">{etapa.total_leads}</td>
                          <td className="text-right py-3">
                            {formatCurrency(etapa.valor_total)}
                          </td>
                          <td className="text-right py-3">
                            {etapa.tempo_medio_dias > 0 ? `${etapa.tempo_medio_dias} dias` : '-'}
                          </td>
                          <td className="text-right py-3">
                            {etapa.leads_esfriando > 0 ? (
                              <Badge variant="outline" className="text-amber-500">
                                {etapa.leads_esfriando}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
