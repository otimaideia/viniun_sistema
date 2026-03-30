import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeObjectForJSON, createSanitizedFetch } from "../_shared/unicodeSanitizer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://supabase-app.yeslaserpraiagrande.com.br";

// Helper: Log de atividade no lead (fire-and-forget)
async function logLeadActivity(supabase: any, params: {
  tenantId: string;
  leadId: string;
  tipo: string;
  titulo: string;
  descricao: string;
  dados?: Record<string, unknown>;
}) {
  try {
    await supabase.from('mt_lead_activities').insert({
      tenant_id: params.tenantId,
      lead_id: params.leadId,
      tipo: params.tipo,
      titulo: params.titulo,
      descricao: params.descricao,
      dados: params.dados || {},
      user_nome: 'Sistema (WhatsApp)',
    });
  } catch (err) {
    console.error('[logLeadActivity] Erro:', err);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WahaWebhookPayload {
  event: string;
  session: string;
  engine?: string;
  // WAHA 2026.3.2+: worker info para identificar instância
  worker?: { id?: string };
  payload: {
    id?: string;
    timestamp?: number;
    from?: string;
    to?: string;
    body?: string;
    fromMe?: boolean;
    hasMedia?: boolean;
    mediaUrl?: string;
    type?: string;
    ack?: number;
    notifyName?: string;
    chatId?: string;
    name?: string;
    isGroup?: boolean;
    unreadCount?: number;
    lastMessage?: {
      body: string;
      fromMe: boolean;
      timestamp: number;
    };
    _data?: {
      id?: { _serialized?: string };
      pushName?: string;
    };
  };
}

// === FALLBACK DE RESPONSÁVEL (auto-cria RR se necessário) ===

/**
 * Resolve responsável quando sessão não tem responsible_user_id fixo
 * nem round robin com membros. Busca:
 * 1. Membros da sessão (mt_whatsapp_user_sessions)
 * 2. Todos os usuários do tenant (mt_users) como último recurso
 * Cria/atualiza round robin state automaticamente.
 */
async function resolveResponsibleFallback(
  supabase: ReturnType<typeof createClient>,
  sessao: { id: string; tenant_id: string; responsible_user_id?: string | null }
): Promise<string | null> {
  try {
    // 1. Buscar membros da sessão
    const { data: sessionUsers } = await supabase
      .from('mt_whatsapp_user_sessions')
      .select('user_id')
      .eq('session_id', sessao.id)
      .eq('is_active', true);

    let userIds: string[] = (sessionUsers || []).map((u: any) => u.user_id);

    // 2. Se não tem membros da sessão, buscar todos do tenant
    if (userIds.length === 0) {
      const { data: tenantUsers } = await supabase
        .from('mt_users')
        .select('id')
        .eq('tenant_id', sessao.tenant_id)
        .eq('is_active', true)
        .limit(20);

      userIds = (tenantUsers || []).map((u: any) => u.id);
    }

    if (userIds.length === 0) {
      console.warn('[RoundRobin] Fallback: Nenhum usuário encontrado no tenant');
      return null;
    }

    // 3. Buscar ou criar RR state
    const { data: rrState } = await supabase
      .from('mt_whatsapp_round_robin_state')
      .select('*')
      .eq('session_id', sessao.id)
      .maybeSingle();

    let currentIndex = 0;
    let stateId: string | null = null;
    let totalAssigned = 0;

    if (rrState) {
      currentIndex = (rrState.current_user_index || 0) % userIds.length;
      stateId = rrState.id;
      totalAssigned = rrState.total_assigned || 0;
    } else {
      const { data: newState } = await supabase
        .from('mt_whatsapp_round_robin_state')
        .insert({
          session_id: sessao.id,
          tenant_id: sessao.tenant_id,
          current_user_index: 0,
          total_assigned: 0,
          user_order: userIds,
        })
        .select()
        .single();

      if (newState) {
        stateId = newState.id;
      }
    }

    // 4. Selecionar e rotacionar
    const selectedUserId = userIds[currentIndex];
    const nextIndex = (currentIndex + 1) % userIds.length;

    if (stateId) {
      await supabase
        .from('mt_whatsapp_round_robin_state')
        .update({
          current_user_index: nextIndex,
          last_assigned_user_id: selectedUserId,
          last_assigned_at: new Date().toISOString(),
          total_assigned: totalAssigned + 1,
          user_order: userIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stateId);
    }

    console.log(`[RoundRobin] Fallback: Atribuído a ${selectedUserId} (${currentIndex + 1}/${userIds.length} users)`);
    return selectedUserId;
  } catch (err) {
    console.error('[RoundRobin] Fallback: Erro:', err);
    return null;
  }
}

// === FUNÇÕES AUXILIARES V3 - ULTRA-AVANÇADAS ===

/**
 * Valida se string é um número de telefone
 * V3: Validação melhorada com mínimo de 8 dígitos
 */
function isPhoneNumberV3(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const cleaned = value.replace(/\s+/g, '');
  const phonePattern = /^[\+\(]?[\d\s\-()]+$/;
  if (!phonePattern.test(cleaned)) return false;
  const digitCount = (cleaned.match(/\d/g) || []).length;
  return digitCount >= 8;
}

/**
 * Valida se string é um WhatsApp ID (JID)
 * V3: Suporta @c.us, @s.whatsapp.net, @g.us, @lid, @newsletter
 */
function isWhatsAppIdV3(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /@(c\.us|s\.whatsapp\.net|g\.us|lid|newsletter)$/.test(value);
}

/**
 * Extrai nome do contato com validação tripla (15+ fontes)
 * V3: Tier 1-8 organizados por confiabilidade
 */
function extractContactNameV3(msg: any, fallback = ''): string | null {
  const possibleNames = [
    // Tier 1: Mais confiáveis (agenda, verificado)
    msg.contact?.name,
    msg._data?.verifiedName,

    // Tier 2: Nome direto
    msg.name,

    // Tier 3: Push names
    msg.contact?.pushName,
    msg.pushName,
    msg._data?.pushName,

    // Tier 4: Notify names
    msg.notifyName,
    msg._data?.notifyName,

    // Tier 5: Variações
    msg.contact?.shortName,
    msg.pushname,
    msg.senderName,

    // Tier 6: vCard
    msg.vCards?.[0]?.displayName,

    // Tier 7: Quoted message
    msg.quotedMsg?._data?.pushName,
    msg.quotedMsg?._data?.notifyName,

    // Tier 8: Fallback grupos
    msg.participant,
    msg.author,
  ];

  for (const name of possibleNames) {
    if (!name || typeof name !== 'string') continue;

    const cleanName = name.trim();

    // Validação 1: Rejeitar telefones
    if (isPhoneNumberV3(cleanName)) continue;

    // Validação 2: Rejeitar WhatsApp IDs
    if (isWhatsAppIdV3(cleanName)) continue;

    // Validação 3: Rejeitar muito curtos
    if (cleanName.length < 2) continue;

    return cleanName;
  }

  return fallback || null;
}

/**
 * Extrai o tipo REAL da mensagem do WAHA (NOWEB e GOWS engines)
 * WAHA NOWEB pode enviar type="chat" mesmo para mídias.
 * GOWS usa campos diretos (type, mediaUrl) sem _data.message.
 * Estratégia: msg.type → msg._data?.type → _data.message keys (NOWEB) → hasMedia + mimetype
 */
function extractMessageType(msg: any): string {
  // 1. Se msg.type já é um tipo válido de mídia, usar direto
  // Inclui 'voice' (GOWS usa 'voice' para push-to-talk, NOWEB usa 'ptt')
  const validMediaTypes = ['image', 'video', 'audio', 'ptt', 'voice', 'document', 'sticker', 'location', 'vcard', 'contact', 'contacts_array', 'poll', 'list', 'buttons'];
  if (msg.type && validMediaTypes.includes(msg.type)) {
    // Normalizar: 'ptt' e 'voice' ambos mapeiam para 'audio'
    if (msg.type === 'ptt' || msg.type === 'voice') return 'audio';
    return msg.type;
  }

  // 2. Checar _data.type (NOWEB coloca tipo real aqui às vezes)
  if (msg._data?.type && validMediaTypes.includes(msg._data.type)) {
    if (msg._data.type === 'ptt' || msg._data.type === 'voice') return 'audio';
    return msg._data.type;
  }

  // 3. Detectar tipo via _data.message keys (WAHA NOWEB / Baileys)
  // GOWS não usa _data.message — esta seção é específica para NOWEB
  const msgObj = msg._data?.message;
  if (msgObj) {
    if (msgObj.imageMessage) return 'image';
    if (msgObj.videoMessage) return 'video';
    if (msgObj.audioMessage || msgObj.pttMessage) return 'audio';
    if (msgObj.documentMessage || msgObj.documentWithCaptionMessage) return 'document';
    if (msgObj.stickerMessage) return 'sticker';
    if (msgObj.locationMessage || msgObj.liveLocationMessage) return 'location';
    if (msgObj.contactMessage || msgObj.contactsArrayMessage) return 'contact';
    if (msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3) return 'poll';
  }

  // 4. GOWS fallback: campos diretos quando _data é null/undefined
  // GOWS não popula _data mas expõe mediaUrl e type diretamente
  if (!msg._data) {
    if (msg.mediaUrl || msg.media?.url) {
      // Inferir pelo mimetype quando disponível
      const mimetype = msg.mimetype || msg.media?.mimetype || '';
      if (mimetype.startsWith('image/')) return 'image';
      if (mimetype.startsWith('video/')) return 'video';
      if (mimetype.startsWith('audio/')) return 'audio';
      if (mimetype.startsWith('application/')) return 'document';
      return 'document';
    }
  }

  // 5. Se hasMedia é true, inferir tipo do mimetype
  if (msg.hasMedia) {
    const mimetype = msg.mimetype || msg._data?.mimetype || msg.media?.mimetype || '';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('application/')) return 'document';
    // Se tem media mas não sabe o tipo, marcar como document
    return 'document';
  }

  // 6. Checar se body contém marcador de tipo WAHA
  if (msg.body === '' && msg.mediaUrl) {
    // Mensagem sem body mas com URL = mídia
    return 'document';
  }

  // 7. NOWEB: Checar por mensagens de sistema/protocolo
  const msgObj2 = msg._data?.message;
  if (msgObj2) {
    if (msgObj2.protocolMessage) return 'protocol';
    if (msgObj2.reactionMessage) return 'reaction';
    if (msgObj2.buttonsResponseMessage || msgObj2.templateButtonReplyMessage) return 'chat';
    if (msgObj2.listResponseMessage) return 'chat';
    if (msgObj2.editedMessage) return 'chat';
  }

  // 8. Checar media em campos GOWS alternativos
  if (msg.media?.url || msg.payload?.media?.url) {
    const mimetype = msg.media?.mimetype || msg.payload?.media?.mimetype || '';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // 9. Fallback: texto normal
  return 'chat';
}

/**
 * Pega o objeto de mídia interno do _data.message (WAHA NOWEB)
 */
function getMediaMessageObj(msg: any): any {
  const m = msg._data?.message;
  if (!m) return null;
  return m.imageMessage || m.videoMessage || m.audioMessage || m.pttMessage
    || m.documentMessage || m.documentWithCaptionMessage?.message?.documentMessage
    || m.stickerMessage || null;
}

/**
 * Extrai a URL da mídia do WAHA (NOWEB engine)
 * Tenta múltiplas localizações onde WAHA pode colocar a URL
 */
function extractMediaUrl(msg: any): string | null {
  const mediaMsg = getMediaMessageObj(msg);
  return msg.mediaUrl
    || msg.media?.url
    || msg._data?.mediaUrl
    || msg._data?.media?.url
    || msg.media?.link
    || mediaMsg?.url
    || null;
}

/**
 * Extrai mimetype da mensagem WAHA
 */
function extractMimetype(msg: any): string | null {
  const mediaMsg = getMediaMessageObj(msg);
  return msg.mimetype
    || msg._data?.mimetype
    || msg.media?.mimetype
    || mediaMsg?.mimetype
    || null;
}

/**
 * Extrai filename da mídia
 */
function extractFilename(msg: any): string | null {
  const mediaMsg = getMediaMessageObj(msg);
  return msg.filename
    || msg._data?.filename
    || msg.media?.filename
    || mediaMsg?.fileName
    || null;
}

/**
 * Extrai caption da mídia
 */
function extractCaption(msg: any): string | null {
  const mediaMsg = getMediaMessageObj(msg);
  return msg.caption
    || msg._data?.caption
    || mediaMsg?.caption
    || null;
}

// ─── MEDIA STORAGE: Download WAHA → Upload Supabase Storage ──────────────
const MEDIA_BUCKET = 'whatsapp-media';
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'opus', 'audio/wav': 'wav',
  'audio/webm': 'weba', 'audio/ogg; codecs=opus': 'ogg',
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/**
 * Baixa mídia do WAHA e faz upload para Supabase Storage.
 * Retorna a URL pública do storage ou null em caso de erro.
 */
async function downloadAndStoreMedia(
  supabase: ReturnType<typeof createClient>,
  wahaApiUrl: string,
  wahaApiKey: string,
  mediaUrl: string,
  tenantId: string,
  conversationId: string,
  messageId: string,
  mimetype?: string | null,
  filename?: string | null,
): Promise<{ storageUrl: string | null; storagePath: string | null }> {
  try {
    // Construir URL completa se for relativa
    let fullUrl = mediaUrl;
    if (!mediaUrl.startsWith('http')) {
      fullUrl = `${wahaApiUrl}${mediaUrl.startsWith('/') ? '' : '/'}${mediaUrl}`;
    }
    // Já é do storage? Pular
    if (fullUrl.includes('supabase') || fullUrl.includes(MEDIA_BUCKET)) {
      return { storageUrl: fullUrl, storagePath: null };
    }

    console.log(`[MediaStorage] Baixando: ${fullUrl.substring(0, 120)}...`);

    const resp = await fetch(fullUrl, {
      headers: { 'X-Api-Key': wahaApiKey },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!resp.ok) {
      console.error(`[MediaStorage] Download falhou: HTTP ${resp.status}`);
      return { storageUrl: null, storagePath: null };
    }

    const blob = await resp.blob();
    if (blob.size > MAX_MEDIA_SIZE) {
      console.error(`[MediaStorage] Arquivo muito grande: ${blob.size} bytes`);
      return { storageUrl: null, storagePath: null };
    }
    if (blob.size === 0) {
      console.error(`[MediaStorage] Arquivo vazio`);
      return { storageUrl: null, storagePath: null };
    }

    // Determinar extensão
    const mt = mimetype || blob.type || '';
    const ext = MIME_TO_EXT[mt.toLowerCase()] ||
                (filename?.includes('.') ? filename.split('.').pop()!.toLowerCase() : 'bin');

    // Caminho: tenant_id/conversation_id/messageId_timestamp.ext
    const ts = Date.now();
    const safeMsgId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    const storagePath = `${tenantId}/${conversationId}/${safeMsgId}_${ts}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, blob, {
        contentType: mt || 'application/octet-stream',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[MediaStorage] Upload falhou:`, uploadError.message);
      return { storageUrl: null, storagePath: null };
    }

    // Use external URL directly (edge runtime may resolve to internal supabase-kong hostname)
    const EXTERNAL_URL = "https://supabase-app.yeslaserpraiagrande.com.br";
    const publicUrl = `${EXTERNAL_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;

    console.log(`[MediaStorage] ✅ Salvo: ${storagePath} (${blob.size} bytes)`);
    return { storageUrl: publicUrl, storagePath };
  } catch (err) {
    console.error(`[MediaStorage] Erro:`, err instanceof Error ? err.message : err);
    return { storageUrl: null, storagePath: null };
  }
}

/**
 * Extrai o body/texto real da mensagem do WAHA (NOWEB engine)
 * NOWEB pode colocar o texto em diversas localizações dependendo do tipo.
 * V4: Expandido para cobrir mais formatos e evitar body vazio.
 */
function extractMessageBody(msg: any): string {
  // 1. Body direto
  if (msg.body && typeof msg.body === 'string' && msg.body.trim()) {
    return msg.body;
  }

  // 2. _data.body
  if (msg._data?.body && typeof msg._data.body === 'string' && msg._data.body.trim()) {
    return msg._data.body;
  }

  // 3. NOWEB: conversation (mensagem de texto simples)
  const conversation = msg._data?.message?.conversation;
  if (conversation && typeof conversation === 'string' && conversation.trim()) {
    return conversation;
  }

  // 4. NOWEB: extendedTextMessage (mensagem com link preview ou menção)
  const extText = msg._data?.message?.extendedTextMessage?.text;
  if (extText && typeof extText === 'string' && extText.trim()) {
    return extText;
  }

  // 5. text field
  if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
    return msg.text;
  }

  // 6. Caption como fallback
  const caption = extractCaption(msg);
  if (caption) return caption;

  // 7. NOWEB: buttonResponseMessage (resposta de botão)
  const btnResponse = msg._data?.message?.buttonsResponseMessage?.selectedDisplayText
    || msg._data?.message?.templateButtonReplyMessage?.selectedDisplayText;
  if (btnResponse && typeof btnResponse === 'string') return btnResponse;

  // 8. NOWEB: listResponseMessage (resposta de lista)
  const listResponse = msg._data?.message?.listResponseMessage?.title
    || msg._data?.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
  if (listResponse && typeof listResponse === 'string') return listResponse;

  // 9. NOWEB: protocolMessage (mensagens de sistema como "apagou mensagem")
  // Retornar vazio para estes - serão filtrados

  // 10. NOWEB: reactionMessage (reação a mensagem)
  const reactionText = msg._data?.message?.reactionMessage?.text;
  if (reactionText && typeof reactionText === 'string') return reactionText;

  // 11. GOWS: payload.text field
  if (msg.payload?.text && typeof msg.payload.text === 'string' && msg.payload.text.trim()) {
    return msg.payload.text;
  }

  // 12. GOWS: payload.body field
  if (msg.payload?.body && typeof msg.payload.body === 'string' && msg.payload.body.trim()) {
    return msg.payload.body;
  }

  return '';
}

/**
 * Gera texto de preview para last_message_text da conversa
 * Ex: "[Imagem]", "[Vídeo]", "[Áudio]", "[Documento]"
 */
function getMessagePreviewText(tipo: string, body: string | null | undefined): string {
  if (tipo === 'chat' || tipo === 'text') return body || '';
  const previewMap: Record<string, string> = {
    image: '📷 Imagem',
    video: '🎬 Vídeo',
    audio: '🎵 Áudio',
    ptt: '🎤 Áudio',
    document: '📄 Documento',
    sticker: '🏷️ Figurinha',
    location: '📍 Localização',
    vcard: '👤 Contato',
    contact: '👤 Contato',
    contacts_array: '👥 Contatos',
    poll: '📊 Enquete',
  };
  const prefix = previewMap[tipo] || `📎 ${tipo}`;
  return body ? `${prefix} - ${body}` : prefix;
}

/**
 * Normaliza chatId para formato padrão
 * V3.1: Converte @s.whatsapp.net para @c.us, MANTÉM @lid como @lid
 * LIDs NÃO devem ser convertidos para @c.us — não são telefones!
 */
function normalizeChatIdV3(chatId: string): string {
  if (!chatId) return '';

  // Manter grupos e newsletters
  if (chatId.endsWith('@g.us') || chatId.endsWith('@newsletter')) {
    return chatId;
  }

  // MANTER @lid como está — LIDs NÃO são telefones, converter para @c.us mascarava o problema
  if (chatId.includes('@lid')) {
    return chatId;
  }

  // Converter @s.whatsapp.net para @c.us (estes SÃO telefones)
  if (chatId.includes('@s.whatsapp.net')) {
    const phoneMatch = chatId.match(/^(\d+)@/);
    if (phoneMatch) {
      return `${phoneMatch[1]}@c.us`;
    }
  }

  // Se já tem @c.us, retornar
  if (chatId.endsWith('@c.us')) {
    return chatId;
  }

  // Se for apenas número, adicionar @c.us
  if (/^\d+$/.test(chatId)) {
    return `${chatId}@c.us`;
  }

  return chatId;
}

/**
 * Verifica se chat é um grupo
 */
function isGroupChatV3(chatId: string): boolean {
  return chatId?.endsWith('@g.us') || false;
}

/**
 * Verifica se deve atualizar o nome do contato
 * V3: Validação tripla (telefone, WhatsApp ID, comprimento)
 */
function shouldUpdateContactNameV3(currentName: string | null | undefined, newName: string | null | undefined): boolean {
  if (!newName) return false;
  if (currentName && currentName.trim()) return false;
  if (isPhoneNumberV3(newName)) return false;
  if (isWhatsAppIdV3(newName)) return false;
  return true;
}

/**
 * Detecta origem do lead pela mensagem inicial
 */
function detectOrigemFromMessage(message: string): string {
  const msg = (message || '').toLowerCase();

  const patterns = [
    { origem: 'google_maps', keywords: ['google.com/maps', 'maps.google', 'google maps', 'localização google'] },
    { origem: 'instagram', keywords: ['instagram.com', 'instagram', 'insta', 'direct do insta', 'pelo insta'] },
    { origem: 'facebook', keywords: ['facebook.com', 'fb.com', 'messenger', 'facebook', 'pelo face'] },
    { origem: 'tiktok', keywords: ['tiktok.com', 'tiktok', 'pelo tiktok'] },
    { origem: 'google', keywords: ['google.com', 'pesquisa google', 'achei no google', 'vi no google', 'pelo google'] },
    { origem: 'bio_link', keywords: ['linktr.ee', 'bio.link', 'link da bio', 'linkin.bio'] },
    { origem: 'site', keywords: ['yeslaser.com', 'site de vocês', 'pelo site', 'vi no site'] },
    { origem: 'indicacao', keywords: ['indicação', 'indicou', 'amigo indicou', 'conhecida indicou', 'amiga indicou'] },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => msg.includes(kw))) {
      return pattern.origem;
    }
  }

  return 'whatsapp_inbound';
}

/**
 * Busca foto do perfil do WhatsApp via WAHA
 */
async function getProfilePicture(wahaUrl: string, apiKey: string, session: string, chatId: string): Promise<string | null> {
  try {
    const response = await fetch(`${wahaUrl}/api/${session}/contacts/${chatId}/profile-picture`, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (response.ok) {
      const data = await response.json();
      return data.profilePictureUrl || data.url || null;
    }
  } catch (err) {
    console.log("[Profile] Erro ao buscar foto:", err);
  }
  return null;
}

/**
 * Busca informações do grupo via WAHA API (nome, foto, participantes)
 */
async function getGroupInfo(wahaUrl: string, apiKey: string, session: string, groupId: string): Promise<{
  name: string | null;
  picture: string | null;
  participants: Array<{ id: string; name?: string }>;
}> {
  let name: string | null = null;
  let picture: string | null = null;
  let participants: Array<{ id: string; name?: string }> = [];

  // 1. Buscar info do grupo (nome, participantes)
  try {
    const response = await fetch(`${wahaUrl}/api/${session}/groups/${groupId}`, {
      headers: { 'X-Api-Key': apiKey }
    });
    if (response.ok) {
      const data = await response.json();
      name = data.subject || data.name || null;
      participants = (data.participants || []).map((p: any) => ({
        id: p.id || p.serialized || '',
        name: p.name || p.pushName || undefined,
      }));
      console.log(`[Webhook] Grupo info obtida: ${participants.length} membros`);
    }
  } catch (err) {
    console.log("[Webhook] Erro ao buscar info do grupo:", err);
  }

  // 2. Buscar foto do grupo via profile-picture endpoint
  try {
    const picResponse = await fetch(
      `${wahaUrl}/api/contacts/profile-picture?session=${session}&contactId=${encodeURIComponent(groupId)}`,
      { headers: { 'X-Api-Key': apiKey } }
    );
    if (picResponse.ok) {
      const picData = await picResponse.json();
      const url = picData.profilePictureURL || picData.url;
      if (url && url.length > 10) {
        picture = url;
      }
    }
  } catch (err) {
    console.log("[Webhook] Erro ao buscar foto do grupo:", err);
  }

  return { name, picture, participants };
}

/**
 * Extrai número de telefone de 12+ fontes
 * V3.1: REJEITA @lid — LIDs NÃO são telefones
 * Também valida que o número extraído tem no máximo 13 dígitos (padrão BR)
 */
function extractPhoneNumberV3(msg: any, preferFrom = true): string {
  const sources = preferFrom
    ? [
        msg.from,
        msg.to,
        msg.chatId,
        msg.remoteJid,
        msg._data?.key?.remoteJid,
        msg._data?.key?.remoteJidAlt,
        msg.participant,
        msg.author,
        msg.contact?.id,
        msg.contact?.number,
        msg.contact?.phone,
        msg.quotedMsg?.from,
        msg.quotedMsg?.to,
        msg.userReceipt?.[0]?.userJid,
      ]
    : [
        msg.to,
        msg.from,
        msg.chatId,
        msg.remoteJid,
        msg._data?.key?.remoteJid,
        msg._data?.key?.remoteJidAlt,
        msg.participant,
        msg.author,
        msg.contact?.id,
        msg.contact?.number,
        msg.contact?.phone,
        msg.quotedMsg?.from,
        msg.quotedMsg?.to,
        msg.userReceipt?.[0]?.userJid,
      ];

  for (const source of sources) {
    if (!source || typeof source !== 'string') continue;

    // SEMPRE pular @lid — LIDs são IDs internos do WhatsApp, NÃO telefones
    if (source.includes('@lid')) {
      continue;
    }

    // Pular grupos
    if (source.includes('@g.us') || source.includes('@newsletter')) {
      continue;
    }

    // Remover sufixos WhatsApp (@c.us, @s.whatsapp.net)
    const phoneMatch = source.match(/^(\d+)@/);
    if (phoneMatch) {
      const digits = phoneMatch[1];
      // Validar: telefones reais têm 10-13 dígitos, LIDs têm 14+
      if (digits.length >= 10 && digits.length <= 13) {
        return digits;
      }
      continue;
    }

    // Se for apenas número (sem @), validar comprimento
    if (/^\d+$/.test(source) && source.length >= 10 && source.length <= 13) {
      return source;
    }
  }

  return '';
}

/**
 * Formata número de telefone para padrão brasileiro
 * Remove zero à esquerda e adiciona código do país +55
 * V3.1: Rejeita LIDs (14+ dígitos)
 */
function formatPhoneNumberV3(phone: string): string {
  if (!phone) return '';

  let cleanPhone = phone.replace(/\D/g, '');

  // Rejeitar LIDs (14+ dígitos NÃO são telefones)
  if (cleanPhone.length >= 14) {
    console.warn(`[Webhook] Número rejeitado (LID): [${cleanPhone.length} dígitos - omitido por segurança]`);
    return '';
  }

  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }

  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  return cleanPhone;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Capturar a API key do header antes de qualquer processamento
    const incomingApiKey = req.headers.get("x-api-key");

    // Initialize Supabase client with service role
    // IMPORTANTE: Para self-hosted Supabase, SEMPRE usar URL externa
    const supabaseUrl = "https://supabase-app.yeslaserpraiagrande.com.br";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE";
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") && !Deno.env.get("SERVICE_ROLE_KEY")) {
      console.warn("[Webhook] AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada como env var - usando fallback hardcoded. Configurar a env var em produção.");
    }

    console.log("[Webhook] Conectando ao Supabase:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { fetch: createSanitizedFetch() },
    });

    // Parse webhook payload
    const rawPayload = await req.json();

    // Sanitizar payload para prevenir erros com caracteres Unicode inválidos
    const payload: WahaWebhookPayload = sanitizeObjectForJSON(rawPayload);

    console.log("[Webhook] Evento recebido:", payload.event, "sessão:", payload.session);

    // Get session from database (incluindo tenant_id e responsible_user_id para auto-criação de leads)
    const { data: sessao, error: sessaoError } = await supabase
      .from("mt_whatsapp_sessions")
      .select("id, tenant_id, franchise_id, responsible_user_id, round_robin_enabled, round_robin_mode, team_id, department_id")
      .eq("session_name", payload.session)
      .maybeSingle();

    // ========================================
    // VALIDAÇÃO DE SEGURANÇA - API Key do WAHA
    // Valida contra a chave configurada no banco (mt_waha_config)
    // ========================================
    if (sessao?.tenant_id) {
      try {
        const { data: wahaConfig } = await supabase
          .from("mt_waha_config")
          .select("api_key")
          .eq("tenant_id", sessao.tenant_id)
          .maybeSingle();

        if (wahaConfig?.api_key) {
          if (!incomingApiKey || incomingApiKey !== wahaConfig.api_key) {
            console.warn("[Webhook] API Key ausente ou inválida para tenant:", sessao.tenant_id);
            return new Response(
              JSON.stringify({ error: "API Key inválida" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        // Se não há api_key configurada no banco, aceitar (backward compat)
      } catch {
        // Erro ao validar chave — não bloquear o webhook, apenas logar
        console.warn("[Webhook] Não foi possível validar API Key — continuando sem validação.");
      }
    }

    if (sessaoError) {
      console.error("[Webhook] Erro ao buscar sessão:", sessaoError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao buscar sessão", details: sessaoError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessao) {
      console.log("[Webhook] Sessão não encontrada:", payload.session);
      return new Response(
        JSON.stringify({ success: false, error: "Sessão não encontrada", session: payload.session }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessaoId = sessao.id;

    // =========================================================================
    // FILA DE SEGURANÇA: Salvar payload bruto ANTES de processar
    // Se a função tiver timeout ou cold start, o payload fica na fila para
    // reprocessamento pelo daemon sync-recent.mjs
    // =========================================================================
    try {
      await supabase.from("mt_webhook_queue").insert({
        session_name: payload.session,
        event_type: payload.event,
        payload: sanitizeObjectForJSON(payload) as unknown as Record<string, unknown>,
      });
    } catch (queueErr) {
      // Não falhar o webhook por erro na fila — só logar
      console.warn("[Webhook] Falha ao salvar na fila:", queueErr);
    }

    // Handle different event types
    switch (payload.event) {
      case "message": {
        // WAHA dispara AMBOS "message" e "message.any" para cada mensagem.
        // Processamos apenas "message.any" para evitar respostas duplicadas do chatbot.
        console.log("[Webhook] Ignorando evento 'message' (processado via 'message.any'):", payload.payload?.id);
        break;
      }
      case "message.any": {
        const msg = payload.payload;
        if (!msg || !msg.id) {
          console.log("[Webhook] Payload de mensagem inválido");
          break;
        }

        // === SEÇÃO: Inferir from_me do message_id prefix (WAHA @lid bug fix) ===
        // WAHA NOWEB engine com @lid: msg.fromMe pode ser undefined/errado
        // O message_id do WAHA sempre começa com "true_" (enviado) ou "false_" (recebido)
        const rawMsgId = typeof msg.id === "string" ? msg.id : String(msg.id || "");
        const inferredFromMe = rawMsgId.startsWith("true_");
        const actualFromMe = msg.fromMe ?? inferredFromMe;

        // === SEÇÃO: Extração de chatId e telefone ===
        // Para mensagens enviadas: msg.to pode ser undefined no NOWEB @lid
        // Fallback: extrair chatId do message_id (formato: true_CHATID_HASH ou true_CHATID_HASH_SENDER)
        let chatId = actualFromMe ? msg.to : msg.from;

        // Fallback: extrair chatId do message_id quando msg.to/msg.from é undefined
        if (!chatId && rawMsgId) {
          const msgIdParts = rawMsgId.split("_");
          // Formato: true_CHATID_HASH ou false_CHATID_HASH
          if (msgIdParts.length >= 2) {
            const possibleChatId = msgIdParts[1];
            if (possibleChatId && (possibleChatId.includes("@lid") || possibleChatId.includes("@c.us") || possibleChatId.includes("@s.whatsapp.net") || possibleChatId.includes("@g.us"))) {
              chatId = possibleChatId;
              console.log(`[Webhook] chatId extraído do message_id: ${chatId}`);
            }
          }
        }

        // Fallback adicional: msg._data.key.remoteJid (NOWEB)
        if (!chatId) {
          chatId = msg._data?.key?.remoteJid || msg._data?.from || msg._data?.to || null;
          if (chatId) {
            console.log(`[Webhook] chatId extraído de _data fallback: ${chatId}`);
          }
        }

        if (!chatId) {
          console.log("[Webhook] chatId não identificado, msg.to:", msg.to, "msg.from:", msg.from, "msgId:", rawMsgId);
          break;
        }

        const phoneNumber = extractPhoneNumberV3(msg, !actualFromMe);
        const normalizedChatId = normalizeChatIdV3(chatId);
        const isGroup = isGroupChatV3(normalizedChatId);
        const messageTimestamp = msg.timestamp
          ? new Date(msg.timestamp * 1000).toISOString()
          : new Date().toISOString();

        // Extrair body de múltiplas fontes (NOWEB coloca texto em locais variados)
        const msgBodyEarly = extractMessageBody(msg);

        // ========================================
        // 1. BUSCAR OU CRIAR CONVERSA
        // ========================================
        // Tentar buscar por chat_id exato primeiro
        let { data: conversa } = await supabase
          .from("mt_whatsapp_conversations")
          .select("id, lead_id, unread_count, assigned_to, is_bot_active, bot_attempts, bot_last_response_at, contact_phone, contact_name, chat_id")
          .eq("session_id", sessaoId)
          .eq("chat_id", chatId)
          .maybeSingle();

        // Se não encontrou por chat_id, tentar por contact_phone (resolve duplicatas @lid vs @c.us)
        if (!conversa && !isGroup && phoneNumber && phoneNumber.length >= 10 && phoneNumber.length <= 13) {
          const { data: conversaByPhone } = await supabase
            .from("mt_whatsapp_conversations")
            .select("id, lead_id, unread_count, assigned_to, is_bot_active, bot_attempts, bot_last_response_at, contact_phone, contact_name, chat_id")
            .eq("session_id", sessaoId)
            .eq("contact_phone", phoneNumber)
            .eq("is_group", false)
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

          if (conversaByPhone) {
            conversa = conversaByPhone;
            console.log(`[Webhook] Conversa encontrada por phone ${phoneNumber} (chat_id existente: ${conversaByPhone.chat_id}, webhook: ${chatId})`);
            // Atualizar chat_id para o formato mais recente do WAHA
            if (conversaByPhone.chat_id !== chatId) {
              await supabase
                .from("mt_whatsapp_conversations")
                .update({ chat_id: chatId, updated_at: new Date().toISOString() })
                .eq("id", conversaByPhone.id);
              console.log(`[Webhook] chat_id atualizado: ${conversaByPhone.chat_id} → ${chatId}`);
            }
          }
        }

        // Extrair nome do remetente (pushName) para preview de grupo
        // GOWS usa msg.pushName ou msg.notifyName diretamente (sem _data)
        // NOWEB usa msg._data?.pushName ou msg._data?.notifyName
        const senderName = msg.notifyName || msg.pushName || msg._data?.pushName || msg._data?.notifyName || null;

        // Para grupos: prefixar preview com nome do remetente ("Giovanna: Bom dia")
        const previewText = isGroup && senderName && !actualFromMe
          ? `${senderName}: ${getMessagePreviewText(extractMessageType(msg), msgBodyEarly)}`
          : getMessagePreviewText(extractMessageType(msg), msgBodyEarly);

        if (!conversa) {
          // Criar nova conversa
          console.log("[Webhook] Criando nova conversa para:", chatId);

          let finalContactName: string | null = null;
          let contactAvatar: string | null = null;

          if (isGroup) {
            // Para GRUPOS: buscar nome e foto do grupo via WAHA API
            try {
              const wahaConfig = await supabase.from("mt_waha_config").select("api_url, api_key").single();
              if (wahaConfig.data?.api_url) {
                // === SEÇÃO: Busca de info do grupo (com timeout de 5s) ===
                const groupInfoPromise = getGroupInfo(wahaConfig.data.api_url, wahaConfig.data.api_key, payload.session, chatId);
                const groupTimeoutPromise = new Promise<null>((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout getGroupInfo')), 5000)
                );
                const groupInfo = await Promise.race([groupInfoPromise, groupTimeoutPromise]).catch(() => null);
                if (groupInfo) {
                  finalContactName = groupInfo.name;
                  contactAvatar = groupInfo.picture;
                }
              }
            } catch (err) {
              console.log("[Webhook] Erro ao buscar config WAHA para grupo:", err);
            }
            // Fallback: usar nome da msg se não conseguiu buscar
            if (!finalContactName) {
              finalContactName = msg._data?.chat?.name || msg._data?.chat?.subject || chatId.replace('@g.us', '');
            }
          } else {
            // Para CONTATOS: extração avançada de nome V3
            const extractedName = extractContactNameV3(msg, phoneNumber);
            finalContactName = extractedName === phoneNumber ? null : extractedName;

            // Debug V3
            if (msg._data?.verifiedName) {
              console.log("[V3] Business verificado detectado para conversa");
            }
            if (chatId.includes('@lid')) {
              console.log("[V3] WhatsApp LID detectado para sessão:", sessaoId);
            }
          }

          const insertData: any = {
            tenant_id: sessao.tenant_id,
            franchise_id: sessao.franchise_id || null,
            session_id: sessaoId,
            chat_id: chatId,
            contact_name: finalContactName,
            contact_phone: (!isGroup && phoneNumber && phoneNumber.length >= 10 && phoneNumber.length <= 13) ? phoneNumber : null,
            is_group: isGroup,
            last_message_text: previewText,
            last_message_at: messageTimestamp,
            unread_count: actualFromMe ? 0 : 1,
            is_bot_active: isGroup ? false : true, // Bot ativo por padrão para conversas individuais
          };
          if (contactAvatar) {
            insertData.contact_avatar = contactAvatar;
          }

          const { data: novaConversa, error: createError } = await supabase
            .from("mt_whatsapp_conversations")
            .insert(insertData)
            .select("id, lead_id, unread_count, is_bot_active, bot_attempts, bot_last_response_at, assigned_to")
            .single();

          if (createError) {
            console.error("[Webhook] Erro ao criar conversa:", createError);
            break;
          }
          conversa = novaConversa;
          console.log("[Webhook] Conversa criada:", conversa.id, isGroup ? "(grupo)" : "");
        } else {
          // Atualizar conversa existente
          const newUnreadCount = actualFromMe ? 0 : (conversa.unread_count || 0) + 1;

          const updateData: any = {
            last_message_text: previewText,
            last_message_at: messageTimestamp,
            unread_count: newUnreadCount,
            updated_at: new Date().toISOString(),
          };

          // Quando agente responde (from_me), limpar indicador de "aguardando resposta"
          if (actualFromMe) {
            updateData.last_customer_message_at = null;
            updateData.last_message_from = 'me';
          } else {
            updateData.last_message_from = 'contact';
          }

          if (!isGroup) {
            // Só atualiza nome para contatos individuais (não sobrescrever nome do grupo com nome do remetente)
            const extractedName = extractContactNameV3(msg);
            if (extractedName && !isPhoneNumberV3(extractedName)) {
              updateData.contact_name = extractedName;
            }
          }

          // Corrigir is_group se chat_id é @g.us (pode estar errado de syncs antigos)
          if (isGroup) {
            updateData.is_group = true;
          }

          // === FIX @lid: Atualizar contact_phone se antes era null e agora temos telefone ===
          // Isso resolve o caso de sessões NOWEB recém-criadas onde @lid não tinha
          // remoteJidAlt no momento do sync, mas agora mensagens novas trazem o telefone
          if (!conversa.contact_phone && phoneNumber && phoneNumber.length >= 10 && phoneNumber.length <= 13) {
            updateData.contact_phone = phoneNumber;
            const maskedPhone = phoneNumber.length > 4 ? phoneNumber.slice(-4).padStart(phoneNumber.length, '*') : '****';
            console.log(`[Webhook] Telefone descoberto para @lid: ${chatId} → ${maskedPhone}`);
          }

          await supabase
            .from("mt_whatsapp_conversations")
            .update(updateData)
            .eq("id", conversa.id);
        }

        // ========================================
        // 2. INSERIR MENSAGEM (com extração inteligente de tipo/media)
        // ========================================
        const messageId = typeof msg.id === "string" ? msg.id : String(msg.id);
        const msgTipo = extractMessageType(msg);

        // Skip protocol/system messages (não são mensagens visíveis)
        if (msgTipo === 'protocol' || msgTipo === 'reaction') {
          console.log(`[Webhook] Ignorando mensagem tipo=${msgTipo} (não visível)`);
          return new Response(JSON.stringify({ success: true, skipped: msgTipo }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const msgMediaUrl = extractMediaUrl(msg);
        const msgMimetype = extractMimetype(msg);
        const msgFilename = extractFilename(msg);
        const msgCaption = extractCaption(msg);

        console.log(`[Webhook] Msg tipo=${msgTipo}, body=${msgBodyEarly ? msgBodyEarly.substring(0, 50) : '(vazio)'}, hasMedia=${msg.hasMedia}, mediaUrl=${msgMediaUrl ? 'SIM' : 'NÃO'}, mimetype=${msgMimetype || 'N/A'}`);

        // Skip: se é mensagem enviada por nós (fromMe) e já existe no banco
        // (inserida pelo chatbot handler ou frontend com message_id diferente)
        if (actualFromMe && msgBodyEarly) {
          const tsStart = new Date(new Date(messageTimestamp).getTime() - 5000).toISOString();
          const tsEnd = new Date(new Date(messageTimestamp).getTime() + 5000).toISOString();
          const { data: existing } = await supabase
            .from("mt_whatsapp_messages")
            .select("id, message_id")
            .eq("conversation_id", conversa.id)
            .eq("from_me", true)
            .eq("body", msgBodyEarly)
            .gte("timestamp", tsStart)
            .lte("timestamp", tsEnd)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`[Webhook] Mensagem fromMe já existe (${existing[0].message_id}), atualizando message_id para WAHA id: ${messageId}`);
            // Atualizar o message_id existente para o do WAHA (mais confiável)
            await supabase
              .from("mt_whatsapp_messages")
              .update({ message_id: messageId, ack: 1 })
              .eq("id", existing[0].id);
            return new Response(JSON.stringify({ success: true, deduplicated: true }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }

        const { error: msgError } = await supabase
          .from("mt_whatsapp_messages")
          .upsert({
            tenant_id: sessao.tenant_id, // OBRIGATÓRIO para MT
            conversation_id: conversa.id,
            session_id: sessaoId,
            message_id: messageId,
            body: msgBodyEarly,
            from_me: actualFromMe,
            tipo: msgTipo,
            timestamp: messageTimestamp,
            media_url: msgMediaUrl,
            media_mimetype: msgMimetype,
            media_filename: msgFilename,
            caption: msgCaption,
            ack: actualFromMe ? 1 : 0,
          }, {
            onConflict: "message_id",
          });

        if (msgError) {
          console.error("[Webhook] Erro ao inserir mensagem:", msgError);
        } else {
          console.log("[Webhook] Mensagem sincronizada:", messageId, "tipo:", msgTipo);

          // Log atividade WhatsApp no lead vinculado (apenas mensagens do cliente, não fromMe)
          if (!actualFromMe && conversa.lead_id && sessao.tenant_id) {
            const preview = (msgBodyEarly || msgCaption || `[${msgTipo}]`).substring(0, 120);
            logLeadActivity(supabase, {
              tenantId: sessao.tenant_id,
              leadId: conversa.lead_id,
              tipo: 'whatsapp',
              titulo: 'Mensagem WhatsApp Recebida',
              descricao: `Mensagem recebida: "${preview}${preview.length >= 120 ? '...' : ''}"`,
              dados: {
                conversation_id: conversa.id,
                message_id: messageId,
                tipo: msgTipo,
                from_me: false,
                has_media: !!msgMediaUrl,
              },
            });
          }

          // ========================================
          // 2.0.1 DOWNLOAD MÍDIA → SUPABASE STORAGE (async, não bloqueia)
          // ========================================
          const isMediaMsg = msg.hasMedia || ['audio', 'ptt', 'image', 'video', 'document', 'sticker'].includes(msgTipo);
          if (isMediaMsg) {
            try {
              const { data: wahaMediaConfig } = await supabase
                .from("mt_waha_config")
                .select("api_url, api_key")
                .eq("tenant_id", sessao.tenant_id)
                .maybeSingle();

              const apiUrl = wahaMediaConfig?.api_url || "https://waha.yeslaserpraiagrande.com.br";
              const apiKey = wahaMediaConfig?.api_key || "";

              if (apiKey) {
                // Se WAHA NOWEB não enviou mediaUrl (comum para audio/ptt/video),
                // re-buscar a mensagem via API com downloadMedia=true
                let finalMediaUrl = msgMediaUrl;
                let finalMimetype = msgMimetype;
                if (!finalMediaUrl && msg.hasMedia) {
                  console.log(`[Webhook] mediaUrl ausente para ${msgTipo}, re-buscando com downloadMedia=true...`);
                  try {
                    const chatId = msg.chatId || msg.from || msg.to;
                    if (chatId) {
                      // Re-buscar mensagem com downloadMedia=true
                      const refetchResp = await fetch(
                        `${apiUrl}/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=5&downloadMedia=true`,
                        { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(25000) }
                      );
                      if (refetchResp.ok) {
                        const refetchMsgs = await refetchResp.json();
                        // Encontrar a mensagem específica pelo ID
                        const targetMsg = Array.isArray(refetchMsgs)
                          ? refetchMsgs.find((m: any) => {
                              const mId = typeof m.id === 'string' ? m.id : String(m.id);
                              return mId === messageId;
                            })
                          : null;
                        if (targetMsg?.mediaUrl) {
                          finalMediaUrl = targetMsg.mediaUrl;
                          finalMimetype = finalMimetype || targetMsg.mimetype;
                          console.log(`[Webhook] Re-fetch OK: mediaUrl encontrada`);
                          // Atualizar media_url na mensagem
                          await supabase.from("mt_whatsapp_messages")
                            .update({ media_url: finalMediaUrl, media_mimetype: finalMimetype || msgMimetype })
                            .eq("message_id", messageId);
                        } else {
                          console.log(`[Webhook] Re-fetch: mensagem não encontrada ou sem mediaUrl (${refetchMsgs?.length || 0} msgs)`);
                        }
                      } else {
                        console.log(`[Webhook] Re-fetch falhou: HTTP ${refetchResp.status}`);
                      }
                    }
                  } catch (dlErr) {
                    console.log(`[Webhook] Re-fetch erro: ${dlErr instanceof Error ? dlErr.message : dlErr}`);
                  }
                }

                if (finalMediaUrl) {
                  const { storageUrl, storagePath } = await downloadAndStoreMedia(
                    supabase, apiUrl, apiKey,
                    finalMediaUrl, sessao.tenant_id, conversa.id, messageId,
                    finalMimetype || msgMimetype, msgFilename,
                  );

                  if (storageUrl) {
                    await supabase
                      .from("mt_whatsapp_messages")
                      .update({ storage_path: storageUrl, media_url: storageUrl })
                      .eq("message_id", messageId);
                    console.log(`[Webhook] Mídia salva no storage: ${storagePath}`);
                  }
                }
              }
            } catch (mediaErr) {
              console.error("[Webhook] Erro ao salvar mídia no storage (não-crítico):", mediaErr instanceof Error ? mediaErr.message : mediaErr);
            }
          }
        }

        // ========================================
        // 2.1. TRACKING JANELA 24h/72h (MENSAGEM DO CLIENTE)
        // ========================================
        // Quando cliente envia msg → abrir/renovar janela de conversa
        // Janela 24h = mensagem normal (user_initiated)
        // Janela 72h = free entry point (campanha, referral)
        if (!actualFromMe && !isGroup && conversa?.id) {
          try {
            const entryPointType = msg._data?.entryPointType || 'user_initiated';
            const windowType = entryPointType === 'free_entry_point' ? '72h' : '24h';
            const windowHours = windowType === '72h' ? 72 : 24;
            const windowExpiresAt = new Date(Date.now() + windowHours * 60 * 60 * 1000).toISOString();
            const now = new Date().toISOString();

            // Upsert na tabela de windows
            const { error: windowError } = await supabase
              .from("mt_whatsapp_windows")
              .upsert({
                conversation_id: conversa.id,
                tenant_id: sessao.tenant_id,
                franchise_id: sessao.franchise_id || null,
                last_customer_message_at: now,
                entry_point_type: entryPointType,
                window_type: windowType,
                window_expires_at: windowExpiresAt,
                messages_sent_in_window: 0,
                updated_at: now,
              }, {
                onConflict: "conversation_id",
              });

            if (windowError) {
              console.error("[Webhook] Erro ao atualizar janela:", windowError);
            } else {
              console.log(`[Webhook] Janela ${windowType} aberta/renovada para conversa ${conversa.id}`);
            }

            // Atualizar campos de janela na conversa também (fallback)
            await supabase
              .from("mt_whatsapp_conversations")
              .update({
                last_customer_message_at: now,
                window_type: windowType,
                window_expires_at: windowExpiresAt,
              })
              .eq("id", conversa.id);
          } catch (windowErr) {
            console.error("[Webhook] Erro no tracking de janela:", windowErr);
          }
        }

        // ========================================
        // 2.2. DESATIVAR BOT SE HUMANO RESPONDEU
        // ========================================
        // Se msg foi enviada pela clínica (from_me=true) e NÃO é mensagem do bot,
        // significa que um atendente humano respondeu → desativar bot
        // IMPORTANTE: Quando o bot envia via WAHA, o WAHA ecoa de volta com from_me=true
        // mas com message_id diferente (ex: true_123@lid_xxx). Precisamos ignorar esses ecos.
        if (actualFromMe && !isGroup && conversa?.id) {
          const isBotMessage = messageId.startsWith('bot-') || messageId.startsWith('bot_');

          // Verificar se é eco do WAHA da mensagem do bot (enviada nos últimos 30s)
          const isBotEcho = conversa.bot_last_response_at &&
            (new Date().getTime() - new Date(conversa.bot_last_response_at).getTime()) < 30000;

          if (!isBotMessage && !isBotEcho && conversa.is_bot_active !== false) {
            console.log("[Chatbot] Humano respondeu - desativando bot para conversa:", conversa.id);
            await supabase
              .from("mt_whatsapp_conversations")
              .update({
                is_bot_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq("id", conversa.id);

            // Atualizar referência local para que o bloco do chatbot não processe
            conversa.is_bot_active = false;
          } else if (isBotEcho) {
            console.log("[Chatbot] Echo do WAHA detectado (bot respondeu há <30s) - ignorando");
          }
        }

        // ========================================
        // 2.5. CHATBOT IA - PROCESSAR MENSAGEM RECEBIDA
        // ========================================
        // Só processar com chatbot se:
        // - Mensagem recebida (não enviada por nós)
        // - Não é grupo
        // - Conversa não está atribuída a um atendente humano OU bot foi reativado
        // - Bot não foi desativado manualmente (is_bot_active !== false)
        const shouldProcessBot = !actualFromMe && !isGroup && (
          // Bot explicitamente ativo
          conversa.is_bot_active === true ||
          // OU sem atendente humano E bot não foi desativado (null = ativo por padrão)
          (!conversa.assigned_to && conversa.is_bot_active !== false)
        );

        // Tracking do chatbot para decisão de round robin
        let botIsHandling = false;       // Bot está cuidando da conversa
        let botTransferredToHuman = false; // Bot pediu transferência para humano

        if (shouldProcessBot) {
          try {
            // Verificar se bot está ativo - busca por session_id OU tenant global
            let botConfig: any = null;

            // 1. Buscar config específica da sessão (SEM filtrar is_active para respeitar desativação explícita)
            const { data: sessionBotConfig } = await supabase
              .from("mt_whatsapp_bot_config")
              .select("id, is_active, transfer_after_attempts, transfer_on_keywords, exclude_groups, exclude_contacts, openai_api_key")
              .eq("session_id", sessaoId)
              .maybeSingle();

            if (sessionBotConfig) {
              // Sessão tem config explícita - respeitar o is_active dela
              if (sessionBotConfig.is_active) {
                botConfig = sessionBotConfig;
              } else {
                // Bot DESATIVADO explicitamente para esta sessão - NÃO usar global como fallback
                console.log("[Chatbot] Bot desativado explicitamente para esta sessão - pulando chatbot");
              }
            } else {
              // 2. Sem config específica da sessão - buscar config global do tenant (session_id IS NULL)
              const { data: tenantBotConfig } = await supabase
                .from("mt_whatsapp_bot_config")
                .select("id, is_active, transfer_after_attempts, transfer_on_keywords, exclude_groups, exclude_contacts, openai_api_key")
                .eq("tenant_id", sessao.tenant_id)
                .is("session_id", null)
                .eq("is_active", true)
                .maybeSingle();

              if (tenantBotConfig) {
                botConfig = tenantBotConfig;
              }
            }

            // Se não tem bot ativo, conversa segue normalmente com atendente
            if (!botConfig) {
              console.log("[Chatbot] Nenhum bot ativo - conversa segue com atendente");
            } else {
              // Verificar se contato está na lista de exclusão
              if (botConfig.exclude_contacts?.length > 0 && phoneNumber) {
                const isExcluded = botConfig.exclude_contacts.some((c: string) =>
                  phoneNumber.includes(c) || c.includes(phoneNumber)
                );
                if (isExcluded) {
                  console.log("[Chatbot] Contato excluído da automação para sessão:", sessaoId);
                  break;
                }
              }

              // ========================================
              // VERIFICAR LIMITES PRÉ-PROCESSAMENTO
              // ========================================
              const currentAttempts = conversa.bot_attempts || 0;
              const maxAttempts = botConfig.transfer_after_attempts || 10;

              // Se atingiu limite de tentativas → transferir para humano
              if (currentAttempts >= maxAttempts) {
                console.log(`[Chatbot] Limite de tentativas atingido (${currentAttempts}/${maxAttempts}) - transferindo para humano`);
                botTransferredToHuman = true;

                // Desativar bot na conversa
                await supabase
                  .from("mt_whatsapp_conversations")
                  .update({
                    is_bot_active: false,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", conversa.id);

                // Incrementar estatística de handoffs
                await supabase.from("mt_whatsapp_bot_config").update({
                  handoffs_to_human: (botConfig.handoffs_to_human || 0) + 1,
                  updated_at: new Date().toISOString(),
                }).eq("id", botConfig.id);

                // Enviar mensagem de transferência (se configurada)
                const wahaConfigForTransfer = await supabase.from("mt_waha_config").select("api_url, api_key").single();
                if (wahaConfigForTransfer.data) {
                  const transferMsg = botConfig.transfer_message || "Estou transferindo você para um atendente humano. Aguarde um momento, por favor.";
                  await fetch(`${wahaConfigForTransfer.data.api_url}/api/sendText`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Api-Key": wahaConfigForTransfer.data.api_key
                    },
                    body: JSON.stringify({
                      session: payload.session,
                      chatId: chatId,
                      text: transferMsg
                    })
                  });

                  // Salvar mensagem de transferência no banco
                  await supabase.from("mt_whatsapp_messages").insert({
                    tenant_id: sessao.tenant_id,
                    conversation_id: conversa.id,
                    session_id: sessaoId,
                    message_id: `bot-transfer-${Date.now()}`,
                    body: transferMsg,
                    from_me: true,
                    is_bot_message: true,
                    tipo: "chat",
                    timestamp: new Date().toISOString(),
                    ack: 1
                  });
                }
                break; // Sai do bloco de chatbot
              }

              // Verificar transfer_on_keywords ANTES de chamar o bot
              if (botConfig.transfer_on_keywords?.length > 0 && msgBodyEarly) {
                const msgLower = msgBodyEarly.toLowerCase();
                const matchedKeyword = botConfig.transfer_on_keywords.find((kw: string) =>
                  msgLower.includes(kw.toLowerCase())
                );

                if (matchedKeyword) {
                  console.log(`[Chatbot] Keyword de transferência detectada: "${matchedKeyword}" - transferindo para humano`);
                  botTransferredToHuman = true;

                  await supabase
                    .from("mt_whatsapp_conversations")
                    .update({
                      is_bot_active: false,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", conversa.id);

                  await supabase.from("mt_whatsapp_bot_config").update({
                    handoffs_to_human: (botConfig.handoffs_to_human || 0) + 1,
                    updated_at: new Date().toISOString(),
                  }).eq("id", botConfig.id);

                  // Enviar mensagem de transferência
                  const wahaConfigForKw = await supabase.from("mt_waha_config").select("api_url, api_key").single();
                  if (wahaConfigForKw.data) {
                    const transferMsg = botConfig.transfer_message || "Entendi que você precisa de atendimento humano. Estou transferindo agora!";
                    await fetch(`${wahaConfigForKw.data.api_url}/api/sendText`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Api-Key": wahaConfigForKw.data.api_key
                      },
                      body: JSON.stringify({
                        session: payload.session,
                        chatId: chatId,
                        text: transferMsg
                      })
                    });

                    await supabase.from("mt_whatsapp_messages").insert({
                      tenant_id: sessao.tenant_id,
                      conversation_id: conversa.id,
                      session_id: sessaoId,
                      message_id: `bot-transfer-kw-${Date.now()}`,
                      body: transferMsg,
                      from_me: true,
                      is_bot_message: true,
                      tipo: "chat",
                      timestamp: new Date().toISOString(),
                      ack: 1
                    });
                  }
                  break;
                }
              }

              // ========================================
              // CHAMAR EDGE FUNCTION DO CHATBOT
              // ========================================
              console.log("[Chatbot] Bot ativo - processando mensagem (tentativa", currentAttempts + 1, "de", maxAttempts, ")");

              // ========================================
              // CONTEXTO ENRIQUECIDO PARA A IA
              // ========================================

              // 1. Buscar lead pelo telefone
              let leadContext: any = null;
              if (phoneNumber) {
                const { data: lead } = await supabase
                  .from('mt_leads')
                  .select('id, nome, temperatura, score, qualificado, status, servico_interesse, urgencia, ultimo_contato, total_contatos, cidade, estado')
                  .eq('tenant_id', sessao.tenant_id)
                  .or(`telefone.eq.${phoneNumber},whatsapp.eq.${phoneNumber}`)
                  .maybeSingle();
                if (lead) {
                  leadContext = lead;
                  // Vincular lead à conversa se ainda não vinculado
                  if (!conversa.lead_id) {
                    await supabase.from('mt_whatsapp_conversations')
                      .update({ lead_id: lead.id }).eq('id', conversa.id);
                  }
                }
              }

              // 2. Buscar catálogo completo (serviços + pacotes + produtos)
              const { data: servicosCatalog } = await supabase
                .from('mt_services')
                .select('nome, categoria, tipo, descricao_curta, preco, preco_promocional, duracao_minutos, requer_avaliacao')
                .eq('tenant_id', sessao.tenant_id)
                .eq('is_active', true)
                .is('deleted_at', null)
                .order('tipo').order('categoria').order('nome');

              // 3. Buscar dados da franquia
              let franchiseContext: any = null;
              if (sessao.franchise_id) {
                const { data: franchise } = await supabase
                  .from('mt_franchises')
                  .select('nome, cidade, estado, endereco, bairro, whatsapp, horario_funcionamento')
                  .eq('id', sessao.franchise_id)
                  .single();
                franchiseContext = franchise;
              }

              // 4. Buscar config WAHA (para download de mídia)
              const { data: wahaConfigForMedia } = await supabase
                .from("mt_waha_config")
                .select("api_url, api_key")
                .single();

              // 5. Transcrever áudio com Whisper (se mensagem for áudio)
              let transcription: string | null = null;
              if (msgTipo === 'audio' && msgMediaUrl && botConfig.openai_api_key) {
                try {
                  // Verificar cache primeiro
                  const { data: cached } = await supabase
                    .from('mt_ai_audio_transcriptions')
                    .select('transcription')
                    .eq('message_id', messageId)
                    .maybeSingle();

                  if (cached?.transcription) {
                    transcription = cached.transcription;
                    console.log(`[Chatbot] Áudio transcrito (cache): "${transcription!.substring(0, 80)}..."`);
                  } else {
                    // Baixar áudio do WAHA e transcrever com Whisper
                    const audioHeaders: Record<string, string> = {};
                    if (wahaConfigForMedia?.api_key) {
                      audioHeaders['X-Api-Key'] = wahaConfigForMedia.api_key;
                    }
                    const audioResp = await fetch(msgMediaUrl, { headers: audioHeaders });
                    if (audioResp.ok) {
                      const audioBlob = await audioResp.blob();
                      const formData = new FormData();
                      formData.append('file', audioBlob, 'audio.ogg');
                      formData.append('model', 'whisper-1');
                      formData.append('language', 'pt');

                      const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${botConfig.openai_api_key}` },
                        body: formData
                      });

                      if (whisperResp.ok) {
                        const whisperData = await whisperResp.json();
                        transcription = whisperData.text;
                        // Cachear transcrição
                        await supabase.from('mt_ai_audio_transcriptions').upsert({
                          tenant_id: sessao.tenant_id,
                          message_id: messageId,
                          conversation_id: conversa.id,
                          transcription: transcription,
                          language: 'pt',
                          whisper_model: 'whisper-1'
                        }, { onConflict: 'message_id' });
                        console.log(`[Chatbot] Áudio transcrito (Whisper): "${transcription!.substring(0, 80)}..."`);
                      } else {
                        console.error('[Chatbot] Erro Whisper:', await whisperResp.text());
                      }
                    }
                  }
                } catch (err) {
                  console.error('[Chatbot] Erro ao transcrever áudio:', err);
                }
              }

              // 6. Preparar URL de imagem (se mensagem for imagem)
              let imageUrl: string | null = null;
              let imageCaption: string | null = null;
              if (msgTipo === 'image' && msgMediaUrl) {
                imageUrl = msgMediaUrl;
                imageCaption = msgCaption;
              }

              console.log(`[Chatbot] Contexto: lead=${leadContext ? leadContext.nome : 'novo'}, serviços=${servicosCatalog?.length || 0}, franquia=${franchiseContext?.nome || 'N/A'}, audio=${transcription ? 'SIM' : 'NÃO'}, imagem=${imageUrl ? 'SIM' : 'NÃO'}`);

              // ========================================
              // CHAMAR EDGE FUNCTION DO CHATBOT (com contexto enriquecido)
              // ========================================
              const chatbotResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-chatbot-handler`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                },
                body: JSON.stringify({
                  sessionId: sessaoId,
                  message: transcription || msgBodyEarly,
                  conversationId: conversa.id,
                  tenantId: sessao.tenant_id,
                  fromNumber: phoneNumber,
                  // Contexto enriquecido
                  leadContext,
                  servicos: servicosCatalog || [],
                  franchiseContext,
                  contactName: conversa.contact_name || senderName,
                  // Mídia
                  messageType: msgTipo,
                  imageUrl,
                  imageCaption,
                  audioTranscription: transcription,
                  // Auth para download de mídia WAHA
                  wahaApiKey: wahaConfigForMedia?.api_key || null
                })
              });

              if (chatbotResponse.ok) {
                const chatbotResult = await chatbotResponse.json();

                // Se bot foi skipped (sem config, sem key, etc.), conversa segue normal
                if (chatbotResult.skipped) {
                  console.log("[Chatbot] Skipped:", chatbotResult.reason, "-", chatbotResult.message);
                }

                // Se bot gerou resposta, enviar via WAHA
                if (chatbotResult.success && !chatbotResult.skipped && chatbotResult.bot_reply) {
                  botIsHandling = true; // Bot respondeu com sucesso
                  const wahaConfig = await supabase.from("mt_waha_config").select("api_url, api_key").single();

                  if (wahaConfig.data) {
                    // Enviar resposta do bot via WAHA (com retry condicional)
                    const wahaResponse = await fetch(`${wahaConfig.data.api_url}/api/sendText`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Api-Key": wahaConfig.data.api_key
                      },
                      body: JSON.stringify({
                        session: payload.session,
                        chatId: chatId,
                        text: chatbotResult.bot_reply
                      })
                    }).catch((err: Error) => {
                      console.error('[Chatbot] Erro ao enviar para WAHA:', err);
                      return null;
                    });

                    if (wahaResponse && wahaResponse.ok) {
                      // Salvar mensagem do bot no banco
                      await supabase.from("mt_whatsapp_messages").insert({
                        tenant_id: sessao.tenant_id,
                        conversation_id: conversa.id,
                        session_id: sessaoId,
                        message_id: `bot-${Date.now()}`,
                        body: chatbotResult.bot_reply,
                        from_me: true,
                        is_bot_message: true,
                        tipo: "chat",
                        timestamp: new Date().toISOString(),
                        ack: 1
                      });

                      // Incrementar bot_attempts SOMENTE se WAHA enviou com sucesso
                      await supabase
                        .from("mt_whatsapp_conversations")
                        .update({
                          bot_attempts: currentAttempts + 1,
                          bot_last_response_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        })
                        .eq("id", conversa.id);

                      console.log("[Chatbot] Resposta enviada com sucesso (attempt", currentAttempts + 1, ")");
                    } else {
                      console.warn("[Chatbot] WAHA falhou ao enviar - NÃO incrementando bot_attempts");
                    }
                  }
                }

                // Se deve transferir para humano (flag da Edge Function)
                if (chatbotResult.should_transfer_to_human) {
                  console.log("[Chatbot] Edge Function solicitou transferência para humano");
                  botTransferredToHuman = true;
                  botIsHandling = false;

                  await supabase
                    .from("mt_whatsapp_conversations")
                    .update({
                      is_bot_active: false,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", conversa.id);

                  await supabase.from("mt_whatsapp_bot_config").update({
                    handoffs_to_human: (botConfig.handoffs_to_human || 0) + 1,
                    updated_at: new Date().toISOString(),
                  }).eq("id", botConfig.id);
                }
              } else {
                console.error("[Chatbot] Erro ao chamar chatbot:", await chatbotResponse.text());
              }
            }
          } catch (chatbotError) {
            console.error("[Chatbot] Erro no processamento:", chatbotError);
            // Continua execução normal mesmo se chatbot falhar
          }
        }

        // ========================================
        // 3. CRIAR/VINCULAR LEAD AUTOMATICAMENTE
        // ========================================
        // Só criar lead para:
        // - Conversas individuais (não grupos)
        // - Mensagens recebidas (não enviadas por nós)
        // - Sessão tem franchise_id vinculado
        if (!isGroup && !actualFromMe && sessao.franchise_id && conversa && phoneNumber && phoneNumber.length >= 10 && phoneNumber.length <= 13) {
          try {
            // Buscar config WAHA para foto do perfil
            const { data: wahaConfig } = await supabase
              .from("mt_waha_config")
              .select("api_url, api_key")
              .single();

            // Buscar foto do perfil
            let fotoUrl: string | null = null;
            if (wahaConfig) {
              fotoUrl = await getProfilePicture(
                wahaConfig.api_url,
                wahaConfig.api_key,
                payload.session,
                chatId
              );
              console.log("[Lead] Foto do perfil:", fotoUrl ? "encontrada" : "não disponível");
            }

            // Buscar lead existente na mesma unidade
            // Identificador único: telefone + franchise_id
            const { data: existingLead } = await supabase
              .from("mt_leads")
              .select("id, foto_url")
              .eq("franchise_id", sessao.franchise_id)
              .or(`telefone.eq.${phoneNumber},whatsapp.eq.${phoneNumber}`)
              .maybeSingle();

            let leadId: string | null = existingLead?.id || null;

            if (existingLead) {
              console.log("[Lead] Existente encontrado:", leadId);

              // Atualizar foto se disponível e diferente
              if (fotoUrl && fotoUrl !== existingLead.foto_url) {
                await supabase
                  .from("mt_leads")
                  .update({ foto_url: fotoUrl, updated_at: new Date().toISOString() })
                  .eq("id", existingLead.id);
                console.log("[Lead] Foto atualizada");
              }

              // Se bot transferiu para humano E lead não tem responsável → Round Robin agora
              if (botTransferredToHuman && !existingLead.atribuido_para && sessao.round_robin_enabled) {
                try {
                  let members: Array<{ user_id: string; nome: string }> = [];

                  if (sessao.round_robin_mode === 'team' && sessao.team_id) {
                    const { data: tm } = await supabase
                      .from('mt_team_members')
                      .select('user_id, user:mt_users!user_id(id, nome, is_active)')
                      .eq('team_id', sessao.team_id)
                      .eq('is_active', true);
                    if (tm) members = tm.filter((m: any) => m.user?.is_active).map((m: any) => ({ user_id: m.user_id, nome: m.user?.nome || '' }));
                  } else if (sessao.round_robin_mode === 'department' && sessao.department_id) {
                    const { data: dm } = await supabase
                      .from('mt_user_departments')
                      .select('user_id, user:mt_users!user_id(id, nome, is_active)')
                      .eq('department_id', sessao.department_id)
                      .eq('is_active', true);
                    if (dm) members = dm.filter((m: any) => m.user?.is_active).map((m: any) => ({ user_id: m.user_id, nome: m.user?.nome || '' }));
                  }

                  if (members.length > 0) {
                    const { data: rrState } = await supabase
                      .from('mt_whatsapp_round_robin_state')
                      .select('*')
                      .eq('session_id', sessao.id)
                      .maybeSingle();

                    const idx = ((rrState?.current_user_index || 0) % members.length);
                    const selected = members[idx];
                    const nextIdx = (idx + 1) % members.length;

                    // Atualizar lead com responsável
                    await supabase.from("mt_leads").update({
                      atribuido_para: selected.user_id,
                      responsible_user_id: selected.user_id,
                      atribuido_em: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }).eq("id", existingLead.id);

                    // Atualizar state
                    if (rrState) {
                      await supabase.from('mt_whatsapp_round_robin_state').update({
                        current_user_index: nextIdx,
                        last_assigned_user_id: selected.user_id,
                        last_assigned_at: new Date().toISOString(),
                        total_assigned: (rrState.total_assigned || 0) + 1,
                        updated_at: new Date().toISOString(),
                      }).eq('id', rrState.id);
                    }

                    console.log(`[RoundRobin] Handoff: Lead atribuído via round robin para usuário ${selected.user_id}`);
                  } else {
                    // Fallback: responsável fixo
                    if (sessao.responsible_user_id) {
                      await supabase.from("mt_leads").update({
                        atribuido_para: sessao.responsible_user_id,
                        responsible_user_id: sessao.responsible_user_id,
                        atribuido_em: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      }).eq("id", existingLead.id);
                    }
                  }
                } catch (rrErr) {
                  console.error('[RoundRobin] Erro no handoff round robin:', rrErr);
                }
              }
            } else {
              // === SEÇÃO: Criação de novo lead ===
              const extractedContactName = extractContactNameV3(msg, phoneNumber);
              const contactName = extractedContactName === phoneNumber ? phoneNumber : (extractedContactName || phoneNumber);
              const messageBody = msgBodyEarly || '';
              const origemDetectada = detectOrigemFromMessage(messageBody);

              // ========================================
              // ROUND ROBIN: Determinar responsável
              // ========================================
              // Se chatbot está atendendo (e NÃO transferiu), NÃO atribui humano ainda
              // O round robin só roda quando:
              // 1. Chatbot NÃO está ativo (sem bot ou bot desativado)
              // 2. Chatbot transferiu para humano nesta mensagem
              const shouldAssignHuman = !botIsHandling || botTransferredToHuman;
              let assignedUserId: string | null = null;

              if (shouldAssignHuman && sessao.round_robin_enabled) {
                try {
                  // Buscar membros baseado no modo (team ou department)
                  let members: Array<{ user_id: string; nome: string }> = [];

                  if (sessao.round_robin_mode === 'team' && sessao.team_id) {
                    const { data: teamMembers } = await supabase
                      .from('mt_team_members')
                      .select('user_id, user:mt_users!user_id(id, nome, is_active)')
                      .eq('team_id', sessao.team_id)
                      .eq('is_active', true);

                    if (teamMembers) {
                      members = teamMembers
                        .filter((m: any) => m.user?.is_active)
                        .map((m: any) => ({ user_id: m.user_id, nome: m.user?.nome || 'Sem nome' }));
                    }
                  } else if (sessao.round_robin_mode === 'department' && sessao.department_id) {
                    const { data: deptMembers } = await supabase
                      .from('mt_user_departments')
                      .select('user_id, user:mt_users!user_id(id, nome, is_active)')
                      .eq('department_id', sessao.department_id)
                      .eq('is_active', true);

                    if (deptMembers) {
                      members = deptMembers
                        .filter((m: any) => m.user?.is_active)
                        .map((m: any) => ({ user_id: m.user_id, nome: m.user?.nome || 'Sem nome' }));
                    }
                  }

                  if (members.length > 0) {
                    // Buscar ou criar state do round robin
                    let rrState: any = null;
                    {
                      const { data } = await supabase
                        .from('mt_whatsapp_round_robin_state')
                        .select('*')
                        .eq('session_id', sessao.id)
                        .maybeSingle();
                      rrState = data;
                    }

                    if (!rrState) {
                      // Criar novo state (upsert para evitar race na criação)
                      const { data: newState } = await supabase
                        .from('mt_whatsapp_round_robin_state')
                        .insert({
                          session_id: sessao.id,
                          tenant_id: sessao.tenant_id,
                          current_user_index: 0,
                          total_assigned: 0,
                          user_order: [],
                        })
                        .select()
                        .single();
                      rrState = newState;
                    }

                    // Optimistic locking: tentar atualizar até 3 vezes verificando que o índice não mudou
                    let selectedMember: { user_id: string; nome: string } | null = null;
                    let rrAttempts = 0;
                    while (rrAttempts < 3) {
                      // Releitura atômica do estado atual
                      const { data: freshState } = await supabase
                        .from('mt_whatsapp_round_robin_state')
                        .select('id, current_user_index, total_assigned')
                        .eq('session_id', sessao.id)
                        .maybeSingle();

                      if (!freshState) break;

                      const currentIndex = (freshState.current_user_index || 0) % members.length;
                      const nextIndex = (currentIndex + 1) % members.length;
                      const candidate = members[currentIndex];

                      // Atualizar apenas se o índice ainda corresponde ao que lemos (optimistic lock)
                      const { error: updateErr } = await supabase
                        .from('mt_whatsapp_round_robin_state')
                        .update({
                          current_user_index: nextIndex,
                          last_assigned_user_id: candidate.user_id,
                          last_assigned_at: new Date().toISOString(),
                          total_assigned: (freshState.total_assigned || 0) + 1,
                          user_order: members.map(m => m.user_id),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', freshState.id)
                        .eq('current_user_index', freshState.current_user_index); // optimistic lock

                      if (!updateErr) {
                        selectedMember = candidate;
                        break; // Atualização bem-sucedida
                      }
                      rrAttempts++;
                    }

                    if (selectedMember) {
                      assignedUserId = selectedMember.user_id;
                      console.log(`[RoundRobin] Webhook: Atribuído ao usuário ${selectedMember.user_id} (tentativas: ${rrAttempts + 1})`);
                    } else {
                      console.warn('[RoundRobin] Webhook: Falha no optimistic lock após 3 tentativas, usando fallback');
                      assignedUserId = sessao.responsible_user_id || null;
                    }
                  } else {
                    console.warn('[RoundRobin] Webhook: Nenhum membro de team/dept encontrado, buscando membros da sessão...');
                    // Fallback: buscar membros da sessão (mt_whatsapp_user_sessions)
                    assignedUserId = await resolveResponsibleFallback(supabase, sessao);
                  }
                } catch (rrError) {
                  console.error('[RoundRobin] Webhook: Erro no round robin, usando fallback:', rrError);
                  assignedUserId = sessao.responsible_user_id || null;
                  if (!assignedUserId) {
                    assignedUserId = await resolveResponsibleFallback(supabase, sessao);
                  }
                }
              } else if (shouldAssignHuman) {
                // Sem round robin explícito - usar responsável fixo ou auto-criar RR
                assignedUserId = sessao.responsible_user_id || null;
                if (!assignedUserId) {
                  console.log('[RoundRobin] Webhook: Sessão sem responsible fixo, auto-criando RR...');
                  assignedUserId = await resolveResponsibleFallback(supabase, sessao);
                }
              }
              // Se !shouldAssignHuman (bot atendendo), assignedUserId fica null

              const assignMethod = botIsHandling ? 'chatbot_ativo' : (sessao.round_robin_enabled ? 'round_robin' : 'fixo');
              console.log("[Lead] Criando novo lead para sessão:", sessaoId, "origem:", origemDetectada, "método:", assignMethod, "tenant:", sessao.tenant_id);

              const { data: newLead, error: leadError } = await supabase
                .from("mt_leads")
                .insert({
                  tenant_id: sessao.tenant_id, // OBRIGATÓRIO para MT
                  franchise_id: sessao.franchise_id || null,
                  nome: contactName,
                  telefone: phoneNumber,
                  whatsapp: phoneNumber,
                  foto_url: fotoUrl,
                  // Responsável: null se bot atendendo, Round Robin ou fixo se humano
                  responsible_user_id: assignedUserId,
                  atribuido_para: assignedUserId,
                  atribuido_em: assignedUserId ? new Date().toISOString() : null,
                  origem: origemDetectada,
                  status: botIsHandling ? "novo" : "novo",
                  observacoes: botIsHandling
                    ? `Lead criado via WhatsApp (chatbot atendendo). Origem: ${origemDetectada}. Msg: "${messageBody.substring(0, 100)}"`
                    : `Lead criado via WhatsApp. Origem: ${origemDetectada}. Msg: "${messageBody.substring(0, 100)}"`,
                })
                .select("id")
                .single();

              if (!leadError && newLead) {
                leadId = newLead.id;
                console.log("[Lead] Auto-criado:", leadId);

                // Log atividade: Lead criado via WhatsApp
                logLeadActivity(supabase, {
                  tenantId: sessao.tenant_id,
                  leadId: newLead.id,
                  tipo: 'cadastro',
                  titulo: 'Lead Criado via WhatsApp',
                  descricao: `Lead "${contactName}" criado automaticamente a partir de mensagem WhatsApp. Origem: ${origemDetectada}`,
                  dados: {
                    telefone: phoneNumber,
                    origem: origemDetectada,
                    session_name: sessao.session_name,
                    primeira_mensagem: (msgBodyEarly || '').substring(0, 200),
                    assign_method: assignMethod,
                    responsavel_id: assignedUserId,
                  },
                });
              } else {
                console.error("[Lead] Erro ao criar:", leadError);
              }
            }

            // Vincular lead à conversa se ainda não vinculado
            if (leadId && !conversa.lead_id) {
              await supabase
                .from("mt_whatsapp_conversations")
                .update({ lead_id: leadId })
                .eq("id", conversa.id);
              console.log("[Lead] Vinculado à conversa:", conversa.id);
            }

            // ========================================
            // 4. AUTO-ADICIONAR LEAD AO FUNIL DE VENDAS
            // ========================================
            // Só para leads NOVOS (não existentes) com franchise_id
            if (leadId && !existingLead && sessao.franchise_id) {
              try {
                // 4a. Buscar funil padrão da franquia
                let funnel: any = null;
                const { data: franchiseFunnel } = await supabase
                  .from("mt_funnels")
                  .select("id")
                  .eq("franchise_id", sessao.franchise_id)
                  .eq("is_active", true)
                  .eq("is_default", true)
                  .is("deleted_at", null)
                  .maybeSingle();

                if (franchiseFunnel) {
                  funnel = franchiseFunnel;
                } else {
                  // 4b. Fallback: funil padrão do tenant (sem franchise_id)
                  const { data: tenantFunnel } = await supabase
                    .from("mt_funnels")
                    .select("id")
                    .eq("tenant_id", sessao.tenant_id)
                    .is("franchise_id", null)
                    .eq("is_active", true)
                    .eq("is_default", true)
                    .is("deleted_at", null)
                    .maybeSingle();

                  if (tenantFunnel) {
                    funnel = tenantFunnel;
                  }
                }

                if (funnel) {
                  // 4c. Buscar primeira etapa (tipo='entrada' ou menor ordem)
                  const { data: firstStage } = await supabase
                    .from("mt_funnel_stages")
                    .select("id")
                    .eq("funnel_id", funnel.id)
                    .is("deleted_at", null)
                    .or("tipo.eq.entrada,tipo.eq.entry")
                    .order("ordem", { ascending: true })
                    .limit(1)
                    .maybeSingle();

                  // Fallback: pegar qualquer primeira etapa por ordem
                  const stage = firstStage || (await supabase
                    .from("mt_funnel_stages")
                    .select("id")
                    .eq("funnel_id", funnel.id)
                    .is("deleted_at", null)
                    .order("ordem", { ascending: true })
                    .limit(1)
                    .single()).data;

                  if (stage) {
                    // 4d. Inserir no funil (upsert para evitar duplicata)
                    const { error: funnelError } = await supabase
                      .from("mt_funnel_leads")
                      .upsert({
                        funnel_id: funnel.id,
                        stage_id: stage.id,
                        lead_id: leadId,
                        tenant_id: sessao.tenant_id,
                        posicao: 0,
                        prioridade: 0,
                        probabilidade: 50,
                        is_active: true,
                        entrou_em: new Date().toISOString(),
                      }, {
                        onConflict: "funnel_id,lead_id",
                      });

                    if (funnelError) {
                      console.error("[Funil] Erro ao adicionar lead:", funnelError);
                    } else {
                      console.log("[Funil] ✅ Lead auto-adicionado ao funil:", funnel.id, "etapa:", stage.id);
                    }
                  } else {
                    console.log("[Funil] Nenhuma etapa encontrada no funil:", funnel.id);
                  }
                } else {
                  console.log("[Funil] Nenhum funil padrão encontrado para franchise:", sessao.franchise_id);
                }
              } catch (funnelErr) {
                console.error("[Funil] Erro no auto-funil:", funnelErr);
              }
            }
          } catch (leadErr) {
            console.error("[Lead] Erro no processo:", leadErr);
          }
        }

        break;
      }

      case "message.ack": {
        // Message acknowledgement update (read receipts)
        const ackData = payload.payload;
        const messageId = ackData._data?.id?._serialized || ackData.id;

        if (messageId && ackData.ack !== undefined) {
          // ack: 0=pending, 1=sent, 2=delivered, 3=read, 4=played
          const { error: ackError } = await supabase
            .from("mt_whatsapp_messages")
            .update({ ack: ackData.ack })
            .eq("message_id", messageId);

          if (ackError) {
            console.error("[Webhook] Erro ao atualizar ack:", ackError);
          } else {
            console.log("[Webhook] Ack atualizado:", messageId, "->", ackData.ack);
          }

          // Atualizar status de broadcast messages (se existir)
          if (ackData.ack >= 2) {
            const broadcastStatus = ackData.ack >= 3 ? "read" : "delivered";
            const broadcastUpdate: Record<string, unknown> = { status: broadcastStatus };
            if (broadcastStatus === "delivered") {
              broadcastUpdate.delivered_at = new Date().toISOString();
            } else if (broadcastStatus === "read") {
              broadcastUpdate.delivered_at = broadcastUpdate.delivered_at || new Date().toISOString();
              broadcastUpdate.read_at = new Date().toISOString();
            }

            const { data: updatedBroadcast, error: broadcastAckError } = await supabase
              .from("mt_broadcast_messages")
              .update(broadcastUpdate)
              .eq("waha_message_id", messageId)
              .select("id, broadcast_campaign_id");

            if (!broadcastAckError && updatedBroadcast && updatedBroadcast.length > 0) {
              console.log(`[Webhook] Broadcast msg ack: ${messageId} -> ${broadcastStatus}`);

              // Atualizar contadores da campanha
              const campaignId = updatedBroadcast[0].broadcast_campaign_id;
              const { data: counts } = await supabase
                .from("mt_broadcast_messages")
                .select("status")
                .eq("broadcast_campaign_id", campaignId);

              if (counts) {
                const delivered = counts.filter((m: any) => m.status === "delivered" || m.status === "read").length;
                const read = counts.filter((m: any) => m.status === "read").length;
                await supabase
                  .from("mt_broadcast_campaigns")
                  .update({ delivered_count: delivered, read_count: read })
                  .eq("id", campaignId);
              }
            }
          }
        }
        break;
      }

      case "message.reaction": {
        // Reaction to a message (emoji reaction)
        const reactionData = payload.payload;
        const reactedMsgId = reactionData.reaction?.msgId?._serialized || reactionData.reaction?.msgId;
        const reactionEmoji = reactionData.reaction?.text || "";
        const reactorId = reactionData.from || reactionData.sender?.id;

        if (reactedMsgId) {
          // Fetch current reactions for this message
          const { data: msgData } = await supabase
            .from("mt_whatsapp_messages")
            .select("id, reactions")
            .eq("message_id", reactedMsgId)
            .maybeSingle();

          if (msgData) {
            const currentReactions = (msgData.reactions as Record<string, string[]>) || {};

            if (reactionEmoji) {
              // Add reaction
              if (!currentReactions[reactionEmoji]) {
                currentReactions[reactionEmoji] = [];
              }
              if (reactorId && !currentReactions[reactionEmoji].includes(reactorId)) {
                currentReactions[reactionEmoji].push(reactorId);
              }
              // Remove reactor from other emoji reactions
              for (const emoji of Object.keys(currentReactions)) {
                if (emoji !== reactionEmoji) {
                  currentReactions[emoji] = currentReactions[emoji].filter((id: string) => id !== reactorId);
                  if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
                }
              }
            } else {
              // Empty emoji = remove reaction
              for (const emoji of Object.keys(currentReactions)) {
                currentReactions[emoji] = currentReactions[emoji].filter((id: string) => id !== reactorId);
                if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
              }
            }

            await supabase
              .from("mt_whatsapp_messages")
              .update({ reactions: currentReactions })
              .eq("id", msgData.id);

            console.log("[Webhook] Reação atualizada:", reactedMsgId, reactionEmoji);
          }
        }
        break;
      }

      case "message.revoked": {
        // Message was deleted/revoked by sender
        const revokedData = payload.payload;
        // payload.payload contains { before: { id, body }, after: { id, body: "" } }
        const revokedMsgId = revokedData.after?._data?.id?._serialized ||
          revokedData.after?.id?._serialized ||
          revokedData.after?.id ||
          revokedData.before?.id;

        if (revokedMsgId) {
          const { error: revokeError } = await supabase
            .from("mt_whatsapp_messages")
            .update({
              is_revoked: true,
              body: "",
            })
            .eq("message_id", revokedMsgId);

          if (revokeError) {
            console.error("[Webhook] Erro ao marcar mensagem como revogada:", revokeError);
          } else {
            console.log("[Webhook] Mensagem marcada como revogada:", revokedMsgId);
          }
        }
        break;
      }

      case "message.edited": {
        // Message was edited by sender
        const editedData = payload.payload;
        const editedMsgId = editedData.after?._data?.id?._serialized ||
          editedData.after?.id?._serialized ||
          editedData.after?.id;
        const newBody = editedData.after?.body || editedData.after?._data?.body || "";

        if (editedMsgId && newBody) {
          const { error: editError } = await supabase
            .from("mt_whatsapp_messages")
            .update({
              body: newBody,
              is_edited: true,
            })
            .eq("message_id", editedMsgId);

          if (editError) {
            console.error("[Webhook] Erro ao atualizar mensagem editada:", editError);
          } else {
            console.log("[Webhook] Mensagem editada atualizada:", editedMsgId);
          }
        }
        break;
      }

      case "chat.archive": {
        // Chat was archived or unarchived
        const archiveData = payload.payload;
        const archivedChatId = archiveData.id || archiveData.chatId;
        const isArchived = archiveData.archived === true;

        if (archivedChatId && sessaoId) {
          const newStatus = isArchived ? "archived" : "open";
          const { error: archiveError } = await supabase
            .from("mt_whatsapp_conversations")
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("session_id", sessaoId)
            .eq("chat_id", archivedChatId);

          if (archiveError) {
            console.error("[Webhook] Erro ao atualizar status de arquivo:", archiveError);
          } else {
            console.log("[Webhook] Chat", archivedChatId, isArchived ? "arquivado" : "desarquivado");
          }
        }
        break;
      }

      case "label.upsert": {
        // Label was created or updated in WAHA (GOWS engine supports native labels)
        const labelData = payload.payload as any;
        const wahaLabelId = String(labelData.id || "");
        const labelName = labelData.name || "";
        const labelColorHex = labelData.colorHex || null;
        const labelColor = labelColorHex || (labelData.color !== undefined ? `color-${labelData.color}` : null);

        if (wahaLabelId && labelName) {
          try {
            // Check if label exists by waha_label_id + tenant_id
            const { data: existingLabel } = await supabase
              .from("mt_whatsapp_labels")
              .select("id")
              .eq("tenant_id", sessao.tenant_id)
              .eq("waha_label_id", wahaLabelId)
              .maybeSingle();

            if (existingLabel) {
              // Update existing label
              const { error: updateErr } = await supabase
                .from("mt_whatsapp_labels")
                .update({
                  name: labelName,
                  color: labelColor,
                  is_active: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingLabel.id);

              if (updateErr) {
                console.error("[Webhook] Erro ao atualizar label:", updateErr);
              } else {
                console.log("[Webhook] Label atualizada:", wahaLabelId, labelName);
              }
            } else {
              // Insert new label
              const { error: insertErr } = await supabase
                .from("mt_whatsapp_labels")
                .insert({
                  tenant_id: sessao.tenant_id,
                  franchise_id: sessao.franchise_id || null,
                  name: labelName,
                  color: labelColor,
                  waha_label_id: wahaLabelId,
                  is_active: true,
                });

              if (insertErr) {
                // If duplicate name, update waha_label_id on the existing name match
                if (insertErr.code === "23505") {
                  await supabase
                    .from("mt_whatsapp_labels")
                    .update({ waha_label_id: wahaLabelId, color: labelColor, is_active: true, updated_at: new Date().toISOString() })
                    .eq("tenant_id", sessao.tenant_id)
                    .eq("name", labelName);
                  console.log("[Webhook] Label vinculada por nome:", labelName);
                } else {
                  console.error("[Webhook] Erro ao criar label:", insertErr);
                }
              } else {
                console.log("[Webhook] Label criada:", wahaLabelId, labelName);
              }
            }
          } catch (labelErr) {
            console.error("[Webhook] Erro no processamento de label.upsert:", labelErr);
          }
        } else {
          console.log("[Webhook] label.upsert: payload sem id/name, ignorando", labelData);
        }
        break;
      }

      case "label.deleted": {
        // Label was deleted in WAHA — deactivate in our DB
        const deletedLabelData = payload.payload as any;
        const deletedWahaLabelId = String(deletedLabelData.id || "");

        if (deletedWahaLabelId) {
          try {
            const { error: deactivateErr } = await supabase
              .from("mt_whatsapp_labels")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("tenant_id", sessao.tenant_id)
              .eq("waha_label_id", deletedWahaLabelId);

            if (deactivateErr) {
              console.error("[Webhook] Erro ao desativar label deletada:", deactivateErr);
            } else {
              console.log("[Webhook] Label desativada (deletada no WAHA):", deletedWahaLabelId);
            }
          } catch (labelErr) {
            console.error("[Webhook] Erro no processamento de label.deleted:", labelErr);
          }
        }
        break;
      }

      case "label.chat.added":
      case "label.chat.deleted": {
        // A label was added/removed from a chat
        const labelChatData = payload.payload;
        const labelChatId = labelChatData.chatId;
        const wahaLabelId = labelChatData.label?.id || labelChatData.labelId;
        const isAdding = payload.event === "label.chat.added";

        if (labelChatId && sessaoId) {
          // Update waha_labels JSON field in the conversation
          const { data: convData } = await supabase
            .from("mt_whatsapp_conversations")
            .select("id, waha_labels")
            .eq("session_id", sessaoId)
            .eq("chat_id", labelChatId)
            .maybeSingle();

          if (convData) {
            const currentLabels = (convData.waha_labels as string[]) || [];
            let newLabels: string[];

            if (isAdding) {
              newLabels = [...new Set([...currentLabels, String(wahaLabelId)])];
            } else {
              newLabels = currentLabels.filter((id: string) => id !== String(wahaLabelId));
            }

            await supabase
              .from("mt_whatsapp_conversations")
              .update({ waha_labels: newLabels, updated_at: new Date().toISOString() })
              .eq("id", convData.id);

            console.log("[Webhook] Labels do chat atualizadas:", labelChatId, newLabels);
          }
        }
        break;
      }

      case "session.status": {
        // Session status change
        const status = payload.payload.body || "unknown";
        console.log("[Webhook] Status da sessão alterado:", status);

        // Map WAHA status to our status - only update for known statuses
        const statusMap: Record<string, string> = {
          "WORKING": "working",
          "SCAN_QR_CODE": "scan_qr",
          "STARTING": "starting",
          "FAILED": "failed",
          "STOPPED": "stopped",
        };

        const mappedStatus = statusMap[status];
        if (mappedStatus) {
          await supabase
            .from("mt_whatsapp_sessions")
            .update({ status: mappedStatus, updated_at: new Date().toISOString() })
            .eq("id", sessaoId);
        } else {
          console.warn("[Webhook] Status desconhecido ignorado:", status);
        }
        break;
      }

      case "message.reaction": {
        // Reações de emoji (👍, ❤️, etc.) — registrar como atualização da conversa
        const reaction = payload.payload;
        if (!reaction) break;

        const reactionChatId = reaction.from || reaction.chatId;
        if (!reactionChatId) break;

        const reactionEmoji = reaction.reaction?.text || reaction.text || "";
        const reactionSender = reaction.from || reaction.participant || "";
        const isFromMe = reaction.fromMe ?? reactionSender.startsWith("true_");
        const reactedMsgId = reaction.reaction?.messageId?._serialized || reaction.messageId || "";
        const reactionTimestamp = reaction.timestamp
          ? new Date(reaction.timestamp * 1000).toISOString()
          : new Date().toISOString();

        console.log(`[Webhook] Reação ${reactionEmoji} de ${reactionSender} em ${reactionChatId}`);

        // Atualizar conversa com timestamp da reação (mantém chat no topo)
        if (reactionChatId && reactionEmoji) {
          await supabase
            .from("mt_whatsapp_conversations")
            .update({
              last_message_text: `${isFromMe ? "Você" : "Contato"} reagiu: ${reactionEmoji}`,
              last_message_at: reactionTimestamp,
              updated_at: new Date().toISOString(),
            })
            .eq("session_id", sessaoId)
            .eq("chat_id", reactionChatId);

          // Se a reação é referente a uma mensagem específica, atualizar o ack da mensagem
          if (reactedMsgId) {
            await supabase
              .from("mt_whatsapp_messages")
              .update({ ack: 3 }) // 3 = lida/reagida
              .eq("message_id", reactedMsgId);
          }
        }
        break;
      }

      default:
        console.log("[Webhook] Evento não tratado:", payload.event);
    }

    return new Response(
      JSON.stringify({ success: true, event: payload.event }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Webhook] Erro:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
