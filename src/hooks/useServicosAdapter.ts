// =============================================================================
// USE SERVICOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para serviços
// SISTEMA 100% MT - Usa mt_services diretamente via useServicosMT
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useServicosMT, useServicoMT } from './multitenant/useServicosMT';
import type { MTService, MTServiceCreate, MTServiceUpdate, MTServiceFilters } from './multitenant/useServicosMT';

// =============================================================================
// Types
// =============================================================================

export interface ServicoAdaptado {
  id: string;
  tenant_id?: string;
  franchise_id?: string | null;
  // Campos comuns
  nome: string;
  descricao: string | null;
  categoria: string | null;
  preco: number | null;
  preco_promocional?: number | null;
  duracao?: number | null;
  duracao_minutos?: number | null;
  imagem_url: string | null;
  is_active: boolean;
  ativo?: boolean;
  ordem: number;
  destaque?: boolean;
  created_at: string;
  updated_at: string;
  // Campos extras MT
  codigo?: string | null;
  galeria?: string[] | null;
  tags?: string[] | null;
  // Tipo e campos Meta Commerce / Google Business
  tipo?: 'servico' | 'produto';
  sku?: string | null;
  marca?: string | null;
  url?: string | null;
  disponibilidade?: 'in_stock' | 'out_of_stock' | 'preorder';
  condicao?: 'new' | 'refurbished' | 'used';
  gtin?: string | null;
  meta_catalog_id?: string | null;
  google_category?: string | null;
  // Relacionamentos
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
}

export interface ServicoCreateInput {
  nome: string;
  descricao?: string;
  categoria?: string;
  preco?: number;
  preco_promocional?: number;
  duracao?: number;
  duracao_minutos?: number;
  imagem_url?: string;
  is_active?: boolean;
  ativo?: boolean;
  ordem?: number;
  destaque?: boolean;
  codigo?: string;
  galeria?: string[];
  tags?: string[];
  tipo?: 'servico' | 'produto';
  sku?: string;
  marca?: string;
  url?: string;
  disponibilidade?: 'in_stock' | 'out_of_stock' | 'preorder';
  condicao?: 'new' | 'refurbished' | 'used';
  gtin?: string;
  meta_catalog_id?: string;
  google_category?: string;
}

export interface ServicoUpdateInput extends Partial<ServicoCreateInput> {
  id: string;
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTToAdaptado(service: MTService): ServicoAdaptado {
  return {
    id: service.id,
    tenant_id: service.tenant_id,
    franchise_id: (service as any).franchise_id ?? null,
    nome: service.nome,
    descricao: service.descricao,
    categoria: service.categoria,
    preco: service.preco,
    preco_promocional: service.preco_promocional,
    duracao: service.duracao_minutos,
    duracao_minutos: service.duracao_minutos,
    imagem_url: service.imagem_url,
    is_active: service.is_active,
    ativo: service.is_active,
    ordem: service.ordem,
    destaque: service.destaque,
    created_at: service.created_at,
    updated_at: service.updated_at,
    codigo: service.codigo,
    galeria: service.galeria,
    tags: service.tags,
    tipo: service.tipo,
    sku: service.sku,
    marca: service.marca,
    url: service.url,
    disponibilidade: service.disponibilidade,
    condicao: service.condicao,
    gtin: service.gtin,
    meta_catalog_id: service.meta_catalog_id,
    google_category: service.google_category,
    tenant: service.tenant,
  };
}

function mapAdaptadoToMTCreate(data: ServicoCreateInput): MTServiceCreate {
  return {
    nome: data.nome,
    descricao: data.descricao,
    categoria: data.categoria,
    preco: data.preco,
    preco_promocional: data.preco_promocional,
    duracao_minutos: data.duracao || data.duracao_minutos,
    imagem_url: data.imagem_url,
    is_active: data.is_active ?? data.ativo ?? true,
    ordem: data.ordem || 0,
    destaque: data.destaque || false,
    codigo: data.codigo,
    galeria: data.galeria,
    tags: data.tags,
    tipo: data.tipo,
    sku: data.sku,
    marca: data.marca,
    url: data.url,
    disponibilidade: data.disponibilidade,
    condicao: data.condicao,
    gtin: data.gtin,
    meta_catalog_id: data.meta_catalog_id,
    google_category: data.google_category,
  };
}

function mapAdaptadoToMTUpdate(data: ServicoUpdateInput): MTServiceUpdate {
  return {
    id: data.id,
    nome: data.nome,
    descricao: data.descricao,
    categoria: data.categoria,
    preco: data.preco,
    preco_promocional: data.preco_promocional,
    duracao_minutos: data.duracao || data.duracao_minutos,
    imagem_url: data.imagem_url,
    is_active: data.is_active ?? data.ativo,
    ordem: data.ordem,
    destaque: data.destaque,
    codigo: data.codigo,
    galeria: data.galeria,
    tags: data.tags,
    tipo: data.tipo,
    sku: data.sku,
    marca: data.marca,
    url: data.url,
    disponibilidade: data.disponibilidade,
    condicao: data.condicao,
    gtin: data.gtin,
    meta_catalog_id: data.meta_catalog_id,
    google_category: data.google_category,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useServicosAdapter(filters?: MTServiceFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT - sempre usa tabelas mt_*
  const mt = useServicosMT(filters);

  return {
    servicos: mt.servicos.map(mapMTToAdaptado),
    franchiseServices: mt.franchiseServices,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    createServico: (data: ServicoCreateInput) => {
      mt.createServico.mutate(mapAdaptadoToMTCreate(data));
    },

    createServicoAsync: async (data: ServicoCreateInput) => {
      const result = await mt.createServico.mutateAsync(mapAdaptadoToMTCreate(data));
      return mapMTToAdaptado(result);
    },

    updateServico: (data: ServicoUpdateInput) => {
      mt.updateServico.mutate(mapAdaptadoToMTUpdate(data));
    },

    updateServicoAsync: async (data: ServicoUpdateInput) => {
      const result = await mt.updateServico.mutateAsync(mapAdaptadoToMTUpdate(data));
      return mapMTToAdaptado(result);
    },

    deleteServico: (id: string) => mt.deleteServico.mutate(id),

    deleteServicoAsync: async (id: string) => {
      await mt.deleteServico.mutateAsync(id);
    },

    getServicosByFranqueado: (franqueadoId: string) => {
      return mt.getServicesByFranchise(franqueadoId).map(mapMTToAdaptado);
    },

    updateFranqueadoServicos: (params: { franqueadoId: string; servicoIds: string[] }) => {
      mt.updateFranchiseServices.mutate({
        franchiseId: params.franqueadoId,
        serviceIds: params.servicoIds,
      });
    },

    updateFranqueadoServicosAsync: async (params: { franqueadoId: string; servicoIds: string[] }) => {
      await mt.updateFranchiseServices.mutateAsync({
        franchiseId: params.franqueadoId,
        serviceIds: params.servicoIds,
      });
    },

    isCreating: mt.isCreating,
    isUpdating: mt.isUpdating,
    isDeleting: mt.isDeleting,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Servico Individual
// =============================================================================

export function useServicoAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useServicoMT(id);

  return {
    servico: mt.data ? mapMTToAdaptado(mt.data) : null,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getServicoMode(): 'mt' {
  return 'mt';
}

export default useServicosAdapter;
