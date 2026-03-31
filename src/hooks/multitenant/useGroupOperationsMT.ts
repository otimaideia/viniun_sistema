// Hook Multi-Tenant para Operacoes de Grupo em Massa
// Tabelas: mt_group_operations, mt_group_operation_items

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

export type GroupOperationStatus =
  | 'pending'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type GroupOperationType = 'add_to_group' | 'remove_from_group' | 'create_group';

export type GroupOperationItemStatus =
  | 'pending'
  | 'adding'
  | 'added'
  | 'failed'
  | 'already_member'
  | 'invalid'
  | 'skipped';

export interface MTGroupOperation {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  session_id: string;
  session_name: string;
  operation_type: GroupOperationType;
  source_type: string;
  status: GroupOperationStatus;
  group_id: string | null;
  group_name: string | null;
  list_id: string | null;
  total_numbers: number;
  added_count: number;
  failed_count: number;
  already_member_count: number;
  invalid_count: number;
  batch_size: number;
  delay_between_batches_ms: number;
  last_processed_index: number | null;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  next_run_after: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  tenant?: { id: string; slug: string; nome_fantasia: string } | null;
  session?: { id: string; session_name: string; display_name: string | null } | null;
}

export interface MTGroupOperationItem {
  id: string;
  operation_id: string;
  tenant_id: string;
  phone: string;
  nome: string | null;
  status: GroupOperationItemStatus;
  error_message: string | null;
  processed_at: string | null;
}

export interface CreateGroupOperationInput {
  session_id: string;
  session_name: string;
  operation_type: GroupOperationType;
  group_id?: string | null;
  group_name?: string | null;
  source_type?: string;
  list_id?: string | null;
  batch_size?: number;
  delay_between_batches_ms?: number;
  scheduled_at?: string | null;
  items: Array<{ phone: string; nome?: string }>;
}

interface GroupOperationFilters {
  status?: GroupOperationStatus;
  session_id?: string;
  group_id?: string;
  operation_type?: GroupOperationType;
}

interface GroupOperationItemFilters {
  status?: GroupOperationItemStatus;
  page?: number;
  pageSize?: number;
}

// =============================================================================
// HOOK: useGroupOperationsMT (Lista de operacoes)
// =============================================================================

export function useGroupOperationsMT(filters?: GroupOperationFilters) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar operacoes
  // RLS cuida do isolamento — roda para qualquer usuario autenticado
  const query = useQuery({
    queryKey: ['mt-group-operations', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTGroupOperation[]> => {
      let q = supabase
        .from('mt_group_operations')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          session:mt_whatsapp_sessions(id, session_name, display_name)
        `)
        .order('created_at', { ascending: false });

      // Filtros explícitos por nivel de acesso (RLS já filtra, mas melhora performance)
      if (accessLevel === 'platform') {
        // sem filtro extra — ve tudo
      } else if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id);
      } else if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }
      // sem tenant carregado: confia só no RLS

      // Filtros adicionais
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.session_id) {
        q = q.eq('session_id', filters.session_id);
      }
      if (filters?.group_id) {
        q = q.eq('group_id', filters.group_id);
      }
      if (filters?.operation_type) {
        q = q.eq('operation_type', filters.operation_type);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar operacoes de grupo MT:', error);
        throw error;
      }

      return (data || []) as MTGroupOperation[];
    },
    enabled: !isTenantLoading, // roda para qualquer usuario autenticado
  });

  // Real-time subscription para atualizacoes de progresso
  useEffect(() => {
    if (isTenantLoading) return;

    const channel = supabase
      .channel('mt-group-operations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_group_operations',
          filter: tenant ? `tenant_id=eq.${tenant.id}` : undefined,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
          // Tambem invalidar a operacao individual se estiver sendo observada
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['mt-group-operation', (payload.new as { id: string }).id] });
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('[RT] mt-group-operations-changes error:', err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant, accessLevel, queryClient]);

  // Mutation: Criar operacao com itens
  const createOperation = useMutation({
    mutationFn: async (input: CreateGroupOperationInput): Promise<MTGroupOperation> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido');
      }

      // 1. Criar a operacao
      const { data: operation, error: opError } = await supabase
        .from('mt_group_operations')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          session_id: input.session_id,
          session_name: input.session_name,
          operation_type: input.operation_type,
          source_type: input.source_type || 'manual',
          status: 'pending' as GroupOperationStatus,
          group_id: input.group_id || null,
          group_name: input.group_name || null,
          list_id: input.list_id || null,
          total_numbers: input.items.length,
          added_count: 0,
          failed_count: 0,
          already_member_count: 0,
          invalid_count: 0,
          batch_size: input.batch_size || 5,
          delay_between_batches_ms: input.delay_between_batches_ms || 10000,
          scheduled_at: input.scheduled_at || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (opError) {
        console.error('Erro ao criar operacao:', opError);
        throw opError;
      }

      // 2. Criar os itens da operacao em batch
      const items = input.items.map((item) => ({
        operation_id: operation.id,
        tenant_id: tenant?.id,
        phone: item.phone,
        nome: item.nome || null,
        status: 'pending' as GroupOperationItemStatus,
      }));

      // Inserir em batches de 500 para evitar limites
      const batchSize = 500;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { error: itemsError } = await supabase
          .from('mt_group_operation_items')
          .insert(batch);

        if (itemsError) {
          console.error(`Erro ao inserir itens batch ${i / batchSize + 1}:`, itemsError);
          // Marcar operacao como failed se nao conseguir criar itens
          await supabase
            .from('mt_group_operations')
            .update({
              status: 'failed' as GroupOperationStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', operation.id);
          throw itemsError;
        }
      }

      return operation as MTGroupOperation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success(`Operacao criada com ${data.total_numbers} contatos`);
    },
    onError: (error: Error) => {
      console.error('Erro ao criar operacao de grupo:', error);
      toast.error(`Erro ao criar operacao: ${error.message}`);
    },
  });

  // Mutation: Iniciar operacao (chama edge function via fetch direto para evitar CORS issues do supabase.functions.invoke)
  const startOperation = useMutation({
    mutationFn: async (operationId: string) => {
      // 1. Atualizar status para processing
      const { error: updateError } = await supabase
        .from('mt_group_operations')
        .update({
          status: 'processing' as GroupOperationStatus,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      // 2. Invocar edge function via fetch direto (evita CORS issues do supabase.functions.invoke)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.viniun.com.br';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/group-bulk-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ group_operation_id: operationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        // Reverter status se edge function falhar
        await supabase
          .from('mt_group_operations')
          .update({
            status: 'failed' as GroupOperationStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', operationId);
        throw new Error(errorData.error || `Edge function retornou ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success('Operacao iniciada! Processando contatos...');
    },
    onError: (error: Error) => {
      console.error('Erro ao iniciar operacao:', error);
      toast.error(`Erro ao iniciar operacao: ${error.message}`);
    },
  });

  // Mutation: Pausar operacao
  const pauseOperation = useMutation({
    mutationFn: async (operationId: string) => {
      const { error } = await supabase
        .from('mt_group_operations')
        .update({
          status: 'paused' as GroupOperationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success('Operacao pausada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao pausar operacao: ${error.message}`);
    },
  });

  // Mutation: Retomar operacao (paused -> processing)
  const resumeOperation = useMutation({
    mutationFn: async (operationId: string) => {
      const { error: updateError } = await supabase
        .from('mt_group_operations')
        .update({
          status: 'processing' as GroupOperationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (updateError) throw updateError;

      // Re-invocar edge function via fetch direto
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.viniun.com.br';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/group-bulk-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ group_operation_id: operationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        await supabase
          .from('mt_group_operations')
          .update({
            status: 'paused' as GroupOperationStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', operationId);
        throw new Error(errorData.error || `Edge function retornou ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success('Operacao retomada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao retomar operacao: ${error.message}`);
    },
  });

  // Mutation: Cancelar operacao
  const cancelOperation = useMutation({
    mutationFn: async (operationId: string) => {
      const { error } = await supabase
        .from('mt_group_operations')
        .update({
          status: 'cancelled' as GroupOperationStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) throw error;

      // Marcar itens pendentes como skipped
      const { error: itemsError } = await supabase
        .from('mt_group_operation_items')
        .update({
          status: 'skipped' as GroupOperationItemStatus,
        })
        .eq('operation_id', operationId)
        .in('status', ['pending', 'adding']);

      if (itemsError) {
        console.warn('Erro ao marcar itens como skipped:', itemsError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success('Operacao cancelada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar operacao: ${error.message}`);
    },
  });

  // Mutation: Deletar operacao (soft delete ou hard delete se pending)
  const deleteOperation = useMutation({
    mutationFn: async (operationId: string) => {
      // Deletar itens primeiro
      const { error: itemsError } = await supabase
        .from('mt_group_operation_items')
        .delete()
        .eq('operation_id', operationId);

      if (itemsError) {
        console.error('Erro ao deletar itens:', itemsError);
        throw itemsError;
      }

      // Deletar operacao
      const { error } = await supabase
        .from('mt_group_operations')
        .delete()
        .eq('id', operationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
      toast.success('Operacao removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover operacao: ${error.message}`);
    },
  });

  return {
    // Query
    data: query.data || [],
    operations: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createOperation,
    startOperation,
    pauseOperation,
    resumeOperation,
    cancelOperation,
    deleteOperation,

    // Estados das mutations
    isCreating: createOperation.isPending,
    isStarting: startOperation.isPending,
  };
}

// =============================================================================
// HOOK: useGroupOperationMT (Operacao individual com real-time)
// =============================================================================

export function useGroupOperationMT(operationId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-group-operation', operationId],
    queryFn: async (): Promise<MTGroupOperation | null> => {
      if (!operationId) return null;

      const { data, error } = await supabase
        .from('mt_group_operations')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          session:mt_whatsapp_sessions(id, session_name, display_name)
        `)
        .eq('id', operationId)
        .single();

      if (error) {
        console.error('Erro ao buscar operacao:', error);
        return null;
      }

      return data as MTGroupOperation;
    },
    enabled: !!operationId && !isTenantLoading,
    refetchInterval: (query) => {
      // Auto-refetch a cada 3s enquanto estiver processando
      const operation = query.state.data as MTGroupOperation | null | undefined;
      if (operation?.status === 'processing') return 3000;
      return false;
    },
  });

  // Real-time subscription para esta operacao especifica
  useEffect(() => {
    if (!operationId) return;

    const channel = supabase
      .channel(`mt-group-operation-${operationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_group_operations',
          filter: `id=eq.${operationId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['mt-group-operation', operationId] });
          queryClient.invalidateQueries({ queryKey: ['mt-group-operations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId, queryClient]);

  // Calcular progresso (soma de added + failed + already_member + invalid = processed)
  const processedCount = query.data
    ? (query.data.added_count || 0) + (query.data.failed_count || 0) +
      (query.data.already_member_count || 0) + (query.data.invalid_count || 0)
    : 0;
  const progress = query.data
    ? query.data.total_numbers > 0
      ? Math.round((processedCount / query.data.total_numbers) * 100)
      : 0
    : 0;

  return {
    operation: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    progress,
  };
}

// =============================================================================
// HOOK: useGroupOperationItemsMT (Itens da operacao com paginacao)
// =============================================================================

export function useGroupOperationItemsMT(
  operationId: string | undefined,
  filters?: GroupOperationItemFilters
) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;

  const query = useQuery({
    queryKey: ['mt-group-operation-items', operationId, filters],
    queryFn: async (): Promise<{
      items: MTGroupOperationItem[];
      total: number;
    }> => {
      if (!operationId) return { items: [], total: 0 };

      // Contar total
      let countQuery = supabase
        .from('mt_group_operation_items')
        .select('id', { count: 'exact', head: true })
        .eq('operation_id', operationId);

      if (filters?.status) {
        countQuery = countQuery.eq('status', filters.status);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error('Erro ao contar itens:', countError);
        throw countError;
      }

      // Buscar itens paginados
      let q = supabase
        .from('mt_group_operation_items')
        .select('*')
        .eq('operation_id', operationId)
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar itens da operacao:', error);
        throw error;
      }

      return {
        items: (data || []) as MTGroupOperationItem[],
        total: count || 0,
      };
    },
    enabled: !!operationId && !isTenantLoading,
  });

  // Real-time para atualizar itens quando processados
  useEffect(() => {
    if (!operationId) return;

    const channel = supabase
      .channel(`mt-group-operation-items-${operationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_group_operation_items',
          filter: `operation_id=eq.${operationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mt-group-operation-items', operationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId, queryClient]);

  // Estatisticas dos itens
  const stats = {
    total: query.data?.total || 0,
    pending: 0,
    added: 0,
    failed: 0,
    already_member: 0,
    invalid: 0,
    skipped: 0,
  };

  if (query.data?.items) {
    for (const item of query.data.items) {
      if (item.status === 'pending' || item.status === 'adding') stats.pending++;
      else if (item.status === 'added') stats.added++;
      else if (item.status === 'failed') stats.failed++;
      else if (item.status === 'already_member') stats.already_member++;
      else if (item.status === 'invalid') stats.invalid++;
      else if (item.status === 'skipped') stats.skipped++;
    }
  }

  const totalPages = Math.ceil((query.data?.total || 0) / pageSize);

  return {
    items: query.data?.items || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    stats,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages - 1,
    hasPreviousPage: page > 0,
  };
}
