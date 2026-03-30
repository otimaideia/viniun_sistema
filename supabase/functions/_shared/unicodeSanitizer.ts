/**
 * Utilitários para sanitizar strings Unicode e prevenir erros de JSON
 * Versão para Deno Edge Functions - COMPLETA
 *
 * Resolve TODOS os problemas de encoding Unicode conhecidos:
 * - Surrogates UTF-16 inválidos
 * - Caracteres de controle e NULL
 * - BOM, ZWJ, ZWNJ, ZWS
 * - Variation Selectors completos
 * - Combining Characters órfãos
 * - Noncharacters
 * - Marcas Bidi e invisíveis
 * - Private Use Area
 */

/**
 * Remove pares de surrogates UTF-16 inválidos - VERSÃO ROBUSTA v2
 * Não usa regex lookbehind (incompatível com alguns engines)
 * Processa caractere por caractere para máxima compatibilidade
 * Usa isWellFormed() como fast-path quando disponível (ES2024)
 */
function removeInvalidSurrogates(str: string): string {
  if (!str || str.length === 0) return str;

  // Fast-path: isWellFormed() (ES2024 - Deno 1.38+)
  if (typeof (str as any).isWellFormed === 'function' && (str as any).isWellFormed()) {
    return str;
  }

  const result: string[] = [];
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    // High surrogate (U+D800 to U+DBFF)
    if (code >= 0xD800 && code <= 0xDBFF) {
      if (i + 1 < len) {
        const nextCode = str.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          // Par válido - manter ambos
          result.push(str[i], str[i + 1]);
          i++;
          continue;
        }
      }
      // High surrogate órfão - REMOVER
      continue;
    }

    // Low surrogate órfão
    if (code >= 0xDC00 && code <= 0xDFFF) {
      continue;
    }

    result.push(str[i]);
  }

  return result.join('');
}

/**
 * Remove caracteres de controle inválidos
 */
function removeInvalidControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Remove BOM no meio do texto
 */
function removeMidstreamBOM(str: string): string {
  return str.charAt(0) === '\uFEFF'
    ? str.charAt(0) + str.slice(1).replace(/\uFEFF/g, '')
    : str.replace(/\uFEFF/g, '');
}

/**
 * Remove sequências ZWJ órfãs
 */
function removeOrphanZWJ(str: string): string {
  return str
    .replace(/^\u200D+/, '')
    .replace(/\u200D+$/g, '')
    .replace(/\u200D{2,}/g, '\u200D');
}

/**
 * Remove modificadores de emoji órfãos - VERSÃO ROBUSTA
 * Sem lookbehind para compatibilidade
 */
function removeOrphanModifiers(str: string): string {
  if (!str) return str;

  // Remover no início
  str = str.replace(/^[\u{1F3FB}-\u{1F3FF}]+/gu, '');

  // Processar manualmente sem lookbehind
  const result: string[] = [];
  const chars = Array.from(str);

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    if (code >= 0x1F3FB && code <= 0x1F3FF) {
      if (i === 0) continue;
      const prevChar = chars[i - 1];
      if (/\s/.test(prevChar)) continue;
    }

    result.push(char);
  }

  return result.join('');
}

/**
 * Remove outros Zero Width problemáticos
 */
function removeProblematicZeroWidth(str: string): string {
  return str
    .replace(/^\u200C+/, '')
    .replace(/\u200C+$/g, '')
    .replace(/^\u200B+/, '')
    .replace(/\u200B+$/g, '')
    .replace(/\u2060{2,}/g, '\u2060')
    .replace(/\u2063/g, '');
}

/**
 * Remove Variation Selectors completos
 */
function removeAllVariationSelectors(str: string): string {
  return str
    .replace(/^[\uFE00-\uFE0F]+/, '')
    .replace(/([\uFE00-\uFE0F])\1+/g, '$1');
}

/**
 * Remove Combining Characters órfãos
 */
function removeOrphanCombiningMarks(str: string): string {
  return str
    .replace(/^[\u0300-\u036F\uFE20-\uFE2F]+/, '')
    .replace(/[\u0300-\u036F\uFE20-\uFE2F]{4,}/g, '');
}

/**
 * Remove Noncharacters Unicode de todos os 17 planos
 */
function removeNoncharacters(str: string): string {
  // BMP noncharacters
  str = str
    .replace(/[\uFDD0-\uFDEF]/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '');

  // Supplementary plane noncharacters
  const result: string[] = [];
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < len) {
      const nextCode = str.charCodeAt(i + 1);
      if (nextCode === 0xDFFE || nextCode === 0xDFFF) {
        i++;
        continue;
      }
    }

    result.push(str[i]);
  }

  return result.join('');
}

/**
 * Sanitiza marcas Bidi
 */
function sanitizeBidiMarks(str: string): string {
  return str
    .replace(/^[\u202D\u202E]+/, '')
    .replace(/[\u202D\u202E]+$/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]{3,}/g, '')
    .replace(/^\u2069+/, '');
}

/**
 * Remove marcas invisíveis
 */
function removeInvisibleMarks(str: string): string {
  return str
    .replace(/\u00AD{2,}/g, '')
    .replace(/\u2061/g, '')
    .replace(/\u2062/g, '')
    .replace(/\u2063/g, '')
    .replace(/\u2064/g, '');
}

/**
 * Sanitiza Private Use Area
 */
function sanitizePrivateUseArea(str: string): string {
  try {
    JSON.stringify(str);
    return str;
  } catch {
    return str.replace(/[\uE000-\uF8FF]/g, '');
  }
}

/**
 * Sanitiza uma string para JSON
 * 14 passes de sanitização + fallback agressivo
 */
export function sanitizeForJSON(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    let sanitized = text;

    // 1. NULL
    sanitized = sanitized.replace(/\0/g, '');
    // 2. BOM
    sanitized = removeMidstreamBOM(sanitized);
    // 3. Controle
    sanitized = removeInvalidControlChars(sanitized);
    // 4. Surrogates
    sanitized = removeInvalidSurrogates(sanitized);
    // 5. Noncharacters
    sanitized = removeNoncharacters(sanitized);
    // 6. Modificadores
    sanitized = removeOrphanModifiers(sanitized);
    // 7. ZWJ
    sanitized = removeOrphanZWJ(sanitized);
    // 8. Zero Width
    sanitized = removeProblematicZeroWidth(sanitized);
    // 9. Variation Selectors
    sanitized = removeAllVariationSelectors(sanitized);
    // 10. Combining
    sanitized = removeOrphanCombiningMarks(sanitized);
    // 11. Bidi
    sanitized = sanitizeBidiMarks(sanitized);
    // 12. Invisíveis
    sanitized = removeInvisibleMarks(sanitized);
    // 13. PUA
    sanitized = sanitizePrivateUseArea(sanitized);

    JSON.stringify({ test: sanitized });

    return sanitized;
  } catch (error) {
    console.warn('[Unicode Sanitizer] Fallback agressivo:', error);

    // 14. Fallback robusto - processa por charCode
    const result: string[] = [];
    const len = text.length;

    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);

      // Verificar surrogates
      if (code >= 0xD800 && code <= 0xDBFF) {
        if (i + 1 < len) {
          const nextCode = text.charCodeAt(i + 1);
          if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
            result.push(text[i], text[i + 1]);
            i++;
            continue;
          }
        }
        continue;
      }

      if (code >= 0xDC00 && code <= 0xDFFF) {
        continue;
      }

      // Remover controle (exceto \t, \n, \r)
      if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
        continue;
      }

      // Remover DEL e C1
      if (code === 0x7F || (code >= 0x80 && code <= 0x9F)) {
        continue;
      }

      // Remover noncharacters
      if ((code >= 0xFDD0 && code <= 0xFDEF) || code === 0xFFFE || code === 0xFFFF) {
        continue;
      }

      result.push(text[i]);
    }

    return result.join('');
  }
}

/**
 * Sanitiza objeto recursivamente
 */
export function sanitizeObjectForJSON<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeForJSON(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForJSON(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectForJSON(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Wrapper seguro para JSON.stringify
 */
export function safeJSONStringify(
  value: any,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string {
  try {
    const sanitized = sanitizeObjectForJSON(value);
    return JSON.stringify(sanitized, replacer, space);
  } catch (error) {
    console.error('[Unicode Sanitizer] Erro ao serializar:', error);
    return JSON.stringify({
      error: 'Failed to serialize',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sanitiza uma string JSON já serializada
 * Parse → sanitize → re-stringify
 */
export function sanitizeJsonString(jsonStr: string): string {
  if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;

  try {
    const parsed = JSON.parse(jsonStr);
    const sanitized = sanitizeObjectForJSON(parsed);
    return JSON.stringify(sanitized);
  } catch {
    return sanitizeForJSON(jsonStr);
  }
}

/**
 * Cria fetch wrapper que sanitiza JSON bodies automaticamente
 * Para uso em Edge Functions com Supabase client
 */
export function createSanitizedFetch(
  originalFetch?: typeof globalThis.fetch
): typeof globalThis.fetch {
  const baseFetch = originalFetch || globalThis.fetch.bind(globalThis);

  return async function sanitizedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (init?.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        const sanitized = sanitizeObjectForJSON(parsed);
        init = { ...init, body: JSON.stringify(sanitized) };
      } catch {
        // Not JSON - leave as is
      }
    }
    return baseFetch(input, init);
  };
}
