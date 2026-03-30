import { useCallback, useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Star, ExternalLink } from 'lucide-react';

interface GoogleReviewsProps {
  placeId?: string;
}

interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  date: string;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: 1,
    author: 'Maria S.',
    rating: 5,
    text: 'Excelente atendimento! Profissionais muito capacitados. Me senti acolhida desde a primeira sessao. Recomendo de olhos fechados!',
    date: 'Ha 2 semanas',
  },
  {
    id: 2,
    author: 'Ana C.',
    rating: 5,
    text: 'Melhor clinica de depilacao a laser da regiao. Os resultados sao visiveis desde a primeira sessao. Ambiente super limpo e organizado.',
    date: 'Ha 1 mes',
  },
  {
    id: 3,
    author: 'Fernanda L.',
    rating: 5,
    text: 'Ambiente limpo e aconchegante. Recomendo! As profissionais sao muito atenciosas e explicam todo o procedimento com detalhes.',
    date: 'Ha 1 mes',
  },
  {
    id: 4,
    author: 'Patricia M.',
    rating: 5,
    text: 'Resultados incriveis com o botox. Voltarei! O atendimento foi impecavel e o resultado ficou muito natural, como eu queria.',
    date: 'Ha 2 meses',
  },
  {
    id: 5,
    author: 'Juliana R.',
    rating: 4,
    text: 'Precos justos e atendimento personalizado. A equipe e muito profissional e sempre sugere o melhor tratamento para cada caso.',
    date: 'Ha 2 meses',
  },
  {
    id: 6,
    author: 'Camila B.',
    rating: 5,
    text: 'Fiz o pacote corpo inteiro e amei! Cada sessao foi melhor que a anterior. Os resultados sao reais e duradouros. Super indico!',
    date: 'Ha 3 meses',
  },
];

const AVERAGE_RATING = 4.8;
const TOTAL_REVIEWS = 200;

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : star - 0.5 <= rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-gray-200 text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.author
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="flex h-full flex-col border border-gray-100 p-5 shadow-sm">
      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B2D8B]/10 text-sm font-semibold text-[#6B2D8B]">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {review.author}
          </p>
          <p className="text-xs text-gray-500">{review.date}</p>
        </div>
      </div>

      {/* Stars */}
      <div className="mt-3">
        <StarRating rating={review.rating} />
      </div>

      {/* Text */}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-3">
        {review.text}
      </p>

      {/* Google attribution */}
      <div className="mt-4 flex items-center gap-1.5">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span className="text-[11px] text-gray-400">Google</span>
      </div>
    </Card>
  );
}

export function GoogleReviews({ placeId }: GoogleReviewsProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
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

  const googleUrl = placeId
    ? `https://search.google.com/local/reviews?placeid=${placeId}`
    : 'https://www.google.com/maps';

  return (
    <section className="bg-gray-50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            O que nossos clientes dizem
          </h2>

          {/* Overall rating */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-4xl font-bold text-gray-900">{AVERAGE_RATING}</span>
            <div>
              <StarRating rating={AVERAGE_RATING} size="lg" />
              <p className="mt-0.5 text-sm text-gray-500">
                {TOTAL_REVIEWS}+ avaliacoes no Google
              </p>
            </div>
          </div>
        </div>

        {/* Reviews carousel */}
        <div className="relative mt-10">
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {SAMPLE_REVIEWS.map((review) => (
                <CarouselItem
                  key={review.id}
                  className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
                >
                  <ReviewCard review={review} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Custom nav arrows */}
          {canScrollPrev && (
            <button
              onClick={() => api?.scrollPrev()}
              className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 md:-left-5"
              aria-label="Avaliacoes anteriores"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {canScrollNext && (
            <button
              onClick={() => api?.scrollNext()}
              className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 md:-right-5"
              aria-label="Proximas avaliacoes"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Google CTA */}
        <div className="mt-8 text-center">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B2D8B] transition-colors hover:text-[#5B2378]"
          >
            Ver todas as avaliacoes no Google
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
