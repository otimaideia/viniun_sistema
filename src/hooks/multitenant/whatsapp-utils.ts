// =============================================================================
// Utilidades compartilhadas do módulo WhatsApp
// Extraído de useWhatsAppChatAdapter.ts para reutilização
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import { wahaApi } from '@/services/waha-api';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type { WhatsAppConversa, WhatsAppMensagem } from '@/types/whatsapp-chat';

// =============================================================================
// Types
// =============================================================================

export interface DbConversaLabel {
  label: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export interface DbConversaMT {
  id: string;
  tenant_id: string;
  session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar: string | null;
  status: string | null;
  assigned_to: string | null;
  is_bot_active: boolean | null;
  is_group: boolean;
  is_pinned: boolean | null;
  unread_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  window_type: string | null;
  window_expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  conversation_labels?: DbConversaLabel[];
}

export interface DbMensagemMT {
  id: string;
  tenant_id: string;
  conversation_id: string;
  session_id: string;
  message_id: string | null;
  from_me: boolean;
  tipo: string | null;
  body: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  media_filename: string | null;
  storage_path: string | null;
  caption: string | null;
  ack: number | null;
  status: string | null;
  timestamp: string | null;
  created_at: string | null;
  updated_at: string | null;
  sender_id: string | null;
  sender_name: string | null;
  reactions: Record<string, string[]> | null;
  is_edited: boolean | null;
  is_revoked: boolean | null;
  is_pinned: boolean | null;
  quoted_message_id: string | null;
}

// =============================================================================
// URL Resolution
// =============================================================================

export function getAbsoluteMediaUrl(relativeUrl: string | undefined | null): string | undefined {
  if (!relativeUrl) return undefined;
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') ||
      relativeUrl.startsWith('data:') || relativeUrl.startsWith('blob:')) {
    return relativeUrl;
  }
  const wahaConfig = wahaApi.getConfig();
  if (!wahaConfig.apiUrl) return relativeUrl;
  let cleanUrl = relativeUrl;
  if (cleanUrl.startsWith('./')) cleanUrl = cleanUrl.substring(2);
  if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
  if (cleanUrl.startsWith('/api/files/') || cleanUrl.startsWith('/api/media/')) {
    // Já correto
  } else if (cleanUrl.startsWith('/files/')) {
    cleanUrl = '/api' + cleanUrl;
  } else if (!cleanUrl.startsWith('/api/')) {
    cleanUrl = '/api/files' + cleanUrl;
  }
  return `${wahaConfig.apiUrl}${cleanUrl}`;
}

// =============================================================================
// Message Type & Body Extraction (WAHA NOWEB compatible)
// =============================================================================

export function extractSyncMessageType(msg: any): string {
  const validMediaTypes = ['image', 'video', 'audio', 'ptt', 'document', 'sticker', 'location', 'vcard', 'contact', 'contacts_array', 'poll'];
  if (msg.type && validMediaTypes.includes(msg.type)) return msg.type === 'ptt' ? 'audio' : msg.type;
  if (msg._data?.type && validMediaTypes.includes(msg._data.type)) return msg._data.type === 'ptt' ? 'audio' : msg._data.type;
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
  if (msg.hasMedia) {
    const mime = msg.mimetype || msg._data?.mimetype || msg.media?.mimetype || '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('application/')) return 'document';
    return 'document';
  }
  if (msg.mediaUrl || msg.media?.url) return 'document';
  return msg.type || 'text';
}

export function extractSyncMessageBody(msg: any): string | null {
  if (msg.body && typeof msg.body === 'string' && msg.body.trim()) return msg.body;
  if (msg._data?.body && typeof msg._data.body === 'string' && msg._data.body.trim()) return msg._data.body;
  if (msg._data?.message?.conversation) return msg._data.message.conversation;
  if (msg._data?.message?.extendedTextMessage?.text) return msg._data.message.extendedTextMessage.text;
  if (msg.text && typeof msg.text === 'string' && msg.text.trim()) return msg.text;
  const caption = msg.caption || msg._data?.caption ||
    msg._data?.message?.imageMessage?.caption ||
    msg._data?.message?.videoMessage?.caption ||
    msg._data?.message?.documentMessage?.caption ||
    msg._data?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption;
  if (caption) return caption;
  return null;
}

// =============================================================================
// Phone Extraction
// =============================================================================

export function extractPhoneFromChatId(chatId: string | null): string | null {
  if (!chatId) return null;
  if (chatId.endsWith('@c.us')) {
    const digits = chatId.replace('@c.us', '').replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) return digits;
  }
  return null;
}

// =============================================================================
// UUID Validation
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export function filterValidUUIDs(ids: (string | null | undefined)[]): string[] {
  return ids.filter((id): id is string => !!id && UUID_RE.test(id));
}

// =============================================================================
// Mappers: MT → Legacy Format
// =============================================================================

export function mapConversaMTToLegacy(c: DbConversaMT): WhatsAppConversa {
  const labels = (c.conversation_labels || [])
    .map(cl => cl.label)
    .filter((l): l is { id: string; name: string; color: string | null } => l !== null);

  const phone = c.contact_phone || extractPhoneFromChatId(c.chat_id);

  // Prioridade do nome: lead.nome > contact_name (se não for nome da sessão) > phone
  const leadNome = (c as any).lead?.nome;
  const SESSION_NAMES = ['viniun', 'viniun boqueirão'];
  const isSessionName = c.contact_name && SESSION_NAMES.some(sn => c.contact_name!.toLowerCase().includes(sn));
  const displayName = leadNome || (isSessionName ? null : c.contact_name) || c.contact_name;

  return sanitizeObjectForJSON({
    id: c.id,
    sessao_id: c.session_id,
    chat_id: c.chat_id,
    nome_contato: displayName,
    numero_telefone: phone,
    foto_url: c.contact_avatar,
    is_group: c.is_group || c.chat_id?.includes('@g.us') || c.chat_id?.includes('@broadcast') || c.chat_id?.includes('@newsletter') || false,
    unread_count: c.unread_count || 0,
    ultima_mensagem_texto: c.last_message_text,
    ultima_mensagem_at: c.last_message_at || c.updated_at,
    last_message_at: c.last_message_at || null,
    status: (c.status as 'aberta' | 'aguardando' | 'resolvida' | 'arquivada') || 'aberta',
    assigned_to: c.assigned_to || null,
    assigned_user_name: null,
    is_bot_active: c.is_bot_active ?? null,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
    labels: labels.length > 0 ? labels : undefined,
    is_pinned: c.is_pinned ?? false,
    last_customer_message_at: c.last_customer_message_at || null,
    window_type: c.window_type || null,
    window_expires_at: c.window_expires_at || null,
  }) as WhatsAppConversa;
}

export function mapMensagemMTToLegacy(m: DbMensagemMT): WhatsAppMensagem {
  let resolvedMediaUrl: string | undefined;
  const storagePath = m.storage_path;
  if (storagePath && storagePath !== 'media_unavailable') {
    if (storagePath.startsWith('http')) {
      resolvedMediaUrl = storagePath;
    } else {
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(storagePath);
      resolvedMediaUrl = urlData?.publicUrl;
    }
  }
  if (!resolvedMediaUrl) {
    resolvedMediaUrl = getAbsoluteMediaUrl(m.media_url);
  }

  return sanitizeObjectForJSON({
    id: m.id,
    conversa_id: m.conversation_id,
    sessao_id: m.session_id,
    message_id: m.message_id || m.id,
    body: m.body,
    from_me: m.from_me ?? (m.message_id || '').startsWith('true_'),
    timestamp: m.timestamp || m.created_at || new Date().toISOString(),
    type: m.tipo || 'text',
    media_type: m.tipo && ['image', 'video', 'audio', 'ptt', 'document', 'sticker', 'location', 'vcard', 'contact', 'poll'].includes(m.tipo) ? m.tipo : undefined,
    media_url: resolvedMediaUrl,
    media_mime_type: m.media_mimetype || undefined,
    media_filename: m.media_filename || undefined,
    storage_path: resolvedMediaUrl && m.storage_path ? resolvedMediaUrl : undefined,
    caption: m.caption || undefined,
    ack: m.ack ?? 1,
    is_read: (m.ack ?? 0) >= 3,
    is_deleted: m.is_revoked || false,
    created_at: m.created_at || new Date().toISOString(),
    sender_id: m.sender_id || null,
    sender_name: m.sender_name || null,
    reactions: m.reactions || undefined,
    is_edited: m.is_edited || false,
    is_revoked: m.is_revoked || false,
    is_pinned: m.is_pinned || false,
    quoted_message_id: m.quoted_message_id || undefined,
  }) as WhatsAppMensagem;
}

// =============================================================================
// Media Download & Storage
// =============================================================================

export async function downloadAndStoreMedia(
  mediaUrl: string,
  tenantId: string | undefined,
  sessaoId: string | null,
  messageId: string,
  mimeType: string | null,
  filename: string | null,
): Promise<string | null> {
  try {
    const wahaConfig = wahaApi.getConfig();
    if (!wahaConfig.apiUrl || !wahaConfig.apiKey) return null;
    let absoluteUrl = mediaUrl;
    if (!mediaUrl.startsWith('http')) {
      let clean = mediaUrl;
      if (clean.startsWith('./')) clean = clean.substring(2);
      if (!clean.startsWith('/')) clean = '/' + clean;
      if (!clean.startsWith('/api/')) clean = '/api/files' + clean;
      absoluteUrl = `${wahaConfig.apiUrl}${clean}`;
    }
    if (absoluteUrl.includes('mmg.whatsapp.net')) return null;
    const response = await fetch(absoluteUrl, { headers: { 'X-Api-Key': wahaConfig.apiKey } });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size < 100) return null;
    const ext = filename?.split('.').pop() || (mimeType?.split('/')[1]?.split(';')[0]) || 'bin';
    const safeFilename = filename || `media.${ext}`;
    const storagePath = `whatsapp/${tenantId}/${sessaoId}/sync-${messageId.replace(/[^a-zA-Z0-9]/g, '_')}_${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(storagePath, blob, {
        contentType: mimeType || blob.type || 'application/octet-stream',
        upsert: false,
      });
    if (uploadError) {
      if (uploadError.message?.includes('already exists') || uploadError.message?.includes('Duplicate')) return storagePath;
      console.warn('[Sync] Upload error:', uploadError.message);
      return null;
    }
    return storagePath;
  } catch (err) {
    console.warn('[Sync] Erro ao baixar/salvar mídia:', err);
    return null;
  }
}

export async function downloadAndStoreContactAvatar(
  photoUrl: string,
  tenantId: string | undefined,
  sessaoId: string | null,
  chatId: string,
): Promise<string | null> {
  if (!photoUrl || !tenantId || !sessaoId) return null;
  if (!photoUrl.includes('mmg.whatsapp.net') && !photoUrl.includes('pps.whatsapp.net')) return null;
  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000);
    const response = await fetch(photoUrl, { signal: abortController.signal }).finally(() => clearTimeout(timeoutId));
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const blob = await response.blob();
    if (blob.size < 500) return null;
    const ext = (blob.type.split('/')[1] || 'jpg').split(';')[0];
    const safeChatId = chatId.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `whatsapp/${tenantId}/${sessaoId}/avatars/${safeChatId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(storagePath, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });
    if (uploadError) {
      console.warn('[Avatar] Upload error:', uploadError.message);
      return null;
    }
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(storagePath);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Avatar] Falha ao persistir foto de contato:', err);
    return null;
  }
}
