// =============================================================================
// USE WHATSAPP CHAT ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para chat do WhatsApp usando tabelas MT
// Compõe useWhatsAppConversationsMT e useWhatsAppMessagesMT
// SISTEMA 100% MT - Usa diretamente tabelas mt_whatsapp_*
//
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { wahaApi, generateDefaultAvatar } from '@/services/waha-api';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { sanitizeObjectForJSON, sanitizeForJSON } from '@/utils/unicodeSanitizer';
import { extractContactName, isPhoneNumber, shouldUpdateContactName } from '@/utils/whatsapp/extractors';
import { getNextResponsible, getSessionRoundRobinConfig, type RoundRobinConfig } from '@/services/roundRobinService';
import { useWhatsAppHybridConfigMT } from '@/hooks/multitenant/useWhatsAppHybridConfigMT';
import { useWhatsAppRouterMT } from '@/hooks/multitenant/useWhatsAppRouterMT';
import { useWhatsAppWindowMT } from '@/hooks/multitenant/useWhatsAppWindowsMT';
import type { WhatsAppConversa, WhatsAppMensagem } from '@/types/whatsapp-chat';
import {
  type DbConversaMT,
  type DbMensagemMT,
  type DbConversaLabel,
  getAbsoluteMediaUrl,
  extractSyncMessageType,
  extractSyncMessageBody,
  extractPhoneFromChatId,
  mapConversaMTToLegacy,
  mapMensagemMTToLegacy,
  downloadAndStoreMedia,
  downloadAndStoreContactAvatar,
  filterValidUUIDs,
} from '@/hooks/multitenant/whatsapp-utils';

// Types importados de @/hooks/multitenant/whatsapp-utils

interface SyncProgress {
  isRunning: boolean;
  currentChat: number;
  totalChats: number;
  currentMessages: number;
  totalMessages: number;
  phase: 'idle' | 'chats' | 'messages' | 'complete';
}

// Helpers importados de @/hooks/multitenant/whatsapp-utils:
// downloadAndStoreMedia, downloadAndStoreContactAvatar, getAbsoluteMediaUrl

// Mappers e extractors importados de @/hooks/multitenant/whatsapp-utils:
// extractSyncMessageType, extractSyncMessageBody, extractPhoneFromChatId,
// mapConversaMTToLegacy, mapMensagemMTToLegacy

// =============================================================================
// Hook Principal
// =============================================================================

export function useWhatsAppChatAdapter(sessionName: string | null, sessaoId: string | null) {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // === SISTEMA HÍBRIDO (WAHA + Meta Cloud API) ===
  // Config híbrida do tenant - controla se roteamento está ativo
  const { isHybridEnabled, config: hybridConfig } = useWhatsAppHybridConfigMT();

  // State
  const [chats, setChats] = useState<WhatsAppConversa[]>([]);
  const [messages, setMessages] = useState<WhatsAppMensagem[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedConversaId, setSelectedConversaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Key para forçar re-subscription do real-time quando canal fecha/erro
  const [rtReconnectKey, setRtReconnectKey] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isRunning: false,
    currentChat: 0,
    totalChats: 0,
    currentMessages: 0,
    totalMessages: 0,
    phase: 'idle',
  });

  // Refs
  const isMountedRef = useRef(true);
  const syncCancelledRef = useRef(false);

  // Play notification sound for incoming messages
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.debug('[WhatsApp] AudioContext indisponivel para notificacao:', err);
    }
  }, []);
  const currentSessaoIdRef = useRef<string | null>(sessaoId);
  const profileRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // null = sessão compartilhada (atendimento_principal), string = tem responsável
  const sessionResponsibleUserIdRef = useRef<string | null | undefined>(undefined);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (profileRefreshTimerRef.current) {
        clearTimeout(profileRefreshTimerRef.current);
        profileRefreshTimerRef.current = null;
      }
    };
  }, []);

  // Track session changes
  useEffect(() => {
    const oldSessaoId = currentSessaoIdRef.current;
    currentSessaoIdRef.current = sessaoId;
    if (oldSessaoId !== sessaoId && oldSessaoId !== null) {
      syncCancelledRef.current = true;
    }
    // Reset responsible_user_id ao trocar de sessão (será recarregado pelo loadWahaConfig)
    sessionResponsibleUserIdRef.current = undefined;
  }, [sessaoId]);

  // Load WAHA config from MT table
  useEffect(() => {
    const loadWahaConfig = async () => {
      if (!tenant && accessLevel !== 'platform') return;

      try {
        // Buscar config da sessão (somente se sessaoId estiver definido)
        if (sessaoId) {
          const { data } = await supabase
            .from('mt_whatsapp_sessions')
            .select('waha_url, waha_api_key, responsible_user_id')
            .eq('id', sessaoId)
            .maybeSingle();

          // Guardar responsible_user_id para saber se é sessão compartilhada
          if (data) {
            sessionResponsibleUserIdRef.current = data.responsible_user_id ?? null;
          }

          if (data?.waha_url && data?.waha_api_key) {
            wahaApi.setConfig(data.waha_url, data.waha_api_key);
            return; // Config encontrada, não precisa do fallback
          }
        }

        // Fallback para config global do tenant via mt_waha_config
        if (tenant?.id) {
          const { data: wahaConfig } = await supabase
            .from('mt_waha_config')
            .select('api_url, api_key')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          if (wahaConfig?.api_url && wahaConfig?.api_key) {
            wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key);
          }
        }
      } catch (err) {
        console.error('[useWhatsAppChatAdapter] Erro ao carregar config WAHA:', err);
      }
    };

    loadWahaConfig();
  }, [sessaoId, tenant, accessLevel]);

  // Select padrão para conversas com labels
  const CONVERSATION_SELECT = '*, conversation_labels:mt_whatsapp_conversation_labels(label:mt_whatsapp_labels(id, name, color)), lead:mt_leads(nome, atribuido_para)';

  // Helper: ordenar conversas — fixadas primeiro, depois por last_message_at DESC
  const sortChats = (chatsArr: WhatsAppConversa[]): WhatsAppConversa[] =>
    [...chatsArr].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

  // ==========================================================================
  // Fetch Chats from MT database
  // ==========================================================================
  const fetchChats = useCallback(async (options?: { silent?: boolean }) => {
    if (!sessaoId) return;
    if (!tenant && accessLevel !== 'platform') return;

    if (!options?.silent) setIsLoadingChats(true);
    if (!options?.silent) setError(null);

    try {
      let query = supabase
        .from('mt_whatsapp_conversations')
        .select(CONVERSATION_SELECT)
        .eq('session_id', sessaoId)
        .order('is_pinned', { ascending: false, nullsFirst: false })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(51); // Carregar 51 para detectar se há mais (50 + 1 sentinel)

      // Filtro por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'user' && tenant) {
        query = query.eq('tenant_id', tenant.id);
        if (franchise) query = query.eq('franchise_id', franchise.id);

        // Filtrar por sessões permitidas OU conversas atribuídas ao usuário
        if (user?.id) {
          const { data: userSessions } = await supabase
            .from('mt_whatsapp_user_sessions')
            .select('whatsapp_session_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const permittedSessionIds = (userSessions || [])
            .map((us: any) => us.whatsapp_session_id)
            .filter((id: string) => id && UUID_RE.test(id));

          if (permittedSessionIds.length > 0 && UUID_RE.test(user.id)) {
            query = query.or(`session_id.in.(${permittedSessionIds.join(',')}),assigned_to.eq.${user.id}`);
          } else {
            console.warn('[WhatsApp] Usuário sem permissões explícitas - mostrando todas do tenant');
          }
        }
      }

      const { data: conversas, error: dbError } = await query;

      if (dbError) throw dbError;
      if (!isMountedRef.current) return;

      // Buscar nomes dos responsáveis (assigned_to + atribuido_para do lead)
      const UUID_VALIDATE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const assignedIds = [...new Set((conversas || []).map((c: any) => c.assigned_to).filter((id: string) => id && UUID_VALIDATE.test(id)))];
      const leadResponsavelIds = [...new Set((conversas || []).map((c: any) => c.lead?.atribuido_para).filter((id: string) => id && UUID_VALIDATE.test(id)))];
      const allUserIds = [...new Set([...assignedIds, ...leadResponsavelIds])];
      let userNameMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('mt_users')
          .select('id, auth_user_id, nome')
          .or(`auth_user_id.in.(${allUserIds.join(',')}),id.in.(${allUserIds.join(',')})`);
        if (users) {
          for (const u of users) {
            if (u.auth_user_id) userNameMap[u.auth_user_id] = u.nome;
            if (u.id) userNameMap[u.id] = u.nome;
          }
        }
      }

      // Detectar se há mais conversas (sentinel pattern: pedimos 51, mostramos 50)
      const PAGE_SIZE = 50;
      const allConversas = conversas as DbConversaMT[] || [];
      const hasMore = allConversas.length > PAGE_SIZE;
      const displayConversas = hasMore ? allConversas.slice(0, PAGE_SIZE) : allConversas;
      setHasMoreChats(hasMore);

      const mappedChats = displayConversas.map(c => {
        const mapped = mapConversaMTToLegacy(c);
        if (mapped.assigned_to && userNameMap[mapped.assigned_to]) {
          mapped.assigned_user_name = userNameMap[mapped.assigned_to];
        }
        // Fallback: responsável do lead associado
        if (!mapped.assigned_user_name) {
          const leadResponsavel = (c as any).lead?.atribuido_para;
          if (leadResponsavel && userNameMap[leadResponsavel]) {
            mapped.assigned_user_name = userNameMap[leadResponsavel];
          }
        }
        return mapped;
      });
      // Dedup: mesmo telefone com chat_ids diferentes (@c.us, @lid, @s.whatsapp.net)
      const phoneSeen = new Map<string, WhatsAppConversa>();
      for (const chat of mappedChats) {
        const rawPhone = chat.numero_telefone?.replace(/\D/g, '') || '';
        const phoneKey = rawPhone.length >= 10 ? rawPhone.slice(-10) : chat.id; // ultimos 10 digitos
        const existing = phoneSeen.get(phoneKey);
        if (!existing) {
          phoneSeen.set(phoneKey, chat);
        } else {
          const existT = existing.ultima_mensagem_at ? new Date(existing.ultima_mensagem_at).getTime() : 0;
          const newT = chat.ultima_mensagem_at ? new Date(chat.ultima_mensagem_at).getTime() : 0;
          if (newT > existT) phoneSeen.set(phoneKey, chat);
        }
      }
      const dedupedChats = Array.from(phoneSeen.values());
      setChats(sortChats(dedupedChats));
    } catch (err) {
      console.error('[fetchChats MT] Erro:', err);
      if (isMountedRef.current && !options?.silent) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar conversas');
      }
    } finally {
      if (isMountedRef.current && !options?.silent) setIsLoadingChats(false);
    }
  }, [sessaoId, tenant, franchise, accessLevel, user]);

  // ==========================================================================
  // Load More Chats (pagination)
  // ==========================================================================
  const loadMoreChats = useCallback(async () => {
    if (!sessaoId || !hasMoreChats || isLoadingMoreChats) return;
    if (!tenant && accessLevel !== 'platform') return;

    setIsLoadingMoreChats(true);
    try {
      const lastChat = chats[chats.length - 1];
      if (!lastChat) return;

      const cursor = lastChat.ultima_mensagem_at || lastChat.updated_at || new Date(0).toISOString();

      let query = supabase
        .from('mt_whatsapp_conversations')
        .select(CONVERSATION_SELECT)
        .eq('session_id', sessaoId)
        .is('deleted_at', null)
        .not('last_message_at', 'is', null) // Evita loop infinito com NULLs
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .lt('last_message_at', cursor)
        .limit(51);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'user' && tenant) {
        query = query.eq('tenant_id', tenant.id);
        if (franchise) query = query.eq('franchise_id', franchise.id);
      }

      const { data: conversas, error: dbError } = await query;
      if (dbError) throw dbError;
      if (!isMountedRef.current) return;

      const PAGE_SIZE = 50;
      const allConversas = conversas as DbConversaMT[] || [];
      const hasMore = allConversas.length > PAGE_SIZE;
      const displayConversas = hasMore ? allConversas.slice(0, PAGE_SIZE) : allConversas;
      setHasMoreChats(hasMore);

      // Buscar nomes dos responsáveis (assigned_to + atribuido_para do lead)
      const UUID_VALIDATE2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const assignedIds = [...new Set(displayConversas.map((c: any) => c.assigned_to).filter((id: string) => id && UUID_VALIDATE2.test(id)))];
      const leadResponsavelIds = [...new Set(displayConversas.map((c: any) => c.lead?.atribuido_para).filter((id: string) => id && UUID_VALIDATE2.test(id)))];
      const allUserIds = [...new Set([...assignedIds, ...leadResponsavelIds])];
      let userNameMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('mt_users')
          .select('id, auth_user_id, nome')
          .or(`auth_user_id.in.(${allUserIds.join(',')}),id.in.(${allUserIds.join(',')})`);
        if (users) {
          for (const u of users) {
            if (u.auth_user_id) userNameMap[u.auth_user_id] = u.nome;
            if (u.id) userNameMap[u.id] = u.nome;
          }
        }
      }

      const newChats = displayConversas.map(c => {
        const mapped = mapConversaMTToLegacy(c);
        if (mapped.assigned_to && userNameMap[mapped.assigned_to]) {
          mapped.assigned_user_name = userNameMap[mapped.assigned_to];
        }
        // Fallback: responsável do lead associado
        if (!mapped.assigned_user_name) {
          const leadResponsavel = (c as any).lead?.atribuido_para;
          if (leadResponsavel && userNameMap[leadResponsavel]) {
            mapped.assigned_user_name = userNameMap[leadResponsavel];
          }
        }
        return mapped;
      });

      // Dedup ao combinar com chats existentes (mesmo telefone)
      setChats(prev => {
        const combined = [...prev, ...newChats];
        const phoneSeen = new Map<string, WhatsAppConversa>();
        for (const chat of combined) {
          const rawPhone = chat.numero_telefone?.replace(/\D/g, '') || '';
          const phoneKey = rawPhone.length >= 10 ? rawPhone.slice(-10) : chat.id;
          const existing = phoneSeen.get(phoneKey);
          if (!existing) {
            phoneSeen.set(phoneKey, chat);
          } else {
            const existT = existing.ultima_mensagem_at ? new Date(existing.ultima_mensagem_at).getTime() : 0;
            const newT = chat.ultima_mensagem_at ? new Date(chat.ultima_mensagem_at).getTime() : 0;
            if (newT > existT) phoneSeen.set(phoneKey, chat);
          }
        }
        return sortChats(Array.from(phoneSeen.values()));
      });
    } catch (err) {
      console.error('[loadMoreChats] Erro:', err);
    } finally {
      if (isMountedRef.current) setIsLoadingMoreChats(false);
    }
  }, [sessaoId, tenant, franchise, accessLevel, chats, hasMoreChats, isLoadingMoreChats]);

  // ==========================================================================
  // Background: Refresh profile pictures for top conversations
  // Runs after fetchChats to update stale/wrong avatars with real WAHA photos
  // ==========================================================================
  const refreshProfilePictures = useCallback(async () => {
    if (!sessaoId || !sessionName) return;

    try {
      // Buscar conversas sem foto real (apenas ui-avatars ou sem foto), não grupos, top 15 recentes
      const { data: staleConvs } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, chat_id, contact_name, contact_avatar')
        .eq('session_id', sessaoId)
        .eq('is_group', false)
        .or('contact_avatar.is.null,contact_avatar.like.https://ui-avatars.com%')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(15);

      if (!staleConvs || staleConvs.length === 0) return;

      // Processar em batches paralelos de 5 (em vez de sequencial com 500ms delay)
      const BATCH_SIZE = 5;
      for (let i = 0; i < staleConvs.length; i += BATCH_SIZE) {
        if (!isMountedRef.current) return;
        const batch = staleConvs.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map(async (conv) => {
            const picResult = await wahaClient.getProfilePicture(sessionName, conv.chat_id);
            if (picResult.success && picResult.data?.url) {
              let photoUrl = picResult.data.url;
              if (tenant?.id) {
                const storedUrl = await downloadAndStoreContactAvatar(photoUrl, tenant.id, sessaoId, conv.chat_id);
                if (storedUrl) photoUrl = storedUrl;
              }
              await supabase
                .from('mt_whatsapp_conversations')
                .update({ contact_avatar: photoUrl })
                .eq('id', conv.id);
              return { convId: conv.id, photoUrl };
            }
            return null;
          })
        );

        // Atualizar estado local com os resultados do batch
        if (isMountedRef.current) {
          const updates = results
            .filter((r): r is PromiseFulfilledResult<{ convId: string; photoUrl: string } | null> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(Boolean) as { convId: string; photoUrl: string }[];

          if (updates.length > 0) {
            setChats(prev => prev.map(c => {
              const update = updates.find(u => u.convId === c.id);
              return update ? { ...c, foto_url: update.photoUrl } : c;
            }));
          }
        }

        // Delay entre batches (200ms vs 500ms por request)
        if (i + BATCH_SIZE < staleConvs.length) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    } catch (err) { console.debug('[WhatsApp] Erro ao atualizar profile pictures:', err); }
  }, [sessaoId, sessionName, tenant]);

  // ==========================================================================
  // Fetch Messages from MT database
  // ==========================================================================
  const fetchMessages = useCallback(async (chatId: string) => {
    if (!chatId || !sessaoId) return;
    if (!tenant && accessLevel !== 'platform') return;

    setIsLoadingMessages(true);

    try {
      // Buscar conversa pelo chat_id
      let conversaQuery = supabase
        .from('mt_whatsapp_conversations')
        .select('id')
        .eq('session_id', sessaoId)
        .eq('chat_id', chatId);

      if (accessLevel === 'tenant' && tenant) {
        conversaQuery = conversaQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        conversaQuery = conversaQuery.eq('franchise_id', franchise.id);
      }

      const { data: conversa } = await conversaQuery.maybeSingle();

      if (!isMountedRef.current) return;

      if (!conversa) {
        setMessages([]);
        setSelectedConversaId(null);
        return;
      }

      setSelectedConversaId(conversa.id);

      // Buscar últimas 200 mensagens (performance: evitar carregar milhares de msgs)
      const PAGE_SIZE = 200;
      const { data: mensagens, error: msgError } = await supabase
        .from('mt_whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversa.id)
        .or('is_revoked.is.null,is_revoked.eq.false')
        .order('timestamp', { ascending: false })
        .limit(PAGE_SIZE);

      if (msgError) throw msgError;
      if (!isMountedRef.current) return;

      // Reverter para ordem cronológica (ascending) para exibição
      const sorted = (mensagens as DbMensagemMT[] || []).reverse();
      const mappedMessages = sorted.map(mapMensagemMTToLegacy);
      setMessages(mappedMessages);
      setHasMoreMessages((mensagens?.length || 0) >= PAGE_SIZE);
    } catch (err) {
      console.error('[fetchMessages MT] Erro:', err);
      if (isMountedRef.current) setError(err instanceof Error ? err.message : 'Erro ao buscar mensagens');
    } finally {
      if (isMountedRef.current) setIsLoadingMessages(false);
    }
  }, [sessaoId, tenant, franchise, accessLevel]);

  // ==========================================================================
  // Load More Messages (infinite scroll - older messages)
  // ==========================================================================
  const loadMoreMessages = useCallback(async () => {
    if (!selectedConversaId || isLoadingMore || !hasMoreMessages) return;
    if (!tenant && accessLevel !== 'platform') return;

    setIsLoadingMore(true);
    try {
      const PAGE_SIZE = 200;
      const oldestTimestamp = messages.length > 0 ? messages[0].timestamp : null;
      if (!oldestTimestamp) { setIsLoadingMore(false); return; }

      const { data: olderMsgs, error: msgError } = await supabase
        .from('mt_whatsapp_messages')
        .select('*')
        .eq('conversation_id', selectedConversaId)
        .or('is_revoked.is.null,is_revoked.eq.false')
        .lt('timestamp', oldestTimestamp)
        .order('timestamp', { ascending: false })
        .limit(PAGE_SIZE);

      if (msgError) throw msgError;
      if (!isMountedRef.current) return;

      const sorted = (olderMsgs as DbMensagemMT[] || []).reverse();
      const mappedOlder = sorted.map(mapMensagemMTToLegacy);

      setMessages(prev => [...mappedOlder, ...prev]);
      setHasMoreMessages((olderMsgs?.length || 0) >= PAGE_SIZE);
    } catch (err) {
      console.error('[loadMoreMessages MT] Erro:', err);
    } finally {
      if (isMountedRef.current) setIsLoadingMore(false);
    }
  }, [selectedConversaId, isLoadingMore, hasMoreMessages, messages, tenant, accessLevel]);

  // ==========================================================================
  // Mark Conversation as Read
  // ==========================================================================
  const markAsRead = useCallback(async (chatId: string) => {
    if (!tenant && accessLevel !== 'platform') return;
    if (!sessaoId) return;

    try {
      // Atualizar unread_count para 0 na conversa
      const { error } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('chat_id', chatId)
        .eq('session_id', sessaoId);

      if (error) {
        console.error('[markAsRead] Erro ao marcar conversa como lida:', error);
      } else {
        // Invalidar query para atualizar contadores na UI
        queryClient.invalidateQueries({ queryKey: ['whatsapp-chats-mt', sessaoId] });
      }
    } catch (err) {
      console.error('[markAsRead] Erro:', err);
    }
  }, [tenant, accessLevel, sessaoId, queryClient]);

  // ==========================================================================
  // On-demand: Fetch profile picture for selected chat
  // ==========================================================================
  const fetchProfilePictureOnDemand = useCallback(async (chatId: string) => {
    if (!sessionName || !sessaoId) return;

    // Find conversation in local state
    const conv = chats.find(c => c.chat_id === chatId);
    if (!conv || conv.is_group) return;

    // Skip if already has a real photo (not ui-avatars)
    if (conv.foto_url && !conv.foto_url.includes('ui-avatars.com')) return;

    try {
      const picResult = await wahaClient.getProfilePicture(sessionName, chatId);
      if (picResult.success && picResult.data?.url) {
        let photoUrl = picResult.data.url;
        // Persistir no bucket para evitar expiração do CDN
        if (tenant?.id) {
          const storedUrl = await downloadAndStoreContactAvatar(photoUrl, tenant.id, sessaoId, chatId);
          if (storedUrl) photoUrl = storedUrl;
        }
        // Atualizar DB
        await supabase
          .from('mt_whatsapp_conversations')
          .update({ contact_avatar: photoUrl })
          .eq('id', conv.id);
        // Atualizar estado local
        if (isMountedRef.current) {
          setChats(prev => prev.map(c =>
            c.id === conv.id ? { ...c, foto_url: photoUrl } : c
          ));
        }
      }
    } catch (err) { console.debug('[WhatsApp] Erro ao buscar foto on-demand:', err); }
  }, [sessionName, sessaoId, chats, tenant]);

  // ==========================================================================
  // Select Chat
  // ==========================================================================
  const selectChat = useCallback((chatId: string) => {
    setMessages([]);
    setSelectedConversaId(null);
    setSelectedChatId(chatId);
    setIsLoadingMessages(true);
    fetchMessages(chatId);

    // Marcar conversa como lida
    markAsRead(chatId);

    // Buscar foto de perfil on-demand (async, não bloqueia)
    fetchProfilePictureOnDemand(chatId);
  }, [fetchMessages, markAsRead, fetchProfilePictureOnDemand]);

  // ==========================================================================
  // Send Text Message
  // ==========================================================================
  const sendMessage = useCallback(async (text: string, quotedMessageId?: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !text.trim() || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }
    if (!tenant && accessLevel !== 'platform') {
      return { success: false, error: 'Tenant não definido' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    const now = new Date().toISOString();
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Optimistic update
    const optimisticMessage: WhatsAppMensagem = {
      id: tempId,
      conversa_id: selectedConversaId,
      sessao_id: sessaoId || '',
      message_id: tempId,
      body: text,
      from_me: true,
      timestamp: now,
      type: 'text',
      ack: 0,
      is_read: false,
      created_at: now,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // 🛡️ Sanitizar texto antes de enviar
      const sanitizedText = sanitizeForJSON(text);

      // 👤 Multi-atendente: prefixar com nome do atendente quando sessão compartilhada
      // Sessão compartilhada = responsible_user_id é null (ex: atendimento_principal)
      // O cliente vê "*Mel Nicole:*\n mensagem" — internamente o banco guarda o texto limpo
      const isSharedSession = sessionResponsibleUserIdRef.current === null;
      const senderNome = user?.nome?.trim();
      const textForWaha = isSharedSession && senderNome
        ? `*${senderNome}:*\n${sanitizedText}`
        : sanitizedText;

      // === DECISÃO DE ROTEAMENTO (HÍBRIDO) ===
      // Se híbrido ativo → calcular decisão de roteamento
      // Se não → usar WAHA diretamente (comportamento padrão)
      let routingProvider: 'waha' | 'meta_cloud_api' = 'waha';
      let routingReason = 'WAHA direto (modo padrão)';
      let routingCost = 0;
      let routingWindowOpen = false;

      if (isHybridEnabled && hybridConfig?.auto_routing_enabled) {
        try {
          // Buscar status da janela para esta conversa
          const { data: windowData } = await supabase
            .from('mt_whatsapp_windows')
            .select('window_expires_at, window_type')
            .eq('conversation_id', selectedConversaId)
            .maybeSingle();

          routingWindowOpen = windowData?.window_expires_at
            ? new Date(windowData.window_expires_at).getTime() > Date.now()
            : false;

          // Buscar regras de roteamento ativas
          const { data: rules } = await (supabase.from('mt_whatsapp_routing_rules') as any)
            .select('*')
            .eq('tenant_id', tenant?.id)
            .eq('is_active', true)
            .order('priority', { ascending: true });

          // Avaliar regras
          if (rules?.length) {
            for (const rule of rules) {
              let conditionMet = false;
              switch (rule.condition_type) {
                case 'window_open': conditionMet = routingWindowOpen; break;
                case 'window_closed': conditionMet = !routingWindowOpen; break;
                case 'always': conditionMet = true; break;
                case 'business_hours': {
                  const hour = new Date().getHours();
                  conditionMet = hour >= 8 && hour < 18;
                  break;
                }
                case 'outside_business_hours': {
                  const hour = new Date().getHours();
                  conditionMet = hour < 8 || hour >= 18;
                  break;
                }
              }
              if (conditionMet) {
                if (rule.preferred_provider === 'cheapest') {
                  routingProvider = 'waha'; // WAHA sempre mais barato
                } else if (rule.preferred_provider === 'fastest') {
                  routingProvider = 'meta_cloud_api';
                } else {
                  routingProvider = rule.preferred_provider || 'waha';
                }
                routingReason = `Regra: ${rule.nome}`;
                break;
              }
            }
          }

          // Calcular custo estimado
          if (routingProvider === 'meta_cloud_api') {
            routingCost = routingWindowOpen ? 0 : 0.25; // SERVICE=free, MARKETING=R$0.25
          }

        } catch (routingErr) {
          console.warn('[Hybrid] Erro no roteamento, usando WAHA:', routingErr);
          routingProvider = 'waha';
          routingReason = 'Fallback WAHA (erro no roteamento)';
        }
      }

      // === ENVIAR MENSAGEM ===
      // Por enquanto, WAHA é o único provider implementado para envio real
      // Meta Cloud API será adicionada quando configurada
      const sendStartTime = Date.now();
      const wahaResult = await wahaApi.sendText({ session: sessionName, chatId: selectedChatId, text: textForWaha, quotedMessageId });
      const sendDuration = Date.now() - sendStartTime;

      // Salvar no banco MT (upsert para evitar duplicata com webhook echo)
      const wahaMessageId = wahaResult?.id || tempId;
      const { data: savedMsg, error: insertError } = await supabase
        .from('mt_whatsapp_messages')
        .upsert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: wahaMessageId,
          from_me: true,
          tipo: 'text',
          body: sanitizedText,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }), {
          onConflict: 'message_id',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao salvar mensagem:', insertError);
      }

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: sanitizedText,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Auto-atribuir conversa ao atendente que enviou (se ainda não atribuída)
      if (user?.id) {
        const { count: assignCount } = await supabase
          .from('mt_whatsapp_conversations')
          .update({ assigned_to: user.id, assigned_at: now } as any)
          .eq('id', selectedConversaId)
          .is('assigned_to', null)
          .select('id', { count: 'exact', head: true });

        if (assignCount === 0) {
        }
      }

      // === LOG DE ROTEAMENTO (se híbrido ativo) ===
      if (isHybridEnabled) {
        try {
          await (supabase.from('mt_whatsapp_routing_logs') as any).insert({
            tenant_id: tenant?.id,
            franchise_id: franchise?.id,
            conversation_id: selectedConversaId,
            provider_selected: routingProvider,
            decision_reason: routingReason,
            window_status: routingWindowOpen ? 'open' : 'closed',
            estimated_cost: routingCost,
            actual_cost: routingProvider === 'waha' ? 0 : routingCost,
            cost_category: routingWindowOpen ? 'SERVICE' : 'MARKETING',
            success: true,
            message_id: wahaResult?.id || tempId,
            response_time_ms: sendDuration,
          });
        } catch (logErr) {
          console.warn('[Hybrid] Erro ao registrar log de roteamento:', logErr);
        }

        // Incrementar contador de mensagens na janela
        try {
          const { data: currentWindow } = await supabase
            .from('mt_whatsapp_windows')
            .select('id, messages_sent_in_window')
            .eq('conversation_id', selectedConversaId)
            .maybeSingle();

          if (currentWindow) {
            await supabase
              .from('mt_whatsapp_windows')
              .update({
                messages_sent_in_window: (currentWindow.messages_sent_in_window || 0) + 1,
                updated_at: now,
              })
              .eq('id', currentWindow.id);
          }
        } catch (windowErr) {
          console.warn('[Hybrid] Erro ao incrementar contador de janela:', windowErr);
        }
      }

      // Atualizar mensagem otimista com dados reais
      if (savedMsg && isMountedRef.current) {
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? mapMensagemMTToLegacy(savedMsg as DbMensagemMT) : msg
        ));
      }

      // Re-ordenar conversas otimisticamente (mover para o topo sem esperar real-time)
      if (selectedConversaId && isMountedRef.current) {
        setChats(prev => sortChats(prev.map(c =>
          c.id === selectedConversaId
            ? { ...c, ultima_mensagem_at: now, ultima_mensagem_texto: sanitizedText || '' }
            : c
        )));
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      if (isMountedRef.current) setMessages(prev => prev.filter(msg => msg.id !== tempId));
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, accessLevel, user]);

  // ==========================================================================
  // Send Media
  // ==========================================================================
  const sendMedia = useCallback(async (
    file: File,
    type?: "image" | "document" | "audio" | "video",
    caption?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }
    if (!tenant && accessLevel !== 'platform') {
      return { success: false, error: 'Tenant não definido' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    const now = new Date().toISOString();
    const tempId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determinar tipo de mídia (prioridade: parâmetro > mime type)
    let mediaType = type || 'document';
    if (!type) {
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
    }

    // Optimistic update
    const optimisticMessage: WhatsAppMensagem = {
      id: tempId,
      conversa_id: selectedConversaId,
      sessao_id: sessaoId || '',
      message_id: tempId,
      body: caption || file.name,
      from_me: true,
      timestamp: now,
      type: mediaType,
      media_type: mediaType,
      media_url: URL.createObjectURL(file),
      media_mime_type: file.type,
      media_filename: file.name,
      caption: caption,
      ack: 0,
      is_read: false,
      created_at: now,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Converter File para base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extrair apenas a parte base64 (remover "data:mime;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Enviar para WAHA - áudio usa sendVoice, resto usa sendFile
      let wahaResult: { id?: string; mediaUrl?: string } | undefined;
      if (mediaType === 'audio') {
        await wahaApi.sendVoice(sessionName, selectedChatId, `data:${file.type};base64,${fileBase64}`);
        wahaResult = {};
      } else {
        await wahaApi.sendFile(sessionName, selectedChatId, fileBase64, file.name, file.type, caption);
        wahaResult = {};
      }

      // Upload para Supabase Storage
      const storagePath = `whatsapp/${tenant?.id}/${sessaoId}/${tempId}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
      }

      // 🛡️ Sanitizar e salvar no banco MT
      const sanitizedCaption = caption ? sanitizeForJSON(caption) : null;
      const { data: savedMsg, error: insertError } = await supabase
        .from('mt_whatsapp_messages')
        .insert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: wahaResult?.id || tempId,
          from_me: true,
          tipo: mediaType,
          body: sanitizedCaption || file.name,
          media_url: wahaResult?.mediaUrl || null,
          media_mimetype: file.type,
          media_filename: file.name,
          storage_path: storagePath,
          caption: sanitizedCaption,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }))
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao salvar mídia:', insertError);
      }

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: sanitizedCaption || `📎 ${file.name}`,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Auto-atribuir conversa ao atendente que enviou (se ainda não atribuída)
      if (user?.id) {
        const { count: assignCount } = await supabase
          .from('mt_whatsapp_conversations')
          .update({ assigned_to: user.id, assigned_at: now } as any)
          .eq('id', selectedConversaId)
          .is('assigned_to', null)
          .select('id', { count: 'exact', head: true });

        if (assignCount === 0) {
        }
      }

      // Atualizar mensagem otimista
      if (savedMsg && isMountedRef.current) {
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? mapMensagemMTToLegacy(savedMsg as DbMensagemMT) : msg
        ));
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar mídia:', err);
      if (isMountedRef.current) setMessages(prev => prev.filter(msg => msg.id !== tempId));
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, accessLevel, user]);

  // ==========================================================================
  // Send Contact
  // ==========================================================================
  const sendContact = useCallback(async (contact: {
    name: string;
    phone: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    try {
      await wahaApi.sendContact(sessionName, selectedChatId, {
        name: contact.name,
        phone: contact.phone,
      });

      const now = new Date().toISOString();
      const sanitizedName = sanitizeForJSON(contact.name);

      // 🛡️ Sanitizar e salvar no banco MT
      await supabase
        .from('mt_whatsapp_messages')
        .insert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: `contact-${Date.now()}`,
          from_me: true,
          tipo: 'contact',
          body: `👤 ${sanitizedName}`,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }));

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: `👤 ${sanitizedName}`,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Refresh messages
      if (selectedChatId) fetchMessages(selectedChatId);

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar contato:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, fetchMessages]);

  // ==========================================================================
  // Send Poll
  // ==========================================================================
  const sendPoll = useCallback(async (poll: {
    question: string;
    options: string[];
  }): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    try {
      const sanitizedQuestion = sanitizeForJSON(poll.question);
      const sanitizedOptions = poll.options.map(opt => sanitizeForJSON(opt));
      await wahaApi.sendPoll(sessionName, selectedChatId, sanitizedQuestion, sanitizedOptions);

      const now = new Date().toISOString();

      // 🛡️ Sanitizar e salvar no banco MT
      await supabase
        .from('mt_whatsapp_messages')
        .insert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: `poll-${Date.now()}`,
          from_me: true,
          tipo: 'poll',
          body: `📊 ${sanitizedQuestion}`,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }));

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: `📊 ${sanitizedQuestion}`,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Refresh messages
      if (selectedChatId) fetchMessages(selectedChatId);

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar enquete:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, fetchMessages]);

  // ==========================================================================
  // Send Location
  // ==========================================================================
  const sendLocation = useCallback(async (location: {
    latitude: number;
    longitude: number;
    name?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    try {
      await wahaApi.sendLocation(sessionName, selectedChatId, location.latitude, location.longitude);

      const now = new Date().toISOString();
      const sanitizedLocationName = location.name ? sanitizeForJSON(location.name) : 'Localização';

      // 🛡️ Sanitizar e salvar no banco MT
      await supabase
        .from('mt_whatsapp_messages')
        .insert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: `location-${Date.now()}`,
          from_me: true,
          tipo: 'location',
          body: `📍 ${sanitizedLocationName}`,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }));

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: `📍 ${sanitizedLocationName}`,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Refresh messages
      if (selectedChatId) fetchMessages(selectedChatId);

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar localização:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, fetchMessages]);

  // ==========================================================================
  // Send Event
  // ==========================================================================
  const sendEvent = useCallback(async (event: {
    name: string;
    description?: string;
    startTime: number;
    endTime?: number;
    location?: { name: string };
  }): Promise<{ success: boolean; error?: string }> => {
    if (!selectedChatId || !selectedConversaId || !sessionName) {
      return { success: false, error: 'Dados incompletos para envio' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, error: 'API WAHA não configurada' };
    }

    try {
      await wahaApi.sendEvent(sessionName, selectedChatId, event);

      const now = new Date().toISOString();
      const sanitizedEventName = sanitizeForJSON(event.name);

      // 🛡️ Sanitizar e salvar no banco MT
      await supabase
        .from('mt_whatsapp_messages')
        .insert(sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          conversation_id: selectedConversaId,
          session_id: sessaoId,
          message_id: `event-${Date.now()}`,
          from_me: true,
          tipo: 'event',
          body: `📅 ${sanitizedEventName}`,
          ack: 1,
          status: 'sent',
          timestamp: now,
          sender_id: user?.id || null,
          sender_name: user?.nome || null,
        }));

      // Atualizar conversa (limpar last_customer_message_at = respondido)
      await supabase
        .from('mt_whatsapp_conversations')
        .update(sanitizeObjectForJSON({
          last_message_text: `📅 ${sanitizedEventName}`,
          last_message_at: now,
          last_message_from: 'me',
          last_customer_message_at: null,
          updated_at: now,
        }))
        .eq('id', selectedConversaId);

      // Refresh messages
      if (selectedChatId) fetchMessages(selectedChatId);

      return { success: true };
    } catch (err) {
      console.error('Erro ao enviar evento:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar' };
    }
  }, [selectedChatId, selectedConversaId, sessionName, sessaoId, tenant, fetchMessages]);

  // ==========================================================================
  // Retry Failed Message
  // ==========================================================================
  const retryMessage = useCallback(async (messageId: string): Promise<{ success: boolean; error?: string }> => {
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      return { success: false, error: 'Mensagem não encontrada' };
    }

    if (message.type === 'text' && message.body) {
      // Remover mensagem falhada
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Reenviar
      return sendMessage(message.body);
    }

    return { success: false, error: 'Tipo de mensagem não suportado para retry' };
  }, [messages, sendMessage]);

  // ==========================================================================
  // Delete Message
  // ==========================================================================
  const deleteMessage = useCallback(async (messageId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Soft delete no banco MT
      const { error } = await supabase
        .from('mt_whatsapp_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      // Remover da lista local
      setMessages(prev => prev.filter(m => m.id !== messageId));

      return { success: true };
    } catch (err) {
      console.error('Erro ao deletar mensagem:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao deletar' };
    }
  }, []);

  // ==========================================================================
  // Sync from WAHA
  // ==========================================================================
  const syncChatsFromWaha = useCallback(async (): Promise<{ success: boolean; message?: string; offline?: boolean }> => {
    if (!sessionName || !sessaoId) {
      return { success: false, message: 'Sessão não configurada' };
    }
    if (!tenant && accessLevel !== 'platform') {
      return { success: false, message: 'Tenant não definido' };
    }

    // Prevenir chamadas concorrentes
    if (isSyncing) {
      return { success: false, message: 'Sync já em andamento' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      // Fallback: carregar do banco
      await fetchChats();
      return { success: true, message: 'Dados carregados do banco (WAHA offline)', offline: true };
    }

    setIsSyncing(true);
    syncCancelledRef.current = false;

    try {
      // Buscar config da sessão (round robin + responsible_user_id)
      let rrConfig: RoundRobinConfig | null = null;
      try {
        rrConfig = await getSessionRoundRobinConfig(sessaoId!);
      } catch (err) { console.debug('[WhatsApp] Erro ao buscar config round-robin:', err); }

      // Buscar display_name da sessão para filtrar nomes de contato incorretos
      let sessionDisplayName: string | null = null;
      try {
        const { data: sessaoData } = await supabase
          .from('mt_whatsapp_sessions')
          .select('display_name, nome')
          .eq('id', sessaoId)
          .single();
        sessionDisplayName = sessaoData?.display_name || null;
      } catch (err) { console.debug('[WhatsApp] Erro ao buscar display_name da sessao:', err); }

      // Buscar chats do WAHA
      const wahaChats = await wahaApi.getChats(sessionName);

      if (!Array.isArray(wahaChats)) {
        throw new Error('Resposta inválida do WAHA');
      }

      let importedCount = 0;

      for (const chat of wahaChats) {
        if (syncCancelledRef.current) break;

        const chatId = chat.id?._serialized || chat.id;
        if (!chatId) continue;

        // Detectar grupo: @g.us OU propriedade isGroup do WAHA (NOWEB pode usar @lid para grupos)
        const isGroupChat = chatId.includes('@g.us') || chat.isGroup === true;

        // 🔍 Extração avançada de telefone (v3 - 15 fontes)
        // Pular extração para grupos (não precisam de telefone individual)
        let phone = isGroupChat ? null : await wahaApi.extractPhoneNumber(sessionName, chatId, chat);

        // === FIX @lid: Se não extraiu telefone e é @lid, tentar via mensagens ===
        // NOWEB sessions recém-criadas não têm remoteJidAlt no chat listing,
        // mas as mensagens podem ter o mapeamento @lid → telefone
        if (!phone && !isGroupChat && chatId.includes('@lid')) {
          try {
            const msgs = await wahaApi.getMessages(sessionName, chatId, 1, { downloadMedia: false }) as Array<Record<string, unknown>>;
            if (msgs?.[0]) {
              const msgData = msgs[0] as Record<string, unknown>;
              const key = (msgData._data as Record<string, unknown>)?.key as Record<string, unknown>;
              const remoteJidAlt = key?.remoteJidAlt as string;
              if (remoteJidAlt && remoteJidAlt.includes('@') && !remoteJidAlt.includes('@lid')) {
                const extracted = remoteJidAlt.split('@')[0];
                if (extracted && /^\d{10,13}$/.test(extracted)) {
                  phone = extracted;
                }
              }
              if (!phone) {
                const dataFrom = (msgData._data as Record<string, unknown>)?.from as string;
                const dataTo = (msgData._data as Record<string, unknown>)?.to as string;
                for (const src of [dataFrom, dataTo]) {
                  if (src && (src.includes('@s.whatsapp.net') || src.includes('@c.us'))) {
                    const digits = src.split('@')[0];
                    if (digits && /^\d{10,13}$/.test(digits)) {
                      phone = digits;
                      break;
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.debug('[WhatsApp] Erro ao buscar/criar conversa no sync:', err);
          }
        }

        // Helper: validar se nome NÃO é o nome da própria sessão (business name)
        const KNOWN_SESSION_NAMES = ['viniun', 'viniun boqueirão', 'novalaser', 'intimacenter'];
        const isValidContactName = (name: string | null): boolean => {
          if (!name || isPhoneNumber(name)) return false;
          const lower = name.trim().toLowerCase();
          // Ignorar nomes que são o display_name da sessão
          if (sessionDisplayName && lower === sessionDisplayName.trim().toLowerCase()) return false;
          // Ignorar nomes conhecidos de sessões/business
          if (KNOWN_SESSION_NAMES.some(sn => lower === sn || lower.startsWith(sn))) return false;
          return true;
        };

        // Nome e foto do chat - extractContactName tenta 8 fontes com validação isPhoneNumber
        let contactName = extractContactName(chat as any, null);
        if (!isValidContactName(contactName)) contactName = null;
        let contactPicture = (chat as any).picture || null;

        // Se não achou nome válido, tentar pushName diretamente (prioridade para @lid)
        if (!contactName) {
          const pushName = (chat as any).pushName || (chat as any).pushname;
          if (isValidContactName(pushName)) {
            contactName = pushName.trim();
          }
        }

        // Se não achou nome válido no chat raiz, tentar no lastMessage (pushName, notifyName)
        if (!contactName) {
          const lastMsg = (chat as any).lastMessage;
          if (lastMsg) {
            const msgName = extractContactName(lastMsg as any, null);
            if (isValidContactName(msgName)) {
              contactName = msgName;
            }
            // Tentar em _data do lastMessage
            if (!contactName && lastMsg._data) {
              const dataName = extractContactName(lastMsg._data as any, null);
              if (isValidContactName(dataName)) {
                contactName = dataName;
              }
            }
            // Tentar pushName/notifyName direto do lastMessage
            if (!contactName) {
              const msgPushName = lastMsg.pushName || lastMsg.pushname || lastMsg._data?.pushName || lastMsg._data?.notifyName;
              if (isValidContactName(msgPushName)) {
                contactName = msgPushName.trim();
              }
            }
          }
        }

        if (isGroupChat) {
          // Para GRUPOS: chat.name já vem correto do WAHA (subject do grupo)
          // Grupos podem ter nomes numéricos então aceita chat.name direto
          if (!contactName) {
            contactName = (chat as any).name || null;
          }
          try {
            const groupPic = await wahaApi.getProfilePicture(sessionName, chatId);
            if (groupPic && groupPic.length > 10) {
              contactPicture = groupPic;
            }
          } catch (err) {
            console.debug('[WhatsApp] Grupo sem foto:', err);
          }
        } else {
          // Para CONTATOS: tentar foto direto (wahaClient) antes da abordagem multi-fase
          if (!contactPicture) {
            try {
              const picResult = await wahaClient.getProfilePicture(sessionName, chatId);
              if (picResult.success && picResult.data?.url) {
                contactPicture = picResult.data.url;
              }
            } catch (err) { console.debug('[WhatsApp] Erro ao buscar foto do contato:', err); }
          }

          // Buscar informações do contato (nome e foto complementar) via API multi-fase
          try {
            const contactInfo = await wahaApi.getContactInfo(sessionName, chatId, phone);

            // Se ainda não temos nome válido, tentar do contactInfo (8 fontes + validação)
            if (!contactName) {
              const apiName = extractContactName(contactInfo as any, null);
              if (isValidContactName(apiName)) {
                contactName = apiName;
              } else if (isValidContactName(contactInfo.name)) {
                contactName = contactInfo.name;
              }
            }

            // Usar foto da API apenas se ainda não temos uma
            if (!contactPicture && contactInfo.picture && contactInfo.picture.length > 10) {
              contactPicture = contactInfo.picture;
            }
          } catch (err) {
            console.debug('[WhatsApp] Erro ao buscar info do contato WAHA:', err);
            // Fallback: se não tem nome válido, usar telefone ou chatId
            if (!contactName || isPhoneNumber(contactName)) {
              contactName = phone || chatId.replace(/@.*$/, '');
            }
          }
        }

        // Se não tem foto real, gerar avatar padrão com iniciais do NOME (não do telefone)
        if (!contactPicture && !isGroupChat) {
          contactPicture = generateDefaultAvatar(contactName);
        }

        // Persistir foto de contato no bucket (CDN URLs do WhatsApp expiram em 24-48h)
        if (contactPicture && !isGroupChat && tenant?.id) {
          const storedAvatarUrl = await downloadAndStoreContactAvatar(contactPicture, tenant.id, sessaoId, chatId);
          if (storedAvatarUrl) contactPicture = storedAvatarUrl;
        }

        // Verificar se já existe (incluir updated_at para proteção contra sobrescrita)
        const { data: existing } = await supabase
          .from('mt_whatsapp_conversations')
          .select('id, updated_at, contact_name')
          .eq('session_id', sessaoId)
          .eq('chat_id', chatId)
          .maybeSingle();

        // 🛡️ Sanitizar dados antes de salvar (evita erro "no low surrogate in string")
        // Timestamp da última mensagem do WAHA
        const wahaLastMsgAt = chat.lastMessage?.timestamp
          ? new Date(chat.lastMessage.timestamp * 1000).toISOString()
          : null;
        const wahaLastMsgText = (chat.lastMessage ? extractSyncMessageBody(chat.lastMessage) : null) || null;

        // Dados comuns para INSERT (nova conversa) — pode ter last_message_at = null
        const insertData = sanitizeObjectForJSON({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          session_id: sessaoId,
          chat_id: chatId,
          contact_name: contactName,
          contact_phone: phone || null,
          contact_avatar: contactPicture,
          is_group: isGroupChat,
          is_pinned: (chat as { pinned?: boolean }).pinned || false,
          unread_count: chat.unreadCount || 0,
          last_message_text: wahaLastMsgText,
          last_message_at: wahaLastMsgAt,
          updated_at: new Date().toISOString(),
        });

        // Dados para UPDATE (conversa existente):
        // ⚠️ CRÍTICO: só inclui last_message_at se WAHA tem valor — nunca sobrescrever com NULL
        // O trigger trg_update_conv_on_message_insert já garante atualização automática via INSERT de msg

        // Proteção: só sobrescrever contact_name se o DB não foi editado manualmente
        // SEMPRE sobrescrever se o nome atual é o business name da sessão (bug fix)
        const existingNameIsSessionName = existing?.contact_name && sessionDisplayName &&
          existing.contact_name.trim().toLowerCase() === sessionDisplayName.trim().toLowerCase();
        const shouldUpdateName = !existing?.contact_name ||
          existingNameIsSessionName ||
          existing.contact_name === contactName ||
          (wahaLastMsgAt && existing.updated_at && new Date(wahaLastMsgAt) > new Date(existing.updated_at));

        const updateData = sanitizeObjectForJSON({
          ...(shouldUpdateName && contactName ? { contact_name: contactName } : {}),
          contact_avatar: contactPicture,
          is_pinned: (chat as { pinned?: boolean }).pinned || false,
          unread_count: chat.unreadCount || 0,
          updated_at: new Date().toISOString(),
          // Atualizar phone só se WAHA retornou (evitar apagar phone existente)
          ...(phone ? { contact_phone: phone } : {}),
          // Atualizar last_message_at só se WAHA tem valor E é mais recente
          ...(wahaLastMsgAt ? {
            last_message_at: wahaLastMsgAt,
            last_message_text: wahaLastMsgText,
          } : {}),
        });

        let conversaId: string | null = null;
        if (existing) {
          conversaId = existing.id;
          const { error: convUpdateErr } = await supabase
            .from('mt_whatsapp_conversations')
            .update(updateData)
            .eq('id', existing.id);
          if (convUpdateErr) console.error('[Sync] Erro ao atualizar conversa:', convUpdateErr.message);
        } else {
          const { data: newConv } = await supabase
            .from('mt_whatsapp_conversations')
            .insert(insertData)
            .select('id')
            .single();
          conversaId = newConv?.id || null;
        }

        // 🎯 CRIAR/VINCULAR LEAD AUTOMATICAMENTE
        // Telefone NÃO é obrigatório (leads de Instagram podem não ter)
        // isGroupChat já definido acima (inclui check de chat.isGroup para NOWEB @lid)
        if (!isGroupChat && phone && tenant?.id) {
          try {
            // Buscar lead existente por telefone no mesmo tenant
            const { data: existingLead } = await supabase
              .from("mt_leads")
              .select("id, nome, foto_url")
              .eq("tenant_id", tenant.id)
              .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
              .maybeSingle();

            let leadId: string | null = null;
            let firstContactDate: string | null = null;

            if (!existingLead) {
              const leadNome = contactName || phone;
              const leadOrigin = franchise?.id
                ? `whatsapp_sync (franquia: ${franchise.id})`
                : "whatsapp_sync (central)";
              const leadFoto = contactPicture || generateDefaultAvatar(leadNome);

              // Buscar a data REAL do primeiro contato via WAHA
              // chat.timestamp e chat.lastMessage.timestamp representam a ÚLTIMA mensagem, NÃO o primeiro contato
              try {
                // Tentar buscar a mensagem mais antiga (sortOrder: 'asc', limit: 1)
                const oldestMessages = await wahaApi.getMessages(sessionName, chatId, 1, {
                  sortOrder: 'asc',
                  downloadMedia: false,
                }) as Array<{ timestamp?: number }>;

                if (oldestMessages?.[0]?.timestamp && oldestMessages[0].timestamp > 0) {
                  firstContactDate = new Date(oldestMessages[0].timestamp * 1000).toISOString();
                }
              } catch (err) {
                console.debug('[WhatsApp] sortOrder asc nao suportado, fallback:', err);
                // Se sortOrder:'asc' não funcionar, buscar TODAS as mensagens e pegar a mais antiga
                try {
                  const allMsgs = await wahaApi.getMessages(sessionName, chatId, 0, {
                    downloadMedia: false,
                  }) as Array<{ timestamp?: number }>;
                  if (allMsgs?.length > 0) {
                    const oldest = allMsgs
                      .filter(m => m.timestamp && m.timestamp > 0)
                      .reduce((min, m) => m.timestamp! < min ? m.timestamp! : min, Infinity);
                    if (oldest !== Infinity) {
                      firstContactDate = new Date(oldest * 1000).toISOString();
                    }
                  }
                } catch (msgErr) {
                  console.warn('[SYNC] Não foi possível obter data do primeiro contato:', msgErr);
                }
              }

              // Round Robin: determinar responsável para este lead
              const rrResult = rrConfig
                ? await getNextResponsible(rrConfig)
                : { user_id: null, method: 'none' as const };
              const assignedUserId = rrResult.user_id;

              const { data: newLead, error: insertError } = await supabase
                .from("mt_leads")
                .insert(sanitizeObjectForJSON({
                  tenant_id: tenant.id,
                  franchise_id: franchise?.id || null,
                  nome: leadNome,
                  telefone: phone,
                  whatsapp: phone,
                  foto_url: leadFoto,
                  canal_entrada: 'whatsapp',
                  origem: leadOrigin,
                  status: "novo",
                  observacoes: rrResult.method === 'round_robin'
                    ? `Lead criado via sync WhatsApp (${sessionName}) - Round Robin → ${(rrResult as any).user_name || 'Atribuído'}`
                    : `Lead criado via sync WhatsApp (${sessionName})`,
                  // Responsável: via Round Robin ou fixo
                  ...(assignedUserId ? {
                    atribuido_para: assignedUserId,
                    responsible_user_id: assignedUserId,
                    atribuido_em: new Date().toISOString(),
                    atribuido_por: assignedUserId,
                  } : {}),
                  // Data de criação: usar data REAL do primeiro contato no WhatsApp
                  ...(firstContactDate ? { created_at: firstContactDate } : {}),
                }))
                .select('id')
                .single();

              if (insertError) {
                // Race condition: constraint UNIQUE já impediu duplicata
                if (insertError.code === '23505') {
                  const { data: raceData } = await supabase
                    .from("mt_leads")
                    .select("id")
                    .eq("tenant_id", tenant.id)
                    .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
                    .maybeSingle();
                  leadId = raceData?.id || null;
                } else {
                  console.error('[SYNC] Erro ao inserir lead:', insertError.message);
                }
              } else {
                leadId = newLead?.id || null;
              }
            } else {
              leadId = existingLead.id;
              const updates: Record<string, string> = {};

              // Atualizar nome se o lead tem nome de telefone e agora temos nome real
              if (contactName && !isPhoneNumber(contactName) && existingLead.nome && isPhoneNumber(existingLead.nome)) {
                updates.nome = contactName;
              }

              // Atualizar foto se necessário
              if (!existingLead.foto_url || (contactPicture && existingLead.foto_url.includes('ui-avatars.com'))) {
                updates.foto_url = contactPicture || generateDefaultAvatar(contactName || existingLead.nome || phone);
              }

              if (Object.keys(updates).length > 0) {
                const { error: updateErr } = await supabase
                  .from("mt_leads")
                  .update(updates)
                  .eq("id", existingLead.id);
                if (updateErr) console.error('[Sync] Erro ao atualizar lead:', updateErr.message);
              }
            }

            // Vincular lead_id na conversa
            if (leadId && conversaId) {
              const { error: linkLeadErr } = await supabase
                .from("mt_whatsapp_conversations")
                .update({ lead_id: leadId })
                .eq("id", conversaId);
              if (linkLeadErr) console.error('[Sync] Erro ao vincular lead na conversa:', linkLeadErr.message);
            }

            // 🎯 AUTO-ADICIONAR LEAD AO FUNIL DE VENDAS
            // Só para leads NOVOS (não existentes previamente)
            if (leadId && !existingLead) {
              try {
                const franchiseId = franchise?.id;

                // 1. Buscar funil padrão da franquia (ou do tenant)
                let funnel: any = null;
                if (franchiseId) {
                  const { data: franchiseFunnel } = await supabase
                    .from("mt_funnels")
                    .select("id")
                    .eq("franchise_id", franchiseId)
                    .eq("is_active", true)
                    .eq("is_default", true)
                    .is("deleted_at", null)
                    .maybeSingle();
                  funnel = franchiseFunnel;
                }

                // Fallback: funil padrão do tenant (sem franchise_id)
                if (!funnel && tenant?.id) {
                  const { data: tenantFunnel } = await supabase
                    .from("mt_funnels")
                    .select("id")
                    .eq("tenant_id", tenant.id)
                    .is("franchise_id", null)
                    .eq("is_active", true)
                    .eq("is_default", true)
                    .is("deleted_at", null)
                    .maybeSingle();
                  funnel = tenantFunnel;
                }

                if (funnel) {
                  // 2. Buscar primeira etapa (tipo='entrada' ou menor ordem)
                  const { data: firstStage } = await supabase
                    .from("mt_funnel_stages")
                    .select("id")
                    .eq("funnel_id", funnel.id)
                    .is("deleted_at", null)
                    .or("tipo.eq.entrada,tipo.eq.entry")
                    .order("ordem", { ascending: true })
                    .limit(1)
                    .maybeSingle();

                  const stage = firstStage || (await supabase
                    .from("mt_funnel_stages")
                    .select("id")
                    .eq("funnel_id", funnel.id)
                    .is("deleted_at", null)
                    .order("ordem", { ascending: true })
                    .limit(1)
                    .single()).data;

                  if (stage) {
                    // 3. Inserir no funil (upsert evita duplicata)
                    const { error: funnelError } = await supabase
                      .from("mt_funnel_leads")
                      .upsert({
                        funnel_id: funnel.id,
                        stage_id: stage.id,
                        lead_id: leadId,
                        tenant_id: tenant!.id,
                        posicao: 0,
                        prioridade: 0,
                        probabilidade: 50,
                        is_active: true,
                        // Usar data real do primeiro contato (não data de hoje)
                        entrou_em: firstContactDate || new Date().toISOString(),
                      }, {
                        onConflict: "funnel_id,lead_id",
                      });

                    if (funnelError) {
                      console.error('[SYNC] Erro ao adicionar lead ao funil:', funnelError.message);
                    } else {
                    }
                  }
                }
              } catch (funnelErr) {
                console.error('[SYNC] Erro no auto-funil:', funnelErr);
              }
            }
          } catch (err) {
            console.error('[SYNC] Erro ao criar lead:', err);
          }
        }

        importedCount++;
      }

      await fetchChats();

      return { success: true, message: `${importedCount} conversa(s) sincronizada(s)`, offline: false };
    } catch (err) {
      console.error('Erro ao sincronizar do WAHA:', err);
      await fetchChats();
      return { success: false, message: 'Erro na sincronização, dados carregados do banco', offline: true };
    } finally {
      setIsSyncing(false);
    }
  }, [sessionName, sessaoId, tenant, franchise, accessLevel, fetchChats]);

  // ==========================================================================
  // Sync Messages from WAHA
  // ==========================================================================
  const syncMessagesFromWaha = useCallback(async (chatId: string): Promise<{ success: boolean; message?: string }> => {
    if (!sessionName || !sessaoId || !chatId) {
      return { success: false, message: 'Dados incompletos' };
    }

    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.isConfigured) {
      return { success: false, message: 'WAHA não configurado' };
    }

    try {
      // Buscar conversa
      const { data: conversa } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id')
        .eq('session_id', sessaoId)
        .eq('chat_id', chatId)
        .maybeSingle();

      if (!conversa) {
        return { success: false, message: 'Conversa não encontrada' };
      }

      // Buscar mensagens do WAHA com downloadMedia para obter URLs de mídia
      const wahaMessages = await wahaApi.getMessages(sessionName, chatId, 0, {
        downloadMedia: true,
      });

      if (!Array.isArray(wahaMessages)) {
        return { success: false, message: 'Resposta inválida do WAHA' };
      }

      let importedCount = 0;
      let updatedCount = 0;

      for (const msg of wahaMessages) {
        const messageId = msg.id?._serialized || msg.id || `waha-${Date.now()}-${Math.random()}`;

        // Extração inteligente de tipo/media (compatível com NOWEB engine)
        const msgTipo = extractSyncMessageType(msg);
        // Extração robusta de body (compatível com NOWEB engine)
        const msgBody = extractSyncMessageBody(msg);

        // Extrair dados de mídia de _data.message (WAHA NOWEB)
        const msgContent = msg._data?.message;
        const mediaMsg = msgContent?.imageMessage || msgContent?.videoMessage || msgContent?.audioMessage ||
          msgContent?.pttMessage || msgContent?.documentMessage || msgContent?.documentWithCaptionMessage?.message?.documentMessage ||
          msgContent?.stickerMessage || null;

        const msgMediaUrl = msg.mediaUrl || msg.media?.url || msg._data?.mediaUrl || mediaMsg?.url || null;
        const msgMimetype = msg.mimetype || msg._data?.mimetype || msg.media?.mimetype || mediaMsg?.mimetype || null;
        const msgFilename = msg.filename || msg._data?.filename || msg.media?.filename || mediaMsg?.fileName || null;
        const msgCaption = msg.caption || msg._data?.caption || mediaMsg?.caption || null;

        // Verificar se já existe
        const { data: existingMsg } = await supabase
          .from('mt_whatsapp_messages')
          .select('id, tipo, body, media_url, storage_path')
          .eq('conversation_id', conversa.id)
          .eq('message_id', messageId)
          .maybeSingle();

        if (existingMsg) {
          // Atualizar mensagem existente se tipo/media mudou ou URL expirada
          const hasExpiredCdnUrl = existingMsg.media_url?.includes('mmg.whatsapp.net');
          const hasNewLocalUrl = msgMediaUrl && !msgMediaUrl.includes('mmg.whatsapp.net');
          // Verificar se body está vazio e temos body novo para corrigir
          const hasEmptyBody = !existingMsg.body || existingMsg.body.trim() === '';
          const hasNewBody = !!msgBody;
          const needsBodyFix = hasEmptyBody && hasNewBody;
          const needsUpdate = existingMsg.tipo !== msgTipo ||
            (msgMediaUrl && !existingMsg.media_url) ||
            (hasExpiredCdnUrl && hasNewLocalUrl) ||
            needsBodyFix;

          if (needsUpdate || (!existingMsg.storage_path && msgMediaUrl)) {
            // Tentar baixar e salvar mídia no Storage se ainda não tem storage_path
            let storagePath = existingMsg.storage_path;
            if (!storagePath && msgMediaUrl && !msgMediaUrl.includes('mmg.whatsapp.net')) {
              storagePath = await downloadAndStoreMedia(
                msgMediaUrl, tenant?.id, sessaoId, messageId, msgMimetype, msgFilename
              );
            }

            const updateData: Record<string, unknown> = {};
            if (needsUpdate) {
              Object.assign(updateData, {
                tipo: msgTipo,
                media_url: msgMediaUrl,
                media_mimetype: msgMimetype,
                media_filename: msgFilename,
                caption: msgCaption,
                body: msgBody || msgCaption || undefined,
              });
            }
            if (storagePath && !existingMsg.storage_path) {
              updateData.storage_path = storagePath;
            }

            if (Object.keys(updateData).length > 0) {
              const { error: msgUpdateErr } = await supabase
                .from('mt_whatsapp_messages')
                .update(sanitizeObjectForJSON(updateData))
                .eq('id', existingMsg.id);
              if (msgUpdateErr) console.error('[Sync] Erro ao atualizar mensagem:', msgUpdateErr.message);
              else updatedCount++;
            }
          }
          continue;
        }

        // Baixar mídia e salvar no Storage (para mensagens com mídia)
        let storagePath: string | null = null;
        if (msgMediaUrl && msgTipo !== 'text') {
          storagePath = await downloadAndStoreMedia(
            msgMediaUrl, tenant?.id, sessaoId, messageId, msgMimetype, msgFilename
          );
        }

        // 🛡️ Inserir nova mensagem
        const { error: msgInsertErr } = await supabase
          .from('mt_whatsapp_messages')
          .insert(sanitizeObjectForJSON({
            tenant_id: tenant?.id,
            conversation_id: conversa.id,
            session_id: sessaoId,
            message_id: messageId,
            from_me: msg.fromMe || false,
            tipo: msgTipo,
            body: msgBody || msgCaption || null,
            media_url: msgMediaUrl,
            media_mimetype: msgMimetype,
            media_filename: msgFilename,
            storage_path: storagePath,
            caption: msgCaption,
            ack: msg.ack || 0,
            status: msg.ack >= 3 ? 'read' : (msg.ack >= 2 ? 'delivered' : 'sent'),
            timestamp: msg.timestamp
              ? new Date(msg.timestamp * 1000).toISOString()
              : new Date().toISOString(),
          }));

        if (msgInsertErr) {
          console.error('[Sync] Erro ao inserir mensagem:', msgInsertErr.message);
        } else {
          importedCount++;
        }
      }

      // Refresh messages
      await fetchMessages(chatId);

      const parts = [];
      if (importedCount > 0) parts.push(`${importedCount} nova(s)`);
      if (updatedCount > 0) parts.push(`${updatedCount} atualizada(s)`);
      const msg = parts.length > 0 ? parts.join(', ') : 'Nenhuma alteração';
      return { success: true, message: `Mensagens: ${msg}` };
    } catch (err) {
      console.error('Erro ao sincronizar mensagens:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Erro ao sincronizar' };
    }
  }, [sessionName, sessaoId, tenant, fetchMessages]);

  // ==========================================================================
  // Sync All in Background
  // ==========================================================================
  const syncAllInBackground = useCallback(async (): Promise<void> => {
    // Primeiro sincronizar chats
    await syncChatsFromWaha();

    // Depois sincronizar mensagens de cada chat
    for (const chat of chats) {
      if (syncCancelledRef.current) break;
      await syncMessagesFromWaha(chat.chat_id);
    }
  }, [syncChatsFromWaha, syncMessagesFromWaha, chats]);

  // ==========================================================================
  // Stop Sync
  // ==========================================================================
  const stopSync = useCallback(() => {
    syncCancelledRef.current = true;
    setIsSyncing(false);
  }, []);

  // ==========================================================================
  // Real-time subscription: mensagens do chat selecionado
  // ==========================================================================
  useEffect(() => {
    if (!selectedConversaId) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`mt-mensagens-${selectedConversaId}-${rtReconnectKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_whatsapp_messages',
          filter: `conversation_id=eq.${selectedConversaId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const m = payload.new as DbMensagemMT;

          // Play notification sound for incoming messages
          if (!m.from_me) {
            playNotificationSound();
          }

          setMessages(prev => {
            // Dedup: checar por message_id OU por body+from_me com timestamp proximo (< 5s)
            const isDuplicate = prev.some(msg => {
              // Match exato por message_id
              if (msg.message_id === m.message_id) return true;
              // Match por conteudo similar (from_me + body parecido + timestamp < 5s)
              if (msg.from_me === m.from_me && m.from_me) {
                const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - new Date(m.timestamp || m.created_at).getTime());
                if (timeDiff < 5000) {
                  // Body match: um pode ter prefixo "*Nome:*\n" e outro nao
                  const cleanBody = (text: string | null) => (text || '').replace(/^\*[^*]+\*:\s*\n?/, '').trim();
                  if (cleanBody(msg.body) === cleanBody(m.body)) return true;
                }
              }
              return false;
            });
            if (isDuplicate) return prev;
            return [...prev, mapMensagemMTToLegacy(m)].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(`[RT] mt-mensagens-${selectedConversaId} error:`, err);
        // Reconectar automaticamente se canal fechar/errar
        if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isMountedRef.current) {
          reconnectTimer = setTimeout(() => {
            if (isMountedRef.current) setRtReconnectKey(k => k + 1);
          }, 5000);
        }
      });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedConversaId, rtReconnectKey]);

  // ==========================================================================
  // Real-time: conversations + labels
  // ==========================================================================
  useEffect(() => {
    if (!sessaoId) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Re-fetch a single conversation with labels join (ensures labels are fresh)
    const fetchConversation = async (conversationId: string) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_conversations')
        .select('*, conversation_labels:mt_whatsapp_conversation_labels(label:mt_whatsapp_labels(id, name, color))')
        .eq('id', conversationId)
        .eq('session_id', sessaoId)
        .single();

      if (error || !data) return null;
      return mapConversaMTToLegacy(data as DbConversaMT);
    };

    const channel = supabase
      .channel(`mt-conversations-${sessaoId}-${rtReconnectKey}`)
      // Conversation updates (contact_name, last_message, unread_count, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mt_whatsapp_conversations',
          filter: `session_id=eq.${sessaoId}`,
        },
        async (payload) => {
          if (!isMountedRef.current) return;
          const updated = await fetchConversation((payload.new as { id: string }).id);
          if (!isMountedRef.current || !updated) return;
          setChats(prev => sortChats(prev.map(c => c.id === updated.id ? updated : c)));
        }
      )
      // New conversations
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mt_whatsapp_conversations',
          filter: `session_id=eq.${sessaoId}`,
        },
        async (payload) => {
          if (!isMountedRef.current) return;
          const newChat = await fetchConversation((payload.new as { id: string }).id);
          if (!isMountedRef.current || !newChat) return;
          setChats(prev => {
            if (prev.some(c => c.id === newChat.id)) return prev;
            return sortChats([newChat, ...prev]);
          });
        }
      )
      // Label associations added/removed — re-fetch affected conversation
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mt_whatsapp_conversation_labels',
        },
        async (payload) => {
          if (!isMountedRef.current) return;
          const conversationId =
            (payload.new as { conversation_id?: string })?.conversation_id ||
            (payload.old as { conversation_id?: string })?.conversation_id;
          if (!conversationId) return;
          const updated = await fetchConversation(conversationId);
          if (!isMountedRef.current || !updated) return; // not from this session
          setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(`[RT] mt-conversations-${sessaoId} error:`, err);
        // Reconectar automaticamente se canal fechar/errar + buscar dados frescos
        if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isMountedRef.current) {
          // Buscar dados frescos imediatamente (canal morreu, atualizar via polling)
          fetchChatsRef.current({ silent: true });
          // Recriar subscription após 5s
          reconnectTimer = setTimeout(() => {
            if (isMountedRef.current) setRtReconnectKey(k => k + 1);
          }, 5000);
        }
      });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
  }, [sessaoId, rtReconnectKey]);

  // ==========================================================================
  // Initial fetch + background profile picture refresh
  // ==========================================================================
  useEffect(() => {
    if (sessaoId && !isTenantLoading && (tenant || accessLevel === 'platform')) {
      fetchChats().then(() => {
        // Após carregar as conversas, atualizar fotos de perfil em background
        if (sessionName) {
          if (profileRefreshTimerRef.current) clearTimeout(profileRefreshTimerRef.current);
          profileRefreshTimerRef.current = setTimeout(() => refreshProfilePictures(), 5000);
        }
      });
    }
  }, [sessaoId, isTenantLoading, tenant, accessLevel, fetchChats, sessionName, refreshProfilePictures]);

  // ==========================================================================
  // Polling fallback + visibilitychange: mantém conversas atualizadas
  // quando o real-time WebSocket cai (ex: após 30+ min aberto)
  // ==========================================================================
  const fetchChatsRef = useRef(fetchChats);
  useEffect(() => { fetchChatsRef.current = fetchChats; }, [fetchChats]);

  useEffect(() => {
    if (!sessaoId) return;

    // Polling silencioso a cada 45 segundos (sem spinner)
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchChatsRef.current({ silent: true });
      }
    }, 45_000);

    // Ao voltar à aba (visibilitychange), forçar refresh imediato
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        fetchChatsRef.current({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [sessaoId]);

  // ==========================================================================
  // Assumir Conversa (Atendente humano assume, bot para)
  // ==========================================================================
  const assumirConversa = useCallback(async (conversaId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          assigned_to: userId,
          is_bot_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setChats(prev => prev.map(chat =>
        chat.id === conversaId
          ? { ...chat, assigned_to: userId, is_bot_active: false }
          : chat
      ));

      return { success: true };
    } catch (err) {
      console.error('[assumirConversa] Erro:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao assumir conversa' };
    }
  }, []);

  // ==========================================================================
  // Devolver ao Bot (Reativar bot na conversa)
  // ==========================================================================
  const devolverAoBot = useCallback(async (conversaId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_whatsapp_conversations')
        .update({
          assigned_to: null,
          is_bot_active: true,
          bot_attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setChats(prev => prev.map(chat =>
        chat.id === conversaId
          ? { ...chat, assigned_to: null, is_bot_active: true }
          : chat
      ));

      return { success: true };
    } catch (err) {
      console.error('[devolverAoBot] Erro:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao devolver ao bot' };
    }
  }, []);

  // ==========================================================================
  // Server-side search (busca em TODAS as conversas, não apenas nas carregadas)
  // ==========================================================================
  const [searchResults, setSearchResults] = useState<WhatsAppConversa[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchConversations = useCallback(async (term: string) => {
    // Cancelar busca anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Limpar busca
    if (!term.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    if (!sessaoId) return;
    if (!tenant && accessLevel !== 'platform') return;

    setIsSearching(true);

    // Debounce 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const safeTerm = term.trim().replace(/[%_]/g, '\\$&'); // Escape special chars for LIKE
        let query = supabase
          .from('mt_whatsapp_conversations')
          .select(CONVERSATION_SELECT)
          .eq('session_id', sessaoId)
          .is('deleted_at', null)
          .or(`contact_name.ilike.%${safeTerm}%,contact_phone.ilike.%${safeTerm}%,last_message_text.ilike.%${safeTerm}%`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(30);

        // Filtro por nível de acesso (mesma lógica do fetchChats)
        if (accessLevel === 'tenant' && tenant) {
          query = query.eq('tenant_id', tenant.id);
        } else if (accessLevel === 'franchise' && franchise) {
          query = query.eq('franchise_id', franchise.id);
        } else if (accessLevel === 'user' && tenant) {
          query = query.eq('tenant_id', tenant.id);
          if (franchise) query = query.eq('franchise_id', franchise.id);
        }

        const { data, error: searchError } = await query;

        if (searchError) throw searchError;
        if (!isMountedRef.current) return;

        // Buscar nomes dos responsáveis
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const assignedIds = [...new Set((data || []).map((c: DbConversaMT) => c.assigned_to).filter((id): id is string => !!id && UUID_RE.test(id)))];
        let userNameMap: Record<string, string> = {};
        if (assignedIds.length > 0) {
          const { data: users } = await supabase
            .from('mt_users')
            .select('id, auth_user_id, nome')
            .or(`auth_user_id.in.(${assignedIds.join(',')}),id.in.(${assignedIds.join(',')})`);
          if (users) {
            for (const u of users) {
              if (u.auth_user_id) userNameMap[u.auth_user_id] = u.nome;
              if (u.id) userNameMap[u.id] = u.nome;
            }
          }
        }

        const mapped = (data as DbConversaMT[] || []).map(c => {
          const m = mapConversaMTToLegacy(c);
          if (m.assigned_to && userNameMap[m.assigned_to]) {
            m.assigned_user_name = userNameMap[m.assigned_to];
          }
          return m;
        });

        setSearchResults(mapped);
      } catch (err) {
        console.warn('[WhatsApp Search] Erro na busca server-side:', err);
        setSearchResults(null);
      } finally {
        if (isMountedRef.current) setIsSearching(false);
      }
    }, 300);
  }, [sessaoId, tenant, franchise, accessLevel, CONVERSATION_SELECT]);

  // Cleanup do timeout na desmontagem
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================
  return {
    chats,
    isLoadingChats: isLoadingChats || isTenantLoading,
    isSyncing,
    messages,
    isLoadingMessages,
    selectedChatId,
    selectedConversaId,
    error,
    selectChat,
    sendMessage,
    sendMedia,
    sendContact,
    sendPoll,
    sendLocation,
    sendEvent,
    retryMessage,
    deleteMessage,
    assumirConversa,
    devolverAoBot,
    syncChatsFromWaha,
    syncMessagesFromWaha,
    syncAllInBackground,
    stopSync,
    syncProgress,
    refreshChats: fetchChats,
    refreshMessages: () => selectedChatId && fetchMessages(selectedChatId),
    // Infinite scroll - messages
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    // Infinite scroll - chats
    loadMoreChats,
    hasMoreChats,
    isLoadingMoreChats,
    // Server-side search
    searchConversations,
    searchResults,
    isSearching,
    // Sistema híbrido
    isHybridEnabled,
    _mode: 'mt' as const,
  };
}

// Re-exportar tipos
export type { WhatsAppConversa, WhatsAppMensagem } from '@/types/whatsapp-chat';

// Helper: Verificar modo atual (sempre MT)
export function getWhatsAppChatMode(): 'mt' {
  return 'mt';
}

export default useWhatsAppChatAdapter;
