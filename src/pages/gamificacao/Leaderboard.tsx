import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useLeaderboard } from '@/hooks/multitenant/useGamificationMT';
import type { LeaderboardPeriodo, MTLeaderboardEntry } from '@/types/treinamento';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Medal, Trophy, Crown, TrendingUp } from 'lucide-react';

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getPodiumColor(position: number): { bg: string; border: string; text: string; icon: string } {
  switch (position) {
    case 1:
      return { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', icon: 'text-yellow-500' };
    case 2:
      return { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700', icon: 'text-gray-400' };
    case 3:
      return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', icon: 'text-orange-400' };
    default:
      return { bg: 'bg-white', border: 'border-muted', text: 'text-foreground', icon: 'text-muted-foreground' };
  }
}

function getPodiumIcon(position: number) {
  switch (position) {
    case 1:
      return Crown;
    case 2:
      return Medal;
    case 3:
      return Medal;
    default:
      return TrendingUp;
  }
}

const PERIODO_LABELS: Record<LeaderboardPeriodo, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  total: 'Total',
};

// ============================================================
// Podium Card Component
// ============================================================

function PodiumCard({ entry, position }: { entry: MTLeaderboardEntry; position: number }) {
  const colors = getPodiumColor(position);
  const Icon = getPodiumIcon(position);
  const size = position === 1 ? 'h-44' : 'h-36';

  return (
    <Card className={`${colors.bg} border-2 ${colors.border} ${size} flex flex-col items-center justify-center relative overflow-hidden`}>
      {position === 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300" />
      )}
      <Icon className={`h-6 w-6 ${colors.icon} mb-1`} />
      <div className={`text-2xl font-bold ${colors.text}`}>#{position}</div>
      <Avatar className="h-12 w-12 my-2">
        <AvatarFallback className={`${colors.bg} ${colors.text} text-sm font-bold`}>
          {getInitials(entry.user_name)}
        </AvatarFallback>
      </Avatar>
      <p className="font-semibold text-sm text-center px-2 truncate max-w-full">
        {entry.user_name || 'Anônimo'}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-yellow-600 font-bold text-sm">{entry.xp.toLocaleString('pt-BR')} XP</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <Badge variant="secondary" className="text-xs">
          Nv. {entry.level}
        </Badge>
        {entry.rank_name && (
          <span className="text-xs text-muted-foreground">{entry.rank_name}</span>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// Component
// ============================================================

export default function Leaderboard() {
  const { user, isLoading: isTenantLoading } = useTenantContext();
  const [periodo, setPeriodo] = useState<LeaderboardPeriodo>('total');
  const { data: entries, isLoading } = useLeaderboard(periodo);

  const loading = isTenantLoading || isLoading;

  const topThree = entries?.slice(0, 3) || [];
  const rest = entries?.slice(3) || [];
  const currentUserId = user?.id;

  // Encontrar posição do usuário atual
  const currentUserEntry = entries?.find((e) => e.user_id === currentUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Ranking
          </h1>
          <p className="text-muted-foreground">Veja quem está liderando a jornada de aprendizado</p>
        </div>
        <Link to="/gamificacao">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            Meu Perfil
          </Badge>
        </Link>
      </div>

      {/* Period Tabs */}
      <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as LeaderboardPeriodo)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {(Object.keys(PERIODO_LABELS) as LeaderboardPeriodo[]).map((p) => (
            <TabsTrigger key={p} value={p}>
              {PERIODO_LABELS[p]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(PERIODO_LABELS) as LeaderboardPeriodo[]).map((p) => (
          <TabsContent key={p} value={p} className="space-y-6 mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !entries?.length ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>Nenhum participante neste período.</p>
                  <p className="text-sm mt-1">Complete atividades para aparecer no ranking!</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Current User Position */}
                {currentUserEntry && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">#{currentUserEntry.posicao}</span>
                        <span className="text-sm">Sua posição</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-yellow-600">
                          {currentUserEntry.xp.toLocaleString('pt-BR')} XP
                        </span>
                        <Badge variant="secondary">Nv. {currentUserEntry.level}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Podium */}
                {topThree.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 items-end">
                    {/* 2nd place */}
                    {topThree[1] ? (
                      <PodiumCard entry={topThree[1]} position={2} />
                    ) : (
                      <div />
                    )}
                    {/* 1st place */}
                    {topThree[0] && <PodiumCard entry={topThree[0]} position={1} />}
                    {/* 3rd place */}
                    {topThree[2] ? (
                      <PodiumCard entry={topThree[2]} position={3} />
                    ) : (
                      <div />
                    )}
                  </div>
                )}

                {/* Table for 4+ */}
                {rest.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Classificação</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Pos.</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-center">Nível</TableHead>
                            <TableHead className="text-right">XP</TableHead>
                            <TableHead className="text-center w-24">Badges</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rest.map((entry) => {
                            const isCurrentUser = entry.user_id === currentUserId;
                            return (
                              <TableRow
                                key={entry.id}
                                className={isCurrentUser ? 'bg-primary/5 font-medium' : ''}
                              >
                                <TableCell className="font-bold text-muted-foreground">
                                  #{entry.posicao}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-xs">
                                        {getInitials(entry.user_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className={isCurrentUser ? 'text-primary' : ''}>
                                      {entry.user_name || 'Anônimo'}
                                      {isCurrentUser && ' (você)'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="text-xs">
                                    Nv. {entry.level}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-yellow-600">
                                  {entry.xp.toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-center">
                                  {entry.badges_count > 0 ? (
                                    <Badge variant="outline" className="text-xs">
                                      {entry.badges_count}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
