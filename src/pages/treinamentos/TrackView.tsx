import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Layers, CheckCircle2, Circle, Lock,
  PlayCircle, Clock, Star, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingTrackMT } from '@/hooks/multitenant/useTrainingTracksMT';
import { useTrackProgressMT, useEnrollMT } from '@/hooks/multitenant/useTrainingProgressMT';
import { TRACK_NIVEL_CONFIG, LESSON_TIPO_CONFIG } from '@/types/treinamento';

export default function TrackView() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: track, isLoading: isTrackLoading } = useTrainingTrackMT(trackId);
  const {
    enrollment,
    lessonsProgress,
    isLoading: isProgressLoading,
  } = useTrackProgressMT(trackId);
  const { enroll: enrollMutation } = useEnrollMT();

  const isLoading = isTenantLoading || isTrackLoading || isProgressLoading;

  // Build progress map
  const progressMap = useMemo(() => {
    const map = new Map<string, 'concluido' | 'em_andamento' | 'nao_iniciado'>();
    for (const lp of lessonsProgress) {
      map.set(lp.lesson_id, lp.status);
    }
    return map;
  }, [lessonsProgress]);

  // Find next incomplete lesson
  const nextLesson = useMemo(() => {
    if (!track?.modules) return null;
    for (const mod of track.modules) {
      const lessons = (mod.lessons || [])
        .filter((l: { is_published?: boolean; id?: string; ordem?: number }) => l.is_published)
        .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
      for (const lesson of lessons) {
        const status = progressMap.get(lesson.id);
        if (status !== 'concluido') return lesson;
      }
    }
    return null;
  }, [track, progressMap]);

  const handleEnroll = async () => {
    if (!trackId) return;
    try {
      await enrollMutation.mutateAsync(trackId);
    } catch {
      // handled by toast
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/treinamentos/meus">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Trilha nao encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nivelConfig = TRACK_NIVEL_CONFIG[track.nivel];
  const modules = (track.modules || []).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
  const progressPct = enrollment?.progresso_pct ?? 0;
  const isEnrolled = !!enrollment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/treinamentos/meus">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: track.cor || '#6366f1' }}
            >
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{track.titulo}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0`}
                >
                  {nivelConfig.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {track.modules_count || 0} modulos
                </span>
                {track.duracao_estimada_horas && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    ~{track.duracao_estimada_horas}h
                  </span>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  {track.total_xp} XP
                </span>
              </div>
            </div>
          </div>

          {track.descricao && (
            <p className="text-sm text-muted-foreground mt-3">
              {track.descricao}
            </p>
          )}

          {/* Progress Bar or Enroll */}
          <div className="mt-4">
            {isEnrolled ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-3" />
                {nextLesson && (
                  <Button className="mt-2" asChild>
                    <Link
                      to={`/treinamentos/aulas/${nextLesson.id}/aprender`}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Continuar: {nextLesson.titulo}
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Matricular-se
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modules & Lessons */}
      <div className="space-y-4">
        {modules.map((mod: Record<string, unknown>, mIndex: number) => {
          const lessons = (mod.lessons || [])
            .filter((l: { is_published?: boolean; id?: string; ordem?: number }) => l.is_published)
            .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);

          const completedLessons = lessons.filter(
            (l: { id: string }) => progressMap.get(l.id) === 'concluido'
          ).length;
          const moduleCompleted = lessons.length > 0 && completedLessons === lessons.length;

          return (
            <Card key={mod.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {moduleCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span>
                      Modulo {mIndex + 1}: {mod.titulo}
                    </span>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {completedLessons}/{lessons.length} aulas
                  </span>
                </div>
                {mod.descricao && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {mod.descricao}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {lessons.map((lesson: Record<string, unknown>, lIndex: number) => {
                    const status = progressMap.get(lesson.id) || 'nao_iniciado';
                    const isCompleted = status === 'concluido';
                    const isLocked =
                      track.is_sequencial &&
                      lIndex > 0 &&
                      progressMap.get(lessons[lIndex - 1]?.id) !== 'concluido';

                    const tipoConfig =
                      LESSON_TIPO_CONFIG[
                        lesson.tipo as keyof typeof LESSON_TIPO_CONFIG
                      ];

                    return (
                      <div key={lesson.id}>
                        {isLocked && !isEnrolled ? (
                          <div className="flex items-center gap-3 p-2 rounded text-sm text-muted-foreground opacity-50">
                            <Lock className="h-4 w-4" />
                            <span>{lesson.titulo}</span>
                          </div>
                        ) : (
                          <Link
                            to={`/treinamentos/aulas/${lesson.id}/aprender`}
                            className={`flex items-center justify-between p-2 rounded text-sm hover:bg-accent transition-colors ${
                              isCompleted ? 'text-muted-foreground' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span>{lesson.titulo}</span>
                              <Badge
                                variant="outline"
                                className="text-xs py-0"
                              >
                                {tipoConfig?.label || lesson.tipo}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {lesson.duracao_estimada_min && (
                                <span>{lesson.duracao_estimada_min}min</span>
                              )}
                              <span>{lesson.xp_completar} XP</span>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
