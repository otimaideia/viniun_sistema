// =============================================================================
// USE MODULOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para módulos usando tabelas mt_modules e mt_tenant_modules
// SISTEMA 100% MT - Sem fallback para legacy
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Modulo, FranqueadoModulo, ModuloCodigo } from '@/types/modulo';

// =============================================================================
// Types
// =============================================================================

export interface ModuloAdaptado extends Modulo {
  tenant_id?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-modules';
const TENANT_MODULES_KEY = 'mt-tenant-modules';

// =============================================================================
// Hook Principal
// =============================================================================

export function useModulosAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Todos os Módulos
  // ==========================================================================
  const modulosQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<ModuloAdaptado[]> => {
      const { data, error } = await supabase
        .from('mt_modules')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('[MT] Erro ao buscar módulos:', error);
        throw error;
      }

      return (data || []).map((m) => ({
        id: m.id,
        codigo: m.codigo as ModuloCodigo,
        nome: m.nome,
        descricao: m.descricao,
        icone: m.icone,
        categoria: m.categoria,
        ordem: m.ordem,
        is_core: m.is_core,
        is_active: m.is_active,
        created_at: m.created_at,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - modules rarely change
  });

  // ==========================================================================
  // Query: Módulos do Tenant Atual
  // ==========================================================================
  const tenantModulosQuery = useQuery({
    queryKey: [TENANT_MODULES_KEY, tenant?.id],
    queryFn: async (): Promise<FranqueadoModulo[]> => {
      if (!tenant) return [];

      const { data, error } = await supabase
        .from('mt_tenant_modules')
        .select(`
          *,
          modulo:mt_modules(*)
        `)
        .eq('tenant_id', tenant.id);

      if (error) {
        console.error('[MT] Erro ao buscar módulos do tenant:', error);
        throw error;
      }

      return (data || []).map((tm) => ({
        id: tm.id,
        franqueado_id: tm.tenant_id, // Map to legacy field name
        modulo_id: tm.module_id,
        is_active: tm.is_active,
        ativado_em: tm.activated_at,
        ativado_por: tm.activated_by,
        created_at: tm.created_at,
        modulo: tm.modulo ? {
          id: tm.modulo.id,
          codigo: tm.modulo.codigo as ModuloCodigo,
          nome: tm.modulo.nome,
          descricao: tm.modulo.descricao,
          icone: tm.modulo.icone,
          categoria: tm.modulo.categoria,
          ordem: tm.modulo.ordem,
          is_core: tm.modulo.is_core,
          is_active: tm.modulo.is_active,
        } : undefined,
      }));
    },
    enabled: !isTenantLoading && !!tenant,
  });

  // ==========================================================================
  // Buscar módulos de uma franquia específica
  // ==========================================================================
  const fetchFranqueadoModulos = async (franqueadoId: string): Promise<FranqueadoModulo[]> => {
    // No sistema MT, franqueados são franchises, e módulos são gerenciados no nível do tenant
    // Para compatibilidade, buscamos os módulos do tenant da franchise
    const { data: franchiseData } = await supabase
      .from('mt_franchises')
      .select('tenant_id')
      .eq('id', franqueadoId)
      .single();

    if (!franchiseData) return [];

    const { data, error } = await supabase
      .from('mt_tenant_modules')
      .select(`
        *,
        modulo:mt_modules(*)
      `)
      .eq('tenant_id', franchiseData.tenant_id);

    if (error) {
      console.error('[MT] Erro ao buscar módulos da franquia:', error);
      return [];
    }

    return (data || []).map((tm) => ({
      id: tm.id,
      franqueado_id: franqueadoId,
      modulo_id: tm.module_id,
      is_active: tm.is_active,
      ativado_em: tm.activated_at,
      ativado_por: tm.activated_by,
      created_at: tm.created_at,
      modulo: tm.modulo ? {
        id: tm.modulo.id,
        codigo: tm.modulo.codigo as ModuloCodigo,
        nome: tm.modulo.nome,
        descricao: tm.modulo.descricao,
        icone: tm.modulo.icone,
        categoria: tm.modulo.categoria,
        ordem: tm.modulo.ordem,
        is_core: tm.modulo.is_core,
        is_active: tm.modulo.is_active,
      } : undefined,
    }));
  };

  // ==========================================================================
  // Mutation: Toggle Módulo para Tenant
  // ==========================================================================
  const toggleModuloMutation = useMutation({
    mutationFn: async ({
      franqueadoId,
      moduloId,
      active,
    }: {
      franqueadoId: string;
      moduloId: string;
      active: boolean;
    }) => {
      // franqueadoId here is actually a tenant_id in MT context
      const tenantId = tenant?.id || franqueadoId;

      // Check if record exists
      const { data: existing } = await supabase
        .from('mt_tenant_modules')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('module_id', moduloId)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('mt_tenant_modules')
          .update({
            is_active: active,
            activated_at: active ? new Date().toISOString() : null,
            activated_by: active ? user?.id : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else if (active) {
        // Insert new
        const { error } = await supabase
          .from('mt_tenant_modules')
          .insert({
            tenant_id: tenantId,
            module_id: moduloId,
            is_active: true,
            activated_by: user?.id,
          });

        if (error) throw error;
      }

      return { error: null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_MODULES_KEY] });
    },
  });

  // ==========================================================================
  // Helper: Verificar se tem módulo
  // ==========================================================================
  const hasModule = (franqueadoId: string, codigo: ModuloCodigo): boolean => {
    const tenantModulos = tenantModulosQuery.data || [];
    return tenantModulos.some(
      (m) => m.modulo?.codigo === codigo && m.is_active
    );
  };

  // ==========================================================================
  // Helper: Obter módulos ativos
  // ==========================================================================
  const getActiveModulos = (franqueadoId: string): ModuloCodigo[] => {
    const tenantModulos = tenantModulosQuery.data || [];
    return tenantModulos
      .filter((m) => m.is_active && m.modulo?.codigo)
      .map((m) => m.modulo!.codigo);
  };

  // ==========================================================================
  // Return
  // ==========================================================================
  return {
    modulos: modulosQuery.data || [],
    franqueadoModulos: tenantModulosQuery.data || [],
    loading: modulosQuery.isLoading || tenantModulosQuery.isLoading || isTenantLoading,
    error: modulosQuery.error?.message || tenantModulosQuery.error?.message || null,
    refetch: () => {
      modulosQuery.refetch();
      tenantModulosQuery.refetch();
    },
    fetchModulos: modulosQuery.refetch,
    fetchFranqueadoModulos,
    toggleModulo: (franqueadoId: string, moduloId: string, active: boolean) =>
      toggleModuloMutation.mutateAsync({ franqueadoId, moduloId, active }),
    toggleModuloFranqueado: (franqueadoId: string, moduloId: string, active: boolean) =>
      toggleModuloMutation.mutateAsync({ franqueadoId, moduloId, active }),
    hasModule,
    getActiveModulos,

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

export function getModulosMode(): 'mt' {
  return 'mt';
}

export default useModulosAdapter;
