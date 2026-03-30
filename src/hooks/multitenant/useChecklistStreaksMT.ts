import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para gerenciar streaks de checklist (dias consecutivos 100%).
 * Usa tabela mt_checklist_streaks.
 */
export function useChecklistStreaksMT() {
  const { tenant, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: meu streak atual
  const myStreak = useQuery({
    queryKey: ['mt-checklist-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase
        .from('mt_checklist_streaks') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ChecklistStreak | null;
    },
    enabled: !isTenantLoading && !!user?.id,
  });

  // Mutation: atualizar streak após checklist 100% concluído
  const updateStreak = useMutation({
    mutationFn: async (userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId || !tenant?.id) throw new Error('Contexto não carregado');

      const today = new Date().toISOString().split('T')[0];

      // Buscar streak existente
      const { data: existing } = await (supabase
        .from('mt_checklist_streaks') as any)
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existing) {
        // Se já contou hoje, noop
        if (existing.ultimo_dia_completo === today) {
          return { streak: existing, isNew: false, milestone: null };
        }

        // Calcular se é dia consecutivo
        const lastDate = new Date(existing.ultimo_dia_completo);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak: number;
        if (diffDays === 1) {
          // Dia consecutivo — incrementar
          newStreak = (existing.streak_atual || 0) + 1;
        } else {
          // Gap — resetar para 1
          newStreak = 1;
        }

        const melhorStreak = Math.max(newStreak, existing.melhor_streak || 0);
        const milestone = checkMilestone(newStreak);

        const { data, error } = await (supabase
          .from('mt_checklist_streaks') as any)
          .update({
            streak_atual: newStreak,
            melhor_streak: melhorStreak,
            ultimo_dia_completo: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { streak: data, isNew: false, milestone };
      } else {
        // Criar novo registro
        const { data, error } = await (supabase
          .from('mt_checklist_streaks') as any)
          .insert({
            tenant_id: tenant.id,
            user_id: targetUserId,
            streak_atual: 1,
            melhor_streak: 1,
            ultimo_dia_completo: today,
          })
          .select()
          .single();

        if (error) throw error;
        return { streak: data, isNew: true, milestone: null };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-checklist-streak'] });
      if (result?.milestone) {
        toast.success(`🔥 ${result.milestone} dias consecutivos! Continue assim!`, { duration: 5000 });
      } else if (result?.isNew || result?.streak?.streak_atual === 1) {
        toast.success('Checklist 100% concluído! Streak iniciado!', { duration: 3000 });
      }
    },
  });

  return {
    myStreak: myStreak.data,
    isLoading: myStreak.isLoading,
    updateStreak,
  };
}

function checkMilestone(streak: number): number | null {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  return milestones.includes(streak) ? streak : null;
}

interface ChecklistStreak {
  id: string;
  tenant_id: string;
  user_id: string;
  template_id: string | null;
  streak_atual: number;
  melhor_streak: number;
  ultimo_dia_completo: string;
  created_at: string;
  updated_at: string;
}
