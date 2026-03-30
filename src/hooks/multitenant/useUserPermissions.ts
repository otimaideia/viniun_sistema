// =============================================================================
// USE USER PERMISSIONS - Hook para verificação de permissões granulares
// =============================================================================
//
// Este hook busca permissões do usuário de duas fontes:
// 1. mt_role_permissions - Permissões herdadas do role do usuário
// 2. mt_user_permissions - Permissões específicas do usuário (override)
//
// Uso:
//   const { hasPermission, canAccess, isLoading } = useUserPermissions();
//   if (hasPermission('whatsapp.sessions.sync')) { ... }
//   if (canAccess('whatsapp', 'create')) { ... }
//
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// Types
// =============================================================================

interface Permission {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  module_codigo?: string;
  granted: boolean;
  source: 'role' | 'user'; // De onde veio a permissão
}

interface UseUserPermissionsReturn {
  // Estado
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;

  // Verificações de permissão
  hasPermission: (codigo: string) => boolean;
  hasAnyPermission: (...codigos: string[]) => boolean;
  hasAllPermissions: (...codigos: string[]) => boolean;

  // Verificações de módulo
  canAccess: (moduleCode: string, action?: 'view' | 'create' | 'edit' | 'delete' | 'sync' | 'manage') => boolean;
  getModulePermissions: (moduleCode: string) => string[];

  // Roles
  roles: string[];
  hasRole: (roleCodigo: string) => boolean;
  highestRoleLevel: number;

  // Helpers
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
  isFranchiseAdmin: boolean;
  isAdmin: boolean;

  // Refresh
  refetch: () => void;
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useUserPermissions(): UseUserPermissionsReturn {
  const { user } = useAuth();
  const { user: mtUser, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ==========================================================================
  // Query: Buscar Roles do Usuário
  // ==========================================================================
  const { data: rolesData, isLoading: isLoadingRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['mt-user-roles-permissions', mtUser?.id],
    queryFn: async () => {
      if (!mtUser?.id) return { roles: [], roleIds: [] };

      const { data, error } = await supabase
        .from('mt_user_roles')
        .select(`
          role_id,
          role:mt_roles(
            id,
            codigo,
            nome,
            nivel
          )
        `)
        .eq('user_id', mtUser.id)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar roles:', error);
        return { roles: [], roleIds: [] };
      }

      const roles = (data || [])
        .map((r: any) => r.role)
        .filter(Boolean);

      return {
        roles,
        roleIds: roles.map((r: any) => r.id),
      };
    },
    enabled: !!mtUser?.id && !isTenantLoading,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // ==========================================================================
  // Query: Buscar Permissões dos Roles
  // ==========================================================================
  const { data: rolePermissions = [], isLoading: isLoadingRolePerms, refetch: refetchRolePerms } = useQuery({
    queryKey: ['mt-role-permissions-user', rolesData?.roleIds],
    queryFn: async () => {
      if (!rolesData?.roleIds?.length) return [];

      const { data, error } = await supabase
        .from('mt_role_permissions')
        .select(`
          permission_id,
          granted,
          permission:mt_permissions(
            id,
            codigo,
            nome,
            descricao,
            module:mt_modules(codigo)
          )
        `)
        .in('role_id', rolesData.roleIds)
        .eq('granted', true);

      if (error) {
        console.error('Erro ao buscar permissões de roles:', error);
        return [];
      }

      return (data || []).map((rp: any) => ({
        id: rp.permission_id,
        codigo: rp.permission?.codigo || '',
        nome: rp.permission?.nome || '',
        descricao: rp.permission?.descricao,
        module_codigo: rp.permission?.module?.codigo,
        granted: rp.granted,
        source: 'role' as const,
      }));
    },
    enabled: !!rolesData?.roleIds?.length,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // Query: Buscar Permissões Específicas do Usuário
  // ==========================================================================
  const { data: userPermissions = [], isLoading: isLoadingUserPerms, refetch: refetchUserPerms } = useQuery({
    queryKey: ['mt-user-specific-permissions', mtUser?.id],
    queryFn: async () => {
      if (!mtUser?.id) return [];

      const { data, error } = await supabase
        .from('mt_user_permissions')
        .select(`
          permission_id,
          granted,
          permission:mt_permissions(
            id,
            codigo,
            nome,
            descricao,
            module:mt_modules(codigo)
          )
        `)
        .eq('user_id', mtUser.id);

      if (error) {
        console.error('Erro ao buscar permissões do usuário:', error);
        return [];
      }

      return (data || []).map((up: any) => ({
        id: up.permission_id,
        codigo: up.permission?.codigo || '',
        nome: up.permission?.nome || '',
        descricao: up.permission?.descricao,
        module_codigo: up.permission?.module?.codigo,
        granted: up.granted,
        source: 'user' as const,
      }));
    },
    enabled: !!mtUser?.id && !isTenantLoading,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // Computed: Merge de Permissões (user override > role)
  // ==========================================================================
  const permissions = useMemo(() => {
    // Criar map de permissões
    const permMap = new Map<string, Permission>();

    // Primeiro adicionar permissões dos roles
    rolePermissions.forEach((perm) => {
      if (perm.codigo) {
        permMap.set(perm.codigo, perm);
      }
    });

    // Depois adicionar/sobrescrever com permissões específicas do usuário
    userPermissions.forEach((perm) => {
      if (perm.codigo) {
        permMap.set(perm.codigo, perm);
      }
    });

    return Array.from(permMap.values());
  }, [rolePermissions, userPermissions]);

  // ==========================================================================
  // Computed: Lista de códigos de roles
  // ==========================================================================
  const roles = useMemo(() => {
    return (rolesData?.roles || []).map((r: any) => r.codigo);
  }, [rolesData?.roles]);

  // ==========================================================================
  // Computed: Nível mais alto (menor número = mais alto)
  // ==========================================================================
  const highestRoleLevel = useMemo(() => {
    const levels = (rolesData?.roles || []).map((r: any) => r.nivel || 100);
    return levels.length > 0 ? Math.min(...levels) : 100;
  }, [rolesData?.roles]);

  // ==========================================================================
  // Helpers: Verificações de admin
  // ==========================================================================
  const isPlatformAdmin = accessLevel === 'platform' || highestRoleLevel <= 1;
  const isTenantAdmin = accessLevel === 'tenant' || highestRoleLevel <= 2 || isPlatformAdmin;
  const isFranchiseAdmin = accessLevel === 'franchise' || highestRoleLevel <= 3 || isTenantAdmin;
  const isAdmin = isPlatformAdmin || isTenantAdmin;

  // ==========================================================================
  // Funções de Verificação
  // ==========================================================================

  /**
   * Verifica se o usuário tem uma permissão específica
   * @param codigo Código da permissão (ex: "whatsapp.sessions.sync")
   */
  const hasPermission = useCallback(
    (codigo: string): boolean => {
      // Platform admin tem TODAS as permissões
      if (isPlatformAdmin) return true;

      // Tenant admin tem TODAS as permissões (exceto platform-only)
      if (isTenantAdmin && !codigo.includes('platform.')) return true;

      // Franchise admin tem permissões operacionais (exceto platform.* e tenant.*)
      if (isFranchiseAdmin && !codigo.includes('platform.') && !codigo.includes('tenant.')) return true;

      // Verificar na lista de permissões
      const perm = permissions.find((p) => p.codigo === codigo);
      return perm?.granted ?? false;
    },
    [isPlatformAdmin, isTenantAdmin, isFranchiseAdmin, permissions]
  );

  /**
   * Verifica se o usuário tem QUALQUER uma das permissões
   */
  const hasAnyPermission = useCallback(
    (...codigos: string[]): boolean => {
      return codigos.some((codigo) => hasPermission(codigo));
    },
    [hasPermission]
  );

  /**
   * Verifica se o usuário tem TODAS as permissões
   */
  const hasAllPermissions = useCallback(
    (...codigos: string[]): boolean => {
      return codigos.every((codigo) => hasPermission(codigo));
    },
    [hasPermission]
  );

  /**
   * Verifica se o usuário pode acessar um módulo com determinada ação
   * @param moduleCode Código do módulo (ex: "whatsapp", "leads")
   * @param action Ação específica (view, create, edit, delete, sync, manage)
   */
  const canAccess = useCallback(
    (moduleCode: string, action?: 'view' | 'create' | 'edit' | 'delete' | 'sync' | 'manage'): boolean => {
      // Platform admin tem acesso total
      if (isPlatformAdmin) return true;

      // Tenant admin tem acesso total (exceto platform modules)
      if (isTenantAdmin && moduleCode !== 'platform') return true;

      // Franchise admin tem acesso operacional (exceto platform e tenant modules)
      if (isFranchiseAdmin && moduleCode !== 'platform' && moduleCode !== 'tenant') return true;

      // Se ação específica, verificar permissão específica
      if (action) {
        return hasPermission(`${moduleCode}.${action}`);
      }

      // Se não especificou ação, verificar se tem qualquer permissão do módulo
      return permissions.some(
        (p) => p.codigo.startsWith(`${moduleCode}.`) && p.granted
      );
    },
    [isPlatformAdmin, isTenantAdmin, isFranchiseAdmin, hasPermission, permissions]
  );

  /**
   * Retorna todas as permissões de um módulo que o usuário possui
   */
  const getModulePermissions = useCallback(
    (moduleCode: string): string[] => {
      if (isPlatformAdmin || isTenantAdmin) {
        // Retorna todas as permissões possíveis do módulo
        return permissions
          .filter((p) => p.codigo.startsWith(`${moduleCode}.`))
          .map((p) => p.codigo);
      }

      return permissions
        .filter((p) => p.codigo.startsWith(`${moduleCode}.`) && p.granted)
        .map((p) => p.codigo);
    },
    [isPlatformAdmin, isTenantAdmin, permissions]
  );

  /**
   * Verifica se o usuário tem um role específico
   */
  const hasRole = useCallback(
    (roleCodigo: string): boolean => {
      return roles.includes(roleCodigo);
    },
    [roles]
  );

  // ==========================================================================
  // Return
  // ==========================================================================

  const isLoading = isTenantLoading || isLoadingRoles || isLoadingRolePerms || isLoadingUserPerms;

  return {
    // Estado
    permissions,
    isLoading,
    error: null,

    // Verificações de permissão
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Verificações de módulo
    canAccess,
    getModulePermissions,

    // Roles
    roles,
    hasRole,
    highestRoleLevel,

    // Helpers
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
    isAdmin,

    // Refresh
    refetch: () => {
      refetchRoles();
      refetchRolePerms();
      refetchUserPerms();
    },
  };
}

export default useUserPermissions;
