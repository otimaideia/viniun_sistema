/**
 * Utilitários para validação e formatação de telefone
 * Suporte a telefones internacionais
 */

import {
  COUNTRIES,
  getCountryByCode,
  formatPhoneByCountry,
  cleanPhoneNumber,
  validatePhoneByCountry,
  formatPhoneForWhatsApp as formatPhoneForWhatsAppIntl,
  formatPhoneInternational,
  type Country,
} from '@/components/ui/phone-input-international';

// Re-exportar tipos e funções do componente
export type { Country };
export {
  COUNTRIES,
  getCountryByCode,
  formatPhoneByCountry,
  validatePhoneByCountry,
  formatPhoneInternational,
};

/**
 * Remove caracteres não numéricos do telefone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Alias para compatibilidade
export { cleanPhoneNumber };

/**
 * Formata o telefone no padrão brasileiro (default)
 * Para outros países, use formatPhoneByCountry(phone, countryCode)
 * (11) 99999-9999 ou (11) 9999-9999
 */
export function formatPhone(phone: string, countryCode: string = '55'): string {
  return formatPhoneByCountry(phone, countryCode);
}

/**
 * Valida se o telefone é válido
 * @param phone Número do telefone
 * @param countryCode Código do país (default: 55 - Brasil)
 */
export function validatePhone(phone: string, countryCode: string = '55'): boolean {
  return validatePhoneByCountry(phone, countryCode);
}

/**
 * Máscara o telefone para exibição parcial (ex: (11) 9****-1234)
 * Preserva início e fim para identificação
 */
export function maskPhone(phone: string, countryCode: string = '55'): string {
  const cleaned = cleanPhone(phone);

  if (countryCode === '55') {
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.charAt(2)}****-${cleaned.substring(7, 11)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ****-${cleaned.substring(6, 10)}`;
    }
  } else {
    // Para outros países, mascarar o meio
    if (cleaned.length >= 6) {
      const visibleStart = Math.min(3, Math.floor(cleaned.length / 3));
      const visibleEnd = Math.min(4, Math.floor(cleaned.length / 3));
      const start = cleaned.substring(0, visibleStart);
      const end = cleaned.substring(cleaned.length - visibleEnd);
      const masked = '*'.repeat(cleaned.length - visibleStart - visibleEnd);
      return `+${countryCode} ${start}${masked}${end}`;
    }
  }

  return phone;
}

/**
 * Verifica se a string parece ser um telefone
 * @param value String a verificar
 * @param countryCode Código do país (default: 55 - Brasil)
 */
export function isPhoneFormat(value: string, countryCode: string = '55'): boolean {
  const cleaned = cleanPhone(value);
  const country = getCountryByCode(countryCode);
  return cleaned.length >= country.minDigits && cleaned.length <= country.maxDigits;
}

/**
 * Aplica máscara de telefone enquanto o usuário digita
 * @param value Valor atual do input
 * @param countryCode Código do país (default: 55 - Brasil)
 */
export function applyPhoneMask(value: string, countryCode: string = '55'): string {
  return formatPhoneByCountry(value, countryCode);
}

/**
 * Detecta se é CPF ou Telefone baseado no formato (apenas para Brasil)
 */
export function detectInputType(value: string): 'cpf' | 'phone' | 'unknown' {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length === 11) {
    // Pode ser CPF ou celular
    // CPF começa com dígitos de 0-9
    // Celular começa com DDD (11-99) e 9
    const firstTwo = parseInt(cleaned.substring(0, 2));
    const thirdDigit = cleaned.charAt(2);

    // Se o terceiro dígito é 9, provavelmente é celular
    if (thirdDigit === '9' && firstTwo >= 11 && firstTwo <= 99) {
      return 'phone';
    }

    // Caso contrário, assume CPF
    return 'cpf';
  }

  if (cleaned.length === 10) {
    return 'phone';
  }

  return 'unknown';
}

/**
 * Formata telefone para WhatsApp API (WAHA)
 * @param phone Número do telefone
 * @param countryCode Código do país (default: 55 - Brasil)
 * @returns Formato: código_país + número + @c.us
 */
export function formatPhoneForWhatsApp(phone: string, countryCode: string = '55'): string {
  return formatPhoneForWhatsAppIntl(phone, countryCode);
}

/**
 * Formata telefone para exibição com código do país
 * @param phone Número do telefone
 * @param countryCode Código do país (default: 55 - Brasil)
 * @returns Formato: +código (XX) XXXXX-XXXX
 */
export function formatPhoneDisplay(phone: string, countryCode: string = '55'): string {
  return formatPhoneInternational(phone, countryCode);
}

/**
 * Normaliza telefone removendo código do país duplicado
 * Exemplo: 5513974079532 com countryCode='55' → 13974079532
 * @param phone Número do telefone
 * @param countryCode Código do país (default: 55 - Brasil)
 * @returns Telefone sem código do país duplicado
 */
export function normalizePhoneWithoutCountryCode(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');

  // Se o telefone começa com o código do país e tem mais dígitos que o normal
  // (para Brasil: mais de 11 dígitos), remove o código
  if (cleaned.startsWith(countryCode)) {
    const withoutCode = cleaned.substring(countryCode.length);
    const country = getCountryByCode(countryCode);

    // Verificar se o resultado tem tamanho válido para o país
    if (withoutCode.length >= country.minDigits && withoutCode.length <= country.maxDigits) {
      return withoutCode;
    }
  }

  return cleaned;
}

/**
 * Formata telefone para exibição na tabela (sem código internacional)
 * Remove código do país duplicado e formata apenas como (DDD) XXXXX-XXXX
 * @param phone Número do telefone
 * @param countryCode Código do país (default: 55 - Brasil)
 * @returns Formato: (XX) XXXXX-XXXX
 */
export function formatPhoneForTable(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';

  // Normalizar removendo código do país se duplicado
  const normalized = normalizePhoneWithoutCountryCode(phone, countryCode);

  // Formatar de acordo com o país
  return formatPhoneByCountry(normalized, countryCode);
}

/**
 * Extrai código do país e número de um telefone completo
 * @param fullPhone Telefone com código do país (ex: +5511999999999)
 * @returns { countryCode, phone } ou null se inválido
 */
export function parseInternationalPhone(fullPhone: string): { countryCode: string; phone: string } | null {
  const cleaned = cleanPhone(fullPhone);

  if (!cleaned || cleaned.length < 8) return null;

  // Tentar encontrar o país pelo código
  // Ordenar países por comprimento do código (maior primeiro) para evitar conflitos
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

  for (const country of sortedCountries) {
    if (cleaned.startsWith(country.code)) {
      const phone = cleaned.substring(country.code.length);
      if (phone.length >= country.minDigits && phone.length <= country.maxDigits) {
        return {
          countryCode: country.code,
          phone: phone,
        };
      }
    }
  }

  // Se não encontrou, assumir Brasil
  return {
    countryCode: '55',
    phone: cleaned,
  };
}

/**
 * Obtém o código de discagem do país
 * @param countryCode Código do país
 * @returns Código de discagem com + (ex: +55)
 */
export function getDialCode(countryCode: string): string {
  return `+${countryCode}`;
}

/**
 * Obtém informações do país pelo código
 * @param countryCode Código do país
 * @returns Informações do país ou Brasil como padrão
 */
export function getCountryInfo(countryCode: string): Country {
  return getCountryByCode(countryCode);
}

/**
 * Verifica se um número pertence a um país específico
 * @param phone Telefone completo ou parcial
 * @param countryCode Código do país
 */
export function isPhoneFromCountry(phone: string, countryCode: string): boolean {
  const cleaned = cleanPhone(phone);
  return cleaned.startsWith(countryCode);
}

/**
 * Formata telefone removendo o código do país se presente
 * @param phone Telefone que pode conter código do país
 * @param countryCode Código do país a remover
 */
export function removeCountryCode(phone: string, countryCode: string): string {
  const cleaned = cleanPhone(phone);
  if (cleaned.startsWith(countryCode)) {
    return cleaned.substring(countryCode.length);
  }
  return cleaned;
}

/**
 * Lista de códigos de países disponíveis
 */
export function getAvailableCountryCodes(): string[] {
  return COUNTRIES.map((c) => c.code);
}

/**
 * Busca países pelo nome ou código
 * @param query Termo de busca
 */
export function searchCountries(query: string): Country[] {
  const normalizedQuery = query.toLowerCase().trim();
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(normalizedQuery) ||
      c.code.includes(normalizedQuery)
  );
}

// === FUNÇÕES PARA INTEGRAÇÃO WHATSAPP/WAHA ===

/**
 * Extrai telefone de chatId do WhatsApp
 * Suporta: @c.us, @g.us, @lid, @s.whatsapp.net
 * @param chatId ID do chat do WhatsApp
 * @returns Apenas números do telefone
 */
export function extractPhoneFromChatId(chatId: string): string {
  if (!chatId) return '';
  return chatId
    .replace(/@c\.us$/i, '')
    .replace(/@g\.us$/i, '')
    .replace(/@lid$/i, '')
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/\D/g, '');
}

/**
 * Normaliza telefone para busca no banco de dados (apenas números)
 * @param phone Telefone em qualquer formato
 * @returns Apenas números
 */
export function normalizePhoneForSearch(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Verifica se um chatId é de grupo
 * @param chatId ID do chat do WhatsApp
 */
export function isGroupChatId(chatId: string): boolean {
  return chatId?.includes('@g.us') || false;
}

/**
 * Verifica se um chatId é do Meta/Instagram (LID)
 * @param chatId ID do chat do WhatsApp
 */
export function isLidChatId(chatId: string): boolean {
  return chatId?.includes('@lid') || false;
}
