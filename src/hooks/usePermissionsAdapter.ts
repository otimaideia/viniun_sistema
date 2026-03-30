// =============================================================================
// USE PERMISSIONS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para permissões do usuário atual usando tabelas MT
// SISTEMA 100% MT - Usa mt_users, mt_user_roles, mt_user_permissions diretamente
//
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, ModuleName, ModulePermission } from '@/types/user';

// =============================================================================
// Types
// =============================================================================

// Inclui todos os códigos de role que podem existir em mt_roles
type MTRole = 'platform_admin' | 'tenant_admin' | 'franchise_admin' | 'user' | 'super_admin' | 'admin';

interface MTUserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  permission?: {
    id: string;
    codigo: string;
    nome: string;
    module_id: string;
    module?: {
      id: string;
      codigo: string;
      nome: string;
      categoria: string;
    };
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-user-permissions';

// =============================================================================
// Mapper Functions
// =============================================================================

function mapMTRoleToLegacy(mtRole: MTRole): AppRole {
  const roleMap: Record<MTRole, AppRole> = {
    platform_admin: 'super_admin',
    super_admin: 'super_admin',    // Código alternativo
    tenant_admin: 'admin',
    admin: 'admin',                // Código alternativo
    franchise_admin: 'unidade',
    user: 'unidade',
  };
  return roleMap[mtRole] || 'unidade';
}

function mapMTPermissionToLegacy(perm: MTUserPermission): ModulePermission {
  const module = perm.permission?.module;
  const permission = perm.permission;

  return {
    id: perm.id,
    role: 'user' as AppRole,
    modulo_id: module?.id || permission?.module_id || '',
    modulo_nome: (module?.nome || module?.codigo || permission?.nome || '') as ModuleName,
    can_view: perm.granted,
    can_create: perm.granted,
    can_edit: perm.granted,
    can_delete: perm.granted,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function usePermissionsAdapter() {
  const { user, isAuthenticated } = useAuth();

  // ==========================================================================
  // Query: Buscar Usuário MT e Role
  // ==========================================================================
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['mt-user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar usuário MT
      const { data: mtUser, error: userError } = await supabase
        .from('mt_users')
        .select('id, tenant_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError || !mtUser) {
        console.warn('[MT] Usuário não encontrado em mt_users');
        return null;
      }

      // Buscar roles (mt_user_roles → mt_roles)
      // Busca todas as roles ativas e seleciona a de maior prioridade (menor nivel)
      const { data: rolesData } = await supabase
        .from('mt_user_roles')
        .select('role:mt_roles(codigo, nivel)')
        .eq('user_id', mtUser.id)
        .eq('is_active', true);

      // Selecionar role de maior prioridade (menor nivel = maior prioridade)
      const roles = (rolesData || [])
        .map(r => r.role as { codigo: string; nivel: number } | null)
        .filter(r => r !== null)
        .sort((a, b) => (a?.nivel || 999) - (b?.nivel || 999));

      const roleCodigo = roles[0]?.codigo;

      return {
        mtUserId: mtUser.id,
        tenantId: mtUser.tenant_id,
        mtRole: (roleCodigo as MTRole) || 'user',
      };
    },
    enabled: !!user?.id && isAuthenticated,
  });

  // ==========================================================================
  // Query: Buscar Permissões do Usuário
  // ==========================================================================
  const {
    data: permissionsRaw = [],
    isLoading: isLoadingPermissions,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, userData?.mtUserId],
    queryFn: async (): Promise<MTUserPermission[]> => {
      if (!userData?.mtUserId) return [];

      // Platform admin, super_admin, tenant admin e admin têm todas as permissões
      const fullAccessRoles: MTRole[] = ['platform_admin', 'super_admin', 'tenant_admin', 'admin'];
      if (fullAccessRoles.includes(userData.mtRole)) {
        // Buscar todos os módulos ativos
        const { data: modules } = await supabase
          .from('mt_modules')
          .select('id, codigo, nome, categoria')
          .eq('is_active', true);

        // Retornar permissão total para cada módulo
        return (modules || []).map((mod) => ({
          id: `auto-${mod.id}`,
          user_id: userData.mtUserId,
          permission_id: `perm-${mod.id}`,
          granted: true,
          permission: {
            id: `perm-${mod.id}`,
            codigo: `${mod.codigo}_full`,
            nome: `Acesso Total - ${mod.nome}`,
            module_id: mod.id,
            module: mod,
          },
        }));
      }

      // Buscar permissões específicas do usuário
      // mt_user_permissions → mt_permissions → mt_modules
      const { data, error: fetchError } = await supabase
        .from('mt_user_permissions')
        .select(`
          id,
          user_id,
          permission_id,
          granted,
          permission:mt_permissions(
            id,
            codigo,
            nome,
            module_id,
            module:mt_modules(id, codigo, nome, categoria)
          )
        `)
        .eq('user_id', userData.mtUserId);

      if (fetchError) {
        // Se tabela não existe ou erro de join, retorna vazio
        if (fetchError.code === '42P01' || fetchError.code === '42703') {
          console.warn('[MT] Erro ao buscar permissões:', fetchError.message);
          return [];
        }
        throw fetchError;
      }

      return (data || []) as MTUserPermission[];
    },
    enabled: !!userData?.mtUserId,
  });

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const userRole = userData?.mtRole ? mapMTRoleToLegacy(userData.mtRole) : null;
  const permissions = permissionsRaw.map(mapMTPermissionToLegacy);

  const isAdmin = useMemo(
    () => ['platform_admin', 'tenant_admin', 'super_admin', 'admin'].includes(userData?.mtRole || ''),
    [userData?.mtRole]
  );

  const isSuperAdmin = useMemo(
    () => ['platform_admin', 'super_admin'].includes(userData?.mtRole || ''),
    [userData?.mtRole]
  );

  // ==========================================================================
  // Permission Check Functions
  // ==========================================================================
  const findPermission = useCallback(
    (module: ModuleName) => {
      return permissions.find(
        (p) =>
          p.modulo_nome === module || p.modulo_nome.toLowerCase() === module.toLowerCase()
      );
    },
    [permissions]
  );

  const canView = useCallback(
    (module: ModuleName): boolean => {
      // Admin tem acesso total
      if (isAdmin) return true;
      const perm = findPermission(module);
      return perm?.can_view ?? false;
    },
    [isAdmin, findPermission]
  );

  const canCreate = useCallback(
    (module: ModuleName): boolean => {
      if (isAdmin) return true;
      const perm = findPermission(module);
      return perm?.can_create ?? false;
    },
    [isAdmin, findPermission]
  );

  const canEdit = useCallback(
    (module: ModuleName): boolean => {
      if (isAdmin) return true;
      const perm = findPermission(module);
      return perm?.can_edit ?? false;
    },
    [isAdmin, findPermission]
  );

  const canDelete = useCallback(
    (module: ModuleName): boolean => {
      if (isAdmin) return true;
      const perm = findPermission(module);
      return perm?.can_delete ?? false;
    },
    [isAdmin, findPermission]
  );

  const hasPermission = useCallback(
    (module: ModuleName, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
      if (isAdmin) return true;

      const perm = findPermission(module);
      if (!perm) return false;

      switch (action) {
        case 'view':
          return perm.can_view;
        case 'create':
          return perm.can_create;
        case 'edit':
          return perm.can_edit;
        case 'delete':
          return perm.can_delete;
        default:
          return false;
      }
    },
    [isAdmin, findPermission]
  );

  return {
    // Estado
    userRole,
    mtRole: userData?.mtRole || null,
    permissions,
    isLoading: isLoadingUser || isLoadingPermissions,
    error: error?.message || null,

    // Funções de verificação
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasPermission,

    // Utilitários
    isAdmin,
    isSuperAdmin,
    isPlatformAdmin: isSuperAdmin,
    isTenantAdmin: userData?.mtRole === 'tenant_admin',
    isFranchiseAdmin: userData?.mtRole === 'franchise_admin',
    refetch,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { AppRole, ModuleName, ModulePermission } from '@/types/user';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getPermissionsMode(): 'mt' {
  return 'mt';
}

export default usePermissionsAdapter;
