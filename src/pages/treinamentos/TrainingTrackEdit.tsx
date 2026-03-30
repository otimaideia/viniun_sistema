import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { useTrainingTracksMT, useTrainingTrackMT } from '@/hooks/multitenant/useTrainingTracksMT';
import { TRACK_NIVEL_CONFIG } from '@/types/treinamento';
import type { TrackNivel } from '@/types/treinamento';

interface TrackFormData {
  codigo: string;
  titulo: string;
  descricao: string;
  nivel: TrackNivel;
  duracao_estimada_horas: number | '';
  is_obrigatoria: boolean;
  is_sequencial: boolean;
  is_published: boolean;
  cor: string;
  thumbnail_url: string;
}

export default function TrainingTrackEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { isLoading: isTenantLoading } = useTenantContext();

  const { createTrack, updateTrack, isCreating, isUpdating } = useTrainingTracksMT();
  const { data: existingTrack, isLoading: isLoadingTrack } = useTrainingTrackMT(id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TrackFormData>({
    defaultValues: {
      codigo: '',
      titulo: '',
      descricao: '',
      nivel: 'iniciante',
      duracao_estimada_horas: '',
      is_obrigatoria: false,
      is_sequencial: true,
      is_published: false,
      cor: '#6366f1',
      thumbnail_url: '',
    },
  });

  useEffect(() => {
    if (existingTrack && isEditing) {
      reset({
        codigo: existingTrack.codigo,
        titulo: existingTrack.titulo,
        descricao: existingTrack.descricao || '',
        nivel: existingTrack.nivel,
        duracao_estimada_horas: existingTrack.duracao_estimada_horas || '',
        is_obrigatoria: existingTrack.is_obrigatoria,
        is_sequencial: existingTrack.is_sequencial,
        is_published: existingTrack.is_published,
        cor: existingTrack.cor || '#6366f1',
        thumbnail_url: existingTrack.thumbnail_url || '',
      });
    }
  }, [existingTrack, isEditing, reset]);

  const onSubmit = async (data: TrackFormData) => {
    const payload = {
      ...data,
      duracao_estimada_horas: data.duracao_estimada_horas
        ? Number(data.duracao_estimada_horas)
        : undefined,
    };

    try {
      if (isEditing && id) {
        await updateTrack.mutateAsync({ id, ...payload });
      } else {
        await createTrack.mutateAsync(payload);
      }
      navigate('/treinamentos/trilhas');
    } catch {
      // Errors handled by hook toasts
    }
  };

  const isSaving = isCreating || isUpdating;
  const nivel = watch('nivel');
  const isObrigatoria = watch('is_obrigatoria');
  const isSequencial = watch('is_sequencial');
  const isPublished = watch('is_published');
  const cor = watch('cor');

  if (isEditing && isLoadingTrack) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/treinamentos/trilhas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Trilha' : 'Nova Trilha'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? 'Altere os dados da trilha de treinamento'
              : 'Crie uma nova trilha de treinamento'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes Basicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo *</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: ONBOARDING-2026"
                  {...register('codigo', { required: 'Codigo e obrigatorio' })}
                />
                {errors.codigo && (
                  <p className="text-xs text-destructive">{errors.codigo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Titulo *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Onboarding Colaboradores"
                  {...register('titulo', { required: 'Titulo e obrigatorio' })}
                />
                {errors.titulo && (
                  <p className="text-xs text-destructive">{errors.titulo.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo desta trilha..."
                rows={3}
                {...register('descricao')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuracoes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select
                  value={nivel}
                  onValueChange={(v) => setValue('nivel', v as TrackNivel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRACK_NIVEL_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao">Duracao Estimada (horas)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Ex: 8"
                  {...register('duracao_estimada_horas')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="cor"
                    value={cor}
                    onChange={(e) => setValue('cor', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={cor}
                    onChange={(e) => setValue('cor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
                <Input
                  id="thumbnail_url"
                  placeholder="https://..."
                  {...register('thumbnail_url')}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Trilha Obrigatoria</Label>
                  <p className="text-xs text-muted-foreground">
                    Todos os colaboradores devem completar
                  </p>
                </div>
                <Switch
                  checked={isObrigatoria}
                  onCheckedChange={(v) => setValue('is_obrigatoria', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Ordem Sequencial</Label>
                  <p className="text-xs text-muted-foreground">
                    Modulos devem ser concluidos na ordem
                  </p>
                </div>
                <Switch
                  checked={isSequencial}
                  onCheckedChange={(v) => setValue('is_sequencial', v)}
                />
              </div>

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
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/treinamentos/trilhas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Trilha'}
          </Button>
        </div>
      </form>
    </div>
  );
}
