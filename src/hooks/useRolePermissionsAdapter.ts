// =============================================================================
// USE ROLE PERMISSIONS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gerenciamento de permissões por role usando tabelas MT
// SISTEMA 100% MT - Usa mt_user_permissions, mt_modules diretamente
//
// =============================================================================

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { AppRole } from '@/types/user';

// =============================================================================
// Types
// =============================================================================

type MTRole = 'platform_admin' | 'tenant_admin' | 'franchise_admin' | 'user';

export interface RolePermission {
  id: string;
  role: AppRole;
  modulo_id: string;
  modulo_nome: string;
  modulo_categoria: string;
  modulo_is_core: boolean;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface MTModule {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  is_core: boolean;
  ordem: number;
}

interface MTRolePermission {
  id: string;
  role: MTRole;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  module?: MTModule;
}

interface PermissionUpdate {
  role: MTRole;
  moduloId: string;
  field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
  value: boolean;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-role-permissions';
const MODULES_QUERY_KEY = 'mt-modules-for-permissions';

// =============================================================================
// Mapper Functions
// =============================================================================

function mapLegacyRoleToMT(legacyRole: AppRole): MTRole {
  const roleMap: Record<string, MTRole> = {
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

function mapMTRoleToLegacy(mtRole: MTRole): AppRole {
  const roleMap: Record<MTRole, AppRole> = {
    platform_admin: 'super_admin',
    tenant_admin: 'admin',
    franchise_admin: 'unidade',
    user: 'unidade',
  };
  return roleMap[mtRole] || 'unidade';
}

function mapMTPermissionToLegacy(perm: MTRolePermission): RolePermission {
  return {
    id: perm.id,
    role: mapMTRoleToLegacy(perm.role),
    modulo_id: perm.module_id,
    modulo_nome: perm.module?.nome || perm.module?.codigo || '',
    modulo_categoria: perm.module?.categoria || 'Outros',
    modulo_is_core: perm.module?.is_core || false,
    can_view: perm.can_view,
    can_create: perm.can_create,
    can_edit: perm.can_edit,
    can_delete: perm.can_delete,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useRolePermissionsAdapter(role: AppRole | null) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  const mtRole = role ? mapLegacyRoleToMT(role) : null;

  // ==========================================================================
  // Query: Buscar Permissões da Role
  // ==========================================================================
  const {
    data: permissionsRaw = [],
    isLoading: isLoadingPermissions,
    error: permissionsError,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, mtRole, tenant?.id],
    queryFn: async (): Promise<MTRolePermission[]> => {
      if (!mtRole) return [];

      // Buscar permissões existentes para a role
      const { data, error } = await supabase
        .from('mt_role_permissions')
        .select(`
          *,
          module:mt_modules(id, codigo, nome, categoria, is_core, ordem)
        `)
        .eq('role', mtRole);

      if (error) {
        // Se tabela não existe, retorna vazio
        if (error.code === '42P01') {
          console.warn('[MT] mt_role_permissions table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as MTRolePermission[];
    },
    enabled: !!mtRole,
  });

  // ==========================================================================
  // Query: Buscar Todos os Módulos
  // ==========================================================================
  const {
    data: modulos = [],
    isLoading: isLoadingModulos,
  } = useQuery({
    queryKey: [MODULES_QUERY_KEY],
    queryFn: async (): Promise<MTModule[]> => {
      const { data, error } = await supabase
        .from('mt_modules')
        .select('id, codigo, nome, categoria, is_core, ordem')
        .eq('is_active', true)
        .order('categoria')
        .order('ordem');

      if (error) {
        if (error.code === '42P01') {
          console.warn('[MT] mt_modules table not found');
          return [];
        }
        throw error;
      }

      return (data || []) as MTModule[];
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Permissão
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async (update: PermissionUpdate) => {
      const { role: targetRole, moduloId, field, value } = update;

      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('mt_role_permissions')
        .select('id')
        .eq('role', targetRole)
        .eq('module_id', moduloId)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('mt_role_permissions')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const newPermission = {
          role: targetRole,
          module_id: moduloId,
          tenant_id: tenant?.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          [field]: value,
        };

        const { error } = await supabase
          .from('mt_role_permissions')
          .insert(newPermission);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, mtRole] });
    },
    onError: (error: Error) => {
      console.error('[MT] Erro ao atualizar permissão:', error);
      toast.error('Erro ao salvar permissão');
    },
  });

  // ==========================================================================
  // Inicializar Permissões para uma Role
  // ==========================================================================
  const initializePermissions = useCallback(
    async (targetLegacyRole: AppRole) => {
      const targetMTRole = mapLegacyRoleToMT(targetLegacyRole);

      for (const modulo of modulos) {
        const { data: existing } = await supabase
          .from('mt_role_permissions')
          .select('id')
          .eq('role', targetMTRole)
          .eq('module_id', modulo.id)
          .maybeSingle();

        if (!existing) {
          // Permissão padrão: platform_admin tem tudo, outros só view
          const isPlatformAdmin = targetMTRole === 'platform_admin';
          await supabase.from('mt_role_permissions').insert({
            role: targetMTRole,
            module_id: modulo.id,
            tenant_id: tenant?.id,
            can_view: true,
            can_create: isPlatformAdmin,
            can_edit: isPlatformAdmin,
            can_delete: isPlatformAdmin,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, targetMTRole] });
    },
    [modulos, tenant?.id, queryClient]
  );

  // ==========================================================================
  // Combinar Módulos com Permissões
  // ==========================================================================
  const permissionsWithModules = useCallback((): RolePermission[] => {
    const permissions = permissionsRaw.map(mapMTPermissionToLegacy);

    return modulos.map((modulo) => {
      const existing = permissions.find((p) => p.modulo_id === modulo.id);
      if (existing) return existing;

      // Retornar permissão padrão (tudo false)
      return {
        id: '',
        role: role!,
        modulo_id: modulo.id,
        modulo_nome: modulo.nome,
        modulo_categoria: modulo.categoria,
        modulo_is_core: modulo.is_core || false,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
  }, [permissionsRaw, modulos, role]);

  // ==========================================================================
  // Agrupar Permissões por Categoria
  // ==========================================================================
  const permissionsByCategory = useCallback((): Record<string, RolePermission[]> => {
    const all = permissionsWithModules();
    return all.reduce(
      (acc, perm) => {
        const cat = perm.modulo_categoria || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
      },
      {} as Record<string, RolePermission[]>
    );
  }, [permissionsWithModules]);

  return {
    permissions: permissionsRaw.map(mapMTPermissionToLegacy),
    permissionsWithModules: permissionsWithModules(),
    permissionsByCategory: permissionsByCategory(),
    modulos,
    isLoading: isLoadingPermissions || isLoadingModulos,
    error: permissionsError,
    refetch,
    updatePermission: (
      moduloId: string,
      field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
      value: boolean
    ) => {
      if (!mtRole) return;
      updateMutation.mutate({ role: mtRole, moduloId, field, value });
    },
    isUpdating: updateMutation.isPending,
    initializePermissions,
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

export function getRolePermissionsMode(): 'mt' {
  return 'mt';
}

export default useRolePermissionsAdapter;
