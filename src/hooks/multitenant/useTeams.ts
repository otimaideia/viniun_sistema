import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { Team, TeamMember, TeamMemberRole } from '@/types/multitenant';

// =============================================================================
// HOOK: useTeams
// Gerencia equipes com membros
// =============================================================================

interface UseTeamsOptions {
  franchiseId?: string;  // Filtrar por franquia específica
}

export function useTeams(options: UseTeamsOptions = {}) {
  const { franchiseId } = options;
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise } = useTenantContext();

  // Carregar equipes
  const fetchTeams = useCallback(async () => {
    if (!tenant?.id) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_teams')
        .select(`
          *,
          lider:mt_users!lider_id(id, nome, email, avatar_url),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('nome', { ascending: true });

      // Filtrar por franquia se especificado
      const currentFranchiseId = franchiseId || franchise?.id;
      if (currentFranchiseId) {
        query = query.or(`franchise_id.is.null,franchise_id.eq.${currentFranchiseId}`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Contar membros por equipe
      const { data: memberCounts } = await supabase
        .from('mt_team_members')
        .select('team_id')
        .eq('is_active', true);

      const countMap = new Map<string, number>();
      memberCounts?.forEach((mc) => {
        const count = countMap.get(mc.team_id) || 0;
        countMap.set(mc.team_id, count + 1);
      });

      const teamsWithCount = (data || []).map((team) => ({
        ...team,
        member_count: countMap.get(team.id) || 0,
      })) as Team[];

      setTeams(teamsWithCount);
    } catch (err) {
      console.error('Erro ao carregar equipes:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar equipes'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, franchiseId]);

  // Criar equipe
  const createTeam = useCallback(async (data: Partial<Team>): Promise<Team> => {
    const { data: created, error: createError } = await supabase
      .from('mt_teams')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        codigo: data.codigo,
        nome: data.nome,
        descricao: data.descricao || null,
        cor: data.cor || '#3B82F6',
        icone: data.icone || 'Users',
        lider_id: data.lider_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    await fetchTeams();
    return created as Team;
  }, [fetchTeams, tenant?.id, franchise?.id]);

  // Atualizar equipe
  const updateTeam = useCallback(async (id: string, data: Partial<Team>): Promise<Team> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.codigo !== undefined) updateData.codigo = data.codigo;
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.cor !== undefined) updateData.cor = data.cor;
    if (data.icone !== undefined) updateData.icone = data.icone;
    if (data.lider_id !== undefined) updateData.lider_id = data.lider_id;
    if (data.franchise_id !== undefined) updateData.franchise_id = data.franchise_id;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: updated, error: updateError } = await supabase
      .from('mt_teams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchTeams();
    return updated as Team;
  }, [fetchTeams]);

  // Deletar equipe (soft delete)
  const deleteTeam = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('mt_teams')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchTeams();
  }, [fetchTeams]);

  // Adicionar membro
  const addMember = useCallback(async (
    teamId: string,
    userId: string,
    role: TeamMemberRole = 'membro'
  ): Promise<TeamMember> => {
    const { data, error } = await supabase
      .from('mt_team_members')
      .upsert({
        team_id: teamId,
        user_id: userId,
        role_in_team: role,
        is_active: true,
        joined_at: new Date().toISOString(),
      }, {
        onConflict: 'team_id,user_id',
      })
      .select()
      .single();

    if (error) throw error;

    await fetchTeams();
    return data as TeamMember;
  }, [fetchTeams]);

  // Remover membro
  const removeMember = useCallback(async (teamId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('mt_team_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    await fetchTeams();
  }, [fetchTeams]);

  // Carregar ao montar
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    isLoading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    refetch: fetchTeams,
  };
}

// =============================================================================
// HOOK: useTeam (singular)
// Carrega uma equipe específica com membros
// =============================================================================

export function useTeam(teamId: string | undefined) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar equipe
      const { data: teamData, error: teamError } = await supabase
        .from('mt_teams')
        .select(`
          *,
          lider:mt_users!lider_id(id, nome, email, avatar_url),
          tenant:mt_tenants(id, slug, nome_fantasia),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      // Buscar membros
      const { data: membersData, error: membersError } = await supabase
        .from('mt_team_members')
        .select(`
          *,
          user:mt_users(id, nome, email, avatar_url, departamento)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('role_in_team', { ascending: true });

      if (membersError) throw membersError;

      setTeam(teamData as Team);
      setMembers(membersData as TeamMember[]);
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar equipe'));
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const updateMemberRole = useCallback(async (
    userId: string,
    newRole: TeamMemberRole
  ): Promise<void> => {
    if (!teamId) return;

    const { error } = await supabase
      .from('mt_team_members')
      .update({ role_in_team: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    await fetchTeam();
  }, [teamId, fetchTeam]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return {
    team,
    members,
    isLoading,
    error,
    updateMemberRole,
    refetch: fetchTeam,
  };
}

// =============================================================================
// HOOK: useUserTeams
// Carrega equipes de um usuário específico
// =============================================================================

export function useUserTeams(userId?: string) {
  const [userTeams, setUserTeams] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserTeams = useCallback(async () => {
    if (!userId) {
      setUserTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('mt_team_members')
        .select(`
          *,
          team:mt_teams(id, codigo, nome, cor, icone, lider_id)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      setUserTeams(data || []);
    } catch (err) {
      console.error('Erro ao carregar equipes do usuário:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserTeams();
  }, [fetchUserTeams]);

  return {
    userTeams,
    isLoading,
    refetch: fetchUserTeams,
  };
}

export default useTeams;
