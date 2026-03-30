import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { PriceComplianceMetrics, PriceComplianceItem } from '@/types/vendas';

interface ComplianceFilters {
  date_from?: string;
  date_to?: string;
  franchise_id?: string;
}

export interface ServiceComplianceRow {
  service_nome: string;
  preco_tabela: number;
  preco_piso: number;
  preco_medio_vendido: number;
  total_vendido: number;
  quantidade_vendas: number;
  vendas_abaixo_piso: number;
  margem_media_pct: number;
}

export function usePriceComplianceMT(filters?: ComplianceFilters) {
  const [metrics, setMetrics] = useState<PriceComplianceMetrics | null>(null);
  const [belowFloorSales, setBelowFloorSales] = useState<PriceComplianceItem[]>([]);
  const [revenueByService, setRevenueByService] = useState<Array<{ service_nome: string; total: number; quantidade: number }>>([]);
  const [serviceCompliance, setServiceCompliance] = useState<ServiceComplianceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchCompliance = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch completed sales with items
      let salesQuery = supabase
        .from('mt_sales')
        .select('id, valor_total, custo_total, margem, forma_pagamento, tipo_parcelamento, abaixo_piso, justificativa_desconto, cliente_nome, created_at, profissional_id')
        .is('deleted_at', null)
        .in('status', ['concluido', 'aprovado']);

      if (tenant?.id) salesQuery = salesQuery.eq('tenant_id', tenant.id);
      if (franchise?.id && accessLevel === 'franchise') salesQuery = salesQuery.eq('franchise_id', franchise.id);
      if (filters?.franchise_id) salesQuery = salesQuery.eq('franchise_id', filters.franchise_id);
      if (filters?.date_from) salesQuery = salesQuery.gte('created_at', filters.date_from);
      if (filters?.date_to) salesQuery = salesQuery.lte('created_at', filters.date_to);

      const { data: salesData } = await salesQuery;
      const sales = (salesData || []) as any[];

      if (sales.length === 0) {
        setMetrics({
          total_vendas: 0,
          vendas_acima_piso: 0,
          vendas_abaixo_piso: 0,
          percentual_compliance: 100,
          percentual_recorrencia: 0,
          percentual_cartao: 0,
          ticket_medio: 0,
          margem_media: 0,
        });
        setBelowFloorSales([]);
        setRevenueByService([]);
        setServiceCompliance([]);
        setIsLoading(false);
        return;
      }

      // Calculate metrics
      const totalVendas = sales.length;
      const vendasAbaixoPiso = sales.filter(s => s.abaixo_piso === true).length;
      const vendasAcimaPiso = totalVendas - vendasAbaixoPiso;
      const vendasRecorrencia = sales.filter(s =>
        s.tipo_parcelamento === 'recorrencia_18x' ||
        s.tipo_parcelamento === 'recorrencia_mensal' ||
        s.forma_pagamento === 'recorrencia'
      ).length;
      const vendasCartao = sales.filter(s =>
        s.tipo_parcelamento === 'cartao_12x' ||
        s.forma_pagamento === 'cartao_credito' ||
        s.forma_pagamento === 'cartao_debito'
      ).length;
      const receitaTotal = sales.reduce((sum: number, s: any) => sum + (s.valor_total || 0), 0);
      const margemTotal = sales.reduce((sum: number, s: any) => sum + (s.margem || 0), 0);

      setMetrics({
        total_vendas: totalVendas,
        vendas_acima_piso: vendasAcimaPiso,
        vendas_abaixo_piso: vendasAbaixoPiso,
        percentual_compliance: totalVendas > 0 ? (vendasAcimaPiso / totalVendas) * 100 : 100,
        percentual_recorrencia: totalVendas > 0 ? (vendasRecorrencia / totalVendas) * 100 : 0,
        percentual_cartao: totalVendas > 0 ? (vendasCartao / totalVendas) * 100 : 0,
        ticket_medio: totalVendas > 0 ? receitaTotal / totalVendas : 0,
        margem_media: totalVendas > 0 ? margemTotal / totalVendas : 0,
      });

      // Fetch sale items with service info
      const saleIds = sales.map(s => s.id);
      const saleMap = new Map(sales.map(s => [s.id, s]));

      if (saleIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('mt_sale_items')
          .select('sale_id, service_id, descricao, preco_unitario, valor_total, quantidade, custo_unitario, desconto_valor')
          .in('sale_id', saleIds.slice(0, 200));

        const items = (itemsData || []) as any[];

        // Revenue by service
        const revenueMap = new Map<string, { total: number; quantidade: number }>();
        items.forEach((item: any) => {
          const name = item.descricao || 'Sem descricao';
          const existing = revenueMap.get(name) || { total: 0, quantidade: 0 };
          existing.total += item.valor_total || 0;
          existing.quantidade += item.quantidade || 1;
          revenueMap.set(name, existing);
        });

        const revenue = Array.from(revenueMap.entries())
          .map(([service_nome, data]) => ({ service_nome, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        setRevenueByService(revenue);

        // Fetch services pricing for compliance comparison
        const serviceIds = [...new Set(items.filter(i => i.service_id).map(i => i.service_id))];
        let servicesMap = new Map<string, any>();

        if (serviceIds.length > 0) {
          const { data: servicesData } = await supabase
            .from('mt_services')
            .select('id, nome, preco_tabela_maior, preco_tabela_menor, custo_insumos')
            .in('id', serviceIds);

          (servicesData || []).forEach((s: any) => servicesMap.set(s.id, s));
        }

        // Service-level compliance
        const svcCompMap = new Map<string, {
          nome: string;
          preco_tabela: number;
          preco_piso: number;
          total_vendido: number;
          soma_precos: number;
          quantidade: number;
          abaixo_piso: number;
          soma_margem: number;
        }>();

        items.forEach((item: any) => {
          const svc = item.service_id ? servicesMap.get(item.service_id) : null;
          const key = item.descricao || 'Outros';
          const existing = svcCompMap.get(key) || {
            nome: key,
            preco_tabela: svc?.preco_tabela_maior || item.preco_unitario || 0,
            preco_piso: svc?.preco_tabela_menor || 0,
            total_vendido: 0,
            soma_precos: 0,
            quantidade: 0,
            abaixo_piso: 0,
            soma_margem: 0,
          };

          const precoEfetivo = item.quantidade > 0 ? item.valor_total / item.quantidade : item.preco_unitario;
          existing.total_vendido += item.valor_total || 0;
          existing.soma_precos += precoEfetivo * (item.quantidade || 1);
          existing.quantidade += item.quantidade || 1;

          if (svc?.preco_tabela_menor && precoEfetivo < svc.preco_tabela_menor) {
            existing.abaixo_piso += item.quantidade || 1;
          }

          const custoUnit = item.custo_unitario || svc?.custo_insumos || 0;
          if (precoEfetivo > 0) {
            existing.soma_margem += ((precoEfetivo - custoUnit) / precoEfetivo) * 100;
          }

          svcCompMap.set(key, existing);
        });

        const svcComp: ServiceComplianceRow[] = Array.from(svcCompMap.values())
          .map(s => ({
            service_nome: s.nome,
            preco_tabela: s.preco_tabela,
            preco_piso: s.preco_piso,
            preco_medio_vendido: s.quantidade > 0 ? s.soma_precos / s.quantidade : 0,
            total_vendido: s.total_vendido,
            quantidade_vendas: s.quantidade,
            vendas_abaixo_piso: s.abaixo_piso,
            margem_media_pct: s.quantidade > 0 ? s.soma_margem / s.quantidade : 0,
          }))
          .sort((a, b) => b.total_vendido - a.total_vendido);

        setServiceCompliance(svcComp);

        // Enrich below-floor sales with item details
        const belowFloor: PriceComplianceItem[] = [];
        sales
          .filter(s => s.abaixo_piso === true)
          .forEach(s => {
            const saleItems = items.filter(i => i.sale_id === s.id);
            const serviceNames = saleItems.map(i => i.descricao).filter(Boolean).join(', ');
            belowFloor.push({
              sale_id: s.id,
              data: s.created_at,
              cliente_nome: s.cliente_nome,
              service_nome: serviceNames || '-',
              valor_venda: s.valor_total,
              preco_piso: 0,
              diferenca: 0,
              forma_pagamento: s.forma_pagamento || '',
              justificativa: s.justificativa_desconto,
              vendedor: null,
            });
          });
        setBelowFloorSales(belowFloor);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas de compliance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.date_from, filters?.date_to, filters?.franchise_id]);

  useEffect(() => {
    if (tenant?.id || accessLevel === 'platform') fetchCompliance();
  }, [fetchCompliance, tenant?.id, accessLevel]);

  return {
    metrics,
    belowFloorSales,
    revenueByService,
    serviceCompliance,
    isLoading,
    refetch: fetchCompliance,
  };
}
