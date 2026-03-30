// =============================================================================
// USE FUNNEL ACCESS MT - Controle de acesso a funis por departamento/equipe/usuário
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FunnelRoleAccess {
  id: string;
  tenant_id: string;
  funnel_id: string;
  department_id?: string | null;
  team_id?: string | null;
  user_id?: string | null;
  can_view: boolean;
  can_move_leads: boolean;
  can_add_leads: boolean;
  can_remove_leads: boolean;
  can_edit_funnel: boolean;
  can_manage_automations: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Relacionamentos
  department?: { id: string; nome: string } | null;
  team?: { id: string; nome: string } | null;
  user?: { id: string; nome: string; email: string } | null;
}

export interface FunnelAccessPermissions {
  canView: boolean;
  canMoveLeads: boolean;
  canAddLeads: boolean;
  canRemoveLeads: boolean;
  canEditFunnel: boolean;
  canManageAutomations: boolean;
}

const QUERY_KEY = 'mt-funnel-role-access';

// -----------------------------------------------------------------------------
// Hook: Listar acessos de um funil (para admin configurar)
// -----------------------------------------------------------------------------

export function useFunnelRoleAccessMT(funnelId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, funnelId],
    queryFn: async (): Promise<FunnelRoleAccess[]> => {
      if (!funnelId) return [];

      const { data, error } = await supabase
        .from('mt_funnel_role_access')
        .select(`
          *,
          department:mt_departments(id, nome),
          team:mt_teams(id, nome),
          user:mt_users(id, nome, email)
        `)
        .eq('funnel_id', funnelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        department: Array.isArray(item.department) ? item.department[0] : item.department,
        team: Array.isArray(item.team) ? item.team[0] : item.team,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      })) as FunnelRoleAccess[];
    },
    enabled: !!funnelId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Criar acesso
  const createAccess = useMutation({
    mutationFn: async (data: {
      funnel_id: string;
      department_id?: string | null;
      team_id?: string | null;
      user_id?: string | null;
      can_view?: boolean;
      can_move_leads?: boolean;
      can_add_leads?: boolean;
      can_remove_leads?: boolean;
      can_edit_funnel?: boolean;
      can_manage_automations?: boolean;
    }) => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data: access, error } = await supabase
        .from('mt_funnel_role_access')
        .insert({
          tenant_id: tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return access;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-user-access'] });
      toast.success('Acesso configurado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao configurar acesso: ${error.message}`);
    },
  });

  // Atualizar acesso
  const updateAccess = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FunnelRoleAccess> & { id: string }) => {
      const { data: access, error } = await supabase
        .from('mt_funnel_role_access')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return access;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-user-access'] });
      toast.success('Acesso atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar acesso: ${error.message}`);
    },
  });

  // Remover acesso
  const removeAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_funnel_role_access')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-user-access'] });
      toast.success('Acesso removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover acesso: ${error.message}`);
    },
  });

  return {
    accessRules: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    createAccess,
    updateAccess,
    removeAccess,
  };
}

// -----------------------------------------------------------------------------
// Hook: Verificar permissões do usuário atual para um funil específico
// -----------------------------------------------------------------------------

export function useFunnelUserAccessMT(funnelId: string | undefined) {
  const { tenant, user, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-funnel-user-access', funnelId, user?.id],
    queryFn: async (): Promise<FunnelAccessPermissions> => {
      // Platform admin e tenant admin sempre têm acesso total
      if (accessLevel === 'platform' || accessLevel === 'tenant') {
        return {
          canView: true,
          canMoveLeads: true,
          canAddLeads: true,
          canRemoveLeads: true,
          canEditFunnel: true,
          canManageAutomations: true,
        };
      }

      // Franchise admin tem permissões amplas
      if (accessLevel === 'franchise') {
        return {
          canView: true,
          canMoveLeads: true,
          canAddLeads: true,
          canRemoveLeads: true,
          canEditFunnel: true,
          canManageAutomations: true,
        };
      }

      if (!funnelId || !user?.id) {
        return {
          canView: false,
          canMoveLeads: false,
          canAddLeads: false,
          canRemoveLeads: false,
          canEditFunnel: false,
          canManageAutomations: false,
        };
      }

      // Buscar departamentos e equipes do usuário
      const [deptResult, teamResult] = await Promise.all([
        supabase
          .from('mt_user_departments')
          .select('department_id')
          .eq('user_id', user.id),
        supabase
          .from('mt_user_teams')
          .select('team_id')
          .eq('user_id', user.id),
      ]);

      const departmentIds = (deptResult.data || []).map((d) => d.department_id);
      const teamIds = (teamResult.data || []).map((t) => t.team_id);

      // Buscar regras de acesso que se aplicam ao usuário
      let q = supabase
        .from('mt_funnel_role_access')
        .select('*')
        .eq('funnel_id', funnelId);

      const { data: rules, error } = await q;
      if (error) throw error;

      // Filtrar regras aplicáveis ao usuário atual
      const applicableRules = (rules || []).filter((rule) => {
        if (rule.user_id === user.id) return true;
        if (rule.department_id && departmentIds.includes(rule.department_id)) return true;
        if (rule.team_id && teamIds.includes(rule.team_id)) return true;
        return false;
      });

      // Se não há regras de acesso definidas para este funil, permitir visualização por padrão
      if (rules?.length === 0) {
        return {
          canView: true,
          canMoveLeads: true,
          canAddLeads: true,
          canRemoveLeads: false,
          canEditFunnel: false,
          canManageAutomations: false,
        };
      }

      // Se não há regras aplicáveis ao usuário mas existem regras, negar acesso
      if (applicableRules.length === 0) {
        return {
          canView: false,
          canMoveLeads: false,
          canAddLeads: false,
          canRemoveLeads: false,
          canEditFunnel: false,
          canManageAutomations: false,
        };
      }

      // Combinar permissões (OR entre regras - a mais permissiva vence)
      return {
        canView: applicableRules.some((r) => r.can_view),
        canMoveLeads: applicableRules.some((r) => r.can_move_leads),
        canAddLeads: applicableRules.some((r) => r.can_add_leads),
        canRemoveLeads: applicableRules.some((r) => r.can_remove_leads),
        canEditFunnel: applicableRules.some((r) => r.can_edit_funnel),
        canManageAutomations: applicableRules.some((r) => r.can_manage_automations),
      };
    },
    enabled: !!funnelId && !isTenantLoading && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    permissions: query.data || {
      canView: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
      canMoveLeads: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
      canAddLeads: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
      canRemoveLeads: accessLevel === 'platform' || accessLevel === 'tenant',
      canEditFunnel: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
      canManageAutomations: accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise',
    },
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
  };
}

// -----------------------------------------------------------------------------
// Hook: Listar funis acessíveis ao usuário atual
// -----------------------------------------------------------------------------

export function useAccessibleFunnelsMT() {
  const { tenant, user, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-accessible-funnels', tenant?.id, user?.id, accessLevel],
    queryFn: async (): Promise<string[]> => {
      // Admin vê todos os funis
      if (accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise') {
        const { data, error } = await supabase
          .from('mt_funnels')
          .select('id')
          .eq('is_active', true)
          .is('deleted_at', null);

        if (error) throw error;
        return (data || []).map((f) => f.id);
      }

      if (!user?.id) return [];

      // Buscar departamentos e equipes do usuário
      const [deptResult, teamResult] = await Promise.all([
        supabase
          .from('mt_user_departments')
          .select('department_id')
          .eq('user_id', user.id),
        supabase
          .from('mt_user_teams')
          .select('team_id')
          .eq('user_id', user.id),
      ]);

      const departmentIds = (deptResult.data || []).map((d) => d.department_id);
      const teamIds = (teamResult.data || []).map((t) => t.team_id);

      // Buscar funis que têm regras de acesso
      const { data: allRules, error: rulesError } = await supabase
        .from('mt_funnel_role_access')
        .select('funnel_id, department_id, team_id, user_id, can_view');

      if (rulesError) throw rulesError;

      // Funis com regras de acesso definidas
      const funnelsWithRules = new Set((allRules || []).map((r) => r.funnel_id));

      // Funis acessíveis pelo usuário
      const accessibleFunnelIds = new Set<string>();

      (allRules || []).forEach((rule) => {
        if (!rule.can_view) return;
        if (rule.user_id === user.id) accessibleFunnelIds.add(rule.funnel_id);
        if (rule.department_id && departmentIds.includes(rule.department_id)) accessibleFunnelIds.add(rule.funnel_id);
        if (rule.team_id && teamIds.includes(rule.team_id)) accessibleFunnelIds.add(rule.funnel_id);
      });

      // Funis SEM regras de acesso = acessíveis por todos
      const { data: allFunnels, error: funnelsError } = await supabase
        .from('mt_funnels')
        .select('id')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (funnelsError) throw funnelsError;

      (allFunnels || []).forEach((f) => {
        if (!funnelsWithRules.has(f.id)) {
          accessibleFunnelIds.add(f.id);
        }
      });

      return Array.from(accessibleFunnelIds);
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });
}
