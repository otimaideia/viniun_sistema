import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useServicoPublico, useServicosPublicos } from '@/hooks/public/useServicosPublicos';
import { useCategoriasPublicas } from '@/hooks/public/useCategoriasPublicas';
import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';
import { PricingTable } from '@/components/novosite/PricingTable';
import { ProcedureInfo } from '@/components/novosite/ProcedureInfo';
import { ServiceCard } from '@/components/novosite/ServiceCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ShoppingCart,
  MessageCircle,
  Clock,
  Repeat,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from 'lucide-react';

const AREA_SIZE_CONFIG: Record<string, { label: string; fullLabel: string; color: string }> = {
  P: { label: 'P', fullLabel: 'Area Pequena', color: 'bg-emerald-500 text-white' },
  M: { label: 'M', fullLabel: 'Area Media', color: 'bg-amber-500 text-white' },
  G: { label: 'G', fullLabel: 'Area Grande', color: 'bg-red-500 text-white' },
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getWhatsAppUrl(serviceName: string): string {
  const message = encodeURIComponent(
    `Ola! Gostaria de agendar o procedimento: ${serviceName}. Podem me ajudar?`
  );
  return `https://wa.me/5513991888100?text=${message}`;
}

function getPriceRange(service: {
  preco?: number | null;
  preco_promocional?: number | null;
  custo_pix?: number | null;
  custo_cartao?: number | null;
}): { low: number; high: number } | null {
  const prices = [
    service.preco,
    service.preco_promocional,
    service.custo_pix,
    service.custo_cartao,
  ].filter((p): p is number => p != null && p > 0);

  if (prices.length === 0) return null;
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

// ---------------------------------------------------------------------------
// Image Gallery
// ---------------------------------------------------------------------------

function ImageGallery({
  mainImage,
  galeria,
  alt,
}: {
  mainImage: string | null;
  galeria: any;
  alt: string;
}) {
  const images = useMemo(() => {
    const list: string[] = [];
    if (mainImage) list.push(mainImage);
    if (Array.isArray(galeria)) {
      for (const item of galeria) {
        const url = typeof item === 'string' ? item : item?.url;
        if (url && !list.includes(url)) list.push(url);
      }
    }
    return list;
  }, [mainImage, galeria]);

  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = images.length > 1;
  const currentImage = images[activeIndex] || null;

  const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
        {currentImage ? (
          <img
            src={currentImage}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100">
            <ImageOff className="w-16 h-16 text-purple-300 mb-3" />
            <span className="text-sm text-purple-400">Imagem indisponivel</span>
          </div>
        )}

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors"
              aria-label="Proxima imagem"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === activeIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Imagem ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === activeIndex
                  ? 'border-[#6B2D8B] ring-1 ring-[#6B2D8B]'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img
                src={img}
                alt={`${alt} - ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-5 w-64 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not found state
// ---------------------------------------------------------------------------

function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <ImageOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Servico nao encontrado</h1>
      <p className="text-muted-foreground mb-6">
        O servico que voce procura nao esta disponivel ou foi removido.
      </p>
      <Button asChild variant="outline">
        <Link to="/novosite">Voltar ao inicio</Link>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function SiteServicoDetalhe() {
  const { categorySlug, subSlug, serviceSlug } = useParams<{
    categorySlug: string;
    subSlug?: string;
    serviceSlug?: string;
  }>();

  // The last segment is always the service slug
  const resolvedServiceSlug = serviceSlug || subSlug || categorySlug || '';

  const { data: service, isLoading, error } = useServicoPublico(resolvedServiceSlug);
  const { categories, getCategoryBySlug, getCategoryPath } = useCategoriasPublicas();

  // Related services (same category, exclude current)
  const { data: relatedRaw } = useServicosPublicos(
    service?.category_id ? { category_id: service.category_id } : undefined
  );
  const relatedServices = useMemo(() => {
    if (!relatedRaw || !service) return [];
    return relatedRaw.filter((s) => s.id !== service.id).slice(0, 4);
  }, [relatedRaw, service]);

  // Build breadcrumbs from URL segments + category data
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [];

    if (categorySlug) {
      const cat = getCategoryBySlug(categorySlug);
      items.push({
        label: cat?.nome || categorySlug,
        href: `/novosite/${categorySlug}`,
      });
    }

    // If we have subSlug AND serviceSlug, there's a subcategory level
    if (subSlug && serviceSlug) {
      const subCat = getCategoryBySlug(subSlug);
      items.push({
        label: subCat?.nome || subSlug,
        href: `/novosite/${categorySlug}/${subSlug}`,
      });
    }

    // Service name as last breadcrumb (no link)
    if (service) {
      items.push({ label: service.nome_curto || service.nome });
    }

    return items;
  }, [categorySlug, subSlug, serviceSlug, service, getCategoryBySlug]);

  // SEO
  const priceRange = service ? getPriceRange(service) : null;
  const seoJsonLd = service
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: service.nome,
        description: service.descricao_curta || service.descricao || '',
        image: service.imagem_url || undefined,
        ...(priceRange
          ? {
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: priceRange.low.toFixed(2),
                highPrice: priceRange.high.toFixed(2),
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
      }
    : undefined;

  // Category slug for related services cards
  const relatedCategorySlug = useMemo(() => {
    if (!service?.category_id || categories.length === 0) return categorySlug;
    const cat = categories.find((c) => c.id === service.category_id);
    return cat?.url_slug || categorySlug;
  }, [service, categories, categorySlug]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) return <DetailSkeleton />;
  if (error || !service) return <NotFound />;

  const areaSize = service.tamanho_area
    ? AREA_SIZE_CONFIG[service.tamanho_area.toUpperCase()]
    : null;

  return (
    <>
      <SEOHead
        title={service.meta_title || service.nome}
        description={
          service.meta_description ||
          service.descricao_curta ||
          `${service.nome} - Depilacao a laser e estetica na YESlaser Praia Grande`
        }
        image={service.imagem_url || undefined}
        type="product"
        jsonLd={seoJsonLd}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* ----------------------------------------------------------------- */}
        {/* Top Section - Two Column Layout                                    */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-4">
          {/* Left: Image Gallery */}
          <ImageGallery
            mainImage={service.imagem_url}
            galeria={service.galeria}
            alt={service.nome}
          />

          {/* Right: Details + Pricing */}
          <div className="space-y-5">
            {/* Service name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                {service.nome}
              </h1>

              {service.descricao_curta && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {service.descricao_curta}
                </p>
              )}
            </div>

            {/* Badges / Metadata */}
            <div className="flex flex-wrap gap-2">
              {areaSize && (
                <Badge className={`${areaSize.color} text-xs px-3 py-1`}>
                  {areaSize.fullLabel}
                </Badge>
              )}

              {service.equipamento && (
                <Badge variant="secondary" className="gap-1.5 text-xs px-3 py-1">
                  <Cpu className="w-3.5 h-3.5" />
                  {service.equipamento}
                </Badge>
              )}

              {service.duracao_minutos && service.duracao_minutos > 0 && (
                <Badge variant="secondary" className="gap-1.5 text-xs px-3 py-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(service.duracao_minutos)}
                </Badge>
              )}

              {service.sessoes_protocolo && service.sessoes_protocolo > 0 && (
                <Badge variant="secondary" className="gap-1.5 text-xs px-3 py-1">
                  <Repeat className="w-3.5 h-3.5" />
                  {service.sessoes_protocolo} sess
                  {service.sessoes_protocolo === 1 ? 'ao' : 'oes'}
                </Badge>
              )}

              {service.genero && service.genero !== 'unissex' && (
                <Badge variant="outline" className="text-xs px-3 py-1 capitalize">
                  {service.genero}
                </Badge>
              )}
            </div>

            {/* Pricing Table */}
            <PricingTable
              preco={service.preco}
              precoPromocional={service.preco_promocional}
              custoPix={service.custo_pix}
              custoCartao={service.custo_cartao}
              numeroSessoes={service.numero_sessoes}
              precoVolume={service.preco_por_sessao}
            />

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                className="w-full bg-[#6B2D8B] hover:bg-[#5A2574] text-white text-base gap-2"
                onClick={() => toast.info('Funcionalidade em breve')}
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar ao Carrinho
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full text-base gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
              >
                <a
                  href={getWhatsAppUrl(service.nome)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-5 h-5" />
                  Agendar via WhatsApp
                </a>
              </Button>
            </div>

            {/* Tags */}
            {service.tags && service.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {service.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[11px] font-normal text-muted-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Bottom Section - Procedure Info                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="mt-12">
          <ProcedureInfo
            descricao={service.descricao}
            beneficios={
              Array.isArray(service.beneficios) ? service.beneficios : null
            }
            contraindicacoes={service.contraindicacoes}
            preparo={service.preparo}
            posProcedimento={service.pos_procedimento}
            equipamento={service.equipamento}
            duracaoMinutos={service.duracao_minutos}
            sessoesProtocolo={service.sessoes_protocolo}
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Related Services                                                   */}
        {/* ----------------------------------------------------------------- */}
        {relatedServices.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Servicos Relacionados
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {relatedServices.map((related) => (
                <ServiceCard
                  key={related.id}
                  service={related}
                  categorySlug={relatedCategorySlug}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
