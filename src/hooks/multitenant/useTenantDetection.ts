import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tenant } from '@/types/multitenant';

// =============================================================================
// HOOK: useTenantDetection
// Detecta o tenant atual baseado no subdomínio da URL
// Busca configuração de subdomínios diretamente do banco de dados
// =============================================================================

interface TenantDetectionResult {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  detectionMethod: 'subdomain' | 'custom_domain' | 'path' | 'query_param' | 'default' | null;
  refetch: () => Promise<void>;
}

interface SubdomainMapping {
  subdominio: string;
  dominio_customizado: string | null;
  slug: string;
}

// Domínios base que indicam ambiente de desenvolvimento
const DEV_DOMAINS = ['localhost', '127.0.0.1', '192.168.'];

/**
 * Verifica se está em ambiente de desenvolvimento
 */
function isDevelopment(): boolean {
  const hostname = window.location.hostname;
  return DEV_DOMAINS.some(dev => hostname.includes(dev));
}

/**
 * Extrai o subdomínio da URL atual
 */
function extractSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Em desenvolvimento, não há subdomínio real
  if (isDevelopment()) {
    return null;
  }

  // Em produção, extrair subdomínio
  const parts = hostname.split('.');

  // Precisa ter pelo menos 3 partes (subdomain.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();
    // Ignorar www
    if (subdomain === 'www' && parts.length >= 4) {
      return parts[1].toLowerCase();
    }
    return subdomain;
  }

  return null;
}

/**
 * Obtém o hostname completo
 */
function getFullHostname(): string {
  return window.location.hostname.toLowerCase();
}

/**
 * Obtém parâmetro de tenant da URL (desenvolvimento)
 */
function getTenantFromQueryParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tenant');
}

/**
 * Obtém tenant do path da URL (desenvolvimento)
 */
function getTenantFromPath(): string | null {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    return pathParts[0];
  }
  return null;
}

export function useTenantDetection(): TenantDetectionResult {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<TenantDetectionResult['detectionMethod']>(null);

  const detectAndLoadTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Buscar todos os mapeamentos de subdomínio/domínio do banco
      const { data: mappings, error: mappingError } = await supabase
        .from('mt_tenants')
        .select('slug, subdominio, dominio_customizado')
        .eq('is_active', true);

      if (mappingError) {
        throw mappingError;
      }

      const subdomainMap = new Map<string, string>();
      const customDomainMap = new Map<string, string>();

      mappings?.forEach((m: SubdomainMapping) => {
        if (m.subdominio) {
          subdomainMap.set(m.subdominio.toLowerCase(), m.slug);
        }
        if (m.dominio_customizado) {
          // Suporta múltiplos domínios separados por vírgula
          m.dominio_customizado.split(',').forEach(d => {
            const domain = d.trim().toLowerCase();
            if (domain) customDomainMap.set(domain, m.slug);
          });
        }
        // Também mapear pelo slug diretamente
        subdomainMap.set(m.slug.toLowerCase(), m.slug);
      });

      let tenantSlug: string | null = null;
      let method: TenantDetectionResult['detectionMethod'] = null;

      // 2. Em produção, verificar subdomínio ou domínio customizado
      if (!isDevelopment()) {
        const fullHostname = getFullHostname();

        // Primeiro, verificar domínio customizado completo
        if (customDomainMap.has(fullHostname)) {
          tenantSlug = customDomainMap.get(fullHostname) || null;
          method = 'custom_domain';
        }

        // Se não, verificar domínio pai (ex: app.yeslaser.com → yeslaser.com)
        if (!tenantSlug) {
          const parts = fullHostname.split('.');
          if (parts.length >= 3) {
            const parentDomain = parts.slice(1).join('.');
            if (customDomainMap.has(parentDomain)) {
              tenantSlug = customDomainMap.get(parentDomain) || null;
              method = 'custom_domain';
            }
          }
        }

        // Se não, verificar subdomínio
        if (!tenantSlug) {
          const subdomain = extractSubdomain();
          if (subdomain && subdomainMap.has(subdomain)) {
            tenantSlug = subdomainMap.get(subdomain) || null;
            method = 'subdomain';
          }
        }
      } else {
        // 3. Em desenvolvimento, verificar query param ou path
        const queryTenant = getTenantFromQueryParam();
        if (queryTenant && subdomainMap.has(queryTenant.toLowerCase())) {
          tenantSlug = subdomainMap.get(queryTenant.toLowerCase()) || null;
          method = 'query_param';
        }

        if (!tenantSlug) {
          const pathTenant = getTenantFromPath();
          if (pathTenant && subdomainMap.has(pathTenant.toLowerCase())) {
            tenantSlug = subdomainMap.get(pathTenant.toLowerCase()) || null;
            method = 'path';
          }
        }
      }

      // 4. Fallback para tenant padrão (franqueadora/plataforma)
      if (!tenantSlug) {
        tenantSlug = 'franqueadora';
        method = 'default';
      }

      // 5. Buscar dados completos do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .eq('is_active', true)
        .single();

      if (tenantError) {
        // Se não encontrou o tenant específico, tentar o default
        if (tenantError.code === 'PGRST116' && tenantSlug !== 'franqueadora') {
          const { data: defaultTenant, error: defaultError } = await supabase
            .from('mt_tenants')
            .select('*')
            .eq('slug', 'franqueadora')
            .eq('is_active', true)
            .single();

          if (defaultError) {
            throw new Error('Nenhum tenant encontrado');
          }

          setTenant(defaultTenant);
          setDetectionMethod('default');
        } else {
          throw tenantError;
        }
      } else {
        setTenant(tenantData);
        setDetectionMethod(method);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao detectar tenant'));
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    detectAndLoadTenant();
  }, [detectAndLoadTenant]);

  return {
    tenant,
    isLoading,
    error,
    detectionMethod,
    refetch: detectAndLoadTenant,
  };
}

/**
 * Gera a URL para um tenant específico
 * @param tenantSlug - Slug do tenant
 * @param path - Path da URL
 * @param useSubdomain - Se deve usar subdomínio ou query param
 */
export function getTenantUrl(
  tenantSlug: string,
  path: string = '/',
  useSubdomain: boolean = true
): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // Em desenvolvimento
  if (isDevelopment()) {
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    return `${baseUrl}${path}?tenant=${tenantSlug}`;
  }

  if (!useSubdomain) {
    return path;
  }

  // Em produção, construir URL com subdomínio
  const parts = hostname.split('.');

  // Remover subdomínio atual se existir
  if (parts.length >= 3) {
    parts.shift();
  }

  // Adicionar novo subdomínio
  const newHostname = `${tenantSlug}.${parts.join('.')}`;

  return `${protocol}//${newHostname}${path}`;
}

/**
 * Verifica se está em um tenant específico
 */
export async function isCurrentTenant(tenantSlug: string): Promise<boolean> {
  // Em desenvolvimento
  if (isDevelopment()) {
    const queryTenant = getTenantFromQueryParam();
    const pathTenant = getTenantFromPath();

    if (queryTenant) return queryTenant.toLowerCase() === tenantSlug.toLowerCase();
    if (pathTenant) return pathTenant.toLowerCase() === tenantSlug.toLowerCase();
    return tenantSlug.toLowerCase() === 'franqueadora';
  }

  // Em produção
  const subdomain = extractSubdomain();
  if (!subdomain) return tenantSlug.toLowerCase() === 'franqueadora';

  // Buscar o slug real do subdomínio no banco
  const { data } = await supabase
    .from('mt_tenants')
    .select('slug')
    .or(`subdominio.eq.${subdomain},slug.eq.${subdomain}`)
    .single();

  return data?.slug?.toLowerCase() === tenantSlug.toLowerCase();
}

/**
 * Hook para obter lista de todos os tenants (para admins)
 */
export function useAllTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('mt_tenants')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (fetchError) throw fetchError;
      setTenants(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar tenants'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  return { tenants, isLoading, error, refetch: loadTenants };
}

export default useTenantDetection;
