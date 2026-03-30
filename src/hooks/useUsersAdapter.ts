// =============================================================================
// USE USERS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gestão de usuários usando tabelas MT
// SISTEMA 100% MT - Usa mt_users e mt_user_roles diretamente
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AppRole } from '@/types/user';

// =============================================================================
// Types
// =============================================================================

export interface UserAdapted {
  id: string;
  nome: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  unidade_id?: string | null;
  is_approved: boolean;
  is_active: boolean;
  role: string;
  created_at: string;
  updated_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  // Campos MT
  tenant_id?: string;
  franchise_id?: string | null;
  telefone?: string | null;
  cargo?: string | null;
}

interface MTUser {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  auth_user_id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  avatar_url?: string | null;
  cargo?: string | null;
  status: string; // 'ativo', 'inativo', 'pendente', 'bloqueado'
  ultimo_acesso?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  roles?: { role: { codigo: string; nome: string } | null }[];
  franchise?: { id: string; nome: string };
}

export type MTUserRole = 'platform_admin' | 'tenant_admin' | 'franchise_admin' | 'user';

// =============================================================================
// Mapper Functions
// =============================================================================

/**
 * Mapeia role MT para role legacy
 */
function mapMTRoleToLegacy(mtRole: MTUserRole): AppRole {
  const roleMap: Record<MTUserRole, AppRole> = {
    platform_admin: 'super_admin',
    tenant_admin: 'admin',
    franchise_admin: 'unidade',
    user: 'unidade',
  };
  return roleMap[mtRole] || 'unidade';
}

/**
 * Mapeia role legacy para role MT
 */
function mapLegacyRoleToMT(legacyRole: AppRole): MTUserRole {
  const roleMap: Record<string, MTUserRole> = {
    super_admin: 'platform_admin',
    admin: 'tenant_admin',
    central: 'tenant_admin',
    diretoria: 'tenant_admin',
    franqueado: 'franchise_admin',
    unidade: 'franchise_admin',
    gerente: 'user',
    marketing: 'user',
    sdr: 'user',
    consultora_vendas: 'user',
    avaliadora: 'user',
    aplicadora: 'user',
    esteticista: 'user',
  };
  return roleMap[legacyRole] || 'user';
}

/**
 * Converte usuário MT para formato adaptado
 */
function mapMTUserToAdapter(user: MTUser): UserAdapted {
  const primaryRole = user.roles?.[0]?.role?.codigo || 'user';
  const isApproved = user.status === 'ativo';
  const isActive = user.status === 'ativo';

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    full_name: user.nome,
    avatar_url: user.avatar_url,
    unidade_id: user.franchise_id,
    is_approved: isApproved,
    is_active: isActive,
    role: mapMTRoleToLegacy(primaryRole as MTUserRole),
    created_at: user.created_at,
    updated_at: user.updated_at,
    approved_at: undefined, // Campo não existe em mt_users
    approved_by: undefined, // Campo não existe em mt_users
    // Campos MT
    tenant_id: user.tenant_id,
    franchise_id: user.franchise_id,
    telefone: user.telefone,
    cargo: user.cargo,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-users';

// =============================================================================
// Hook Options
// =============================================================================

export interface UseUsersAdapterOptions {
  /**
   * Quando true, carrega TODOS os usuários do tenant (ignora filtro por franquia)
   * Útil para: selecionar responsável de sessão WhatsApp, atribuir leads, etc.
   */
  allTenantUsers?: boolean;
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useUsersAdapter(options: UseUsersAdapterOptions = {}) {
  const { allTenantUsers = false } = options;
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Usuários
  // ==========================================================================
  const {
    data: usersRaw = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel, allTenantUsers],
    queryFn: async (): Promise<MTUser[]> => {
      let query = supabase
        .from('mt_users')
        .select(`
          *,
          roles:mt_user_roles!mt_user_roles_user_id_fkey(
            role:mt_roles(codigo, nome)
          ),
          franchise:mt_franchises(id, nome)
        `)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        // Se allTenantUsers está ativo, carrega todos do tenant
        // Caso contrário, filtra por franquia
        query = query.eq('tenant_id', tenant.id);
        if (!allTenantUsers) {
          query = query.eq('franchise_id', franchise.id);
        }
      }
      // Platform admin vê todos

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Se tabela não existe, retorna vazio
        if (fetchError.code === '42P01') {
          console.warn('[MT] mt_users table not found');
          return [];
        }
        throw fetchError;
      }

      return (data || []) as MTUser[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Aprovar Usuário (ativar)
  // ==========================================================================
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: updateError } = await supabase
        .from('mt_users')
        .update({
          status: 'ativo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário aprovado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao aprovar usuário: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Revogar Aprovação (desativar)
  // ==========================================================================
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: updateError } = await supabase
        .from('mt_users')
        .update({
          status: 'pendente',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Aprovação revogada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao revogar aprovação: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Role
  // ==========================================================================
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: MTUserRole }) => {
      // Verificar se existe role para o usuário
      const { data: existing } = await supabase
        .from('mt_user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('mt_user_roles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (updateError) throw updateError;
      } else {
        // Buscar tenant_id do usuário
        const { data: user } = await supabase
          .from('mt_users')
          .select('tenant_id')
          .eq('id', userId)
          .single();

        const { error: insertError } = await supabase
          .from('mt_user_roles')
          .insert({
            user_id: userId,
            tenant_id: user?.tenant_id,
            role,
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Nível de acesso atualizado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar nível de acesso: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Franquia
  // ==========================================================================
  const updateFranchiseMutation = useMutation({
    mutationFn: async ({ userId, franchiseId }: { userId: string; franchiseId: string | null }) => {
      const { error: updateError } = await supabase
        .from('mt_users')
        .update({
          franchise_id: franchiseId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade atualizada!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar unidade: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Ativar/Desativar Usuário
  // ==========================================================================
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error: updateError } = await supabase
        .from('mt_users')
        .update({
          status: isActive ? 'ativo' : 'inativo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(isActive ? 'Usuário ativado!' : 'Usuário desativado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Usuário
  // ==========================================================================
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Primeiro, deletar roles do usuário
      await supabase
        .from('mt_user_roles')
        .delete()
        .eq('user_id', userId);

      // Depois, deletar o usuário
      const { error: deleteError } = await supabase
        .from('mt_users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Usuário removido!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover usuário: ${err.message}`);
    },
  });

  // Mapear para formato adaptado
  const users = usersRaw.map(mapMTUserToAdapter);

  return {
    users,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,

    // Mutations
    approveUser: approveUserMutation.mutate,
    rejectUser: rejectUserMutation.mutate,
    updateRole: (params: { userId: string; role: AppRole }) => {
      updateRoleMutation.mutate({
        userId: params.userId,
        role: mapLegacyRoleToMT(params.role),
      });
    },
    updateUnidade: (params: { userId: string; unidadeId: string | null }) => {
      updateFranchiseMutation.mutate({
        userId: params.userId,
        franchiseId: params.unidadeId,
      });
    },
    toggleActive: toggleActiveMutation.mutate,
    deleteUser: deleteUserMutation.mutate,

    // Status
    isApproving: approveUserMutation.isPending,
    isRejecting: rejectUserMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
    isUpdatingFranchise: updateFranchiseMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
    isDeleting: deleteUserMutation.isPending,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { AppRole } from '@/types/user';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getUsersMode(): 'mt' {
  return 'mt';
}

export default useUsersAdapter;
