import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, UserProfile, UserWithRole } from '@/types/user';
import type { ModuloCodigo } from '@/types/modulo';

// Roles com acesso total ao sistema
const FULL_ACCESS_ROLES: AppRole[] = ['super_admin', 'admin', 'diretoria'];

// Roles com acesso limitado a WhatsApp
const WHATSAPP_ONLY_ROLES: AppRole[] = ['sdr', 'avaliadora', 'aplicadora', 'esteticista'];

interface UserRoleData {
  role: AppRole | null;
  profile: UserProfile | null;
  franqueadoId: string | null;
  modulos: ModuloCodigo[];
  loading: boolean;
  // Helpers de verificação de role
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isDiretoria: boolean;
  isFranqueado: boolean;
  isCentral: boolean;
  isGerente: boolean;
  isMarketing: boolean;
  isSdr: boolean;
  isConsultoraVendas: boolean;
  isAvaliadora: boolean;
  isAplicadora: boolean;
  isEsteticista: boolean;
  isUnidade: boolean;
  // Helpers de acesso
  hasFullAccess: boolean;
  hasWhatsAppAccess: boolean;
  isWhatsAppOnly: boolean;
  isPending: boolean;
  isActive: boolean;
  // Helpers de módulos
  hasModule: (codigo: ModuloCodigo) => boolean;
}

/**
 * @deprecated Use useUserRoleAdapter instead for proper multi-tenant isolation.
 */
export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [franqueadoId, setFranqueadoId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<ModuloCodigo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setProfile(null);
      setFranqueadoId(null);
      setModulos([]);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        // Buscar role
        const { data: roleData } = await supabase
          .from('mt_user_roles')
          .select('role, franqueado_id')
          .eq('user_id', user.id)
          .maybeSingle();

        // Buscar perfil
        const { data: profileData } = await supabase
          .from('mt_users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const userRole = roleData?.role as AppRole || null;
        const userFranqueadoId = roleData?.franqueado_id || profileData?.unidade_id || null;

        setRole(userRole);
        setFranqueadoId(userFranqueadoId);
        setProfile(profileData || null);

        // Buscar módulos ativos da franquia (se não for super_admin)
        if (userRole !== 'super_admin' && userFranqueadoId) {
          const { data: modulosData } = await supabase
            .from('mt_franchise_modules')
            .select('modulo:mt_modules(codigo)')
            .eq('franqueado_id', userFranqueadoId)
            .eq('is_active', true);

          if (modulosData) {
            const codes = modulosData
              .map((m: any) => m.modulo?.codigo)
              .filter(Boolean) as ModuloCodigo[];
            setModulos(codes);
          }
        } else if (userRole === 'super_admin') {
          // Super admin tem acesso a todos os módulos
          setModulos([
            'leads', 'usuarios', 'funil', 'metas', 'diretorias',
            'ranking', 'relatorios', 'marketing', 'whatsapp',
            'formularios', 'servicos', 'aprovacoes', 'franqueados',
            'agendamentos', 'recrutamento', 'influenciadoras', 'area_cliente'
          ]);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const hasModule = useCallback((codigo: ModuloCodigo) => {
    if (role === 'super_admin') return true;
    return modulos.includes(codigo);
  }, [role, modulos]);

  // Computed values
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isDiretoria = role === 'diretoria';
  const isFranqueado = role === 'franqueado';
  const isCentral = role === 'central';
  const isGerente = role === 'gerente';
  const isMarketing = role === 'marketing';
  const isSdr = role === 'sdr';
  const isConsultoraVendas = role === 'consultora_vendas';
  const isAvaliadora = role === 'avaliadora';
  const isAplicadora = role === 'aplicadora';
  const isEsteticista = role === 'esteticista';
  const isUnidade = role === 'unidade';

  const hasFullAccess = role ? FULL_ACCESS_ROLES.includes(role) : false;
  const hasWhatsAppAccess = role !== null;
  const isWhatsAppOnly = role ? WHATSAPP_ONLY_ROLES.includes(role) : false;
  const isPending = profile?.is_approved === false;
  const isActive = profile?.is_approved === true;

  return {
    role,
    profile,
    franqueadoId,
    modulos,
    loading,
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
    hasFullAccess,
    hasWhatsAppAccess,
    isWhatsAppOnly,
    isPending,
    isActive,
    hasModule,
  };
};

export default useUserRole;
