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
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingModulesMT, useTrainingModuleMT } from '@/hooks/multitenant/useTrainingModulesMT';
import { useTrainingTrackMT } from '@/hooks/multitenant/useTrainingTracksMT';

interface ModuleFormData {
  titulo: string;
  descricao: string;
  ordem: number | '';
  duracao_estimada_min: number | '';
  xp_completar: number;
  nota_minima: number;
  has_quiz: boolean;
  is_published: boolean;
}

export default function TrainingModuleEdit() {
  const { trackId, moduleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!moduleId;
  const { isLoading: isTenantLoading } = useTenantContext();

  const effectiveTrackId = trackId || searchParams.get('trackId') || '';
  const { data: track } = useTrainingTrackMT(effectiveTrackId);
  const { createModule, updateModule, isCreating, isUpdating } = useTrainingModulesMT(effectiveTrackId);
  const { data: existingModule, isLoading: isModuleLoading } = useTrainingModuleMT(moduleId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ModuleFormData>({
    defaultValues: {
      titulo: '',
      descricao: '',
      ordem: '',
      duracao_estimada_min: '',
      xp_completar: 50,
      nota_minima: 70,
      has_quiz: false,
      is_published: false,
    },
  });

  useEffect(() => {
    if (existingModule && isEditing) {
      reset({
        titulo: existingModule.titulo,
        descricao: existingModule.descricao || '',
        ordem: existingModule.ordem,
        duracao_estimada_min: existingModule.duracao_estimada_min || '',
        xp_completar: existingModule.xp_completar,
        nota_minima: existingModule.nota_minima,
        has_quiz: existingModule.has_quiz,
        is_published: existingModule.is_published,
      });
    }
  }, [existingModule, isEditing, reset]);

  const onSubmit = async (data: ModuleFormData) => {
    const payload = {
      ...data,
      ordem: data.ordem ? Number(data.ordem) : undefined,
      duracao_estimada_min: data.duracao_estimada_min
        ? Number(data.duracao_estimada_min)
        : undefined,
    };

    try {
      if (isEditing && moduleId) {
        await updateModule.mutateAsync({ id: moduleId, ...payload });
      } else {
        await createModule.mutateAsync({
          track_id: effectiveTrackId,
          ...payload,
        });
      }
      navigate(`/treinamentos/trilhas/${effectiveTrackId}`);
    } catch {
      // handled by toast
    }
  };

  const isSaving = isCreating || isUpdating;
  const hasQuiz = watch('has_quiz');
  const isPublished = watch('is_published');

  if (isEditing && isModuleLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const backUrl = `/treinamentos/trilhas/${effectiveTrackId}`;

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
            {isEditing ? 'Editar Modulo' : 'Novo Modulo'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {track ? `Trilha: ${track.titulo}` : 'Carregando trilha...'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes do Modulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Introducao ao Sistema"
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
                placeholder="Descreva o conteudo deste modulo..."
                rows={3}
                {...register('descricao')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input
                  id="ordem"
                  type="number"
                  min={1}
                  placeholder="Auto"
                  {...register('ordem')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracao_estimada_min">Duracao (minutos)</Label>
                <Input
                  id="duracao_estimada_min"
                  type="number"
                  min={0}
                  placeholder="Ex: 60"
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

            <div className="space-y-2">
              <Label htmlFor="nota_minima">Nota Minima (%)</Label>
              <Input
                id="nota_minima"
                type="number"
                min={0}
                max={100}
                {...register('nota_minima', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuracoes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Possui Quiz</Label>
                <p className="text-xs text-muted-foreground">
                  Este modulo tera um quiz de avaliacao
                </p>
              </div>
              <Switch
                checked={hasQuiz}
                onCheckedChange={(v) => setValue('has_quiz', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Publicado</Label>
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
            {isEditing ? 'Salvar Alteracoes' : 'Criar Modulo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
