import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  MTDashboardProfile,
  MTDashboardBoard,
  MTDashboardBoardWidget,
} from '@/types/dashboard';

// =============================================================================
// ADMIN CRUD - Dashboard Profiles, Boards & Widgets
// =============================================================================

export function useDashboardConfigMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // 1. PROFILES - All profiles for current tenant
  // ---------------------------------------------------------------------------

  const profilesQuery = useQuery({
    queryKey: ['mt-dashboard-profiles-admin', tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_dashboard_profiles')
        .select('*')
        .is('deleted_at', null)
        .order('ordem');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTDashboardProfile[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // PROFILE MUTATIONS
  // ---------------------------------------------------------------------------

  const createProfile = useMutation({
    mutationFn: async (profile: Omit<MTDashboardProfile, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_dashboard_profiles')
        .insert({
          ...profile,
          tenant_id: tenant?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      toast.success('Perfil criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar perfil: ${error.message}`);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTDashboardProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_dashboard_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      toast.success('Perfil atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_dashboard_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-boards-admin'] });
      toast.success('Perfil removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover perfil: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // BOARD MUTATIONS
  // ---------------------------------------------------------------------------

  const createBoard = useMutation({
    mutationFn: async (board: Omit<MTDashboardBoard, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_dashboard_boards')
        .insert({
          ...board,
          tenant_id: tenant?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardBoard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-boards-admin', variables.profile_id] });
      toast.success('Board criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar board: ${error.message}`);
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTDashboardBoard> & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_dashboard_boards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-boards-admin'] });
      toast.success('Board atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar board: ${error.message}`);
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_dashboard_boards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-boards-admin'] });
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets-admin'] });
      toast.success('Board removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover board: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // WIDGET MUTATIONS
  // ---------------------------------------------------------------------------

  const createWidget = useMutation({
    mutationFn: async (widget: Omit<MTDashboardBoardWidget, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | '_override'>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_dashboard_board_widgets')
        .insert({
          ...widget,
          tenant_id: tenant?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardBoardWidget;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets-admin', variables.board_id] });
      toast.success('Widget criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar widget: ${error.message}`);
    },
  });

  const updateWidget = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTDashboardBoardWidget> & { id: string }) => {
      // Remove _override from updates - it's a frontend-only field
      const { _override, ...cleanUpdates } = updates as any;

      const { data, error } = await supabase
        .from('mt_dashboard_board_widgets')
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTDashboardBoardWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets-admin'] });
      toast.success('Widget atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar widget: ${error.message}`);
    },
  });

  const deleteWidget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_dashboard_board_widgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-widgets-admin'] });
      toast.success('Widget removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover widget: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // DUPLICATE PROFILE (profile + boards + widgets)
  // ---------------------------------------------------------------------------

  const duplicateProfile = useMutation({
    mutationFn: async (profileId: string) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // 1. Fetch source profile
      const { data: srcProfile, error: profileErr } = await supabase
        .from('mt_dashboard_profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (profileErr) throw profileErr;

      // 2. Insert copy of profile
      const { id: _pid, created_at: _pca, updated_at: _pua, ...profileData } = srcProfile;
      const { data: newProfile, error: newProfileErr } = await supabase
        .from('mt_dashboard_profiles')
        .insert({
          ...profileData,
          tenant_id: tenant?.id ?? profileData.tenant_id,
          codigo: `${profileData.codigo}_copia`,
          nome: `${profileData.nome} (Cópia)`,
          is_default: false,
        })
        .select()
        .single();
      if (newProfileErr) throw newProfileErr;

      // 3. Fetch boards for source profile
      const { data: srcBoards, error: boardsErr } = await supabase
        .from('mt_dashboard_boards')
        .select('*')
        .eq('profile_id', profileId);
      if (boardsErr) throw boardsErr;

      if (srcBoards && srcBoards.length > 0) {
        for (const srcBoard of srcBoards) {
          // 4. Insert copy of board
          const { id: _bid, created_at: _bca, updated_at: _bua, ...boardData } = srcBoard;
          const { data: newBoard, error: newBoardErr } = await supabase
            .from('mt_dashboard_boards')
            .insert({
              ...boardData,
              tenant_id: tenant?.id ?? boardData.tenant_id,
              profile_id: newProfile.id,
            })
            .select()
            .single();
          if (newBoardErr) throw newBoardErr;

          // 5. Fetch widgets for source board
          const { data: srcWidgets, error: widgetsErr } = await supabase
            .from('mt_dashboard_board_widgets')
            .select('*')
            .eq('board_id', srcBoard.id);
          if (widgetsErr) throw widgetsErr;

          if (srcWidgets && srcWidgets.length > 0) {
            const widgetCopies = srcWidgets.map((w) => {
              const { id: _wid, created_at: _wca, updated_at: _wua, ...widgetData } = w;
              return {
                ...widgetData,
                tenant_id: tenant?.id ?? widgetData.tenant_id,
                board_id: newBoard.id,
              };
            });

            const { error: insertWidgetsErr } = await supabase
              .from('mt_dashboard_board_widgets')
              .insert(widgetCopies);
            if (insertWidgetsErr) throw insertWidgetsErr;
          }
        }
      }

      return newProfile as MTDashboardProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      toast.success('Perfil duplicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar perfil: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // DUPLICATE BOARD (board + widgets)
  // ---------------------------------------------------------------------------

  const duplicateBoard = useMutation({
    mutationFn: async (boardId: string) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // 1. Fetch source board
      const { data: srcBoard, error: boardErr } = await supabase
        .from('mt_dashboard_boards')
        .select('*')
        .eq('id', boardId)
        .single();
      if (boardErr) throw boardErr;

      // 2. Insert copy of board
      const { id: _bid, created_at: _bca, updated_at: _bua, ...boardData } = srcBoard;
      const { data: newBoard, error: newBoardErr } = await supabase
        .from('mt_dashboard_boards')
        .insert({
          ...boardData,
          tenant_id: tenant?.id ?? boardData.tenant_id,
          codigo: `${boardData.codigo}_copia`,
          nome: `${boardData.nome} (Cópia)`,
          is_default: false,
        })
        .select()
        .single();
      if (newBoardErr) throw newBoardErr;

      // 3. Fetch widgets for source board
      const { data: srcWidgets, error: widgetsErr } = await supabase
        .from('mt_dashboard_board_widgets')
        .select('*')
        .eq('board_id', boardId);
      if (widgetsErr) throw widgetsErr;

      if (srcWidgets && srcWidgets.length > 0) {
        const widgetCopies = srcWidgets.map((w) => {
          const { id: _wid, created_at: _wca, updated_at: _wua, ...widgetData } = w;
          return {
            ...widgetData,
            tenant_id: tenant?.id ?? widgetData.tenant_id,
            board_id: newBoard.id,
          };
        });

        const { error: insertWidgetsErr } = await supabase
          .from('mt_dashboard_board_widgets')
          .insert(widgetCopies);
        if (insertWidgetsErr) throw insertWidgetsErr;
      }

      return newBoard as MTDashboardBoard;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-boards-admin', data.profile_id] });
      toast.success('Board duplicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar board: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    profiles: profilesQuery.data || [],
    isLoading: profilesQuery.isLoading || isTenantLoading,
    refetchProfiles: profilesQuery.refetch,

    createProfile,
    updateProfile,
    deleteProfile,

    createBoard,
    updateBoard,
    deleteBoard,

    createWidget,
    updateWidget,
    deleteWidget,

    duplicateProfile,
    duplicateBoard,
  };
}

// =============================================================================
// BOARDS BY PROFILE - Separate hook for conditional loading
// =============================================================================

export function useDashboardBoardsMT(profileId: string | null) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-dashboard-boards-admin', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      let q = supabase
        .from('mt_dashboard_boards')
        .select('*')
        .eq('profile_id', profileId)
        .order('ordem');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTDashboardBoard[];
    },
    enabled: !isTenantLoading && !!profileId && (!!tenant || accessLevel === 'platform'),
  });
}

// =============================================================================
// WIDGETS BY BOARD - Separate hook for conditional loading
// =============================================================================

export function useDashboardWidgetsMT(boardId: string | null) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-dashboard-widgets-admin', boardId],
    queryFn: async () => {
      if (!boardId) return [];

      let q = supabase
        .from('mt_dashboard_board_widgets')
        .select('*')
        .eq('board_id', boardId)
        .order('ordem');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTDashboardBoardWidget[];
    },
    enabled: !isTenantLoading && !!boardId && (!!tenant || accessLevel === 'platform'),
  });
}
