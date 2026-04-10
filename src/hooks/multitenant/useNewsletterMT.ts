// =============================================================================
// USE NEWSLETTER MT - Hook Multi-Tenant para Newsletter/Subscribers
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTNewsletter } from '@/types/email-mkt-imovel-mt';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-newsletters';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useNewsletterMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Listar Subscribers
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTNewsletter[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_newsletters')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar newsletter MT:', error);
        throw error;
      }

      return (data || []) as MTNewsletter[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Subscribe
  // ---------------------------------------------------------------------------

  const subscribe = useMutation({
    mutationFn: async (params: { email: string; nome?: string }): Promise<MTNewsletter> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_newsletters')
        .insert({
          tenant_id: tenant!.id,
          email: params.email,
          nome: params.nome || null,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao inscrever newsletter MT:', error);
        throw error;
      }

      return data as MTNewsletter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Inscrito na newsletter com sucesso!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este email já está inscrito.');
      } else {
        toast.error(error?.message || 'Erro ao inscrever.');
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Unsubscribe
  // ---------------------------------------------------------------------------

  const unsubscribe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_newsletters')
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao cancelar inscrição MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Inscrição cancelada.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cancelar inscrição.');
    },
  });

  return {
    data: query.data,
    activeSubscribers: query.data?.filter((s) => s.is_active) || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    subscribe,
    unsubscribe,
  };
}
