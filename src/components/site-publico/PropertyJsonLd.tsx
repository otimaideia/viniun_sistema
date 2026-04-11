// =============================================================================
// PropertyJsonLd - Gerador de JSON-LD Schema.org para Imóveis
// =============================================================================
//
// Gera dados estruturados RealEstateListing para SEO do Google.
// Ref: https://schema.org/RealEstateListing
//
// =============================================================================

import type { MTProperty, MTPropertyPhoto } from '@/types/imovel-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TenantInfo {
  nome_fantasia?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  site_url?: string;
}

interface PropertyJsonLdData {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  url: string;
  image?: string[];
  datePosted?: string;
  dateModified?: string;
  offers?: {
    '@type': string;
    price?: number;
    priceCurrency: string;
    availability: string;
  };
  address?: {
    '@type': string;
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    '@type': string;
    latitude: number;
    longitude: number;
  };
  numberOfRooms?: number;
  numberOfBathroomsTotal?: number;
  floorSize?: {
    '@type': string;
    value: string;
    unitCode: string;
  };
  numberOfBedrooms?: number;
  petsAllowed?: boolean;
  broker?: {
    '@type': string;
    name?: string;
    telephone?: string;
    email?: string;
    logo?: string;
    url?: string;
  };
}

// -----------------------------------------------------------------------------
// Generator Function
// -----------------------------------------------------------------------------

/**
 * Gera o objeto JSON-LD Schema.org/RealEstateListing para um imóvel.
 *
 * Uso:
 * ```tsx
 * const jsonLd = generatePropertyJsonLd(property, photos, tenant);
 * <SEOHead title={...} description={...} jsonLd={jsonLd} />
 * ```
 */
export function generatePropertyJsonLd(
  property: MTProperty,
  photos: MTPropertyPhoto[],
  tenant?: TenantInfo | null,
): PropertyJsonLdData {
  // Determinar o preço principal (venda ou locação)
  const price = property.valor_venda || property.valor_locacao || property.valor_temporada || undefined;

  // Mapa de situação para availability Schema.org
  const availabilityMap: Record<string, string> = {
    disponivel: 'https://schema.org/InStock',
    vendido: 'https://schema.org/SoldOut',
    alugado: 'https://schema.org/SoldOut',
    reservado: 'https://schema.org/PreOrder',
    inativo: 'https://schema.org/Discontinued',
  };

  const availability = availabilityMap[property.situacao] || 'https://schema.org/InStock';

  // URL canônica do imóvel
  const slug = property.slug || property.id;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${baseUrl}/imovel/${slug}`;

  // Fotos (até 10 para o JSON-LD)
  const imageUrls = photos
    .filter((p) => p.url)
    .slice(0, 10)
    .map((p) => p.url);

  // Construir objeto base
  const jsonLd: PropertyJsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.titulo || `Imóvel ${property.ref_code || property.id.substring(0, 8)}`,
    url,
  };

  // Descrição (limitar a 300 caracteres)
  if (property.descricao) {
    jsonLd.description = property.descricao.substring(0, 300).trim();
  }

  // Imagens
  if (imageUrls.length > 0) {
    jsonLd.image = imageUrls;
  } else if (property.foto_destaque_url) {
    jsonLd.image = [property.foto_destaque_url];
  }

  // Datas
  if (property.created_at) {
    jsonLd.datePosted = property.created_at;
  }
  if (property.updated_at) {
    jsonLd.dateModified = property.updated_at;
  }

  // Oferta (preço)
  if (price) {
    jsonLd.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'BRL',
      availability,
    };
  }

  // Endereço
  const hasAddress = property.endereco || property.location_cidade?.nome || property.cep;
  if (hasAddress) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
    };
    if (property.endereco) {
      const streetParts = [property.endereco];
      if (property.numero) streetParts.push(property.numero);
      jsonLd.address.streetAddress = streetParts.join(', ');
    }
    if (property.location_cidade?.nome) {
      jsonLd.address.addressLocality = property.location_cidade.nome;
    }
    if (property.location_estado?.uf) {
      jsonLd.address.addressRegion = property.location_estado.uf;
    }
    if (property.cep) {
      jsonLd.address.postalCode = property.cep;
    }
  }

  // Coordenadas
  if (property.latitude && property.longitude) {
    jsonLd.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  // Cômodos
  if (property.dormitorios > 0) {
    jsonLd.numberOfRooms = property.dormitorios + (property.salas || 0);
    jsonLd.numberOfBedrooms = property.dormitorios;
  }
  if (property.banheiros > 0) {
    jsonLd.numberOfBathroomsTotal = property.banheiros;
  }

  // Área
  const area = property.area_total || property.area_construida || property.area_util;
  if (area) {
    jsonLd.floorSize = {
      '@type': 'QuantitativeValue',
      value: String(area),
      unitCode: 'MTK', // metros quadrados
    };
  }

  // Corretor / Imobiliária (tenant)
  if (tenant) {
    jsonLd.broker = {
      '@type': 'RealEstateAgent',
    };
    if (tenant.nome_fantasia) jsonLd.broker.name = tenant.nome_fantasia;
    if (tenant.telefone) jsonLd.broker.telephone = tenant.telefone;
    if (tenant.email) jsonLd.broker.email = tenant.email;
    if (tenant.logo_url) jsonLd.broker.logo = tenant.logo_url;
    if (tenant.site_url) jsonLd.broker.url = tenant.site_url;
  }

  return jsonLd;
}

// -----------------------------------------------------------------------------
// Breadcrumb JSON-LD helper
// -----------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Gera JSON-LD BreadcrumbList para navegação estruturada.
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export default generatePropertyJsonLd;
