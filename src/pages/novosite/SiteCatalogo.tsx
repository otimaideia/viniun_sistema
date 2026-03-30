import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, PackageOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';
import { CategoryGrid } from '@/components/novosite/CategoryGrid';
import { ServiceCard } from '@/components/novosite/ServiceCard';
import {
  useCategoriasPublicas,
  type PublicCategory,
} from '@/hooks/public/useCategoriasPublicas';
import {
  useServicosPublicos,
  type PublicService,
} from '@/hooks/public/useServicosPublicos';

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco' | 'a-z';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'menor-preco', label: 'Menor Preço' },
  { value: 'maior-preco', label: 'Maior Preço' },
  { value: 'a-z', label: 'A-Z' },
];

const AREA_SIZE_OPTIONS = [
  { value: 'all', label: 'Todos os tamanhos' },
  { value: 'P', label: 'Pequena (P)' },
  { value: 'M', label: 'Média (M)' },
  { value: 'G', label: 'Grande (G)' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract url segments after /novosite/ */
function extractSegments(pathname: string): string[] {
  const match = pathname.match(/^\/novosite\/(.+)/);
  if (!match) return [];
  return match[1]
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Walk the flat category list resolving slugs at each depth. */
function resolveCategoryPath(
  segments: string[],
  allCategories: PublicCategory[]
): PublicCategory[] {
  const path: PublicCategory[] = [];
  let parentId: string | null = null;

  for (const slug of segments) {
    const cat = allCategories.find(
      (c) => c.url_slug === slug && c.parent_id === parentId
    );
    if (!cat) break;
    path.push(cat);
    parentId = cat.id;
  }

  return path;
}

/** Determine the effective price for sorting purposes. */
function effectivePrice(service: PublicService): number {
  if (service.custo_pix && service.custo_pix > 0) return service.custo_pix;
  if (service.preco_promocional && service.preco_promocional > 0)
    return service.preco_promocional;
  if (service.preco && service.preco > 0) return service.preco;
  return Infinity; // services without price go last
}

/** Check if a category belongs to a depilation root. */
function isDepilationContext(categoryPath: PublicCategory[]): boolean {
  if (categoryPath.length === 0) return false;
  const rootSlug = categoryPath[0].url_slug || categoryPath[0].codigo;
  return rootSlug.includes('depilacao') || rootSlug.includes('depilação');
}

/** Build a descriptive SEO title from the category path. */
function buildSeoTitle(categoryPath: PublicCategory[]): string {
  if (categoryPath.length === 0) return 'Catálogo de Serviços';
  return categoryPath.map((c) => c.nome).join(' - ');
}

/** Build SEO description from the deepest category. */
function buildSeoDescription(categoryPath: PublicCategory[]): string {
  if (categoryPath.length === 0) {
    return 'Conheça todos os serviços de depilação a laser, estética facial e corporal da YESlaser Praia Grande.';
  }
  const deepest = categoryPath[categoryPath.length - 1];
  if (deepest.descricao) return deepest.descricao;
  return `Serviços de ${deepest.nome} na YESlaser Praia Grande. Agende sua avaliação gratuita.`;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden shadow-md">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ categoryPath }: { categoryPath: PublicCategory[] }) {
  const parentPath =
    categoryPath.length > 1
      ? '/novosite/' +
        categoryPath
          .slice(0, -1)
          .map((c) => c.url_slug || c.codigo)
          .join('/')
      : '/novosite';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Nenhum serviço encontrado
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Não encontramos serviços com os filtros selecionados. Tente alterar os
        filtros ou explore outras categorias.
      </p>
      <Button variant="outline" asChild>
        <a href={parentPath}>Explorar outras categorias</a>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SiteCatalogo() {
  const { pathname } = useLocation();
  const segments = useMemo(() => extractSegments(pathname), [pathname]);

  // Filters / controls
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('relevancia');
  const [areaSize, setAreaSize] = useState<string>('all');

  // Categories
  const {
    categories: allCategories,
    getSubcategories,
    isLoading: isCategoriesLoading,
  } = useCategoriasPublicas();

  // Resolve category path from URL segments
  const categoryPath = useMemo(
    () => resolveCategoryPath(segments, allCategories),
    [segments, allCategories]
  );

  const currentCategory =
    categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : null;

  // Determine if we should show subcategories or services
  const subcategories = useMemo(() => {
    if (!currentCategory) return [];
    return getSubcategories(currentCategory.id);
  }, [currentCategory, getSubcategories]);

  const hasChildren = subcategories.length > 0;
  const showDepilationFilters = isDepilationContext(categoryPath);

  // Build the base path for subcategory links (pass to CategoryGrid)
  const currentBasePath = useMemo(() => {
    if (segments.length === 0) return '/novosite';
    return '/novosite/' + segments.join('/');
  }, [segments]);

  // Fetch services only for leaf categories
  const serviceFilters = useMemo(() => {
    if (!currentCategory || hasChildren) return undefined;
    return {
      category_id: currentCategory.id,
      ...(search ? { search } : {}),
      ...(areaSize !== 'all' ? { tamanho_area: areaSize } : {}),
    };
  }, [currentCategory, hasChildren, search, areaSize]);

  const { data: rawServices, isLoading: isServicesLoading } =
    useServicosPublicos(serviceFilters);

  // Sort services client-side
  const services = useMemo(() => {
    if (!rawServices) return [];
    const sorted = [...rawServices];

    switch (sort) {
      case 'menor-preco':
        sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'maior-preco':
        sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'a-z':
        sorted.sort((a, b) =>
          (a.nome_curto || a.nome).localeCompare(b.nome_curto || b.nome, 'pt-BR')
        );
        break;
      default:
        // relevancia: destaques first, then by order (already from API)
        sorted.sort((a, b) => {
          if (a.destaque && !b.destaque) return -1;
          if (!a.destaque && b.destaque) return 1;
          return 0;
        });
        break;
    }

    return sorted;
  }, [rawServices, sort]);

  // Build the service card base path (full category path)
  const serviceBasePath = useMemo(() => {
    if (categoryPath.length === 0) return '/novosite';
    return (
      '/novosite/' +
      categoryPath.map((c) => c.url_slug || c.codigo).join('/')
    );
  }, [categoryPath]);

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    let href = '/novosite';
    return categoryPath.map((cat, i) => {
      href += `/${cat.url_slug || cat.codigo}`;
      const isLast = i === categoryPath.length - 1;
      return {
        label: cat.nome,
        href: isLast ? undefined : href,
      };
    });
  }, [categoryPath]);

  // SEO
  const seoTitle = buildSeoTitle(categoryPath);
  const seoDescription = buildSeoDescription(categoryPath);

  // Loading state
  const isLoading = isCategoriesLoading || (!hasChildren && isServicesLoading);

  // Category header
  const pageTitle = currentCategory?.nome || 'Catálogo de Serviços';
  const pageDescription = currentCategory?.descricao;

  return (
    <>
      <SEOHead title={seoTitle} description={seoDescription} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Category header */}
        <div className="mb-6 mt-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {pageTitle}
          </h1>
          {pageDescription && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              {pageDescription}
            </p>
          )}
        </div>

        {/* If has subcategories → show grid */}
        {!isCategoriesLoading && hasChildren && (
          <section>
            <CategoryGrid
              categories={subcategories}
              basePath={currentBasePath}
              columns={subcategories.length <= 3 ? 3 : 4}
            />
          </section>
        )}

        {/* If leaf category → show services */}
        {!isCategoriesLoading && !hasChildren && currentCategory && (
          <section>
            {/* Toolbar: search, sort, area filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              {/* Area size filter (depilation only) */}
              {showDepilationFilters && (
                <Select value={areaSize} onValueChange={setAreaSize}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-white">
                    <SlidersHorizontal className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tamanho da área" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as SortOption)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filters */}
            {(search || areaSize !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs text-muted-foreground">Filtros:</span>
                {search && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => setSearch('')}
                  >
                    &quot;{search}&quot; &times;
                  </Badge>
                )}
                {areaSize !== 'all' && (
                  <Badge
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => setAreaSize('all')}
                  >
                    Área {areaSize} &times;
                  </Badge>
                )}
              </div>
            )}

            {/* Results count */}
            {!isServicesLoading && services.length > 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                {services.length}{' '}
                {services.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
              </p>
            )}

            {/* Services grid */}
            {isServicesLoading ? (
              <CatalogSkeleton />
            ) : services.length === 0 ? (
              <EmptyState categoryPath={categoryPath} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    basePath={serviceBasePath}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Loading state for categories */}
        {isCategoriesLoading && <CatalogSkeleton count={6} />}

        {/* Edge case: segments provided but no matching category */}
        {!isCategoriesLoading &&
          segments.length > 0 &&
          categoryPath.length === 0 && (
            <EmptyState categoryPath={[]} />
          )}
      </div>
    </>
  );
}
