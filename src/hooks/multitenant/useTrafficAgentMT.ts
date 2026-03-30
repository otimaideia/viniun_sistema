import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface TrafficAgentResponse {
  reply: string;
  agent_used: string;
  actions?: Array<{
    label: string;
    description?: string;
    route?: string;
    requires_confirmation?: boolean;
  }>;
  metrics?: Record<string, number>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export function useTrafficAgentMT() {
  const { tenant, franchise, user } = useTenantContext();
  const [isLoading, setIsLoading] = useState(false);

  const analyzeTraffic = useCallback(async (query: string): Promise<TrafficAgentResponse | null> => {
    if (!tenant?.id || !user?.id) {
      toast.error('Contexto não carregado');
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-assistant', {
        body: {
          message: query,
          userId: user.id,
          tenantId: tenant.id,
          franchiseId: franchise?.id || null,
          agentId: undefined,
          forceAgent: 'traffic_agent',
        },
      });

      if (error) throw error;
      return data as TrafficAgentResponse;
    } catch (error: any) {
      toast.error(`Erro ao analisar tráfego: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [tenant, franchise, user]);

  const getCampaignROI = useCallback((campaignId: string) => {
    return analyzeTraffic(`Calcule o ROI da campanha ${campaignId} com detalhes de CPL, CPA, ROAS`);
  }, [analyzeTraffic]);

  const suggestOptimization = useCallback((campaignId: string) => {
    return analyzeTraffic(`Analise a campanha ${campaignId} e sugira otimizações de público, criativo e budget`);
  }, [analyzeTraffic]);

  const compareCreatives = useCallback((campaignId: string) => {
    return analyzeTraffic(`Compare os criativos da campanha ${campaignId} e identifique qual converte melhor`);
  }, [analyzeTraffic]);

  const suggestAudience = useCallback((serviceType: string) => {
    return analyzeTraffic(`Sugira o melhor público-alvo para campanhas de ${serviceType} baseado nos leads convertidos`);
  }, [analyzeTraffic]);

  return {
    analyzeTraffic,
    getCampaignROI,
    suggestOptimization,
    compareCreatives,
    suggestAudience,
    isLoading,
  };
}

export default useTrafficAgentMT;
