/**
 * Formata número de telefone brasileiro
 * Baseado no guiadepraiagrande
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove tudo que não é dígito e remove sufixos como @c.us, @lid, @g.us
  const num = phone.replace(/\D/g, '').replace(/@.*/, '');

  // Formato: (DD) 9XXXX-XXXX - Celular com 9 dígitos (13 dígitos total com DDI 55)
  if (num.length === 13 && num.startsWith('55')) {
    return `(${num.substr(2, 2)}) ${num.substr(4, 5)}-${num.substr(9)}`;
  }

  // Formato: (DD) XXXX-XXXX - Fixo com 8 dígitos (12 dígitos total com DDI 55)
  if (num.length === 12 && num.startsWith('55')) {
    return `(${num.substr(2, 2)}) ${num.substr(4, 4)}-${num.substr(8)}`;
  }

  // Formato internacional ou número sem DDI brasileiro
  return num;
}

/**
 * Extrai nome do contato do chat_id ou retorna telefone formatado
 */
export function getContactName(chatId: string, contactName?: string | null): string {
  if (contactName && contactName.trim()) {
    return contactName;
  }

  // Se não tem nome, formata o telefone
  return formatPhone(chatId);
}

/**
 * Extrai número limpo do chat_id (sem @c.us, @lid, @g.us)
 */
export function extractPhoneNumber(chatId: string): string {
  if (!chatId) return '';
  return chatId.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
}
