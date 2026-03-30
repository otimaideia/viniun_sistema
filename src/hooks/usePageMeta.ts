import { useEffect } from "react";

interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Hook para atualizar document.title e meta tags OG dinamicamente.
 * Útil para títulos de abas no browser e crawlers que executam JS.
 */
export function usePageMeta({ title, description, image, siteName }: PageMetaOptions) {
  useEffect(() => {
    if (!title) return;

    // Atualizar título da página
    document.title = title;

    // Atualizar meta tags OG
    const updates: Record<string, string | undefined> = {
      "og:title": title,
      "og:description": description,
      "og:image": image,
      "og:site_name": siteName,
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": image,
    };

    for (const [property, content] of Object.entries(updates)) {
      if (!content) continue;
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
      }
      if (meta) {
        meta.setAttribute("content", content);
      }
    }

    // Atualizar meta description (não é OG, usa name)
    if (description) {
      const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (descMeta) {
        descMeta.setAttribute("content", description);
      }
    }
  }, [title, description, image, siteName]);
}
