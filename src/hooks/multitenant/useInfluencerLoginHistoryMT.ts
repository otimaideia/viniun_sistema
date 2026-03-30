import { useQuery, useMutation } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface InfluencerLoginRecord {
  id: string;
  tenant_id: string;
  influencer_id: string;
  success: boolean;
  failure_reason: string | null;
  identifier_type: string | null;
  verification_method: string | null;
  user_agent: string | null;
  screen_resolution: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface LoginStats {
  total: number;
  ultimoAcesso: string | null;
  acessosEsteMes: number;
  tentativasFalhadas: number;
}

interface RecordLoginParams {
  tenant_id: string;
  influencer_id: string;
  success: boolean;
  failure_reason?: string;
  identifier_type?: string;
  verification_method?: string;
}

function parseUserAgent(ua: string | null): string {
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
 * Hook para histórico de login de influenciadoras (admin view)
 */
export function useInfluencerLoginHistoryMT(influencerId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const { data: loginHistory, isLoading } = useQuery({
    queryKey: ['mt-influencer-login-history', influencerId, tenant?.id],
    queryFn: async (): Promise<InfluencerLoginRecord[]> => {
      if (!influencerId) return [];

      let query = supabase
        .from('mt_influencer_login_history')
        .select('*')
        .eq('influencer_id', influencerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InfluencerLoginRecord[];
    },
    enabled: !isTenantLoading && !!influencerId && (!!tenant || accessLevel === 'platform'),
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
 * Hook para registrar login (usado pelo auth hook, funciona como anon)
 */
export function useRecordInfluencerLogin() {
  const recordLogin = useMutation({
    mutationFn: async (params: RecordLoginParams) => {
      const { data, error } = await supabase.rpc('record_influencer_login', {
        p_tenant_id: params.tenant_id,
        p_influencer_id: params.influencer_id,
        p_success: params.success,
        p_failure_reason: params.failure_reason || null,
        p_identifier_type: params.identifier_type || null,
        p_verification_method: params.verification_method || null,
        p_user_agent: navigator.userAgent,
        p_screen_resolution: `${screen.width}x${screen.height}`,
      });
      if (error) throw error;
      return data;
    },
  });

  return recordLogin;
}

/**
 * Fire-and-forget: registra login sem bloquear o fluxo
 */
export function fireAndForgetLoginRecord(params: RecordLoginParams) {
  supabase
    .rpc('record_influencer_login', {
      p_tenant_id: params.tenant_id,
      p_influencer_id: params.influencer_id,
      p_success: params.success,
      p_failure_reason: params.failure_reason || null,
      p_identifier_type: params.identifier_type || null,
      p_verification_method: params.verification_method || null,
      p_user_agent: navigator.userAgent,
      p_screen_resolution: `${screen.width}x${screen.height}`,
    })
    .then(() => {})
    .catch((err) => console.error('[LoginHistory] Erro ao registrar:', err));
}
