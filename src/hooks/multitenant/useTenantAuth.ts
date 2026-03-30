import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant, MTUser, Branding } from '@/types/multitenant';

const IS_LOCAL_AUTH = import.meta.env.VITE_LOCAL_AUTH === 'true';

// =============================================================================
// HOOK: useTenantAuth
// Gerencia autenticação com detecção e validação de tenant
// =============================================================================

interface TenantAuthState {
  // Tenant detectado
  detectedTenant: Tenant | null;
  detectedBranding: Branding | null;
  detectionMethod: 'subdomain' | 'custom_domain' | 'query_param' | 'path' | 'default' | null;

  // Usuário MT após login
  mtUser: MTUser | null;

  // Estado
  isDetecting: boolean;
  isLoggingIn: boolean;
  isValidating: boolean;
  error: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresTenantSelection?: boolean;
  availableTenants?: Tenant[];
  mtUser?: MTUser;
}

interface TenantAuthReturn extends TenantAuthState {
  // Ações
  detectTenant: () => Promise<Tenant | null>;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithTenant: (email: string, password: string, tenantId: string) => Promise<LoginResult>;
  validateUserTenant: (authUserId: string) => Promise<MTUser | null>;
  setSessionContext: (userId: string, tenantId: string, franchiseId?: string | null, accessLevel?: string) => Promise<boolean>;
  clearError: () => void;
}

// Domínios de desenvolvimento
const DEV_DOMAINS = ['localhost', '127.0.0.1', '192.168.'];

function isDevelopment(): boolean {
  return DEV_DOMAINS.some(dev => window.location.hostname.includes(dev));
}

function extractSubdomain(): string | null {
  const hostname = window.location.hostname;
  if (isDevelopment()) return null;

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();
    if (subdomain === 'www' && parts.length >= 4) {
      return parts[1].toLowerCase();
    }
    return subdomain;
  }
  return null;
}

function getTenantFromQueryParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tenant');
}

function getTenantFromPath(): string | null {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  // Verificar se o primeiro segmento do path é um tenant
  if (pathParts.length > 0 && pathParts[0] !== 'login' && pathParts[0] !== 'registro') {
    return pathParts[0];
  }
  return null;
}

export function useTenantAuth(): TenantAuthReturn {
  const { login: authLogin } = useAuth();
  const [state, setState] = useState<TenantAuthState>({
    detectedTenant: null,
    detectedBranding: null,
    detectionMethod: null,
    mtUser: null,
    isDetecting: true,
    isLoggingIn: false,
    isValidating: false,
    error: null,
  });

  // Detectar tenant baseado na URL
  const detectTenant = useCallback(async (): Promise<Tenant | null> => {
    setState(prev => ({ ...prev, isDetecting: true, error: null }));

    try {
      // 1. Buscar todos os mapeamentos de tenant
      const { data: tenants, error: tenantsError } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('is_active', true);

      if (tenantsError) throw tenantsError;

      // Criar mapas para busca rápida
      const subdomainMap = new Map<string, Tenant>();
      const customDomainMap = new Map<string, Tenant>();
      const slugMap = new Map<string, Tenant>();

      tenants?.forEach((tenant: Tenant) => {
        if (tenant.subdominio) {
          subdomainMap.set(tenant.subdominio.toLowerCase(), tenant);
        }
        if (tenant.dominio_customizado) {
          customDomainMap.set(tenant.dominio_customizado.toLowerCase(), tenant);
        }
        slugMap.set(tenant.slug.toLowerCase(), tenant);
      });

      let detectedTenant: Tenant | null = null;
      let method: TenantAuthState['detectionMethod'] = null;

      // 2. Em produção: verificar domínio customizado ou subdomínio
      if (!isDevelopment()) {
        const fullHostname = window.location.hostname.toLowerCase();

        // Primeiro, verificar domínio customizado
        if (customDomainMap.has(fullHostname)) {
          detectedTenant = customDomainMap.get(fullHostname) || null;
          method = 'custom_domain';
        }

        // Se não encontrou, verificar subdomínio
        if (!detectedTenant) {
          const subdomain = extractSubdomain();
          if (subdomain) {
            detectedTenant = subdomainMap.get(subdomain) || slugMap.get(subdomain) || null;
            if (detectedTenant) method = 'subdomain';
          }
        }
      } else {
        // 3. Em desenvolvimento: verificar query param ou path
        const queryTenant = getTenantFromQueryParam();
        if (queryTenant) {
          detectedTenant = slugMap.get(queryTenant.toLowerCase()) || null;
          if (detectedTenant) method = 'query_param';
        }

        if (!detectedTenant) {
          const pathTenant = getTenantFromPath();
          if (pathTenant) {
            detectedTenant = slugMap.get(pathTenant.toLowerCase()) || null;
            if (detectedTenant) method = 'path';
          }
        }
      }

      // 4. Fallback para tenant padrão (adminviniun/plataforma)
      if (!detectedTenant) {
        detectedTenant = slugMap.get('adminviniun') || tenants?.[0] || null;
        method = 'default';
      }

      // 5. Carregar branding do tenant
      let branding: Branding | null = null;
      if (detectedTenant) {
        const { data: brandingData } = await supabase
          .from('mt_tenant_branding')
          .select('*')
          .eq('tenant_id', detectedTenant.id)
          .single();

        branding = brandingData as Branding;
      }

      setState(prev => ({
        ...prev,
        detectedTenant,
        detectedBranding: branding,
        detectionMethod: method,
        isDetecting: false,
      }));

      return detectedTenant;
    } catch (err) {
      console.error('Erro ao detectar tenant:', err);
      setState(prev => ({
        ...prev,
        isDetecting: false,
        error: 'Erro ao detectar empresa',
      }));
      return null;
    }
  }, []);

  // Validar se usuário existe no tenant
  const validateUserTenant = useCallback(async (authUserId: string): Promise<MTUser | null> => {
    setState(prev => ({ ...prev, isValidating: true }));

    try {
      // Buscar usuário MT pelo auth_user_id (permite ativo e pendente)
      const { data: mtUsers, error } = await supabase
        .from('mt_users')
        .select('*, tenant:mt_tenants(id, slug, nome_fantasia)')
        .eq('auth_user_id', authUserId)
        .in('status', ['ativo', 'pendente']);

      if (error) throw error;

      if (!mtUsers || mtUsers.length === 0) {
        // Verificar se existe mas está inativo
        const { data: inactiveUsers } = await supabase
          .from('mt_users')
          .select('id, status')
          .eq('auth_user_id', authUserId)
          .eq('status', 'inativo');

        if (inactiveUsers && inactiveUsers.length > 0) {
          setState(prev => ({
            ...prev,
            isValidating: false,
            error: 'Sua conta foi desativada. Contate o administrador.',
          }));
          return null;
        }

        // Usuário não existe no sistema MT
        setState(prev => ({
          ...prev,
          isValidating: false,
          error: 'Usuário não cadastrado no sistema',
        }));
        return null;
      }

      // Se usuário existe em apenas um tenant
      if (mtUsers.length === 1) {
        const mtUser = mtUsers[0] as MTUser;
        setState(prev => ({
          ...prev,
          mtUser,
          isValidating: false,
        }));
        return mtUser;
      }

      // Se usuário existe em múltiplos tenants, verificar se o tenant detectado está na lista
      const { detectedTenant } = state;
      if (detectedTenant) {
        const matchingUser = mtUsers.find((u: any) => u.tenant_id === detectedTenant.id);
        if (matchingUser) {
          setState(prev => ({
            ...prev,
            mtUser: matchingUser as MTUser,
            isValidating: false,
          }));
          return matchingUser as MTUser;
        }
      }

      // Usuário existe em múltiplos tenants e nenhum corresponde ao detectado
      // Retornar o primeiro (ou poderia pedir seleção)
      const mtUser = mtUsers[0] as MTUser;
      setState(prev => ({
        ...prev,
        mtUser,
        isValidating: false,
      }));
      return mtUser;
    } catch (err) {
      console.error('Erro ao validar usuário:', err);
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: 'Erro ao validar usuário',
      }));
      return null;
    }
  }, [state.detectedTenant]);

  // Configurar contexto da sessão no banco (para RLS)
  const setSessionContext = useCallback(async (
    userId: string,
    tenantId: string,
    franchiseId?: string | null,
    accessLevel?: string
  ): Promise<boolean> => {
    try {
      // Chamar função RPC para configurar contexto da sessão
      const { error } = await supabase.rpc('set_session_context', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_franchise_id: franchiseId || null,
        p_access_level: accessLevel || 'user',
      });

      if (error) {
        console.warn('Erro ao configurar contexto da sessão:', error);
        // Não bloquear login se falhar - RLS pode usar JWT claims como fallback
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao configurar contexto:', err);
      return false;
    }
  }, []);

  // Login com validação de tenant
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setState(prev => ({ ...prev, isLoggingIn: true, error: null }));

    try {
      let authUserId: string;

      if (IS_LOCAL_AUTH) {
        // Local auth: use AuthContext login (calls local_auth_login RPC)
        const authResult = await authLogin(email, password);
        if (!authResult.success) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: authResult.error || 'Email não encontrado',
          }));
          return { success: false, error: authResult.error || 'Email não encontrado' };
        }

        // Get user_id from local_auth_login RPC
        const { data: rpcData } = await supabase.rpc('local_auth_login', { p_email: email.trim() });
        authUserId = rpcData?.[0]?.user_id;

        if (!authUserId) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: 'Erro ao obter dados do usuário',
          }));
          return { success: false, error: 'Erro ao obter dados do usuário' };
        }
      } else {
        // Remote auth: Supabase GoTrue
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: authError.message,
          }));
          return { success: false, error: authError.message };
        }

        if (!authData.user) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: 'Erro ao obter dados do usuário',
          }));
          return { success: false, error: 'Erro ao obter dados do usuário' };
        }

        authUserId = authData.user.id;
      }

      // 2. Validar usuário no sistema MT
      const mtUser = await validateUserTenant(authUserId);

      if (!mtUser) {
        // Fazer logout se usuário não existe no MT
        if (!IS_LOCAL_AUTH) await supabase.auth.signOut();
        setState(prev => ({
          ...prev,
          isLoggingIn: false,
          error: 'Usuário não tem acesso a este sistema',
        }));
        return { success: false, error: 'Usuário não tem acesso a este sistema' };
      }

      // 3. Verificar se usuário pertence ao tenant detectado
      const { detectedTenant } = state;
      if (detectedTenant && mtUser.tenant_id !== detectedTenant.id) {
        // Buscar tenants do usuário para possível seleção
        const { data: userTenants } = await supabase
          .from('mt_users')
          .select('tenant:mt_tenants(*)')
          .eq('auth_user_id', authUserId)
          .in('status', ['ativo', 'pendente']);

        const tenants = userTenants?.map((u: any) => u.tenant).filter(Boolean) || [];

        if (tenants.length > 1) {
          // Usuário tem acesso a múltiplos tenants - pode pedir seleção
          setState(prev => ({ ...prev, isLoggingIn: false }));
          return {
            success: false,
            requiresTenantSelection: true,
            availableTenants: tenants as Tenant[],
            error: 'Selecione a empresa para acessar',
          };
        }
      }

      // 4. Configurar contexto da sessão para RLS
      await setSessionContext(
        mtUser.id,
        mtUser.tenant_id,
        mtUser.franchise_id,
        mtUser.access_level
      );

      setState(prev => ({
        ...prev,
        mtUser,
        isLoggingIn: false,
      }));

      return { success: true, mtUser };
    } catch (err: any) {
      console.error('Erro no login:', err);
      setState(prev => ({
        ...prev,
        isLoggingIn: false,
        error: err.message || 'Erro ao fazer login',
      }));
      return { success: false, error: err.message || 'Erro ao fazer login' };
    }
  }, [state.detectedTenant, validateUserTenant, setSessionContext, authLogin]);

  // Login forçando um tenant específico
  const loginWithTenant = useCallback(async (
    email: string,
    password: string,
    tenantId: string
  ): Promise<LoginResult> => {
    setState(prev => ({ ...prev, isLoggingIn: true, error: null }));

    try {
      let authUserId: string;

      if (IS_LOCAL_AUTH) {
        // Local auth: use AuthContext login
        const authResult = await authLogin(email, password);
        if (!authResult.success) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: authResult.error || 'Email não encontrado',
          }));
          return { success: false, error: authResult.error || 'Email não encontrado' };
        }

        const { data: rpcData } = await supabase.rpc('local_auth_login', { p_email: email.trim() });
        authUserId = rpcData?.[0]?.user_id;

        if (!authUserId) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: 'Erro ao obter dados do usuário',
          }));
          return { success: false, error: 'Erro ao obter dados do usuário' };
        }
      } else {
        // Remote auth: Supabase GoTrue
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: authError.message,
          }));
          return { success: false, error: authError.message };
        }

        if (!authData.user) {
          setState(prev => ({
            ...prev,
            isLoggingIn: false,
            error: 'Erro ao obter dados do usuário',
          }));
          return { success: false, error: 'Erro ao obter dados do usuário' };
        }

        authUserId = authData.user.id;
      }

      // 2. Buscar usuário MT específico do tenant
      const { data: mtUser, error: mtError } = await supabase
        .from('mt_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('tenant_id', tenantId)
        .in('status', ['ativo', 'pendente'])
        .single();

      if (mtError || !mtUser) {
        if (!IS_LOCAL_AUTH) await supabase.auth.signOut();
        setState(prev => ({
          ...prev,
          isLoggingIn: false,
          error: 'Usuário não tem acesso a esta empresa',
        }));
        return { success: false, error: 'Usuário não tem acesso a esta empresa' };
      }

      // 3. Configurar contexto da sessão
      await setSessionContext(
        mtUser.id,
        mtUser.tenant_id,
        mtUser.franchise_id,
        mtUser.access_level
      );

      setState(prev => ({
        ...prev,
        mtUser: mtUser as MTUser,
        isLoggingIn: false,
      }));

      return { success: true, mtUser: mtUser as MTUser };
    } catch (err: any) {
      console.error('Erro no login:', err);
      setState(prev => ({
        ...prev,
        isLoggingIn: false,
        error: err.message || 'Erro ao fazer login',
      }));
      return { success: false, error: err.message || 'Erro ao fazer login' };
    }
  }, [setSessionContext, authLogin]);

  // Limpar erro
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Detectar tenant ao montar
  useEffect(() => {
    detectTenant();
  }, [detectTenant]);

  return {
    ...state,
    detectTenant,
    login,
    loginWithTenant,
    validateUserTenant,
    setSessionContext,
    clearError,
  };
}

export default useTenantAuth;
