import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Autoplay from 'embla-carousel-autoplay';
import { useSiteBanners, type PublicBanner } from '@/hooks/public/useSiteBanners';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function HeroSkeleton() {
  return (
    <div className="relative h-[400px] md:h-[500px] w-full">
      <Skeleton className="h-full w-full rounded-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-6 w-60 max-w-full" />
        <Skeleton className="h-12 w-40" />
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <div className="relative h-[400px] md:h-[500px] w-full bg-gradient-to-br from-[#6B2D8B] via-[#5B2378] to-[#1a1a2e]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-lg">
          Sua beleza merece o melhor
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg md:text-xl">
          Depilacao a laser, estetica avanada e muito mais. Agende sua avaliacao gratuita.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 bg-white text-[#6B2D8B] hover:bg-white/90 font-semibold shadow-lg"
        >
          <Link to="/novosite/depilacao-a-laser">Conheca nossos servicos</Link>
        </Button>
      </div>
    </div>
  );
}

function SlideContent({ banner }: { banner: PublicBanner }) {
  const textColor = banner.cor_texto || '#FFFFFF';

  return (
    <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
      {/* Desktop image */}
      <img
        src={banner.imagem_url}
        alt={banner.titulo}
        className={cn(
          'h-full w-full object-cover',
          banner.imagem_mobile_url ? 'hidden md:block' : ''
        )}
        loading="lazy"
      />

      {/* Mobile image */}
      {banner.imagem_mobile_url && (
        <img
          src={banner.imagem_mobile_url}
          alt={banner.titulo}
          className="h-full w-full object-cover md:hidden"
          loading="lazy"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-16 text-center md:justify-center md:pb-0">
        <h2
          className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl drop-shadow-lg"
          style={{ color: textColor }}
        >
          {banner.titulo}
        </h2>

        {banner.subtitulo && (
          <p
            className="mt-3 max-w-lg text-sm sm:text-base md:text-lg drop-shadow"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {banner.subtitulo}
          </p>
        )}

        {banner.link_url && (
          <Button
            asChild
            size="lg"
            className="mt-6 bg-white text-[#6B2D8B] hover:bg-white/90 font-semibold shadow-lg"
          >
            <Link to={banner.link_url}>
              {banner.link_texto || 'Saiba mais'}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function HeroSlider() {
  const { data: banners, isLoading } = useSiteBanners('hero');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    setCount(api.scrollSnapList().length);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  if (isLoading) {
    return <HeroSkeleton />;
  }

  if (!banners || banners.length === 0) {
    return <FallbackHero />;
  }

  if (banners.length === 1) {
    return <SlideContent banner={banners[0]} />;
  }

  return (
    <div className="relative w-full">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: 'start' }}
        plugins={[
          Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
        ]}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              <SlideContent banner={banner} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation arrows */}
        <button
          onClick={() => api?.scrollPrev()}
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40 md:left-6 md:h-12 md:w-12"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40 md:right-6 md:h-12 md:w-12"
          aria-label="Proximo slide"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </Carousel>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                current === index
                  ? 'w-8 bg-white'
                  : 'w-2.5 bg-white/50 hover:bg-white/70'
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
