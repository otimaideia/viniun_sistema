import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead-mt';

const CLIENTE_TOKEN_KEY = 'mt_cliente_token';
const CLIENTE_DATA_KEY = 'mt_cliente_data';
const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 dias para magic links

/**
 * Detect current tenant slug from hostname/query params.
 * Same logic used by useClienteAuth.ts for consistency.
 */
function getCurrentTenantSlug(): string {
  const hostname = window.location.hostname;
  const isDev = ['localhost', '127.0.0.1', '192.168.'].some(d => hostname.includes(d));

  if (!isDev) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const sub = parts[0].toLowerCase();
      if (sub !== 'www') return sub;
      if (parts.length >= 4) return parts[1].toLowerCase();
    }
  } else {
    const param = new URLSearchParams(window.location.search).get('tenant');
    if (param) return param.toLowerCase();
  }

  return 'viniun';
}

interface MagicAuthState {
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  lead: Lead | null;
  error: string | null;
}

/**
 * Hook para autenticação via magic token (link mágico)
 *
 * Detecta ?token=XXX na URL, valida contra mt_cliente_magic_tokens,
 * e autentica o lead automaticamente sem necessidade de CPF/código.
 *
 * Usa o mesmo formato de localStorage que useClienteAuth.ts,
 * então o ClienteAuthContext reconhece a sessão automaticamente.
 */
export function useClienteMagicAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<MagicAuthState>({
    isAuthenticating: false,
    isAuthenticated: false,
    lead: null,
    error: null,
  });

  const token = searchParams.get('token');

  const authenticateWithToken = useCallback(async (magicToken: string) => {
    setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      // 1. Buscar token no banco
      const { data: tokenData, error: tokenError } = await supabase
        .from('mt_cliente_magic_tokens' as any)
        .select('*')
        .eq('token', magicToken)
        .single();

      if (tokenError || !tokenData) {
        setState(prev => ({
          ...prev,
          isAuthenticating: false,
          error: 'Link inválido ou expirado',
        }));
        return false;
      }

      // 1b. Defense-in-depth: verify token belongs to current tenant
      if (tokenData.tenant_id) {
        const tenantSlug = getCurrentTenantSlug();
        const { data: tenantData } = await supabase
          .from('mt_tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .eq('is_active', true)
          .single();

        if (tenantData && tenantData.id !== tokenData.tenant_id) {
          setState(prev => ({
            ...prev,
            isAuthenticating: false,
            error: 'Link inválido para este portal.',
          }));
          return false;
        }
      }

      // 2. Verificar expiração
      if (new Date(tokenData.expires_at) < new Date()) {
        setState(prev => ({
          ...prev,
          isAuthenticating: false,
          error: 'Link expirado. Solicite um novo acesso.',
        }));
        return false;
      }

      // 3. Buscar dados do lead
      const { data: leadData, error: leadError } = await supabase
        .from('mt_leads')
        .select('*')
        .eq('id', tokenData.lead_id)
        .single();

      if (leadError || !leadData) {
        setState(prev => ({
          ...prev,
          isAuthenticating: false,
          error: 'Cadastro não encontrado.',
        }));
        return false;
      }

      // 4. Marcar token como usado (não invalida, apenas registra)
      if (!tokenData.used_at) {
        await supabase
          .from('mt_cliente_magic_tokens' as any)
          .update({ used_at: new Date().toISOString() })
          .eq('id', tokenData.id);
      }

      // 5. Criar sessão no localStorage (mesmo formato do useClienteAuth)
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

      localStorage.setItem(CLIENTE_TOKEN_KEY, JSON.stringify({
        leadId: leadData.id,
        expiry: expiry.toISOString(),
      }));
      localStorage.setItem(CLIENTE_DATA_KEY, JSON.stringify(leadData));

      // 6. Atualizar último login
      await supabase
        .from('mt_leads')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', leadData.id);

      // 7. Limpar token da URL sem reload
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + url.search);

      setState({
        isAuthenticating: false,
        isAuthenticated: true,
        lead: leadData as Lead,
        error: null,
      });

      return true;
    } catch (err) {
      console.error('Erro na autenticação via magic link:', err);
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: 'Erro ao processar link. Tente novamente.',
      }));
      return false;
    }
  }, []);

  // Auto-autenticar quando token presente na URL
  useEffect(() => {
    if (token && !state.isAuthenticated && !state.isAuthenticating) {
      authenticateWithToken(token);
    }
  }, [token, state.isAuthenticated, state.isAuthenticating, authenticateWithToken]);

  // Verificar se já está autenticado via localStorage
  const checkExistingAuth = useCallback((): Lead | null => {
    try {
      const storedToken = localStorage.getItem(CLIENTE_TOKEN_KEY);
      const storedData = localStorage.getItem(CLIENTE_DATA_KEY);

      if (!storedToken || !storedData) return null;

      const { expiry } = JSON.parse(storedToken);
      if (new Date(expiry) < new Date()) {
        localStorage.removeItem(CLIENTE_TOKEN_KEY);
        localStorage.removeItem(CLIENTE_DATA_KEY);
        return null;
      }

      return JSON.parse(storedData) as Lead;
    } catch {
      return null;
    }
  }, []);

  return {
    ...state,
    hasToken: !!token,
    authenticateWithToken,
    checkExistingAuth,
  };
}
