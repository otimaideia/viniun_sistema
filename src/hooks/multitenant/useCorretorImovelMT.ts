// =============================================================================
// USE CORRETOR IMOVEL MT - Hook Multi-Tenant para Atribuição Corretor ↔ Imóvel
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTCorretorImovel } from '@/types/corretor-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-corretor-imovel';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useCorretorImovelMT(corretorId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query - Listar atribuições do corretor
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, corretorId, tenant?.id],
    queryFn: async (): Promise<MTCorretorImovel[]> => {
      if (!corretorId) return [];

      let q = supabase
        .from('mt_corretor_imovel')
        .select('*')
        .eq('corretor_id', corretorId)
        .order('atribuido_em', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar atribuições corretor-imóvel MT:', error);
        throw error;
      }

      return (data || []) as MTCorretorImovel[];
    },
    enabled: !!corretorId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atribuir corretor a imóvel
  // ---------------------------------------------------------------------------

  const assign = useMutation({
    mutationFn: async (params: { corretor_id: string; property_id: string; atribuido_por?: string }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_corretor_imovel')
        .insert({
          tenant_id: tenant!.id,
          corretor_id: params.corretor_id,
          property_id: params.property_id,
          atribuido_por: params.atribuido_por || null,
          status: 'ativo',
          atribuido_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao atribuir corretor ao imóvel MT:', error);
        throw error;
      }

      return data as MTCorretorImovel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Corretor atribuído ao imóvel com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atribuir corretor.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Desatribuir (finalizar)
  // ---------------------------------------------------------------------------

  const unassign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_corretor_imovel')
        .update({
          status: 'finalizado',
          finalizado_em: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao desatribuir corretor MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Atribuição finalizada com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao finalizar atribuição.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    assign,
    unassign,
  };
}
