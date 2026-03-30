import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Tenant,
  Branding,
  Franchise,
  MTUser,
  Module,
  AccessLevel,
  TenantContextType,
} from '@/types/multitenant';

// =============================================================================
// TENANT CONTEXT
// Gerencia o estado do tenant atual, franquia, usuário e módulos
// =============================================================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { user: authUser } = useAuth();

  // Estado principal
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [user, setUser] = useState<MTUser | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('user');

  // Estado de loading/erro
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Carregar dados do usuário multi-tenant
  const loadMTUser = useCallback(async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('mt_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .in('status', ['ativo', 'pendente'])
        .single();

      if (error) {
        // Usuário não existe no sistema MT ainda - pode ser migração pendente
        console.warn('Usuário MT não encontrado:', error.message);
        return null;
      }

      return data as MTUser;
    } catch (err) {
      console.error('Erro ao carregar usuário MT:', err);
      return null;
    }
  }, []);

  // Carregar tenant
  const loadTenant = useCallback(async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('id', tenantId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Tenant;
    } catch (err) {
      console.error('Erro ao carregar tenant:', err);
      return null;
    }
  }, []);

  // Carregar branding
  const loadBranding = useCallback(async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('mt_tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        // Branding pode não existir ainda
        console.warn('Branding não encontrado:', error.message);
        return null;
      }

      return data as Branding;
    } catch (err) {
      console.error('Erro ao carregar branding:', err);
      return null;
    }
  }, []);

  // Carregar franquias do tenant
  const loadFranchises = useCallback(async (tenantId: string, userFranchiseId?: string) => {
    try {
      let query = supabase
        .from('mt_franchises')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('nome');

      // Se usuário está vinculado a uma franquia específica, filtrar
      if (userFranchiseId) {
        query = query.eq('id', userFranchiseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Franchise[];
    } catch (err) {
      console.error('Erro ao carregar franquias:', err);
      return [];
    }
  }, []);

  // Carregar módulos habilitados
  const loadModules = useCallback(async (tenantId: string, franchiseId?: string) => {
    try {
      // Carregar módulos do tenant
      const { data: tenantModules, error: tmError } = await supabase
        .from('mt_tenant_modules')
        .select(`
          is_active,
          limits,
          module:mt_modules (
            id,
            codigo,
            nome,
            descricao,
            icone,
            categoria,
            ordem,
            is_core,
            is_active
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (tmError) throw tmError;

      // Mapear módulos com status do tenant
      interface TenantModuleRow {
        is_active: boolean;
        limits: Record<string, unknown> | null;
        module: Module | null;
      }

      const modulesWithStatus = (tenantModules as TenantModuleRow[] || [])
        .filter((tm) => tm.module)
        .map((tm) => ({
          ...tm.module,
          tenant_is_active: tm.is_active,
          tenant_limits: tm.limits,
        })) as Module[];

      // Se tem franquia, verificar módulos da franquia também
      if (franchiseId) {
        const { data: franchiseModules } = await supabase
          .from('mt_franchise_modules')
          .select('module_id, is_active')
          .eq('franchise_id', franchiseId);

        // Filtrar apenas módulos ativos na franquia
        interface FranchiseModuleRow {
          module_id: string;
          is_active: boolean;
        }

        const franchiseModuleIds = new Set(
          (franchiseModules as FranchiseModuleRow[] || [])
            .filter((fm) => fm.is_active)
            .map((fm) => fm.module_id)
        );

        // Se franquia tem módulos configurados, filtrar
        if (franchiseModuleIds.size > 0) {
          return modulesWithStatus.filter(m => franchiseModuleIds.has(m.id));
        }
      }

      return modulesWithStatus;
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
      return [];
    }
  }, []);

  // Determinar nível de acesso
  const determineAccessLevel = useCallback(async (mtUser: MTUser): Promise<AccessLevel> => {
    try {
      // Verificar roles do usuário
      const { data: userRoles } = await supabase
        .from('mt_user_roles')
        .select(`
          role:mt_roles (
            codigo,
            nivel
          )
        `)
        .eq('user_id', mtUser.id)
        .eq('is_active', true);

      if (userRoles && userRoles.length > 0) {
        interface RoleData {
          codigo: string;
          nivel: number;
        }

        interface UserRoleRow {
          role: RoleData | null;
        }

        const roles = (userRoles as UserRoleRow[])
          .map((ur) => ur.role)
          .filter((r): r is RoleData => r !== null);

        // Verificar por nível (1=platform, 2=tenant, 3=franchise)
        const minLevel = Math.min(...roles.map((r) => r.nivel || 100));
        if (minLevel === 1) {
          return 'platform';
        }
        if (minLevel === 2) {
          return 'tenant';
        }
        if (minLevel === 3) {
          return 'franchise';
        }

        // Fallback: verificar por códigos conhecidos
        if (roles.some((r) => ['super_admin', 'platform_admin'].includes(r.codigo))) {
          return 'platform';
        }
        if (roles.some((r) => ['admin', 'tenant_admin', 'tenant_owner', 'tenant_manager'].includes(r.codigo))) {
          return 'tenant';
        }
        if (roles.some((r) => ['franchise_admin', 'franchise_manager', 'franqueado'].includes(r.codigo))) {
          return 'franchise';
        }
      }

      // Fallback para access_level do usuário
      // Mapear valores do banco para AccessLevel válido
      const accessLevelMap: Record<string, AccessLevel> = {
        'platform_admin': 'platform',
        'platform': 'platform',
        'tenant_admin': 'tenant',
        'tenant': 'tenant',
        'franchise_admin': 'franchise',
        'franchise': 'franchise',
        'user': 'user',
      };
      return accessLevelMap[mtUser.access_level] || 'user';
    } catch (err) {
      console.error('Erro ao determinar nível de acesso:', err);
      return 'user';
    }
  }, []);

  // Carregar todos os dados iniciais
  const loadInitialData = useCallback(async () => {
    if (!authUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Carregar usuário MT
      const mtUser = await loadMTUser(authUser.id);

      if (!mtUser) {
        // Usuário não está no sistema MT - pode usar sistema legado
        setIsLoading(false);
        return;
      }

      setUser(mtUser);

      // 2. Determinar nível de acesso
      const level = await determineAccessLevel(mtUser);
      setAccessLevel(level);

      // 3. Carregar tenant
      // Para platform admins, verificar se há um tenant salvo no localStorage
      let tenantIdToLoad = mtUser.tenant_id;
      if (level === 'platform') {
        const savedTenantId = localStorage.getItem('MT_SELECTED_TENANT_ID');
        if (savedTenantId) {
          tenantIdToLoad = savedTenantId;
        }
      }

      const tenantData = await loadTenant(tenantIdToLoad);
      if (tenantData) {
        setTenant(tenantData);

        // 4. Carregar branding
        const brandingData = await loadBranding(tenantData.id);
        setBranding(brandingData);

        // 5. Carregar franquias
        const franchisesData = await loadFranchises(
          tenantData.id,
          level === 'franchise' ? mtUser.franchise_id || undefined : undefined
        );
        setFranchises(franchisesData);

        // Definir franquia atual se usuário está vinculado a uma
        if (mtUser.franchise_id) {
          const userFranchise = franchisesData.find(f => f.id === mtUser.franchise_id);
          setFranchise(userFranchise || null);
        }

        // 6. Carregar módulos
        const modulesData = await loadModules(tenantData.id, mtUser.franchise_id || undefined);
        setModules(modulesData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do tenant:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [
    authUser?.id,
    loadMTUser,
    loadTenant,
    loadBranding,
    loadFranchises,
    loadModules,
    determineAccessLevel,
  ]);

  // Selecionar franquia
  const selectFranchise = useCallback((franchiseId: string | null) => {
    if (!franchiseId) {
      setFranchise(null);
      return;
    }

    const selectedFranchise = franchises.find(f => f.id === franchiseId);
    setFranchise(selectedFranchise || null);

    // Recarregar módulos para a franquia selecionada
    if (tenant?.id) {
      loadModules(tenant.id, franchiseId).then(setModules);
    }
  }, [franchises, tenant?.id, loadModules]);

  // Selecionar tenant (apenas para platform admins)
  const selectTenant = useCallback(async (tenantId: string) => {
    // Apenas platform admins podem trocar de tenant
    if (accessLevel !== 'platform') {
      console.warn('Apenas platform admins podem trocar de tenant');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Carregar novo tenant
      const tenantData = await loadTenant(tenantId);
      if (!tenantData) {
        throw new Error('Tenant não encontrado');
      }
      setTenant(tenantData);

      // 2. Carregar branding do novo tenant
      const brandingData = await loadBranding(tenantId);
      setBranding(brandingData);

      // 3. Carregar franquias do novo tenant
      const franchisesData = await loadFranchises(tenantId);
      setFranchises(franchisesData);

      // 4. Limpar franquia selecionada (novo tenant = sem franquia selecionada)
      setFranchise(null);

      // 5. Carregar módulos do novo tenant
      const modulesData = await loadModules(tenantId);
      setModules(modulesData);

      // 6. Salvar tenant selecionado no localStorage para persistência
      localStorage.setItem('MT_SELECTED_TENANT_ID', tenantId);

    } catch (err) {
      console.error('Erro ao trocar de tenant:', err);
      setError(err instanceof Error ? err : new Error('Erro ao trocar de tenant'));
    } finally {
      setIsLoading(false);
    }
  }, [accessLevel, loadTenant, loadBranding, loadFranchises, loadModules]);

  // Refresh funções
  const refreshTenant = useCallback(async () => {
    if (user?.tenant_id) {
      const tenantData = await loadTenant(user.tenant_id);
      if (tenantData) {
        setTenant(tenantData);
      }
    }
  }, [user?.tenant_id, loadTenant]);

  const refreshBranding = useCallback(async () => {
    if (tenant?.id) {
      const brandingData = await loadBranding(tenant.id);
      setBranding(brandingData);
    }
  }, [tenant?.id, loadBranding]);

  // Effect para carregar dados quando authUser mudar
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Valor do contexto
  const value: TenantContextType = {
    tenant,
    branding,
    franchise,
    franchises,
    user,
    accessLevel,
    modules,
    isLoading,
    error,
    selectTenant,
    selectFranchise,
    refreshTenant,
    refreshBranding,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// Hook para usar o contexto
export function useTenantContext(): TenantContextType {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error('useTenantContext deve ser usado dentro de um TenantProvider');
  }

  return context;
}

// Hook simplificado para tenant
export function useTenant() {
  const { tenant, isLoading, error, refreshTenant } = useTenantContext();

  return {
    tenant,
    isLoading,
    error,
    refetch: refreshTenant,
  };
}

// Hook simplificado para franquia
export function useFranchise() {
  const { franchise, franchises, isLoading, error, selectFranchise } = useTenantContext();

  return {
    franchise,
    franchises,
    isLoading,
    error,
    selectFranchise,
    refetch: async () => {}, // TODO: Implementar refresh de franquias
  };
}

// Hook simplificado para módulos
export function useModules() {
  const { modules, isLoading } = useTenantContext();

  const hasModule = useCallback((codigo: string) => {
    return modules.some(m => m.codigo === codigo);
  }, [modules]);

  const isModuleActive = useCallback((codigo: string) => {
    const module = modules.find(m => m.codigo === codigo);
    return module?.is_active && module?.tenant_is_active;
  }, [modules]);

  const getModule = useCallback((codigo: string) => {
    return modules.find(m => m.codigo === codigo);
  }, [modules]);

  return {
    modules,
    isLoading,
    hasModule,
    isModuleActive,
    getModule,
  };
}

// Hook para verificar acesso
export function useAccessLevel() {
  const { accessLevel, user } = useTenantContext();

  const isPlatformAdmin = accessLevel === 'platform';
  const isTenantAdmin = accessLevel === 'tenant' || isPlatformAdmin;
  const isFranchiseAdmin = accessLevel === 'franchise' || isTenantAdmin;

  return {
    accessLevel,
    user,
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
  };
}

export default TenantContext;
