import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from '@/types/user';

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

interface PermissionUpdate {
  role: AppRole;
  moduloId: string;
  field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
  value: boolean;
}

export function useRolePermissions(role: AppRole | null) {
  const queryClient = useQueryClient();

  // Buscar permissões para a role selecionada
  const query = useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async (): Promise<RolePermission[]> => {
      if (!role) return [];

      const { data, error } = await supabase
        .from('mt_role_permissions')
        .select(`
          id,
          role,
          modulo_id,
          can_view,
          can_create,
          can_edit,
          can_delete,
          mt_modules!inner (
            nome,
            categoria,
            is_core
          )
        `)
        .eq('role', role);

      if (error) {
        console.error('Erro ao buscar permissões:', error);
        throw error;
      }

      // Mapear para formato esperado
      return (data || []).map((p: any) => ({
        id: p.id,
        role: p.role,
        modulo_id: p.modulo_id,
        modulo_nome: p.mt_modules.nome,
        modulo_categoria: p.mt_modules.categoria,
        modulo_is_core: p.mt_modules.is_core || false,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      }));
    },
    enabled: !!role,
  });

  // Buscar todos os módulos para garantir que todas permissões existam
  const modulosQuery = useQuery({
    queryKey: ['modulos-for-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_modules')
        .select('id, nome, categoria, is_core')
        .order('categoria')
        .order('ordem');

      if (error) throw error;
      return data || [];
    },
  });

  // Atualizar permissão individual
  const updateMutation = useMutation({
    mutationFn: async (update: PermissionUpdate) => {
      const { role, moduloId, field, value } = update;

      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('mt_role_permissions')
        .select('id')
        .eq('role', role)
        .eq('modulo_id', moduloId)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('mt_role_permissions')
          .update({ [field]: value })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo registro
        const newPermission = {
          role,
          modulo_id: moduloId,
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
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar permissão:', error);
      toast.error('Erro ao salvar permissão');
    },
  });

  // Inicializar permissões para uma role (criar registros para todos os módulos)
  const initializePermissions = useCallback(async (targetRole: AppRole) => {
    const modulos = modulosQuery.data || [];

    for (const modulo of modulos) {
      const { data: existing } = await supabase
        .from('mt_role_permissions')
        .select('id')
        .eq('role', targetRole)
        .eq('modulo_id', modulo.id)
        .maybeSingle();

      if (!existing) {
        // Permissão padrão: super_admin tem tudo, outros só view
        const isSuperAdmin = targetRole === 'super_admin';
        await supabase.from('mt_role_permissions').insert({
          role: targetRole,
          modulo_id: modulo.id,
          can_view: true,
          can_create: isSuperAdmin,
          can_edit: isSuperAdmin,
          can_delete: isSuperAdmin,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['role-permissions', targetRole] });
  }, [modulosQuery.data, queryClient]);

  // Combinar módulos com permissões (para mostrar todos os módulos, mesmo sem permissão cadastrada)
  const permissionsWithModules = useCallback((): RolePermission[] => {
    const permissions = query.data || [];
    const modulos = modulosQuery.data || [];

    return modulos.map(modulo => {
      const existing = permissions.find(p => p.modulo_id === modulo.id);
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
  }, [query.data, modulosQuery.data, role]);

  // Agrupar permissões por categoria
  const permissionsByCategory = useCallback((): Record<string, RolePermission[]> => {
    const all = permissionsWithModules();
    return all.reduce((acc, perm) => {
      const cat = perm.modulo_categoria || 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    }, {} as Record<string, RolePermission[]>);
  }, [permissionsWithModules]);

  return {
    permissions: query.data || [],
    permissionsWithModules: permissionsWithModules(),
    permissionsByCategory: permissionsByCategory(),
    modulos: modulosQuery.data || [],
    isLoading: query.isLoading || modulosQuery.isLoading,
    error: query.error || modulosQuery.error,
    refetch: query.refetch,
    updatePermission: (moduloId: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) => {
      if (!role) return;
      updateMutation.mutate({ role, moduloId, field, value });
    },
    isUpdating: updateMutation.isPending,
    initializePermissions,
  };
}

export default useRolePermissions;
