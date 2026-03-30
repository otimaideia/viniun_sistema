import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type {
  MTDashboardProfile,
  MTDashboardBoard,
  MTDashboardBoardWidget,
} from '@/types/dashboard';

// =============================================================================
// useDashboardProfileMT
// Hook principal do dashboard dinâmico: detecta perfil, carrega boards/widgets,
// aplica overrides do usuário e suporta navegação entre boards.
// =============================================================================

export function useDashboardProfileMT() {
  const {
    tenant,
    franchise,
    accessLevel,
    user,
    modules,
    isLoading: isTenantLoading,
  } = useTenantContext();

  const queryClient = useQueryClient();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 1: Load all active profiles for the tenant
  // ---------------------------------------------------------------------------

  const profilesQuery = useQuery({
    queryKey: ['mt-dashboard-profiles', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_dashboard_profiles')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('ordem');
      if (error) throw error;
      return data as MTDashboardProfile[];
    },
    enabled: !!tenant,
  });

  // ---------------------------------------------------------------------------
  // Step 2a: Load user role codigos
  // ---------------------------------------------------------------------------

  const rolesQuery = useQuery({
    queryKey: ['mt-user-roles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_user_roles')
        .select('role:mt_roles(codigo)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data?.map((r: any) => r.role?.codigo).filter(Boolean) as string[]) || [];
    },
    enabled: !!user?.id,
  });

  // ---------------------------------------------------------------------------
  // Step 2b: Detect which profile matches the user
  // ---------------------------------------------------------------------------

  const profile = useMemo<MTDashboardProfile | null>(() => {
    const profiles = profilesQuery.data;
    if (!profiles?.length) return null;

    // 1. Check localStorage override (admin/debug)
    try {
      const overrideId = localStorage.getItem('dashboard_profile_override');
      if (overrideId) {
        const found = profiles.find(p => p.id === overrideId || p.codigo === overrideId);
        if (found) return found;
      }
    } catch {
      // localStorage indisponível (SSR, iframe sandbox, etc.)
    }

    const userRoleCodigos = rolesQuery.data || [];
    const userCargo = ((user as any)?.cargo || '').toLowerCase().trim();

    // 2. Match by role codigos
    const byRole = profiles.find(p =>
      p.role_codigos?.some(rc => userRoleCodigos.includes(rc))
    );
    if (byRole) return byRole;

    // 3. Match by cargo (case-insensitive, partial match)
    if (userCargo) {
      const byCargo = profiles.find(p =>
        p.cargos?.some(c =>
          userCargo.includes(c.toLowerCase()) || c.toLowerCase().includes(userCargo)
        )
      );
      if (byCargo) return byCargo;
    }

    // 4. Fallback to default or first
    return profiles.find(p => p.is_default) || profiles[0] || null;
  }, [profilesQuery.data, rolesQuery.data, user]);

  // ---------------------------------------------------------------------------
  // Step 3: Load boards for the detected profile
  // ---------------------------------------------------------------------------

  const boardsQuery = useQuery({
    queryKey: ['mt-dashboard-boards', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_dashboard_boards')
        .select('*')
        .eq('profile_id', profile!.id)
        .eq('is_active', true)
        .order('ordem');
      if (error) throw error;
      return data as MTDashboardBoard[];
    },
    enabled: !!profile?.id,
  });

  // Filter boards by module availability
  const filteredBoards = useMemo<MTDashboardBoard[]>(() => {
    if (!boardsQuery.data) return [];
    return boardsQuery.data.filter(board => {
      if (!board.required_module) return true;
      return modules?.some(m => m.codigo === board.required_module && m.is_active);
    });
  }, [boardsQuery.data, modules]);

  // ---------------------------------------------------------------------------
  // Step 4: Active board state
  // ---------------------------------------------------------------------------

  const activeBoard = useMemo<MTDashboardBoard | null>(() => {
    if (!filteredBoards.length) return null;
    if (activeBoardId) {
      const found = filteredBoards.find(b => b.id === activeBoardId);
      if (found) return found;
    }
    return filteredBoards.find(b => b.is_default) || filteredBoards[0];
  }, [filteredBoards, activeBoardId]);

  // ---------------------------------------------------------------------------
  // Step 5: Load widgets + user overrides for active board
  // ---------------------------------------------------------------------------

  const widgetsQuery = useQuery({
    queryKey: ['mt-dashboard-widgets', activeBoard?.id, user?.id],
    queryFn: async () => {
      // Load board widgets
      const { data: widgetData, error: wError } = await supabase
        .from('mt_dashboard_board_widgets')
        .select('*')
        .eq('board_id', activeBoard!.id)
        .eq('is_active', true)
        .order('ordem');
      if (wError) throw wError;

      const widgets = widgetData || [];

      // Load user overrides
      const widgetIds = widgets.map(w => w.id);
      let overrides: any[] = [];
      if (widgetIds.length > 0 && user?.id) {
        const { data: oData } = await supabase
          .from('mt_dashboard_user_overrides')
          .select('*')
          .eq('user_id', user.id)
          .in('board_widget_id', widgetIds);
        overrides = oData || [];
      }

      // Merge overrides into widgets
      const overrideMap = new Map(
        overrides.map(o => [o.board_widget_id, o])
      );

      return widgets.map(w => {
        const ov = overrideMap.get(w.id);
        return {
          ...w,
          _override: ov
            ? {
                id: ov.id,
                is_hidden: ov.is_hidden,
                posicao_x: ov.posicao_x,
                posicao_y: ov.posicao_y,
                largura: ov.largura,
                altura: ov.altura,
                config: ov.config,
              }
            : undefined,
        };
      }) as MTDashboardBoardWidget[];
    },
    enabled: !!activeBoard?.id,
  });

  // Filter widgets by module availability
  const filteredWidgets = useMemo<MTDashboardBoardWidget[]>(() => {
    if (!widgetsQuery.data) return [];
    return widgetsQuery.data.filter(w => {
      if (!w.required_module) return true;
      return modules?.some(m => m.codigo === w.required_module && m.is_active);
    });
  }, [widgetsQuery.data, modules]);

  // ---------------------------------------------------------------------------
  // Step 6: Mutations
  // ---------------------------------------------------------------------------

  const hideWidget = useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from('mt_dashboard_user_overrides')
        .upsert(
          {
            tenant_id: tenant!.id,
            user_id: user!.id,
            board_widget_id: widgetId,
            is_hidden: true,
          },
          { onConflict: 'user_id,board_widget_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets'] });
    },
  });

  const showWidget = useMutation({
    mutationFn: async (widgetId: string) => {
      const { error } = await supabase
        .from('mt_dashboard_user_overrides')
        .upsert(
          {
            tenant_id: tenant!.id,
            user_id: user!.id,
            board_widget_id: widgetId,
            is_hidden: false,
          },
          { onConflict: 'user_id,board_widget_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets'] });
    },
  });

  const resetLayout = useMutation({
    mutationFn: async () => {
      const widgetIds = filteredWidgets.map(w => w.id);
      if (!widgetIds.length || !user?.id) return;

      const { error } = await supabase
        .from('mt_dashboard_user_overrides')
        .delete()
        .eq('user_id', user.id)
        .in('board_widget_id', widgetIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets'] });
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    profile,
    boards: filteredBoards,
    activeBoard,
    widgets: filteredWidgets,
    isLoading:
      isTenantLoading ||
      profilesQuery.isLoading ||
      boardsQuery.isLoading ||
      widgetsQuery.isLoading,
    selectBoard: (boardId: string) => setActiveBoardId(boardId),
    hideWidget,
    showWidget,
    resetLayout,
  };
}
