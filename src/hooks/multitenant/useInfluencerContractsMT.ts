// =============================================================================
// USE INFLUENCER CONTRACTS MT - Hook Multi-Tenant para Contratos de Influenciadoras
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MTContractType = 'mensal' | 'por_post' | 'comissao' | 'permuta' | 'misto';
export type MTContractStatus = 'ativo' | 'pausado' | 'encerrado' | 'cancelado';

export interface MTInfluencerContract {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  influencer_id: string;

  // Tipo de contrato
  tipo: MTContractType;

  // Datas
  data_inicio: string;
  data_fim: string | null;

  // Valores
  valor_mensal: number | null;
  valor_por_post: number | null;
  percentual_comissao: number | null;
  valor_comissao_fixa: number | null;
  credito_permuta: number | null;

  // Metas
  posts_mes: number | null;
  stories_mes: number | null;
  reels_mes: number | null;

  // Status
  status: MTContractStatus;
  contrato_url: string | null;
  assinado: boolean;
  assinado_em: string | null;

  // Permuta
  servicos_permuta: string[] | null; // IDs dos serviços de permuta
  template_tipo: string | null; // 'contrato_normal' | 'contrato_permuta' | 'encerramento'

  // Texto personalizado do contrato
  texto_contrato: string | null;

  // Aditivos
  aditivos_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Relations
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    foto_perfil: string | null;
  };
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface MTContractCreate {
  influencer_id: string;
  franchise_id?: string | null;
  tipo: MTContractType;
  data_inicio: string;
  data_fim?: string | null;
  valor_mensal?: number;
  valor_por_post?: number;
  percentual_comissao?: number;
  valor_comissao_fixa?: number;
  credito_permuta?: number;
  posts_mes?: number;
  stories_mes?: number;
  reels_mes?: number;
  status?: MTContractStatus;
  contrato_url?: string;
  servicos_permuta?: string[];
  template_tipo?: string;
  texto_contrato?: string | null;
}

export interface MTContractUpdate extends Partial<MTContractCreate> {
  id: string;
  // Amendment (aditivo) fields
  gerar_aditivo?: boolean;
  motivo_aditivo?: string;
}

export interface MTContractFilters {
  influencer_id?: string;
  status?: MTContractStatus;
  tipo?: MTContractType;
  franchise_id?: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-influencer-contracts';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }

  const pgCode = error?.code;
  if (pgCode === '23503') {
    return 'Influenciadora não encontrada.';
  }
  if (pgCode === '23505') {
    return 'Já existe um contrato ativo para esta influenciadora.';
  }

  return error?.message || 'Erro desconhecido.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useInfluencerContractsMT(filters?: MTContractFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Contratos
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, filters?.influencer_id, filters?.status, filters?.tipo],
    queryFn: async (): Promise<MTInfluencerContract[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_influencer_contracts')
        .select(`
          *,
          influencer:mt_influencers!inner (id, nome, nome_artistico, foto_perfil),
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Filtros opcionais
      if (filters?.influencer_id) {
        q = q.eq('influencer_id', filters.influencer_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.tipo) {
        q = q.eq('tipo', filters.tipo);
      }
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar contratos MT:', error);
        throw error;
      }

      return (data || []) as MTInfluencerContract[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Contrato
  // ---------------------------------------------------------------------------

  const createContract = useMutation({
    mutationFn: async (newContract: MTContractCreate): Promise<MTInfluencerContract> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const contractData = {
        ...newContract,
        tenant_id: tenant!.id,
        franchise_id: newContract.franchise_id || franchise?.id || null,
        status: newContract.status || 'ativo',
        assinado: false,
      };

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .insert(contractData)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar contrato MT:', error);
        throw error;
      }

      return data as MTInfluencerContract;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-influencers'] });
      toast.success('Contrato criado com sucesso!');

      // Notificar influenciadora (fire-and-forget)
      if (data?.influencer_id && data?.tenant_id) {
        supabase.functions.invoke('send-contract-notification', {
          body: {
            influencerId: data.influencer_id,
            contractId: data.id,
            tenantId: data.tenant_id,
            franchiseId: data.franchise_id,
            type: 'contrato_criado',
          },
        }).catch(err => console.error('[notify] Erro ao notificar contrato_criado:', err));
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Contrato
  // ---------------------------------------------------------------------------

  const updateContract = useMutation({
    mutationFn: async ({ id, gerar_aditivo, motivo_aditivo, ...updates }: MTContractUpdate): Promise<MTInfluencerContract> => {
      if (!id) {
        throw new Error('ID do contrato é obrigatório.');
      }

      // 1. Buscar snapshot do contrato atual (dados anteriores)
      const { data: contratoAtual, error: fetchError } = await supabase
        .from('mt_influencer_contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar contrato para snapshot:', fetchError);
        throw fetchError;
      }

      const isAditivo = gerar_aditivo && contratoAtual?.assinado;

      // 2. Se contrato assinado e gerar_aditivo = true → criar aditivo contratual
      if (isAditivo && tenant) {
        const novoAditivoNum = (contratoAtual.aditivos_count || 0) + 1;

        // Inserir histórico do aditivo
        const { error: histError } = await supabase
          .from('mt_influencer_contract_history')
          .insert({
            tenant_id: tenant.id,
            contract_id: id,
            tipo_alteracao: 'aditivo',
            aditivo_numero: novoAditivoNum,
            aditivo_descricao: motivo_aditivo || 'Alteração contratual',
            dados_anteriores: contratoAtual,
            dados_novos: updates,
            status_anterior: contratoAtual.status,
            status_novo: updates.status || contratoAtual.status,
            motivo: motivo_aditivo,
          });

        if (histError) {
          console.error('Erro ao gravar histórico de aditivo:', histError);
          throw histError;
        }

        // Atualizar contrato: novos dados + assinado = false + incrementar aditivos_count
        const { data, error } = await supabase
          .from('mt_influencer_contracts')
          .update({
            ...updates,
            assinado: false,
            assinado_em: null,
            aditivos_count: novoAditivoNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(`
            *,
            influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
            tenant:mt_tenants (id, slug, nome_fantasia),
            franchise:mt_franchises (id, nome_fantasia)
          `)
          .single();

        if (error) {
          console.error('Erro ao atualizar contrato com aditivo:', error);
          throw error;
        }

        return data as MTInfluencerContract;
      }

      // 3. Se contrato NÃO assinado → update normal (mas ainda grava histórico)
      if (tenant) {
        await supabase
          .from('mt_influencer_contract_history')
          .insert({
            tenant_id: tenant.id,
            contract_id: id,
            tipo_alteracao: 'atualizacao',
            dados_anteriores: contratoAtual,
            dados_novos: updates,
            status_anterior: contratoAtual?.status,
            status_novo: updates.status || contratoAtual?.status,
          });
      }

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar contrato MT:', error);
        throw error;
      }

      return data as MTInfluencerContract;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-contract-history'] });
      if (variables.gerar_aditivo) {
        toast.success('Aditivo contratual gerado! Envie o link de assinatura.');

        // Notificar influenciadora sobre aditivo (fire-and-forget)
        if (data?.influencer_id && data?.tenant_id) {
          supabase.functions.invoke('send-contract-notification', {
            body: {
              influencerId: data.influencer_id,
              contractId: data.id,
              tenantId: data.tenant_id,
              franchiseId: data.franchise_id,
              type: 'aditivo_gerado',
              extra: { aditivo_numero: data.aditivos_count },
            },
          }).catch(err => console.error('[notify] Erro ao notificar aditivo_gerado:', err));
        }
      } else {
        toast.success('Contrato atualizado!');
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MTContractStatus }): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_contracts')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Cancelar Contrato (Bilateral)
  // ---------------------------------------------------------------------------

  const cancelContract = useMutation({
    mutationFn: async ({
      id,
      motivo,
      solicitante,
    }: {
      id: string;
      motivo: string;
      solicitante: 'empresa' | 'influenciadora';
    }): Promise<MTInfluencerContract> => {
      if (!id) throw new Error('ID do contrato é obrigatório.');

      // 1. Buscar contrato atual
      const { data: contratoAtual, error: fetchError } = await supabase
        .from('mt_influencer_contracts')
        .select('*, influencer:mt_influencers(id, nome, nome_artistico, telefone, email)')
        .eq('id', id)
        .single();

      if (fetchError || !contratoAtual) throw fetchError || new Error('Contrato não encontrado.');

      // 2. Calcular dias de vigência e prazo CDC
      const dataInicio = new Date(contratoAtual.data_inicio);
      const hoje = new Date();
      const diasVigencia = Math.floor((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
      const dentroPrazoCDC = diasVigencia <= 7;

      // 3. Atualizar status para cancelado
      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .update({
          status: 'cancelado' as MTContractStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .single();

      if (error) throw error;

      // 4. Registrar no histórico
      const tipoAlteracao = solicitante === 'empresa' ? 'cancelamento_empresa' : 'cancelamento_influenciadora';

      if (tenant) {
        await supabase
          .from('mt_influencer_contract_history')
          .insert({
            tenant_id: tenant.id,
            contract_id: id,
            tipo_alteracao: tipoAlteracao,
            status_anterior: contratoAtual.status,
            status_novo: 'cancelado',
            motivo,
            dados_anteriores: contratoAtual,
            dados_novos: {
              dias_vigencia: diasVigencia,
              dentro_prazo_cdc: dentroPrazoCDC,
              solicitante,
              base_legal: dentroPrazoCDC ? 'CDC Art. 49 - Direito de Arrependimento' : 'Cláusula 7 - Aviso Prévio 30 dias',
            },
          });
      }

      // 5. Suspender acesso do influenciador ao portal
      await supabase
        .from('mt_influencers')
        .update({ status: 'suspenso', updated_at: new Date().toISOString() })
        .eq('id', contratoAtual.influencer_id);

      // 6. Enviar notificação WhatsApp (fire-and-forget)
      const notificationType = solicitante === 'empresa' ? 'cancelamento_empresa' : 'cancelamento_influenciadora';
      supabase.functions.invoke('send-contract-notification', {
        body: {
          influencerId: contratoAtual.influencer_id,
          contractId: id,
          tenantId: contratoAtual.tenant_id,
          franchiseId: contratoAtual.franchise_id,
          type: notificationType,
          extra: {
            motivo,
            solicitante,
            dias_vigencia: diasVigencia,
            dentro_prazo_cdc: dentroPrazoCDC,
            influencer_nome: (contratoAtual as any).influencer?.nome_artistico || (contratoAtual as any).influencer?.nome || 'Influenciadora',
          },
        },
      }).catch(err => console.error(`[notify] Erro ao notificar ${notificationType}:`, err));

      return data as MTInfluencerContract;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-contract-history'] });
      const msg = variables.solicitante === 'empresa'
        ? 'Contrato cancelado. Influenciadora será notificada.'
        : 'Cancelamento solicitado com sucesso.';
      toast.success(msg);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Contrato
  // ---------------------------------------------------------------------------

  const deleteContract = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_influencer_contracts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar contrato MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Contrato removido!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createContract: {
      mutate: createContract.mutate,
      mutateAsync: createContract.mutateAsync,
      isPending: createContract.isPending,
    },
    updateContract: {
      mutate: updateContract.mutate,
      mutateAsync: updateContract.mutateAsync,
      isPending: updateContract.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
    cancelContract: {
      mutate: cancelContract.mutate,
      mutateAsync: cancelContract.mutateAsync,
      isPending: cancelContract.isPending,
    },
    deleteContract: {
      mutate: deleteContract.mutate,
      mutateAsync: deleteContract.mutateAsync,
      isPending: deleteContract.isPending,
    },
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Contrato por ID
// -----------------------------------------------------------------------------

export function useInfluencerContractMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTInfluencerContract | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .select(`
          *,
          influencer:mt_influencers (id, nome, nome_artistico, foto_perfil),
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome_fantasia)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTInfluencerContract;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Buscar Histórico de Aditivos do Contrato
// -----------------------------------------------------------------------------

export interface MTContractHistory {
  id: string;
  tenant_id: string;
  contract_id: string;
  tipo_alteracao: string;
  aditivo_numero: number | null;
  aditivo_descricao: string | null;
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  status_anterior: string | null;
  status_novo: string | null;
  motivo: string | null;
  created_at: string;
}

export function useContractHistoryMT(contractId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-contract-history', contractId],
    queryFn: async (): Promise<MTContractHistory[]> => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('mt_influencer_contract_history')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico do contrato:', error);
        throw error;
      }

      return (data || []) as MTContractHistory[];
    },
    enabled: !!contractId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default useInfluencerContractsMT;
