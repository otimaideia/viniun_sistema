/**
 * Utilitários para geração e manipulação de slugs
 */

/**
 * Mapa de caracteres acentuados para seus equivalentes sem acento
 */
const ACCENT_MAP: Record<string, string> = {
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'Ç': 'C', 'ç': 'c',
  'Ñ': 'N', 'ñ': 'n',
  'Ý': 'Y', 'ý': 'y', 'ÿ': 'y',
};

/**
 * Remove acentos de uma string
 */
export function removeAccents(text: string): string {
  return text
    .split('')
    .map(char => ACCENT_MAP[char] || char)
    .join('');
}

/**
 * Gera um slug a partir de uma string
 * Ex: "Viniun Altamira" => "viniun-altamira"
 */
export function generateSlug(name: string): string {
  if (!name) return '';

  return removeAccents(name)
    .toLowerCase()
    .trim()
    // Remove caracteres especiais, mantém letras, números e espaços
    .replace(/[^a-z0-9\s-]/g, '')
    // Substitui espaços por hífens
    .replace(/\s+/g, '-')
    // Remove hífens múltiplos
    .replace(/-+/g, '-')
    // Remove hífens no início e fim
    .replace(/^-+|-+$/g, '');
}

/**
 * Valida se um slug é válido (apenas letras minúsculas, números e hífens)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Compara dois slugs para ver se são equivalentes
 */
export function slugsMatch(slug1: string, slug2: string): boolean {
  return generateSlug(slug1) === generateSlug(slug2);
}

/**
 * Normaliza uma string para busca (remove acentos e converte para minúsculas)
 */
export function normalizeForSearch(text: string): string {
  return removeAccents(text).toLowerCase().trim();
}
