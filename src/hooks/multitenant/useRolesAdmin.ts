import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

export interface Role {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  nivel: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  module_id?: string;
  categoria: string;
  tipo: string;
  ordem: number;
  module?: {
    codigo: string;
    nome: string;
    categoria: string;
  };
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  restrictions?: Record<string, unknown>;
  permission?: Permission;
}

export interface CreateRoleData {
  codigo: string;
  nome: string;
  descricao?: string;
  nivel: number;
}

export interface UpdateRoleData {
  nome?: string;
  descricao?: string;
  nivel?: number;
}

// =============================================================================
// HOOK: useRoles - Lista e gerencia roles
// =============================================================================

export function useRoles() {
  const { tenant, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  // Buscar todos os roles
  const query = useQuery({
    queryKey: ['mt-roles', tenant?.id, accessLevel],
    queryFn: async () => {
      let q = supabase
        .from('mt_roles')
        .select('*');

      // Platform admin sees all roles; others see only their tenant's + system roles
      if (accessLevel === 'tenant' && tenant) {
        q = q.or(`tenant_id.eq.${tenant.id},tenant_id.is.null`);
      } else if (accessLevel === 'franchise' && tenant) {
        q = q.or(`tenant_id.eq.${tenant.id},tenant_id.is.null`);
      }

      const { data, error } = await q.order('nivel', { ascending: true });

      if (error) throw error;
      return data as Role[];
    },
    enabled: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
  });

  // Criar role
  const createRole = useMutation({
    mutationFn: async (data: CreateRoleData) => {
      const { data: newRole, error } = await supabase
        .from('mt_roles')
        .insert({
          ...data,
          is_system: false,
          tenant_id: tenant?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newRole as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-roles'] });
      toast.success('Cargo criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar cargo: ${error.message}`);
    },
  });

  // Atualizar role
  const updateRole = useMutation({
    mutationFn: async ({ id, ...data }: UpdateRoleData & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('mt_roles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-roles'] });
      toast.success('Cargo atualizado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cargo: ${error.message}`);
    },
  });

  // Deletar role (apenas não-system)
  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro remover permissões associadas
      await supabase
        .from('mt_role_permissions')
        .delete()
        .eq('role_id', id);

      // Depois remover o role
      const { error } = await supabase
        .from('mt_roles')
        .delete()
        .eq('id', id)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-roles'] });
      toast.success('Cargo removido com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao remover cargo: ${error.message}`);
    },
  });

  return {
    roles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createRole,
    updateRole,
    deleteRole,
  };
}

// =============================================================================
// HOOK: usePermissions - Lista todas as permissões
// =============================================================================

export function usePermissionsList() {
  const { accessLevel } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-permissions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_permissions')
        .select(`
          *,
          module:mt_modules (
            codigo,
            nome,
            categoria
          )
        `)
        .order('module_id')
        .order('ordem');

      if (error) throw error;
      return data as Permission[];
    },
    enabled: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
  });

  // Agrupar permissões por módulo
  const permissionsByModule = query.data?.reduce((acc, perm) => {
    const moduleCode = perm.module?.codigo || 'outros';
    const moduleName = perm.module?.nome || 'Outros';

    if (!acc[moduleCode]) {
      acc[moduleCode] = {
        code: moduleCode,
        name: moduleName,
        category: perm.module?.categoria || 'sistema',
        permissions: [],
      };
    }

    acc[moduleCode].permissions.push(perm);
    return acc;
  }, {} as Record<string, { code: string; name: string; category: string; permissions: Permission[] }>);

  return {
    permissions: query.data || [],
    permissionsByModule: permissionsByModule || {},
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// HOOK: useRolePermissions - Gerencia permissões de um role específico
// =============================================================================

// Helper: Log de audit para mudanças de permissão de role
async function logRolePermissionAudit(
  roleId: string,
  permissionId: string,
  oldGranted: boolean | null,
  newGranted: boolean,
  action: string
) {
  try {
    await supabase.from('mt_audit_logs').insert({
      action: `role_permission.${action}`,
      resource_type: 'role_permission',
      resource_id: roleId,
      resource_name: `permission:${permissionId}`,
      old_data: oldGranted !== null ? { granted: oldGranted } : null,
      new_data: { granted: newGranted },
      changed_fields: ['granted'],
    });
  } catch (err) {
    console.warn('[Audit] Erro ao registrar log de permissão de role:', err);
  }
}

export function useRolePermissions(roleId: string | null) {
  const queryClient = useQueryClient();

  // Buscar permissões do role
  const query = useQuery({
    queryKey: ['mt-role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from('mt_role_permissions')
        .select(`
          *,
          permission:mt_permissions (
            id,
            codigo,
            nome,
            descricao,
            categoria,
            module:mt_modules (
              codigo,
              nome
            )
          )
        `)
        .eq('role_id', roleId);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!roleId,
  });

  // Map de permissões concedidas para acesso rápido
  const grantedPermissions = new Set(
    query.data?.filter(rp => rp.granted).map(rp => rp.permission_id) || []
  );

  // Toggle permissão
  const togglePermission = useMutation({
    mutationFn: async ({ permissionId, granted }: { permissionId: string; granted: boolean }) => {
      if (!roleId) throw new Error('Role ID não definido');

      // Verificar se já existe
      const existing = query.data?.find(rp => rp.permission_id === permissionId);

      if (existing) {
        await logRolePermissionAudit(roleId, permissionId, existing.granted, granted, 'update');
        const { error } = await supabase
          .from('mt_role_permissions')
          .update({ granted, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        await logRolePermissionAudit(roleId, permissionId, null, granted, 'create');
        const { error } = await supabase
          .from('mt_role_permissions')
          .insert({
            role_id: roleId,
            permission_id: permissionId,
            granted,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-role-permissions', roleId] });
    },
    onError: (error) => {
      toast.error(`Erro ao alterar permissão: ${error.message}`);
    },
  });

  // Conceder todas as permissões de um módulo
  const grantAllModule = useMutation({
    mutationFn: async (modulePermissionIds: string[]) => {
      if (!roleId) throw new Error('Role ID não definido');

      for (const permissionId of modulePermissionIds) {
        const existing = query.data?.find(rp => rp.permission_id === permissionId);

        if (existing) {
          if (!existing.granted) {
            await logRolePermissionAudit(roleId, permissionId, false, true, 'grant_all');
          }
          await supabase
            .from('mt_role_permissions')
            .update({ granted: true, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await logRolePermissionAudit(roleId, permissionId, null, true, 'grant_all');
          await supabase
            .from('mt_role_permissions')
            .insert({
              role_id: roleId,
              permission_id: permissionId,
              granted: true,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-role-permissions', roleId] });
      toast.success('Permissões concedidas');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Revogar todas as permissões de um módulo
  const revokeAllModule = useMutation({
    mutationFn: async (modulePermissionIds: string[]) => {
      if (!roleId) throw new Error('Role ID não definido');

      for (const permissionId of modulePermissionIds) {
        const existing = query.data?.find(rp => rp.permission_id === permissionId);

        if (existing) {
          if (existing.granted) {
            await logRolePermissionAudit(roleId, permissionId, true, false, 'revoke_all');
          }
          await supabase
            .from('mt_role_permissions')
            .update({ granted: false, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await logRolePermissionAudit(roleId, permissionId, null, false, 'revoke_all');
          await supabase
            .from('mt_role_permissions')
            .insert({
              role_id: roleId,
              permission_id: permissionId,
              granted: false,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-role-permissions', roleId] });
      toast.success('Permissões revogadas');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Verificar se uma permissão está concedida
  const isGranted = (permissionId: string) => grantedPermissions.has(permissionId);

  return {
    rolePermissions: query.data || [],
    grantedPermissions,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    togglePermission,
    grantAllModule,
    revokeAllModule,
    isGranted,
  };
}

// =============================================================================
// HOOK: useUserRolesAdmin - Gerencia roles de um usuário
// =============================================================================

export function useUserRolesAdmin(userId: string | null) {
  const queryClient = useQueryClient();

  // Buscar roles do usuário
  const query = useQuery({
    queryKey: ['mt-user-roles-admin', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('mt_user_roles')
        .select(`
          *,
          role:mt_roles (
            id,
            codigo,
            nome,
            nivel
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Atribuir role a usuário
  const assignRole = useMutation({
    mutationFn: async ({ roleId, validFrom, validUntil }: {
      roleId: string;
      validFrom?: string;
      validUntil?: string;
    }) => {
      if (!userId) throw new Error('User ID não definido');

      const { data, error } = await supabase
        .from('mt_user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          valid_from: validFrom,
          valid_until: validUntil,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-user-roles-admin', userId] });
      toast.success('Cargo atribuído com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atribuir cargo: ${error.message}`);
    },
  });

  // Remover role de usuário
  const removeRole = useMutation({
    mutationFn: async (userRoleId: string) => {
      const { error } = await supabase
        .from('mt_user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-user-roles-admin', userId] });
      toast.success('Cargo removido com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao remover cargo: ${error.message}`);
    },
  });

  return {
    userRoles: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    assignRole,
    removeRole,
  };
}

export default useRoles;
