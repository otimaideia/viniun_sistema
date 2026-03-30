// =============================================================================
// USE BROADCAST LISTS MT - Hook Multi-Tenant para Listas de Broadcast
// =============================================================================
//
// Este hook fornece CRUD completo para mt_broadcast_lists e mt_broadcast_recipients
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BroadcastListSourceType = 'manual' | 'csv_upload' | 'leads_filter' | 'form_submissions';

export interface MTBroadcastList {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  source_type: BroadcastListSourceType;
  source_filter: Record<string, any> | null;
  is_active: boolean;
  total_recipients: number;
  valid_numbers: number;
  invalid_numbers: number;
  respect_opt_out: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relations
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
}

export interface MTBroadcastRecipient {
  id: string;
  tenant_id: string;
  list_id: string;
  phone: string;
  nome: string | null;
  lead_id: string | null;
  is_valid: boolean;
  validation_error: string | null;
  opted_out: boolean;
  opted_out_at: string | null;
  created_at: string;
}

export interface CreateBroadcastListInput {
  nome: string;
  descricao?: string;
  source_type?: BroadcastListSourceType;
  source_filter?: Record<string, any>;
  is_active?: boolean;
  respect_opt_out?: boolean;
  tenant_id?: string;
  franchise_id?: string | null;
}

export interface UpdateBroadcastListInput {
  id: string;
  nome?: string;
  descricao?: string;
  source_type?: BroadcastListSourceType;
  source_filter?: Record<string, any>;
  is_active?: boolean;
  respect_opt_out?: boolean;
}

export interface AddRecipientInput {
  phone: string;
  nome?: string;
  lead_id?: string;
}

export interface BroadcastListFilters {
  source_type?: BroadcastListSourceType;
  is_active?: boolean;
  search?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-broadcast-lists';
const RECIPIENTS_QUERY_KEY = 'mt-broadcast-recipients';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexao. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Esta lista ja existe.';
      case '23503':
        return 'Esta lista esta vinculada a outros dados.';
      case '23502':
        return 'Preencha todos os campos obrigatorios.';
      case '42501':
        return 'Voce nao tem permissao para realizar esta acao.';
      default:
        break;
    }
  }

  return error?.message || 'Erro desconhecido. Tente novamente.';
}

/**
 * Validates and cleans a phone number.
 * Returns cleaned number (10-15 digits) or null if invalid.
 */
function cleanPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Hook Principal: useBroadcastListsMT
// -----------------------------------------------------------------------------

export function useBroadcastListsMT(filters?: BroadcastListFilters) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Listas de Broadcast
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.source_type, filters?.is_active, filters?.search],
    queryFn: async (): Promise<MTBroadcastList[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao carregado.');
      }

      let q = supabase
        .from('mt_broadcast_lists')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por nivel de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.source_type) {
        q = q.eq('source_type', filters.source_type);
      }

      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar listas de broadcast MT:', error);
        throw error;
      }

      return (data || []) as MTBroadcastList[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Lista
  // ---------------------------------------------------------------------------

  const createList = useMutation({
    mutationFn: async (input: CreateBroadcastListInput): Promise<MTBroadcastList> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido.');
      }

      const { data, error } = await supabase
        .from('mt_broadcast_lists')
        .insert({
          nome: input.nome,
          descricao: input.descricao || null,
          source_type: input.source_type || 'manual',
          source_filter: input.source_filter || null,
          is_active: input.is_active ?? true,
          respect_opt_out: input.respect_opt_out ?? true,
          tenant_id: input.tenant_id || tenant!.id,
          franchise_id: input.franchise_id ?? franchise?.id ?? null,
          created_by: user?.id || null,
          total_recipients: 0,
          valid_numbers: 0,
          invalid_numbers: 0,
        })
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar lista de broadcast MT:', error);
        throw error;
      }

      return data as MTBroadcastList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Lista "${data.nome}" criada com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Lista
  // ---------------------------------------------------------------------------

  const updateList = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateBroadcastListInput): Promise<MTBroadcastList> => {
      if (!id) {
        throw new Error('ID da lista e obrigatorio.');
      }

      const { data, error } = await supabase
        .from('mt_broadcast_lists')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar lista de broadcast MT:', error);
        throw error;
      }

      return data as MTBroadcastList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Lista "${data.nome}" atualizada!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete Lista
  // ---------------------------------------------------------------------------

  const deleteList = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID da lista e obrigatorio.');
      }

      const { error } = await supabase
        .from('mt_broadcast_lists')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar lista de broadcast MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Lista removida com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar Destinatarios
  // ---------------------------------------------------------------------------

  const addRecipients = useMutation({
    mutationFn: async ({
      listId,
      recipients,
    }: {
      listId: string;
      recipients: AddRecipientInput[];
    }): Promise<{ added: number; invalid: number }> => {
      if (!listId) {
        throw new Error('ID da lista e obrigatorio.');
      }

      if (!recipients || recipients.length === 0) {
        throw new Error('Informe pelo menos um destinatario.');
      }

      let addedCount = 0;
      let invalidCount = 0;

      // Validar e preparar destinatarios
      const tenantId = tenant?.id;
      if (!tenantId && accessLevel !== 'platform') {
        throw new Error('Tenant nao definido.');
      }

      const validRecipients: Array<{
        tenant_id: string;
        list_id: string;
        phone: string;
        nome: string | null;
        lead_id: string | null;
        is_valid: boolean;
        validation_error: string | null;
      }> = [];

      for (const recipient of recipients) {
        const cleanedPhone = cleanPhoneNumber(recipient.phone);

        if (cleanedPhone) {
          validRecipients.push({
            tenant_id: tenantId!,
            list_id: listId,
            phone: cleanedPhone,
            nome: recipient.nome || null,
            lead_id: recipient.lead_id || null,
            is_valid: true,
            validation_error: null,
          });
          addedCount++;
        } else {
          // Inserir mesmo invalidos para rastreamento
          validRecipients.push({
            tenant_id: tenantId!,
            list_id: listId,
            phone: recipient.phone.replace(/\D/g, ''),
            nome: recipient.nome || null,
            lead_id: recipient.lead_id || null,
            is_valid: false,
            validation_error: 'Telefone invalido (fora do range 10-15 digitos)',
          });
          invalidCount++;
        }
      }

      // Inserir em lote (ignorar duplicatas)
      if (validRecipients.length > 0) {
        // Deduplicar por phone dentro do batch
        const seen = new Set<string>();
        const dedupedRecipients = validRecipients.filter((r) => {
          if (seen.has(r.phone)) return false;
          seen.add(r.phone);
          return true;
        });

        const { error } = await supabase
          .from('mt_broadcast_recipients')
          .upsert(dedupedRecipients, {
            onConflict: 'list_id,phone',
            ignoreDuplicates: true,
          });

        if (error) {
          console.error('Erro ao adicionar destinatarios:', error);
          throw error;
        }

        addedCount = dedupedRecipients.filter((r) => r.is_valid).length;
        invalidCount = dedupedRecipients.filter((r) => !r.is_valid).length;
      }

      // Atualizar contadores da lista
      const { data: currentList } = await supabase
        .from('mt_broadcast_lists')
        .select('total_recipients, valid_numbers, invalid_numbers')
        .eq('id', listId)
        .single();

      if (currentList) {
        await supabase
          .from('mt_broadcast_lists')
          .update({
            total_recipients: (currentList.total_recipients || 0) + validRecipients.length,
            valid_numbers: (currentList.valid_numbers || 0) + addedCount,
            invalid_numbers: (currentList.invalid_numbers || 0) + invalidCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', listId);
      }

      return { added: addedCount, invalid: invalidCount };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECIPIENTS_QUERY_KEY, variables.listId] });

      if (result.invalid > 0) {
        toast.success(
          `${result.added} destinatario(s) adicionado(s). ${result.invalid} telefone(s) invalido(s).`
        );
      } else {
        toast.success(`${result.added} destinatario(s) adicionado(s) com sucesso!`);
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover Destinatario
  // ---------------------------------------------------------------------------

  const removeRecipient = useMutation({
    mutationFn: async ({
      recipientId,
      listId,
    }: {
      recipientId: string;
      listId: string;
    }): Promise<void> => {
      if (!recipientId) {
        throw new Error('ID do destinatario e obrigatorio.');
      }

      // Buscar dados do destinatario antes de remover (para atualizar contadores)
      const { data: recipient } = await supabase
        .from('mt_broadcast_recipients')
        .select('is_valid')
        .eq('id', recipientId)
        .single();

      // Remover destinatario
      const { error } = await supabase
        .from('mt_broadcast_recipients')
        .delete()
        .eq('id', recipientId);

      if (error) {
        console.error('Erro ao remover destinatario:', error);
        throw error;
      }

      // Atualizar contadores da lista
      if (listId && recipient) {
        const { data: currentList } = await supabase
          .from('mt_broadcast_lists')
          .select('total_recipients, valid_numbers, invalid_numbers')
          .eq('id', listId)
          .single();

        if (currentList) {
          await supabase
            .from('mt_broadcast_lists')
            .update({
              total_recipients: Math.max(0, (currentList.total_recipients || 0) - 1),
              valid_numbers: recipient.is_valid
                ? Math.max(0, (currentList.valid_numbers || 0) - 1)
                : currentList.valid_numbers,
              invalid_numbers: !recipient.is_valid
                ? Math.max(0, (currentList.invalid_numbers || 0) - 1)
                : currentList.invalid_numbers,
              updated_at: new Date().toISOString(),
            })
            .eq('id', listId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECIPIENTS_QUERY_KEY, variables.listId] });
      toast.success('Destinatario removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: query.refetch,

    // Mutations
    createList: {
      mutate: createList.mutate,
      mutateAsync: createList.mutateAsync,
      isPending: createList.isPending,
    },
    updateList: {
      mutate: updateList.mutate,
      mutateAsync: updateList.mutateAsync,
      isPending: updateList.isPending,
    },
    deleteList: {
      mutate: deleteList.mutate,
      mutateAsync: deleteList.mutateAsync,
      isPending: deleteList.isPending,
    },
    addRecipients: {
      mutate: addRecipients.mutate,
      mutateAsync: addRecipients.mutateAsync,
      isPending: addRecipients.isPending,
    },
    removeRecipient: {
      mutate: removeRecipient.mutate,
      mutateAsync: removeRecipient.mutateAsync,
      isPending: removeRecipient.isPending,
    },

    isCreating: createList.isPending,
    isUpdating: updateList.isPending,
    isDeleting: deleteList.isPending,
    isAddingRecipients: addRecipients.isPending,
    isRemovingRecipient: removeRecipient.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Destinatarios por Lista (com paginacao)
// -----------------------------------------------------------------------------

export function useRecipientsByList(
  listId: string | undefined,
  options?: { page?: number; pageSize?: number; is_valid?: boolean }
) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 50;

  const query = useQuery({
    queryKey: [RECIPIENTS_QUERY_KEY, listId, page, pageSize, options?.is_valid],
    queryFn: async (): Promise<{ recipients: MTBroadcastRecipient[]; total: number }> => {
      if (!listId) return { recipients: [], total: 0 };

      // Buscar total
      let countQ = supabase
        .from('mt_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', listId);

      if (options?.is_valid !== undefined) {
        countQ = countQ.eq('is_valid', options.is_valid);
      }

      const { count, error: countError } = await countQ;

      if (countError) {
        console.error('Erro ao contar destinatarios:', countError);
        throw countError;
      }

      // Buscar pagina
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('mt_broadcast_recipients')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (options?.is_valid !== undefined) {
        q = q.eq('is_valid', options.is_valid);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar destinatarios:', error);
        throw error;
      }

      return {
        recipients: (data || []) as MTBroadcastRecipient[],
        total: count || 0,
      };
    },
    enabled: !!listId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    recipients: query.data?.recipients ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    totalPages: Math.ceil((query.data?.total ?? 0) / pageSize),
  };
}

export default useBroadcastListsMT;
