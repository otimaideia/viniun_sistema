import { useState } from 'react';
import {
  ClipboardCheck, Users, Flame, Trophy, TrendingUp,
  CheckCircle2, AlertTriangle, Clock, ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeuChecklistMT } from '@/hooks/multitenant/useChecklistDailyMT';
import { useChecklistDailyMT } from '@/hooks/multitenant/useChecklistDailyMT';
import { useChecklistStreaksMT } from '@/hooks/multitenant/useChecklistStreaksMT';
import { useGamificationProfile } from '@/hooks/multitenant/useGamificationMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { DAILY_STATUS_LABELS, DAILY_STATUS_COLORS } from '@/types/checklist';
import { formatSeconds } from '@/hooks/multitenant/useChecklistTimerMT';

export default function ChecklistDashboard() {
  const { franchise, accessLevel } = useTenantContext();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Meu checklist
  const { data: meuChecklist, isLoading: loadingMeu } = useMeuChecklistMT(today);
  const { myStreak } = useChecklistStreaksMT();
  const { data: gamProfile } = useGamificationProfile();

  // Equipe (gestor)
  const isGestor = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';
  const { data: equipeList, isLoading: loadingEquipe } = useChecklistDailyMT({
    data: today,
    franchise_id: franchise?.id,
  });

  // Calcular métricas
  const meuTotal = meuChecklist?.reduce((s, d) => s + d.total_items, 0) || 0;
  const meuConcluido = meuChecklist?.reduce((s, d) => s + d.items_concluidos, 0) || 0;
  const meuPercent = meuTotal > 0 ? Math.round((meuConcluido / meuTotal) * 100) : 0;

  const equipeTotal = equipeList?.length || 0;
  const equipeConcluidos = equipeList?.filter(d => d.status === 'concluido').length || 0;
  const equipeAvg = equipeTotal > 0
    ? Math.round(equipeList!.reduce((s, d) => s + d.percentual_conclusao, 0) / equipeTotal)
    : 0;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Dashboard Checklist
          </h1>
          <p className="text-sm text-muted-foreground">Visão geral do dia</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meu Progresso</p>
                <p className="text-2xl font-bold">{meuPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold">{myStreak?.streak_atual || 0} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">XP Total</p>
                <p className="text-2xl font-bold">{gamProfile?.total_xp || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isGestor && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipe Média</p>
                  <p className="text-2xl font-bold">{equipeAvg}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meu Checklist Hoje */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meu Checklist Hoje</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/checklist/diario">
                  Ver tudo <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMeu ? (
              <Skeleton className="h-40" />
            ) : !meuChecklist?.length ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Nenhum checklist para hoje
              </p>
            ) : (
              <div className="space-y-4">
                {meuChecklist.map(daily => (
                  <div key={daily.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: daily.template?.cor || '#6366F1' }}
                        />
                        <span className="font-medium text-sm">{daily.template?.nome}</span>
                      </div>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: DAILY_STATUS_COLORS[daily.status],
                          color: DAILY_STATUS_COLORS[daily.status],
                        }}
                      >
                        {DAILY_STATUS_LABELS[daily.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={daily.percentual_conclusao} className="h-2 flex-1" />
                      <span className="text-sm font-mono w-10 text-right">
                        {Math.round(daily.percentual_conclusao)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{daily.items_concluidos}/{daily.total_items} itens</span>
                      {daily.items?.some(i => i.has_nao_conformidade) && (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {daily.items.filter(i => i.has_nao_conformidade).length} NC
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipe (gestor) */}
        {isGestor && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Equipe — Hoje</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/checklist/diario/gestor">
                    Gerenciar <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEquipe ? (
                <Skeleton className="h-40" />
              ) : !equipeList?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Nenhum checklist gerado para hoje
                </p>
              ) : (
                <div className="space-y-3">
                  {equipeList.map(daily => (
                    <div key={daily.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{daily.user?.nome || '—'}</span>
                          <span className="text-xs font-mono ml-2">
                            {Math.round(daily.percentual_conclusao)}%
                          </span>
                        </div>
                        <Progress value={daily.percentual_conclusao} className="h-1.5" />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 flex-shrink-0"
                        style={{
                          borderColor: DAILY_STATUS_COLORS[daily.status],
                          color: DAILY_STATUS_COLORS[daily.status],
                        }}
                      >
                        {DAILY_STATUS_LABELS[daily.status]}
                      </Badge>
                    </div>
                  ))}
                  <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                    {equipeConcluidos}/{equipeTotal} concluídos • Média {equipeAvg}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
