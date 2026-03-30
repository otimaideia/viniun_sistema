import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface MTUserOption {
  id: string;
  nome: string;
  nome_curto: string | null;
  email: string;
  cargo: string | null;
  departamento: string | null;
  avatar_url: string | null;
  access_level: string;
  franchise_id: string | null;
  status: string;
  is_active: boolean;
  franchise?: { id: string; nome_fantasia: string } | null;
  roles?: { codigo: string; nome: string }[];
}

export function useUsersMT(filters?: { is_active?: boolean; franchise_id?: string }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-users-list', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      let q = supabase
        .from('mt_users')
        .select(`
          id, nome, nome_curto, email, cargo, departamento, avatar_url,
          access_level, franchise_id, status, is_active,
          franchise:mt_franchises(id, nome_fantasia)
        `)
        .order('nome', { ascending: true });

      // Tenant filter
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Active filter (default true)
      if (filters?.is_active !== false) {
        q = q.eq('is_active', true);
      }

      // Franchise filter
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Fetch roles for each user
      const userIds = (data || []).map(u => u.id);
      let rolesMap: Record<string, { codigo: string; nome: string }[]> = {};

      if (userIds.length > 0) {
        const { data: userRoles } = await supabase
          .from('mt_user_roles')
          .select('user_id, role:mt_roles(codigo, nome)')
          .in('user_id', userIds);

        if (userRoles) {
          for (const ur of userRoles) {
            if (!rolesMap[ur.user_id]) rolesMap[ur.user_id] = [];
            if (ur.role) rolesMap[ur.user_id].push(ur.role as any);
          }
        }
      }

      return (data || []).map(u => ({
        ...u,
        roles: rolesMap[u.id] || [],
      })) as MTUserOption[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
  };
}
