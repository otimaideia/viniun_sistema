// =============================================================================
// USE APROVACOES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para aprovações de usuários usando mt_users
// SISTEMA 100% MT - Sem fallback para legacy
//
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
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  status: 'pendente' | 'ativo' | 'rejeitado';
  role: string | null;
  franqueado_id: string | null;
  franqueado_nome: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  tenant_id?: string;
  franchise_id?: string;
}

export interface AprovacaoStats {
  pendentes: number;
  aprovados: number;
  rejeitados: number;
}

export interface UsuarioAprovacaoAdaptado extends UsuarioAprovacao {
  tenant_id?: string;
  franchise_id?: string;
}

// =============================================================================
// Query Key
// =============================================================================

const QUERY_KEY = 'mt-aprovacoes';

// =============================================================================
// Hook Principal
// =============================================================================

export function useAprovacoesAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Usuários para Aprovação
  // ==========================================================================
  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, accessLevel],
    queryFn: async (): Promise<{
      pendentes: UsuarioAprovacaoAdaptado[];
      aprovados: UsuarioAprovacaoAdaptado[];
      rejeitados: UsuarioAprovacaoAdaptado[];
    }> => {
      let queryBuilder = supabase
        .from('mt_users')
        .select(`
          *,
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        queryBuilder = queryBuilder.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        queryBuilder = queryBuilder.eq('franchise_id', franchise.id);
      }
      // Platform admin vê todos

      const { data: profiles, error } = await queryBuilder;

      if (error) {
        console.error('[MT] Erro ao buscar usuários:', error);
        throw error;
      }

      const usuarios = (profiles || []).map((p) => ({
        id: p.id,
        nome: p.nome || 'Sem nome',
        email: p.email || '',
        telefone: p.telefone,
        avatar_url: p.avatar_url,
        status: (p.status || 'pendente') as 'pendente' | 'ativo' | 'rejeitado',
        role: p.role,
        franqueado_id: p.franchise_id,
        franqueado_nome: p.franchise?.nome_fantasia || null,
        aprovado_por: p.approved_by,
        aprovado_em: p.approved_at,
        motivo_rejeicao: p.rejection_reason,
        created_at: p.created_at,
        tenant_id: p.tenant_id,
        franchise_id: p.franchise_id,
      })) as UsuarioAprovacaoAdaptado[];

      return {
        pendentes: usuarios.filter((u) => u.status === 'pendente'),
        aprovados: usuarios.filter((u) => u.status === 'ativo'),
        rejeitados: usuarios.filter((u) => u.status === 'rejeitado'),
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Aprovar Usuário
  // ==========================================================================
  const aprovarMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      franqueadoId,
    }: {
      userId: string;
      role: string;
      franqueadoId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('mt_users')
        .update({
          status: 'ativo',
          role,
          franchise_id: franqueadoId || null,
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[MT] Erro ao aprovar usuário:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário aprovado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar usuário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Rejeitar Usuário
  // ==========================================================================
  const rejeitarMutation = useMutation({
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

      if (error) {
        console.error('[MT] Erro ao rejeitar usuário:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário rejeitado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar usuário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Reativar Usuário
  // ==========================================================================
  const reativarMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('mt_users')
        .update({
          status: 'pendente',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[MT] Erro ao reativar usuário:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário reativado para aprovação');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reativar usuário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Calcular estatísticas
  // ==========================================================================
  const getStats = (): AprovacaoStats => {
    const data = query.data;
    return {
      pendentes: data?.pendentes.length || 0,
      aprovados: data?.aprovados.length || 0,
      rejeitados: data?.rejeitados.length || 0,
    };
  };

  return {
    pendentes: query.data?.pendentes || [],
    aprovados: query.data?.aprovados || [],
    rejeitados: query.data?.rejeitados || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    stats: getStats(),

    aprovarUsuario: aprovarMutation.mutate,
    rejeitarUsuario: rejeitarMutation.mutate,
    reativarUsuario: reativarMutation.mutate,

    isAprovando: aprovarMutation.isPending,
    isRejeitando: rejeitarMutation.isPending,
    isReativando: reativarMutation.isPending,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getAprovacoesMode(): 'mt' {
  return 'mt';
}

export default useAprovacoesAdapter;
