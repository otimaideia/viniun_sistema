// =============================================================================
// SESSION SELECTOR PAGE - Extraído de WhatsAppChat.tsx
// Exibe cards de sessões com stats quando nenhuma sessão está selecionada
// =============================================================================

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeObjectForJSON } from "@/utils/unicodeSanitizer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  Download,
  Loader2,
  MessageCircle,
  Trash2,
  Settings,
} from "lucide-react";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { useWahaConfigAdapter } from "@/hooks/useWahaConfigAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { wahaApi, generateDefaultAvatar } from "@/services/waha-api";
import { toast } from "sonner";
import type { WhatsAppConversa } from "@/types/whatsapp-chat";
import type { WhatsAppSession, SessionStatus } from "@/types/whatsapp";
import type { WhatsAppSessao } from "@/types/whatsapp-sessao";
import { SessionCard, NewSessionCard } from "@/components/whatsapp/SessionCard";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

export function SessionSelectorPage() {
  const navigate = useNavigate();
  const { sessions: sessoes, isLoading: isLoadingSessoes } = useWhatsAppSessionsAdapter();
  const { config: wahaConfig } = useWahaConfigAdapter();
  const { isAdmin, isLoading: isLoadingProfile } = useUserProfileAdapter();
  const { user } = useAuth();
  const { tenant, accessLevel } = useTenantContext();

  // Filter sessions that are working/connected
  const workingSessoes = sessoes.filter(s => s.status === 'working' || s.status === 'connected');

  // ==========================================
  // ESTADOS
  // ==========================================
  const [allConversations, setAllConversations] = useState<WhatsAppConversa[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isClearingAllData, setIsClearingAllData] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{
    current: number;
    total: number;
    currentSession: string;
  } | null>(null);
  const syncAllCancelledRef = useRef(false);
  const [syncProgressBySession, setSyncProgressBySession] = useState<Record<string, {
    isRunning: boolean;
    current: number;
    total: number;
    currentChat: string;
  }>>({});
  const [clearingDataSessions, setClearingDataSessions] = useState<Record<string, boolean>>({});
  const syncCancelledBySessionRef = useRef<Record<string, boolean>>({});
  const [leadsCountBySession, setLeadsCountBySession] = useState<Record<string, number>>({});

  // IDs de sessão válidas
  const validSessions = useMemo(() => {
    return sessoes.filter(s => s.id && !s.id.startsWith('waha-') && !s.id.startsWith('blocked-'));
  }, [sessoes]);
  const sessionIds = useMemo(() => validSessions.map(s => s.id), [validSessions]);

  // Buscar conversas de todas as sessões para stats
  useEffect(() => {
    if (sessionIds.length === 0) return;
    const fetchAllConversations = async () => {
      setIsLoadingConversations(true);
      try {
        let q = supabase
          .from('mt_whatsapp_conversations')
          .select('*')
          .in('session_id', sessionIds);
        if (tenant) q = q.eq('tenant_id', tenant.id);
        const { data, error: err } = await q;
        if (err) console.error('[SessionSelector] Erro ao buscar conversas:', err);
        else setAllConversations(data || []);
      } catch (e) {
        console.error('[SessionSelector] Erro:', e);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchAllConversations();
  }, [sessionIds]);

  // Real-time subscription
  useEffect(() => {
    if (sessionIds.length === 0) return;
    const channel = supabase
      .channel('whatsapp-conversations-realtime-selector')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mt_whatsapp_conversations',
        filter: `session_id=in.(${sessionIds.join(',')})`,
      }, () => {
        let rq = supabase
          .from('mt_whatsapp_conversations')
          .select('*')
          .in('session_id', sessionIds);
        if (tenant) rq = rq.eq('tenant_id', tenant.id);
        rq.then(({ data, error }) => {
            if (!error) setAllConversations(data || []);
          });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionIds]);

  // Buscar contagem de leads por sessão
  useEffect(() => {
    if (sessionIds.length === 0) return;
    const fetchLeadsCount = async () => {
      try {
        let lq = supabase
          .from('mt_whatsapp_conversations')
          .select('session_id, lead_id')
          .in('session_id', sessionIds)
          .not('lead_id', 'is', null)
          .eq('is_group', false);
        if (tenant) lq = lq.eq('tenant_id', tenant.id);
        const { data, error } = await lq;
        const counts: Record<string, number> = {};
        sessionIds.forEach(id => { counts[id] = 0; });
        if (!error && data) {
          const leadsPerSession: Record<string, Set<string>> = {};
          data.forEach(row => {
            if (!leadsPerSession[row.session_id]) leadsPerSession[row.session_id] = new Set();
            leadsPerSession[row.session_id].add(row.lead_id);
          });
          Object.entries(leadsPerSession).forEach(([sid, set]) => { counts[sid] = set.size; });
        }
        setLeadsCountBySession(counts);
      } catch (e) {
        console.error('[SessionSelector] Erro geral ao buscar leads:', e);
      }
    };
    fetchLeadsCount();
  }, [sessionIds]);

  // Calcular stats
  const sessionStats = useMemo(() => {
    const stats: Record<string, {
      conversationCount: number;
      unreadCount: number;
      todayCount: number;
      readTodayCount: number;
      pendingCount: number;
      leadsCount: number;
    }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validSessions.forEach(session => {
      stats[session.id] = { conversationCount: 0, unreadCount: 0, todayCount: 0, readTodayCount: 0, pendingCount: 0, leadsCount: 0 };
    });
    allConversations.forEach(conv => {
      if (conv.session_id && stats[conv.session_id]) {
        stats[conv.session_id].conversationCount++;
        stats[conv.session_id].unreadCount += conv.unread_count || 0;
        if ((conv.unread_count || 0) === 0) stats[conv.session_id].readTodayCount++;
        if ((conv.unread_count || 0) > 0) stats[conv.session_id].pendingCount += conv.unread_count || 0;
        const lastMessageDate = conv.last_message_at ? new Date(conv.last_message_at) : null;
        if (lastMessageDate && lastMessageDate >= today) stats[conv.session_id].todayCount++;
      }
    });
    validSessions.forEach(session => {
      stats[session.id].leadsCount = leadsCountBySession[session.id] || 0;
    });
    return stats;
  }, [validSessions, allConversations, leadsCountBySession]);

  // Mapear sessão
  const mapSessaoToSession = useCallback((sessao: WhatsAppSessao): WhatsAppSession => {
    const statusMap: Record<string, SessionStatus> = {
      'connected': 'connected', 'working': 'connected', 'scan_qr': 'qr_code',
      'starting': 'connecting', 'stopped': 'disconnected', 'failed': 'failed',
    };
    return {
      id: sessao.id, franqueado_id: sessao.franqueado_id, user_id: null,
      session_name: sessao.session_name,
      phone_number: (sessao as any).telefone || sessao.phone_number,
      display_name: (sessao as any).display_name || sessao.nome,
      profile_picture_url: (sessao as any).profile_picture_url || null,
      status: statusMap[sessao.status] || 'disconnected',
      last_seen_at: sessao.ultimo_check, qr_code_data: sessao.qr_code, qr_code_expires_at: null,
      is_default: false, webhook_url: null, auto_reply_enabled: false, auto_reply_message: null,
      created_at: sessao.created_at, updated_at: sessao.updated_at,
    };
  }, []);

  const handleOpenSessionConversations = useCallback((sessionId: string) => {
    navigate(`/whatsapp/conversas/${sessionId}`);
  }, [navigate]);

  const handleNewSession = useCallback(() => {
    navigate('/whatsapp');
  }, [navigate]);

  // Handler: Limpar TODOS os dados
  const handleClearAllData = useCallback(async () => {
    if (validSessions.length === 0) { toast.error("Nenhuma sessão encontrada"); return; }
    setIsClearingAllData(true);
    try {
      let delMsgQ = supabase.from("mt_whatsapp_messages").delete({ count: 'exact' }).in("session_id", sessionIds);
      if (tenant) delMsgQ = delMsgQ.eq("tenant_id", tenant.id);
      const { error: msgError, count: msgCount } = await delMsgQ;
      if (msgError) { toast.error(`Erro ao deletar mensagens: ${msgError.message}`); return; }
      let delConvQ = supabase.from("mt_whatsapp_conversations").delete({ count: 'exact' }).in("session_id", sessionIds);
      if (tenant) delConvQ = delConvQ.eq("tenant_id", tenant.id);
      const { error: convError, count: convCount } = await delConvQ;
      if (convError) { toast.error(`Erro ao deletar conversas: ${convError.message}`); return; }
      toast.success(`Dados limpos! ${msgCount || 0} mensagens e ${convCount || 0} conversas removidas.`);
      setAllConversations([]);
    } catch (err) {
      toast.error(`Erro ao limpar dados: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setIsClearingAllData(false);
      setShowClearAllDialog(false);
    }
  }, [validSessions, sessionIds]);

  // Handler: Sincronizar TODAS
  const handleSyncAll = useCallback(async () => {
    if (validSessions.length === 0) { toast.error("Nenhuma sessão encontrada"); return; }
    if (!wahaConfig?.api_url || !wahaConfig?.api_key) { toast.error("WAHA não configurado"); return; }
    setIsSyncingAll(true);
    syncAllCancelledRef.current = false;
    let totalSynced = 0, totalErrors = 0;
    try {
      wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key);
      for (let i = 0; i < validSessions.length; i++) {
        if (syncAllCancelledRef.current) { toast.info("Sincronização cancelada"); break; }
        const sessao = validSessions[i];
        setSyncAllProgress({ current: i + 1, total: validSessions.length, currentSession: sessao.nome || sessao.session_name });
        if (sessao.status !== 'working') { totalErrors++; continue; }
        try {
          const wahaChats = await wahaApi.getChats(sessao.session_name);
          if (!wahaChats?.length) continue;
          for (const chat of wahaChats) {
            if (syncAllCancelledRef.current) break;
            const chatId = chat.id || chat.jid;
            if (!chatId) continue;
            const phone = await wahaApi.extractPhoneNumber(sessao.session_name, chatId, chat);
            let contactName = chat.name || chat.pushName || null;
            let contactPicture: string | null = null;
            if (!chatId.includes('@g.us')) {
              try {
                const contactInfo = await wahaApi.getContactInfo(sessao.session_name, chatId, phone);
                contactName = contactName || contactInfo.name || null;
                if (contactInfo.picture?.length > 10) contactPicture = contactInfo.picture;
              } catch { contactName = contactName || phone || chatId.replace(/@.*$/, ''); }
            }
            if (!contactPicture && !chatId.includes('@g.us')) contactPicture = generateDefaultAvatar(contactName || phone);
            const { data: existing } = await supabase.from("mt_whatsapp_conversations")
              .select("id").eq("session_id", sessao.id).eq("chat_id", chatId).maybeSingle();
            if (existing) {
              await supabase.from("mt_whatsapp_conversations").update({
                contact_name: contactName, contact_phone: phone || null, contact_avatar: contactPicture,
                is_group: chatId.includes("@g.us") || chatId.includes("@broadcast") || chatId.includes("@newsletter"),
                last_message_at: chat.lastMessageAt || new Date().toISOString(),
                unread_count: chat.unreadCount || 0, updated_at: new Date().toISOString(),
              }).eq("id", existing.id);
            } else {
              await supabase.from("mt_whatsapp_conversations").insert({
                tenant_id: sessao.tenant_id, franchise_id: sessao.franchise_id, session_id: sessao.id,
                chat_id: chatId, contact_phone: phone || null, contact_name: contactName,
                contact_avatar: contactPicture,
                is_group: chatId.includes("@g.us") || chatId.includes("@broadcast") || chatId.includes("@newsletter"),
                last_message_at: chat.lastMessageAt || new Date().toISOString(), unread_count: chat.unreadCount || 0,
              });
              totalSynced++;
            }
          }
        } catch { totalErrors++; }
      }
      let postSyncQ = supabase.from('mt_whatsapp_conversations').select('*').in('session_id', sessionIds);
      if (tenant) postSyncQ = postSyncQ.eq('tenant_id', tenant.id);
      const { data: newConversas } = await postSyncQ;
      setAllConversations(newConversas || []);
      if (totalErrors > 0) toast.warning(`Concluído com ${totalErrors} erro(s). ${totalSynced} novas conversas.`);
      else toast.success(`Sincronização concluída! ${totalSynced} novas conversas.`);
    } catch { toast.error("Erro ao sincronizar todas as sessões"); }
    finally { setIsSyncingAll(false); setSyncAllProgress(null); }
  }, [validSessions, sessionIds, wahaConfig, tenant]);

  // Handler: Limpar dados de UMA sessão
  const handleClearDataSession = useCallback(async (sessaoIdToClean: string) => {
    const sessao = validSessions.find(s => s.id === sessaoIdToClean);
    if (!sessao) { toast.error("Sessão não encontrada"); return; }
    const confirmed = window.confirm(`⚠️ ATENÇÃO!\n\nDELETAR TODAS as conversas e mensagens de "${sessao.nome || sessao.session_name}"?\n\nEsta ação é IRREVERSÍVEL!`);
    if (!confirmed) return;
    setClearingDataSessions(prev => ({ ...prev, [sessaoIdToClean]: true }));
    try {
      let delMsgSQ = supabase.from("mt_whatsapp_messages").delete({ count: 'exact' }).eq("session_id", sessaoIdToClean);
      if (tenant) delMsgSQ = delMsgSQ.eq("tenant_id", tenant.id);
      const { error: msgError, count: msgCount } = await delMsgSQ;
      if (msgError) { toast.error(`Erro: ${msgError.message}`); return; }
      let delConvSQ = supabase.from("mt_whatsapp_conversations").delete({ count: 'exact' }).eq("session_id", sessaoIdToClean);
      if (tenant) delConvSQ = delConvSQ.eq("tenant_id", tenant.id);
      const { error: convError, count: convCount } = await delConvSQ;
      if (convError) { toast.error(`Erro: ${convError.message}`); return; }
      toast.success(`${sessao.nome || sessao.session_name}: ${msgCount || 0} msgs e ${convCount || 0} conversas removidas.`);
      let postClearQ = supabase.from('mt_whatsapp_conversations').select('*').in('session_id', sessionIds);
      if (tenant) postClearQ = postClearQ.eq('tenant_id', tenant.id);
      const { data: newConversas } = await postClearQ;
      setAllConversations(newConversas || []);
    } catch (err) { toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`); }
    finally { setClearingDataSessions(prev => ({ ...prev, [sessaoIdToClean]: false })); }
  }, [validSessions, sessionIds]);

  // Handler: Sincronizar UMA sessão
  const handleSyncSession = useCallback(async (sessaoIdToSync: string) => {
    const sessao = validSessions.find(s => s.id === sessaoIdToSync);
    if (!sessao) { toast.error("Sessão não encontrada"); return; }
    if (!wahaConfig?.api_url || !wahaConfig?.api_key) { toast.error("WAHA não configurado"); return; }
    syncCancelledBySessionRef.current[sessaoIdToSync] = false;
    setSyncProgressBySession(prev => ({ ...prev, [sessaoIdToSync]: { isRunning: true, current: 0, total: 0, currentChat: 'Iniciando...' } }));
    try {
      wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key);
      const wahaChats = await wahaApi.getChats(sessao.session_name, 0, 0);
      if (!wahaChats?.length) {
        toast.info(`Nenhum chat para ${sessao.nome || sessao.session_name}`);
        setSyncProgressBySession(prev => ({ ...prev, [sessaoIdToSync]: { isRunning: false, current: 0, total: 0, currentChat: 'Concluído' } }));
        return;
      }
      let totalSynced = 0;
      for (let i = 0; i < wahaChats.length; i++) {
        if (syncCancelledBySessionRef.current[sessaoIdToSync]) { toast.info(`Sincronização cancelada`); break; }
        const chat = wahaChats[i] as any;
        const chatId = chat.id || chat.jid;
        if (!chatId) continue;
        const phone = await wahaApi.extractPhoneNumber(sessao.session_name, chatId, chat);
        const chatName = chat.name || chat.pushName || phone || chatId.replace(/@.*$/, '');
        setSyncProgressBySession(prev => ({ ...prev, [sessaoIdToSync]: { isRunning: true, current: i + 1, total: wahaChats.length, currentChat: chatName } }));
        let contactName = chat.name || chat.pushName || null;
        let contactPicture: string | null = null;
        if (!chatId.includes('@g.us')) {
          try {
            const contactInfo = await wahaApi.getContactInfo(sessao.session_name, chatId, phone);
            contactName = contactName || contactInfo.name || null;
            if (contactInfo.picture?.length > 10) contactPicture = contactInfo.picture;
          } catch { contactName = contactName || phone || chatId.replace(/@.*$/, ''); }
        }
        if (!contactPicture && !chatId.includes('@g.us')) contactPicture = generateDefaultAvatar(contactName || phone);
        const { data: existingInSession } = await supabase.from("mt_whatsapp_conversations")
          .select("id").eq("session_id", sessaoIdToSync).eq("chat_id", chatId).maybeSingle();
        if (existingInSession) {
          await supabase.from("mt_whatsapp_conversations").update({
            contact_name: contactName, contact_phone: phone || null, contact_avatar: contactPicture,
            is_group: chatId.includes("@g.us") || chatId.includes("@broadcast") || chatId.includes("@newsletter"),
            last_message_at: chat.lastMessageAt || new Date().toISOString(),
            unread_count: chat.unreadCount || 0, updated_at: new Date().toISOString(),
          }).eq("id", existingInSession.id);
        } else {
          const { data: existingByPhone } = await supabase.from("mt_whatsapp_conversations")
            .select("id, session_id, chat_id").eq("contact_phone", phone)
            .neq("session_id", sessaoIdToSync).limit(1).maybeSingle();
          if (existingByPhone) {
            await supabase.from("mt_whatsapp_conversations").update({
              session_id: sessaoIdToSync, chat_id: chatId, contact_name: contactName, contact_phone: phone || null,
              contact_avatar: contactPicture, last_message_at: chat.lastMessageAt || new Date().toISOString(),
              unread_count: chat.unreadCount || 0, updated_at: new Date().toISOString(),
            }).eq("id", existingByPhone.id);
          } else {
            await supabase.from("mt_whatsapp_conversations").insert({
              tenant_id: sessao.tenant_id, franchise_id: sessao.franchise_id, session_id: sessaoIdToSync,
              chat_id: chatId, contact_phone: phone || null, contact_name: contactName, contact_avatar: contactPicture,
              is_group: chatId.includes("@g.us") || chatId.includes("@broadcast") || chatId.includes("@newsletter"),
              last_message_at: chat.lastMessageAt || new Date().toISOString(), unread_count: chat.unreadCount || 0,
            });
            totalSynced++;
          }
        }
      }
      let postSyncSQ = supabase.from('mt_whatsapp_conversations').select('*').in('session_id', sessionIds);
      if (tenant) postSyncSQ = postSyncSQ.eq('tenant_id', tenant.id);
      const { data: newConversas } = await postSyncSQ;
      setAllConversations(newConversas || []);
      toast.success(`${sessao.nome || sessao.session_name}: ${totalSynced} novas conversas!`);
    } catch { toast.error(`Erro ao sincronizar ${sessao.nome || sessao.session_name}`); }
    finally { setSyncProgressBySession(prev => ({ ...prev, [sessaoIdToSync]: { isRunning: false, current: 0, total: 0, currentChat: 'Concluído' } })); }
  }, [validSessions, sessionIds, wahaConfig, tenant]);

  const handleStopSyncSession = useCallback((sessaoIdToStop: string) => {
    syncCancelledBySessionRef.current[sessaoIdToStop] = true;
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  if (isLoadingSessoes) {
    return (
      <div className="flex h-screen min-h-[500px] items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center text-[#667781]">
          <Loader2 className="h-12 w-12 animate-spin text-[#25d366]" />
          <p className="mt-4">Carregando sessões...</p>
        </div>
      </div>
    );
  }

  if (workingSessoes.length === 0) {
    return (
      <div className="flex h-screen min-h-[500px] items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center text-[#667781]">
          <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma sessão conectada</h3>
          <p className="text-muted-foreground mb-4">Conecte uma sessão do WhatsApp para começar.</p>
          <Button onClick={() => navigate('/whatsapp/sessoes')}>
            <Settings className="mr-2 h-4 w-4" />
            Gerenciar Sessões
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1a1a1a' }}>WhatsApp Chat</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>Selecione uma sessão para ver as conversas</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && !isLoadingProfile && (
            <>
              <Button variant="destructive" onClick={() => setShowClearAllDialog(true)}
                disabled={isClearingAllData || isSyncingAll || validSessions.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isClearingAllData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpar Todos os Dados
              </Button>
              <Button variant="outline" onClick={handleSyncAll}
                disabled={isSyncingAll || isClearingAllData || validSessions.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSyncingAll ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />
                    {syncAllProgress ? `${syncAllProgress.current}/${syncAllProgress.total} - ${syncAllProgress.currentSession}` : 'Sincronizando...'}</>
                ) : (<><Download className="h-4 w-4" />Sincronizar Todas</>)}
              </Button>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
            <span>{validSessions.length} sessão(ões) ativa(s)</span>
          </div>
        </div>
      </div>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />Limpar Todos os Dados
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a <strong>DELETAR TODAS</strong> as conversas e mensagens de <strong>TODAS as {validSessions.length} sessões</strong>.</p>
              <p className="text-amber-600 font-medium">Remove apenas do banco local. O WAHA permanece intacto.</p>
              <p className="font-bold text-destructive">Esta ação é IRREVERSÍVEL!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingAllData}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} disabled={isClearingAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isClearingAllData ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Limpando...</>) : 'Sim, Limpar Tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading */}
      {(isLoadingSessoes || isLoadingConversations) && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#25d366' }} />
        </div>
      )}

      {/* Grid de Cards */}
      {!isLoadingSessoes && !isLoadingConversations && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
          {validSessions.map((sessao) => (
            <SessionCard
              key={sessao.id}
              session={mapSessaoToSession(sessao)}
              stats={{
                conversationCount: sessionStats[sessao.id]?.conversationCount || 0,
                unreadCount: sessionStats[sessao.id]?.unreadCount || 0,
                todayCount: sessionStats[sessao.id]?.todayCount || 0,
                readTodayCount: sessionStats[sessao.id]?.readTodayCount || 0,
                pendingCount: sessionStats[sessao.id]?.pendingCount || 0,
                leadsCount: sessionStats[sessao.id]?.leadsCount || 0,
              }}
              franquiaName={sessao.franqueado?.nome_fantasia}
              onOpenConversations={handleOpenSessionConversations}
              onSyncConversas={handleSyncSession}
              onClearData={handleClearDataSession}
              onStopSync={handleStopSyncSession}
              isAdmin={isAdmin}
              syncProgress={syncProgressBySession[sessao.id]}
              isClearingData={clearingDataSessions[sessao.id]}
            />
          ))}
          <NewSessionCard onClick={handleNewSession} />
        </div>
      )}

      {!isLoadingSessoes && validSessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <MessageCircle size={64} style={{ color: '#25D366', opacity: 0.5, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 500 }}>Nenhuma sessão configurada</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Clique em "Nova Sessão" para conectar seu WhatsApp</p>
        </div>
      )}
    </div>
  );
}
