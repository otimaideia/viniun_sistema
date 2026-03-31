import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Plus, BookOpen, Layers, Clock,
  Users, Star, CheckCircle2, Loader2, ChevronDown, ChevronRight,
  FileQuestion, Eye, EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingTrackMT, useTrainingTracksMT } from '@/hooks/multitenant/useTrainingTracksMT';
import { TRACK_NIVEL_CONFIG, LESSON_TIPO_CONFIG } from '@/types/treinamento';

export default function TrainingTrackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: track, isLoading } = useTrainingTrackMT(id);
  const { deleteTrack, togglePublish } = useTrainingTracksMT();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTrack.mutateAsync(id);
      navigate('/treinamentos/trilhas');
    } catch {
      // handled by toast
    }
  };

  const handleTogglePublish = async () => {
    if (!id || !track) return;
    try {
      await togglePublish.mutateAsync({ id, is_published: !track.is_published });
    } catch {
      // handled by toast
    }
  };

  if (isLoading || isTenantLoading) {
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
          <Link to="/treinamentos/trilhas">
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
  const modules = track.modules || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/treinamentos/trilhas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: track.cor || '#6366f1' }}
            >
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{track.titulo}</h1>
              <p className="text-sm text-muted-foreground">{track.codigo}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0`}
                >
                  {nivelConfig.label}
                </Badge>
                <Badge variant={track.is_published ? 'default' : 'secondary'}>
                  {track.is_published ? 'Publicada' : 'Rascunho'}
                </Badge>
                {track.is_obrigatoria && (
                  <Badge variant="destructive">Obrigatoria</Badge>
                )}
                {track.is_sequencial && (
                  <Badge variant="outline">Sequencial</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleTogglePublish}>
            {track.is_published ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" /> Despublicar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" /> Publicar
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/treinamentos/trilhas/${id}/editar`}>
              <Edit className="h-4 w-4 mr-1" /> Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir trilha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao ira remover a trilha "{track.titulo}" e todos os seus
                  modulos e aulas. Essa acao nao pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Description */}
      {track.descricao && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{track.descricao}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold">{track.modules_count || 0}</p>
              <p className="text-xs text-muted-foreground">Modulos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold">{track.lessons_count || 0}</p>
              <p className="text-xs text-muted-foreground">Aulas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-lg font-bold">{track.total_xp}</p>
              <p className="text-xs text-muted-foreground">XP Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-lg font-bold">
                {track.duracao_estimada_horas || '-'}h
              </p>
              <p className="text-xs text-muted-foreground">Duracao</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modulos</h2>
          <Button size="sm" asChild>
            <Link to={`/treinamentos/trilhas/${id}/modulos/novo`}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Modulo
            </Link>
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <Layers className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                Nenhum modulo adicionado ainda.
              </p>
              <Button size="sm" asChild>
                <Link to={`/treinamentos/trilhas/${id}/modulos/novo`}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Modulo
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          modules.map((mod, index) => {
            const isOpen = openModules[mod.id] ?? false;
            const lessons = mod.lessons || [];

            return (
              <Collapsible key={mod.id} open={isOpen} onOpenChange={() => toggleModule(mod.id)}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <CardTitle className="text-sm">
                              {index + 1}. {mod.titulo}
                            </CardTitle>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{mod.lessons_count || 0} aulas</span>
                              {mod.has_quiz && (
                                <span className="flex items-center gap-1">
                                  <FileQuestion className="h-3 w-3" /> Quiz
                                </span>
                              )}
                              <span>{mod.xp_completar} XP</span>
                              {!mod.is_published && (
                                <Badge variant="secondary" className="text-xs py-0">
                                  Rascunho
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/treinamentos/trilhas/${id}/modulos/${mod.id}/editar`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {mod.descricao && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {mod.descricao}
                        </p>
                      )}

                      {/* Lessons list */}
                      {lessons.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma aula neste modulo.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {lessons
                            .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem)
                            .map((lesson: Record<string, unknown>, lIndex: number) => {
                              const tipoConfig =
                                LESSON_TIPO_CONFIG[lesson.tipo as keyof typeof LESSON_TIPO_CONFIG];
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-2 rounded border text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground w-5 text-right">
                                      {lIndex + 1}.
                                    </span>
                                    <span>{lesson.titulo}</span>
                                    <Badge variant="outline" className="text-xs py-0">
                                      {tipoConfig?.label || lesson.tipo}
                                    </Badge>
                                    {!lesson.is_published && (
                                      <Badge variant="secondary" className="text-xs py-0">
                                        Rascunho
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lesson.duracao_estimada_min && (
                                      <span className="text-xs text-muted-foreground">
                                        {lesson.duracao_estimada_min}min
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.xp_completar} XP
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                                      <Link
                                        to={`/treinamentos/aulas/${lesson.id}/editar?moduleId=${mod.id}&trackId=${id}`}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Add lesson button */}
                      <div className="mt-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to={`/treinamentos/aulas/novo?moduleId=${mod.id}&trackId=${id}`}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Aula
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
