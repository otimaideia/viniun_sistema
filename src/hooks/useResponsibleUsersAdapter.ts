import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// HOOKS MT PARA USUÁRIOS RESPONSÁVEIS
// Usam tabela mt_users com isolamento por tenant
// =============================================================================

const QUERY_KEY = 'mt-responsible-users';

export interface ResponsibleUser {
  id: string;
  name: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  is_active: boolean;
  total_leads?: number;
  leads_ativos?: number;
}

/**
 * Hook MT para listar usuários que podem ser responsáveis por leads
 */
export function useResponsibleUsersAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      // Buscar usuários ativos que podem ser responsáveis
      let query = supabase
        .from('mt_users')
        .select(`
          id,
          nome,
          email,
          avatar_url,
          cargo,
          status,
          department_id,
          departamento:mt_departments!department_id(nome)
        `)
        .eq('status', 'ativo')
        .order('nome');

      // Filtrar por tenant/franchise baseado no nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error: usersError } = await query;

      if (usersError) throw usersError;

      // Buscar contagem de leads por responsável
      const userIds = (data || []).map(u => u.id);

      if (userIds.length === 0) {
        return [];
      }

      let leadsQuery = supabase
        .from('mt_leads')
        .select('atribuido_para, status')
        .in('atribuido_para', userIds)
        .is('deleted_at', null);

      // Aplicar filtros de tenant/franchise aos leads também
      if (accessLevel === 'tenant' && tenant) {
        leadsQuery = leadsQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        leadsQuery = leadsQuery.eq('franchise_id', franchise.id);
      } else if (accessLevel !== 'platform' && tenant) {
        leadsQuery = leadsQuery.eq('tenant_id', tenant.id);
      }

      const { data: leads } = await leadsQuery;

      // Contar leads por responsável
      const leadCounts = new Map<string, { total: number; ativos: number }>();

      for (const lead of leads || []) {
        if (!lead.atribuido_para) continue;

        if (!leadCounts.has(lead.atribuido_para)) {
          leadCounts.set(lead.atribuido_para, { total: 0, ativos: 0 });
        }

        const counts = leadCounts.get(lead.atribuido_para)!;
        counts.total++;

        // Leads ativos = não perdidos e não convertidos
        const status = lead.status || 'novo';
        if (!['perdido', 'descartado', 'convertido', 'ganho'].includes(status)) {
          counts.ativos++;
        }
      }

      // Mapear para interface
      return (data || []).map((user): ResponsibleUser => {
        const counts = leadCounts.get(user.id) || { total: 0, ativos: 0 };
        const dept = user.departamento as { nome: string } | null;
        const userName = user.nome || user.email?.split('@')[0] || 'Usuário';

        return {
          id: user.id,
          name: userName,
          nome: userName,
          email: user.email,
          avatar_url: user.avatar_url,
          cargo: user.cargo,
          departamento: dept?.nome || null,
          is_active: user.status === 'ativo',
          total_leads: counts.total,
          leads_ativos: counts.ativos,
        };
      });
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const queryClient = useQueryClient();

  // Mutation para atribuir responsável a um lead
  const assignResponsibleMutation = useMutation({
    mutationFn: async ({
      leadId,
      responsibleId,
      previousResponsibleName,
    }: {
      leadId: string;
      responsibleId: string | null;
      previousResponsibleName?: string;
    }) => {
      const { error: updateError } = await supabase
        .from('mt_leads')
        .update({
          atribuido_para: responsibleId,
          atribuido_em: responsibleId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Responsável atualizado!');
    },
    onError: (err) => {
      console.error('Error assigning responsible:', err);
      toast.error('Erro ao atribuir responsável');
    },
  });

  return {
    users,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    assignResponsible: assignResponsibleMutation.mutate,
    isAssigning: assignResponsibleMutation.isPending,

    // Funções auxiliares
    getUserById: (id: string) => users.find(u => u.id === id),
    getUsersByDepartamento: (dept: string) => users.filter(u => u.departamento === dept),
    getActiveUsers: () => users.filter(u => u.is_active),

    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para buscar um usuário responsável específico
 */
export function useResponsibleUserAdapter(userId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEY, 'single', userId, tenant?.id],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('mt_users')
        .select(`
          id,
          nome,
          email,
          avatar_url,
          cargo,
          status,
          departamento:mt_departments!department_id(nome)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      const dept = data.departamento as { nome: string } | null;

      return {
        id: data.id,
        nome: data.nome,
        email: data.email,
        avatar_url: data.avatar_url,
        cargo: data.cargo,
        departamento: dept?.nome || null,
        is_active: data.status === 'ativo',
      } as ResponsibleUser;
    },
    enabled: !!userId && !isTenantLoading,
  });

  return {
    user,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    _mode: 'mt' as const,
  };
}

export default useResponsibleUsersAdapter;
