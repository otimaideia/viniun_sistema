import { useState } from "react";
import { useDailyReportsMT, type FunnelStep } from "@/hooks/multitenant/useDailyReportsMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { FranchiseSelector } from "@/components/multitenant/FranchiseSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Users,
  CheckCircle2,
  UserCheck,
  Stethoscope,
  ClipboardCheck,
  TrendingUp,
  Loader2,
  RefreshCw,
  DollarSign,
  Star,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";

const FUNNEL_COLORS = ["#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899"];

export default function RelatoriosDiarios() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [selectedFranchise, setSelectedFranchise] = useState<string | undefined>();
  const { accessLevel } = useTenantContext();

  const { metrics, isLoading, refetch } = useDailyReportsMT(date, selectedFranchise);

  const kpis = metrics
    ? [
        { label: "Leads", value: metrics.leads.total, icon: Users, color: "text-cyan-600" },
        { label: "Agendados", value: metrics.agendados, icon: Calendar, color: "text-blue-600" },
        { label: "Confirmados", value: metrics.confirmados, icon: CheckCircle2, color: "text-indigo-600" },
        { label: "Compareceram", value: metrics.comparecidos, icon: UserCheck, color: "text-purple-600" },
        { label: "Atendidos", value: metrics.atendidos, icon: Stethoscope, color: "text-green-600" },
        { label: "Convertidos", value: metrics.auditorias.convertidas, icon: TrendingUp, color: "text-pink-600" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatório Diário</h1>
          <p className="text-muted-foreground">
            Acompanhe as métricas do dia em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {(accessLevel === 'platform' || accessLevel === 'tenant') && (
          <FranchiseSelector
            variant="select"
            showClear
            onSelect={(f) => setSelectedFranchise(f?.id)}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !metrics ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Nenhum dado disponível para esta data</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Extra KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Vendas ({metrics.vendas.total})</p>
                  <p className="text-xl font-bold">
                    R$ {metrics.vendas.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">NPS ({metrics.nps_respostas} resp.)</p>
                  <p className="text-xl font-bold">
                    {metrics.nps_medio !== null ? metrics.nps_medio.toFixed(1) : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Não Compareceram</p>
                  <p className="text-xl font-bold">{metrics.nao_compareceu}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Cancelados</p>
                  <p className="text-xl font-bold">{metrics.cancelados}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leads do Dia */}
          {metrics.leads.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-600" />
                  Leads do Dia ({metrics.leads.total})
                  {metrics.leads.novos > 0 && (
                    <Badge variant="secondary">{metrics.leads.novos} novos</Badge>
                  )}
                </CardTitle>
                <CardDescription>Leads captados nesta data</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.leads.items.map((lead: Record<string, unknown>) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.nome || '-'}</TableCell>
                        <TableCell>{lead.telefone || '-'}</TableCell>
                        <TableCell>{lead.canal_entrada || '-'}</TableCell>
                        <TableCell>{lead.origem || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{lead.servico_interesse || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={lead.status === 'convertido' ? 'default' : 'secondary'}>
                            {lead.status || 'novo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {lead.created_at ? new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funil do Dia</CardTitle>
              <CardDescription>Conversão entre cada etapa do atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.funnel} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="step" width={100} />
                    <Tooltip
                      formatter={(value: number, name: string, props: Record<string, unknown>) => [
                        `${value} (${props.payload.percentage}%)`,
                        "Quantidade",
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {metrics.funnel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Tipo de Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Agendados</TableHead>
                    <TableHead className="text-center">Compareceram</TableHead>
                    <TableHead className="text-center">Atendidos</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { key: "avaliacao", label: "Avaliação" },
                    { key: "procedimento_fechado", label: "Procedimento" },
                    { key: "cortesia", label: "Cortesia" },
                  ].map((tipo) => {
                    const data = metrics.por_tipo[tipo.key as keyof typeof metrics.por_tipo];
                    const taxa = data.agendados > 0 ? Math.round(data.atendidos / data.agendados * 100) : 0;
                    return (
                      <TableRow key={tipo.key}>
                        <TableCell className="font-medium">{tipo.label}</TableCell>
                        <TableCell className="text-center">{data.agendados}</TableCell>
                        <TableCell className="text-center">{data.comparecidos}</TableCell>
                        <TableCell className="text-center">{data.atendidos}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={taxa >= 70 ? "default" : "secondary"}>
                            {taxa}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Per-professional table */}
          {metrics.por_profissional.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Por Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Agendados</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-center">Ocupação %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.por_profissional
                      .sort((a, b) => b.atendimentos - a.atendimentos)
                      .map((prof) => (
                        <TableRow key={prof.id}>
                          <TableCell className="font-medium">{prof.nome}</TableCell>
                          <TableCell className="text-center">{prof.agendados}</TableCell>
                          <TableCell className="text-center">{prof.atendimentos}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={prof.taxa_ocupacao >= 70 ? "default" : "secondary"}>
                              {prof.taxa_ocupacao}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Per-consultora table */}
          {metrics.por_consultora.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Por Consultora
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultora</TableHead>
                      <TableHead className="text-center">Agendamentos</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-center">Receita</TableHead>
                      <TableHead className="text-center">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.por_consultora
                      .sort((a, b) => b.receita - a.receita)
                      .map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell className="text-center">{c.agendamentos}</TableCell>
                          <TableCell className="text-center">{c.vendas}</TableCell>
                          <TableCell className="text-center">
                            R$ {c.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.conversao >= 30 ? "default" : "secondary"}>
                              {c.conversao}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
