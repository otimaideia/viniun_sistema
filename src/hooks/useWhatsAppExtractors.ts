/**
 * Hook compartilhado para extração de dados de contatos WhatsApp
 * Versão V3 com suporte a @lid sem telefone + link preview
 *
 * Features:
 * - 15+ fontes de nome (Tier 1-8)
 * - 12+ fontes de telefone
 * - Suporte @lid sem telefone (allowLidAsFallback)
 * - Validação tripla (telefone, WhatsApp ID, tamanho)
 * - hasPhoneNumber e identifierType
 * - Link preview extraction
 */

export interface ContactDataV3 {
  chatId: string;
  rawChatId: string;
  phoneNumber: string;
  rawPhoneNumber: string;
  hasPhoneNumber: boolean;
  identifierType: 'phone' | 'lid' | 'unknown';
  contactName: string | null;
  verifiedName: string | null;
  isGroup: boolean;
  isNewsletter: boolean;
  isIndividual: boolean;
  participant: string | null;
  vCard: string | null;
  linkPreview: {
    url: string | null;
    title: string | null;
    description: string | null;
    thumbnailUrl: string | null;
  };
  isVerified: boolean;
  isMyContact: boolean;
  isBlocked: boolean;
  timestamp: number;
  fromMe: boolean;
}

/**
 * Valida se um valor é um número de telefone
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
 * Valida se um valor é um WhatsApp ID
 */
export function isWhatsAppIdV3(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /@(c\.us|s\.whatsapp\.net|g\.us|lid|newsletter)$/.test(value);
}

/**
 * Extrai nome do contato com validação tripla
 * 15+ fontes organizadas por Tier
 */
export function extractContactNameV3(msg: any, fallback = ''): string | null {
  if (!msg) return fallback || null;

  const possibleNames = [
    // Tier 1: Mais confiáveis
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

    // Tier 6: vCards
    msg.vCards?.[0]?.displayName,

    // Tier 7: Quoted messages
    msg.quotedMsg?._data?.pushName,
    msg.quotedMsg?._data?.notifyName,

    // Tier 8: Fallback grupos
    msg.participant,
    msg.author,
  ];

  for (const name of possibleNames) {
    if (name && typeof name === 'string' && name.trim()) {
      const trimmed = name.trim();

      // Validação 1: Rejeitar se for telefone
      if (isPhoneNumberV3(trimmed)) continue;

      // Validação 2: Rejeitar se for WhatsApp ID
      if (isWhatsAppIdV3(trimmed)) continue;

      // Validação 3: Rejeitar se muito curto (< 2 caracteres)
      if (trimmed.length < 2) continue;

      return trimmed;
    }
  }

  return fallback || null;
}

/**
 * Extrai número de telefone com 12+ fontes
 * @param allowLidAsFallback - Se true, aceita @lid como "telefone" quando contact.number = null
 */
export function extractPhoneNumberV3(
  msg: any,
  preferFrom = true,
  allowLidAsFallback = true
): string {
  if (!msg) return '';

  const sources = [
    msg.from,
    msg.to,
    msg.chatId,
    msg.remoteJid,
    msg._data?.key?.remoteJid,
    msg.participant,
    msg.author,
    msg.contact?.id,
    msg.contact?.number,
    msg.quotedMsg?.from,
    msg.quotedMsg?.to,
    msg.userReceipt?.[0]?.userJid,
  ];

  // Se preferFrom, priorizar msg.from
  const orderedSources = preferFrom ? sources : sources.reverse();

  for (const source of orderedSources) {
    if (!source || typeof source !== 'string') continue;

    // Extrair apenas números e alguns caracteres
    const cleaned = source.replace(/@(c\.us|s\.whatsapp\.net|g\.us|lid|newsletter)$/, '');

    // Se for @lid e contact.number = null, verificar allowLidAsFallback
    if (source.includes('@lid') && msg.contact?.number === null) {
      if (allowLidAsFallback) {
        // Retornar o LID como "telefone"
        return cleaned;
      } else {
        // Pular este source
        continue;
      }
    }

    // Validar se é número
    if (isPhoneNumberV3(cleaned)) {
      return cleaned.replace(/\D/g, '');
    }
  }

  return '';
}

/**
 * Extrai chatId com normalização
 */
export function extractChatIdV3(msg: any): string {
  if (!msg) return '';

  const sources = [
    msg.chatId,
    msg.from,
    msg.to,
    msg._data?.key?.remoteJid,
    msg.contact?.id,
  ];

  for (const source of sources) {
    if (source && typeof source === 'string') {
      return source;
    }
  }

  return '';
}

/**
 * Normaliza chatId para formato padrão (@c.us)
 */
export function normalizeChatIdV3(chatId: string): string {
  if (!chatId) return '';

  // @s.whatsapp.net → @c.us
  if (chatId.includes('@s.whatsapp.net')) {
    return chatId.replace('@s.whatsapp.net', '@c.us');
  }

  // @lid → @c.us
  if (chatId.includes('@lid')) {
    return chatId.replace('@lid', '@c.us');
  }

  // Já está no formato correto
  return chatId;
}

/**
 * Formata número de telefone
 */
export function formatPhoneNumberV3(phone: string): string {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  // Brasil: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const firstPart = cleaned.substring(4, 9);
    const secondPart = cleaned.substring(9);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }

  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const firstPart = cleaned.substring(2, 7);
    const secondPart = cleaned.substring(7);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }

  // Internacional: +XX ...
  return `+${cleaned}`;
}

/**
 * Verifica se é chat de grupo
 */
export function isGroupChatV3(chatId: string): boolean {
  return chatId ? chatId.includes('@g.us') : false;
}

/**
 * Verifica se é canal/newsletter
 */
export function isNewsletterChatV3(chatId: string): boolean {
  return chatId ? chatId.includes('@newsletter') : false;
}

/**
 * Extrai link preview (NOVO em V3)
 */
export function extractLinkPreviewV3(msg: any): {
  url: string | null;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
} {
  const extMsg = msg?._data?.message?.extendedTextMessage;

  if (!extMsg) {
    return { url: null, title: null, description: null, thumbnailUrl: null };
  }

  return {
    url: extMsg.canonicalUrl || null,
    title: extMsg.title || null,
    description: extMsg.description || null,
    thumbnailUrl: extMsg.thumbnailUrl || null,
  };
}

/**
 * Valida se deve atualizar nome de contato
 */
export function shouldUpdateContactNameV3(
  currentName: string | null | undefined,
  newName: string | null | undefined
): boolean {
  // Atualizar se nome atual vazio
  if (!currentName || currentName.trim() === '') {
    // Mas apenas se o novo nome for válido
    if (!newName || newName.trim() === '') return false;

    // Rejeitar se novo nome for telefone ou WhatsApp ID
    if (isPhoneNumberV3(newName) || isWhatsAppIdV3(newName)) return false;

    return true;
  }

  // Não atualizar se já tem nome válido
  return false;
}

/**
 * Extrai todos os dados do contato (função principal)
 */
export function extractContactDataV3(msg: any): ContactDataV3 {
  const chatId = extractChatIdV3(msg);
  const rawChatId = chatId;
  const normalizedChatId = normalizeChatIdV3(chatId);

  // Extrair telefone SEM allowLidAsFallback primeiro
  const phoneWithoutLid = extractPhoneNumberV3(msg, !msg?.fromMe, false);

  // Se não tem telefone, tentar COM allowLidAsFallback
  const phoneWithLid = phoneWithoutLid || extractPhoneNumberV3(msg, !msg?.fromMe, true);

  // Determinar hasPhoneNumber e identifierType ANTES de processar
  const hasPhoneNumber = !!phoneWithoutLid;
  let identifierType: 'phone' | 'lid' | 'unknown';

  if (phoneWithoutLid) {
    identifierType = 'phone';
  } else if (phoneWithLid && chatId.includes('@lid')) {
    identifierType = 'lid';
  } else if (phoneWithLid) {
    identifierType = 'phone'; // LID mas tem número
  } else {
    identifierType = 'unknown';
  }

  const phoneNumber = phoneWithLid;
  const rawPhoneNumber = phoneNumber;

  const contactName = extractContactNameV3(msg);
  const verifiedName = msg?._data?.verifiedName || null;

  const isGroup = isGroupChatV3(chatId);
  const isNewsletter = isNewsletterChatV3(chatId);
  const isIndividual = !isGroup && !isNewsletter;

  const participant = msg?.participant || null;
  const vCard = msg?.vCards?.[0]?.vcard || null;

  const linkPreview = extractLinkPreviewV3(msg);

  const isVerified = !!verifiedName;
  const isMyContact = msg?.contact?.isMyContact ?? false;
  const isBlocked = msg?.contact?.isBlocked ?? false;

  const timestamp = msg?.timestamp || Date.now();
  const fromMe = msg?.fromMe ?? false;

  return {
    chatId: normalizedChatId,
    rawChatId,
    phoneNumber,
    rawPhoneNumber,
    hasPhoneNumber,
    identifierType,
    contactName,
    verifiedName,
    isGroup,
    isNewsletter,
    isIndividual,
    participant,
    vCard,
    linkPreview,
    isVerified,
    isMyContact,
    isBlocked,
    timestamp,
    fromMe,
  };
}

/**
 * Hook principal do React
 */
export function useWhatsAppExtractors() {
  return {
    // Funções de validação
    isPhoneNumberV3,
    isWhatsAppIdV3,

    // Funções de extração
    extractContactNameV3,
    extractPhoneNumberV3,
    extractChatIdV3,
    extractContactDataV3,
    extractLinkPreviewV3,

    // Funções de formatação
    normalizeChatIdV3,
    formatPhoneNumberV3,

    // Funções de verificação
    isGroupChatV3,
    isNewsletterChatV3,
    shouldUpdateContactNameV3,
  };
}
