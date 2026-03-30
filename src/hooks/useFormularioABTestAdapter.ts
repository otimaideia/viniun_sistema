// =============================================================================
// USE FORMULARIO AB TEST ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para A/B Tests de formulários usando tabelas MT
// SISTEMA 100% MT - Usa mt_form_ab_tests e mt_form_analytics diretamente
//
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type {
  FormularioABTest,
  FormularioABVariante,
} from '@/types/formulario';

// =============================================================================
// Types
// =============================================================================

interface UseFormularioABTestOptions {
  formularioId?: string;
  testId?: string;
}

interface ABTestStats {
  variante_id: string;
  variante_nome: string;
  views: number;
  submits: number;
  conversion_rate: number;
  avg_time_seconds: number;
}

interface MTFormABTest {
  id: string;
  tenant_id: string;
  form_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'finished';
  primary_metric: string;
  duration_days: number | null;
  min_submissions: number | null;
  variants: MTFormABVariant[];
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MTFormABVariant {
  id: string;
  form_id: string;
  name: string;
  weight: number;
  views: number;
  submits: number;
  conversion_rate: number;
  avg_time_seconds: number;
}

// =============================================================================
// Mapper: MT → Legacy format
// =============================================================================

function mapMTToLegacy(test: MTFormABTest): FormularioABTest {
  return {
    id: test.id,
    formulario_original_id: test.form_id,
    nome: test.name,
    descricao: test.description,
    status: test.status === 'draft' ? 'rascunho' :
            test.status === 'active' ? 'ativo' :
            test.status === 'paused' ? 'pausado' : 'finalizado',
    metrica_principal: test.primary_metric as 'conversion_rate' | 'avg_time' | 'abandonment_rate',
    duracao_dias: test.duration_days,
    min_submissoes: test.min_submissions,
    variantes: (test.variants || []).map((v) => ({
      id: v.id,
      ab_test_id: test.id,
      formulario_id: v.form_id,
      nome: v.name,
      peso: v.weight,
      views: v.views,
      submits: v.submits,
      conversion_rate: v.conversion_rate,
      avg_time_seconds: v.avg_time_seconds,
    })),
    vencedor_id: test.winner_id,
    inicio_at: test.started_at,
    fim_at: test.finished_at,
    created_at: test.created_at,
    updated_at: test.updated_at,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useFormularioABTestAdapter(options: UseFormularioABTestOptions = {}) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const [tests, setTests] = useState<FormularioABTest[]>([]);
  const [currentTest, setCurrentTest] = useState<FormularioABTest | null>(null);
  const [testStats, setTestStats] = useState<ABTestStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Fetch All Tests for a Form
  // ==========================================================================
  const fetchTests = useCallback(async () => {
    if (!options.formularioId) return;
    if (isTenantLoading) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_form_ab_tests')
        .select('*')
        .eq('form_id', options.formularioId)
        .order('created_at', { ascending: false });

      // Filter by tenant access
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // If table doesn't exist, return empty
        if (fetchError.code === '42P01') {
          console.warn('[MT] mt_form_ab_tests table not found');
          setTests([]);
          return;
        }
        throw fetchError;
      }

      setTests((data || []).map((t) => mapMTToLegacy(t as MTFormABTest)));
    } catch (err) {
      console.error('[MT] Erro ao buscar A/B tests:', err);
      setError('Erro ao carregar testes A/B');
    } finally {
      setLoading(false);
    }
  }, [options.formularioId, tenant, accessLevel, isTenantLoading]);

  // ==========================================================================
  // Fetch Single Test
  // ==========================================================================
  const fetchTest = useCallback(async () => {
    if (!options.testId) return;
    if (isTenantLoading) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('*')
        .eq('id', options.testId)
        .single();

      if (fetchError) throw fetchError;

      setCurrentTest(mapMTToLegacy(data as MTFormABTest));

      // Fetch test stats
      await fetchTestStats(options.testId);
    } catch (err) {
      console.error('[MT] Erro ao buscar A/B test:', err);
      setError('Erro ao carregar teste A/B');
    } finally {
      setLoading(false);
    }
  }, [options.testId, isTenantLoading]);

  // ==========================================================================
  // Fetch Test Stats
  // ==========================================================================
  const fetchTestStats = async (testId: string) => {
    try {
      // Try to use RPC function first
      const { data, error: rpcError } = await supabase.rpc('get_ab_test_stats', {
        p_test_id: testId,
      });

      if (rpcError) {
        // Fallback: calculate manually
        await calculateTestStatsManually(testId);
        return;
      }

      setTestStats(data || []);
    } catch (err) {
      console.error('[MT] Erro ao buscar estatísticas do teste:', err);
      await calculateTestStatsManually(testId);
    }
  };

  // ==========================================================================
  // Calculate Stats Manually (Fallback)
  // ==========================================================================
  const calculateTestStatsManually = async (testId: string) => {
    try {
      // Fetch test variants
      const { data: test } = await supabase
        .from('mt_form_ab_tests')
        .select('variants')
        .eq('id', testId)
        .single();

      if (!test?.variants) return;

      const stats: ABTestStats[] = [];

      for (const variante of test.variants as MTFormABVariant[]) {
        // Fetch analytics events for each variant
        const { data: events } = await supabase
          .from('mt_form_analytics')
          .select('event_type, time_spent_seconds')
          .eq('variant_id', variante.form_id);

        const views = events?.filter((e) => e.event_type === 'view').length || 0;
        const submits = events?.filter((e) => e.event_type === 'submit').length || 0;
        const submitTimes = events?.filter((e) => e.event_type === 'submit' && e.time_spent_seconds) || [];
        const avgTime =
          submitTimes.length > 0
            ? submitTimes.reduce((sum, e) => sum + (e.time_spent_seconds || 0), 0) / submitTimes.length
            : 0;

        stats.push({
          variante_id: variante.form_id,
          variante_nome: variante.name,
          views,
          submits,
          conversion_rate: views > 0 ? (submits / views) * 100 : 0,
          avg_time_seconds: avgTime,
        });
      }

      setTestStats(stats);
    } catch (err) {
      console.error('[MT] Erro ao calcular estatísticas:', err);
    }
  };

  // ==========================================================================
  // Create New A/B Test
  // ==========================================================================
  const createTest = async (data: {
    nome: string;
    descricao?: string;
    metrica_principal: 'conversion_rate' | 'avg_time' | 'abandonment_rate';
    duracao_dias?: number;
    min_submissoes?: number;
  }): Promise<FormularioABTest | null> => {
    if (!options.formularioId || !tenant) return null;

    try {
      const { data: test, error: insertError } = await supabase
        .from('mt_form_ab_tests')
        .insert({
          tenant_id: tenant.id,
          form_id: options.formularioId,
          name: data.nome,
          description: data.descricao || null,
          primary_metric: data.metrica_principal,
          duration_days: data.duracao_dias || null,
          min_submissions: data.min_submissoes || null,
          status: 'draft',
          variants: [],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchTests();
      return mapMTToLegacy(test as MTFormABTest);
    } catch (err) {
      console.error('[MT] Erro ao criar teste A/B:', err);
      throw err;
    }
  };

  // ==========================================================================
  // Add Variant to Test
  // ==========================================================================
  const addVariante = async (
    testId: string,
    varianteData: {
      formularioId: string;
      nome: string;
      peso: number;
    }
  ): Promise<boolean> => {
    try {
      // Fetch current test
      const { data: test, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('variants')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;

      const variants = (test?.variants as MTFormABVariant[]) || [];

      // Add new variant
      const newVariant: MTFormABVariant = {
        id: crypto.randomUUID(),
        form_id: varianteData.formularioId,
        name: varianteData.nome,
        weight: varianteData.peso,
        views: 0,
        submits: 0,
        conversion_rate: 0,
        avg_time_seconds: 0,
      };

      variants.push(newVariant);

      // Update test
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({ variants, updated_at: new Date().toISOString() })
        .eq('id', testId);

      if (updateError) throw updateError;

      // Mark form as variant
      await supabase
        .from('mt_forms')
        .update({
          variant_parent_id: options.formularioId,
          variant_name: varianteData.nome,
          variant_weight: varianteData.peso,
        })
        .eq('id', varianteData.formularioId);

      await fetchTest();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao adicionar variante:', err);
      return false;
    }
  };

  // ==========================================================================
  // Remove Variant from Test
  // ==========================================================================
  const removeVariante = async (testId: string, varianteId: string): Promise<boolean> => {
    try {
      // Fetch current test
      const { data: test, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('variants')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;

      let variants = (test?.variants as MTFormABVariant[]) || [];

      // Find variant to remove
      const variantToRemove = variants.find((v) => v.id === varianteId);

      // Remove variant from list
      variants = variants.filter((v) => v.id !== varianteId);

      // Update test
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({ variants, updated_at: new Date().toISOString() })
        .eq('id', testId);

      if (updateError) throw updateError;

      // Clear variant marking on form
      if (variantToRemove) {
        await supabase
          .from('mt_forms')
          .update({
            variant_parent_id: null,
            variant_name: null,
            variant_weight: null,
          })
          .eq('id', variantToRemove.form_id);
      }

      await fetchTest();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao remover variante:', err);
      return false;
    }
  };

  // ==========================================================================
  // Start Test
  // ==========================================================================
  const startTest = async (testId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao iniciar teste:', err);
      return false;
    }
  };

  // ==========================================================================
  // Pause Test
  // ==========================================================================
  const pauseTest = async (testId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao pausar teste:', err);
      return false;
    }
  };

  // ==========================================================================
  // Finish Test
  // ==========================================================================
  const finishTest = async (testId: string, vencedorId?: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          winner_id: vencedorId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao finalizar teste:', err);
      return false;
    }
  };

  // ==========================================================================
  // Delete Test
  // ==========================================================================
  const deleteTest = async (testId: string): Promise<boolean> => {
    try {
      // First, clear variant markings on forms
      const { data: test } = await supabase
        .from('mt_form_ab_tests')
        .select('variants')
        .eq('id', testId)
        .single();

      if (test?.variants) {
        for (const variant of test.variants as MTFormABVariant[]) {
          await supabase
            .from('mt_forms')
            .update({
              variant_parent_id: null,
              variant_name: null,
              variant_weight: null,
            })
            .eq('id', variant.form_id);
        }
      }

      // Delete test
      const { error: deleteError } = await supabase
        .from('mt_form_ab_tests')
        .delete()
        .eq('id', testId);

      if (deleteError) throw deleteError;

      await fetchTests();
      return true;
    } catch (err) {
      console.error('[MT] Erro ao deletar teste:', err);
      return false;
    }
  };

  // ==========================================================================
  // Select Variant for Display (Traffic Distribution)
  // ==========================================================================
  const selectVariante = async (formularioOriginalId: string): Promise<string | null> => {
    try {
      // Try to use RPC function
      const { data, error: rpcError } = await supabase.rpc('select_ab_variante', {
        p_formulario_id: formularioOriginalId,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      console.error('[MT] Erro ao selecionar variante:', err);
      return null;
    }
  };

  // ==========================================================================
  // Load Initial Data
  // ==========================================================================
  useEffect(() => {
    if (options.formularioId && !isTenantLoading) {
      fetchTests();
    }
  }, [options.formularioId, fetchTests, isTenantLoading]);

  useEffect(() => {
    if (options.testId && !isTenantLoading) {
      fetchTest();
    }
  }, [options.testId, fetchTest, isTenantLoading]);

  return {
    tests,
    currentTest,
    testStats,
    loading: loading || isTenantLoading,
    error,
    fetchTests,
    fetchTest,
    createTest,
    addVariante,
    removeVariante,
    startTest,
    pauseTest,
    finishTest,
    deleteTest,
    selectVariante,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getFormularioABTestMode(): 'mt' {
  return 'mt';
}

export default useFormularioABTestAdapter;
