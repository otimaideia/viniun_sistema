import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

export interface RecordCounts {
  leads: number;
  conversations: number;
  appointments: number;
  funnel_leads: number;
  goals: number;
  queue_entries: number;
  total: number;
}

export interface TransferResult {
  leads: number;
  conversations: number;
  appointments: number;
  funnel_leads: number;
  goals: number;
  queue_removed: number;
  total: number;
  from_user: string;
  to_user: string;
}

export interface TransferOptions {
  fromUserId: string;
  toUserId: string;
  transferLeads?: boolean;
  transferConversations?: boolean;
  transferAppointments?: boolean;
  transferFunnel?: boolean;
  transferGoals?: boolean;
}

export function useTransferUserRecords() {
  const { tenant, user: mtUser } = useTenantContext();
  const queryClient = useQueryClient();
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Contar registros vinculados a um usuário
  const getRecordCounts = async (userId: string): Promise<RecordCounts> => {
    setIsLoadingCounts(true);
    try {
      const { data, error } = await supabase.rpc('count_user_records', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as RecordCounts;
    } catch (error: any) {
      console.error('Erro ao contar registros:', error);
      // Fallback: contar manualmente via queries individuais
      return await countRecordsManually(userId);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  // Fallback manual caso a RPC falhe (ex: permissões)
  const countRecordsManually = async (userId: string): Promise<RecordCounts> => {
    const counts: RecordCounts = {
      leads: 0,
      conversations: 0,
      appointments: 0,
      funnel_leads: 0,
      goals: 0,
      queue_entries: 0,
      total: 0,
    };

    try {
      // Contar leads
      const { count: leadsCount } = await supabase
        .from('mt_leads')
        .select('*', { count: 'exact', head: true })
        .eq('atribuido_para', userId)
        .is('deleted_at', null);
      counts.leads = leadsCount || 0;

      // Contar conversas WhatsApp abertas
      const { count: convsCount } = await supabase
        .from('mt_whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .neq('status', 'closed');
      counts.conversations = convsCount || 0;

      // Contar agendamentos futuros
      const { count: aptsCount } = await supabase
        .from('mt_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('profissional_id', userId)
        .gte('data_agendamento', new Date().toISOString().split('T')[0]);
      counts.appointments = aptsCount || 0;

      // Contar leads no funil
      const { count: funnelCount } = await supabase
        .from('mt_funnel_leads')
        .select('*', { count: 'exact', head: true })
        .eq('responsavel_id', userId);
      counts.funnel_leads = funnelCount || 0;

      // Contar metas ativas
      const { count: goalsCount } = await supabase
        .from('mt_goals')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['active', 'in_progress', 'ativa']);
      counts.goals = goalsCount || 0;

      counts.total =
        counts.leads +
        counts.conversations +
        counts.appointments +
        counts.funnel_leads +
        counts.goals;
    } catch (error) {
      console.error('Erro no fallback de contagem:', error);
    }

    return counts;
  };

  // Executar transferência
  const transferMutation = useMutation({
    mutationFn: async (options: TransferOptions): Promise<TransferResult> => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data, error } = await supabase.rpc('transfer_user_records', {
        p_from_user_id: options.fromUserId,
        p_to_user_id: options.toUserId,
        p_tenant_id: tenant.id,
        p_transfer_leads: options.transferLeads ?? true,
        p_transfer_conversations: options.transferConversations ?? true,
        p_transfer_appointments: options.transferAppointments ?? true,
        p_transfer_funnel: options.transferFunnel ?? true,
        p_transfer_goals: options.transferGoals ?? true,
        p_performed_by: mtUser?.id || null,
      });

      if (error) throw error;
      return data as TransferResult;
    },
    onSuccess: (result) => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['mt-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-leads'] });
      queryClient.invalidateQueries({ queryKey: ['mt-goals'] });
      queryClient.invalidateQueries({ queryKey: ['responsible-users'] });

      const parts: string[] = [];
      if (result.leads > 0) parts.push(`${result.leads} lead(s)`);
      if (result.conversations > 0) parts.push(`${result.conversations} conversa(s)`);
      if (result.appointments > 0) parts.push(`${result.appointments} agendamento(s)`);
      if (result.funnel_leads > 0) parts.push(`${result.funnel_leads} lead(s) no funil`);
      if (result.goals > 0) parts.push(`${result.goals} meta(s)`);

      toast.success(
        `Transferidos ${result.total} registros para ${result.to_user}: ${parts.join(', ')}`
      );
    },
    onError: (error: any) => {
      console.error('Erro na transferência:', error);
      toast.error(`Erro ao transferir registros: ${error.message}`);
    },
  });

  // Buscar usuários ativos do mesmo tenant (para dropdown de destino)
  const getActiveUsers = async (excludeUserId: string) => {
    if (!tenant) return [];

    const { data, error } = await supabase
      .from('mt_users')
      .select('id, nome, email, access_level, franchise_id, franchise:mt_franchises(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .neq('id', excludeUserId)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }

    return data || [];
  };

  return {
    getRecordCounts,
    getActiveUsers,
    transfer: transferMutation.mutateAsync,
    isTransferring: transferMutation.isPending,
    isLoadingCounts,
  };
}
