// =============================================================================
// USE PROMOCAO USES MT - Hook Multi-Tenant para Usos/Resgates de Promoção
// =============================================================================
//
// Gerencia a tabela mt_promotion_uses
// Registra usos, valida limites (max_usos, max_usos_por_lead) e incrementa
// usos_count na promoção pai.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTPromotionUse } from '@/types/promocao-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-promocao-uses';
const PARENT_QUERY_KEY = 'mt-promocoes';

const SELECT_WITH_LEAD = `
  *,
  lead:mt_leads (id, nome, telefone),
  subscription:mt_promotion_subscriptions (id, influencer_id, link_gerado)
`;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RegisterUseData {
  promotion_id: string;
  lead_id?: string | null;
  subscription_id?: string | null;
  desconto_aplicado?: number | null;
  valor_original?: number | null;
  valor_final?: number | null;
  source?: string;
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePromocaoUsesMT(promotionId: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Usos da Promoção
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, promotionId],
    queryFn: async (): Promise<MTPromotionUse[]> => {
      if (!promotionId) return [];

      const { data, error } = await supabase
        .from('mt_promotion_uses')
        .select(SELECT_WITH_LEAD)
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usos da promoção:', error);
        throw error;
      }

      return (data || []) as MTPromotionUse[];
    },
    enabled: !!promotionId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Registrar Uso (com validação de limites)
  // ---------------------------------------------------------------------------

  const registerUse = useMutation({
    mutationFn: async (input: RegisterUseData): Promise<MTPromotionUse> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { promotion_id, lead_id, ...rest } = input;

      // 1. Buscar promoção para validar limites
      const { data: promo, error: promoError } = await supabase
        .from('mt_promotions')
        .select('id, max_usos, usos_count, max_usos_por_lead, status')
        .eq('id', promotion_id)
        .single();

      if (promoError || !promo) {
        throw new Error('Promoção não encontrada.');
      }

      if (promo.status !== 'ativa') {
        throw new Error('Esta promoção não está ativa.');
      }

      // 2. Validar limite global de usos
      if (promo.max_usos !== null && promo.usos_count >= promo.max_usos) {
        throw new Error('Esta promoção atingiu o limite máximo de usos.');
      }

      // 3. Validar limite por lead
      if (lead_id && promo.max_usos_por_lead !== null) {
        const { count, error: countError } = await supabase
          .from('mt_promotion_uses')
          .select('id', { count: 'exact', head: true })
          .eq('promotion_id', promotion_id)
          .eq('lead_id', lead_id);

        if (countError) {
          console.error('Erro ao verificar usos do lead:', countError);
          throw new Error('Erro ao verificar limite de usos por lead.');
        }

        if ((count || 0) >= promo.max_usos_por_lead) {
          throw new Error('Este lead já atingiu o limite de usos desta promoção.');
        }
      }

      // 4. Inserir uso
      const { data, error } = await supabase
        .from('mt_promotion_uses')
        .insert({
          promotion_id,
          lead_id: lead_id || null,
          tenant_id: tenant!.id,
          ...rest,
        })
        .select(SELECT_WITH_LEAD)
        .single();

      if (error) {
        console.error('Erro ao registrar uso:', error);
        throw error;
      }

      // 5. Incrementar usos_count na promoção
      const { error: updateError } = await supabase
        .from('mt_promotions')
        .update({ usos_count: (promo.usos_count || 0) + 1 })
        .eq('id', promotion_id);

      if (updateError) {
        console.warn('Aviso: erro ao incrementar usos_count:', updateError);
        // Não faz rollback do uso — dado principal já foi salvo
      }

      return data as MTPromotionUse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Uso da promoção registrado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao registrar uso da promoção.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover Uso (admin only — decrementa usos_count)
  // ---------------------------------------------------------------------------

  const removeUse = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // 1. Buscar uso para pegar promotion_id
      const { data: use, error: fetchError } = await supabase
        .from('mt_promotion_uses')
        .select('promotion_id')
        .eq('id', id)
        .single();

      if (fetchError || !use) {
        throw new Error('Uso não encontrado.');
      }

      // 2. Deletar uso
      const { error } = await supabase
        .from('mt_promotion_uses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover uso:', error);
        throw error;
      }

      // 3. Decrementar usos_count na promoção
      const { data: promo } = await supabase
        .from('mt_promotions')
        .select('usos_count')
        .eq('id', use.promotion_id)
        .single();

      if (promo) {
        const newCount = Math.max((promo.usos_count || 0) - 1, 0);
        await supabase
          .from('mt_promotions')
          .update({ usos_count: newCount })
          .eq('id', use.promotion_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, promotionId] });
      queryClient.invalidateQueries({ queryKey: [PARENT_QUERY_KEY] });
      toast.success('Uso removido com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover uso.');
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    uses: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    registerUse: {
      mutate: registerUse.mutate,
      mutateAsync: registerUse.mutateAsync,
      isPending: registerUse.isPending,
    },
    removeUse: {
      mutate: removeUse.mutate,
      mutateAsync: removeUse.mutateAsync,
      isPending: removeUse.isPending,
    },

    isRegistering: registerUse.isPending,
    isRemoving: removeUse.isPending,
  };
}

export default usePromocaoUsesMT;
