// Hook Multi-Tenant para Opt-Outs de Broadcast/Grupo
// Tabela: mt_broadcast_opt_outs

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

export type OptOutSource = 'user_request' | 'reply_stop' | 'admin' | 'complaint';

export interface MTBroadcastOptOut {
  id: string;
  tenant_id: string;
  phone: string;
  reason: string | null;
  source: OptOutSource;
  opted_out_at: string;
}

export interface CreateOptOutInput {
  phone: string;
  reason?: string;
  source?: OptOutSource;
}

interface OptOutFilters {
  search?: string;
  source?: OptOutSource;
}

// =============================================================================
// HOOK: useBroadcastOptOutsMT
// =============================================================================

export function useBroadcastOptOutsMT(filters?: OptOutFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar opt-outs
  const query = useQuery({
    queryKey: ['mt-broadcast-opt-outs', tenant?.id, filters],
    queryFn: async (): Promise<MTBroadcastOptOut[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado');
      }

      let q = supabase
        .from('mt_broadcast_opt_outs')
        .select('*')
        .order('opted_out_at', { ascending: false });

      // Filtros por nivel de acesso
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros adicionais
      if (filters?.search) {
        q = q.ilike('phone', `%${filters.search}%`);
      }
      if (filters?.source) {
        q = q.eq('source', filters.source);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar opt-outs MT:', error);
        throw error;
      }

      return (data || []) as MTBroadcastOptOut[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Adicionar opt-out individual
  const addOptOut = useMutation({
    mutationFn: async (input: CreateOptOutInput): Promise<MTBroadcastOptOut> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido');
      }

      // Limpar telefone (apenas digitos)
      const cleanPhone = input.phone.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('mt_broadcast_opt_outs')
        .insert({
          tenant_id: tenant?.id,
          phone: cleanPhone,
          reason: input.reason || null,
          source: input.source || 'admin',
        })
        .select()
        .single();

      if (error) {
        // Verificar se e duplicata
        if (error.code === '23505') {
          throw new Error('Este telefone ja esta na lista de opt-out');
        }
        throw error;
      }

      return data as MTBroadcastOptOut;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-broadcast-opt-outs'] });
      toast.success('Telefone adicionado ao opt-out');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Remover opt-out (reativar telefone)
  const removeOptOut = useMutation({
    mutationFn: async (optOutId: string) => {
      const { error } = await supabase
        .from('mt_broadcast_opt_outs')
        .delete()
        .eq('id', optOutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-broadcast-opt-outs'] });
      toast.success('Telefone removido do opt-out');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover opt-out: ${error.message}`);
    },
  });

  // Mutation: Adicionar multiplos opt-outs em bulk (skip duplicatas)
  const bulkAddOptOuts = useMutation({
    mutationFn: async (
      phones: Array<{ phone: string; reason?: string }>
    ): Promise<{ inserted: number; skipped: number }> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido');
      }

      let inserted = 0;
      let skipped = 0;

      // Limpar telefones
      const cleanedItems = phones.map((item) => ({
        tenant_id: tenant?.id,
        phone: item.phone.replace(/\D/g, ''),
        reason: item.reason || null,
        source: 'admin' as const,
      }));

      // Inserir em batches de 500
      const batchSize = 500;
      for (let i = 0; i < cleanedItems.length; i += batchSize) {
        const batch = cleanedItems.slice(i, i + batchSize);

        // Usar upsert com onConflict para pular duplicatas
        // A tabela deve ter UNIQUE(tenant_id, phone) ou similar
        const { data, error } = await supabase
          .from('mt_broadcast_opt_outs')
          .upsert(batch, {
            onConflict: 'tenant_id,phone',
          })
          .select('id');

        if (error) {
          console.error(`Erro no batch ${i / batchSize + 1}:`, error);
          // Continuar com proximo batch em vez de falhar tudo
          skipped += batch.length;
          continue;
        }

        const batchInserted = data?.length || 0;
        inserted += batchInserted;
        skipped += batch.length - batchInserted;
      }

      return { inserted, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-broadcast-opt-outs'] });
      toast.success(
        `Opt-out em massa: ${result.inserted} adicionados, ${result.skipped} ja existiam`
      );
    },
    onError: (error: Error) => {
      toast.error(`Erro no opt-out em massa: ${error.message}`);
    },
  });

  // Mutation: Remover por telefone (em vez de por ID)
  const removeOptOutByPhone = useMutation({
    mutationFn: async (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');

      let q = supabase
        .from('mt_broadcast_opt_outs')
        .delete()
        .eq('phone', cleanPhone);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-broadcast-opt-outs'] });
      toast.success('Telefone removido do opt-out');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover opt-out: ${error.message}`);
    },
  });

  // Helper: Verificar se um telefone esta no opt-out
  const isOptedOut = useCallback(
    async (phone: string): Promise<boolean> => {
      const cleanPhone = phone.replace(/\D/g, '');

      let q = supabase
        .from('mt_broadcast_opt_outs')
        .select('id', { count: 'exact', head: true })
        .eq('phone', cleanPhone);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { count, error } = await q;

      if (error) {
        console.error('Erro ao verificar opt-out:', error);
        return false;
      }

      return (count || 0) > 0;
    },
    [tenant]
  );

  // Helper: Filtrar lista de telefones removendo os que estao no opt-out
  const filterOptedOutPhones = useCallback(
    async (phones: string[]): Promise<string[]> => {
      if (!phones.length) return [];

      const cleanPhones = phones.map((p) => p.replace(/\D/g, ''));

      let q = supabase
        .from('mt_broadcast_opt_outs')
        .select('phone')
        .in('phone', cleanPhones);

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao filtrar opt-outs:', error);
        return phones; // Em caso de erro, retorna todos (seguro)
      }

      const optedOutSet = new Set((data || []).map((d) => d.phone));
      return cleanPhones.filter((phone) => !optedOutSet.has(phone));
    },
    [tenant]
  );

  // Estatisticas
  const stats = {
    total: query.data?.length || 0,
    user_request: query.data?.filter((o) => o.source === 'user_request').length || 0,
    reply_stop: query.data?.filter((o) => o.source === 'reply_stop').length || 0,
    admin: query.data?.filter((o) => o.source === 'admin').length || 0,
    complaint: query.data?.filter((o) => o.source === 'complaint').length || 0,
  };

  return {
    // Query
    optOuts: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,

    // Estatisticas
    stats,

    // Helpers
    isOptedOut,
    filterOptedOutPhones,

    // Mutations
    addOptOut,
    removeOptOut,
    removeOptOutByPhone,
    bulkAddOptOuts,

    // Estados
    isAdding: addOptOut.isPending,
    isRemoving: removeOptOut.isPending,
    isBulkAdding: bulkAddOptOuts.isPending,
  };
}
