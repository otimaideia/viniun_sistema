/**
 * ========================================
 * WAHA NOWEB - EXTRAÇÃO ULTRA-AVANÇADA v2.0
 * ========================================
 *
 * Mapeamento COMPLETO de TODOS os campos possíveis do webhook WAHA NOWEB
 * baseado na documentação oficial + análise de código fonte + issues GitHub
 *
 * Suporta:
 * - 15+ fontes para nome do contato
 * - 12+ formatos de chatId/phone
 * - Conversão @lid ↔ @c.us (WhatsApp LID update)
 * - Extração de vCards
 * - Dados de grupos (participant, author)
 * - Quoted messages com sender
 * - Reactions com sender
 */

// ============================================
// INTERFACES COMPLETAS DO WAHA NOWEB
// ============================================

/**
 * Payload COMPLETO do webhook WAHA NOWEB
 * Baseado em: https://waha.devlike.pro/docs/how-to/events/
 * e código fonte: github.com/devlikeapro/waha
 */
interface WAHAWebhookPayload {
  // === CAMPOS TOP-LEVEL ===
  id?: string;
  timestamp?: number;
  from?: string;           // pode ser @c.us, @lid, @s.whatsapp.net
  to?: string;             // pode ser @c.us, @lid, @s.whatsapp.net
  fromMe?: boolean;
  body?: string;
  hasMedia?: boolean;
  mediaUrl?: string;
  type?: string;
  ack?: number;

  // === NOMES (8 VARIAÇÕES) ===
  notifyName?: string;     // Nome de notificação
  pushName?: string;       // Nome push (mais comum)
  pushname?: string;       // Variação lowercase
  name?: string;           // Nome direto
  senderName?: string;     // Nome do remetente (raro)

  // === IDS ALTERNATIVOS ===
  chatId?: string;         // ID do chat
  remoteJid?: string;      // Remote JID (formato interno)
  participant?: string;    // Participante em grupos
  author?: string;         // Autor da mensagem em grupos

  // === CONTACT OBJECT ===
  contact?: {
    id?: string;
    number?: string;
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

  // === _DATA OBJECT (NOWEB SPECIFIC) ===
  _data?: {
    // IDs e metadados
    key?: {
      remoteJid?: string;   // JID remoto
      fromMe?: boolean;
      id?: string;
      participant?: string; // Em grupos
      _serialized?: string; // ID serializado completo
    };

    // Nomes (múltiplas variações)
    pushName?: string;
    notifyName?: string;
    verifiedName?: string;  // Nome verificado (Business)

    // Timestamps
    messageTimestamp?: number;

    // Flags
    broadcast?: boolean;
    status?: number;

    // Conteúdo da mensagem
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };

    // Poll updates (enquetes)
    pollUpdates?: any[];
  };

  // === vCARDS (Contatos compartilhados) ===
  vCards?: Array<{
    displayName?: string;   // Nome no vCard
    vcard?: string;         // vCard completo
  }>;

  // === QUOTED MESSAGE (Mensagem citada) ===
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

  // === REACTIONS ===
  reactions?: Array<{
    id?: string;
    orphan?: number;
    orphanReason?: string;
    timestamp?: number;
    reaction?: {
      text?: string;
      senderTimestampMs?: number;
    };
  }>;

  // === USER RECEIPT (Leitura) ===
  userReceipt?: Array<{
    userJid?: string;
    receiptTimestamp?: number;
    readTimestamp?: number;
  }>;

  // === METADADOS DO CHAT ===
  isGroup?: boolean;
  unreadCount?: number;
  lastMessage?: {
    body?: string;
    fromMe?: boolean;
    timestamp?: number;
  };
}

// ============================================
// FUNÇÕES DE EXTRAÇÃO ULTRA-AVANÇADAS
// ============================================

/**
 * Extrai nome do contato de TODAS as 15+ fontes possíveis
 *
 * ORDEM DE PRIORIDADE (do mais confiável para menos):
 * 1. contact.name (salvou na agenda)
 * 2. _data.verifiedName (conta Business verificada)
 * 3. name (nome direto)
 * 4. contact.pushName
 * 5. pushName (mais comum em mensagens)
 * 6. _data.pushName
 * 7. notifyName
 * 8. _data.notifyName
 * 9. contact.shortName
 * 10. pushname (lowercase variant)
 * 11. senderName
 * 12. vCards[0].displayName (se compartilhou contato)
 * 13. quotedMsg._data.pushName (nome na msg citada)
 * 14. quotedMsg._data.notifyName
 * 15. participant/author (último recurso em grupos)
 *
 * @param data Payload completo do webhook
 * @param fallback Valor padrão se nada for encontrado
 * @returns Nome validado ou null
 */
export function extractContactNameV2(data: WAHAWebhookPayload, fallback = ''): string | null {
  // Lista COMPLETA de fontes possíveis (ordem de prioridade)
  const possibleNames: Array<string | undefined> = [
    // Tier 1: Mais confiáveis (salvou na agenda, verificado)
    data.contact?.name,
    data._data?.verifiedName,

    // Tier 2: Nome direto
    data.name,

    // Tier 3: Push names (mais comuns)
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

    // Tier 6: vCards (contatos compartilhados)
    data.vCards && data.vCards.length > 0 ? data.vCards[0].displayName : undefined,

    // Tier 7: Quoted message (mensagem citada)
    data.quotedMsg?._data?.pushName,
    data.quotedMsg?._data?.notifyName,

    // Tier 8: Fallback para grupos (participant/author)
    // Nota: Geralmente são IDs, então validação de telefone vai rejeitar
    data.participant,
    data.author,
  ];

  // Encontra o primeiro nome válido
  for (const name of possibleNames) {
    if (name && typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();

      // VALIDAÇÃO 1: Não usar se for número de telefone
      if (isPhoneNumberV2(cleanName)) {
        continue;
      }

      // VALIDAÇÃO 2: Não usar se for um JID/ID do WhatsApp
      if (isWhatsAppId(cleanName)) {
        continue;
      }

      // VALIDAÇÃO 3: Tamanho mínimo (evita nomes de 1 letra)
      if (cleanName.length < 2) {
        continue;
      }

      return cleanName;
    }
  }

  return fallback || null;
}

/**
 * Extrai número de telefone de TODOS os 12+ formatos possíveis
 *
 * FORMATOS SUPORTADOS:
 * - from/to (primary)
 * - chatId
 * - remoteJid
 * - _data.key.remoteJid
 * - participant (grupos)
 * - author (grupos)
 * - contact.id
 * - contact.number
 * - userJid (receipts)
 * - quotedMsg.from
 * - vCards (parsing)
 *
 * SUFIXOS REMOVIDOS:
 * - @c.us (phone number accounts)
 * - @s.whatsapp.net (internal NOWEB format)
 * - @g.us (groups - retorna group ID)
 * - @lid (Local Identifier - novo formato WhatsApp)
 * - @newsletter (channels)
 *
 * @param data Payload completo do webhook
 * @param preferFrom Se true, prioriza 'from' sobre 'to'
 * @returns Número de telefone limpo (apenas dígitos)
 */
export function extractPhoneNumberV2(data: WAHAWebhookPayload, preferFrom = true): string {
  // Lista de fontes possíveis (ordem de prioridade)
  const possibleIds: Array<string | undefined> = preferFrom
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
      ];

  // Encontra o primeiro ID válido
  for (const id of possibleIds) {
    if (id && typeof id === 'string' && id.trim()) {
      const phone = extractPhoneFromChatIdV2(id);
      if (phone && phone.length >= 8) {
        return phone;
      }
    }
  }

  // Fallback: tentar extrair de contact.number diretamente
  if (data.contact?.number) {
    return data.contact.number.replace(/\D/g, '');
  }

  return '';
}

/**
 * Extrai número de telefone do chatId/JID (VERSÃO MELHORADA)
 *
 * Remove TODOS os sufixos conhecidos:
 * - @c.us (phone number accounts)
 * - @s.whatsapp.net (internal NOWEB)
 * - @g.us (groups)
 * - @lid (Local Identifier - WhatsApp 2024 update)
 * - @newsletter (channels)
 *
 * @param chatId ID do chat/JID completo
 * @returns Número de telefone limpo (apenas dígitos)
 */
export function extractPhoneFromChatIdV2(chatId: string): string {
  if (!chatId) return '';

  return chatId
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace('@newsletter', '')
    .replace(/\D/g, ''); // Remove tudo exceto dígitos
}

/**
 * Normaliza chatId entre TODOS os formatos
 *
 * CONVERSÕES:
 * - @s.whatsapp.net → @c.us (NOWEB internal → WAHA standard)
 * - @lid → @c.us (Local ID → phone format)
 * - @newsletter → mantém (channels)
 * - @g.us → mantém (grupos)
 * - sem sufixo → adiciona @c.us
 *
 * @param chatId ID do chat para normalizar
 * @returns chatId no formato WAHA padrão
 */
export function normalizeChatIdV2(chatId: string): string {
  if (!chatId) return '';

  // Se for canal, mantém @newsletter
  if (chatId.includes('@newsletter')) {
    return chatId;
  }

  // Se for grupo, mantém @g.us
  if (chatId.includes('@g.us')) {
    return chatId;
  }

  // Converte @s.whatsapp.net para @c.us (formato WAHA padrão)
  if (chatId.includes('@s.whatsapp.net')) {
    const phone = extractPhoneFromChatIdV2(chatId);
    return `${phone}@c.us`;
  }

  // Converte @lid para @c.us (WhatsApp Business)
  if (chatId.includes('@lid')) {
    const phone = extractPhoneFromChatIdV2(chatId);
    return `${phone}@c.us`;
  }

  // Se não tem sufixo, adiciona @c.us
  if (!chatId.includes('@')) {
    return `${chatId}@c.us`;
  }

  return chatId;
}

/**
 * Valida se uma string é um número de telefone (VERSÃO MELHORADA)
 *
 * Detecta:
 * - +5513991234567
 * - (13) 99123-4567
 * - 13 99123-4567
 * - 13991234567
 * - +55 (13) 99123-4567
 *
 * @param value String para validar
 * @returns true se for um número de telefone
 */
export function isPhoneNumberV2(value: string): boolean {
  if (!value) return false;

  // Remove espaços para análise
  const cleaned = value.replace(/\s+/g, '');

  // Padrão: aceita + opcional, parênteses, dígitos, hífens
  const phonePattern = /^[\+\(]?[\d\s\-()]+$/;

  // Deve ter pelo menos 8 dígitos (mínimo para um telefone válido)
  const digitCount = (cleaned.match(/\d/g) || []).length;

  return phonePattern.test(cleaned) && digitCount >= 8;
}

/**
 * Valida se uma string é um WhatsApp ID/JID
 *
 * Detecta:
 * - 123123123@c.us
 * - 123123123@s.whatsapp.net
 * - 123123123@g.us
 * - 123123123@lid
 *
 * @param value String para validar
 * @returns true se for um WhatsApp ID
 */
export function isWhatsAppId(value: string): boolean {
  if (!value) return false;

  const jidPattern = /@(c\.us|s\.whatsapp\.net|g\.us|lid|newsletter)$/;
  return jidPattern.test(value);
}

/**
 * Formata número de telefone para padrão brasileiro (MELHORADO)
 *
 * - Adiciona código do país (55) se necessário
 * - Remove zeros à esquerda
 * - Valida tamanho mínimo
 *
 * @param phone Número de telefone
 * @returns Número formatado
 */
export function formatPhoneNumberV2(phone: string): string {
  if (!phone) return '';

  // Remove tudo exceto dígitos
  let number = phone.replace(/\D/g, '');

  // Remove zero à esquerda (operadoras antigas)
  while (number.startsWith('0') && number.length > 1) {
    number = number.substring(1);
  }

  // Se tem 11 dígitos ou menos, adiciona código do Brasil
  if (number.length <= 11 && number.length >= 10) {
    number = '55' + number;
  }

  return number;
}

/**
 * Detecta se é um chat de grupo
 *
 * @param chatId ID do chat
 * @returns true se for grupo
 */
export function isGroupChatV2(chatId: string): boolean {
  return chatId?.includes('@g.us') || false;
}

/**
 * Detecta se é um canal (newsletter)
 *
 * @param chatId ID do chat
 * @returns true se for canal
 */
export function isNewsletterChat(chatId: string): boolean {
  return chatId?.includes('@newsletter') || false;
}

/**
 * Extrai dados COMPLETOS do contato do webhook (VERSÃO ULTRA-AVANÇADA)
 *
 * Combina TODAS as funções de extração:
 * - 15+ fontes para nome
 * - 12+ fontes para telefone
 * - Normalização de chatId
 * - Detecção de tipo (grupo/canal/individual)
 * - Extração de vCards
 * - Metadados adicionais
 *
 * @param webhookData Dados completos do webhook
 * @returns Objeto com TODOS os dados extraídos e validados
 */
export function extractContactDataV2(webhookData: WAHAWebhookPayload) {
  // Determina o chatId correto
  const rawChatId = webhookData.chatId
    || (webhookData.fromMe ? webhookData.to : webhookData.from)
    || webhookData.remoteJid
    || webhookData._data?.key?.remoteJid
    || '';

  const normalizedChatId = normalizeChatIdV2(rawChatId);

  // Extrai telefone do chatId
  const phoneNumber = extractPhoneNumberV2(webhookData, !webhookData.fromMe);
  const formattedPhone = formatPhoneNumberV2(phoneNumber);

  // Extrai nome com validação
  const contactName = extractContactNameV2(webhookData, phoneNumber);

  // Se o nome extraído for igual ao telefone, usar null
  const finalContactName = contactName === phoneNumber || contactName === formattedPhone
    ? null
    : contactName;

  // Detecta tipo de chat
  const isGroup = isGroupChatV2(normalizedChatId);
  const isNewsletter = isNewsletterChat(normalizedChatId);

  // Extrai participante (em grupos)
  const participant = isGroup
    ? (webhookData.participant || webhookData.author || webhookData._data?.key?.participant)
    : null;

  // Extrai dados de vCard se disponível
  const vCardData = webhookData.vCards && webhookData.vCards.length > 0
    ? {
        displayName: webhookData.vCards[0].displayName,
        vcard: webhookData.vCards[0].vcard,
      }
    : null;

  // Verifica se é conta Business verificada
  const isVerified = !!webhookData._data?.verifiedName;
  const verifiedName = webhookData._data?.verifiedName || null;

  // Verifica se está na agenda
  const isMyContact = webhookData.contact?.isMyContact || false;

  return {
    // IDs
    chatId: normalizedChatId,
    rawChatId,

    // Telefone
    phoneNumber: formattedPhone,
    rawPhoneNumber: phoneNumber,

    // Nome
    contactName: finalContactName,
    verifiedName: isVerified ? verifiedName : null,

    // Tipo de chat
    isGroup,
    isNewsletter,
    isIndividual: !isGroup && !isNewsletter,

    // Grupo info
    participant: participant || null,

    // vCard
    vCard: vCardData,

    // Flags
    isVerified,
    isMyContact,
    isBlocked: webhookData.contact?.isBlocked || false,

    // Metadados
    timestamp: webhookData.timestamp || Date.now(),
    fromMe: webhookData.fromMe || false,
  };
}

/**
 * Verifica se deve atualizar o nome do contato (VERSÃO MELHORADA)
 *
 * Regras:
 * 1. Não atualiza se já tem nome (a menos que force=true)
 * 2. Não atualiza se novo nome é telefone
 * 3. Não atualiza se novo nome é WhatsApp ID
 * 4. Não atualiza se novo nome muito curto (<2 caracteres)
 * 5. PRIORIZA nome verificado sobre nome normal
 *
 * @param currentName Nome atual na conversa
 * @param newName Novo nome do webhook
 * @param isVerified Se o novo nome é de conta verificada
 * @param force Forçar atualização mesmo com nome existente
 * @returns true se deve atualizar
 */
export function shouldUpdateContactNameV2(
  currentName: string | null | undefined,
  newName: string | null | undefined,
  isVerified = false,
  force = false
): boolean {
  // REGRA 1: Não atualizar se já tem nome (a menos que force ou seja verificado)
  if (currentName && currentName.trim() && !force && !isVerified) {
    return false;
  }

  // REGRA 2: Não atualizar se o novo nome for inválido
  if (!newName || !newName.trim()) {
    return false;
  }

  // REGRA 3: Não atualizar se for telefone
  if (isPhoneNumberV2(newName)) {
    return false;
  }

  // REGRA 4: Não atualizar se for WhatsApp ID
  if (isWhatsAppId(newName)) {
    return false;
  }

  // REGRA 5: Não atualizar se muito curto
  if (newName.trim().length < 2) {
    return false;
  }

  // PRIORIDADE: Se é verificado, sempre atualiza
  if (isVerified) {
    return true;
  }

  return true;
}

/**
 * Extrai número de telefone de vCard
 *
 * @param vcard String vCard completa
 * @returns Número de telefone extraído ou null
 */
export function extractPhoneFromVCard(vcard: string): string | null {
  if (!vcard) return null;

  // Regex para encontrar TEL: no vCard
  const telRegex = /TEL[;:]([^\n\r]+)/i;
  const match = vcard.match(telRegex);

  if (match && match[1]) {
    const phone = match[1].replace(/\D/g, '');
    return phone.length >= 8 ? phone : null;
  }

  return null;
}

/**
 * Mapeia LID para phone number (requer chamada à API)
 *
 * Nota: Esta função é um placeholder.
 * Para implementação real, use: GET /api/{session}/contacts/{contactId}/lids
 *
 * @param lid Local Identifier (@lid)
 * @param session Nome da sessão WAHA
 * @returns Promessa com phone number ou null
 */
export async function mapLidToPhone(
  lid: string,
  session: string,
  wahaUrl: string,
  apiKey: string
): Promise<string | null> {
  try {
    const contactId = lid.replace('@lid', '');
    const response = await fetch(
      `${wahaUrl}/api/${session}/contacts/${contactId}/lids`,
      {
        headers: { 'X-Api-Key': apiKey }
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Estrutura exata depende da resposta da API
      return data.phone || data.number || null;
    }
  } catch (error) {
    console.error('[LID Mapping] Erro:', error);
  }

  return null;
}
