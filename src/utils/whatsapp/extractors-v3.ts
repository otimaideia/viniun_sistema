/**
 * WAHA WhatsApp Contact Extractors - Version 3.0
 *
 * Ultra-advanced extraction with @lid support without phone number
 *
 * NEW in V3:
 * - Support for @lid contacts without phone numbers
 * - identifierType field ('phone' | 'lid' | 'unknown')
 * - hasPhoneNumber flag
 * - extractLinkPreview for message enrichment
 * - Improved type safety
 *
 * CHANGES from V2:
 * - extractPhoneNumberV3: new allowLidAsFallback parameter
 * - extractContactDataV3: new fields (identifierType, hasPhoneNumber, linkPreview)
 * - Enhanced ContactDataV3 interface
 *
 * Based on:
 * - WAHA NOWEB documentation (https://waha.devlike.pro/docs/engines/noweb/)
 * - Issue #1418: @lid format
 * - Issue #1073: Direct message without phone number
 * - Discussion #602: .to field missing
 */

// ===================================
// INTERFACES
// ===================================

export interface WAHAWebhookPayload {
  // IDs principais
  id?: string;
  from?: string;
  to?: string;
  chatId?: string;
  remoteJid?: string;
  participant?: string;
  author?: string;

  // Nomes (8 variações no top-level)
  name?: string;
  pushName?: string;
  pushname?: string;
  notifyName?: string;
  senderName?: string;

  // Metadados
  fromMe?: boolean;
  body?: string;
  timestamp?: number;
  hasMedia?: boolean;
  mediaUrl?: string | null;
  type?: string;
  ack?: number;

  // Contact object completo
  contact?: {
    id?: string;
    number?: string | null;  // CRITICAL: pode ser null para @lid
    name?: string;
    pushName?: string;
    pushname?: string;
    shortName?: string;
    isMe?: boolean;
    isGroup?: boolean;
    isWAContact?: boolean;
    isMyContact?: boolean;
    isBlocked?: boolean;
  };

  // _data object (NOWEB specific)
  _data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
      participant?: string;
      _serialized?: string;
    };
    pushName?: string;
    notifyName?: string;
    verifiedName?: string;
    messageTimestamp?: number;
    broadcast?: boolean;
    status?: number;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
        matchedText?: string;
        canonicalUrl?: string;
        title?: string;
        description?: string;
        thumbnailUrl?: string;
      };
    };
    pollUpdates?: Array<any>;
  };

  // vCards (contatos compartilhados)
  vCards?: Array<{
    displayName?: string;
    vcard?: string;
  }>;

  // Quoted message (mensagem citada)
  quotedMsg?: {
    id?: string;
    from?: string;
    to?: string;
    participant?: string;
    body?: string;
    _data?: {
      pushName?: string;
      notifyName?: string;
    };
  };

  // Reactions
  reactions?: Array<{
    id?: string;
    orphan?: number;
    orphanReason?: string | null;
    timestamp?: number;
    reaction?: {
      text?: string;
      senderTimestampMs?: number;
    };
  }>;

  // User receipts (confirmações de leitura)
  userReceipt?: Array<{
    userJid?: string;
    receiptTimestamp?: number;
    readTimestamp?: number;
  }>;

  // Chat metadata
  isGroup?: boolean;
  unreadCount?: number;
  lastMessage?: {
    body?: string;
    fromMe?: boolean;
    timestamp?: number;
  };
}

export interface ContactDataV3 {
  // IDs
  chatId: string;
  rawChatId: string;

  // Telefone / Identificador
  phoneNumber: string;
  rawPhoneNumber: string;
  hasPhoneNumber: boolean;       // NEW in V3
  identifierType: 'phone' | 'lid' | 'unknown';  // NEW in V3

  // Nome
  contactName: string | null;
  verifiedName: string | null;

  // Tipo de chat
  isGroup: boolean;
  isNewsletter: boolean;
  isIndividual: boolean;

  // Grupo
  participant: string | null;

  // vCard
  vCard: {
    displayName: string;
    vcard: string;
  } | null;

  // Link Preview (NEW in V3)
  linkPreview: {
    url: string | null;
    title: string | null;
    description: string | null;
    thumbnailUrl: string | null;
  };

  // Flags
  isVerified: boolean;
  isMyContact: boolean;
  isBlocked: boolean;

  // Metadados
  timestamp: number;
  fromMe: boolean;
}

// ===================================
// VALIDATION FUNCTIONS
// ===================================

/**
 * Valida se string é um número de telefone
 *
 * @param value - String a validar
 * @returns true se for telefone
 */
export function isPhoneNumberV3(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const cleaned = value.replace(/\s+/g, '');
  const phonePattern = /^[\+\(]?[\d\s\-()]+$/;

  if (!phonePattern.test(cleaned)) return false;

  const digitCount = (cleaned.match(/\d/g) || []).length;
  return digitCount >= 8;
}

/**
 * Valida se string é um WhatsApp ID (JID)
 * Formatos: @c.us, @s.whatsapp.net, @g.us, @lid, @newsletter
 *
 * @param value - String a validar
 * @returns true se for WhatsApp ID
 */
export function isWhatsAppIdV3(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /@(c\.us|s\.whatsapp\.net|g\.us|lid|newsletter)$/.test(value);
}

/**
 * Detecta se chatId é um canal (newsletter)
 *
 * @param chatId - Chat ID a verificar
 * @returns true se for newsletter
 */
export function isNewsletterChatV3(chatId: string): boolean {
  return chatId?.endsWith('@newsletter') || false;
}

// ===================================
// EXTRACTION FUNCTIONS
// ===================================

/**
 * Extrai nome do contato com validação tripla
 *
 * V3: Mesma lógica do V2 (já está completa)
 *
 * Ordem de prioridade (15+ fontes):
 * 1. contact.name (agenda)
 * 2. _data.verifiedName (Business)
 * 3. name
 * 4. contact.pushName
 * 5. pushName
 * 6. _data.pushName
 * 7. notifyName
 * 8. _data.notifyName
 * 9. contact.shortName
 * 10. pushname
 * 11. senderName
 * 12. vCards[0].displayName
 * 13. quotedMsg._data.pushName
 * 14. quotedMsg._data.notifyName
 * 15. participant (fallback grupo)
 * 16. author (fallback grupo)
 *
 * Validações:
 * - Rejeita números de telefone
 * - Rejeita WhatsApp IDs (@c.us, etc)
 * - Rejeita nomes muito curtos (<2 chars)
 */
export function extractContactNameV3(
  data: WAHAWebhookPayload,
  fallback = ''
): string | null {
  const possibleNames: Array<string | undefined> = [
    // Tier 1: Mais confiáveis (agenda, verificado)
    data.contact?.name,
    data._data?.verifiedName,

    // Tier 2: Nome direto
    data.name,

    // Tier 3: Push names
    data.contact?.pushName,
    data.pushName,
    data._data?.pushName,

    // Tier 4: Notify names
    data.notifyName,
    data._data?.notifyName,

    // Tier 5: Variações
    data.contact?.shortName,
    data.pushname,
    data.senderName,

    // Tier 6: vCard
    data.vCards?.[0]?.displayName,

    // Tier 7: Quoted message
    data.quotedMsg?._data?.pushName,
    data.quotedMsg?._data?.notifyName,

    // Tier 8: Fallback para grupos (geralmente são IDs)
    data.participant,
    data.author,
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
 * Extrai telefone de 12+ fontes
 *
 * V3 NEW: Suporte para @lid sem telefone (allowLidAsFallback)
 *
 * @param data - Payload do webhook
 * @param preferFrom - Preferir campo 'from' sobre 'to'
 * @param allowLidAsFallback - Aceitar @lid como telefone se não encontrar número
 * @returns Telefone (apenas dígitos) ou LID
 */
export function extractPhoneNumberV3(
  data: WAHAWebhookPayload,
  preferFrom = true,
  allowLidAsFallback = false  // NEW in V3
): string {
  const sources = preferFrom
    ? [
        data.from,
        data.to,
        data.chatId,
        data.remoteJid,
        data._data?.key?.remoteJid,
        data.participant,
        data.author,
        data.contact?.id,
        data.contact?.number,
        data.quotedMsg?.from,
        data.quotedMsg?.to,
        data.userReceipt?.[0]?.userJid,
      ]
    : [
        data.to,
        data.from,
        data.chatId,
        data.remoteJid,
        data._data?.key?.remoteJid,
        data.participant,
        data.author,
        data.contact?.id,
        data.contact?.number,
        data.quotedMsg?.from,
        data.quotedMsg?.to,
        data.userReceipt?.[0]?.userJid,
      ];

  for (const source of sources) {
    if (!source || typeof source !== 'string') continue;

    // Pular @lid se allowLidAsFallback = false
    if (!allowLidAsFallback && source.includes('@lid')) {
      continue;
    }

    // Remover sufixos WhatsApp (@c.us, @s.whatsapp.net, etc)
    const phoneMatch = source.match(/^(\d+)@/);
    if (phoneMatch) {
      return phoneMatch[1];
    }

    // Se for apenas número (sem @), retornar
    if (/^\d+$/.test(source)) {
      return source;
    }
  }

  // NEW in V3: Fallback para @lid se habilitado
  if (allowLidAsFallback) {
    // Tentar extrair LID de from
    if (data.from && data.from.includes('@lid')) {
      const lidMatch = data.from.match(/^(\d+)@lid$/);
      if (lidMatch) return lidMatch[1];
    }

    // Tentar extrair LID de chatId
    if (data.chatId && data.chatId.includes('@lid')) {
      const lidMatch = data.chatId.match(/^(\d+)@lid$/);
      if (lidMatch) return lidMatch[1];
    }

    // Tentar extrair LID de contact.id
    if (data.contact?.id && data.contact.id.includes('@lid')) {
      const lidMatch = data.contact.id.match(/^(\d+)@lid$/);
      if (lidMatch) return lidMatch[1];
    }
  }

  return '';
}

/**
 * Extrai telefone de vCard
 */
export function extractPhoneFromVCardV3(vcard: string): string | null {
  if (!vcard) return null;

  const telMatch = vcard.match(/TEL[;:]([^\n]+)/i);
  if (!telMatch) return null;

  const phoneNumber = telMatch[1].replace(/\D/g, '');
  return phoneNumber || null;
}

/**
 * Extrai chatId do payload
 */
export function extractChatIdV3(data: WAHAWebhookPayload): string {
  return (
    data.chatId ||
    data.from ||
    data.to ||
    data.remoteJid ||
    data._data?.key?.remoteJid ||
    ''
  );
}

/**
 * Normaliza chatId para formato padrão WAHA
 *
 * Conversões:
 * - @s.whatsapp.net → @c.us
 * - @lid → @c.us
 * - Mantém @g.us (grupos)
 * - Mantém @newsletter (canais)
 * - Adiciona @c.us se ausente
 */
export function normalizeChatIdV3(chatId: string): string {
  if (!chatId) return '';

  // Manter grupos e newsletters
  if (chatId.endsWith('@g.us') || chatId.endsWith('@newsletter')) {
    return chatId;
  }

  // Converter @s.whatsapp.net e @lid para @c.us
  if (chatId.includes('@s.whatsapp.net') || chatId.includes('@lid')) {
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
 * Formata número de telefone para padrão brasileiro
 * Remove zero à esquerda e adiciona código do país +55
 */
export function formatPhoneNumberV3(phone: string): string {
  if (!phone) return '';

  let cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }

  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  return cleanPhone;
}

/**
 * Detecta se chat é um grupo
 */
export function isGroupChatV3(chatId: string): boolean {
  return chatId?.endsWith('@g.us') || false;
}

/**
 * NEW in V3: Extrai informações de link preview
 */
export function extractLinkPreviewV3(data: WAHAWebhookPayload): {
  url: string | null;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
} {
  const extMsg = data._data?.message?.extendedTextMessage;

  if (!extMsg) {
    return {
      url: null,
      title: null,
      description: null,
      thumbnailUrl: null,
    };
  }

  return {
    url: extMsg.canonicalUrl || null,
    title: extMsg.title || null,
    description: extMsg.description || null,
    thumbnailUrl: extMsg.thumbnailUrl || null,
  };
}

/**
 * Extrai TODOS os dados de contato do webhook
 *
 * V3: Adiciona hasPhoneNumber, identifierType e linkPreview
 */
export function extractContactDataV3(
  data: WAHAWebhookPayload
): ContactDataV3 {
  const rawChatId = extractChatIdV3(data);
  const chatId = normalizeChatIdV3(rawChatId);

  // Tentar extrair telefone normal (SEM LID)
  const phoneNumber = extractPhoneNumberV3(data, true, false);

  // Se não encontrou telefone, tentar com LID
  const lidNumber = phoneNumber ? '' : extractPhoneNumberV3(data, true, true);

  // Determinar qual usar
  const finalPhoneNumber = phoneNumber || lidNumber;
  const rawPhoneNumber = finalPhoneNumber.replace(/\D/g, '');

  // NEW in V3: determinar tipo ANTES de processar resto
  const hasPhoneNumber = !!phoneNumber;
  const identifierType: 'phone' | 'lid' | 'unknown' = phoneNumber
    ? 'phone'
    : lidNumber
    ? 'lid'
    : 'unknown';

  const contactName = extractContactNameV3(data, rawPhoneNumber);
  const verifiedName = data._data?.verifiedName || null;

  const isGroup = isGroupChatV3(chatId);
  const isNewsletter = isNewsletterChatV3(chatId);
  const isIndividual = !isGroup && !isNewsletter;

  const participant = data.participant || data._data?.key?.participant || null;

  const vCard = data.vCards?.[0]
    ? {
        displayName: data.vCards[0].displayName || '',
        vcard: data.vCards[0].vcard || '',
      }
    : null;

  const linkPreview = extractLinkPreviewV3(data);

  const isVerified = !!verifiedName;
  const isMyContact = data.contact?.isMyContact || false;
  const isBlocked = data.contact?.isBlocked || false;

  const timestamp = data.timestamp || data._data?.messageTimestamp || Date.now();
  const fromMe = data.fromMe || false;

  return {
    chatId,
    rawChatId,
    phoneNumber: formatPhoneNumberV3(finalPhoneNumber),
    rawPhoneNumber,
    hasPhoneNumber,      // NEW
    identifierType,      // NEW
    contactName,
    verifiedName,
    isGroup,
    isNewsletter,
    isIndividual,
    participant,
    vCard,
    linkPreview,         // NEW
    isVerified,
    isMyContact,
    isBlocked,
    timestamp,
    fromMe,
  };
}

/**
 * Verifica se nome do contato deve ser atualizado
 *
 * Regras:
 * 1. Não atualizar se já tem nome
 * 2. Não atualizar se novo nome é telefone
 * 3. Não atualizar se novo nome é WhatsApp ID
 */
export function shouldUpdateContactNameV3(
  currentName: string | null,
  newName: string | null
): boolean {
  if (!newName) return false;
  if (currentName && currentName.trim()) return false;
  if (isPhoneNumberV3(newName)) return false;
  if (isWhatsAppIdV3(newName)) return false;
  return true;
}
