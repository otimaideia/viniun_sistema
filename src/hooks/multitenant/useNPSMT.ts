import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// TIPOS
// =============================================================================

export interface NPSSurvey {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  nome: string;
  descricao?: string;
  is_active: boolean;
  trigger_type: 'manual' | 'pos_sessao' | 'pos_avaliacao' | 'periodico';
  delay_hours: number;
  google_review_url?: string;
  avaliar_profissional: boolean;
  avaliar_consultora: boolean;
  avaliar_experiencia: boolean;
  mensagem_agradecimento?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NPSResponse {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  survey_id: string;
  appointment_id?: string;
  lead_id?: string;
  token: string;
  score: number | null;
  rating_profissional?: number;
  rating_consultora?: number;
  rating_experiencia?: number;
  comentario?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  profissional_nome?: string;
  consultora_nome?: string;
  servico_nome?: string;
  respondido_em?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Joins
  survey?: NPSSurvey;
  lead?: { id: string; nome: string; telefone?: string };
  franchise?: { id: string; codigo: string; nome: string };
}

export interface NPSMetrics {
  total_respostas: number;
  respondidas: number;
  pendentes: number;
  media_nps: number;
  promotores: number;
  neutros: number;
  detratores: number;
  nps_score: number;
  media_profissional: number;
  media_consultora: number;
  media_experiencia: number;
}

// =============================================================================
// HOOK: useNPSSurveysMT
// =============================================================================

export function useNPSSurveysMT() {
  const [surveys, setSurveys] = useState<NPSSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchSurveys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_nps_surveys' as any)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSurveys((data || []) as NPSSurvey[]);
    } catch (err) {
      console.error('Erro ao carregar NPS surveys:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar surveys'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  const createSurvey = useCallback(async (data: Partial<NPSSurvey>): Promise<NPSSurvey> => {
    const { data: created, error } = await supabase
      .from('mt_nps_surveys' as any)
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        nome: data.nome,
        descricao: data.descricao || null,
        is_active: data.is_active ?? true,
        trigger_type: data.trigger_type || 'manual',
        delay_hours: data.delay_hours || 24,
        google_review_url: data.google_review_url || null,
        avaliar_profissional: data.avaliar_profissional ?? true,
        avaliar_consultora: data.avaliar_consultora ?? false,
        avaliar_experiencia: data.avaliar_experiencia ?? true,
        mensagem_agradecimento: data.mensagem_agradecimento || null,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchSurveys();
    return created as NPSSurvey;
  }, [fetchSurveys, tenant?.id, franchise?.id]);

  const updateSurvey = useCallback(async (id: string, data: Partial<NPSSurvey>): Promise<NPSSurvey> => {
    const { data: updated, error } = await supabase
      .from('mt_nps_surveys' as any)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchSurveys();
    return updated as NPSSurvey;
  }, [fetchSurveys]);

  const deleteSurvey = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mt_nps_surveys' as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchSurveys();
  }, [fetchSurveys]);

  const toggleActive = useCallback(async (id: string, is_active: boolean): Promise<void> => {
    await updateSurvey(id, { is_active });
  }, [updateSurvey]);

  useEffect(() => {
    if (tenant?.id) {
      fetchSurveys();
    } else {
      setIsLoading(false);
      setSurveys([]);
    }
  }, [fetchSurveys, tenant?.id]);

  return {
    surveys,
    isLoading,
    error,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    toggleActive,
    refetch: fetchSurveys,
  };
}

// =============================================================================
// HOOK: useNPSResponsesMT
// =============================================================================

interface UseNPSResponsesFilters {
  survey_id?: string;
  franchise_id?: string;
  startDate?: string;
  endDate?: string;
  profissional_nome?: string;
  onlyResponded?: boolean;
}

export function useNPSResponsesMT(filters?: UseNPSResponsesFilters) {
  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchResponses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_nps_responses' as any)
        .select(`
          *,
          survey:mt_nps_surveys(id, nome, trigger_type),
          lead:mt_leads(id, nome, telefone),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      if (filters?.survey_id) {
        query = query.eq('survey_id', filters.survey_id);
      }
      if (filters?.franchise_id) {
        query = query.eq('franchise_id', filters.franchise_id);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.profissional_nome) {
        query = query.ilike('profissional_nome', `%${filters.profissional_nome}%`);
      }
      if (filters?.onlyResponded) {
        query = query.not('score', 'is', null);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setResponses((data || []) as NPSResponse[]);
    } catch (err) {
      console.error('Erro ao carregar NPS responses:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar responses'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.survey_id, filters?.franchise_id, filters?.startDate, filters?.endDate, filters?.profissional_nome, filters?.onlyResponded]);

  // Buscar resposta por token (público, sem tenant context)
  const fetchByToken = useCallback(async (token: string): Promise<NPSResponse | null> => {
    const { data, error } = await supabase
      .from('mt_nps_responses' as any)
      .select(`
        *,
        survey:mt_nps_surveys(id, nome, avaliar_profissional, avaliar_consultora, avaliar_experiencia, mensagem_agradecimento, google_review_url)
      `)
      .eq('token', token)
      .is('deleted_at', null)
      .single();

    if (error) return null;
    return data as NPSResponse;
  }, []);

  // Submeter resposta (público)
  const submitResponse = useCallback(async (token: string, data: {
    score: number;
    rating_profissional?: number;
    rating_consultora?: number;
    rating_experiencia?: number;
    comentario?: string;
  }): Promise<NPSResponse> => {
    const { data: updated, error } = await supabase
      .from('mt_nps_responses' as any)
      .update({
        score: data.score,
        rating_profissional: data.rating_profissional || null,
        rating_consultora: data.rating_consultora || null,
        rating_experiencia: data.rating_experiencia || null,
        comentario: data.comentario || null,
        respondido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('token', token)
      .select()
      .single();

    if (error) throw error;
    return updated as NPSResponse;
  }, []);

  // Criar resposta pendente (para envio)
  const createResponse = useCallback(async (data: Partial<NPSResponse>): Promise<NPSResponse> => {
    const token = crypto.randomUUID();
    const { data: created, error } = await supabase
      .from('mt_nps_responses' as any)
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        survey_id: data.survey_id,
        appointment_id: data.appointment_id || null,
        lead_id: data.lead_id || null,
        token,
        cliente_nome: data.cliente_nome || null,
        cliente_telefone: data.cliente_telefone || null,
        profissional_nome: data.profissional_nome || null,
        consultora_nome: data.consultora_nome || null,
        servico_nome: data.servico_nome || null,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchResponses();
    return created as NPSResponse;
  }, [fetchResponses, tenant?.id, franchise?.id]);

  useEffect(() => {
    if (tenant?.id) {
      fetchResponses();
    } else {
      setIsLoading(false);
      setResponses([]);
    }
  }, [fetchResponses, tenant?.id]);

  // Calcular métricas
  const responded = responses.filter(r => r.score !== null);
  const metrics: NPSMetrics = {
    total_respostas: responses.length,
    respondidas: responded.length,
    pendentes: responses.length - responded.length,
    media_nps: responded.length > 0
      ? responded.reduce((acc, r) => acc + (r.score || 0), 0) / responded.length
      : 0,
    promotores: responded.filter(r => (r.score || 0) >= 9).length,
    neutros: responded.filter(r => (r.score || 0) >= 7 && (r.score || 0) <= 8).length,
    detratores: responded.filter(r => (r.score || 0) <= 6).length,
    nps_score: responded.length > 0
      ? Math.round(
          ((responded.filter(r => (r.score || 0) >= 9).length -
            responded.filter(r => (r.score || 0) <= 6).length) /
            responded.length) * 100
        )
      : 0,
    media_profissional: responded.filter(r => r.rating_profissional).length > 0
      ? responded.filter(r => r.rating_profissional).reduce((acc, r) => acc + (r.rating_profissional || 0), 0) /
        responded.filter(r => r.rating_profissional).length
      : 0,
    media_consultora: responded.filter(r => r.rating_consultora).length > 0
      ? responded.filter(r => r.rating_consultora).reduce((acc, r) => acc + (r.rating_consultora || 0), 0) /
        responded.filter(r => r.rating_consultora).length
      : 0,
    media_experiencia: responded.filter(r => r.rating_experiencia).length > 0
      ? responded.filter(r => r.rating_experiencia).reduce((acc, r) => acc + (r.rating_experiencia || 0), 0) /
        responded.filter(r => r.rating_experiencia).length
      : 0,
  };

  return {
    responses,
    metrics,
    isLoading,
    error,
    fetchByToken,
    submitResponse,
    createResponse,
    refetch: fetchResponses,
  };
}

export default useNPSSurveysMT;
