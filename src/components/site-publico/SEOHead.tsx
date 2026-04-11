// =============================================================================
// SEOHead - Componente de SEO dinâmico para o site público
// =============================================================================
//
// Define meta tags (title, description, OG, canonical) e JSON-LD
// via manipulação direta do document.head.
//
// =============================================================================

import { useEffect, useRef } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SEOHeadProps {
  /** Título da página (também usado como og:title) */
  title: string;
  /** Meta description (também usado como og:description) */
  description: string;
  /** URL canônica da página */
  canonical?: string;
  /** URL da imagem para Open Graph / Twitter Cards */
  ogImage?: string;
  /** Tipo OG (default: "website") */
  ogType?: string;
  /** Objeto JSON-LD para dados estruturados */
  jsonLd?: Record<string, unknown>;
  /** Palavras-chave separadas por vírgula */
  keywords?: string;
  /** Desabilitar indexação (noindex, nofollow) */
  noIndex?: boolean;
}

// -----------------------------------------------------------------------------
// Helper: criar ou atualizar meta tag
// -----------------------------------------------------------------------------

function setMeta(nameOrProp: string, content: string, attr: 'name' | 'property' = 'name') {
  const selector = `meta[${attr}="${nameOrProp}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.content = content;
}

function removeMeta(nameOrProp: string, attr: 'name' | 'property' = 'name') {
  const selector = `meta[${attr}="${nameOrProp}"]`;
  const el = document.querySelector(selector);
  if (el) el.remove();
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function SEOHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  jsonLd,
  keywords,
  noIndex = false,
}: SEOHeadProps) {
  const prevTitleRef = useRef<string>(document.title);

  useEffect(() => {
    // Salvar título anterior para restaurar no cleanup
    prevTitleRef.current = document.title;

    // --- Title ---
    document.title = title;

    // --- Meta description ---
    setMeta('description', description);

    // --- Keywords ---
    if (keywords) {
      setMeta('keywords', keywords);
    }

    // --- Robots ---
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow');
    }

    // --- Open Graph ---
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', ogType, 'property');

    if (ogImage) {
      setMeta('og:image', ogImage, 'property');
      setMeta('og:image:width', '1200', 'property');
      setMeta('og:image:height', '630', 'property');
    }

    if (canonical) {
      setMeta('og:url', canonical, 'property');
    }

    // --- Twitter Card ---
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    if (ogImage) {
      setMeta('twitter:image', ogImage);
    }

    // --- Canonical link ---
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // --- JSON-LD ---
    if (jsonLd) {
      let script = document.getElementById('seo-json-ld') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'seo-json-ld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    // --- Cleanup ---
    return () => {
      // Restaurar título anterior
      document.title = prevTitleRef.current;

      // Remover canonical
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) canonicalLink.remove();

      // Remover JSON-LD
      const jsonLdScript = document.getElementById('seo-json-ld');
      if (jsonLdScript) jsonLdScript.remove();

      // Remover OG tags
      removeMeta('og:title', 'property');
      removeMeta('og:description', 'property');
      removeMeta('og:type', 'property');
      removeMeta('og:image', 'property');
      removeMeta('og:image:width', 'property');
      removeMeta('og:image:height', 'property');
      removeMeta('og:url', 'property');

      // Remover Twitter tags
      removeMeta('twitter:card');
      removeMeta('twitter:title');
      removeMeta('twitter:description');
      removeMeta('twitter:image');

      // Remover robots se foi noIndex
      if (noIndex) {
        removeMeta('robots');
      }
    };
  }, [title, description, canonical, ogImage, ogType, jsonLd, keywords, noIndex]);

  // Componente não renderiza nada no DOM
  return null;
}

export default SEOHead;
