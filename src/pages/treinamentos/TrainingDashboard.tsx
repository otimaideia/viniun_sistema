import { Link } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, Users, Award, TrendingUp,
  BookOpen, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingStatsMT, useAllEnrollmentsMT } from '@/hooks/multitenant/useTrainingProgressMT';
import { TRACK_NIVEL_CONFIG } from '@/types/treinamento';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrainingDashboard() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const { stats, isLoading: isStatsLoading } = useTrainingStatsMT();
  const { enrollments, isLoading: isEnrollmentsLoading } = useAllEnrollmentsMT();

  const isLoading = isTenantLoading || isStatsLoading;
  const recentEnrollments = enrollments.slice(0, 10);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Treinamentos</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded mt-2 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Treinamentos
          </h1>
          <p className="text-muted-foreground">
            Visao geral do programa de treinamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/treinamentos/trilhas">
              <BookOpen className="h-4 w-4 mr-2" />
              Trilhas
            </Link>
          </Button>
          <Button asChild>
            <Link to="/treinamentos/trilhas/novo">
              <GraduationCap className="h-4 w-4 mr-2" />
              Nova Trilha
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Trilhas"
          value={stats?.totalTracks ?? 0}
          icon={BookOpen}
          description="Trilhas cadastradas"
        />
        <StatCard
          title="Colaboradores Matriculados"
          value={stats?.totalEnrollments ?? 0}
          icon={Users}
          description="Matriculas ativas"
        />
        <StatCard
          title="Taxa de Conclusao"
          value={`${stats?.completionRate ?? 0}%`}
          icon={TrendingUp}
          description={`${stats?.totalCompleted ?? 0} trilhas concluidas`}
        />
        <StatCard
          title="Certificados Emitidos"
          value={stats?.totalCertificates ?? 0}
          icon={Award}
          description="Certificados gerados"
        />
      </div>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Matriculas Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/treinamentos/trilhas">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isEnrollmentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentEnrollments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma matricula registrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((enrollment) => {
                const nivelConfig = enrollment.track?.nivel
                  ? TRACK_NIVEL_CONFIG[enrollment.track.nivel]
                  : null;

                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          backgroundColor: enrollment.track?.cor || '#6366f1',
                        }}
                      >
                        {(enrollment.user?.nome || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {enrollment.user?.nome || 'Colaborador'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.track?.titulo || 'Trilha'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {nivelConfig && (
                        <Badge
                          variant="outline"
                          className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0 text-xs`}
                        >
                          {nivelConfig.label}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          enrollment.status === 'concluido'
                            ? 'default'
                            : enrollment.status === 'ativo'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {enrollment.status === 'concluido'
                          ? 'Concluido'
                          : enrollment.status === 'ativo'
                          ? `${enrollment.progresso_pct}%`
                          : enrollment.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
