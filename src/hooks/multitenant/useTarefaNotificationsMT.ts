// =============================================================================
// Hook: useTarefaNotificationsMT
// =============================================================================
// Envia notificações WhatsApp quando tarefas são criadas ou mudam de status.
// Respeita as configurações de mt_task_config (notif_whatsapp_enabled, etc).
// =============================================================================

import { useCallback, useRef } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { useTarefaConfigMT } from './useTarefaConfigMT';
import type { MTTask, TaskStatus, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/tarefa';

// Labels inline para não depender de import circular
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aguardando: 'Aguardando',
  concluida: 'Concluída',
  finalizada: 'Finalizada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: '🔴 Urgente',
};

// Tipo de evento de notificação
type TaskNotifEvent = 'criacao' | 'status_change' | 'comment' | 'completion' | 'overdue';

interface SendNotifParams {
  event: TaskNotifEvent;
  task: MTTask;
  assigneeIds: string[];
  delegatorName?: string;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  notes?: string;
}

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 15) return null;
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'Sem prazo';
  const d = new Date(dueDate);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useTarefaNotificationsMT() {
  const { tenant, franchise } = useTenantContext();
  const { config, defaults } = useTarefaConfigMT();
  // Avoid duplicate sends within same render cycle
  const sendingRef = useRef<Set<string>>(new Set());

  // Get effective config (saved or defaults)
  const getConfig = useCallback(() => {
    return {
      whatsappEnabled: config?.notif_whatsapp_enabled ?? defaults.notif_whatsapp_enabled,
      onCriacao: config?.notif_on_criacao ?? defaults.notif_on_criacao,
      onStatusChange: config?.notif_on_status_change ?? defaults.notif_on_status_change,
      onComment: config?.notif_on_comment ?? defaults.notif_on_comment,
      onCompletion: config?.notif_on_completion ?? defaults.notif_on_completion,
      onOverdue: config?.notif_on_overdue ?? defaults.notif_on_overdue,
      whatsappCC: config?.notif_whatsapp_cc || [],
    };
  }, [config, defaults]);

  // Check if event should trigger notification
  const shouldNotify = useCallback((event: TaskNotifEvent): boolean => {
    const cfg = getConfig();
    if (!cfg.whatsappEnabled) return false;

    switch (event) {
      case 'criacao': return cfg.onCriacao;
      case 'status_change': return cfg.onStatusChange;
      case 'comment': return cfg.onComment;
      case 'completion': return cfg.onCompletion;
      case 'overdue': return cfg.onOverdue;
      default: return false;
    }
  }, [getConfig]);

  // Build task URL (uses current origin — works in both dev and production)
  const getTaskUrl = useCallback((taskId: string): string => {
    return `${window.location.origin}/tarefas/${taskId}`;
  }, []);

  // Build message text based on event
  const buildMessage = useCallback((params: SendNotifParams, recipientName: string): string => {
    const { event, task, delegatorName, oldStatus, newStatus, notes } = params;
    const prioLabel = PRIORITY_LABELS[task.prioridade] || task.prioridade;
    const dueStr = formatDueDate(task.due_date);
    const taskUrl = getTaskUrl(task.id);

    switch (event) {
      case 'criacao':
        return `📋 *Nova Tarefa Atribuída*

Olá, *${recipientName}*!

Você recebeu uma nova tarefa:
📌 *${task.titulo}*
${task.descricao ? `\n📝 ${task.descricao.substring(0, 200)}${task.descricao.length > 200 ? '...' : ''}` : ''}

⚡ Prioridade: *${prioLabel}*
📅 Prazo: *${dueStr}*
👤 Delegada por: *${delegatorName || 'Admin'}*

👉 Acesse a tarefa: ${taskUrl}`;

      case 'status_change':
        return `🔄 *Tarefa Atualizada*

A tarefa *"${task.titulo}"* mudou de status:
▪️ De: ${STATUS_LABELS[oldStatus || ''] || oldStatus}
▪️ Para: *${STATUS_LABELS[newStatus || ''] || newStatus}*
${notes ? `\n💬 Observação: ${notes}` : ''}

📅 Prazo: *${dueStr}*

👉 Ver tarefa: ${taskUrl}`;

      case 'completion':
        return `✅ *Tarefa Concluída*

A tarefa *"${task.titulo}"* foi marcada como concluída e aguarda conferência.
${notes ? `\n💬 Observação: ${notes}` : ''}

👉 Conferir tarefa: ${taskUrl}`;

      case 'comment':
        return `💬 *Novo Comentário na Tarefa*

Há um novo comentário na tarefa *"${task.titulo}"*.
${notes ? `\n"${notes.substring(0, 300)}"` : ''}

👉 Ver comentário: ${taskUrl}`;

      case 'overdue':
        return `⚠️ *Tarefa Atrasada*

A tarefa *"${task.titulo}"* está atrasada!
📅 Prazo era: *${dueStr}*
⚡ Prioridade: *${prioLabel}*

👉 Atualizar tarefa: ${taskUrl}`;

      default:
        return `📋 Atualização na tarefa: *${task.titulo}*

👉 ${taskUrl}`;
    }
  }, [getTaskUrl]);

  // Get active WAHA session - prioriza sessão padrão da franchise/tenant
  const getActiveSession = useCallback(async (): Promise<string | null> => {
    try {
      // 1. Sessão padrão (is_default) working da franchise
      if (franchise?.id) {
        const { data: defaultFranchise } = await (supabase
          .from('mt_whatsapp_sessions') as any)
          .select('session_name')
          .eq('franchise_id', franchise.id)
          .eq('is_default', true)
          .eq('status', 'working')
          .limit(1);

        if (defaultFranchise && defaultFranchise.length > 0) {
          console.log('[TarefaNotif] Usando sessão padrão da franquia:', defaultFranchise[0].session_name);
          return defaultFranchise[0].session_name;
        }
      }

      // 2. Sessão padrão (is_default) working do tenant
      if (tenant?.id) {
        const { data: defaultTenant } = await (supabase
          .from('mt_whatsapp_sessions') as any)
          .select('session_name')
          .eq('tenant_id', tenant.id)
          .eq('is_default', true)
          .eq('status', 'working')
          .limit(1);

        if (defaultTenant && defaultTenant.length > 0) {
          console.log('[TarefaNotif] Usando sessão padrão do tenant:', defaultTenant[0].session_name);
          return defaultTenant[0].session_name;
        }
      }

      // 3. Qualquer sessão working da franchise (prioriza por nome "campanhas")
      if (franchise?.id) {
        const { data: franchiseSessions } = await (supabase
          .from('mt_whatsapp_sessions') as any)
          .select('session_name')
          .eq('franchise_id', franchise.id)
          .eq('status', 'working')
          .order('session_name', { ascending: true });

        if (franchiseSessions && franchiseSessions.length > 0) {
          // Preferir sessão com "campanha" no nome
          const campanhaSession = franchiseSessions.find(
            (s: { session_name: string }) => s.session_name.toLowerCase().includes('campanha')
          );
          const chosen = campanhaSession || franchiseSessions[0];
          console.log('[TarefaNotif] Usando sessão da franquia:', chosen.session_name);
          return chosen.session_name;
        }
      }

      // 4. Qualquer sessão working do tenant
      if (tenant?.id) {
        const { data: tenantSessions } = await (supabase
          .from('mt_whatsapp_sessions') as any)
          .select('session_name')
          .eq('tenant_id', tenant.id)
          .eq('status', 'working')
          .order('session_name', { ascending: true });

        if (tenantSessions && tenantSessions.length > 0) {
          const campanhaSession = tenantSessions.find(
            (s: { session_name: string }) => s.session_name.toLowerCase().includes('campanha')
          );
          const chosen = campanhaSession || tenantSessions[0];
          console.log('[TarefaNotif] Usando sessão do tenant:', chosen.session_name);
          return chosen.session_name;
        }
      }

      console.warn('[TarefaNotif] Nenhuma sessão WhatsApp ativa encontrada');
      return null;
    } catch (err) {
      console.error('[TarefaNotif] Erro ao buscar sessão WAHA:', err);
      return null;
    }
  }, [tenant?.id, franchise?.id]);

  // Get phone numbers for assignees
  const getAssigneePhones = useCallback(async (
    assigneeIds: string[]
  ): Promise<Array<{ userId: string; nome: string; phone: string }>> => {
    if (assigneeIds.length === 0) return [];

    try {
      const { data: users } = await (supabase
        .from('mt_users') as any)
        .select('id, nome, telefone, whatsapp')
        .in('id', assigneeIds);

      if (!users) return [];

      return users
        .map((u: { id: string; nome: string; telefone: string | null; whatsapp: string | null }) => {
          const phone = cleanPhone(u.whatsapp) || cleanPhone(u.telefone);
          return phone ? { userId: u.id, nome: u.nome, phone } : null;
        })
        .filter(Boolean) as Array<{ userId: string; nome: string; phone: string }>;
    } catch (err) {
      console.error('[TarefaNotif] Erro ao buscar telefones:', err);
      return [];
    }
  }, []);

  // Main send function (fire-and-forget, non-blocking)
  const sendNotification = useCallback(async (params: SendNotifParams) => {
    const { event, task, assigneeIds } = params;

    // Check if this event should trigger notification
    if (!shouldNotify(event)) {
      console.log(`[TarefaNotif] Notificação ${event} desabilitada na config`);
      return;
    }

    // Dedup key
    const dedupKey = `${task.id}-${event}-${Date.now()}`;
    if (sendingRef.current.has(dedupKey)) return;
    sendingRef.current.add(dedupKey);

    try {
      // Get active WAHA session
      const sessionName = await getActiveSession();
      if (!sessionName) {
        console.warn('[TarefaNotif] Nenhuma sessão WhatsApp ativa');
        return;
      }

      // Get assignee phones
      const assigneePhones = await getAssigneePhones(assigneeIds);

      // Get CC phones from config
      const cfg = getConfig();
      const ccPhones = (cfg.whatsappCC || [])
        .map((p: string) => cleanPhone(p))
        .filter(Boolean) as string[];

      // Build list of all recipients (assignees + CC)
      const recipients: Array<{ phone: string; nome: string }> = [
        ...assigneePhones.map(a => ({ phone: a.phone, nome: a.nome })),
        ...ccPhones.map(p => ({ phone: p, nome: 'Gestor' })),
      ];

      // Remove duplicates by phone
      const uniqueRecipients = recipients.filter(
        (r, i, arr) => arr.findIndex(a => a.phone === r.phone) === i
      );

      if (uniqueRecipients.length === 0) {
        console.warn('[TarefaNotif] Nenhum destinatário com telefone válido');
        return;
      }

      console.log(`[TarefaNotif] Enviando ${event} para ${uniqueRecipients.length} destinatário(s)`);

      // Send to each recipient
      const results = await Promise.allSettled(
        uniqueRecipients.map(async (recipient) => {
          const chatId = `${recipient.phone}@c.us`;
          const message = buildMessage(params, recipient.nome);

          const result = await wahaClient.sendText(sessionName, chatId, message);

          if (!result.success) {
            console.error(`[TarefaNotif] Falha ao enviar para ${recipient.phone}:`, result.error);
          } else {
            console.log(`[TarefaNotif] ✅ Enviado para ${recipient.nome} (${recipient.phone})`);
          }

          return result;
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.success).length;
      console.log(`[TarefaNotif] ${successCount}/${uniqueRecipients.length} mensagens enviadas`);
    } catch (err) {
      console.error('[TarefaNotif] Erro geral:', err);
    } finally {
      // Clean up dedup after 5s
      setTimeout(() => sendingRef.current.delete(dedupKey), 5000);
    }
  }, [shouldNotify, getActiveSession, getAssigneePhones, getConfig, buildMessage]);

  // Convenience methods
  const notifyTaskCreated = useCallback((
    task: MTTask,
    assigneeIds: string[],
    delegatorName?: string
  ) => {
    sendNotification({
      event: 'criacao',
      task,
      assigneeIds,
      delegatorName,
    });
  }, [sendNotification]);

  const notifyStatusChange = useCallback((
    task: MTTask,
    assigneeIds: string[],
    oldStatus: TaskStatus,
    newStatus: TaskStatus,
    notes?: string
  ) => {
    // For completion, send specific notification to delegator
    const event: TaskNotifEvent = newStatus === 'concluida' ? 'completion' : 'status_change';

    // Include delegator in recipients for completion
    const recipientIds = newStatus === 'concluida'
      ? [...assigneeIds, task.delegated_by]
      : assigneeIds;

    sendNotification({
      event,
      task,
      assigneeIds: [...new Set(recipientIds)],
      oldStatus,
      newStatus,
      notes,
    });
  }, [sendNotification]);

  const notifyComment = useCallback((
    task: MTTask,
    assigneeIds: string[],
    commentText?: string
  ) => {
    sendNotification({
      event: 'comment',
      task,
      assigneeIds: [...new Set([...assigneeIds, task.delegated_by])],
      notes: commentText,
    });
  }, [sendNotification]);

  return {
    sendNotification,
    notifyTaskCreated,
    notifyStatusChange,
    notifyComment,
    shouldNotify,
  };
}
