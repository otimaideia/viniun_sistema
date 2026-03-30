// =============================================================================
// USE GAMIFICATION MT - Hook Multi-Tenant para Gamificação
// =============================================================================
//
// Hooks para:
// - useGamificationProfile: perfil do usuário logado
// - useGrantXP: conceder XP + check level up + update profile
// - useBadges: todas as badges com status earned
// - useLeaderboard: ranking por período
// - useLevels: definições de níveis
// - useXPHistory: histórico de XP
// - useRecentBadges: badges recentes
// - useAwardBadge: conceder badge ao usuário
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  MTGamificationProfile,
  MTGamificationLevel,
  MTGamificationBadge,
  MTGamificationXPLog,
  MTLeaderboardEntry,
  MTGamificationUserBadge,
  LeaderboardPeriodo,
  BadgeCategoria,
  XPSource,
} from '@/types/treinamento';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PROFILE_KEY = 'mt-gamification-profile';
const LEVELS_KEY = 'mt-gamification-levels';
const BADGES_KEY = 'mt-gamification-badges';
const LEADERBOARD_KEY = 'mt-gamification-leaderboard';
const XP_HISTORY_KEY = 'mt-gamification-xp-history';
const RECENT_BADGES_KEY = 'mt-gamification-recent-badges';

// ============================================================
// useGamificationProfile - Perfil de gamificação do usuário logado
// ============================================================

export function useGamificationProfile() {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [PROFILE_KEY, tenant?.id, user?.id],
    queryFn: async (): Promise<MTGamificationProfile> => {
      if (!user?.id) throw new Error('Usuário não carregado');

      const { data, error } = await (supabase.from('mt_gamification_profiles') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Se não tem perfil ainda, retornar perfil padrão
      if (!data) {
        return {
          id: '',
          tenant_id: tenant?.id || '',
          franchise_id: franchise?.id || null,
          user_id: user.id,
          total_xp: 0,
          level: 1,
          rank_name: 'Novato',
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
          total_lessons_completed: 0,
          total_modules_completed: 0,
          total_tracks_completed: 0,
          total_quizzes_passed: 0,
          total_perfect_quizzes: 0,
          total_certificates: 0,
          total_study_time_min: 0,
          weekly_xp: 0,
          monthly_xp: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as MTGamificationProfile;
      }

      // Load current and next level info
      const { data: levels } = await (supabase.from('mt_gamification_levels') as any)
        .select('*')
        .eq('tenant_id', data.tenant_id)
        .order('level', { ascending: true });

      if (levels && levels.length > 0) {
        const currentLevel = levels.find((l: any) => l.level === data.level);
        const nextLevel = levels.find((l: any) => l.level === data.level + 1);
        data.current_level = currentLevel || null;
        data.next_level = nextLevel || null;
      }

      return data as MTGamificationProfile;
    },
    enabled: !isTenantLoading && !!user?.id && (!!tenant || accessLevel === 'platform'),
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// ============================================================
// useGrantXP - Conceder XP ao usuário
// ============================================================

export function useGrantXP() {
  const { tenant, franchise, user } = useTenantContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      amount,
      source,
      sourceId,
      descricao,
      userId,
    }: {
      amount: number;
      source: XPSource;
      sourceId?: string;
      descricao?: string;
      userId?: string; // admin pode dar XP para outro user
    }): Promise<{ xpLog: MTGamificationXPLog; leveledUp: boolean; newLevel?: number; newRank?: string }> => {
      if (!tenant?.id) throw new Error('Tenant não definido.');

      const targetUserId = userId || user?.id;
      if (!targetUserId) throw new Error('Usuário não definido.');

      // 1. Insert XP log entry
      const { data: xpLog, error: logError } = await (supabase.from('mt_gamification_xp_log') as any)
        .insert({
          tenant_id: tenant.id,
          user_id: targetUserId,
          amount,
          source,
          source_id: sourceId || null,
          descricao: descricao || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      // 2. Get or create profile
      let { data: profile } = await (supabase.from('mt_gamification_profiles') as any)
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!profile) {
        // Create profile
        const { data: newProfile, error: createErr } = await (supabase.from('mt_gamification_profiles') as any)
          .insert({
            tenant_id: tenant.id,
            franchise_id: franchise?.id || null,
            user_id: targetUserId,
            total_xp: 0,
            level: 1,
            rank_name: 'Novato',
            current_streak: 0,
            longest_streak: 0,
            total_lessons_completed: 0,
            total_modules_completed: 0,
            total_tracks_completed: 0,
            total_quizzes_passed: 0,
            total_perfect_quizzes: 0,
            total_certificates: 0,
            total_study_time_min: 0,
            weekly_xp: 0,
            monthly_xp: 0,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        profile = newProfile;
      }

      // 3. Update total_xp, weekly_xp, monthly_xp
      const newTotalXP = (profile.total_xp || 0) + amount;
      const newWeeklyXP = (profile.weekly_xp || 0) + amount;
      const newMonthlyXP = (profile.monthly_xp || 0) + amount;

      // Also update activity-specific counters
      const counterUpdates: any = {};
      if (source === 'lesson_complete') {
        counterUpdates.total_lessons_completed = (profile.total_lessons_completed || 0) + 1;
      } else if (source === 'module_complete') {
        counterUpdates.total_modules_completed = (profile.total_modules_completed || 0) + 1;
      } else if (source === 'track_complete') {
        counterUpdates.total_tracks_completed = (profile.total_tracks_completed || 0) + 1;
      } else if (source === 'quiz_pass') {
        counterUpdates.total_quizzes_passed = (profile.total_quizzes_passed || 0) + 1;
      } else if (source === 'quiz_perfect') {
        counterUpdates.total_perfect_quizzes = (profile.total_perfect_quizzes || 0) + 1;
      }

      // 4. Check level up
      const { data: levels } = await (supabase.from('mt_gamification_levels') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('level', { ascending: true });

      let newLevel = profile.level || 1;
      let newRankName = profile.rank_name || 'Novato';
      let leveledUp = false;

      if (levels && levels.length > 0) {
        // Find the highest level the user qualifies for
        for (const level of levels) {
          if (newTotalXP >= level.xp_required && level.level > newLevel) {
            newLevel = level.level;
            newRankName = level.nome;
            leveledUp = true;
          }
        }
      }

      // 5. Update streak
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = profile.last_activity_date?.split('T')[0];
      let newStreak = profile.current_streak || 0;
      let longestStreak = profile.longest_streak || 0;

      if (lastActivity !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastActivity === yesterday) {
          newStreak += 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        }
        if (newStreak > longestStreak) {
          longestStreak = newStreak;
        }
      }

      // 6. Update profile
      const { error: updateErr } = await (supabase.from('mt_gamification_profiles') as any)
        .update({
          total_xp: newTotalXP,
          weekly_xp: newWeeklyXP,
          monthly_xp: newMonthlyXP,
          level: newLevel,
          rank_name: newRankName,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...counterUpdates,
        })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      return {
        xpLog: xpLog as MTGamificationXPLog,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        newRank: leveledUp ? newRankName : undefined,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
      queryClient.invalidateQueries({ queryKey: [XP_HISTORY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LEADERBOARD_KEY] });

      if (result.leveledUp) {
        toast.success(`Level UP! Agora você é ${result.newRank} (Nível ${result.newLevel})!`);
      }
    },
    onError: (error: any) => {
      console.error('Erro ao conceder XP:', error);
    },
  });
}

// ============================================================
// useAwardBadge - Conceder badge ao usuário
// ============================================================

export function useAwardBadge() {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      badgeId,
      userId,
    }: {
      badgeId: string;
      userId?: string;
    }): Promise<MTGamificationUserBadge> => {
      if (!tenant?.id) throw new Error('Tenant não definido.');

      const targetUserId = userId || user?.id;
      if (!targetUserId) throw new Error('Usuário não definido.');

      // Check if already earned
      const { data: existing } = await (supabase.from('mt_gamification_user_badges') as any)
        .select('id')
        .eq('user_id', targetUserId)
        .eq('badge_id', badgeId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('Badge já conquistada.');
      }

      // Award badge
      const { data, error } = await (supabase.from('mt_gamification_user_badges') as any)
        .insert({
          tenant_id: tenant.id,
          user_id: targetUserId,
          badge_id: badgeId,
          earned_at: new Date().toISOString(),
          notified: false,
        })
        .select(`
          *,
          badge:mt_gamification_badges(*)
        `)
        .single();

      if (error) throw error;
      return data as MTGamificationUserBadge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BADGES_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECENT_BADGES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });

      const badgeName = data.badge?.nome || 'Badge';
      toast.success(`Badge "${badgeName}" conquistada!`);
    },
    onError: (error: any) => {
      if (error?.message !== 'Badge já conquistada.') {
        toast.error(error?.message || 'Erro ao conceder badge.');
      }
    },
  });
}

// ============================================================
// useLevels - Todos os níveis de gamificação
// ============================================================

export function useLevels() {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [LEVELS_KEY, tenant?.id],
    queryFn: async (): Promise<MTGamificationLevel[]> => {
      if (!tenant?.id) return [];

      const { data, error } = await (supabase.from('mt_gamification_levels') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('level', { ascending: true });

      if (error) throw error;
      return (data || []) as MTGamificationLevel[];
    },
    enabled: !isTenantLoading && !!tenant,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  return {
    levels: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// useBadges - Todas as badges (com flag earned para o usuário)
// ============================================================

export function useBadges(categoria?: BadgeCategoria) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [BADGES_KEY, tenant?.id, user?.id, categoria],
    queryFn: async (): Promise<MTGamificationBadge[]> => {
      if (!tenant?.id || !user?.id) return [];

      // Buscar todas as badges
      let q = (supabase.from('mt_gamification_badges') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('raridade', { ascending: true })
        .order('nome', { ascending: true });

      if (categoria) {
        q = q.eq('categoria', categoria);
      }

      const { data: badges, error: badgesError } = await q;
      if (badgesError) throw badgesError;

      // Buscar badges conquistadas pelo usuário
      const { data: earnedBadges, error: earnedError } = await (supabase.from('mt_gamification_user_badges') as any)
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      if (earnedError) throw earnedError;

      const earnedMap = new Map(
        (earnedBadges || []).map((eb: any) => [eb.badge_id, eb.earned_at])
      );

      return ((badges || []) as MTGamificationBadge[]).map((badge) => ({
        ...badge,
        earned: earnedMap.has(badge.id),
        earned_at: earnedMap.get(badge.id) || undefined,
      }));
    },
    enabled: !isTenantLoading && !!tenant && !!user?.id,
  });

  return {
    badges: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// useLeaderboard - Ranking
// ============================================================

export function useLeaderboard(periodo: LeaderboardPeriodo = 'total') {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [LEADERBOARD_KEY, tenant?.id, franchise?.id, periodo],
    queryFn: async (): Promise<MTLeaderboardEntry[]> => {
      if (!tenant?.id) return [];

      let q = (supabase.from('mt_gamification_leaderboard') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('periodo', periodo)
        .order('xp', { ascending: false })
        .limit(100);

      if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Atribuir posição
      return ((data || []) as MTLeaderboardEntry[]).map((entry, index) => ({
        ...entry,
        posicao: index + 1,
      }));
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// useXPHistory - Histórico de XP do usuário
// ============================================================

export function useXPHistory(limit: number = 50) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [XP_HISTORY_KEY, tenant?.id, user?.id, limit],
    queryFn: async (): Promise<MTGamificationXPLog[]> => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.from('mt_gamification_xp_log') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as MTGamificationXPLog[];
    },
    enabled: !isTenantLoading && !!tenant && !!user?.id,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

// ============================================================
// useRecentBadges - Badges recentes do usuário
// ============================================================

export function useRecentBadges(limit: number = 5) {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: [RECENT_BADGES_KEY, tenant?.id, user?.id, limit],
    queryFn: async (): Promise<MTGamificationUserBadge[]> => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.from('mt_gamification_user_badges') as any)
        .select('*, badge:mt_gamification_badges(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as MTGamificationUserBadge[];
    },
    enabled: !isTenantLoading && !!tenant && !!user?.id,
  });

  return {
    recentBadges: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    refetch: query.refetch,
  };
}

export default useGamificationProfile;
