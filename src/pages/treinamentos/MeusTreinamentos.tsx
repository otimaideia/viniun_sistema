import { Link } from 'react-router-dom';
import {
  BookOpen, Star, Flame, Trophy, ArrowRight, Clock,
  CheckCircle2, PlayCircle, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantContext } from '@/contexts/TenantContext';
import { useMyEnrollmentsMT } from '@/hooks/multitenant/useTrainingProgressMT';
import { usePublishedTracksMT } from '@/hooks/multitenant/useTrainingTracksMT';
import { useGamificationProfile } from '@/hooks/multitenant/useGamificationMT';
import { TRACK_NIVEL_CONFIG } from '@/types/treinamento';

export default function MeusTreinamentos() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const { enrollments, isLoading: isEnrollLoading } = useMyEnrollmentsMT();
  const { data: publishedTracks, isLoading: isTracksLoading } = usePublishedTracksMT();
  const { profile, isLoading: isProfileLoading } = useGamificationProfile();

  const isLoading = isTenantLoading || isEnrollLoading;

  // Separate active from completed
  const activeEnrollments = enrollments.filter((e) => e.status === 'ativo');
  const completedEnrollments = enrollments.filter((e) => e.status === 'concluido');

  // Available tracks (not enrolled)
  const enrolledTrackIds = new Set(enrollments.map((e) => e.track_id));
  const availableTracks = (publishedTracks || []).filter(
    (t) => !enrolledTrackIds.has(t.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Meu Aprendizado
        </h1>
        <p className="text-muted-foreground">
          Acompanhe seu progresso nos treinamentos
        </p>
      </div>

      {/* XP Summary */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-lg font-bold">{profile.total_xp}</p>
                <p className="text-xs text-muted-foreground">XP Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold">Nv. {profile.level}</p>
                <p className="text-xs text-muted-foreground">{profile.rank_name}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{profile.current_streak}</p>
                <p className="text-xs text-muted-foreground">Streak Atual</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-bold">
                  {profile.total_tracks_completed}
                </p>
                <p className="text-xs text-muted-foreground">Trilhas Concluidas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Enrollments */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Em Andamento</h2>
        {activeEnrollments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <PlayCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Voce nao esta matriculado em nenhuma trilha.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeEnrollments.map((enrollment) => {
              const track = enrollment.track;
              if (!track) return null;
              const nivelConfig = TRACK_NIVEL_CONFIG[track.nivel];
              return (
                <Link
                  key={enrollment.id}
                  to={`/treinamentos/aprender/${track.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: track.cor || '#6366f1' }}
                        >
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {track.titulo}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0 text-xs mt-1`}
                          >
                            {nivelConfig.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Progresso
                          </span>
                          <span className="font-medium">
                            {enrollment.progresso_pct}%
                          </span>
                        </div>
                        <Progress value={enrollment.progresso_pct} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {track.modules_count || 0} modulos
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Continuar <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed */}
      {completedEnrollments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Concluidas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedEnrollments.map((enrollment) => {
              const track = enrollment.track;
              if (!track) return null;
              return (
                <Card key={enrollment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: track.cor || '#6366f1' }}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{track.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          Concluida em{' '}
                          {enrollment.completed_at
                            ? new Date(
                                enrollment.completed_at
                              ).toLocaleDateString('pt-BR')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Tracks */}
      {availableTracks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Trilhas Disponiveis</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTracks.map((track) => {
              const nivelConfig = TRACK_NIVEL_CONFIG[track.nivel];
              return (
                <Link
                  key={track.id}
                  to={`/treinamentos/aprender/${track.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: track.cor || '#6366f1' }}
                        >
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{track.titulo}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0 text-xs`}
                            >
                              {nivelConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {track.modules_count || 0} modulos
                            </span>
                          </div>
                        </div>
                      </div>
                      {track.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {track.descricao}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
