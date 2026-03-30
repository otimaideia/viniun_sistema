/**
 * Utilities para extração avançada de dados de contatos do WhatsApp
 * Baseado na lógica do guiadepraiagrande com melhorias para TypeScript
 */

/**
 * Interface para dados do payload do webhook
 */
interface WebhookPayload {
  notifyName?: string;
  pushName?: string;
  pushname?: string;
  name?: string;
  contact?: {
    name?: string;
    pushName?: string;
  };
  _data?: {
    pushName?: string;
    notifyName?: string;
  };
}

/**
 * Extrai o nome do contato de múltiplas fontes do webhook
 * Prioridade: name > pushName > notifyName > contact.name > contact.pushName
 *
 * @param data - Dados do webhook
 * @param fallback - Valor padrão se nenhum nome for encontrado
 * @returns Nome do contato ou fallback
 */
export function extractContactName(data: WebhookPayload, fallback = ''): string | null {
  // Tenta extrair de múltiplas fontes com ordem de prioridade
  // pushName/notifyName vem primeiro pois data.name pode ser o nome do business/sessão
  const possibleNames = [
    data.pushName,
    data.pushname,
    data.notifyName,
    data._data?.pushName,
    data._data?.notifyName,
    data.contact?.pushName,
    data.contact?.name,
    data.name,
  ];

  // Encontra o primeiro nome válido
  for (const name of possibleNames) {
    if (name && typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();

      // Validação: não usar se for um número de telefone
      if (isPhoneNumber(cleanName)) {
        continue; // Pula este e tenta o próximo
      }

      return cleanName;
    }
  }

  return fallback || null;
}

/**
 * Valida se uma string é um número de telefone
 * Detecta padrões como: +5513991234567, (13) 99123-4567, 13991234567, etc.
 *
 * @param value - String para validar
 * @returns true se for um número de telefone
 */
export function isPhoneNumber(value: string): boolean {
  if (!value) return false;

  // Remove espaços para análise
  const cleaned = value.replace(/\s+/g, '');

  // Padrão: aceita + opcional, parênteses, dígitos, hífens
  // Exemplos: +5513991234567, (13) 99123-4567, 13 99123-4567, (13)99123-4567
  const phonePattern = /^[\+\(]?[\d\s\-()]+$/;

  // Deve ter pelo menos 8 dígitos (mínimo para um telefone válido)
  const digitCount = (cleaned.match(/\d/g) || []).length;

  return phonePattern.test(cleaned) && digitCount >= 8;
}

/**
 * Extrai número de telefone do chatId
 * Remove sufixos @c.us, @s.whatsapp.net, @g.us
 *
 * @param chatId - ID do chat (ex: 5513991234567@c.us)
 * @returns Número de telefone limpo
 */
export function extractPhoneFromChatId(chatId: string): string {
  if (!chatId) return '';

  return chatId
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '')
    .replace(/\D/g, ''); // Remove tudo exceto dígitos
}

/**
 * Normaliza chatId entre diferentes formatos
 * Converte Evolution API (@s.whatsapp.net) para WAHA (@c.us)
 *
 * @param chatId - ID do chat para normalizar
 * @returns chatId no formato WAHA padrão
 */
export function normalizeChatId(chatId: string): string {
  if (!chatId) return '';

  // Se for grupo, mantém @g.us
  if (chatId.includes('@g.us')) {
    return chatId;
  }

  // Converte @s.whatsapp.net para @c.us (formato WAHA padrão)
  if (chatId.includes('@s.whatsapp.net')) {
    const phone = extractPhoneFromChatId(chatId);
    return `${phone}@c.us`;
  }

  // Converte @lid para @c.us (WhatsApp Business)
  if (chatId.includes('@lid')) {
    const phone = extractPhoneFromChatId(chatId);
    return `${phone}@c.us`;
  }

  // Se não tem sufixo, adiciona @c.us
  if (!chatId.includes('@')) {
    return `${chatId}@c.us`;
  }

  return chatId;
}

/**
 * Formata número de telefone para padrão brasileiro
 * Adiciona código do país (55) se necessário
 * Remove zeros à esquerda
 *
 * @param phone - Número de telefone
 * @returns Número formatado
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove tudo exceto dígitos
  let number = phone.replace(/\D/g, '');

  // Remove zero à esquerda (operadoras antigas)
  if (number.startsWith('0')) {
    number = number.substring(1);
  }

  // Se tem 11 dígitos ou menos, adiciona código do Brasil
  if (number.length <= 11) {
    number = '55' + number;
  }

  return number;
}

/**
 * Detecta se é um chat de grupo
 *
 * @param chatId - ID do chat
 * @returns true se for grupo
 */
export function isGroupChat(chatId: string): boolean {
  return chatId.includes('@g.us');
}

/**
 * Extrai dados completos do contato do webhook
 * Função principal que combina todas as extrações
 *
 * @param webhookData - Dados completos do webhook
 * @returns Objeto com nome e telefone extraídos
 */
export function extractContactData(webhookData: {
  from?: string;
  to?: string;
  chatId?: string;
  fromMe?: boolean;
  payload?: WebhookPayload;
}) {
  const { from, to, chatId, fromMe, payload = {} } = webhookData;

  // Determina o chatId correto
  const finalChatId = chatId || (fromMe ? to : from) || '';
  const normalizedChatId = normalizeChatId(finalChatId);

  // Extrai telefone do chatId
  const phoneNumber = extractPhoneFromChatId(normalizedChatId);
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Extrai nome com validação
  const contactName = extractContactName(payload, phoneNumber);

  // Se o nome extraído for igual ao telefone, usar null
  const finalContactName = contactName === phoneNumber || contactName === formattedPhone
    ? null
    : contactName;

  return {
    chatId: normalizedChatId,
    phoneNumber: formattedPhone,
    contactName: finalContactName,
    isGroup: isGroupChat(normalizedChatId),
  };
}

/**
 * Verifica se deve atualizar o nome do contato
 * Só atualiza se:
 * - O nome atual está vazio/null
 * - E o novo nome é válido (não é telefone)
 *
 * @param currentName - Nome atual na conversa
 * @param newName - Novo nome do webhook
 * @returns true se deve atualizar
 */
export function shouldUpdateContactName(
  currentName: string | null | undefined,
  newName: string | null | undefined
): boolean {
  // Não atualizar se já tem nome
  if (currentName && currentName.trim()) {
    return false;
  }

  // Não atualizar se o novo nome for inválido
  if (!newName || !newName.trim() || isPhoneNumber(newName)) {
    return false;
  }

  return true;
}
