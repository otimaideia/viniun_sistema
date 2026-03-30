// =============================================================================
// USE USER ROLE ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para role e módulos do usuário atual usando tabelas MT
// SISTEMA 100% MT - Usa mt_users, mt_user_roles, mt_tenant_modules diretamente
//
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import type { AppRole, UserProfile } from '@/types/user';
import type { ModuloCodigo } from '@/types/modulo';

// =============================================================================
// Types
// =============================================================================

// Inclui todos os códigos de role que podem existir em mt_roles
type MTRole = 'platform_admin' | 'tenant_admin' | 'franchise_admin' | 'user' | 'super_admin' | 'admin';

interface MTUserData {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  email: string;
  avatar_url: string | null;
  is_approved: boolean;
  is_active: boolean;
}

// =============================================================================
// Roles com acesso especial
// =============================================================================

const FULL_ACCESS_ROLES: MTRole[] = ['platform_admin', 'tenant_admin', 'super_admin', 'admin'];
const WHATSAPP_ONLY_ROLES: MTRole[] = [];

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

function mapMTUserToProfile(user: MTUserData, role: MTRole): UserProfile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.nome,
    avatar_url: user.avatar_url,
    created_at: '',
    updated_at: '',
    is_approved: user.is_approved,
    nome: user.nome,
    franqueado_id: user.franchise_id,
    unidade_id: user.franchise_id,
    role: mapMTRoleToLegacy(role),
    approved_at: null,
    approved_by: null,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useUserRoleAdapter() {
  const { user } = useAuth();
  const tenantContext = useTenantContext();

  const [role, setRole] = useState<AppRole | null>(null);
  const [mtRole, setMTRole] = useState<MTRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [franqueadoId, setFranqueadoId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<ModuloCodigo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setMTRole(null);
      setProfile(null);
      setFranqueadoId(null);
      setModulos([]);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        // 1. Buscar usuário MT
        const { data: mtUser } = await supabase
          .from('mt_users')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!mtUser) {
          console.warn('[MT] Usuário não encontrado em mt_users');
          setLoading(false);
          return;
        }

        // 2. Buscar roles do usuário (mt_user_roles → mt_roles)
        // Busca todas as roles ativas e seleciona a de maior prioridade (menor nivel)
        const { data: rolesData } = await supabase
          .from('mt_user_roles')
          .select('role:mt_roles(codigo, nivel)')
          .eq('user_id', mtUser.id)
          .eq('is_active', true);

        // Selecionar role de maior prioridade (menor nivel = maior prioridade)
        // Prioridade: platform_admin (0) > tenant_admin (1) > franchise_admin (2) > user (3)
        const roles = (rolesData || [])
          .map(r => r.role as { codigo: string; nivel: number } | null)
          .filter(r => r !== null)
          .sort((a, b) => (a?.nivel || 999) - (b?.nivel || 999));

        const roleCodigo = roles[0]?.codigo;
        const userMTRole = (roleCodigo as MTRole) || 'user';
        const userRole = mapMTRoleToLegacy(userMTRole);

        setMTRole(userMTRole);
        setRole(userRole);
        setFranqueadoId(mtUser.franchise_id);
        setProfile(mapMTUserToProfile(mtUser, userMTRole));

        // 3. Buscar módulos disponíveis
        if (userMTRole === 'platform_admin') {
          // Platform admin tem acesso a todos os módulos
          const { data: allModules } = await supabase
            .from('mt_modules')
            .select('codigo')
            .eq('is_active', true);

          setModulos((allModules || []).map((m) => m.codigo as ModuloCodigo));
        } else if (mtUser.tenant_id) {
          // Buscar módulos habilitados para o tenant
          const { data: tenantModules } = await supabase
            .from('mt_tenant_modules')
            .select('module:mt_modules(codigo)')
            .eq('tenant_id', mtUser.tenant_id)
            .eq('is_active', true);

          if (tenantModules) {
            const codes = tenantModules
              .map((tm: any) => tm.module?.codigo)
              .filter(Boolean) as ModuloCodigo[];
            setModulos(codes);
          }
        }
      } catch (error) {
        console.error('[MT] Erro ao buscar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // ==========================================================================
  // Helper: Verificar acesso a módulo
  // ==========================================================================
  const hasModule = useCallback(
    (codigo: ModuloCodigo) => {
      if (mtRole === 'platform_admin') return true;
      return modulos.includes(codigo);
    },
    [mtRole, modulos]
  );

  // ==========================================================================
  // Computed Values
  // ==========================================================================
  // Verificar roles MT diretos
  const isPlatformAdmin = mtRole === 'platform_admin';
  const isTenantAdmin = mtRole === 'tenant_admin';
  const isFranchiseAdmin = mtRole === 'franchise_admin';
  const isUserRole = mtRole === 'user';

  // Legacy compatibility - incluir todos os códigos de role admin
  // super_admin e admin podem existir em mt_roles com diferentes convenções de nomenclatura
  const isSuperAdmin = isPlatformAdmin || mtRole === 'super_admin';
  const isAdmin = isPlatformAdmin || isTenantAdmin || mtRole === 'super_admin' || mtRole === 'admin';
  const isDiretoria = isTenantAdmin;
  const isFranqueado = isFranchiseAdmin;
  const isCentral = isTenantAdmin;
  const isGerente = isUserRole;
  const isMarketing = false;
  const isSdr = false;
  const isConsultoraVendas = false;
  const isAvaliadora = false;
  const isAplicadora = false;
  const isEsteticista = false;
  const isUnidade = isFranchiseAdmin || isUserRole;

  const hasFullAccess = mtRole ? FULL_ACCESS_ROLES.includes(mtRole) || mtRole === 'super_admin' || mtRole === 'admin' : false;
  const hasWhatsAppAccess = mtRole !== null && hasModule('whatsapp' as ModuloCodigo);
  const isWhatsAppOnly = false;
  const isPending = profile?.is_approved === false;
  const isActive = profile?.is_approved === true;

  return {
    role,
    mtRole,
    profile,
    franqueadoId,
    modulos,
    loading,

    // Role checks - MT
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
    isUserRole,

    // Role checks - Legacy
    isSuperAdmin,
    isAdmin,
    isDiretoria,
    isFranqueado,
    isCentral,
    isGerente,
    isMarketing,
    isSdr,
    isConsultoraVendas,
    isAvaliadora,
    isAplicadora,
    isEsteticista,
    isUnidade,

    // Access checks
    hasFullAccess,
    hasWhatsAppAccess,
    isWhatsAppOnly,
    isPending,
    isActive,

    // Module check
    hasModule,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export types
// =============================================================================

export type { AppRole, UserProfile, ModuloCodigo };

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getUserRoleMode(): 'mt' {
  return 'mt';
}

export default useUserRoleAdapter;
