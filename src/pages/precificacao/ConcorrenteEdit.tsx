import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { useCompetitorsMT } from '@/hooks/multitenant/useCompetitivoMT';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import type { MTCompetitorCreate } from '@/types/competitivo';

export default function ConcorrenteEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { tenant, accessLevel } = useTenantContext();
  const { create, update } = useCompetitorsMT();

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<MTCompetitorCreate>({
    defaultValues: {
      nome: '',
      website: '',
      tipo: 'concorrente',
      regiao: 'nacional',
      cidade: '',
      estado: '',
      url_base_feminino: '',
      url_base_masculino: '',
      notas: '',
    },
  });

  // Buscar dados do concorrente se editando
  const { data: competitor, isLoading } = useQuery({
    queryKey: ['mt-competitor-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('mt_competitors')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (competitor) {
      reset({
        nome: competitor.nome || '',
        website: competitor.website || '',
        tipo: competitor.tipo || 'concorrente',
        regiao: competitor.regiao || 'nacional',
        cidade: competitor.cidade || '',
        estado: competitor.estado || '',
        url_base_feminino: competitor.url_base_feminino || '',
        url_base_masculino: competitor.url_base_masculino || '',
        notas: competitor.notas || '',
      });
    }
  }, [competitor, reset]);

  const onSubmit = async (data: MTCompetitorCreate) => {
    try {
      if (isEditing && id) {
        await update.mutateAsync({ id, ...data });
      } else {
        await create.mutateAsync(data);
      }
      navigate('/precificacao/concorrentes');
    } catch {
      // Error handled by hook toast
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/precificacao/concorrentes')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {isEditing ? 'Editar Concorrente' : 'Novo Concorrente'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Espaço Laser"
                  {...register('nome', { required: 'Nome é obrigatório' })}
                />
                {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://exemplo.com.br"
                  {...register('website')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={watch('tipo') || 'concorrente'}
                  onValueChange={(v) => setValue('tipo', v as string)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concorrente">Concorrente</SelectItem>
                    <SelectItem value="referencia_mercado">Referência de Mercado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Região</Label>
                <Select
                  value={watch('regiao') || 'nacional'}
                  onValueChange={(v) => setValue('regiao', v as string)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" placeholder="São Paulo" {...register('cidade')} />
                </div>
                <div>
                  <Label htmlFor="estado">UF</Label>
                  <Input id="estado" placeholder="SP" maxLength={2} {...register('estado')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URLs para Scraping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URLs para Scraping (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url_base_feminino">URL Base Feminino</Label>
              <Input
                id="url_base_feminino"
                placeholder="https://site.com/servicos-feminino-{area}"
                {...register('url_base_feminino')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{area}'} como placeholder para a área corporal
              </p>
            </div>
            <div>
              <Label htmlFor="url_base_masculino">URL Base Masculino</Label>
              <Input
                id="url_base_masculino"
                placeholder="https://site.com/servicos-masculino-{area}"
                {...register('url_base_masculino')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notas sobre este concorrente..."
              rows={3}
              {...register('notas')}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending || update.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Concorrente'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/precificacao/concorrentes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
