// =============================================================================
// HOME PAGE - Pagina publica do site imobiliario (replica viniimoveis.com.br)
// =============================================================================
// Multi-tenant: cada empresa tem seu proprio site com branding
// Queries publicas via anon key (sem auth)
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout, { usePublicTenant } from './PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Home,
  BedDouble,
  Car,
  Bath,
  Maximize2,
  MapPin,
  Phone,
  ArrowRight,
  Building2,
  Users,
  Award,
  TrendingUp,
  Star,
  ChevronRight,
} from 'lucide-react';
import type { MTProperty, MTPropertyType, MTPropertyPurpose } from '@/types/imovel-mt';
import type { MTLocation } from '@/types/location-mt';
import type { Branding, Tenant } from '@/types/multitenant';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SearchFilters {
  tipo?: string;
  finalidade?: string;
  cidade?: string;
  bairro?: string;
  dormitorios?: string;
  valor_maximo?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DORMITORIOS_OPTIONS = [
  { value: '1', label: '1 Dormitorio' },
  { value: '2', label: '2 Dormitorios' },
  { value: '3', label: '3 Dormitorios' },
  { value: '4', label: '4 Dormitorios' },
  { value: '5', label: '5+ Dormitorios' },
];

const VALOR_MAXIMO_OPTIONS = [
  { value: '100000', label: 'Ate R$ 100 mil' },
  { value: '200000', label: 'Ate R$ 200 mil' },
  { value: '300000', label: 'Ate R$ 300 mil' },
  { value: '500000', label: 'Ate R$ 500 mil' },
  { value: '1000000', label: 'Ate R$ 1 milhao' },
  { value: '2000000', label: 'Ate R$ 2 milhoes' },
  { value: '5000000', label: 'Ate R$ 5 milhoes' },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatPrice(value: number | null): string {
  if (!value) return 'Consulte';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPropertyPrice(property: MTProperty): number | null {
  return property.valor_venda || property.valor_locacao || property.valor_temporada || null;
}

function getPropertyPriceLabel(property: MTProperty): string {
  if (property.valor_venda) return formatPrice(property.valor_venda);
  if (property.valor_locacao) return `${formatPrice(property.valor_locacao)}/mes`;
  if (property.valor_temporada) return `${formatPrice(property.valor_temporada)}/dia`;
  return 'Consulte';
}

// -----------------------------------------------------------------------------
// Hook: usePublicProperties
// -----------------------------------------------------------------------------

function usePublicProperties(tenantId: string | undefined, options: {
  destaque?: boolean;
  lancamento?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['public-properties', tenantId, options],
    queryFn: async () => {
      if (!tenantId) return [];

      let q = supabase
        .from('mt_properties')
        .select(`
          id, tenant_id, titulo, slug, ref_code,
          dormitorios, suites, banheiros, garagens,
          area_total, area_construida,
          valor_venda, valor_locacao, valor_temporada,
          situacao, destaque, lancamento,
          foto_destaque_url,
          property_type_id, purpose_id,
          location_cidade_id, location_bairro_id,
          property_type:mt_property_types!property_type_id(id, nome, icone),
          purpose:mt_property_purposes!purpose_id(id, nome),
          location_cidade:mt_locations!location_cidade_id(id, nome),
          location_bairro:mt_locations!location_bairro_id(id, nome)
        `)
        .eq('tenant_id', tenantId)
        .eq('situacao', 'disponivel')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (options.destaque) q = q.eq('destaque', true);
      if (options.lancamento) q = q.eq('lancamento', true);
      if (options.limit) q = q.limit(options.limit);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTProperty[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

// -----------------------------------------------------------------------------
// Hook: usePublicSearchData
// -----------------------------------------------------------------------------

function usePublicSearchData(tenantId: string | undefined) {
  const types = useQuery({
    queryKey: ['public-property-types', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('mt_property_types')
        .select('id, nome, codigo, icone')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('parent_id', null)
        .order('ordem');
      return (data || []) as MTPropertyType[];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
  });

  const purposes = useQuery({
    queryKey: ['public-property-purposes', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('mt_property_purposes')
        .select('id, nome, codigo')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('ordem');
      return (data || []) as MTPropertyPurpose[];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
  });

  const cidades = useQuery({
    queryKey: ['public-locations-cidades', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('mt_locations')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'cidade')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('nome');
      return (data || []) as MTLocation[];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
  });

  return { types, purposes, cidades };
}

function usePublicBairros(tenantId: string | undefined, cidadeId: string | undefined) {
  return useQuery({
    queryKey: ['public-locations-bairros', tenantId, cidadeId],
    queryFn: async () => {
      if (!tenantId || !cidadeId) return [];
      const { data } = await supabase
        .from('mt_locations')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .eq('tipo', 'bairro')
        .eq('parent_id', cidadeId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('nome');
      return (data || []) as MTLocation[];
    },
    enabled: !!tenantId && !!cidadeId,
    staleTime: 10 * 60 * 1000,
  });
}

// -----------------------------------------------------------------------------
// HERO SECTION
// -----------------------------------------------------------------------------

function HeroSection({
  tenant,
  branding,
}: {
  tenant: Tenant | null;
  branding: Branding | null;
}) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SearchFilters>({});
  const { types, purposes, cidades } = usePublicSearchData(tenant?.id);
  const { data: bairros } = usePublicBairros(tenant?.id, filters.cidade);

  const primaryColor = branding?.cor_primaria || '#1E3A5F';

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.finalidade) params.set('finalidade', filters.finalidade);
    if (filters.cidade) params.set('cidade', filters.cidade);
    if (filters.bairro) params.set('bairro', filters.bairro);
    if (filters.dormitorios) params.set('dormitorios', filters.dormitorios);
    if (filters.valor_maximo) params.set('valor_maximo', filters.valor_maximo);
    navigate(`/busca?${params.toString()}`);
  }, [filters, navigate]);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Limpar bairro se cidade mudar
      if (key === 'cidade') next.bairro = undefined;
      return next;
    });
  };

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: branding?.imagem_login_fundo
            ? `url(${branding.imagem_login_fundo})`
            : `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80')`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}aa 50%, ${primaryColor}66 100%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            Encontre o imovel{' '}
            <span style={{ color: branding?.cor_secundaria || '#D4A853' }}>
              perfeito
            </span>{' '}
            para voce
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            {tenant?.nome_fantasia || 'Nossa empresa'} conecta voce ao imovel dos seus sonhos.
            Venda, locacao e muito mais.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-2xl p-4 md:p-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Tipo */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Tipo do Imovel
              </label>
              <Select
                value={filters.tipo || ''}
                onValueChange={(v) => updateFilter('tipo', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  {(types.data || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Finalidade */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Finalidade
              </label>
              <Select
                value={filters.finalidade || ''}
                onValueChange={(v) => updateFilter('finalidade', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as finalidades" />
                </SelectTrigger>
                <SelectContent>
                  {(purposes.data || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cidade */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Cidade
              </label>
              <Select
                value={filters.cidade || ''}
                onValueChange={(v) => updateFilter('cidade', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  {(cidades.data || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bairro */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Bairro
              </label>
              <Select
                value={filters.bairro || ''}
                onValueChange={(v) => updateFilter('bairro', v)}
                disabled={!filters.cidade}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      filters.cidade ? 'Selecione o bairro' : 'Selecione a cidade primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(bairros || []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dormitorios */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Dormitorios
              </label>
              <Select
                value={filters.dormitorios || ''}
                onValueChange={(v) => updateFilter('dormitorios', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Qtd. dormitorios" />
                </SelectTrigger>
                <SelectContent>
                  {DORMITORIOS_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor Maximo */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Valor Maximo
              </label>
              <Select
                value={filters.valor_maximo || ''}
                onValueChange={(v) => updateFilter('valor_maximo', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem limite" />
                </SelectTrigger>
                <SelectContent>
                  {VALOR_MAXIMO_OPTIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search button */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleSearch}
              size="lg"
              className="px-8 md:px-12 text-white font-semibold rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Imoveis
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// PROPERTY CARD
// -----------------------------------------------------------------------------

function PropertyCard({
  property,
  branding,
}: {
  property: MTProperty;
  branding: Branding | null;
}) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';
  const secondaryColor = branding?.cor_secundaria || '#D4A853';

  const cidadeNome = (property as any).location_cidade?.nome || '';
  const bairroNome = (property as any).location_bairro?.nome || '';
  const tipoNome = (property as any).property_type?.nome || '';
  const location = [bairroNome, cidadeNome].filter(Boolean).join(', ');

  const placeholderImg =
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=60';

  return (
    <Link to={`/imovel/${property.slug || property.id}`}>
      <Card className="group overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.foto_destaque_url || placeholderImg}
            alt={property.titulo || 'Imovel'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Type badge */}
          {tipoNome && (
            <Badge
              className="absolute top-3 left-3 text-white text-xs font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              {tipoNome}
            </Badge>
          )}
          {/* Lancamento badge */}
          {property.lancamento && (
            <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold">
              Lancamento
            </Badge>
          )}
          {/* Price overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 py-2 px-3 text-white font-bold text-lg"
            style={{
              background: `linear-gradient(transparent, ${primaryColor}cc)`,
            }}
          >
            {getPropertyPriceLabel(property)}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm md:text-base leading-tight group-hover:text-blue-700 transition-colors">
            {property.titulo || `${tipoNome} em ${bairroNome || cidadeNome}`}
          </h3>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Ref code */}
          {property.ref_code && (
            <div className="text-xs text-gray-400">Ref: {property.ref_code}</div>
          )}

          {/* Features */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-gray-600 text-xs">
            {property.dormitorios > 0 && (
              <div className="flex items-center gap-1" title="Dormitorios">
                <BedDouble className="h-3.5 w-3.5" />
                <span>{property.dormitorios}</span>
              </div>
            )}
            {property.banheiros > 0 && (
              <div className="flex items-center gap-1" title="Banheiros">
                <Bath className="h-3.5 w-3.5" />
                <span>{property.banheiros}</span>
              </div>
            )}
            {property.garagens > 0 && (
              <div className="flex items-center gap-1" title="Garagens">
                <Car className="h-3.5 w-3.5" />
                <span>{property.garagens}</span>
              </div>
            )}
            {(property.area_total || property.area_construida) && (
              <div className="flex items-center gap-1" title="Area">
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{property.area_total || property.area_construida}m2</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// -----------------------------------------------------------------------------
// PROPERTIES SECTION (destaques ou lancamentos)
// -----------------------------------------------------------------------------

function PropertiesSection({
  title,
  subtitle,
  properties,
  isLoading,
  branding,
  seeAllHref,
}: {
  title: string;
  subtitle?: string;
  properties: MTProperty[];
  isLoading: boolean;
  branding: Branding | null;
  seeAllHref?: string;
}) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: primaryColor }}>
            {title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg aspect-[4/3]" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!properties.length) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: primaryColor }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} branding={branding} />
          ))}
        </div>

        {/* See all */}
        {seeAllHref && (
          <div className="text-center mt-8">
            <Link to={seeAllHref}>
              <Button
                variant="outline"
                className="rounded-full px-6 border-2 font-semibold"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Ver todos os imoveis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// ABOUT / STATS SECTION
// -----------------------------------------------------------------------------

function AboutSection({
  tenant,
  branding,
  propertyCount,
}: {
  tenant: Tenant | null;
  branding: Branding | null;
  propertyCount: number;
}) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';
  const secondaryColor = branding?.cor_secundaria || '#D4A853';

  const stats = useMemo(
    () => [
      {
        icon: Building2,
        value: propertyCount > 0 ? `${propertyCount}+` : '100+',
        label: 'Imoveis Disponiveis',
      },
      { icon: Users, value: '500+', label: 'Clientes Atendidos' },
      { icon: Award, value: '10+', label: 'Anos de Mercado' },
      { icon: Star, value: '98%', label: 'Satisfacao' },
    ],
    [propertyCount]
  );

  return (
    <section id="quem-somos" className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <Badge
              className="mb-4 text-white"
              style={{ backgroundColor: secondaryColor }}
            >
              Quem Somos
            </Badge>
            <h2
              className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
              style={{ color: primaryColor }}
            >
              {tenant?.nome_fantasia || 'Nossa Imobiliaria'},<br />
              referencia no mercado imobiliario
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Com anos de experiencia no mercado imobiliario, a{' '}
                <strong>{tenant?.nome_fantasia || 'nossa empresa'}</strong> se
                destaca pela excelencia no atendimento e pela qualidade dos
                imoveis que oferecemos.
              </p>
              <p>
                Nossa equipe de profissionais altamente qualificados esta pronta
                para ajudar voce a encontrar o imovel perfeito, seja para
                moradia, investimento ou locacao.
              </p>
              <p>
                Trabalhamos com transparencia, etica e comprometimento para
                garantir a melhor experiencia na compra, venda ou aluguel do seu
                imovel.
              </p>
            </div>
            <div className="mt-6">
              <a href="#contato">
                <Button
                  className="rounded-full px-6 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Entre em contato
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </a>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="text-center p-6 border-none shadow-md hover:shadow-lg transition-shadow"
              >
                <stat.icon
                  className="h-8 w-8 mx-auto mb-3"
                  style={{ color: primaryColor }}
                />
                <div
                  className="text-3xl md:text-4xl font-bold mb-1"
                  style={{ color: primaryColor }}
                >
                  {stat.value}
                </div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// SERVICES SECTION
// -----------------------------------------------------------------------------

function ServicesSection({ branding }: { branding: Branding | null }) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';

  const services = [
    {
      icon: Home,
      title: 'Venda de Imoveis',
      desc: 'Encontre o imovel dos seus sonhos com as melhores condicoes do mercado.',
    },
    {
      icon: TrendingUp,
      title: 'Locacao',
      desc: 'Alugar nunca foi tao facil. Temos opcoes para todos os perfis e orcamentos.',
    },
    {
      icon: Award,
      title: 'Avaliacao',
      desc: 'Avaliacao profissional para determinar o valor justo do seu imovel.',
    },
    {
      icon: Building2,
      title: 'Administracao',
      desc: 'Administramos seu imovel com total seguranca e transparencia.',
    },
  ];

  return (
    <section id="servicos" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: primaryColor }}
          >
            Nossos Servicos
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Solucoes completas para quem busca comprar, vender ou alugar
            imoveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((svc) => (
            <Card
              key={svc.title}
              className="group p-6 text-center border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svc.icon
                  className="h-7 w-7"
                  style={{ color: primaryColor }}
                />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{svc.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{svc.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// CTA SECTION
// -----------------------------------------------------------------------------

function CTASection({
  tenant,
  branding,
}: {
  tenant: Tenant | null;
  branding: Branding | null;
}) {
  const primaryColor = branding?.cor_primaria || '#1E3A5F';
  const phone = tenant?.telefone || '';
  const whatsappLink = phone
    ? `https://wa.me/55${phone.replace(/\D/g, '')}`
    : '#contato';

  return (
    <section
      className="py-16 md:py-20 text-white text-center"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-2xl md:text-4xl font-bold mb-4">
          Pronto para encontrar seu imovel ideal?
        </h2>
        <p className="text-white/80 mb-8 text-lg">
          Nossa equipe esta pronta para ajudar voce. Entre em contato agora
          mesmo e realize seu sonho.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/busca">
            <Button
              size="lg"
              className="bg-white hover:bg-gray-100 rounded-full px-8 font-semibold"
              style={{ color: primaryColor }}
            >
              <Search className="h-5 w-5 mr-2" />
              Buscar Imoveis
            </Button>
          </Link>
          {phone && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 font-semibold"
              >
                <Phone className="h-5 w-5 mr-2" />
                WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// HOME PAGE (default export)
// -----------------------------------------------------------------------------

export default function HomePage() {
  const { tenant, branding, isLoading, propertyCount } = usePublicTenant();

  const { data: destaques = [], isLoading: loadingDestaques } = usePublicProperties(
    tenant?.id,
    { destaque: true, limit: 8 }
  );

  const { data: lancamentos = [], isLoading: loadingLancamentos } = usePublicProperties(
    tenant?.id,
    { lancamento: true, limit: 4 }
  );

  // Page title
  useEffect(() => {
    if (tenant) {
      document.title = `${tenant.nome_fantasia} | Imoveis`;
    }
  }, [tenant]);

  return (
    <PublicLayout>
      <HeroSection tenant={tenant} branding={branding} />

      <PropertiesSection
        title="Imoveis em Destaque"
        subtitle="Selecionamos os melhores imoveis para voce"
        properties={destaques}
        isLoading={loadingDestaques}
        branding={branding}
        seeAllHref="/busca?destaque=true"
      />

      {lancamentos.length > 0 && (
        <div className="bg-gray-50">
          <PropertiesSection
            title="Lancamentos"
            subtitle="Confira os lancamentos mais recentes"
            properties={lancamentos}
            isLoading={loadingLancamentos}
            branding={branding}
            seeAllHref="/busca?lancamento=true"
          />
        </div>
      )}

      <ServicesSection branding={branding} />

      <AboutSection
        tenant={tenant}
        branding={branding}
        propertyCount={propertyCount}
      />

      <CTASection tenant={tenant} branding={branding} />
    </PublicLayout>
  );
}
