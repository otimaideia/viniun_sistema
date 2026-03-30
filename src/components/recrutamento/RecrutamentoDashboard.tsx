import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Users, Calendar, TrendingUp, Clock, CheckCircle2,
  UserCheck, UserX, AlertTriangle, ArrowRight, Plus,
} from "lucide-react";
import { useRecrutamentoMetricsMT } from "@/hooks/multitenant/useRecrutamentoMetricsMT";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CANDIDATO_STATUS_CONFIG,
  ENTREVISTA_STATUS_CONFIG,
} from "@/types/recrutamento";
import { cn } from "@/lib/utils";

export function RecrutamentoDashboard() {
  const navigate = useNavigate();
  const { metrics, isLoading, vagas, candidatos, entrevistas } = useRecrutamentoMetricsMT();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Vagas Ativas",
      value: metrics.vagasAbertas,
      subtitle: `de ${metrics.totalVagas} total`,
      icon: Briefcase,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Candidatos",
      value: metrics.totalCandidatos,
      subtitle: `${metrics.candidatosNovos} novos`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Entrevistas Hoje",
      value: metrics.entrevistasHoje,
      subtitle: `${metrics.entrevistasSemana} esta semana`,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Taxa de Aprovação",
      value: `${metrics.taxaAprovacao}%`,
      subtitle: `${metrics.candidatosAprovados} aprovados`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  // Pipeline stages with correct data
  const pipelineStages = [
    { label: "Novos", value: metrics.pipeline.novos, color: "bg-blue-500", textColor: "text-blue-600" },
    { label: "Em Análise", value: metrics.pipeline.analise, color: "bg-cyan-500", textColor: "text-cyan-600" },
    { label: "Entrevista", value: metrics.pipeline.entrevista, color: "bg-purple-500", textColor: "text-purple-600" },
    { label: "Aprovados", value: metrics.pipeline.aprovados, color: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Contratados", value: metrics.pipeline.contratados, color: "bg-green-700", textColor: "text-green-700" },
    { label: "Reprovados", value: metrics.pipeline.reprovados, color: "bg-red-500", textColor: "text-red-600" },
  ];

  const totalPipeline = pipelineStages.reduce((acc, s) => acc + s.value, 0);

  // Próximas entrevistas (agendadas/confirmadas, futuras, limit 5)
  const now = new Date();
  const proximasEntrevistas = entrevistas
    .filter((e) => {
      const d = new Date(e.data_entrevista);
      return d >= now && (e.status === "agendada" || e.status === "confirmada");
    })
    .sort((a, b) => new Date(a.data_entrevista).getTime() - new Date(b.data_entrevista).getTime())
    .slice(0, 5);

  // Últimas vagas criadas
  const ultimasVagas = [...vagas]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline + Status Vagas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Pipeline de Candidatos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline de Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            {totalPipeline === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum candidato cadastrado</p>
              </div>
            ) : (
              <>
                {/* Barra visual do pipeline */}
                <div className="flex h-4 rounded-full overflow-hidden mb-4">
                  {pipelineStages.map((stage) =>
                    stage.value > 0 ? (
                      <div
                        key={stage.label}
                        className={`${stage.color} transition-all`}
                        style={{ width: `${(stage.value / totalPipeline) * 100}%` }}
                        title={`${stage.label}: ${stage.value}`}
                      />
                    ) : null,
                  )}
                </div>
                {/* Legenda */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {pipelineStages.map((stage) => (
                    <div key={stage.label} className="text-center">
                      <p className={cn("text-lg font-bold", stage.textColor)}>{stage.value}</p>
                      <p className="text-xs text-muted-foreground">{stage.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status das Vagas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status das Vagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <StatusRow color="bg-slate-300" label="Rascunho" value={metrics.vagasRascunho} />
              <StatusRow color="bg-emerald-500" label="Abertas" value={metrics.vagasAbertas} />
              <StatusRow color="bg-amber-500" label="Pausadas" value={metrics.vagasPausadas} />
              <StatusRow color="bg-slate-500" label="Encerradas" value={metrics.vagasEncerradas} />

              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Média por vaga</span>
                  <span className="font-medium">{metrics.mediaCandidatosPorVaga} candidatos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entrevistas Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Aguardando Triagem"
          value={metrics.candidatosNovos}
        />
        <StatCard
          icon={Calendar}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Entrevistas Semana"
          value={metrics.entrevistasSemana}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Realizadas"
          value={metrics.entrevistasRealizadas}
          subtext={
            metrics.taxaRealizacaoEntrevistas > 0
              ? `${metrics.taxaRealizacaoEntrevistas}% de taxa`
              : undefined
          }
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          label="No-Show"
          value={metrics.entrevistasNoShow}
          subtext={
            metrics.entrevistasCanceladas > 0
              ? `${metrics.entrevistasCanceladas} canceladas`
              : undefined
          }
        />
      </div>

      {/* Atividade Recente */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximas Entrevistas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximas Entrevistas
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")}>
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {proximasEntrevistas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma entrevista agendada</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => navigate("/recrutamento/entrevistas/nova")}
                >
                  <Plus className="h-3 w-3 mr-1" /> Agendar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {proximasEntrevistas.map((ent) => {
                  const statusCfg = ENTREVISTA_STATUS_CONFIG[ent.status];
                  return (
                    <div
                      key={ent.id}
                      className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/recrutamento/entrevistas/${ent.id}`)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {ent.candidate?.nome || "Candidato"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ent.data_entrevista), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          {ent.position && ` · ${ent.position.titulo}`}
                        </p>
                      </div>
                      <Badge className={cn("border text-xs shrink-0 ml-2", statusCfg.bg, statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Vagas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Últimas Vagas
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/recrutamento")}>
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {ultimasVagas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma vaga criada</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => navigate("/recrutamento/vagas/nova")}
                >
                  <Plus className="h-3 w-3 mr-1" /> Criar vaga
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {ultimasVagas.map((vaga) => (
                  <div
                    key={vaga.id}
                    className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/recrutamento/vagas/${vaga.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{vaga.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {vaga.departamento || "Sem departamento"}
                        {vaga.franchise && ` · ${vaga.franchise.nome_fantasia}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {vaga.total_candidatos || 0} cand.
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          vaga.status === "aberta" && "border-emerald-300 text-emerald-700",
                          vaga.status === "pausada" && "border-amber-300 text-amber-700",
                          vaga.status === "encerrada" && "border-slate-300 text-slate-500",
                          vaga.status === "rascunho" && "border-slate-200 text-slate-400",
                        )}
                      >
                        {vaga.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subtext,
}: {
  icon: typeof Clock;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
