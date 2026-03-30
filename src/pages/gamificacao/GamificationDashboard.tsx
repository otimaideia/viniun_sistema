import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useGamificationProfile, useLevels, useXPHistory, useRecentBadges } from '@/hooks/multitenant/useGamificationMT';
import { BADGE_RARIDADE_CONFIG, XP_SOURCE_LABELS } from '@/types/treinamento';
import type { XPSource } from '@/types/treinamento';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Star, Zap, BookOpen, Award, Clock, Target } from 'lucide-react';

// ============================================================
// Helpers
// ============================================================

function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLevelGradient(level: number): string {
  if (level <= 3) return 'from-green-400 to-emerald-500';
  if (level <= 6) return 'from-blue-400 to-cyan-500';
  if (level <= 9) return 'from-purple-400 to-violet-500';
  if (level <= 12) return 'from-orange-400 to-amber-500';
  return 'from-yellow-400 to-red-500';
}

function getLevelBgColor(level: number): string {
  if (level <= 3) return 'bg-green-100 text-green-700 border-green-300';
  if (level <= 6) return 'bg-blue-100 text-blue-700 border-blue-300';
  if (level <= 9) return 'bg-purple-100 text-purple-700 border-purple-300';
  if (level <= 12) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-yellow-100 text-yellow-700 border-yellow-300';
}

// ============================================================
// Component
// ============================================================

export default function GamificationDashboard() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: profile, isLoading: isProfileLoading } = useGamificationProfile();
  const { data: levels } = useLevels();
  const { data: xpHistory, isLoading: isXPLoading } = useXPHistory(10);
  const { data: recentBadges, isLoading: isBadgesLoading } = useRecentBadges(5);

  const isLoading = isTenantLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p>Perfil de gamificação não encontrado.</p>
        <p className="text-sm mt-1">Complete sua primeira atividade para começar!</p>
      </div>
    );
  }

  // Calcular XP para o próximo nível
  const currentLevel = levels?.find((l) => l.level === profile.level);
  const nextLevel = levels?.find((l) => l.level === profile.level + 1);
  const currentLevelXP = currentLevel?.xp_required || 0;
  const nextLevelXP = nextLevel?.xp_required || currentLevelXP + 500;
  const xpInLevel = profile.total_xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPct = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;
  const xpToNext = nextLevelXP - profile.total_xp;

  const stats = [
    { label: 'Aulas Concluídas', value: profile.total_lessons_completed, icon: BookOpen, color: 'text-blue-500' },
    { label: 'Módulos', value: profile.total_modules_completed, icon: Target, color: 'text-green-500' },
    { label: 'Trilhas', value: profile.total_tracks_completed, icon: Award, color: 'text-purple-500' },
    { label: 'Quizzes Aprovados', value: profile.total_quizzes_passed, icon: Star, color: 'text-yellow-500' },
    { label: 'Tempo de Estudo', value: formatStudyTime(profile.total_study_time_min), icon: Clock, color: 'text-orange-500' },
    { label: 'Certificados', value: profile.total_certificates, icon: Trophy, color: 'text-pink-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minha Jornada</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso e conquistas</p>
        </div>
        <div className="flex gap-2">
          <Link to="/gamificacao/conquistas">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              <Award className="h-3 w-3 mr-1" /> Badges
            </Badge>
          </Link>
          <Link to="/gamificacao/ranking">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              <Trophy className="h-3 w-3 mr-1" /> Ranking
            </Badge>
          </Link>
          <Link to="/gamificacao/historico">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              <Zap className="h-3 w-3 mr-1" /> Histórico XP
            </Badge>
          </Link>
        </div>
      </div>

      {/* Level + XP Bar + Streak */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Level Badge */}
            <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 ${getLevelBgColor(profile.level)}`}>
              <span className="text-3xl font-bold">{profile.level}</span>
              <span className="text-xs font-medium">{profile.rank_name}</span>
            </div>

            {/* XP Bar */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-bold">{profile.total_xp.toLocaleString('pt-BR')} XP</span>
                </div>
                {nextLevel && (
                  <span className="text-sm text-muted-foreground">
                    {xpToNext > 0 ? `${xpToNext.toLocaleString('pt-BR')} XP para o próximo nível` : 'Nível máximo!'}
                  </span>
                )}
              </div>
              <div className="relative h-6 rounded-full bg-muted overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getLevelGradient(profile.level)} transition-all duration-1000 ease-out`}
                  style={{ width: `${progressPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {Math.round(progressPct)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Nível {profile.level} ({currentLevelXP.toLocaleString('pt-BR')} XP)</span>
                {nextLevel && <span>Nível {nextLevel.level} ({nextLevelXP.toLocaleString('pt-BR')} XP)</span>}
              </div>
            </div>

            {/* Streak */}
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-orange-50 border-2 border-orange-200">
              <Flame className={`h-8 w-8 ${profile.current_streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
              <span className="text-2xl font-bold text-orange-600">{profile.current_streak}</span>
              <span className="text-xs text-orange-500">dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Section: XP History + Recent Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              XP Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isXPLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : !xpHistory?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade ainda. Comece uma trilha!
              </p>
            ) : (
              <div className="space-y-3">
                {xpHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-green-600 font-bold whitespace-nowrap">+{entry.amount} XP</span>
                      <span className="text-muted-foreground truncate">
                        {XP_SOURCE_LABELS[entry.source as XPSource] || entry.source}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                ))}
                <Link
                  to="/gamificacao/historico"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  Ver histórico completo
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Badges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Badges Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBadgesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : !recentBadges?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum badge conquistado ainda. Continue estudando!
              </p>
            ) : (
              <div className="space-y-3">
                {recentBadges.map((ub) => {
                  const badge = ub.badge;
                  if (!badge) return null;
                  const raridadeConfig = BADGE_RARIDADE_CONFIG[badge.raridade];

                  return (
                    <div key={ub.id} className="flex items-center gap-3">
                      <span className="text-2xl">{badge.icone_emoji || '🏆'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{badge.nome}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${raridadeConfig.color} ${raridadeConfig.bgColor}`}>
                            {raridadeConfig.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ub.earned_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 font-bold">+{badge.xp_reward} XP</span>
                    </div>
                  );
                })}
                <Link
                  to="/gamificacao/conquistas"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  Ver todas as badges
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
