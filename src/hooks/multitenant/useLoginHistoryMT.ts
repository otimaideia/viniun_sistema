import { useQuery } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface LoginAttemptRecord {
  id: string;
  email: string;
  user_id: string | null;
  tenant_id: string | null;
  success: boolean;
  failure_reason: string | null;
  auth_method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
}

export interface LoginStats {
  total: number;
  ultimoAcesso: string | null;
  acessosEsteMes: number;
  tentativasFalhadas: number;
}

interface RecordUserLoginParams {
  email: string;
  success: boolean;
  failure_reason?: string;
  auth_method?: string;
}

// --- IP caching ---
let cachedIp: string | null = null;
let ipFetchPromise: Promise<string | null> | null = null;

function getClientIp(): Promise<string | null> {
  if (cachedIp) return Promise.resolve(cachedIp);
  if (ipFetchPromise) return ipFetchPromise;

  ipFetchPromise = new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); resolve(null); }, 3000);

    fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { cachedIp = data.ip; resolve(cachedIp); })
      .catch(() => resolve(null))
      .finally(() => { clearTimeout(timeout); ipFetchPromise = null; });
  });

  return ipFetchPromise;
}

// --- User Agent parser ---
export function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Desconhecido';

  let browser = 'Navegador';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  let os = '';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} / ${os}` : browser;
}

/**
 * Hook para histórico de login de usuários (admin view)
 */
export function useLoginHistoryMT(userId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const { data: loginHistory, isLoading } = useQuery({
    queryKey: ['mt-login-history', userId, tenant?.id],
    queryFn: async (): Promise<LoginAttemptRecord[]> => {
      if (!userId) return [];

      let query = supabase
        .from('mt_login_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LoginAttemptRecord[];
    },
    enabled: !isTenantLoading && !!userId && (!!tenant || accessLevel === 'platform'),
  });

  const stats: LoginStats = (() => {
    if (!loginHistory || loginHistory.length === 0) {
      return { total: 0, ultimoAcesso: null, acessosEsteMes: 0, tentativasFalhadas: 0 };
    }

    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    const sucessos = loginHistory.filter((l) => l.success);
    const ultimoSucesso = sucessos[0]?.created_at || null;

    const acessosEsteMes = sucessos.filter((l) => {
      const d = new Date(l.created_at);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    }).length;

    const tentativasFalhadas = loginHistory.filter((l) => !l.success).length;

    return {
      total: sucessos.length,
      ultimoAcesso: ultimoSucesso,
      acessosEsteMes,
      tentativasFalhadas,
    };
  })();

  return {
    loginHistory: loginHistory || [],
    isLoading: isLoading || isTenantLoading,
    stats,
    parseUserAgent,
  };
}

/**
 * Fire-and-forget: registra login sem bloquear o fluxo de autenticação.
 * Chama a RPC imediatamente (sem IP) e atualiza o IP depois se disponível.
 */
export function fireAndForgetUserLoginRecord(params: RecordUserLoginParams) {
  // Registrar imediatamente com IP cacheado (ou null)
  const ip = cachedIp;

  supabase
    .rpc('record_user_login', {
      p_email: params.email,
      p_success: params.success,
      p_failure_reason: params.failure_reason || null,
      p_auth_method: params.auth_method || 'password',
      p_ip_address: ip,
      p_user_agent: navigator.userAgent,
    })
    .then((res) => {
      if (res.error) {
        console.error('[LoginHistory] Erro ao registrar:', res.error);
        return;
      }
      const recordId = res.data as string | null;
      // Se não tinha IP, tentar buscar e atualizar o registro
      if (!ip && recordId) {
        getClientIp().then((resolvedIp) => {
          if (resolvedIp) {
            supabase
              .from('mt_login_attempts')
              .update({ ip_address: resolvedIp })
              .eq('id', recordId)
              .then(() => {});
          }
        });
      }
    })
    .catch((err) => console.error('[LoginHistory] Erro ao registrar:', err));

  // Pre-fetch IP para próximos logins
  if (!cachedIp) getClientIp();
}
