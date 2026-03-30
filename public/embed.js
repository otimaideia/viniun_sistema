/**
 * YESlaser Form Embed Script
 *
 * Uso:
 * <script src="https://painel.yeslaser.com.br/embed.js"
 *         data-form="slug-do-formulario"
 *         data-width="100%"
 *         data-height="600px"></script>
 *
 * Ou via div container:
 * <div id="yeslaser-form" data-form="slug-do-formulario"></div>
 * <script src="https://painel.yeslaser.com.br/embed.js"></script>
 */

(function() {
  'use strict';

  // Configurações
  var BASE_URL = window.YESLASER_BASE_URL || 'https://painel.yeslaser.com.br';

  // Detectar ambiente de desenvolvimento
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    BASE_URL = window.location.origin;
  }

  // Parâmetros UTM e tracking a serem capturados
  var TRACKING_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'ref',
    'codigo',
    'influenciadores',
    'gclid',      // Google Ads
    'fbclid',     // Facebook
    'ttclid',     // TikTok
    'msclkid',    // Microsoft Ads
    'li_fat_id',  // LinkedIn
    'twclid',     // Twitter
    'source',
    'medium',
    'campaign'
  ];

  /**
   * Captura parâmetros da URL atual
   */
  function getUrlParams() {
    var params = {};
    var searchParams = new URLSearchParams(window.location.search);

    TRACKING_PARAMS.forEach(function(param) {
      var value = searchParams.get(param);
      if (value) {
        params[param] = value;
      }
    });

    // Também capturar do hash (para SPAs)
    if (window.location.hash && window.location.hash.includes('?')) {
      var hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      TRACKING_PARAMS.forEach(function(param) {
        var value = hashParams.get(param);
        if (value && !params[param]) {
          params[param] = value;
        }
      });
    }

    return params;
  }

  /**
   * Captura dados do referrer
   */
  function getReferrerData() {
    var data = {};

    if (document.referrer) {
      data.referrer = document.referrer;

      // Extrair source do referrer se não tiver utm_source
      try {
        var referrerUrl = new URL(document.referrer);
        var hostname = referrerUrl.hostname.toLowerCase();

        // Detectar fonte automaticamente
        if (hostname.includes('google')) {
          data.detected_source = 'google';
        } else if (hostname.includes('facebook') || hostname.includes('fb.com')) {
          data.detected_source = 'facebook';
        } else if (hostname.includes('instagram')) {
          data.detected_source = 'instagram';
        } else if (hostname.includes('tiktok')) {
          data.detected_source = 'tiktok';
        } else if (hostname.includes('linkedin')) {
          data.detected_source = 'linkedin';
        } else if (hostname.includes('twitter') || hostname.includes('t.co')) {
          data.detected_source = 'twitter';
        } else if (hostname.includes('youtube')) {
          data.detected_source = 'youtube';
        } else if (hostname.includes('bing')) {
          data.detected_source = 'bing';
        }
      } catch (e) {
        // Ignorar erro de URL inválida
      }
    }

    return data;
  }

  /**
   * Captura dados da página pai
   */
  function getPageData() {
    return {
      page_url: window.location.href,
      page_title: document.title,
      page_path: window.location.pathname
    };
  }

  /**
   * Salva parâmetros no localStorage para persistência
   */
  function saveToStorage(params) {
    try {
      var stored = JSON.parse(localStorage.getItem('yeslaser_tracking') || '{}');
      var merged = Object.assign({}, stored, params);
      merged.last_visit = new Date().toISOString();
      localStorage.setItem('yeslaser_tracking', JSON.stringify(merged));
    } catch (e) {
      // localStorage não disponível
    }
  }

  /**
   * Recupera parâmetros do localStorage
   */
  function getFromStorage() {
    try {
      return JSON.parse(localStorage.getItem('yeslaser_tracking') || '{}');
    } catch (e) {
      return {};
    }
  }

  /**
   * Monta a URL do iframe com todos os parâmetros
   */
  function buildIframeUrl(formSlug, customParams) {
    var url = BASE_URL + '/form/' + formSlug;

    // Coletar todos os parâmetros
    var urlParams = getUrlParams();
    var storedParams = getFromStorage();
    var referrerData = getReferrerData();
    var pageData = getPageData();

    // Merge: URL atual > localStorage > referrer detectado
    var allParams = Object.assign({}, storedParams, referrerData, urlParams, customParams || {});

    // Se não tem utm_source mas tem detected_source, usar
    if (!allParams.utm_source && allParams.detected_source) {
      allParams.utm_source = allParams.detected_source;
    }

    // Adicionar dados da página
    allParams.embed_url = pageData.page_url;
    allParams.embed_title = pageData.page_title;

    // Salvar para futuras visitas
    saveToStorage(allParams);

    // Construir query string
    var queryParts = [];
    Object.keys(allParams).forEach(function(key) {
      if (allParams[key] && key !== 'last_visit') {
        queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(allParams[key]));
      }
    });

    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }

    return url;
  }

  /**
   * Cria o iframe
   */
  function createIframe(container, formSlug, options) {
    options = options || {};

    var iframe = document.createElement('iframe');
    iframe.src = buildIframeUrl(formSlug, options.params);
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '600px';
    iframe.style.border = options.border || 'none';
    iframe.style.borderRadius = options.borderRadius || '8px';
    iframe.style.maxWidth = '100%';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', options.scrolling || 'auto');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'geolocation; microphone; camera');
    iframe.id = 'yeslaser-form-iframe';
    iframe.title = 'Formulário YESlaser';

    // Limpar container e adicionar iframe
    container.innerHTML = '';
    container.appendChild(iframe);

    // Listener para redimensionamento automático
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'yeslaser-form-height') {
        iframe.style.height = event.data.height + 'px';
      }

      // Evento de submissão bem sucedida
      if (event.data && event.data.type === 'yeslaser-form-submit') {
        var submitEvent = new CustomEvent('yeslaser:submit', { detail: event.data });
        container.dispatchEvent(submitEvent);
        document.dispatchEvent(submitEvent);
      }
    });

    return iframe;
  }

  /**
   * Inicialização automática
   */
  function init() {
    // Procurar por script tags com data-form
    var scripts = document.querySelectorAll('script[data-form]');
    scripts.forEach(function(script) {
      var formSlug = script.getAttribute('data-form');
      if (!formSlug) return;

      var container = document.createElement('div');
      container.className = 'yeslaser-form-container';
      script.parentNode.insertBefore(container, script.nextSibling);

      createIframe(container, formSlug, {
        width: script.getAttribute('data-width') || '100%',
        height: script.getAttribute('data-height') || '600px',
        border: script.getAttribute('data-border'),
        borderRadius: script.getAttribute('data-border-radius'),
        params: script.getAttribute('data-params') ? JSON.parse(script.getAttribute('data-params')) : {}
      });
    });

    // Procurar por divs com data-form
    var containers = document.querySelectorAll('[data-yeslaser-form]');
    containers.forEach(function(container) {
      var formSlug = container.getAttribute('data-yeslaser-form');
      if (!formSlug) return;

      createIframe(container, formSlug, {
        width: container.getAttribute('data-width') || '100%',
        height: container.getAttribute('data-height') || '600px',
        border: container.getAttribute('data-border'),
        borderRadius: container.getAttribute('data-border-radius'),
        params: container.getAttribute('data-params') ? JSON.parse(container.getAttribute('data-params')) : {}
      });
    });

    // Também procurar pelo ID legado
    var legacyContainer = document.getElementById('yeslaser-form');
    if (legacyContainer && legacyContainer.getAttribute('data-form')) {
      var formSlug = legacyContainer.getAttribute('data-form');
      createIframe(legacyContainer, formSlug, {
        width: legacyContainer.getAttribute('data-width') || '100%',
        height: legacyContainer.getAttribute('data-height') || '600px'
      });
    }
  }

  // API pública
  window.YESlaser = {
    embed: function(containerId, formSlug, options) {
      var container = document.getElementById(containerId);
      if (!container) {
        console.error('YESlaser: Container não encontrado:', containerId);
        return null;
      }
      return createIframe(container, formSlug, options);
    },

    getTrackingParams: function() {
      return Object.assign({}, getFromStorage(), getUrlParams());
    },

    buildFormUrl: function(formSlug, customParams) {
      return buildIframeUrl(formSlug, customParams);
    },

    // Permitir configurar URL base
    setBaseUrl: function(url) {
      BASE_URL = url;
    }
  };

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Log para debug
  console.log('YESlaser Embed Script loaded. Tracking params:', getUrlParams());
})();
