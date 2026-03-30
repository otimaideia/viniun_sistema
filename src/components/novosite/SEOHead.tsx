import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  jsonLd?: object | object[];
  noIndex?: boolean;
}

export function SEOHead({
  title,
  description = 'Depilação a laser, estética facial e corporal em Praia Grande - SP. Agende sua avaliação gratuita na YESlaser.',
  image = '/images/landing/hero-yeslaser.png',
  url,
  type = 'website',
  jsonLd,
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = `${title} | YESlaser Praia Grande`;
  const siteUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const jsonLdScripts = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {siteUrl && <meta property="og:url" content={siteUrl} />}
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="YESlaser Praia Grande" />
      <meta property="og:locale" content="pt_BR" />

      {/* Geo Meta Tags */}
      <meta name="geo.region" content="BR-SP" />
      <meta name="geo.placename" content="Praia Grande" />
      <meta name="geo.position" content="-24.0058;-46.4028" />
      <meta name="ICBM" content="-24.0058, -46.4028" />

      {/* JSON-LD Structured Data */}
      {jsonLdScripts.map((ld, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}
