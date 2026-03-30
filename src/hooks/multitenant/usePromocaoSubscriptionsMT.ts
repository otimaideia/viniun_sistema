// =============================================================================
// USE PROMOCAO SUBSCRIPTIONS MT - Hook Multi-Tenant para Adesões de Influenciadoras
// =============================================================================
//
// Gerencia mt_promotion_subscriptions: adesões, recusas, links e notificações
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPromotionSubscription,
  MTPromotionSubscriptionStatus,
} from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-promocao-subscriptions';
const INFLUENCER_PROMOS_KEY = 'mt-influencer-promocoes';
const PARENT_QUERY_KEY = 'mt-promocoes';

const SELECT_WITH_RELATIONS = `
  *,
  promotion:mt_promotions (id, codigo, titulo, status, data_inicio, data_fim, tipo, desconto_tipo, desconto_valor),
  influencer:mt_influencers (id, nome, telefone, codigo, instagram)
`;

// -----------------------------------------------------------------------------
// Hook: Adesões de uma Promoção
// -----------------------------------------------------------------------------

export function usePromocaoSubscriptionsMT(promotionId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Adesões da Promoção
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, promotionId],
    queryFn: async (): Promise<MTPromotionSubscription[]> => {
      if (!promotionId) return [];

      let query = supabase
        .from('mt_promotion_subscriptions')
        .select(SELECT_WITH_RELATIONS)
        .eq('promotion_id', promotionId);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar adesões da promoção:', error);
        throw error;
      }

      return (data || []) as MTPromotionSubscription[];
    },
    enabled: !!promotionId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Aderir (influenciadora opta pela promoção)
  // ---------------------------------------------------------------------------

  const aderir = useMutation({
    mutationFn: async ({
      promotionId: promoId,
      influencerId,
    }: {
      promotionId: string;
      influencerId: string;
    }): Promise<MTPromotionSubscription> => {
      // 1. Buscar dados da promoção e influenciadora para gerar link
      const [promoResult, influencerResult] = await Promise.all([
        supabase.from('mt_promotions').select('codigo').eq('id', promoId).single(),
        supabase.from('mt_influencers').select('codigo').eq('id', influencerId).single(),
      ]);

      if (promoResult.error || influencerResult.error) {
        throw new Error('Erro ao buscar dados para gerar link de divulgação.');
      }

      // 2. Gerar link tagueado
      const hostname = window.location.hostname;
      const link = `https://${hostname}/form/boas-vindas?influenciadores=${influencerResult.data.codigo}&promo=${promoResult.data.codigo}`;

      // 3. Criar adesão
      const { data, error } = await supabase
        .from('mt_promotion_subscriptions')
        .insert({
          promotion_id: promoId,
          influencer_id: influencerId,
          tenant_id: tenant!.id,
          status: 'aderido' as MTPromotionSubscriptionStatus,
          link_gerado: link,
          aderiu_at: new Date().toISOString(),
        })
        .select(SELECT_WITH_RELATIONS)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta influenciadora já aderiu a esta promoção.');
        }
        console.error('Erro ao criar adesão:', error);
        throw error;
      }

      return data as MTPromotionSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [INFLUENCER_PROMOS_KEY] });
      toast.success('Adesão registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao registrar adesão.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Recusar (influenciadora opta por não participar)
  // ---------------------------------------------------------------------------

  const recusar = useMutation({
    mutationFn: async (subscriptionId: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_promotion_subscriptions')
        .update({
          status: 'recusado' as MTPromotionSubscriptionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('Erro ao recusar adesão:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [INFLUENCER_PROMOS_KEY] });
      toast.success('Adesão recusada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao recusar adesão.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Notificar Influenciadoras via WAHA
  // ---------------------------------------------------------------------------

  const notifyInfluencers = useMutation({
    mutationFn: async ({
      promotionId: promoId,
      sessionName,
      messageTemplate,
    }: {
      promotionId: string;
      sessionName: string;
      messageTemplate?: string;
    }): Promise<{ enviados: number; erros: number }> => {
      // 1. Buscar promoção
      const { data: promo, error: promoError } = await supabase
        .from('mt_promotions')
        .select('titulo, codigo, descricao, desconto_tipo, desconto_valor')
        .eq('id', promoId)
        .single();

      if (promoError || !promo) {
        throw new Error('Promoção não encontrada.');
      }

      // 2. Buscar adesões ativas com telefone
      const { data: subs, error: subsError } = await supabase
        .from('mt_promotion_subscriptions')
        .select('id, link_gerado, influencer:mt_influencers (id, nome, telefone, codigo)')
        .eq('promotion_id', promoId)
        .eq('status', 'aderido');

      if (subsError) {
        throw new Error('Erro ao buscar influenciadoras aderidas.');
      }

      if (!subs || subs.length === 0) {
        throw new Error('Nenhuma influenciadora aderiu a esta promoção.');
      }

      let enviados = 0;
      let erros = 0;

      // 3. Enviar mensagens via WAHA
      for (const sub of subs) {
        const influencer = sub.influencer as any;
        if (!influencer?.telefone) {
          erros++;
          continue;
        }

        const telefone = influencer.telefone.replace(/\D/g, '');
        if (telefone.length < 10) {
          erros++;
          continue;
        }

        // Montar mensagem
        const defaultMessage = [
          `Oi ${influencer.nome}! 🎉`,
          ``,
          `Temos uma promoção especial para você divulgar:`,
          `*${promo.titulo}*`,
          promo.descricao ? `\n${promo.descricao}` : '',
          promo.desconto_valor
            ? `\n💰 Desconto: ${promo.desconto_tipo === 'percentual' ? `${promo.desconto_valor}%` : `R$ ${promo.desconto_valor}`}`
            : '',
          ``,
          `🔗 Seu link exclusivo:`,
          sub.link_gerado || '',
          ``,
          `Compartilhe com suas seguidoras! 💜`,
        ].filter(Boolean).join('\n');

        const text = messageTemplate
          ? messageTemplate
              .replace('{nome}', influencer.nome)
              .replace('{titulo}', promo.titulo)
              .replace('{codigo}', promo.codigo)
              .replace('{link}', sub.link_gerado || '')
              .replace('{desconto}', promo.desconto_valor?.toString() || '')
          : defaultMessage;

        try {
          const { error: sendError } = await supabase.functions.invoke('waha-proxy', {
            body: {
              action: 'send-text',
              session: sessionName,
              chatId: `${telefone}@c.us`,
              text,
            },
          });

          if (sendError) {
            console.error(`Erro ao enviar para ${influencer.nome}:`, sendError);
            erros++;
          } else {
            enviados++;
          }
        } catch (err) {
          console.error(`Exceção ao enviar para ${influencer.nome}:`, err);
          erros++;
        }
      }

      return { enviados, erros };
    },
    onSuccess: ({ enviados, erros }) => {
      if (erros === 0) {
        toast.success(`Notificação enviada para ${enviados} influenciadora(s)!`);
      } else {
        toast.warning(`Enviado: ${enviados} | Erros: ${erros}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao enviar notificações.');
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    subscriptions: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    aderir: {
      mutate: aderir.mutate,
      mutateAsync: aderir.mutateAsync,
      isPending: aderir.isPending,
    },
    recusar: {
      mutate: recusar.mutate,
      mutateAsync: recusar.mutateAsync,
      isPending: recusar.isPending,
    },
    notifyInfluencers: {
      mutate: notifyInfluencers.mutate,
      mutateAsync: notifyInfluencers.mutateAsync,
      isPending: notifyInfluencers.isPending,
    },

    isAderindo: aderir.isPending,
    isRecusando: recusar.isPending,
    isNotifying: notifyInfluencers.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Promoções disponíveis para uma Influenciadora
// -----------------------------------------------------------------------------

export function useInfluencerPromocoesMT(influencerId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [INFLUENCER_PROMOS_KEY, influencerId, tenant?.id],
    queryFn: async (): Promise<MTPromotionSubscription[]> => {
      if (!influencerId) return [];

      let query = supabase
        .from('mt_promotion_subscriptions')
        .select(SELECT_WITH_RELATIONS)
        .eq('influencer_id', influencerId);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar promoções da influenciadora:', error);
        throw error;
      }

      return (data || []) as MTPromotionSubscription[];
    },
    enabled: !!influencerId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default usePromocaoSubscriptionsMT;
