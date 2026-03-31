import { useState } from 'react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Megaphone,
  Copy,
  CheckCircle2,
  Clock,
  Tag,
  Calendar,
  Percent,
  DollarSign,
  Download,
  ExternalLink,
  Loader2,
  Users,
  TrendingUp,
  ImageIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MinhasPromocoesInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Buscar promoções ativas do tenant
  const { data: promotions, isLoading: isLoadingPromotions } = useQuery({
    queryKey: ['portal-promocoes', influenciadora?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_promotions')
        .select('*, services:mt_promotion_services(*, service:mt_services(id, nome, preco, categoria)), assets:mt_promotion_assets(*)')
        .eq('tenant_id', influenciadora!.tenant_id)
        .eq('status', 'ativa')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.tenant_id,
  });

  // Buscar adesões da influenciadora
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ['portal-subscriptions', influenciadora?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_promotion_subscriptions')
        .select('*')
        .eq('influencer_id', influenciadora!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.id,
  });

  // Buscar stats de referrals por promoção
  const { data: referralStats } = useQuery({
    queryKey: ['portal-promo-referral-stats', influenciadora?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .select('id, status, promotion_id')
        .eq('influencer_id', influenciadora!.id)
        .not('promotion_id', 'is', null);
      if (error) throw error;

      // Agrupar por promotion_id
      const statsMap: Record<string, { leads: number; convertidos: number }> = {};
      data?.forEach((ref) => {
        if (!ref.promotion_id) return;
        if (!statsMap[ref.promotion_id]) {
          statsMap[ref.promotion_id] = { leads: 0, convertidos: 0 };
        }
        statsMap[ref.promotion_id].leads++;
        if (ref.status === 'convertido') {
          statsMap[ref.promotion_id].convertidos++;
        }
      });
      return statsMap;
    },
    enabled: !!influenciadora?.id,
  });

  // Mutation para aderir a uma promoção
  const aderir = useMutation({
    mutationFn: async (promotionId: string) => {
      const promotion = promotions?.find((p: { id: string }) => p.id === promotionId);
      const link = `${window.location.origin}/form/boas-vindas?influenciadores=${influenciadora!.codigo_indicacao}&promo=${promotion?.codigo || ''}`;

      const { data, error } = await supabase
        .from('mt_promotion_subscriptions')
        .insert({
          promotion_id: promotionId,
          influencer_id: influenciadora!.id,
          tenant_id: influenciadora!.tenant_id,
          status: 'aderido',
          aderiu_at: new Date().toISOString(),
          link_gerado: link,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] });
      toast({
        title: 'Promoção aderida!',
        description: 'Você aderiu com sucesso. Compartilhe seu link exclusivo!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aderir',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleCopyLink = (link: string, promoId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(promoId);
    toast({
      title: 'Link copiado!',
      description: 'Compartilhe com seus seguidores.',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSubscription = (promoId: string) => {
    return subscriptions?.find((s: { promotion_id: string }) => s.promotion_id === promoId);
  };

  const getPromoStats = (promoId: string) => {
    return referralStats?.[promoId] || { leads: 0, convertidos: 0 };
  };

  const formatDiscount = (promo: Record<string, unknown>) => {
    if (promo.desconto_tipo === 'percentual' && promo.desconto_valor) {
      return `${promo.desconto_valor}% de desconto`;
    }
    if (promo.desconto_tipo === 'fixo' && promo.desconto_valor) {
      return `R$ ${Number(promo.desconto_valor).toFixed(2).replace('.', ',')} off`;
    }
    return null;
  };

  const isLoading = isLoadingPromotions || isLoadingSubscriptions;

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Promoções</h1>
          <p className="text-gray-500">
            Adira às promoções ativas e compartilhe seu link exclusivo para ganhar comissões
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!promotions || promotions.length === 0) && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#662E8E]/10 mb-4">
                  <Megaphone className="h-8 w-8 text-[#662E8E]" />
                </div>
                <p className="text-gray-500 mb-2">Nenhuma promoção ativa no momento</p>
                <p className="text-sm text-gray-400">
                  Novas promoções aparecerão aqui quando estiverem disponíveis
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promotions Grid */}
        {!isLoading && promotions && promotions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promotions.map((promo: Record<string, unknown>) => {
              const subscription = getSubscription(promo.id);
              const isSubscribed = !!subscription;
              const stats = getPromoStats(promo.id);
              const discount = formatDiscount(promo);

              return (
                <Card key={promo.id} className="overflow-hidden flex flex-col">
                  {/* Banner */}
                  {promo.banner_url && (
                    <div className="h-48 bg-gray-100">
                      <img
                        src={promo.banner_url}
                        alt={promo.titulo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{promo.titulo}</CardTitle>
                        {promo.descricao && (
                          <CardDescription className="mt-1">{promo.descricao}</CardDescription>
                        )}
                      </div>
                      {isSubscribed ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aderido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[#662E8E] border-[#662E8E]/30 shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Disponível
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Discount info */}
                    {discount && (
                      <div className="flex items-center gap-2 p-3 bg-[#F2B705]/10 rounded-lg">
                        {promo.desconto_tipo === 'percentual' ? (
                          <Percent className="h-5 w-5 text-[#662E8E]" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-[#662E8E]" />
                        )}
                        <span className="font-semibold text-[#662E8E]">{discount}</span>
                      </div>
                    )}

                    {/* Validity */}
                    {(promo.data_inicio || promo.data_fim) && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {promo.data_inicio && format(new Date(promo.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          {promo.data_inicio && promo.data_fim && ' a '}
                          {promo.data_fim && format(new Date(promo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}

                    {/* Services */}
                    {promo.services && promo.services.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Serviços incluídos
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {promo.services.map((ps: Record<string, unknown>) => (
                            <Badge key={ps.id} variant="secondary" className="text-xs">
                              {ps.service?.nome || 'Serviço'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Spacer to push actions to bottom */}
                    <div className="flex-1" />

                    <Separator />

                    {/* Action area */}
                    {isSubscribed ? (
                      <div className="space-y-3">
                        {/* Tagged link */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-2.5 bg-gray-50 rounded-lg border text-sm text-gray-600 truncate font-mono">
                            {subscription.link_gerado}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            onClick={() => handleCopyLink(subscription.link_gerado, promo.id)}
                          >
                            {copiedId === promo.id ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Personal stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <Users className="h-4 w-4 text-[#662E8E]" />
                            <div>
                              <p className="text-xs text-gray-500">Leads</p>
                              <p className="font-semibold">{stats.leads}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-xs text-gray-500">Convertidos</p>
                              <p className="font-semibold text-green-600">{stats.convertidos}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90"
                        onClick={() => aderir.mutate(promo.id)}
                        disabled={aderir.isPending}
                      >
                        {aderir.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Megaphone className="h-4 w-4 mr-2" />
                        )}
                        Aderir a esta promoção
                      </Button>
                    )}

                    {/* Assets gallery */}
                    {isSubscribed && promo.assets && promo.assets.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Artes para compartilhar
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {promo.assets.map((asset: Record<string, unknown>) => (
                            <a
                              key={asset.id}
                              href={asset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border rounded-lg text-sm transition-colors"
                            >
                              <Download className="h-3.5 w-3.5 text-gray-500" />
                              <span className="text-gray-700">{asset.titulo || 'Baixar arte'}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </InfluenciadoraLayout>
  );
}
