// =============================================================================
// USE FRANQUEADOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para franqueados/franchises
// SISTEMA 100% MT - Usa mt_franchises diretamente via useFranchisesMT
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useFranchisesMT, useFranchiseMT } from './multitenant/useFranchisesMT';
import type { MTFranchise, MTFranchiseCreate, MTFranchiseUpdate, MTFranchiseFilters } from './multitenant/useFranchisesMT';

// =============================================================================
// Types
// =============================================================================

export interface FranqueadoAdaptado {
  id: string;
  tenant_id?: string;
  // Campos comuns mapeados
  nome_fantasia: string;
  slug: string | null;
  codigo?: string | null;
  cnpj: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  telefone?: string | null;
  whatsapp_business?: string | null;
  whatsapp?: string | null;
  email: string | null;
  responsavel: string | null;
  responsavel_nome?: string | null;
  status: string;
  api_token: string | null;
  created_at: string;
  updated_at: string;
  // Campos extras MT
  tipo?: string;
  data_inauguracao?: string | null;
  is_active?: boolean;
  // Relacionamentos
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
}

export interface FranqueadoCreateInput {
  nome_fantasia: string;
  cidade: string;
  estado: string;
  slug?: string;
  codigo?: string;
  cnpj?: string;
  endereco?: string;
  cep?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  responsavel?: string;
  responsavel_nome?: string;
  status?: string;
  tipo?: string;
}

export interface FranqueadoUpdateInput extends Partial<FranqueadoCreateInput> {
  id: string;
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTToAdaptado(franchise: MTFranchise): FranqueadoAdaptado {
  return {
    id: franchise.id,
    tenant_id: franchise.tenant_id,
    nome_fantasia: franchise.nome,
    slug: franchise.codigo,
    codigo: franchise.codigo,
    cnpj: franchise.cnpj,
    endereco: franchise.endereco,
    cep: franchise.cep,
    cidade: franchise.cidade,
    estado: franchise.estado,
    telefone: franchise.telefone,
    whatsapp_business: franchise.whatsapp,
    whatsapp: franchise.whatsapp,
    email: franchise.email,
    responsavel: franchise.responsavel_nome,
    responsavel_nome: franchise.responsavel_nome,
    status: franchise.status,
    api_token: franchise.api_token,
    created_at: franchise.created_at,
    updated_at: franchise.updated_at,
    tipo: franchise.tipo,
    data_inauguracao: franchise.data_inauguracao,
    is_active: franchise.is_active,
    tenant: franchise.tenant,
  };
}

function mapAdaptadoToMTCreate(data: FranqueadoCreateInput): MTFranchiseCreate {
  return {
    nome: data.nome_fantasia,
    cidade: data.cidade,
    estado: data.estado,
    codigo: data.slug || data.codigo,
    cnpj: data.cnpj,
    endereco: data.endereco,
    cep: data.cep,
    telefone: data.telefone,
    whatsapp: data.whatsapp,
    email: data.email,
    responsavel_nome: data.responsavel || data.responsavel_nome,
    status: data.status || 'ativo',
    tipo: data.tipo,
  };
}

function mapAdaptadoToMTUpdate(data: FranqueadoUpdateInput): MTFranchiseUpdate {
  return {
    id: data.id,
    nome: data.nome_fantasia,
    codigo: data.slug || data.codigo,
    cnpj: data.cnpj,
    endereco: data.endereco,
    cep: data.cep,
    cidade: data.cidade,
    estado: data.estado,
    telefone: data.telefone,
    whatsapp: data.whatsapp,
    email: data.email,
    responsavel_nome: data.responsavel || data.responsavel_nome,
    status: data.status,
    tipo: data.tipo,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useFranqueadosAdapter(filters?: MTFranchiseFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT - sempre usa tabelas mt_*
  const mt = useFranchisesMT(filters);

  return {
    franqueados: mt.franchises.map(mapMTToAdaptado),
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    createFranqueado: (data: FranqueadoCreateInput) => {
      mt.createFranchise.mutate(mapAdaptadoToMTCreate(data));
    },

    createFranqueadoAsync: async (data: FranqueadoCreateInput) => {
      const result = await mt.createFranchise.mutateAsync(mapAdaptadoToMTCreate(data));
      return mapMTToAdaptado(result);
    },

    updateFranqueado: (data: FranqueadoUpdateInput) => {
      mt.updateFranchise.mutate(mapAdaptadoToMTUpdate(data));
    },

    updateFranqueadoAsync: async (data: FranqueadoUpdateInput) => {
      const result = await mt.updateFranchise.mutateAsync(mapAdaptadoToMTUpdate(data));
      return mapMTToAdaptado(result);
    },

    deleteFranqueado: (id: string) => mt.deleteFranchise.mutate(id),

    deleteFranqueadoAsync: async (id: string) => {
      await mt.deleteFranchise.mutateAsync(id);
    },

    generateToken: (id: string) => mt.generateToken.mutate(id),

    generateTokenAsync: async (id: string) => {
      return await mt.generateToken.mutateAsync(id);
    },

    isCreating: mt.isCreating,
    isUpdating: mt.isUpdating,
    isDeleting: mt.isDeleting,
    isGeneratingToken: mt.isGeneratingToken,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook para Franqueado Individual
// =============================================================================

export function useFranqueadoAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useFranchiseMT(id);

  return {
    franqueado: mt.data ? mapMTToAdaptado(mt.data) : null,
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

export function getFranqueadoMode(): 'mt' {
  return 'mt';
}

export default useFranqueadosAdapter;
