import { useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingLessonsMT, useTrainingLessonMT } from '@/hooks/multitenant/useTrainingLessonsMT';
import { LESSON_TIPO_CONFIG } from '@/types/treinamento';
import type { LessonTipo, VideoProvider } from '@/types/treinamento';

interface LessonFormData {
  titulo: string;
  descricao: string;
  tipo: LessonTipo;
  conteudo_html: string;
  video_url: string;
  video_provider: VideoProvider | '';
  documento_url: string;
  link_externo: string;
  embed_code: string;
  duracao_estimada_min: number | '';
  xp_completar: number;
  is_published: boolean;
}

export default function TrainingLessonEdit() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!lessonId;
  const { isLoading: isTenantLoading } = useTenantContext();

  const moduleId = searchParams.get('moduleId') || '';
  const trackId = searchParams.get('trackId') || '';

  const { createLesson, updateLesson, isCreating, isUpdating } =
    useTrainingLessonsMT(moduleId || undefined);
  const { data: existingLesson, isLoading: isLessonLoading } =
    useTrainingLessonMT(lessonId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LessonFormData>({
    defaultValues: {
      titulo: '',
      descricao: '',
      tipo: 'video',
      conteudo_html: '',
      video_url: '',
      video_provider: '',
      documento_url: '',
      link_externo: '',
      embed_code: '',
      duracao_estimada_min: '',
      xp_completar: 10,
      is_published: false,
    },
  });

  useEffect(() => {
    if (existingLesson && isEditing) {
      reset({
        titulo: existingLesson.titulo,
        descricao: existingLesson.descricao || '',
        tipo: existingLesson.tipo,
        conteudo_html: existingLesson.conteudo_html || '',
        video_url: existingLesson.video_url || '',
        video_provider: existingLesson.video_provider || '',
        documento_url: existingLesson.documento_url || '',
        link_externo: existingLesson.link_externo || '',
        embed_code: existingLesson.embed_code || '',
        duracao_estimada_min: existingLesson.duracao_estimada_min || '',
        xp_completar: existingLesson.xp_completar,
        is_published: existingLesson.is_published,
      });
    }
  }, [existingLesson, isEditing, reset]);

  const tipo = watch('tipo');
  const isPublished = watch('is_published');

  const onSubmit = async (data: LessonFormData) => {
    const payload = {
      titulo: data.titulo,
      descricao: data.descricao || undefined,
      tipo: data.tipo,
      conteudo_html: data.tipo === 'texto' ? data.conteudo_html : undefined,
      video_url: data.tipo === 'video' ? data.video_url : undefined,
      video_provider: data.tipo === 'video' && data.video_provider
        ? data.video_provider
        : undefined,
      documento_url: data.tipo === 'documento' ? data.documento_url : undefined,
      link_externo: data.tipo === 'link_externo' ? data.link_externo : undefined,
      embed_code: data.tipo === 'embed' ? data.embed_code : undefined,
      duracao_estimada_min: data.duracao_estimada_min
        ? Number(data.duracao_estimada_min)
        : undefined,
      xp_completar: data.xp_completar,
      is_published: data.is_published,
    };

    try {
      if (isEditing && lessonId) {
        await updateLesson.mutateAsync({ id: lessonId, ...payload });
      } else {
        await createLesson.mutateAsync({ module_id: moduleId, ...payload });
      }
      if (trackId) {
        navigate(`/treinamentos/trilhas/${trackId}`);
      } else {
        navigate(-1);
      }
    } catch {
      // handled by toast
    }
  };

  const isSaving = isCreating || isUpdating;

  if (isEditing && isLessonLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const backUrl = trackId
    ? `/treinamentos/trilhas/${trackId}`
    : '/treinamentos/trilhas';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backUrl}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Aula' : 'Nova Aula'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Altere os dados da aula'
              : 'Adicione uma nova aula ao modulo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes da Aula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Introducao ao Painel"
                {...register('titulo', { required: 'Titulo e obrigatorio' })}
              />
              {errors.titulo && (
                <p className="text-xs text-destructive">{errors.titulo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o conteudo da aula..."
                rows={2}
                {...register('descricao')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Conteudo</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setValue('tipo', v as LessonTipo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LESSON_TIPO_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao_estimada_min">Duracao (min)</Label>
                <Input
                  id="duracao_estimada_min"
                  type="number"
                  min={0}
                  placeholder="Ex: 15"
                  {...register('duracao_estimada_min')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xp_completar">XP ao Completar</Label>
                <Input
                  id="xp_completar"
                  type="number"
                  min={0}
                  {...register('xp_completar', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content based on tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteudo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tipo === 'video' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="video_url">URL do Video *</Label>
                  <Input
                    id="video_url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    {...register('video_url')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provedor do Video</Label>
                  <Select
                    value={watch('video_provider') || ''}
                    onValueChange={(v) =>
                      setValue('video_provider', v as VideoProvider)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="supabase">Supabase Storage</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {tipo === 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="conteudo_html">Conteudo (HTML)</Label>
                <Textarea
                  id="conteudo_html"
                  placeholder="<h2>Titulo</h2><p>Conteudo da aula...</p>"
                  rows={12}
                  className="font-mono text-sm"
                  {...register('conteudo_html')}
                />
                <p className="text-xs text-muted-foreground">
                  Suporta HTML basico: h2, h3, p, ul, ol, li, strong, em, a, img
                </p>
              </div>
            )}

            {tipo === 'documento' && (
              <div className="space-y-2">
                <Label htmlFor="documento_url">URL do Documento</Label>
                <Input
                  id="documento_url"
                  placeholder="https://... (PDF, DOC, etc)"
                  {...register('documento_url')}
                />
              </div>
            )}

            {tipo === 'link_externo' && (
              <div className="space-y-2">
                <Label htmlFor="link_externo">URL Externa</Label>
                <Input
                  id="link_externo"
                  placeholder="https://..."
                  {...register('link_externo')}
                />
              </div>
            )}

            {tipo === 'embed' && (
              <div className="space-y-2">
                <Label htmlFor="embed_code">Codigo de Incorporacao</Label>
                <Textarea
                  id="embed_code"
                  placeholder='<iframe src="..." />'
                  rows={6}
                  className="font-mono text-sm"
                  {...register('embed_code')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Publicada</Label>
                <p className="text-xs text-muted-foreground">
                  Visivel para colaboradores
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(v) => setValue('is_published', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to={backUrl}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Aula'}
          </Button>
        </div>
      </form>
    </div>
  );
}
