// =============================================================================
// USE PROMOCAO INDICACOES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para indicações de promoções usando tabela MT
// SISTEMA 100% MT - Usa mt_promotion_referrals com isolamento por tenant
//
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { PromocaoIndicacao } from '@/types/promocao';

// =============================================================================
// Types MT
// =============================================================================

interface MTPromotionReferral {
  id: string;
  tenant_id: string;
  signup_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: string | null;
  convertido: boolean;
  convertido_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  signup?: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    unidade: string | null;
    franchise_id: string | null;
  };
}

export interface PromocaoIndicacaoAdaptada extends PromocaoIndicacao {
  tenant_id?: string;
  franchise_id?: string | null;
  unidade?: string;
}

// =============================================================================
// Helper: Mapear MT para Legacy
// =============================================================================

function mapMTToLegacy(mtReferral: MTPromotionReferral): PromocaoIndicacaoAdaptada {
  return {
    id: mtReferral.id,
    cadastro_id: mtReferral.signup_id || undefined,
    nome: mtReferral.nome,
    telefone: mtReferral.telefone || undefined,
    email: mtReferral.email || undefined,
    status: mtReferral.status || 'pendente',
    convertido: mtReferral.convertido,
    convertido_em: mtReferral.convertido_em || undefined,
    observacoes: mtReferral.observacoes || undefined,
    created_at: mtReferral.created_at,
    updated_at: mtReferral.updated_at,
    // Dados do cadastro (signup)
    cadastro: mtReferral.signup
      ? {
          id: mtReferral.signup.id,
          nome: mtReferral.signup.nome,
          email: mtReferral.signup.email || undefined,
          telefone: mtReferral.signup.telefone || undefined,
          unidade: mtReferral.signup.unidade || '',
        }
      : undefined,
    // Campos MT
    tenant_id: mtReferral.tenant_id,
    franchise_id: mtReferral.signup?.franchise_id || null,
    unidade: mtReferral.signup?.unidade || '',
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-promocao-indicacoes';

// =============================================================================
// Hook Principal
// =============================================================================

export function usePromocaoIndicacoesAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ==========================================================================
  // Query: Listar Indicações
  // ==========================================================================
  const {
    data: indicacoesRaw = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let query = supabase
        .from('mt_promotion_referrals')
        .select(`
          *,
          signup:mt_promotion_signups(id, nome, email, telefone, unidade, franchise_id)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        // Buscar indicações cujo cadastro pertence à franquia
        // Como não temos franchise_id diretamente, filtramos via signup.franchise_id
        // Primeiro buscamos todos do tenant, depois filtramos no JS
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      } else if (accessLevel !== 'platform') {
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar indicações:', error);
        throw error;
      }

      let result = (data || []) as MTPromotionReferral[];

      // Filtrar por franquia se necessário
      if (accessLevel === 'franchise' && franchise) {
        result = result.filter(
          (r) => r.signup?.franchise_id === franchise.id
        );
      }

      return result;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mapear para formato legacy
  const indicacoes: PromocaoIndicacaoAdaptada[] = indicacoesRaw.map(mapMTToLegacy);

  return {
    indicacoes,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    isFetching,
    _mode: 'mt' as const,
  };
}

// Re-exportar tipos
export type { PromocaoIndicacao } from '@/types/promocao';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getPromocaoIndicacoesMode(): 'mt' {
  return 'mt';
}

export default usePromocaoIndicacoesAdapter;
