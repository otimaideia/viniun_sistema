// =============================================================================
// USE PARCERIAS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para parcerias
// SISTEMA 100% MT - Usa mt_partnerships diretamente via useParceriasMT
//
// =============================================================================

import { useTenantContext } from '@/contexts/TenantContext';
import { useParceriasMT, useParceriaMT, useParceriaByCodigo } from './multitenant/useParceriasMT';
import type {
  MTPartnership,
  MTPartnershipCreate,
  MTPartnershipFilters,
  MTPartnershipStatus,
  MTPartnershipKPIs,
  MTPartnershipRanking,
} from './multitenant/useParceriasMT';
import type { ParceriaStatus, ParceriaKPIs, ParceriaRanking, ParceriaFilters } from '@/types/parceria';

// =============================================================================
// Types
// =============================================================================

export interface ParceriaAdaptada {
  id: string;
  tenant_id?: string;
  franchise_id?: string | null;

  // Dados da empresa (mapeados para interface legacy)
  razao_social: string;
  nome_fantasia: string;
  cnpj: string | null;

  // Ramo de atividade
  ramo_atividade: string | null;
  segmento: string | null;

  // Contato principal
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;

  // Endereço
  cidade: string | null;
  estado: string | null;

  // Código de indicação
  codigo_indicacao: string | null;
  quantidade_indicacoes: number;

  // Branding
  logo_url: string | null;
  descricao_curta: string | null;
  website: string | null;

  // Benefícios simplificados
  desconto_percentual?: number | null;
  desconto_valor_fixo?: number | null;
  beneficios_extras?: string | null;

  // Status
  status: ParceriaStatus;

  // Relacionamentos
  franqueado_id?: string | null;

  // Consultora responsável
  responsavel_id: string | null;
  responsavel?: { id: string; nome: string; cargo: string | null; } | null;

  // Timestamps
  created_at: string;
  updated_at?: string;

  // Extras
  observacoes?: string | null;

  // Relacionamentos MT
  tenant?: {
    slug: string;
    nome_fantasia: string;
  } | null;
}

export interface ParceriaCreateInput {
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string;
  ramo_atividade?: string;
  segmento?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  cidade?: string;
  estado?: string;
  logo_url?: string;
  website?: string;
  descricao_curta?: string;
  franqueado_id?: string;
  status?: ParceriaStatus;
  responsavel_id?: string | null;
}

export interface ParceriaUpdateInput extends Partial<ParceriaCreateInput> {
  id: string;
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTToAdaptado(partnership: MTPartnership): ParceriaAdaptada {
  return {
    id: partnership.id,
    tenant_id: partnership.tenant_id,
    franchise_id: partnership.franchise_id,

    // Mapeamento de campos
    razao_social: partnership.nome_empresa,
    nome_fantasia: partnership.nome_fantasia || partnership.nome_empresa,
    cnpj: partnership.cnpj,

    // Ramo/Segmento
    ramo_atividade: partnership.tipo,
    segmento: partnership.segmento,

    // Contato
    responsavel_nome: partnership.contato_nome,
    responsavel_cargo: partnership.contato_cargo,
    responsavel_email: partnership.contato_email,
    responsavel_telefone: partnership.contato_telefone,

    // Endereço
    cidade: partnership.cidade,
    estado: partnership.estado,

    // Código de indicação
    codigo_indicacao: partnership.codigo,
    quantidade_indicacoes: partnership.total_indicacoes,

    // Branding
    logo_url: partnership.logo_url,
    descricao_curta: partnership.descricao,
    website: partnership.website,

    // Benefícios
    desconto_percentual: partnership.desconto_percentual,
    desconto_valor_fixo: partnership.desconto_valor_fixo,
    beneficios_extras: partnership.beneficios_extras,

    // Status
    status: partnership.status as ParceriaStatus,

    // Relacionamentos
    franqueado_id: partnership.franchise_id,

    // Timestamps
    created_at: partnership.created_at,
    updated_at: partnership.updated_at,

    // Extras
    observacoes: partnership.notas,

    // Consultora responsável
    responsavel_id: partnership.responsavel_id,
    responsavel: partnership.responsavel || null,

    // Tenant
    tenant: partnership.tenant,
  };
}

/**
 * Gera código de indicação único para parceria
 * Formato: PARC + 5 dígitos aleatórios (ex: PARC48271)
 */
function gerarCodigoParceria(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `PARC${num}`;
}

function mapAdaptadoToMTCreate(data: ParceriaCreateInput): MTPartnershipCreate {
  return {
    nome_empresa: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    cnpj: data.cnpj,
    codigo: (data as any).codigo_indicacao || gerarCodigoParceria(),
    contato_nome: data.responsavel_nome,
    contato_cargo: data.responsavel_cargo,
    contato_telefone: data.responsavel_telefone,
    contato_email: data.responsavel_email,
    cidade: data.cidade,
    estado: data.estado,
    tipo: data.ramo_atividade as any,
    segmento: data.segmento,
    logo_url: data.logo_url,
    website: data.website,
    descricao: data.descricao_curta,
    franchise_id: data.franqueado_id,
    status: (data.status as MTPartnershipStatus) || 'ativo',
    is_active: true,
    responsavel_id: data.responsavel_id,
  };
}

function mapFiltersToMT(filters?: ParceriaFilters): MTPartnershipFilters | undefined {
  if (!filters) return undefined;

  return {
    search: filters.search,
    status: filters.status as MTPartnershipStatus,
    tipo: filters.ramo_atividade as any,
    segmento: filters.ramo_atividade,
    is_active: filters.ativo,
    franchise_id: filters.franqueado_id,
    cidade: filters.cidade,
    estado: filters.estado,
  };
}

function mapKPIsToLegacy(kpis: MTPartnershipKPIs | undefined): ParceriaKPIs | undefined {
  if (!kpis) return undefined;

  return {
    total_parcerias: kpis.total_parcerias,
    parcerias_ativas: kpis.parcerias_ativas,
    parcerias_inativas: kpis.parcerias_inativas,
    parcerias_pendentes: kpis.parcerias_pendentes,
    total_indicacoes: kpis.total_indicacoes,
    indicacoes_convertidas: kpis.total_conversoes,
    indicacoes_pendentes: 0,
    indicacoes_perdidas: 0,
    taxa_conversao: kpis.taxa_conversao,
    beneficios_ativos: 0,
  };
}

function mapRankingToLegacy(ranking: MTPartnershipRanking[]): ParceriaRanking[] {
  return ranking.map((item) => ({
    posicao: item.posicao,
    parceria_id: item.parceria_id,
    nome_fantasia: item.nome_fantasia || '',
    codigo_indicacao: item.codigo || undefined,
    logo_url: item.logo_url,
    total_indicacoes: item.total_indicacoes,
    indicacoes_convertidas: item.total_conversoes,
    taxa_conversao: item.taxa_conversao,
  }));
}

// =============================================================================
// Hook Principal
// =============================================================================

interface UseParceriasAdapterOptions {
  filters?: ParceriaFilters;
}

export function useParceriasAdapter(options: UseParceriasAdapterOptions = {}) {
  const { filters = {} } = options;
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT - sempre usa tabelas mt_*
  const mtFilters = mapFiltersToMT(filters);
  const mt = useParceriasMT(mtFilters);

  return {
    parcerias: mt.parcerias.map(mapMTToAdaptado),
    kpis: mapKPIsToLegacy(mt.kpis),
    ranking: mapRankingToLegacy(mt.ranking),
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    refetch: mt.refetch,

    // Mutations
    createParceria: async (data: ParceriaCreateInput) => {
      const result = await mt.createParceria.mutateAsync(mapAdaptadoToMTCreate(data));
      return mapMTToAdaptado(result);
    },

    updateParceria: async ({ id, data }: { id: string; data: Partial<ParceriaCreateInput> }) => {
      const result = await mt.updateParceria.mutateAsync({
        id,
        nome_empresa: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj,
        codigo: (data as any).codigo_indicacao,
        contato_nome: data.responsavel_nome,
        contato_cargo: data.responsavel_cargo,
        contato_telefone: data.responsavel_telefone,
        contato_email: data.responsavel_email,
        cidade: data.cidade,
        estado: data.estado,
        tipo: data.ramo_atividade as any,
        segmento: data.segmento,
        logo_url: data.logo_url,
        website: data.website,
        descricao: data.descricao_curta,
        franchise_id: data.franqueado_id,
        status: data.status as MTPartnershipStatus,
        responsavel_id: data.responsavel_id,
      });
      return mapMTToAdaptado(result);
    },

    deleteParceria: async (id: string) => {
      await mt.deleteParceria.mutateAsync(id);
    },

    updateStatus: async ({ id, status }: { id: string; status: ParceriaStatus }) => {
      await mt.updateStatus.mutateAsync({ id, status: status as MTPartnershipStatus });
    },

    // Helpers
    getParceria: async (id: string) => {
      const result = await mt.getParceria(id);
      return result ? mapMTToAdaptado(result) : null;
    },

    getParceriaByCodigo: async (codigo: string) => {
      const result = await mt.getParceriaByCodigo(codigo);
      return result ? mapMTToAdaptado(result) : null;
    },

    checkCNPJExists: mt.checkCNPJExists,

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
// Hook para Parceria Individual
// =============================================================================

export function useParceriaAdapter(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useParceriaMT(id);

  return {
    parceria: mt.data ? mapMTToAdaptado(mt.data) : null,
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
// Hook para Busca por Código (público)
// =============================================================================

export function useParceriaByCodigoAdapter(codigo: string | null) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // Hook MT
  const mt = useParceriaByCodigo(codigo);

  return {
    parceria: mt.data ? mapMTToAdaptado(mt.data) : null,
    isLoading: mt.isLoading || isTenantLoading,
    error: mt.error,
    exists: !!mt.data,

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

export function getParceriaMode(): 'mt' {
  return 'mt';
}

export default useParceriasAdapter;
