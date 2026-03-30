/**
 * Utilitários para sanitizar strings Unicode e prevenir erros de JSON
 *
 * Resolve múltiplos problemas de encoding Unicode:
 * - Pares de surrogates UTF-16 incompletos (high sem low, low sem high)
 * - Caracteres de controle inválidos
 * - Sequências ZWJ, modificadores de emoji e variação de seleção quebrados
 * - BOM no meio do texto
 * - Caracteres NULL e privativos
 */

/**
 * Remove pares de surrogates UTF-16 inválidos - VERSÃO ROBUSTA v2
 * Não usa regex lookbehind (incompatível com alguns engines)
 * Processa caractere por caractere para máxima compatibilidade
 * Usa isWellFormed() como fast-path quando disponível (ES2024)
 *
 * High surrogates: U+D800 to U+DBFF
 * Low surrogates: U+DC00 to U+DFFF
 */
function removeInvalidSurrogates(str: string): string {
  if (!str || str.length === 0) return str;

  // Fast-path: isWellFormed() (ES2024 - Chrome 111+, Firefox 119+, Node 20+)
  if (typeof (str as any).isWellFormed === 'function' && (str as any).isWellFormed()) {
    return str;
  }

  const result: string[] = [];
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    // High surrogate (U+D800 to U+DBFF)
    if (code >= 0xD800 && code <= 0xDBFF) {
      // Verificar se o próximo caractere é um low surrogate válido
      if (i + 1 < len) {
        const nextCode = str.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          // Par válido - manter ambos
          result.push(str[i], str[i + 1]);
          i++; // Pular o low surrogate já processado
          continue;
        }
      }
      // High surrogate sem low válido - REMOVER (não adicionar ao result)
      continue;
    }

    // Low surrogate órfão (sem high surrogate precedente)
    if (code >= 0xDC00 && code <= 0xDFFF) {
      // Low surrogate sem high - REMOVER (não adicionar ao result)
      // Se fosse parte de um par válido, já teria sido processado acima
      continue;
    }

    // Caractere regular - manter
    result.push(str[i]);
  }

  return result.join('');
}

/**
 * Remove caracteres de controle inválidos para JSON
 * Mantém apenas: \n, \r, \t
 */
function removeInvalidControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Remove BOM (Byte Order Mark) no meio do texto
 * BOM só é válido no início do arquivo
 */
function removeMidstreamBOM(str: string): string {
  // Remove U+FEFF (BOM) exceto se for o primeiro caractere
  return str.charAt(0) === '\uFEFF'
    ? str.charAt(0) + str.slice(1).replace(/\uFEFF/g, '')
    : str.replace(/\uFEFF/g, '');
}

/**
 * Remove sequências ZWJ (Zero Width Joiner) órfãs
 * ZWJ é usado para combinar emojis, mas se estiver sozinho é inválido
 */
function removeOrphanZWJ(str: string): string {
  // Remove ZWJ no início, fim, ou múltiplos consecutivos
  return str
    .replace(/^\u200D+/, '')  // ZWJ no início
    .replace(/\u200D+$/g, '')  // ZWJ no fim
    .replace(/\u200D{2,}/g, '\u200D'); // ZWJ duplicados
}

/**
 * Remove modificadores de emoji órfãos (skin tones, etc)
 * Modificadores: U+1F3FB a U+1F3FF (Fitzpatrick skin tones)
 * Versão sem lookbehind para compatibilidade
 */
function removeOrphanModifiers(str: string): string {
  if (!str) return str;

  // Remover no início
  str = str.replace(/^[\u{1F3FB}-\u{1F3FF}]+/gu, '');

  // Remover após espaços (versão sem lookbehind)
  // Processa manualmente para evitar lookbehind
  const result: string[] = [];
  const chars = Array.from(str); // Usa Array.from para lidar com emojis corretamente

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const code = char.codePointAt(0) || 0;

    // Se é um modificador de skin tone (U+1F3FB a U+1F3FF)
    if (code >= 0x1F3FB && code <= 0x1F3FF) {
      // Verificar se o caractere anterior é um espaço ou início
      if (i === 0) continue; // Órfão no início - já tratado acima, mas por segurança
      const prevChar = chars[i - 1];
      if (/\s/.test(prevChar)) {
        // Após espaço - órfão, remover
        continue;
      }
    }

    result.push(char);
  }

  return result.join('');
}

/**
 * Remove caracteres de variação de seleção órfãos
 * VS15 (U+FE0E) = texto, VS16 (U+FE0F) = emoji
 */
function removeOrphanVariationSelectors(str: string): string {
  // Remove variação de seleção no início ou múltiplos consecutivos
  return str
    .replace(/^[\uFE0E\uFE0F]+/, '')
    .replace(/[\uFE0E\uFE0F]{2,}/g, '\uFE0F'); // Preferir emoji style
}

/**
 * Remove caracteres privativos não-standard (PUA - Private Use Area)
 * Apenas se causarem problemas de JSON
 */
function sanitizePrivateUseArea(str: string): string {
  try {
    // Testar se caracteres PUA são JSON-safe
    JSON.stringify(str);
    return str;
  } catch {
    // Se falhar, remover caracteres PUA
    return str.replace(/[\uE000-\uF8FF]/g, ''); // BMP PUA
  }
}

/**
 * Remove outros caracteres Zero Width problemáticos
 * ZWNJ (U+200C), ZWS (U+200B), Word Joiner (U+2060)
 */
function removeProblematicZeroWidth(str: string): string {
  return str
    // ZWNJ no início ou fim
    .replace(/^\u200C+/, '')
    .replace(/\u200C+$/g, '')
    // Zero Width Space no início ou fim
    .replace(/^\u200B+/, '')
    .replace(/\u200B+$/g, '')
    // Word Joiner excessivo
    .replace(/\u2060{2,}/g, '\u2060')
    // Invisible Separator (U+2063)
    .replace(/\u2063/g, '');
}

/**
 * Remove Variation Selectors completos (U+FE00-U+FE0F)
 * Órfãos no início ou duplicados
 */
function removeAllVariationSelectors(str: string): string {
  return str
    // VS1-VS16 no início
    .replace(/^[\uFE00-\uFE0F]+/, '')
    // VS duplicados (mantém apenas um)
    .replace(/([\uFE00-\uFE0F])\1+/g, '$1');
}

/**
 * Remove Combining Characters órfãos
 * Marcas diacríticas sem caractere base (U+0300-U+036F)
 */
function removeOrphanCombiningMarks(str: string): string {
  // Combining marks no início (sem base)
  return str
    .replace(/^[\u0300-\u036F\uFE20-\uFE2F]+/, '')
    // Múltiplos combining marks consecutivos (>3 é suspeito)
    .replace(/[\u0300-\u036F\uFE20-\uFE2F]{4,}/g, '');
}

/**
 * Remove Noncharacters Unicode
 * U+FDD0-U+FDEF e U+xFFFE/U+xFFFF de todos os 17 planos (nunca devem aparecer em texto válido)
 *
 * Noncharacters por plano (como surrogate pairs):
 * - U+1FFFE/1FFFF = \uD83F\uDFFE/\uD83F\uDFFF
 * - U+2FFFE/2FFFF = \uD87F\uDFFE/\uD87F\uDFFF
 * - ... até U+10FFFE/10FFFF
 */
function removeNoncharacters(str: string): string {
  // BMP noncharacters
  str = str
    .replace(/[\uFDD0-\uFDEF]/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '');

  // Supplementary plane noncharacters (surrogate pairs terminando em DFFE/DFFF)
  // Padrão: High surrogate (D800-DBFF) seguido de DFFE ou DFFF
  const result: string[] = [];
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    // Se é um high surrogate
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < len) {
      const nextCode = str.charCodeAt(i + 1);
      // Verificar se o low surrogate indica noncharacter (DFFE ou DFFF)
      if (nextCode === 0xDFFE || nextCode === 0xDFFF) {
        // Pular o par inteiro (é um noncharacter de plano suplementar)
        i++;
        continue;
      }
    }

    result.push(str[i]);
  }

  return result.join('');
}

/**
 * Remove marcas Right-to-Left potencialmente perigosas
 * RLO (U+202E), LRO (U+202D), RLE (U+202B), LRE (U+202A), PDF (U+202C), POP (U+2069)
 * Nota: Não remove se forem usadas corretamente em pares
 */
function sanitizeBidiMarks(str: string): string {
  // Remove marcas órfãs ou excessivas
  return str
    // RLO/LRO no início ou fim
    .replace(/^[\u202D\u202E]+/, '')
    .replace(/[\u202D\u202E]+$/g, '')
    // Múltiplas marcas consecutivas (>2 é suspeito)
    .replace(/[\u202A-\u202E\u2066-\u2069]{3,}/g, '')
    // Pop Directional Isolate órfão no início
    .replace(/^\u2069+/, '');
}

/**
 * Remove outras marcas invisíveis problemáticas
 * Soft Hyphen (U+00AD), Invisible Times (U+2062), etc.
 */
function removeInvisibleMarks(str: string): string {
  return str
    // Soft hyphen excessivo
    .replace(/\u00AD{2,}/g, '')
    // Function Application (U+2061)
    .replace(/\u2061/g, '')
    // Invisible Times (U+2062)
    .replace(/\u2062/g, '')
    // Invisible Separator (U+2063)
    .replace(/\u2063/g, '')
    // Invisible Plus (U+2064)
    .replace(/\u2064/g, '');
}

/**
 * Sanitiza uma string para ser usada em JSON.stringify
 * Remove TODOS os caracteres Unicode problemáticos que podem causar erros de parsing
 *
 * @param text - Texto a ser sanitizado
 * @returns Texto limpo e seguro para JSON
 *
 * Proteções implementadas (14 sanitizações):
 * 1. Caracteres NULL
 * 2. BOM no meio do texto
 * 3. Caracteres de controle inválidos
 * 4. Surrogates inválidos
 * 5. Modificadores órfãos (skin tones)
 * 6. ZWJ órfãos
 * 7. Variation Selectors completos
 * 8. Private Use Area problemáticos
 * 9. Zero Width Characters problemáticos
 * 10. Combining Characters órfãos
 * 11. Noncharacters
 * 12. Marcas Bidi potencialmente perigosas
 * 13. Marcas invisíveis problemáticas
 * 14. Fallback agressivo (se todas falharem)
 */
export function sanitizeForJSON(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    // Aplicar todas as 14 sanitizações em ordem otimizada
    let sanitized = text;

    // 1. Remover caracteres NULL
    sanitized = sanitized.replace(/\0/g, '');

    // 2. Remover BOM no meio do texto
    sanitized = removeMidstreamBOM(sanitized);

    // 3. Remover caracteres de controle inválidos
    sanitized = removeInvalidControlChars(sanitized);

    // 4. Remover surrogates inválidos (CRÍTICO para JSON)
    sanitized = removeInvalidSurrogates(sanitized);

    // 5. Remover noncharacters (nunca devem existir)
    sanitized = removeNoncharacters(sanitized);

    // 6. Remover modificadores órfãos (skin tones sem base)
    sanitized = removeOrphanModifiers(sanitized);

    // 7. Remover ZWJ órfãos
    sanitized = removeOrphanZWJ(sanitized);

    // 8. Remover outros Zero Width problemáticos
    sanitized = removeProblematicZeroWidth(sanitized);

    // 9. Remover Variation Selectors completos
    sanitized = removeAllVariationSelectors(sanitized);

    // 10. Remover Combining Characters órfãos
    sanitized = removeOrphanCombiningMarks(sanitized);

    // 11. Sanitizar marcas Bidi (segurança)
    sanitized = sanitizeBidiMarks(sanitized);

    // 12. Remover marcas invisíveis problemáticas
    sanitized = removeInvisibleMarks(sanitized);

    // 13. Sanitizar Private Use Area se necessário
    sanitized = sanitizePrivateUseArea(sanitized);

    // Testar se agora é válido para JSON
    JSON.stringify({ test: sanitized });

    return sanitized;
  } catch (error) {
    console.warn('[Unicode Sanitizer] Falha ao sanitizar texto, usando fallback agressivo:', error);

    // 14. Fallback agressivo: filtrar por charCode
    // JSON.stringify de surrogate órfão pode NÃO lançar erro, apenas escapar
    // Por isso verificamos explicitamente por charCode
    const result: string[] = [];
    const len = text.length;

    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);

      // Remover surrogates (órfãos são problemáticos)
      if (code >= 0xD800 && code <= 0xDBFF) {
        // High surrogate - verificar par
        if (i + 1 < len) {
          const nextCode = text.charCodeAt(i + 1);
          if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
            // Par válido
            result.push(text[i], text[i + 1]);
            i++;
            continue;
          }
        }
        // Órfão - pular
        continue;
      }

      if (code >= 0xDC00 && code <= 0xDFFF) {
        // Low surrogate órfão - pular
        continue;
      }

      // Remover caracteres de controle (exceto \t, \n, \r)
      if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
        continue;
      }

      // Remover DEL e C1 controls
      if (code === 0x7F || (code >= 0x80 && code <= 0x9F)) {
        continue;
      }

      // Remover noncharacters
      if ((code >= 0xFDD0 && code <= 0xFDEF) || code === 0xFFFE || code === 0xFFFF) {
        continue;
      }

      // Caractere válido
      result.push(text[i]);
    }

    return result.join('');
  }
}

/**
 * Sanitiza um objeto recursivamente, aplicando sanitizeForJSON em todas as strings
 *
 * @param obj - Objeto a ser sanitizado
 * @returns Objeto com todas as strings sanitizadas
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
 * Wrapper seguro para JSON.stringify que sanitiza automaticamente
 *
 * @param value - Valor a ser serializado
 * @param replacer - Função replacer opcional
 * @param space - Espaçamento opcional
 * @returns String JSON ou null se falhar
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
    console.error('[Unicode Sanitizer] Erro ao serializar JSON:', error);
    console.error('[Unicode Sanitizer] Valor problemático:', value);

    // Fallback: retornar objeto de erro
    return JSON.stringify({
      error: 'Failed to serialize',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Valida se uma string é segura para JSON
 *
 * @param text - Texto a ser validado
 * @returns true se a string é segura
 */
export function isJSONSafe(text: string): boolean {
  try {
    JSON.stringify({ test: text });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detecta e lista caracteres problemáticos em uma string
 * Útil para debugging
 *
 * @param text - Texto a ser analisado
 * @returns Array de caracteres problemáticos com detalhes
 */
export function findProblematicChars(text: string): Array<{
  char: string;
  codePoint: number;
  position: number;
  type: string;
  description: string;
}> {
  const problematic: Array<{
    char: string;
    codePoint: number;
    position: number;
    type: string;
    description: string;
  }> = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const codePoint = text.charCodeAt(i);

    // Caractere NULL
    if (codePoint === 0x0000) {
      problematic.push({
        char,
        codePoint,
        position: i,
        type: 'NULL',
        description: 'Caractere NULL (\\0)'
      });
    }

    // BOM no meio do texto (não no início)
    if (codePoint === 0xFEFF && i > 0) {
      problematic.push({
        char,
        codePoint,
        position: i,
        type: 'BOM',
        description: 'Byte Order Mark no meio do texto'
      });
    }

    // Caracteres de controle inválidos (exceto \n, \r, \t)
    if ((codePoint >= 0x00 && codePoint <= 0x08) ||
        codePoint === 0x0B ||
        codePoint === 0x0C ||
        (codePoint >= 0x0E && codePoint <= 0x1F) ||
        (codePoint >= 0x7F && codePoint <= 0x9F)) {
      problematic.push({
        char,
        codePoint,
        position: i,
        type: 'CONTROL',
        description: 'Caractere de controle inválido'
      });
    }

    // High surrogate sem low surrogate
    if (codePoint >= 0xD800 && codePoint <= 0xDBFF) {
      const nextCodePoint = i + 1 < text.length ? text.charCodeAt(i + 1) : null;
      if (!nextCodePoint || nextCodePoint < 0xDC00 || nextCodePoint > 0xDFFF) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'HIGH_SURROGATE',
          description: 'High surrogate sem low surrogate'
        });
      }
    }

    // Low surrogate sem high surrogate
    if (codePoint >= 0xDC00 && codePoint <= 0xDFFF) {
      const prevCodePoint = i > 0 ? text.charCodeAt(i - 1) : null;
      if (!prevCodePoint || prevCodePoint < 0xD800 || prevCodePoint > 0xDBFF) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'LOW_SURROGATE',
          description: 'Low surrogate sem high surrogate'
        });
      }
    }

    // ZWJ órfão (início, fim, ou duplicado)
    if (codePoint === 0x200D) {
      if (i === 0 || i === text.length - 1) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'ZWJ_ORPHAN',
          description: 'Zero Width Joiner órfão (início/fim)'
        });
      } else if (text.charCodeAt(i + 1) === 0x200D) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'ZWJ_DUPLICATE',
          description: 'Zero Width Joiner duplicado'
        });
      }
    }

    // Variação de seleção órfã (VS1-VS16)
    if (codePoint >= 0xFE00 && codePoint <= 0xFE0F) {
      if (i === 0) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'VS_ORPHAN',
          description: 'Variation Selector órfão (início)'
        });
      } else if (text.charCodeAt(i + 1) === codePoint) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'VS_DUPLICATE',
          description: 'Variation Selector duplicado'
        });
      }
    }

    // Zero Width Non-Joiner órfão
    if (codePoint === 0x200C) {
      if (i === 0 || i === text.length - 1) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'ZWNJ_ORPHAN',
          description: 'Zero Width Non-Joiner órfão (início/fim)'
        });
      }
    }

    // Zero Width Space órfão
    if (codePoint === 0x200B) {
      if (i === 0 || i === text.length - 1) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'ZWS_ORPHAN',
          description: 'Zero Width Space órfão (início/fim)'
        });
      }
    }

    // Combining Characters órfãos
    if ((codePoint >= 0x0300 && codePoint <= 0x036F) ||
        (codePoint >= 0xFE20 && codePoint <= 0xFE2F)) {
      if (i === 0) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'COMBINING_ORPHAN',
          description: 'Combining Character órfão (sem base)'
        });
      }
    }

    // Noncharacters
    if ((codePoint >= 0xFDD0 && codePoint <= 0xFDEF) ||
        codePoint === 0xFFFE || codePoint === 0xFFFF) {
      problematic.push({
        char,
        codePoint,
        position: i,
        type: 'NONCHARACTER',
        description: 'Noncharacter Unicode (nunca válido)'
      });
    }

    // Right-to-Left Override (potencial segurança)
    if (codePoint === 0x202E || codePoint === 0x202D) {
      if (i === 0 || i === text.length - 1) {
        problematic.push({
          char,
          codePoint,
          position: i,
          type: 'BIDI_OVERRIDE',
          description: 'Bidi Override potencialmente perigoso'
        });
      }
    }

    // Marcas invisíveis problemáticas
    if (codePoint === 0x2061 || codePoint === 0x2062 ||
        codePoint === 0x2063 || codePoint === 0x2064) {
      problematic.push({
        char,
        codePoint,
        position: i,
        type: 'INVISIBLE_MARK',
        description: 'Marca invisível problemática'
      });
    }
  }

  return problematic;
}

/**
 * Estatísticas de problemas Unicode em uma string
 * Útil para métricas e monitoramento
 */
export function getUnicodeStats(text: string): {
  totalChars: number;
  problematicChars: number;
  types: Record<string, number>;
  isClean: boolean;
} {
  const problematic = findProblematicChars(text);
  const types: Record<string, number> = {};

  problematic.forEach(p => {
    types[p.type] = (types[p.type] || 0) + 1;
  });

  return {
    totalChars: text.length,
    problematicChars: problematic.length,
    types,
    isClean: problematic.length === 0
  };
}

/**
 * Extrai iniciais de um nome de forma segura para Unicode.
 * Evita gerar surrogates órfãos ao indexar strings com emojis.
 *
 * - Remove emojis e caracteres não-alfanuméricos antes de extrair
 * - Retorna até 2 caracteres (iniciais da 1ª e 2ª palavra)
 * - Retorna "?" se o nome não tiver caracteres válidos
 */
export function safeGetInitials(name: string | null | undefined): string {
  if (!name) return '?';

  // Remover emojis e caracteres especiais Unicode (supplementary plane + common symbols)
  const cleaned = name
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';

  if (words.length === 1) {
    // Filtrar apenas letras e dígitos
    const safe = words[0].replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF]/g, '');
    return safe.length > 0 ? safe.slice(0, 2).toUpperCase() : '?';
  }

  // Pegar primeira letra de cada palavra (apenas letras/dígitos)
  const initials = words
    .map(w => {
      const safe = w.replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF]/g, '');
      return safe.length > 0 ? safe[0] : '';
    })
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || '?';
}

// ============================================================
// SANITIZED FETCH - Proteção global contra surrogates em JSON
// ============================================================

/**
 * Sanitiza uma string JSON já serializada, removendo surrogate pairs inválidos
 * JavaScript's JSON.stringify NÃO lança erro em surrogates órfãos - ele gera
 * sequências \uDxxx que são inválidas per RFC 8259. Esta função resolve isso
 * fazendo parse → sanitize → re-stringify.
 *
 * @param jsonStr - String JSON serializada que pode conter surrogates inválidos
 * @returns String JSON limpa e válida
 */
export function sanitizeJsonString(jsonStr: string): string {
  if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;

  try {
    // Parse (V8/browsers aceitam \uDxxx em JSON.parse)
    const parsed = JSON.parse(jsonStr);
    // Sanitiza recursivamente
    const sanitized = sanitizeObjectForJSON(parsed);
    // Re-stringify sem surrogates
    return JSON.stringify(sanitized);
  } catch {
    // Se parse falhar, fazer sanitização character-level na string
    return sanitizeForJSON(jsonStr);
  }
}

/**
 * Cria um wrapper de fetch que sanitiza automaticamente bodies JSON
 * antes de enviar para a API. Resolve o problema de JSON.stringify
 * do JavaScript que produz \uDxxx escape sequences inválidos para
 * lone surrogates (RFC 8259 violation).
 *
 * Uso principal:
 * - Supabase createClient({ global: { fetch: createSanitizedFetch() } })
 * - Qualquer API que use fetch com JSON body
 *
 * @param originalFetch - Função fetch original (default: globalThis.fetch)
 * @returns Função fetch com sanitização automática de JSON
 */
/**
 * Sanitiza argumentos para console.log/warn/error
 * Previne que surrogates órfãos em dados WhatsApp (nomes de chat, mensagens)
 * sejam capturados por ferramentas externas (Playwright MCP, log aggregators)
 * que podem falhar ao serializar esses dados em JSON.
 *
 * @param args - Argumentos do console.log
 * @returns Argumentos sanitizados
 */
export function sanitizeLogArgs(...args: unknown[]): unknown[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeForJSON(arg);
    }
    if (arg && typeof arg === 'object') {
      try {
        return sanitizeObjectForJSON(arg);
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
}

export function createSanitizedFetch(
  originalFetch?: typeof globalThis.fetch
): typeof globalThis.fetch {
  const baseFetch = originalFetch || globalThis.fetch.bind(globalThis);

  return async function sanitizedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // 🛡️ Sanitizar REQUEST body (outgoing)
    if (init?.body && typeof init.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        const sanitized = sanitizeObjectForJSON(parsed);
        init = { ...init, body: JSON.stringify(sanitized) };
      } catch {
        // Não é JSON válido ou parse falhou - deixar como está
      }
    }

    const response = await baseFetch(input, init);

    // 🛡️ Sanitizar RESPONSE body (incoming)
    // Dados do banco podem conter surrogates UTF-16 inválidos (ex: emojis do WhatsApp)
    // que precisam ser limpos antes de chegar ao DOM/React
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') && response.ok) {
      try {
        // Clone ANTES de consumir - assim temos fallback seguro
        const clone = response.clone();
        const text = await clone.text();

        // Fast-path: se a string é well-formed, retorna response original intacto
        if (typeof (text as any).isWellFormed === 'function' && (text as any).isWellFormed()) {
          return response;
        }

        // Tem surrogates inválidos - sanitizar
        const parsed = JSON.parse(text);
        const sanitized = sanitizeObjectForJSON(parsed);
        const cleanBody = JSON.stringify(sanitized);

        // Clonar headers e remover Content-Length (pode ter mudado)
        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');

        return new Response(cleanBody, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch {
        // Em caso de erro, retorna response original (body ainda não consumido)
        return response;
      }
    }

    return response;
  };
}
