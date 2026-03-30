import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAdCampaignsMT } from '@/hooks/multitenant/useAdCampaignsMT';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { AdCampaign } from '@/types/ad-campaigns';
import { CAMPAIGN_STATUS_LABELS, PLATFORM_LABELS } from '@/types/ad-campaigns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FormData = {
  nome: string;
  plataforma: string;
  tipo: string;
  objetivo: string;
  status: string;
  budget_diario: string;
  budget_total: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  whatsapp_keyword: string;
  data_inicio: string;
  data_fim: string;
};

export default function AdCampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { tenant } = useTenantContext();
  const { create, update } = useAdCampaignsMT();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['mt-ad-campaign', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from('mt_ad_campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AdCampaign;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      nome: '',
      plataforma: 'meta',
      tipo: '',
      objetivo: '',
      status: 'draft',
      budget_diario: '',
      budget_total: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      whatsapp_keyword: '',
      data_inicio: '',
      data_fim: '',
    },
  });

  useEffect(() => {
    if (campaign) {
      reset({
        nome: campaign.nome || '',
        plataforma: campaign.plataforma || 'meta',
        tipo: campaign.tipo || '',
        objetivo: campaign.objetivo || '',
        status: campaign.status || 'draft',
        budget_diario: campaign.budget_diario?.toString() || '',
        budget_total: campaign.budget_total?.toString() || '',
        utm_source: campaign.utm_source || '',
        utm_medium: campaign.utm_medium || '',
        utm_campaign: campaign.utm_campaign || '',
        utm_content: campaign.utm_content || '',
        whatsapp_keyword: campaign.whatsapp_keyword || '',
        data_inicio: campaign.data_inicio?.split('T')[0] || '',
        data_fim: campaign.data_fim?.split('T')[0] || '',
      });
    }
  }, [campaign, reset]);

  const onSubmit = async (data: FormData) => {
    const payload: Partial<AdCampaign> = {
      nome: data.nome,
      plataforma: data.plataforma as AdCampaign['plataforma'],
      tipo: data.tipo || null,
      objetivo: data.objetivo || null,
      status: data.status as AdCampaign['status'],
      budget_diario: data.budget_diario ? parseFloat(data.budget_diario) : null,
      budget_total: data.budget_total ? parseFloat(data.budget_total) : null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_content: data.utm_content || null,
      whatsapp_keyword: data.whatsapp_keyword || null,
      data_inicio: data.data_inicio || null,
      data_fim: data.data_fim || null,
    };

    if (isEditing && id) {
      await update.mutateAsync({ id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    navigate('/ia/trafego/campanhas');
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <Link to="/ia/trafego" className="hover:text-foreground">
          Trafego
        </Link>
        <span>/</span>
        <Link to="/ia/trafego/campanhas" className="hover:text-foreground">
          Campanhas
        </Link>
        <span>/</span>
        <span className="text-foreground">{isEditing ? 'Editar' : 'Nova Campanha'}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing
            ? 'Atualize os dados da campanha de anuncios'
            : 'Configure uma nova campanha de anuncios'}
          {tenant && ` - ${tenant.nome_fantasia}`}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Basicas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="nome">Nome da Campanha *</Label>
              <Input
                id="nome"
                {...register('nome', { required: true })}
                placeholder="Ex: Campanha Verao 2026"
              />
            </div>

            <div>
              <Label>Plataforma *</Label>
              <Select
                value={watch('plataforma')}
                onValueChange={(v) => setValue('plataforma', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_STATUS_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                {...register('tipo')}
                placeholder="Ex: Remarketing, Prospeccao"
              />
            </div>

            <div>
              <Label htmlFor="objetivo">Objetivo</Label>
              <Input
                id="objetivo"
                {...register('objetivo')}
                placeholder="Ex: Conversao, Trafego"
              />
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle>Orcamento e Datas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="budget_diario">Orcamento Diario (R$)</Label>
              <Input
                id="budget_diario"
                type="number"
                step="0.01"
                {...register('budget_diario')}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="budget_total">Orcamento Total (R$)</Label>
              <Input
                id="budget_total"
                type="number"
                step="0.01"
                {...register('budget_total')}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="data_inicio">Data Inicio</Label>
              <Input id="data_inicio" type="date" {...register('data_inicio')} />
            </div>

            <div>
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input id="data_fim" type="date" {...register('data_fim')} />
            </div>
          </CardContent>
        </Card>

        {/* UTM & Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Rastreamento (UTM)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="utm_source">UTM Source</Label>
              <Input
                id="utm_source"
                {...register('utm_source')}
                placeholder="Ex: facebook, google"
              />
            </div>

            <div>
              <Label htmlFor="utm_medium">UTM Medium</Label>
              <Input
                id="utm_medium"
                {...register('utm_medium')}
                placeholder="Ex: cpc, cpm"
              />
            </div>

            <div>
              <Label htmlFor="utm_campaign">UTM Campaign</Label>
              <Input
                id="utm_campaign"
                {...register('utm_campaign')}
                placeholder="Ex: verao-2026"
              />
            </div>

            <div>
              <Label htmlFor="utm_content">UTM Content</Label>
              <Input
                id="utm_content"
                {...register('utm_content')}
                placeholder="Ex: banner-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="whatsapp_keyword">Keyword WhatsApp</Label>
              <Input
                id="whatsapp_keyword"
                {...register('whatsapp_keyword')}
                placeholder="Ex: PROMO2026"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Palavra-chave enviada pelo lead via WhatsApp para rastreamento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/ia/trafego/campanhas')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Salvar Alteracoes' : 'Criar Campanha'}
          </Button>
        </div>
      </form>
    </div>
  );
}
