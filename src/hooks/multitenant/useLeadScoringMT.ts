// =============================================================================
// USE LEAD SCORING MT - Hook Multi-Tenant para Lead Scoring
// =============================================================================
//
// Tabelas: mt_lead_scoring_rules, mt_lead_scores, mt_lead_scoring_config,
//          mt_lead_score_history
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export type ScoringCategory = 'demografico' | 'comportamental' | 'engajamento' | 'temporal';
export type ScoringOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'not_null' | 'is_null' | 'contains' | 'older_than' | 'newer_than';
export type LeadTemperatura = 'frio' | 'morno' | 'quente';

export interface ScoringCondition {
  campo: string;
  operador: ScoringOperator;
  valor?: string | number | boolean;
}

export interface ScoringRule {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string;
  categoria: ScoringCategory;
  condicao: ScoringCondition;
  pontos: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadScore {
  id: string;
  tenant_id: string;
  lead_id: string;
  score_total: number;
  score_demografico: number;
  score_comportamental: number;
  score_engajamento: number;
  score_intencao: number;
  classificacao: LeadTemperatura;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScoreHistoryEntry {
  id: string;
  tenant_id: string;
  lead_id: string;
  score_anterior: number;
  score_novo: number;
  motivo: string;
  regra_id?: string;
  created_at: string;
}

export interface ScoringConfig {
  id: string;
  tenant_id: string;
  peso_demografico: number;
  peso_comportamental: number;
  peso_engajamento: number;
  peso_temporal: number;
  threshold_frio: number;   // 0-30
  threshold_morno: number;  // 31-60
  // quente: acima de threshold_morno
  auto_recalculate: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HOOK: useScoringRulesMT - CRUD para regras de scoring
// =============================================================================

export function useScoringRulesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-scoring-rules', tenant?.id],
    queryFn: async (): Promise<ScoringRule[]> => {
      let q = supabase
        .from('mt_lead_scoring_rules')
        .select('*')
        .order('categoria', { ascending: true })
        .order('pontos', { ascending: false });

      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ScoringRule[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<ScoringRule>): Promise<ScoringRule> => {
      const { data, error } = await supabase
        .from('mt_lead_scoring_rules')
        .insert({
          tenant_id: tenant?.id,
          nome: rule.nome,
          descricao: rule.descricao || null,
          categoria: rule.categoria || 'demografico',
          condicao: rule.condicao,
          pontos: rule.pontos || 0,
          is_active: rule.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-scoring-rules'] });
      toast.success('Regra de scoring criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScoringRule> & { id: string }): Promise<ScoringRule> => {
      const { data, error } = await supabase
        .from('mt_lead_scoring_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ScoringRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-scoring-rules'] });
      toast.success('Regra atualizada!');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_lead_scoring_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-scoring-rules'] });
      toast.success('Regra removida!');
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('mt_lead_scoring_rules')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-scoring-rules'] });
    },
  });

  return {
    rules: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}

// =============================================================================
// HOOK: useScoringConfigMT - Configuracao de pesos e thresholds
// =============================================================================

export function useScoringConfigMT() {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-scoring-config', tenant?.id],
    queryFn: async (): Promise<ScoringConfig | null> => {
      if (!tenant?.id) return null;

      const { data, error } = await supabase
        .from('mt_lead_scoring_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data as ScoringConfig | null;
    },
    enabled: !isTenantLoading && !!tenant,
  });

  const updateConfig = useMutation({
    mutationFn: async (config: Partial<ScoringConfig>): Promise<ScoringConfig> => {
      if (!tenant?.id) throw new Error('Tenant nao definido');

      // Upsert: cria se nao existe, atualiza se existe
      const { data, error } = await supabase
        .from('mt_lead_scoring_config')
        .upsert({
          tenant_id: tenant.id,
          peso_demografico: config.peso_demografico ?? 1,
          peso_comportamental: config.peso_comportamental ?? 1,
          peso_engajamento: config.peso_engajamento ?? 1,
          peso_temporal: config.peso_temporal ?? 1,
          threshold_frio: config.threshold_frio ?? 30,
          threshold_morno: config.threshold_morno ?? 60,
          auto_recalculate: config.auto_recalculate ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;
      return data as ScoringConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-scoring-config'] });
      toast.success('Configuracao de scoring atualizada!');
    },
  });

  // Defaults se nao existe config
  const config: ScoringConfig = query.data || {
    id: '',
    tenant_id: tenant?.id || '',
    peso_demografico: 1,
    peso_comportamental: 1,
    peso_engajamento: 1,
    peso_temporal: 1,
    threshold_frio: 30,
    threshold_morno: 60,
    auto_recalculate: true,
    created_at: '',
    updated_at: '',
  };

  return {
    config,
    isLoading: query.isLoading || isTenantLoading,
    updateConfig,
  };
}

// =============================================================================
// HOOK: useLeadScoreMT - Score atual + historico de um lead
// =============================================================================

export function useLeadScoreMT(leadId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const scoreQuery = useQuery({
    queryKey: ['mt-lead-score', leadId],
    queryFn: async (): Promise<LeadScore | null> => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('mt_lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as LeadScore | null;
    },
    enabled: !!leadId && !isTenantLoading,
  });

  const historyQuery = useQuery({
    queryKey: ['mt-lead-score-history', leadId, tenant?.id],
    queryFn: async (): Promise<ScoreHistoryEntry[]> => {
      if (!leadId) return [];

      let q = supabase
        .from('mt_lead_score_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (tenant?.id) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ScoreHistoryEntry[];
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    score: scoreQuery.data,
    history: historyQuery.data || [],
    isLoading: scoreQuery.isLoading || historyQuery.isLoading || isTenantLoading,
    error: scoreQuery.error || historyQuery.error,
  };
}

// =============================================================================
// HOOK: useRecalculateScoreMT - Recalcula score de um lead
// =============================================================================

export function useRecalculateScoreMT() {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string): Promise<LeadScore> => {
      if (!tenant?.id) throw new Error('Tenant nao definido');

      // 1. Buscar lead
      const { data: lead, error: leadError } = await supabase
        .from('mt_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) throw new Error('Lead nao encontrado');

      // 2. Buscar regras ativas
      const { data: rules } = await supabase
        .from('mt_lead_scoring_rules')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true);

      if (!rules || rules.length === 0) {
        throw new Error('Nenhuma regra de scoring ativa');
      }

      // 3. Buscar config de pesos
      const { data: config } = await supabase
        .from('mt_lead_scoring_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      const pesos = {
        demografico: config?.peso_demografico ?? 1,
        comportamental: config?.peso_comportamental ?? 1,
        engajamento: config?.peso_engajamento ?? 1,
        temporal: config?.peso_temporal ?? 1,
      };

      const thresholds = {
        frio: config?.threshold_frio ?? 30,
        morno: config?.threshold_morno ?? 60,
      };

      // 4. Avaliar cada regra
      const scores: Record<ScoringCategory, number> = {
        demografico: 0,
        comportamental: 0,
        engajamento: 0,
        temporal: 0,
      };

      for (const rule of rules) {
        const condicao = rule.condicao as ScoringCondition;
        const match = evaluateCondition(lead, condicao);

        if (match) {
          const cat = rule.categoria as ScoringCategory;
          scores[cat] += rule.pontos;
        }
      }

      // 5. Aplicar pesos
      const scoreTotal = Math.round(
        scores.demografico * pesos.demografico +
        scores.comportamental * pesos.comportamental +
        scores.engajamento * pesos.engajamento +
        scores.temporal * pesos.temporal
      );

      // 6. Determinar temperatura
      let temperatura: LeadTemperatura = 'frio';
      if (scoreTotal > thresholds.morno) {
        temperatura = 'quente';
      } else if (scoreTotal > thresholds.frio) {
        temperatura = 'morno';
      }

      // 7. Buscar score anterior
      const { data: previousScore } = await supabase
        .from('mt_lead_scores')
        .select('score_total')
        .eq('lead_id', leadId)
        .maybeSingle();

      const scoreAnterior = previousScore?.score_total ?? 0;

      // 8. Upsert score
      const { data: newScore, error: scoreError } = await supabase
        .from('mt_lead_scores')
        .upsert({
          tenant_id: tenant.id,
          lead_id: leadId,
          score_total: scoreTotal,
          score_demografico: Math.round(scores.demografico * pesos.demografico),
          score_comportamental: Math.round(scores.comportamental * pesos.comportamental),
          score_engajamento: Math.round(scores.engajamento * pesos.engajamento),
          score_intencao: Math.round(scores.temporal * pesos.temporal),
          classificacao: temperatura,
          calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'lead_id' })
        .select()
        .single();

      if (scoreError) throw scoreError;

      // 9. Registrar historico
      if (scoreAnterior !== scoreTotal) {
        await supabase.from('mt_lead_score_history').insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          score_anterior: scoreAnterior,
          score_novo: scoreTotal,
          motivo: `Recalculo ${rules.length} regras avaliadas`,
        });
      }

      // 10. Atualizar score e temperatura no lead
      await supabase
        .from('mt_leads')
        .update({
          score: scoreTotal,
          temperatura,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      return newScore as LeadScore;
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['mt-lead-score', leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-score-history', leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao recalcular score:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// =============================================================================
// HELPERS
// =============================================================================

function evaluateCondition(lead: Record<string, unknown>, condicao: ScoringCondition): boolean {
  const fieldValue = lead[condicao.campo];

  switch (condicao.operador) {
    case 'not_null':
      return fieldValue != null && fieldValue !== '' && fieldValue !== 0;

    case 'is_null':
      return fieldValue == null || fieldValue === '' || fieldValue === 0;

    case 'equals':
      return String(fieldValue) === String(condicao.valor);

    case 'not_equals':
      return String(fieldValue) !== String(condicao.valor);

    case 'greater_than':
      return Number(fieldValue || 0) > Number(condicao.valor || 0);

    case 'less_than':
      return Number(fieldValue || 0) < Number(condicao.valor || 0);

    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(condicao.valor || '').toLowerCase());

    case 'older_than': {
      // valor = "30d" (30 dias)
      if (!fieldValue) return false; // sem data = nao pode afirmar que e antigo
      const dateValue = new Date(fieldValue as string);
      const daysStr = String(condicao.valor || '0d').replace('d', '');
      const days = parseInt(daysStr);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - days);
      return dateValue < threshold;
    }

    case 'newer_than': {
      if (!fieldValue) return false;
      const dateValue = new Date(fieldValue as string);
      const daysStr = String(condicao.valor || '0d').replace('d', '');
      const days = parseInt(daysStr);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - days);
      return dateValue >= threshold;
    }

    default:
      return false;
  }
}

export default useScoringRulesMT;
