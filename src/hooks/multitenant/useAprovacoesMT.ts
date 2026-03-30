// =============================================================================
// USE APROVACOES MT - Hook Multi-Tenant para Aprovações de Usuários
// =============================================================================
//
// Hook MT puro para aprovações de usuários usando mt_users.
// Extrai a camada de dados MT do useAprovacoesAdapter.
//
// Tabela: mt_users (filtra por status pendente/ativo/rejeitado)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface UsuarioAprovacao {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  cargo: string | null;
  status: 'pendente' | 'ativo' | 'rejeitado';
  role: string | null;
  auth_user_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  tenant?: { slug: string; nome_fantasia: string };
  franchise?: { id: string; nome_fantasia: string };
}

export interface AprovacaoStats {
  pendentes: number;
  aprovados: number;
  rejeitados: number;
  total: number;
}

// =============================================================================
// Query Key
// =============================================================================

const QUERY_KEY = 'mt-aprovacoes';

// =============================================================================
// Hook Principal
// =============================================================================

export function useAprovacoesMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Usuários para Aprovação
  // ==========================================================================
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let q = supabase
        .from('mt_users')
        .select(`
          *,
          tenant:mt_tenants(slug, nome_fantasia),
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }
      // Platform admin vê todos

      const { data, error } = await q;
      if (error) {
        console.error('[MT] Erro ao buscar usuários para aprovação:', error);
        throw error;
      }
      return (data || []) as UsuarioAprovacao[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Aprovar Usuário
  // ==========================================================================
  const approve = useMutation({
    mutationFn: async ({
      userId,
      role,
      franqueadoId,
    }: {
      userId: string;
      role?: string;
      franqueadoId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('mt_users')
        .update({
          status: 'ativo',
          ...(role && { role }),
          ...(franqueadoId && { franchise_id: franqueadoId }),
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário aprovado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Rejeitar Usuário
  // ==========================================================================
  const reject = useMutation({
    mutationFn: async ({
      userId,
      motivo,
    }: {
      userId: string;
      motivo?: string;
    }) => {
      const { error } = await supabase
        .from('mt_users')
        .update({
          status: 'rejeitado',
          rejection_reason: motivo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário rejeitado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Reativar Usuário
  // ==========================================================================
  const reactivate = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('mt_users')
        .update({
          status: 'pendente',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário reativado para aprovação');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reativar: ${error.message}`);
    },
  });

  // ==========================================================================
  // Dados derivados
  // ==========================================================================
  const usuarios = query.data || [];

  const pendentes = usuarios.filter((u) => u.status === 'pendente');
  const aprovados = usuarios.filter((u) => u.status === 'ativo');
  const rejeitados = usuarios.filter((u) => u.status === 'rejeitado');

  const stats: AprovacaoStats = {
    pendentes: pendentes.length,
    aprovados: aprovados.length,
    rejeitados: rejeitados.length,
    total: usuarios.length,
  };

  return {
    usuarios,
    pendentes,
    aprovados,
    rejeitados,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    stats,
    approve,
    reject,
    reactivate,
    isAprovando: approve.isPending,
    isRejeitando: reject.isPending,
    isReativando: reactivate.isPending,
  };
}

export default useAprovacoesMT;
