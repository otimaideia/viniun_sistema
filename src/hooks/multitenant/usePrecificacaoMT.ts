// =============================================================================
// USE PRECIFICACAO MT - Orquestrador de Custos e Precificação
// =============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { PrecificacaoResumo, ComissaoConfig, SimuladorParams, SimuladorResultado } from '@/types/precificacao';

// -----------------------------------------------------------------------------
// Hook: usePrecificacaoListMT - Lista serviços com resumo de custos
// -----------------------------------------------------------------------------

export function usePrecificacaoListMT() {
  const [services, setServices] = useState<PrecificacaoResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_services')
        .select('id, nome, categoria, duracao_minutos, custo_insumos, custo_mao_obra, custo_fixo_rateado, custo_total_sessao, preco_tabela_maior, preco_tabela_menor, margem_maior, margem_menor, is_active')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('nome', { ascending: true });

      if (tenant?.id && accessLevel !== 'platform') {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const resumos: PrecificacaoResumo[] = (data || []).map((svc: any) => {
        const custoInsumos = svc.custo_insumos || 0;
        const custoMaoObra = svc.custo_mao_obra || 0;
        const custoFixo = svc.custo_fixo_rateado || 0;
        const custoTotal = custoInsumos + custoMaoObra + custoFixo;
        const precoMaior = svc.preco_tabela_maior || 0;
        const precoMenor = svc.preco_tabela_menor || 0;
        const margemMaior = precoMaior ? precoMaior - custoTotal : 0;
        const margemMenor = precoMenor ? precoMenor - custoTotal : 0;

        let status: PrecificacaoResumo['status'] = 'sem_dados';
        if (custoTotal > 0 && precoMaior > 0) {
          const pct = (margemMaior / precoMaior) * 100;
          if (pct >= 40) status = 'saudavel';
          else if (pct >= 20) status = 'atencao';
          else status = 'critico';
        }

        return {
          service_id: svc.id,
          nome: svc.nome,
          categoria: svc.categoria,
          duracao_minutos: svc.duracao_minutos,
          custo_insumos: custoInsumos,
          custo_mao_obra: custoMaoObra,
          custo_fixo_rateado: custoFixo,
          custo_comissoes: 0,
          custo_impostos: 0,
          custo_total_sessao: custoTotal,
          preco_tabela_maior: svc.preco_tabela_maior,
          preco_tabela_menor: svc.preco_tabela_menor,
          margem_maior: margemMaior,
          margem_menor: margemMenor,
          margem_maior_pct: precoMaior ? (margemMaior / precoMaior) * 100 : 0,
          margem_menor_pct: precoMenor ? (margemMenor / precoMenor) * 100 : 0,
          status,
        };
      });

      setServices(resumos);
    } catch (err) {
      console.error('Erro ao carregar precificação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchServices();
  }, [fetchServices, tenant?.id, accessLevel]);

  // Métricas agregadas
  const metricas = useMemo(() => {
    const comCusto = services.filter(s => s.custo_total_sessao > 0);
    const comPreco = services.filter(s => (s.preco_tabela_maior || 0) > 0);
    const saudaveis = services.filter(s => s.status === 'saudavel').length;
    const atencao = services.filter(s => s.status === 'atencao').length;
    const criticos = services.filter(s => s.status === 'critico').length;
    const semDados = services.filter(s => s.status === 'sem_dados').length;
    const margemMedia = comPreco.length > 0
      ? comPreco.reduce((acc, s) => acc + s.margem_maior_pct, 0) / comPreco.length
      : 0;
    const custoMedio = comCusto.length > 0
      ? comCusto.reduce((acc, s) => acc + s.custo_total_sessao, 0) / comCusto.length
      : 0;

    return { total: services.length, saudaveis, atencao, criticos, semDados, margemMedia, custoMedio };
  }, [services]);

  return { services, isLoading, refetch: fetchServices, metricas };
}

// -----------------------------------------------------------------------------
// Hook: usePrecificacaoDetailMT - Detalhe completo de um serviço
// -----------------------------------------------------------------------------

export function usePrecificacaoDetailMT(serviceId?: string) {
  const [service, setService] = useState<any>(null);
  const [comissoes, setComissoes] = useState<ComissaoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchService = useCallback(async () => {
    if (!serviceId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      setService(data);

      // Commission data requires mt_service_commissions table (not yet created)
    } catch (err) {
      console.error('Erro ao carregar serviço:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  // Salvar custos fixos
  const saveCustoFixo = useCallback(async (valor: number) => {
    if (!serviceId) return;
    const { error } = await supabase
      .from('mt_services')
      .update({
        custo_fixo_rateado: valor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);

    if (error) {
      toast.error('Erro ao salvar custo fixo');
      throw error;
    }
    await fetchService();
  }, [serviceId, fetchService]);

  // Recalcular custo total e margens a partir dos vinculos reais
  const recalcularCustoTotal = useCallback(async () => {
    if (!serviceId) return;
    try {
      // Buscar precos e custo fixo do servico
      const { data: svc } = await supabase
        .from('mt_services')
        .select('custo_fixo_rateado, preco_tabela_maior, preco_tabela_menor')
        .eq('id', serviceId)
        .single();

      // Calcular custo real de insumos a partir dos vinculos
      const { data: insumos } = await supabase
        .from('mt_service_products')
        .select('quantidade, product:mt_inventory_products(custo_pix, custo_unitario_fracionado, is_fracionado)')
        .eq('service_id', serviceId);

      let custoInsumos = 0;
      (insumos || []).forEach((link: any) => {
        const p = link.product;
        if (!p) return;
        const custoUnit = p.is_fracionado && p.custo_unitario_fracionado
          ? Number(p.custo_unitario_fracionado)
          : Number(p.custo_pix || 0);
        custoInsumos += custoUnit * (link.quantidade || 0);
      });

      // Calcular custo real de mao de obra dos profissionais vinculados
      const { data: profs } = await supabase
        .from('mt_service_professionals')
        .select('custo_por_sessao')
        .eq('service_id', serviceId)
        .is('deleted_at', null);

      const custoMaoObra = (profs || []).reduce((sum: number, p: any) => sum + (Number(p.custo_por_sessao) || 0), 0);
      const custoFixo = Number((svc as any)?.custo_fixo_rateado) || 0;
      const custoTotal = custoInsumos + custoMaoObra + custoFixo;
      const precoMaior = Number((svc as any)?.preco_tabela_maior) || 0;
      const precoMenor = Number((svc as any)?.preco_tabela_menor) || 0;

      await supabase
        .from('mt_services')
        .update({
          custo_insumos: Number(custoInsumos.toFixed(2)),
          custo_mao_obra: Number(custoMaoObra.toFixed(2)),
          custo_total_sessao: Number(custoTotal.toFixed(2)),
          margem_maior: precoMaior ? Number((precoMaior - custoTotal).toFixed(2)) : null,
          margem_menor: precoMenor ? Number((precoMenor - custoTotal).toFixed(2)) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      await fetchService();
      toast.success('Custos recalculados');
    } catch (err) {
      toast.error('Erro ao recalcular');
    }
  }, [serviceId, fetchService]);

  useEffect(() => {
    if (serviceId) fetchService();
  }, [fetchService, serviceId]);

  return { service, comissoes, isLoading, refetch: fetchService, saveCustoFixo, recalcularCustoTotal };
}

// -----------------------------------------------------------------------------
// Simulador de Preço
// -----------------------------------------------------------------------------

export function calcularSimulacao(params: SimuladorParams): SimuladorResultado {
  const custoTotal = params.custo_insumos + params.custo_mao_obra + params.custo_fixo_rateado + params.custo_comissoes + params.custo_impostos;
  const margemBruta = params.preco_venda - custoTotal;
  const margemBrutaPct = params.preco_venda > 0 ? (margemBruta / params.preco_venda) * 100 : 0;
  const sessoesMes = params.sessoes_dia * params.dias_mes;
  const receitaMensal = params.preco_venda * sessoesMes;
  const custoMensal = custoTotal * sessoesMes;
  const lucroMensal = margemBruta * sessoesMes;
  const pontoEquilibrio = margemBruta > 0 ? Math.ceil(custoTotal / margemBruta) : 0;

  return {
    custo_total_sessao: custoTotal,
    margem_bruta: margemBruta,
    margem_bruta_pct: margemBrutaPct,
    ponto_equilibrio_sessoes: pontoEquilibrio,
    receita_mensal: receitaMensal,
    custo_mensal: custoMensal,
    lucro_mensal: lucroMensal,
  };
}
