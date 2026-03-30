import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CalendarCheck, CheckCircle2, TrendingUp } from "lucide-react";

interface AgendamentoKPICardsProps {
  metrics: {
    hoje: number;
    proximos7Dias: number;
    semana: number;
    mes: number;
    agendados: number;
    confirmados: number;
    realizados: number;
    cancelados: number;
    naoCompareceu: number;
    taxaRealizacao: number;
    taxaComparecimento: number;
  };
  isLoading: boolean;
}

export function AgendamentoKPICards({ metrics, isLoading }: AgendamentoKPICardsProps) {
  const kpis = [
    {
      title: "Hoje",
      value: metrics.hoje,
      icon: CalendarDays,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Próximos 7 dias",
      value: metrics.proximos7Dias,
      icon: CalendarCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Realizados (mês)",
      value: metrics.realizados,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Taxa de Realização",
      value: `${metrics.taxaRealizacao}%`,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
