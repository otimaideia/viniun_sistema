/**
 * Utilitários para textos sensíveis ao gênero
 * Usado no portal das influenciadoras/influenciadores
 */

export type GeneroValue =
  | 'masculino'
  | 'feminino'
  | 'outro'
  | 'prefiro_nao_informar'
  | string
  | null
  | undefined;

/**
 * Retorna o termo correto baseado no gênero
 * Ex: "Influenciador" | "Influenciadora" | "Influenciador(a)"
 */
export function getTermoInfluenciador(genero?: GeneroValue): string {
  switch (genero?.toLowerCase()) {
    case 'masculino': return 'Influenciador';
    case 'feminino':  return 'Influenciadora';
    default:          return 'Influenciador(a)';
  }
}

/**
 * Retorna o label do portal baseado no gênero
 * Ex: "Portal do Influenciador" | "Portal da Influenciadora" | "Portal do Influenciador(a)"
 */
export function getPortalLabel(genero?: GeneroValue): string {
  switch (genero?.toLowerCase()) {
    case 'masculino': return 'Portal do Influenciador';
    case 'feminino':  return 'Portal da Influenciadora';
    default:          return 'Portal do Influenciador(a)';
  }
}

/**
 * Retorna saudação de boas-vindas baseada no gênero
 * Ex: "Bem-vindo" | "Bem-vinda" | "Bem-vindo(a)"
 */
export function getBemVindo(genero?: GeneroValue): string {
  switch (genero?.toLowerCase()) {
    case 'masculino': return 'Bem-vindo';
    case 'feminino':  return 'Bem-vinda';
    default:          return 'Bem-vindo(a)';
  }
}

/**
 * Retorna o artigo definido baseado no gênero
 * Ex: "o" | "a" | "o(a)"
 */
export function getArtigo(genero?: GeneroValue): string {
  switch (genero?.toLowerCase()) {
    case 'masculino': return 'o';
    case 'feminino':  return 'a';
    default:          return 'o(a)';
  }
}

/**
 * Retorna um adjetivo no gênero correto
 * Ex: getAdjetivo('ativado', 'feminino') → 'ativada'
 *     getAdjetivo('ativado', 'masculino') → 'ativado'
 *     getAdjetivo('ativado', null) → 'ativado(a)'
 */
export function getAdjetivo(adjetivoMasculino: string, genero?: GeneroValue): string {
  const base = adjetivoMasculino.replace(/o$/, '');
  switch (genero?.toLowerCase()) {
    case 'masculino': return `${base}o`;
    case 'feminino':  return `${base}a`;
    default:          return `${base}o(a)`;
  }
}
