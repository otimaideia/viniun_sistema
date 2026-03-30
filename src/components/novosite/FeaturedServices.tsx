import { Link } from 'react-router-dom';
import { useServicosPublicos } from '@/hooks/public/useServicosPublicos';
import { ServiceCard } from './ServiceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Star } from 'lucide-react';

function ServiceSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

export function FeaturedServices() {
  const { data: services, isLoading } = useServicosPublicos({ destaque: true });

  // Don't render if no featured services and not loading
  if (!isLoading && (!services || services.length === 0)) {
    return null;
  }

  const displayServices = services?.slice(0, 8) ?? [];

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Star className="h-5 w-5 fill-[#6B2D8B] text-[#6B2D8B]" />
              <p className="text-sm font-semibold uppercase tracking-wider text-[#6B2D8B]">
                Destaques
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Procedimentos em Destaque
            </h2>
          </div>

          <Link
            to="/novosite/depilacao-a-laser"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B2D8B] transition-colors hover:text-[#5B2378] sm:mt-0"
          >
            Ver todos os servicos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ServiceSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
