import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  initPixels,
  trackFacebookEvent,
  trackGA4Event,
  trackTikTokEvent,
  type PixelConfig,
} from '@/utils/pixelTracking';

// =============================================================================
// STORE TRACKING 360 - Rastreia jornada completa do visitante na loja publica
// =============================================================================

export type StoreEventType =
  | 'view_store'
  | 'view_product'
  | 'view_package'
  | 'click_whatsapp'
  | 'click_form'
  | 'click_payment'
  | 'click_share';

interface StoreSession {
  sessionId: string;
  influencerCode: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  startedAt: string;
}

const STORE_SESSION_KEY = 'viniun_store_session';

function generateSessionId(): string {
  return `store_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateSession(searchParams: URLSearchParams): StoreSession {
  // Tentar recuperar sessao existente
  const stored = localStorage.getItem(STORE_SESSION_KEY);
  if (stored) {
    try {
      const session: StoreSession = JSON.parse(stored);
      // Se veio novo influencer_code, atualiza
      const newCode = searchParams.get('influenciadores');
      if (newCode && newCode !== session.influencerCode) {
        session.influencerCode = newCode;
        localStorage.setItem(STORE_SESSION_KEY, JSON.stringify(session));
      }
      return session;
    } catch {
      // Se JSON invalido, cria nova
    }
  }

  // Criar nova sessao
  const session: StoreSession = {
    sessionId: generateSessionId(),
    influencerCode: searchParams.get('influenciadores'),
    utmSource: searchParams.get('utm_source') || searchParams.get('source'),
    utmMedium: searchParams.get('utm_medium') || searchParams.get('medium'),
    utmCampaign: searchParams.get('utm_campaign') || searchParams.get('campaign'),
    utmContent: searchParams.get('utm_content'),
    utmTerm: searchParams.get('utm_term'),
    referrer: document.referrer || null,
    startedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function useStoreTracking(tenantId: string | null, pixelConfig?: PixelConfig) {
  const [searchParams] = useSearchParams();
  const pixelsInitialized = useRef(false);

  const session = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getOrCreateSession(searchParams);
  }, [searchParams]);

  // Inicializar pixels uma vez
  useEffect(() => {
    if (pixelConfig && !pixelsInitialized.current) {
      initPixels(pixelConfig);
      pixelsInitialized.current = true;
    }
  }, [pixelConfig]);

  const trackEvent = useCallback(
    async (
      evento: StoreEventType,
      itemId?: string,
      itemTipo?: 'produto' | 'pacote',
      itemNome?: string,
      extras?: Record<string, unknown>
    ) => {
      if (!tenantId || !session) return;

      // 1. Salvar no banco (mt_store_events)
      try {
        await supabase.from('mt_store_events').insert({
          tenant_id: tenantId,
          session_id: session.sessionId,
          evento,
          item_id: itemId || null,
          item_tipo: itemTipo || null,
          item_nome: itemNome || null,
          influencer_code: session.influencerCode || null,
          utm_source: session.utmSource || null,
          utm_medium: session.utmMedium || null,
          utm_campaign: session.utmCampaign || null,
          utm_content: session.utmContent || null,
          utm_term: session.utmTerm || null,
          referrer: session.referrer || null,
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          dados_extras: extras || {},
        });
      } catch (err) {
        console.error('[StoreTracking] Erro ao salvar evento:', err);
      }

      // 2. Disparar pixels
      const pixelData = {
        content_name: itemNome,
        content_category: itemTipo,
        value: undefined as number | undefined,
      };

      switch (evento) {
        case 'view_store':
          trackFacebookEvent('PageView');
          trackGA4Event('page_view', { page_title: 'Loja' });
          trackTikTokEvent('ViewContent', { content_name: 'Loja' });
          break;

        case 'view_product':
        case 'view_package':
          trackFacebookEvent('ViewContent', pixelData);
          trackGA4Event('view_item', { item_name: itemNome });
          trackTikTokEvent('ViewContent', pixelData);
          break;

        case 'click_whatsapp':
          trackFacebookEvent('Contact', pixelData);
          trackGA4Event('contact', { method: 'whatsapp', item_name: itemNome });
          trackTikTokEvent('Contact', pixelData);
          break;

        case 'click_form':
          trackFacebookEvent('Lead', pixelData);
          trackGA4Event('generate_lead', { event_label: itemNome });
          trackTikTokEvent('SubmitForm', pixelData);
          break;

        case 'click_payment':
          trackFacebookEvent('InitiateCheckout', pixelData);
          trackGA4Event('begin_checkout', { item_name: itemNome });
          trackTikTokEvent('InitiateCheckout', pixelData);
          break;

        case 'click_share':
          trackGA4Event('share', { content_type: itemTipo, item_id: itemId });
          break;
      }
    },
    [tenantId, session]
  );

  // Helper: gerar URL de WhatsApp com tracking
  const getWhatsAppUrl = useCallback(
    (phone: string, productName: string, influencerName?: string) => {
      let message = `Oi! Vi o produto *${productName}* na loja e tenho interesse!`;
      if (influencerName || session?.influencerCode) {
        message += ` (indicacao: ${influencerName || session?.influencerCode})`;
      }
      return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    },
    [session]
  );

  // Helper: gerar URL de formulario com tracking params
  const getFormUrl = useCallback(
    (formSlug: string, itemName?: string) => {
      const params = new URLSearchParams();
      if (session?.influencerCode) params.set('influenciadores', session.influencerCode);
      params.set('utm_source', 'loja');
      if (itemName) params.set('utm_content', itemName);
      if (session?.utmCampaign) params.set('utm_campaign', session.utmCampaign);
      return `/form/${formSlug}?${params.toString()}`;
    },
    [session]
  );

  // Helper: gerar URL de pagamento com tracking params
  const getPaymentUrl = useCallback(
    (baseUrl: string) => {
      const url = new URL(baseUrl);
      if (session?.sessionId) url.searchParams.set('ref', session.sessionId);
      if (session?.influencerCode) url.searchParams.set('influenciadores', session.influencerCode);
      return url.toString();
    },
    [session]
  );

  // Helper: criar referral de influenciadora no banco
  const createInfluencerReferral = useCallback(
    async (itemId: string, itemTipo: 'produto' | 'pacote') => {
      if (!session?.influencerCode || !tenantId) return;

      try {
        // Buscar influenciadora pelo codigo
        const { data: influencer } = await supabase
          .from('mt_influencers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('codigo', session.influencerCode)
          .eq('is_active', true)
          .single();

        if (influencer) {
          await supabase.from('mt_influencer_referrals').insert({
            tenant_id: tenantId,
            influencer_id: influencer.id,
            codigo_usado: session.influencerCode,
            landing_page: window.location.href,
            status: 'pendente',
            dados_extras: {
              item_id: itemId,
              item_tipo: itemTipo,
              session_id: session.sessionId,
              source: 'loja',
            },
          });
        }
      } catch (err) {
        console.error('[StoreTracking] Erro ao criar referral:', err);
      }
    },
    [tenantId, session]
  );

  return {
    sessionId: session?.sessionId || null,
    influencerCode: session?.influencerCode || null,
    trackEvent,
    getWhatsAppUrl,
    getFormUrl,
    getPaymentUrl,
    createInfluencerReferral,
  };
}
