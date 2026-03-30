import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  Megaphone,
  ArrowRight,
  Users,
  Calendar,
  CheckCircle2,
  DoorOpen,
  AlertTriangle,
} from "lucide-react";

interface ReportCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  badge?: string;
}

const reports: ReportCard[] = [
  {
    title: "Ranking de Franquias",
    description: "Veja as unidades com melhor desempenho em leads e conversões",
    icon: <Trophy className="h-8 w-8 text-yellow-500" />,
    href: "/relatorios/ranking",
    available: true,
  },
  {
    title: "Performance de Leads",
    description: "Análise de leads, demanda de serviços, atendimento WhatsApp e insights estratégicos",
    icon: <TrendingUp className="h-8 w-8 text-blue-600" />,
    href: "/relatorios/leads",
    available: true,
  },
  {
    title: "Leads Sem Resposta",
    description: "Conversas onde o cliente mandou mensagem e a clínica nunca respondeu",
    icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
    href: "/relatorios/leads/sem-resposta",
    available: true,
    badge: "Urgente",
  },
  {
    title: "Metas e Objetivos",
    description: "Acompanhe o progresso das metas definidas",
    icon: <Target className="h-8 w-8 text-green-600" />,
    href: "/metas",
    available: true,
  },
  {
    title: "Receita e Faturamento",
    description: "Relatórios financeiros e projeções",
    icon: <DollarSign className="h-8 w-8 text-emerald-600" />,
    href: "/relatorios/receita",
    available: false,
    badge: "Em breve",
  },
  {
    title: "Análise de Serviços",
    description: "Serviços mais procurados e tendências",
    icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
    href: "/relatorios/servicos",
    available: false,
    badge: "Em breve",
  },
  {
    title: "Campanhas de Marketing",
    description: "ROI e performance das campanhas ativas",
    icon: <Megaphone className="h-8 w-8 text-orange-600" />,
    href: "/campanhas",
    available: true,
  },
  {
    title: "Relatório Diário",
    description: "Funil diário: agendados → confirmados → atendidos → convertidos",
    icon: <BarChart3 className="h-8 w-8 text-sky-600" />,
    href: "/relatorios/diarios",
    available: true,
  },
  {
    title: "Ocupação de Salas",
    description: "Heatmap de ocupação, no-shows e alertas de expansão",
    icon: <DoorOpen className="h-8 w-8 text-rose-600" />,
    href: "/relatorios/ocupacao",
    available: true,
  },
];

const quickStats = [
  { label: "Este Mês", value: "+12%", trend: "up" },
  { label: "Leads", value: "847", trend: "up" },
  { label: "Meta Atingida", value: "78%", trend: "neutral" },
  { label: "Dias Restantes", value: "3", trend: "neutral" },
];

const RelatoriosIndex = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Acesse relatórios e análises do sistema
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                {stat.trend === "up" && (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                )}
                {stat.trend === "neutral" && (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card
            key={report.title}
            className={`relative overflow-hidden transition-all ${
              report.available
                ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
                : "opacity-70"
            }`}
          >
            {report.available ? (
              <Link to={report.href} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {report.icon}
                    {report.badge ? (
                      <Badge variant="destructive">{report.badge}</Badge>
                    ) : (
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
              </Link>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {report.icon}
                    {report.badge && (
                      <Badge variant="secondary">{report.badge}</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dicas de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Filtros por Período</p>
                <p className="text-sm text-muted-foreground">
                  A maioria dos relatórios permite filtrar por semana, mês ou período personalizado.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Comparação de Franquias</p>
                <p className="text-sm text-muted-foreground">
                  Compare o desempenho entre diferentes unidades no ranking.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Metas Personalizadas</p>
                <p className="text-sm text-muted-foreground">
                  Defina metas específicas para cada franquia e acompanhe em tempo real.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosIndex;
