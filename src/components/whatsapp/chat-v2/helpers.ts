import React from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Sanitizes a string by removing lone UTF-16 surrogates.
 * Lone surrogates break JSON serialization (RFC 8259) and cause errors
 * in tools that capture DOM text (e.g. Playwright snapshots → API calls).
 * WhatsApp data (contact names, messages) frequently contains these.
 */
export function safeText(text: string | null | undefined): string {
  if (!text) return "";
  // Fast-path: if the string is well-formed, return as-is
  if (typeof (text as any).isWellFormed === "function" && (text as any).isWellFormed()) {
    return text;
  }
  // Character-level surrogate removal
  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          result.push(text[i], text[i + 1]);
          i++;
          continue;
        }
      }
      continue; // lone high surrogate
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue; // lone low surrogate
    result.push(text[i]);
  }
  return result.join("");
}

/**
 * Gets initials from a name (up to 2 characters).
 * Returns "?" if name is null/empty.
 */
export const getInitials = (name: string | null): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => Array.from(n)[0] || "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

/**
 * Formats a Brazilian phone number.
 * Example: 5513992004440 -> (13) 99200-4440
 */
export const formatPhone = (phone: string | null): string | null => {
  if (!phone) return null;

  // Remove non-numeric characters
  const digits = phone.replace(/\D/g, "");

  // Remove country code 55 if present
  let numero = digits;
  if (numero.length === 13 && numero.startsWith("55")) {
    numero = numero.slice(2);
  } else if (numero.length === 12 && numero.startsWith("55")) {
    numero = numero.slice(2);
  }

  // Format (XX) XXXXX-XXXX for mobile (11 digits)
  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  }

  // Format (XX) XXXX-XXXX for landline (10 digits)
  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  }

  // Return original if cannot format
  return phone;
};

/**
 * Formats timestamp for the conversation list.
 * Today: HH:mm | Yesterday: "Ontem" | Older: dd/MM/yyyy
 */
export const formatConversationTime = (timestamp: string | null): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, "HH:mm");
  }
  if (isYesterday(date)) {
    return "Ontem";
  }
  return format(date, "dd/MM/yyyy");
};

/**
 * Formats timestamp for a message bubble.
 * Always returns HH:mm.
 */
export const formatMessageTime = (timestamp: string): string => {
  return format(new Date(timestamp), "HH:mm");
};

/**
 * Formats timestamp for date separators between message groups.
 * Today: "Hoje" | Yesterday: "Ontem" | Older: "dd de MMMM de yyyy"
 */
export const formatDateSeparator = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

/**
 * Calculates waiting time since last customer message.
 * Returns formatted string like "5min", "2h 30min", "1d 3h"
 * and urgency level for visual indicator.
 */
export function getWaitingTime(lastCustomerMessageAt: string | null | undefined): {
  text: string;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  minutes: number;
} | null {
  if (!lastCustomerMessageAt) return null;

  const now = Date.now();
  const lastMsg = new Date(lastCustomerMessageAt).getTime();
  const diffMs = now - lastMsg;

  if (diffMs < 0 || diffMs < 60000) return null; // Menos de 1 minuto

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let text: string;
  if (days > 0) {
    text = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else if (hours > 0) {
    text = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  } else {
    text = `${minutes}min`;
  }

  // Urgência baseada no tempo de espera
  let urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  if (totalMinutes < 5) urgency = 'none';
  else if (totalMinutes < 30) urgency = 'low';       // 5-30min
  else if (totalMinutes < 120) urgency = 'medium';    // 30min-2h
  else if (totalMinutes < 480) urgency = 'high';      // 2h-8h
  else urgency = 'critical';                           // 8h+

  return { text, urgency, minutes: totalMinutes };
}

/**
 * Returns CSS color classes based on urgency level.
 */
export function getUrgencyColors(urgency: string): { bg: string; text: string; border: string } {
  switch (urgency) {
    case 'low': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    case 'medium': return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' };
    case 'high': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'critical': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };
  }
}

/**
 * Regex para detectar numeros de telefone em texto.
 * Aceita formatos: +55 13 99188-1234, (13) 99188-1234, 13991881234, +5513991881234, etc.
 */
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;

/**
 * Extrai apenas digitos de um telefone e valida se tem entre 10-15 digitos.
 */
function extractCleanPhone(match: string): string | null {
  const digits = match.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/**
 * Transforma texto em array de ReactNode com telefones como links clicaveis.
 * Telefones detectados ficam azuis e ao clicar chamam onPhoneClick.
 */
export function linkifyContent(
  text: string,
  onPhoneClick?: (phone: string) => void
): React.ReactNode[] {
  if (!text || !onPhoneClick) return [text];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  // Reset regex
  PHONE_REGEX.lastIndex = 0;

  while ((match = PHONE_REGEX.exec(text)) !== null) {
    const cleanPhone = extractCleanPhone(match[0]);
    if (!cleanPhone) continue;

    // Texto antes do match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Link do telefone
    parts.push(
      React.createElement(
        'span',
        {
          key: `phone-${keyIdx++}`,
          className: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onPhoneClick(cleanPhone);
          },
          title: `Iniciar conversa com ${match[0]}`,
        },
        match[0]
      )
    );

    lastIndex = match.index + match[0].length;
  }

  // Texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
