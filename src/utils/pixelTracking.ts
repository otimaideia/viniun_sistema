// Utilitario para rastreamento de pixels (Facebook, GA4, TikTok)
// Clone do PopDents para YESlaser

export interface PixelConfig {
  facebook?: string;
  ga4?: string;
  tiktok?: string;
}

export type PixelEventType =
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'Contact';

export interface PixelEventData {
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      page: () => void;
    };
  }
}

/**
 * Inicializa o Facebook Pixel
 */
export function initFacebookPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId) return;

  // Evita inicializar duas vezes
  if (window.fbq) return;

  // Carrega o script do Facebook Pixel
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

/**
 * Inicializa o Google Analytics 4
 */
export function initGA4(measurementId: string): void {
  if (typeof window === 'undefined' || !measurementId) return;

  // Evita inicializar duas vezes
  if (window.gtag) return;

  // Carrega o script do GA4
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const inlineScript = document.createElement('script');
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inlineScript);
}

/**
 * Inicializa o TikTok Pixel
 */
export function initTikTokPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId) return;

  // Evita inicializar duas vezes
  if (window.ttq) return;

  // Carrega o script do TikTok Pixel
  const script = document.createElement('script');
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
}

/**
 * Inicializa todos os pixels configurados
 */
export function initPixels(config: PixelConfig): void {
  if (config.facebook) {
    initFacebookPixel(config.facebook);
  }
  if (config.ga4) {
    initGA4(config.ga4);
  }
  if (config.tiktok) {
    initTikTokPixel(config.tiktok);
  }
}

/**
 * Dispara evento no Facebook Pixel
 */
export function trackFacebookEvent(event: PixelEventType, data?: PixelEventData): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, data);
}

/**
 * Dispara evento no GA4
 */
export function trackGA4Event(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', event, data);
}

/**
 * Dispara evento no TikTok Pixel
 */
export function trackTikTokEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ttq) return;
  window.ttq.track(event, data);
}

/**
 * Dispara evento de Lead em todos os pixels configurados
 */
export function trackLeadEvent(config: PixelConfig, data?: PixelEventData): void {
  if (config.facebook) {
    trackFacebookEvent('Lead', data);
  }
  if (config.ga4) {
    trackGA4Event('generate_lead', {
      event_category: 'engagement',
      event_label: data?.content_name,
      value: data?.value,
    });
  }
  if (config.tiktok) {
    trackTikTokEvent('SubmitForm', data);
  }
}

/**
 * Dispara evento de visualizacao de formulario
 */
export function trackFormViewEvent(config: PixelConfig, formName?: string): void {
  if (config.facebook) {
    trackFacebookEvent('ViewContent', { content_name: formName });
  }
  if (config.ga4) {
    trackGA4Event('view_item', { item_name: formName });
  }
  if (config.tiktok) {
    trackTikTokEvent('ViewContent', { content_name: formName });
  }
}

/**
 * Dispara evento de inicio de preenchimento
 */
export function trackFormStartEvent(config: PixelConfig, formName?: string): void {
  if (config.facebook) {
    trackFacebookEvent('InitiateCheckout', { content_name: formName });
  }
  if (config.ga4) {
    trackGA4Event('begin_checkout', { item_name: formName });
  }
  if (config.tiktok) {
    trackTikTokEvent('InitiateCheckout', { content_name: formName });
  }
}

/**
 * Dispara evento de conclusao de formulario (lead capturado)
 */
export function trackFormCompleteEvent(config: PixelConfig, formName?: string, data?: PixelEventData): void {
  if (config.facebook) {
    trackFacebookEvent('CompleteRegistration', { content_name: formName, ...data });
  }
  if (config.ga4) {
    trackGA4Event('sign_up', {
      method: 'form',
      item_name: formName,
      ...data
    });
  }
  if (config.tiktok) {
    trackTikTokEvent('CompleteRegistration', { content_name: formName, ...data });
  }
}
