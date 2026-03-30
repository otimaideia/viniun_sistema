// =============================================================================
// USE USER PROFILE ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para perfil do usuário atual usando tabelas MT
// SISTEMA 100% MT - Usa mt_users e mt_user_roles diretamente
//
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// Types
// =============================================================================

export interface UserProfileAdapted {
  id: string;
  email: string;
  nome: string;
  full_name: string | null;
  avatar_url: string | null;
  telefone: string | null;
  is_approved: boolean;
  is_admin: boolean;
  status: string;
  role: string;
  unidade_id: string | null;
  franqueado_id: string | null;
  // Campos MT
  tenant_id: string | null;
  franchise_id: string | null;
  access_level: string | null;
}

interface MTUserProfile {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  auth_user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  cargo: string | null;
  status: string; // 'ativo', 'inativo', 'pendente', etc.
  created_at: string;
  updated_at: string;
  // Relacionamentos
  roles?: { role: string }[];
  tenant?: { id: string; slug: string; nome_fantasia: string };
  franchise?: { id: string; nome: string };
}

// Inclui todos os códigos de role que podem existir em mt_roles
// Roles de admin do sistema
type AdminRole = 'platform_admin' | 'tenant_admin' | 'franchise_admin' | 'super_admin' | 'admin';
// Roles operacionais (todas as outras são tratadas como 'user')
type OperationalRole = 'user' | 'consultora_vendas' | 'supervisor' | 'gerente' | 'sdr' | 'avaliadora' | 'aplicadora' | 'esteticista' | 'atendente' | 'viewer' | 'marketing' | 'central' | 'diretoria' | 'franqueado' | string;
type MTRole = AdminRole | OperationalRole;
type AccessLevel = 'platform' | 'tenant' | 'franchise' | 'user';

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-user-profile';

// =============================================================================
// Mapper Functions
// =============================================================================

// Roles que são admin de plataforma
const PLATFORM_ADMIN_ROLES = ['platform_admin', 'super_admin'];
// Roles que são admin de tenant
const TENANT_ADMIN_ROLES = ['tenant_admin', 'admin', 'diretoria'];
// Roles que são admin de franquia
const FRANCHISE_ADMIN_ROLES = ['franchise_admin', 'franqueado', 'gerente'];
// Todas as outras roles são 'user' (operacionais da franquia)

function mapMTRoleToLegacy(mtRole: string): string {
  if (PLATFORM_ADMIN_ROLES.includes(mtRole)) return 'super_admin';
  if (TENANT_ADMIN_ROLES.includes(mtRole)) return 'admin';
  if (FRANCHISE_ADMIN_ROLES.includes(mtRole)) return 'unidade';
  // Todas as outras roles (consultora_vendas, supervisor, sdr, etc.) são 'unidade'
  return 'unidade';
}

function getAccessLevelFromRole(role: string): AccessLevel {
  if (PLATFORM_ADMIN_ROLES.includes(role)) return 'platform';
  if (TENANT_ADMIN_ROLES.includes(role)) return 'tenant';
  if (FRANCHISE_ADMIN_ROLES.includes(role)) return 'franchise';
  // Todas as outras roles são 'user'
  return 'user';
}

function isAdminRole(role: string): boolean {
  return PLATFORM_ADMIN_ROLES.includes(role) || TENANT_ADMIN_ROLES.includes(role);
}

function isFranchiseRole(role: string): boolean {
  return FRANCHISE_ADMIN_ROLES.includes(role);
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useUserProfileAdapter() {
  const { user } = useAuth();
  const tenantContext = useTenantContext();

  // ==========================================================================
  // Query: Buscar Perfil do Usuário
  // ==========================================================================
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<MTUserProfile | null> => {
      if (!user?.id) return null;

      // Buscar perfil do usuário (sem roles para evitar erro de relacionamento ambíguo)
      const { data: userData, error: userError } = await supabase
        .from('mt_users')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, nome)
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) {
        // Se tabela não existe, retorna null
        if (userError.code === '42P01') {
          console.warn('[MT] mt_users table not found');
          return null;
        }
        throw userError;
      }

      if (!userData) return null;

      // Buscar roles do usuário separadamente (com join explícito)
      const { data: rolesData } = await supabase
        .from('mt_user_roles')
        .select('role:mt_roles(codigo, nivel)')
        .eq('user_id', userData.id)
        .eq('is_active', true);

      // Mapear roles para o formato esperado, ordenando por nivel (menor = maior prioridade)
      const roles = (rolesData || [])
        .map(r => ({ role: (r.role as { codigo: string; nivel: number } | null)?.codigo || 'user' }))
        .sort((a, b) => {
          const roleA = rolesData?.find(rd => (rd.role as any)?.codigo === a.role);
          const roleB = rolesData?.find(rd => (rd.role as any)?.codigo === b.role);
          return ((roleA?.role as any)?.nivel || 999) - ((roleB?.role as any)?.nivel || 999);
        });

      return { ...userData, roles } as MTUserProfile;
    },
    enabled: !!user?.id,
  });

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  const primaryRole = (profileData?.roles?.[0]?.role || 'user') as string;
  const accessLevel = getAccessLevelFromRole(primaryRole);

  // Verificar roles usando as listas de roles
  const isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(primaryRole);
  const isTenantAdmin = TENANT_ADMIN_ROLES.includes(primaryRole);
  const isFranchiseAdmin = FRANCHISE_ADMIN_ROLES.includes(primaryRole);
  // Qualquer role que não seja admin é considerada 'user'
  const isUser = !isPlatformAdmin && !isTenantAdmin && !isFranchiseAdmin;

  const isAdmin = isPlatformAdmin || isTenantAdmin;
  const isCentral = isTenantAdmin || isFranchiseAdmin;
  // isUnidade = true para TODOS que não são admin (inclui franchise_admin e users operacionais)
  const isUnidade = !isAdmin;

  // mt_users usa campo 'status' (não is_approved/is_active)
  // Status válidos: 'ativo', 'inativo', 'pendente', 'bloqueado'
  const isApproved = profileData?.status === 'ativo';
  const isActive = profileData?.status === 'ativo';

  // ==========================================================================
  // Profile Object
  // ==========================================================================
  const profile: UserProfileAdapted | null = profileData
    ? {
        id: profileData.id,
        email: profileData.email,
        nome: profileData.nome,
        full_name: profileData.nome,
        avatar_url: profileData.avatar_url,
        telefone: profileData.telefone,
        is_approved: isApproved,
        is_admin: isAdmin,
        status: profileData.status || 'pending',
        role: mapMTRoleToLegacy(primaryRole),
        unidade_id: profileData.franchise_id,
        franqueado_id: profileData.franchise_id,
        // Campos MT
        tenant_id: profileData.tenant_id,
        franchise_id: profileData.franchise_id,
        access_level: accessLevel,
      }
    : null;

  return {
    // Profile
    profile,
    isLoading,
    error,
    refetch,

    // Role info
    role: mapMTRoleToLegacy(primaryRole),
    mtRole: primaryRole,
    accessLevel,

    // IDs
    tenantId: profileData?.tenant_id || null,
    franchiseId: profileData?.franchise_id || null,
    franqueadoId: profileData?.franchise_id || null,
    unidadeId: profileData?.franchise_id || null,

    // Relacionamentos
    tenant: profileData?.tenant || null,
    franchise: profileData?.franchise || null,

    // Booleans - MT
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
    isUser,

    // Booleans - Legacy compatibility
    isSuperAdmin: isPlatformAdmin,
    isAdmin,
    isDiretoria: isTenantAdmin,
    isCentral,
    isFranqueado: isFranchiseAdmin,
    isUnidade,

    // Status
    isApproved,
    isActive,
    isPending: !isApproved,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getUserProfileMode(): 'mt' {
  return 'mt';
}

export default useUserProfileAdapter;
