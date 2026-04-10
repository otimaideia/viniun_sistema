// =============================================================================
// USE CONSULTAS IMOVEIS MT - Hook Multi-Tenant para Consultas/Inquiries
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTPropertyInquiry,
  InquiryTipo,
  InquiryStatus,
} from '@/types/consulta-imovel-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTConsultaFilters {
  tipo?: InquiryTipo;
  status?: InquiryStatus;
  property_id?: string;
  date_from?: string;
  date_to?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-property-inquiries';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useConsultasImoveisMT(filters?: MTConsultaFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Consultas
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.tipo, filters?.status, filters?.property_id, filters?.date_from, filters?.date_to],
    queryFn: async (): Promise<MTPropertyInquiry[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_property_inquiries')
        .select(`
          *,
          property:mt_properties(id, titulo, ref_code),
          corretor:mt_corretores(id, nome)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }

      if (filters?.property_id) {
        q = q.eq('property_id', filters.property_id);
      }

      if (filters?.date_from) {
        q = q.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        q = q.lte('created_at', filters.date_to);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar consultas MT:', error);
        throw error;
      }

      return (data || []) as MTPropertyInquiry[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Consulta
  // ---------------------------------------------------------------------------

  const create = useMutation({
    mutationFn: async (newItem: Partial<MTPropertyInquiry>): Promise<MTPropertyInquiry> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_property_inquiries')
        .insert({
          ...newItem,
          tenant_id: tenant!.id,
          franchise_id: franchise?.id,
          status: newItem.status || 'novo',
        })
        .select(`
          *,
          property:mt_properties(id, titulo, ref_code),
          corretor:mt_corretores(id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar consulta MT:', error);
        throw error;
      }

      return data as MTPropertyInquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Consulta registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao registrar consulta.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notas_internas }: { id: string; status: InquiryStatus; notas_internas?: string }) => {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'respondido') {
        updateData.respondido_em = new Date().toISOString();
      }

      if (notas_internas !== undefined) {
        updateData.notas_internas = notas_internas;
      }

      const { data, error } = await supabase
        .from('mt_property_inquiries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar status da consulta MT:', error);
        throw error;
      }

      return data as MTPropertyInquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status da consulta atualizado.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar status.');
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Soft Delete
  // ---------------------------------------------------------------------------

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_property_inquiries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover consulta MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Consulta removida com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao remover consulta.');
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    updateStatus,
    remove,
  };
}
