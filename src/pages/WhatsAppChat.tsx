import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { useWhatsAppChatAdapter } from "@/hooks/useWhatsAppChatAdapter";
import { useWhatsAppPermissionsMT } from "@/hooks/multitenant/useWhatsAppPermissionsMT";
import { useWahaConfigAdapter } from "@/hooks/useWahaConfigAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { wahaApi } from "@/services/waha-api";
import { wahaClient } from "@/services/waha/wahaDirectClient";
import { toast } from "sonner";
import { useWhatsAppRouterMT } from "@/hooks/multitenant/useWhatsAppRouterMT";
import { useWhatsAppHybridConfigMT } from "@/hooks/multitenant/useWhatsAppHybridConfigMT";
import { useWhatsAppLabelsMT } from "@/hooks/multitenant/useWhatsAppLabelsMT";
import { useWhatsAppConversationsMT } from "@/hooks/multitenant/useWhatsAppConversationsMT";
import { useWhatsAppMessagesMT } from "@/hooks/multitenant/useWhatsAppMessagesMT";
import type { LeadFieldData } from "@/components/whatsapp/chat/DynamicFieldMenu";
import type { WhatsAppSessao } from "@/types/whatsapp-sessao";
import type { MTWhatsAppSession } from "@/types/whatsapp-mt";
import type { WhatsAppConversa } from "@/types/whatsapp-chat";
import type { WhatsAppSession } from "@/types/whatsapp";
import { SessionSelectorPage } from "@/components/whatsapp/SessionSelectorPage";
import { supabase } from "@/integrations/supabase/client";

// chat-v2 components
import { WhatsAppChatLayout } from "@/components/whatsapp/chat-v2/WhatsAppChatLayout";
import { IconSubmenu } from "@/components/whatsapp/chat-v2/IconSubmenu";
import { ConversationListPanel } from "@/components/whatsapp/chat-v2/ConversationListPanel";
import { ChatAreaPanel } from "@/components/whatsapp/chat-v2/ChatAreaPanel";
import { ForwardDialog } from "@/components/whatsapp/chat-v2/ForwardDialog";
import { NewContactDialog } from "@/components/whatsapp/chat-v2/NewContactDialog";
import { CRMPanel } from "@/components/whatsapp/chat-v2/crm-panel/CRMPanel";
import { AIPanel } from "@/components/whatsapp/chat-v2/ai-panel/AIPanel";
import { useWhatsAppChatPanel } from "@/hooks/useWhatsAppChatPanel";
import { useConversationFilters } from "@/hooks/useConversationFilters";
import { ChatProvider, type ChatContextValue } from "@/contexts/ChatContext";

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
export default function WhatsAppChat() {
  const { sessaoId } = useParams<{ sessaoId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { tenant, franchise, user: mtUser } = useTenantContext();
  const { sessions: sessoes, isLoading: isLoadingSessoes } = useWhatsAppSessionsAdapter();
  const getSessao = (id: string) => sessoes.find(s => s.id === id) || null;
  const [sessao, setSessao] = useState<MTWhatsAppSession | null>(null);
  const [isLoadingSessao, setIsLoadingSessao] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { config: wahaConfig, isLoading: loadingWahaConfig } = useWahaConfigAdapter();

  // Fetch session - only runs once per sessaoId
  const hasFetchedRef = useRef<string | null>(null);

  // Se não tem sessaoId, tentar auto-redirect para sessão padrão da franquia
  const showSessionSelector = !sessaoId;

  useEffect(() => {
    if (!sessaoId && !isLoadingSessoes && sessoes.length > 0) {
      // Buscar sessão padrão (is_default=true) ou a primeira ativa com status WORKING
      const s = sessoes as Array<typeof sessoes[0] & { is_default?: boolean }>;
      const isWorking = (status: string | undefined) => status?.toLowerCase() === 'working';
      const defaultSession = s.find(x => x.is_default && isWorking(x.status))
        || s.find(x => x.is_default)
        || s.find(x => isWorking(x.status));
      if (defaultSession?.id) {
        navigate(`/whatsapp/conversas/${defaultSession.id}`, { replace: true });
      }
    }
  }, [sessaoId, isLoadingSessoes, sessoes, navigate]);

  // Session selector estados movidos para SessionSelectorPage.tsx

  const { user } = useAuth();

  // Session selector logic moved to SessionSelectorPage.tsx
  // validSessions, sessionIds, allConversations, sessionStats,
  // handleClearAllData, handleSyncAll, handleSyncSession, etc.
  // are all now in SessionSelectorPage.tsx

  // Reset state when sessaoId changes to prevent stale data from previous session
  useEffect(() => {
    setSessao(null);
    setError(null);
    setIsLoadingSessao(true);
    hasFetchedRef.current = null;
  }, [sessaoId]);

  useEffect(() => {
    if (!sessaoId) {
      // Não é erro - vamos mostrar o seletor de sessões
      setIsLoadingSessao(false);
      return;
    }

    // Esperar sessões carregarem antes de buscar a sessão específica
    if (isLoadingSessoes) return;

    if (loadingWahaConfig) return;

    // Prevent duplicate fetches for the same session
    if (hasFetchedRef.current === sessaoId) return;

    // Check if online before making requests
    if (!navigator.onLine) {
      console.warn("Navegador offline, aguardando conexão...");
      setError("Sem conexão com a internet. Verifique sua rede.");
      setIsLoadingSessao(false);
      return;
    }

    hasFetchedRef.current = sessaoId;

    const fetchSessao = async () => {
      try {
        const data = await getSessao(sessaoId);
        if (!data) {
          setSessao(null);
          setError("Sessão não encontrada no banco de dados");
          hasFetchedRef.current = null; // Allow retry
          return;
        }

        if (wahaConfig?.api_url && wahaConfig?.api_key) {
          wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key);
        }

        // SEMPRE carregar sessão do banco primeiro (conversas ficam disponíveis)
        setSessao(data);

        // Tentar sincronizar info do WAHA em background (não bloqueia UI)
        try {
          const wahaSession = await wahaApi.getSession(data.session_name);

          if (wahaSession.status !== "WORKING") {
            console.warn(`[WAHA] Sessão ${data.session_name} não está WORKING (${wahaSession.status})`);
            // Mostrar aviso mas NÃO bloquear acesso às conversas do banco
            if (wahaSession.status === "SCAN_QR_CODE") {
              toast.warning("Sessão precisa de autenticação. Escaneie o QR Code para enviar mensagens.");
            } else if (wahaSession.status === "STOPPED" || wahaSession.status === "FAILED") {
              toast.warning("Sessão parada no WAHA. Inicie a sessão para enviar mensagens.");
            }
            // NÃO retorna - conversas do banco continuam disponíveis para visualização
          } else {
            // Sync WAHA session info (telefone, nome, foto) para o banco
            const meId = wahaSession.me?.id;
            const pushName = wahaSession.me?.pushName;
            if (meId) {
              const phone = meId.replace('@c.us', '');
              const updates: Record<string, unknown> = {};

              if (phone && phone !== data.telefone) {
                updates.telefone = phone;
              }
              if (pushName && pushName !== data.display_name) {
                updates.display_name = pushName;
              }

              try {
                const contactInfo = await wahaApi.getContactInfo(data.session_name, meId, phone);
                if (contactInfo.picture && contactInfo.picture.length > 10 && contactInfo.picture !== data.profile_picture_url) {
                  updates.profile_picture_url = contactInfo.picture;
                }
              } catch {
                // Foto não disponível, sem problema
              }

              if (Object.keys(updates).length > 0) {
                updates.updated_at = new Date().toISOString();
                await supabase
                  .from('mt_whatsapp_sessions')
                  .update(updates)
                  .eq('id', data.id);
                Object.assign(data, updates);
                setSessao({ ...data });
              }
            }
          }
        } catch (wahaErr) {
          console.warn("WAHA indisponível, usando dados do banco:", wahaErr);
          // Sessão já foi definida acima - conversas carregam do banco normalmente
        }
      } catch (err) {
        console.error("Erro ao buscar sessão:", err);
        setSessao(null);
        setError("Erro ao carregar sessão");
        hasFetchedRef.current = null; // Allow retry on error
      } finally {
        setIsLoadingSessao(false);
      }
    };

    fetchSessao();
  }, [sessaoId, isLoadingSessoes, loadingWahaConfig, wahaConfig?.api_url, wahaConfig?.api_key, sessoes]);

  const { canSend, isLoading: isLoadingPermissions } = useWhatsAppPermissionsMT(sessaoId || undefined);

  const {
    chats,
    isLoadingChats,
    isSyncing,
    messages,
    isLoadingMessages,
    selectedChatId,
    selectChat,
    sendMessage,
    sendMedia,
    sendContact,
    sendPoll,
    sendLocation,
    sendEvent,
    deleteMessage,
    retryMessage,
    assumirConversa,
    devolverAoBot,
    syncChatsFromWaha,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    loadMoreChats,
    hasMoreChats,
    isLoadingMoreChats,
    searchConversations,
    searchResults,
    isSearching,
    refreshChats: fetchChats,
  } = useWhatsAppChatAdapter(sessao?.session_name || null, sessaoId || null);

  const selectedChat = chats.find(c => c.chat_id === selectedChatId)
    || searchResults?.find(c => c.chat_id === selectedChatId)
    || null;

  // ==========================================
  // ACTIONS MT: archive, markAsUnread, pin, react
  // ==========================================
  const {
    archiveConversation: archiveConvMT,
    restoreConversation: restoreConvMT,
    markAsUnread: markAsUnreadMT,
    markAsRead: markAsReadMT,
  } = useWhatsAppConversationsMT(sessao?.id);

  const {
    pinMessage: pinMessageMT,
    unpinMessage: unpinMessageMT,
    sendReaction: sendReactionMT,
  } = useWhatsAppMessagesMT(selectedChat?.id);

  // Handler: arquivar conversa por chatId (string do WAHA)
  const handleArchiveConversation = useCallback(async (chatId: string) => {
    const conv = chats.find(c => c.chat_id === chatId);
    if (!conv?.id) return;
    try { await archiveConvMT.mutateAsync(conv.id); }
    catch { /* toast already shown by mutation */ }
  }, [chats, archiveConvMT]);

  // Handler: restaurar conversa arquivada
  const handleUnarchiveConversation = useCallback(async (chatId: string) => {
    const conv = chats.find(c => c.chat_id === chatId);
    if (!conv?.id) return;
    try { await restoreConvMT.mutateAsync(conv.id); }
    catch { /* toast already shown */ }
  }, [chats, restoreConvMT]);

  // Handler: marcar conversa como não lida
  const handleMarkAsUnreadConversation = useCallback(async (chatId: string) => {
    const conv = chats.find(c => c.chat_id === chatId);
    if (!conv?.id) return;
    try { await markAsUnreadMT.mutateAsync(conv.id); }
    catch { /* toast already shown */ }
  }, [chats, markAsUnreadMT]);

  // Handler: marcar conversa como lida
  const handleMarkAsReadConversation = useCallback(async (chatId: string) => {
    const conv = chats.find(c => c.chat_id === chatId);
    if (!conv?.id) return;
    try { await markAsReadMT.mutateAsync(conv.id); }
    catch { /* toast already shown */ }
  }, [chats, markAsReadMT]);

  // Handler: fixar mensagem
  const handlePinMessage = useCallback(async (messageId: string) => {
    try { await pinMessageMT.mutateAsync({ messageId }); }
    catch { /* toast already shown */ }
  }, [pinMessageMT]);

  // Handler: desafixar mensagem
  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try { await unpinMessageMT.mutateAsync(messageId); }
    catch { /* toast already shown */ }
  }, [unpinMessageMT]);

  // Handler: enviar reação
  const handleSendReaction = useCallback(async (messageId: string, reaction: string) => {
    try { await sendReactionMT.mutateAsync({ messageId, reaction }); }
    catch { /* toast already shown */ }
  }, [sendReactionMT]);

  // Forward message
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);

  const handleForwardMessage = useCallback((messageId: string) => {
    setForwardingMessageId(messageId);
  }, []);

  const handleForwardConfirm = useCallback(async (targetChatId: string) => {
    if (!sessao?.session_name || !selectedChat?.chat_id || !forwardingMessageId) return;
    try {
      await wahaClient.forwardMessage(
        sessao.session_name,
        targetChatId,
        forwardingMessageId,
        selectedChat.chat_id
      );
      toast.success('Mensagem encaminhada');
      setForwardingMessageId(null);
    } catch (err) {
      toast.error('Erro ao encaminhar mensagem');
      throw err;
    }
  }, [sessao?.session_name, selectedChat?.chat_id, forwardingMessageId]);

  // Phone click → New Contact dialog
  const [phoneForNewContact, setPhoneForNewContact] = useState<string | null>(null);

  const handlePhoneClick = useCallback((phone: string) => {
    setPhoneForNewContact(phone);
  }, []);

  const handleNewContactConfirm = useCallback(async (data: {
    nome: string;
    telefone: string;
    saveAsLead: boolean;
    message: string;
  }) => {
    if (!sessao?.session_name || !sessaoId) {
      toast.error('Sessão não selecionada');
      return;
    }

    try {
      // 1. Salvar como lead se solicitado
      if (data.saveAsLead && tenant) {
        const { error: leadError } = await supabase
          .from('mt_leads')
          .insert({
            nome: data.nome,
            telefone: data.telefone,
            tenant_id: tenant.id,
            franchise_id: franchise?.id || null,
            origem: 'whatsapp',
            status: 'novo',
          });
        if (leadError && !leadError.message?.includes('duplicate')) {
          console.warn('[NewContact] Erro ao criar lead:', leadError);
        }
      }

      // 2. Formatar chatId para WAHA
      const digits = data.telefone.replace(/\D/g, '');
      const chatId = digits.length <= 15 ? `${digits}@c.us` : data.telefone;

      // 3. Enviar mensagem via WAHA
      if (data.message.trim()) {
        await wahaClient.sendText(sessao.session_name, chatId, data.message);
        toast.success(`Mensagem enviada para ${data.nome}`);
      }

      // 4. Criar/buscar conversa no banco
      const { data: existingConv } = await supabase
        .from('mt_whatsapp_conversations')
        .select('id, chat_id')
        .eq('session_id', sessaoId)
        .eq('chat_id', chatId)
        .maybeSingle();

      if (!existingConv) {
        await supabase
          .from('mt_whatsapp_conversations')
          .insert({
            session_id: sessaoId,
            chat_id: chatId,
            contact_name: data.nome,
            contact_phone: digits,
            tenant_id: tenant?.id,
            franchise_id: franchise?.id || null,
            status: 'aberta',
            is_group: false,
          });
      }

      // 5. Refresh e selecionar
      await fetchChats();
      selectChat(chatId);
      setPhoneForNewContact(null);
    } catch (err) {
      toast.error('Erro ao iniciar conversa');
      console.error('[NewContact] Erro:', err);
    }
  }, [sessao, sessaoId, tenant, franchise, selectChat, fetchChats]);

  // Block/unblock contact
  const [isContactBlocked, setIsContactBlocked] = useState(false);

  const handleBlockContact = useCallback(async () => {
    if (!sessao?.session_name || !selectedChat?.chat_id) return;
    try {
      await wahaClient.blockContact(sessao.session_name, selectedChat.chat_id);
      setIsContactBlocked(true);
      toast.success('Contato bloqueado');
    } catch (err) {
      toast.error('Erro ao bloquear contato');
    }
  }, [sessao?.session_name, selectedChat?.chat_id]);

  const handleUnblockContact = useCallback(async () => {
    if (!sessao?.session_name || !selectedChat?.chat_id) return;
    try {
      await wahaClient.unblockContact(sessao.session_name, selectedChat.chat_id);
      setIsContactBlocked(false);
      toast.success('Contato desbloqueado');
    } catch (err) {
      toast.error('Erro ao desbloquear contato');
    }
  }, [sessao?.session_name, selectedChat?.chat_id]);

  // Reset block state on chat change
  useEffect(() => {
    setIsContactBlocked(false);
  }, [selectedChatId]);

  // Auto-select conversation from URL query param ?chat=<conversation_id>
  const chatParamProcessed = useRef(false);
  useEffect(() => {
    const chatParam = searchParams.get('chat');
    if (!chatParam || chatParamProcessed.current) return;

    // Try finding in already loaded chats first
    const targetChat = chats.find(c => c.id === chatParam);
    if (targetChat) {
      chatParamProcessed.current = true;
      selectChat(targetChat.chat_id);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('chat');
      setSearchParams(newParams, { replace: true });
      return;
    }

    // If not found in loaded chats and chats are loaded, query DB directly
    if (!isLoadingChats && chats.length > 0) {
      chatParamProcessed.current = true;
      supabase
        .from('mt_whatsapp_conversations')
        .select('chat_id')
        .eq('id', chatParam)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.chat_id) {
            selectChat(data.chat_id);
          }
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('chat');
          setSearchParams(newParams, { replace: true });
        });
    }
  }, [searchParams, chats, isLoadingChats, selectChat, setSearchParams]);

  // Reset the ref when URL changes (new navigation)
  useEffect(() => {
    chatParamProcessed.current = false;
  }, [sessaoId]);

  // Search in conversation state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sistema Híbrido - Roteamento inteligente WAHA + Meta Cloud API
  const {
    decision: routingDecision,
    windowStatus: hybridWindowStatus,
    canForceProvider,
  } = useWhatsAppRouterMT(selectedChat?.id);
  const { isHybridEnabled: hybridEnabled } = useWhatsAppHybridConfigMT();

  // Build leadData for ChatInput dynamic fields from LeadPanel's React Query cache
  const chatLeadData = useMemo((): LeadFieldData | null => {
    if (!selectedChat?.numero_telefone) return null;
    // Try to get cached lead data from LeadPanel's query
    const phone = selectedChat.numero_telefone;
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    const variants = normalized.length >= 10 ? [normalized, `55${normalized}`] : [];
    const cachedLead = queryClient.getQueryData<any>(['lead-panel', tenant?.id, variants]);
    if (cachedLead) {
      return {
        nome: cachedLead.nome || undefined,
        telefone: cachedLead.telefone || undefined,
        email: cachedLead.email || undefined,
        cidade: cachedLead.cidade || undefined,
        servico: cachedLead.servico_interesse || undefined,
        franquia: undefined, // Not available in lead data directly
      };
    }
    // Fallback: basic info from chat
    return {
      nome: selectedChat.nome_contato || undefined,
      telefone: selectedChat.numero_telefone || undefined,
    };
  }, [selectedChat, queryClient, tenant?.id]);

  // Handle slash command actions from ChatInput
  const handleSlashCommand = useCallback((action: string) => {
    switch (action) {
      case 'open_templates':
        toast.info('Use o botao de templates ao lado do campo de mensagem');
        break;
      case 'open_quick_replies':
        toast.info('Respostas rapidas serao implementadas em breve');
        break;
      case 'add_note':
        toast.info('Nota interna sera implementada em breve');
        break;
      case 'create_appointment':
        if (chatLeadData?.nome) {
          navigate(`/agendamentos/novo`);
        } else {
          toast.info('Vincule um lead antes de agendar');
        }
        break;
      case 'transfer':
        toast.info('Transferencia sera implementada em breve');
        break;
      case 'add_tag':
        toast.info('Etiquetas serao implementadas em breve');
        break;
    }
  }, [chatLeadData, navigate]);

  // Handler para ChatInput - enviar mensagem de texto
  const handleChatInputSend = async (message: string, quotedId?: string): Promise<{ success: boolean; error?: string }> => {
    const result = await sendMessage(message, quotedId);
    return { success: result.success, error: result.error };
  };

  // Handler para ChatInput - enviar mídia
  const handleChatInputSendMedia = async (
    file: File,
    type: "image" | "document" | "audio" | "video",
    caption?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await sendMedia(file, type, caption);
    return { success: result.success, error: result.error };
  };

  // Handler para ChatInput - enviar contato
  const handleChatInputSendContact = async (contact: {
    fullName: string;
    phoneNumber: string;
    organization?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    return sendContact(contact);
  };

  // Handler para ChatInput - enviar enquete
  const handleChatInputSendPoll = async (poll: {
    name: string;
    options: string[];
    multipleAnswers?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    return sendPoll(poll);
  };

  // Handler para ChatInput - enviar localização
  const handleChatInputSendLocation = async (location: {
    latitude: number;
    longitude: number;
    title?: string;
    address?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    return sendLocation(location);
  };

  // Handler para ChatInput - enviar evento
  const handleChatInputSendEvent = async (event: {
    name: string;
    description?: string;
    startTime: number;
    endTime?: number;
    location?: { name: string };
  }): Promise<{ success: boolean; error?: string }> => {
    return sendEvent(event);
  };

  // ==========================================
  // CHAT-V2: Panel state and conversation filters
  // ==========================================
  const panelState = useWhatsAppChatPanel();
  const {
    filteredChats,
    counts,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    selectedLabelIds,
    setSelectedLabelIds,
    selectedAssignedUser,
    setSelectedAssignedUser,
    assignedUsers,
  } = useConversationFilters(chats, mtUser ? [mtUser.auth_user_id, mtUser.id].filter(Boolean) as string[] : null);

  // Server-side search: disparar quando searchTerm muda
  useEffect(() => {
    searchConversations(searchTerm);
  }, [searchTerm, searchConversations]);

  // Usar resultados server-side quando busca ativa, senao usar filtro client-side
  const displayChats = searchTerm.trim() && searchResults !== null ? searchResults : filteredChats;

  // Labels para filtro de conversas
  const { labels: allLabels } = useWhatsAppLabelsMT();

  // CRM Panel: Find lead by phone number
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);

  // Try to resolve phone from messages when conversation has no phone
  useEffect(() => {
    if (selectedChat?.numero_telefone) {
      setResolvedPhone(null); // Use original phone, no need to resolve
      return;
    }
    if (!selectedChat?.id) {
      setResolvedPhone(null);
      return;
    }
    // Try to extract phone from chat_id (@c.us)
    if (selectedChat.chat_id?.endsWith('@c.us')) {
      const digits = selectedChat.chat_id.replace('@c.us', '').replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        setResolvedPhone(digits);
        return;
      }
    }
    // For @lid conversations: phone should already be resolved during sync
    // via extractPhoneNumber() and saved to contact_phone
    setResolvedPhone(null);
  }, [selectedChat?.id, selectedChat?.numero_telefone, selectedChat?.chat_id]);

  // Effective phone: original or resolved
  const effectivePhone = selectedChat?.numero_telefone || resolvedPhone;

  useEffect(() => {
    if (!effectivePhone) {
      setSelectedLeadId(null);
      return;
    }
    const findLead = async () => {
      const digits = effectivePhone.replace(/\D/g, '');
      const normalized = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
      const variants = [digits, `55${digits}`];
      if (normalized !== digits) variants.push(normalized, `55${normalized}`);
      const orFilter = variants.flatMap(v => [`telefone.eq.${v}`, `whatsapp.eq.${v}`]).join(',');
      const { data } = await supabase
        .from('mt_leads')
        .select('id')
        .or(orFilter)
        .limit(1)
        .maybeSingle();
      setSelectedLeadId(data?.id || null);
    };
    findLead();
  }, [effectivePhone]);

  // ==========================================
  // RENDERS
  // ==========================================

  // Loading state
  if (isLoadingSessao && !showSessionSelector) {
    return (
      <div className="flex h-screen min-h-[500px] items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center text-[#667781]">
          <Loader2 className="h-12 w-12 animate-spin text-[#25d366]" />
          <p className="mt-4">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  // Session selector - quando não tem sessaoId na URL
  if (showSessionSelector) {
    return <SessionSelectorPage />;
  }


  // Error state
  if (error) {
    return (
      <div className="flex h-screen min-h-[500px] items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center text-[#667781]">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro</h2>
          <p className="mb-6 max-w-[400px] text-center">{error}</p>
          <Button
            onClick={() => navigate("/whatsapp")}
            className="bg-[#00a884] hover:bg-[#00a884]/90 text-white"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar para sessões
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN CHAT VIEW (using chat-v2 layout)
  // ==========================================

  const handleSync = async () => {
    const result = await syncChatsFromWaha();
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  // ChatContext — centraliza dados e ações do chat para sub-componentes
  const chatContextValue: ChatContextValue = {
    selectedChat,
    messages,
    isLoadingMessages,
    wahaApiUrl: wahaConfig?.api_url,
    wahaApiKey: wahaConfig?.api_key,
    sessionName: sessao?.session_name || null,
    canSend,
    isLoadingPermissions,
    sendMessage: handleChatInputSend,
    sendMedia: handleChatInputSendMedia,
    sendContact: handleChatInputSendContact,
    sendPoll: handleChatInputSendPoll,
    sendLocation: handleChatInputSendLocation,
    sendEvent: handleChatInputSendEvent,
    deleteMessage,
    retryMessage,
    pinMessage: handlePinMessage,
    unpinMessage: handleUnpinMessage,
    reactMessage: handleSendReaction,
    forwardMessage: handleForwardMessage,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    archiveConversation: selectedChat ? () => handleArchiveConversation(selectedChat.chat_id) : undefined,
    unarchiveConversation: selectedChat ? () => handleUnarchiveConversation(selectedChat.chat_id) : undefined,
    markAsUnread: selectedChat ? () => handleMarkAsUnreadConversation(selectedChat.chat_id) : undefined,
    isArchived: selectedChat?.status === 'archived',
    toggleCrmPanel: () => panelState.toggleCrmPanel(),
    crmPanelOpen: panelState.crmPanelOpen,
    toggleAiPanel: () => panelState.toggleAiPanel(),
    aiPanelOpen: panelState.aiPanelOpen,
    onBack: panelState.isMobile ? () => panelState.goBackToList() : undefined,
    showBackButton: panelState.isMobile,
    isBotActive: selectedChat?.is_bot_active || false,
    toggleBot: selectedChat
      ? async () => {
          if (selectedChat.is_bot_active) {
            if (!user?.id || !selectedChat.id) return;
            const result = await assumirConversa(selectedChat.id, user.id);
            if (result.success) toast.success('Conversa assumida! Bot desativado.');
            else toast.error(result.error || 'Erro ao assumir conversa');
          } else if (selectedChat.assigned_to) {
            const result = await devolverAoBot(selectedChat.id);
            if (result.success) toast.success('Conversa devolvida ao bot!');
            else toast.error(result.error || 'Erro ao devolver ao bot');
          } else {
            if (!user?.id || !selectedChat.id) return;
            const result = await assumirConversa(selectedChat.id, user.id);
            if (result.success) toast.success('Conversa assumida!');
            else toast.error(result.error || 'Erro ao assumir conversa');
          }
        }
      : undefined,
    assignedUserName: selectedChat?.assigned_user_name,
    leadData: chatLeadData,
    onSlashCommand: handleSlashCommand,
    blockContact: handleBlockContact,
    unblockContact: handleUnblockContact,
    isBlocked: isContactBlocked,
    searchInConversation: () => setIsSearchOpen(prev => !prev),
    onPhoneClick: handlePhoneClick,
    isHybridEnabled: hybridEnabled,
    routingProvider: (routingDecision?.provider as 'waha' | 'meta_cloud_api' | null) ?? null,
    windowOpen: hybridWindowStatus?.is_open ?? false,
    windowTimeRemaining: hybridWindowStatus?.time_remaining_text ?? null,
    windowType: (hybridWindowStatus?.window_type as '24h' | '72h' | null) ?? null,
  };

  return (
    <ChatProvider value={chatContextValue}>
    <WhatsAppChatLayout
      activePanel={panelState.activePanel}
      crmPanelOpen={panelState.crmPanelOpen}
      aiPanelOpen={panelState.aiPanelOpen}
      isMobile={panelState.isMobile}
      isTablet={panelState.isTablet}
      iconSubmenuVisible={panelState.iconSubmenuVisible}
      iconSubmenu={
        <IconSubmenu
          onSync={handleSync}
          isSyncing={isSyncing}
          onToggleAiPanel={() => panelState.toggleAiPanel()}
          aiPanelOpen={panelState.aiPanelOpen}
        />
      }
      conversationList={
        <ConversationListPanel
          sessionName={sessao?.display_name || sessao?.nome || 'WhatsApp'}
          sessionPhone={sessao?.telefone || null}
          sessionStatus={sessao?.status}
          sessionAvatar={sessao?.profile_picture_url || null}
          chatCount={displayChats.length}
          chats={displayChats}
          isSearching={isSearching}
          selectedChatId={selectedChatId}
          isLoading={isLoadingChats}
          isSyncing={isSyncing}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
          onSelectChat={(chatId) => {
            selectChat(chatId);
            if (panelState.isMobile) panelState.selectChat(chatId);
          }}
          onSync={handleSync}
          onBack={() => navigate('/whatsapp/conversas')}
          labels={allLabels?.map(l => ({ id: l.id, name: l.name, color: l.color })) || []}
          selectedLabelIds={selectedLabelIds}
          onLabelFilterChange={setSelectedLabelIds}
          assignedUsers={assignedUsers}
          selectedAssignedUser={selectedAssignedUser}
          onAssignedUserChange={setSelectedAssignedUser}
          onArchiveConversation={handleArchiveConversation}
          onUnarchiveConversation={handleUnarchiveConversation}
          onMarkAsUnread={handleMarkAsUnreadConversation}
          onMarkAsRead={handleMarkAsReadConversation}
          onLoadMore={loadMoreChats}
          hasMore={hasMoreChats}
          isLoadingMore={isLoadingMoreChats}
          availableSessions={sessoes.filter(s => s.is_active !== false).map(s => ({
            id: s.id,
            nome: s.nome || s.session_name,
            telefone: s.telefone || null,
            status: s.status,
            display_name: s.display_name || null,
          }))}
          currentSessionId={sessaoId}
          onSwitchSession={(newSessionId) => navigate(`/whatsapp/conversas/${newSessionId}`)}
        />
      }
      chatArea={<ChatAreaPanel />}
      aiPanel={
        selectedChat ? (
          <AIPanel
            conversationId={selectedChat.id}
            messages={messages}
            contactName={selectedChat.nome_contato}
            phone={effectivePhone}
            onClose={() => panelState.closeAiPanel()}
            onSendSuggestion={async (text: string) => {
              const result = await sendMessage(text);
              if (result.success) toast.success('Sugestão enviada!');
              else toast.error(result.error || 'Erro ao enviar sugestão');
            }}
            onEditSuggestion={(text: string) => {
              // Focus ChatInput and set text - dispatch custom event
              const event = new CustomEvent('ai-suggestion-edit', { detail: { text } });
              window.dispatchEvent(event);
            }}
          />
        ) : null
      }
      crmPanel={
        selectedChat ? (
          <CRMPanel
            leadId={selectedLeadId}
            conversationId={selectedChat.id}
            phone={effectivePhone}
            contactName={selectedChat.nome_contato}
            isGroup={selectedChat.is_group}
            chatId={selectedChat.chat_id}
            sessionName={sessao?.session_name || null}
            contactAvatar={selectedChat.foto_url}
            onClose={() => panelState.closeCrmPanel()}
            onCreateLead={(phone, name) => {
              navigate(`/leads/novo?telefone=${encodeURIComponent(phone || '')}${name ? `&nome=${encodeURIComponent(name)}` : ''}`);
            }}
          />
        ) : null
      }
    />

      <ForwardDialog
        open={!!forwardingMessageId}
        onClose={() => setForwardingMessageId(null)}
        onForward={handleForwardConfirm}
        conversations={chats}
        currentChatId={selectedChat?.chat_id}
      />

      <NewContactDialog
        open={!!phoneForNewContact}
        phone={phoneForNewContact || ''}
        onClose={() => setPhoneForNewContact(null)}
        onConfirm={handleNewContactConfirm}
      />
    </ChatProvider>
  );
}
