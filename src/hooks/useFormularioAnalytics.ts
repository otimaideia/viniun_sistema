import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  FormularioAnalytics,
  FormularioAnalyticsInsert,
  FormularioStats,
  FormularioEventoTipo,
} from '@/types/formulario';

interface UseFormularioAnalyticsOptions {
  formularioId: string;
}

export function useFormularioAnalytics({ formularioId }: UseFormularioAnalyticsOptions) {
  const { tenant, accessLevel } = useTenantContext();
  const [stats, setStats] = useState<FormularioStats | null>(null);
  const [events, setEvents] = useState<FormularioAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!formularioId) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar eventos do formulário
      let statsQuery = supabase
        .from('mt_form_analytics')
        .select('*')
        .eq('formulario_id', formularioId);

      if (accessLevel === 'tenant' && tenant) {
        statsQuery = statsQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        statsQuery = statsQuery.eq('tenant_id', tenant.id);
      }

      const { data: analyticsData, error: fetchError } = await statsQuery;

      if (fetchError) throw fetchError;

      const events = analyticsData || [];

      // Calcular estatísticas manualmente
      const total_views = events.filter(e => e.evento === 'view').length;
      const total_starts = events.filter(e => e.evento === 'start').length;
      const total_submits = events.filter(e => e.evento === 'submit').length;
      const total_abandons = events.filter(e => e.evento === 'abandon').length;

      const conversion_rate = total_views > 0 ? (total_submits / total_views) * 100 : 0;

      // Calcular tempo médio
      const submitsWithTime = events.filter(e => e.evento === 'submit' && e.tempo_total_segundos);
      const avg_time_seconds = submitsWithTime.length > 0
        ? submitsWithTime.reduce((acc, e) => acc + (e.tempo_total_segundos || 0), 0) / submitsWithTime.length
        : 0;

      // Abandonos por etapa
      const abandonmentByStep: Record<string, number> = {};
      events.filter(e => e.evento === 'abandon' && e.etapa_atual !== undefined).forEach(e => {
        const step = String(e.etapa_atual);
        abandonmentByStep[step] = (abandonmentByStep[step] || 0) + 1;
      });

      // Breakdown diário (últimos 7 dias)
      const dailyBreakdown: FormularioStats['daily_breakdown'] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayEvents = events.filter(e => e.created_at?.startsWith(dateStr));
        dailyBreakdown.push({
          date: dateStr,
          views: dayEvents.filter(e => e.evento === 'view').length,
          starts: dayEvents.filter(e => e.evento === 'start').length,
          submits: dayEvents.filter(e => e.evento === 'submit').length,
          abandons: dayEvents.filter(e => e.evento === 'abandon').length,
        });
      }

      setStats({
        total_views,
        total_starts,
        total_submits,
        total_abandons,
        conversion_rate,
        avg_time_seconds,
        abandonment_by_step: abandonmentByStep,
        daily_breakdown: dailyBreakdown,
      });
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      setError('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [formularioId, tenant, accessLevel]);

  const fetchEvents = useCallback(async (limit = 100) => {
    if (!formularioId) return;

    try {
      let eventsQuery = supabase
        .from('mt_form_analytics')
        .select('*')
        .eq('formulario_id', formularioId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (accessLevel === 'tenant' && tenant) {
        eventsQuery = eventsQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        eventsQuery = eventsQuery.eq('tenant_id', tenant.id);
      }

      const { data, error: fetchError } = await eventsQuery;

      if (fetchError) throw fetchError;

      setEvents((data || []) as FormularioAnalytics[]);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    }
  }, [formularioId, tenant, accessLevel]);

  const trackEvent = async (
    evento: FormularioEventoTipo,
    data: Partial<FormularioAnalyticsInsert> = {}
  ): Promise<void> => {
    try {
      const eventData: FormularioAnalyticsInsert = {
        formulario_id: formularioId,
        evento,
        session_id: data.session_id || generateSessionId(),
        etapa_atual: data.etapa_atual,
        tempo_total_segundos: data.tempo_total_segundos,
        ip_address: data.ip_address,
        user_agent: data.user_agent || navigator.userAgent,
        referrer: data.referrer || document.referrer,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
      };

      const { error } = await supabase
        .from('mt_form_analytics')
        .insert(eventData);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao rastrear evento:', err);
      // Não lançar erro para não interromper o fluxo do usuário
    }
  };

  const trackView = (sessionId?: string) => trackEvent('view', { session_id: sessionId });
  const trackStart = (sessionId?: string) => trackEvent('start', { session_id: sessionId });
  const trackStep = (etapa: number, sessionId?: string) => trackEvent('step', { etapa_atual: etapa, session_id: sessionId });
  const trackSubmit = (tempoTotal: number, sessionId?: string) => trackEvent('submit', { tempo_total_segundos: tempoTotal, session_id: sessionId });
  const trackAbandon = (etapa: number, tempoTotal: number, sessionId?: string) => trackEvent('abandon', { etapa_atual: etapa, tempo_total_segundos: tempoTotal, session_id: sessionId });

  return {
    stats,
    events,
    loading,
    error,
    fetchStats,
    fetchEvents,
    trackEvent,
    trackView,
    trackStart,
    trackStep,
    trackSubmit,
    trackAbandon,
  };
}

// Gera um ID de sessão único
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Hook para usar no formulário público (sem autenticação)
export function useFormularioPublicTracking(formularioId: string) {
  const [sessionId] = useState(() => generateSessionId());
  const [startTime] = useState(() => Date.now());

  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  };

  const trackPublicEvent = async (
    evento: FormularioEventoTipo,
    etapaAtual?: number
  ): Promise<void> => {
    const tempoTotal = Math.round((Date.now() - startTime) / 1000);
    const utmParams = getUTMParams();

    try {
      await supabase.from('mt_form_analytics').insert({
        formulario_id: formularioId,
        evento,
        session_id: sessionId,
        etapa_atual: etapaAtual,
        tempo_total_segundos: tempoTotal,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        ...utmParams,
      });
    } catch (err) {
      console.error('Erro ao rastrear evento público:', err);
    }
  };

  return {
    sessionId,
    getElapsedTime: () => Math.round((Date.now() - startTime) / 1000),
    trackView: () => trackPublicEvent('view'),
    trackStart: () => trackPublicEvent('start'),
    trackStep: (etapa: number) => trackPublicEvent('step', etapa),
    trackSubmit: () => trackPublicEvent('submit'),
    trackAbandon: (etapa: number) => trackPublicEvent('abandon', etapa),
  };
}

export default useFormularioAnalytics;
