/**
 * Utilitário para detectar a franquia correta baseada no domínio/hostname.
 * Usado em páginas públicas para mostrar dados da franquia correta
 * quando o tenant possui múltiplas franquias.
 *
 * Ex: "app.viniun.com.br" → "praiagrande" → match "Viniun"
 */

/**
 * Extrai uma dica de localização do hostname para identificar a franquia correta.
 * Remove prefixos comuns (app, www), sufixos de domínio (.com.br) e o slug do tenant.
 */
export function extractLocationHint(hostname: string, tenantSlug: string): string | null {
  // Remove prefixos comuns e sufixos de domínio
  let domain = hostname
    .toLowerCase()
    .replace(/^(app|www|api)\./, "")
    .replace(/\.(com|net|org)(\.[a-z]{2})?$/, "");

  // Remove o slug do tenant para isolar a localização
  domain = domain.replace(tenantSlug, "");

  // Limpa caracteres não-alfa
  domain = domain.replace(/[^a-z]/g, "");

  return domain.length >= 3 ? domain : null;
}

/**
 * Seleciona a franquia que melhor corresponde ao domínio atual.
 * Verifica slug e cidade da franquia contra a dica de localização.
 * Retorna a primeira franquia como fallback.
 */
export function matchFranchiseByLocation<T extends { slug?: string | null; cidade?: string | null }>(
  franchises: T[],
  locationHint: string | null,
): T | undefined {
  if (!franchises.length) return undefined;

  if (locationHint) {
    const matched = franchises.find((f) => {
      const slugMatch = f.slug?.toLowerCase().replace(/[^a-z]/g, "").includes(locationHint);
      const cityMatch = f.cidade?.toLowerCase().replace(/[^a-z]/g, "").includes(locationHint);
      return slugMatch || cityMatch;
    });
    if (matched) return matched;
  }

  // Fallback: primeira franquia
  return franchises[0];
}
