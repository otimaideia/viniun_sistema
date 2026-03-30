// Hook para gerenciar A/B Tests de formulários

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  FormularioABTest,
  FormularioABVariante,
} from '@/types/formulario';

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

export function useFormularioABTest(options: UseFormularioABTestOptions = {}) {
  const [tests, setTests] = useState<FormularioABTest[]>([]);
  const [currentTest, setCurrentTest] = useState<FormularioABTest | null>(null);
  const [testStats, setTestStats] = useState<ABTestStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os testes de um formulário
  const fetchTests = useCallback(async () => {
    if (!options.formularioId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('*')
        .eq('formulario_original_id', options.formularioId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTests(data || []);
    } catch (err) {
      console.error('Erro ao buscar A/B tests:', err);
      setError('Erro ao carregar testes A/B');
    } finally {
      setLoading(false);
    }
  }, [options.formularioId]);

  // Buscar um teste específico
  const fetchTest = useCallback(async () => {
    if (!options.testId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('*')
        .eq('id', options.testId)
        .single();

      if (fetchError) throw fetchError;

      setCurrentTest(data);

      // Buscar estatísticas do teste
      await fetchTestStats(options.testId);
    } catch (err) {
      console.error('Erro ao buscar A/B test:', err);
      setError('Erro ao carregar teste A/B');
    } finally {
      setLoading(false);
    }
  }, [options.testId]);

  // Buscar estatísticas de um teste
  const fetchTestStats = async (testId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_ab_test_stats', {
        p_test_id: testId,
      });

      if (rpcError) {
        // Fallback: calcular manualmente
        await calculateTestStatsManually(testId);
        return;
      }

      setTestStats(data || []);
    } catch (err) {
      console.error('Erro ao buscar estatísticas do teste:', err);
      await calculateTestStatsManually(testId);
    }
  };

  // Calcular estatísticas manualmente (fallback)
  const calculateTestStatsManually = async (testId: string) => {
    try {
      // Buscar variantes do teste
      const { data: test } = await supabase
        .from('mt_form_ab_tests')
        .select('variantes')
        .eq('id', testId)
        .single();

      if (!test?.variantes) return;

      const stats: ABTestStats[] = [];

      for (const variante of test.variantes as FormularioABVariante[]) {
        // Buscar eventos de analytics para cada variante
        const { data: events } = await supabase
          .from('mt_form_analytics')
          .select('evento, tempo_total_segundos')
          .eq('variante_id', variante.formulario_id);

        const views = events?.filter((e) => e.evento === 'view').length || 0;
        const submits = events?.filter((e) => e.evento === 'submit').length || 0;
        const submitTimes = events?.filter((e) => e.evento === 'submit' && e.tempo_total_segundos) || [];
        const avgTime =
          submitTimes.length > 0
            ? submitTimes.reduce((sum, e) => sum + (e.tempo_total_segundos || 0), 0) / submitTimes.length
            : 0;

        stats.push({
          variante_id: variante.formulario_id,
          variante_nome: variante.nome,
          views,
          submits,
          conversion_rate: views > 0 ? (submits / views) * 100 : 0,
          avg_time_seconds: avgTime,
        });
      }

      setTestStats(stats);
    } catch (err) {
      console.error('Erro ao calcular estatísticas:', err);
    }
  };

  // Criar um novo teste A/B
  const createTest = async (data: {
    nome: string;
    descricao?: string;
    metrica_principal: 'conversion_rate' | 'avg_time' | 'abandonment_rate';
    duracao_dias?: number;
    min_submissoes?: number;
  }): Promise<FormularioABTest | null> => {
    if (!options.formularioId) return null;

    try {
      const { data: test, error: insertError } = await supabase
        .from('mt_form_ab_tests')
        .insert({
          formulario_original_id: options.formularioId,
          ...data,
          status: 'rascunho',
          variantes: [],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchTests();
      return test;
    } catch (err) {
      console.error('Erro ao criar teste A/B:', err);
      throw err;
    }
  };

  // Adicionar variante ao teste
  const addVariante = async (
    testId: string,
    varianteData: {
      formularioId: string;
      nome: string;
      peso: number;
    }
  ): Promise<boolean> => {
    try {
      // Buscar teste atual
      const { data: test, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('variantes')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;

      const variantes = (test?.variantes as FormularioABVariante[]) || [];

      // Adicionar nova variante
      const newVariante: Partial<FormularioABVariante> = {
        id: crypto.randomUUID(),
        ab_test_id: testId,
        formulario_id: varianteData.formularioId,
        nome: varianteData.nome,
        peso: varianteData.peso,
        views: 0,
        submits: 0,
        conversion_rate: 0,
        avg_time_seconds: 0,
      };

      variantes.push(newVariante as FormularioABVariante);

      // Atualizar teste
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({ variantes })
        .eq('id', testId);

      if (updateError) throw updateError;

      // Marcar formulário como variante
      await supabase
        .from('mt_forms')
        .update({
          variante_pai_id: options.formularioId,
          variante_nome: varianteData.nome,
          variante_peso: varianteData.peso,
        })
        .eq('id', varianteData.formularioId);

      await fetchTest();
      return true;
    } catch (err) {
      console.error('Erro ao adicionar variante:', err);
      return false;
    }
  };

  // Remover variante do teste
  const removeVariante = async (testId: string, varianteId: string): Promise<boolean> => {
    try {
      // Buscar teste atual
      const { data: test, error: fetchError } = await supabase
        .from('mt_form_ab_tests')
        .select('variantes')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;

      let variantes = (test?.variantes as FormularioABVariante[]) || [];

      // Encontrar variante para remover
      const varianteToRemove = variantes.find((v) => v.id === varianteId);

      // Remover variante da lista
      variantes = variantes.filter((v) => v.id !== varianteId);

      // Atualizar teste
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({ variantes })
        .eq('id', testId);

      if (updateError) throw updateError;

      // Limpar marcação de variante no formulário
      if (varianteToRemove) {
        await supabase
          .from('mt_forms')
          .update({
            variante_pai_id: null,
            variante_nome: null,
            variante_peso: null,
          })
          .eq('id', varianteToRemove.formulario_id);
      }

      await fetchTest();
      return true;
    } catch (err) {
      console.error('Erro ao remover variante:', err);
      return false;
    }
  };

  // Iniciar teste
  const startTest = async (testId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({
          status: 'ativo',
          inicio_at: new Date().toISOString(),
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('Erro ao iniciar teste:', err);
      return false;
    }
  };

  // Pausar teste
  const pauseTest = async (testId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({ status: 'pausado' })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('Erro ao pausar teste:', err);
      return false;
    }
  };

  // Finalizar teste
  const finishTest = async (testId: string, vencedorId?: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('mt_form_ab_tests')
        .update({
          status: 'finalizado',
          fim_at: new Date().toISOString(),
          vencedor_id: vencedorId,
        })
        .eq('id', testId);

      if (updateError) throw updateError;

      await fetchTest();
      return true;
    } catch (err) {
      console.error('Erro ao finalizar teste:', err);
      return false;
    }
  };

  // Deletar teste
  const deleteTest = async (testId: string): Promise<boolean> => {
    try {
      // Primeiro, limpar variantes nos formulários
      const { data: test } = await supabase
        .from('mt_form_ab_tests')
        .select('variantes')
        .eq('id', testId)
        .single();

      if (test?.variantes) {
        for (const variante of test.variantes as FormularioABVariante[]) {
          await supabase
            .from('mt_forms')
            .update({
              variante_pai_id: null,
              variante_nome: null,
              variante_peso: null,
            })
            .eq('id', variante.formulario_id);
        }
      }

      // Deletar teste
      const { error: deleteError } = await supabase
        .from('mt_form_ab_tests')
        .delete()
        .eq('id', testId);

      if (deleteError) throw deleteError;

      await fetchTests();
      return true;
    } catch (err) {
      console.error('Erro ao deletar teste:', err);
      return false;
    }
  };

  // Selecionar variante para exibição (distribuição de tráfego)
  const selectVariante = async (formularioOriginalId: string): Promise<string | null> => {
    try {
      // Tentar usar RPC function
      const { data, error: rpcError } = await supabase.rpc('select_ab_variante', {
        p_formulario_id: formularioOriginalId,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      console.error('Erro ao selecionar variante:', err);
      return null;
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (options.formularioId) {
      fetchTests();
    }
  }, [options.formularioId, fetchTests]);

  useEffect(() => {
    if (options.testId) {
      fetchTest();
    }
  }, [options.testId, fetchTest]);

  return {
    tests,
    currentTest,
    testStats,
    loading,
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
  };
}

export default useFormularioABTest;
