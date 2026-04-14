// =============================================================================
// SITEMAP XML - Gerador dinâmico de sitemap para SEO
// =============================================================================
// Gera sitemap XML com todos os imóveis públicos do tenant
// Acessível em /sitemap.xml (renderiza XML puro)
// =============================================================================

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantDetection } from '@/hooks/multitenant/useTenantDetection';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

export default function SitemapXml() {
  const { tenant } = useTenantDetection();
  const [xml, setXml] = useState<string>('');

  useEffect(() => {
    if (!tenant) return;

    async function generateSitemap() {
      const baseUrl = tenant!.dominio_customizado
        ? `https://${tenant!.dominio_customizado}`
        : `https://${tenant!.slug}.viniun.com.br`;

      const entries: SitemapEntry[] = [];

      // Páginas estáticas
      entries.push(
        { loc: baseUrl, changefreq: 'daily', priority: '1.0' },
        { loc: `${baseUrl}/busca`, changefreq: 'daily', priority: '0.9' },
      );

      // Imóveis disponíveis
      const { data: properties } = await (supabase as any)
        .from('mt_properties')
        .select('slug, updated_at')
        .eq('tenant_id', tenant!.id)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5000);

      if (properties) {
        for (const p of properties) {
          if (p.slug) {
            entries.push({
              loc: `${baseUrl}/imovel/${p.slug}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : undefined,
              changefreq: 'weekly',
              priority: '0.8',
            });
          }
        }
      }

      // Cidades com imóveis (páginas de busca por cidade)
      const { data: cities } = await (supabase as any)
        .from('mt_properties')
        .select('cidade_id, mt_locations!cidade_id(nome, slug)')
        .eq('tenant_id', tenant!.id)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null)
        .not('cidade_id', 'is', null);

      const uniqueCities = new Map<string, string>();
      if (cities) {
        for (const c of cities) {
          const city = c.mt_locations;
          if (city?.slug && !uniqueCities.has(city.slug)) {
            uniqueCities.set(city.slug, city.nome);
            entries.push({
              loc: `${baseUrl}/busca?cidade=${city.slug}`,
              changefreq: 'weekly',
              priority: '0.7',
            });
          }
        }
      }

      // Gerar XML
      const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

      setXml(xmlStr);

      // Set content type via document title hint
      document.title = 'sitemap.xml';
    }

    generateSitemap();
  }, [tenant]);

  if (!xml) {
    return (
      <div style={{ fontFamily: 'monospace', padding: 20 }}>
        Gerando sitemap...
      </div>
    );
  }

  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        padding: 20,
        margin: 0,
        background: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      {xml}
    </pre>
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
