import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, BookOpen,
  Play, FileText, ExternalLink, Code, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingLessonMT } from '@/hooks/multitenant/useTrainingLessonsMT';
import { useCompleteLessonMT, useTrackProgressMT } from '@/hooks/multitenant/useTrainingProgressMT';
import { useTrainingModuleMT } from '@/hooks/multitenant/useTrainingModulesMT';
import { LESSON_TIPO_CONFIG } from '@/types/treinamento';

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: lesson, isLoading: isLessonLoading } = useTrainingLessonMT(lessonId);
  const completeMutation = useCompleteLessonMT();

  // Load module to get sibling lessons for nav
  const moduleId = lesson?.module_id;
  const { data: moduleDetail } = useTrainingModuleMT(moduleId);

  // Find prev/next lessons
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!moduleDetail?.lessons || !lessonId) return { prevLesson: null, nextLesson: null };
    const lessons = moduleDetail.lessons
      .filter((l: { is_published?: boolean; id?: string; ordem?: number }) => l.is_published)
      .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
    const currentIndex = lessons.findIndex((l: { id: string }) => l.id === lessonId);
    return {
      prevLesson: currentIndex > 0 ? lessons[currentIndex - 1] : null,
      nextLesson: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null,
    };
  }, [moduleDetail, lessonId]);

  // Track progress for marking complete
  const trackId = moduleDetail?.track?.id;
  const { lessonsProgress } = useTrackProgressMT(trackId);
  const isCompleted = lessonsProgress.some(
    (lp) => lp.lesson_id === lessonId && lp.status === 'concluido'
  );

  const handleComplete = async () => {
    if (!lessonId) return;
    try {
      await completeMutation.mutateAsync(lessonId);
    } catch {
      // handled by toast
    }
  };

  const isLoading = isTenantLoading || isLessonLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson) {
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
            <p className="text-lg font-medium">Aula nao encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipoConfig = LESSON_TIPO_CONFIG[lesson.tipo];
  const backUrl = trackId
    ? `/treinamentos/aprender/${trackId}`
    : '/treinamentos/meus';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backUrl}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{lesson.titulo}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {tipoConfig?.label || lesson.tipo}
            </Badge>
            {lesson.duracao_estimada_min && (
              <span className="text-xs text-muted-foreground">
                {lesson.duracao_estimada_min} min
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {lesson.xp_completar} XP
            </span>
            {isCompleted && (
              <Badge variant="default" className="text-xs bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluida
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {lesson.descricao && (
        <p className="text-sm text-muted-foreground">{lesson.descricao}</p>
      )}

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Video */}
          {lesson.tipo === 'video' && lesson.video_url && (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              {lesson.video_provider === 'youtube' ||
              getYouTubeId(lesson.video_url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(lesson.video_url)}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.titulo}
                />
              ) : lesson.video_provider === 'vimeo' ||
                getVimeoId(lesson.video_url) ? (
                <iframe
                  src={`https://player.vimeo.com/video/${getVimeoId(lesson.video_url)}`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={lesson.titulo}
                />
              ) : (
                <video
                  src={lesson.video_url}
                  controls
                  className="w-full h-full"
                >
                  Seu navegador nao suporta video HTML5.
                </video>
              )}
            </div>
          )}

          {/* Text content */}
          {lesson.tipo === 'texto' && lesson.conteudo_html && (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: lesson.conteudo_html }}
            />
          )}

          {/* Document */}
          {lesson.tipo === 'documento' && lesson.documento_url && (
            <div className="flex flex-col items-center gap-4 py-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {lesson.documento_nome || 'Documento'}
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <a
                    href={lesson.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Documento
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={lesson.documento_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* External Link */}
          {lesson.tipo === 'link_externo' && lesson.link_externo && (
            <div className="flex flex-col items-center gap-4 py-8">
              <ExternalLink className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Conteudo externo
              </p>
              <Button asChild>
                <a
                  href={lesson.link_externo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Conteudo
                </a>
              </Button>
            </div>
          )}

          {/* Embed */}
          {lesson.tipo === 'embed' && lesson.embed_code && (
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: lesson.embed_code }}
            />
          )}

          {/* No content */}
          {!lesson.video_url &&
            !lesson.conteudo_html &&
            !lesson.documento_url &&
            !lesson.link_externo &&
            !lesson.embed_code && (
              <div className="flex flex-col items-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Nenhum conteudo disponivel para esta aula.
                </p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Materials */}
      {lesson.materials && lesson.materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Materiais de Apoio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lesson.materials.map((mat: Record<string, unknown>) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{mat.titulo}</span>
                    <Badge variant="outline" className="text-xs py-0">
                      {mat.tipo}
                    </Badge>
                  </div>
                  {mat.arquivo_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={mat.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {prevLesson && (
            <Button variant="outline" asChild>
              <Link to={`/treinamentos/aulas/${prevLesson.id}/aprender`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Link>
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {!isCompleted && (
            <Button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              variant="default"
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Marcar como Concluida
            </Button>
          )}

          {nextLesson && (
            <Button asChild>
              <Link to={`/treinamentos/aulas/${nextLesson.id}/aprender`}>
                Proxima
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
