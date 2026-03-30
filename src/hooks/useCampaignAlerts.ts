import { useMemo } from "react";
import { useMarketingCampanhas } from "./useMarketingCampanhas";
import type { MarketingCampanha } from "@/types/marketing";

export type AlertType = "ending_soon" | "budget_warning" | "budget_exceeded" | "low_performance";
export type AlertSeverity = "info" | "warning" | "critical";

export interface CampaignAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  campanha: MarketingCampanha;
  createdAt: Date;
}

interface UseCampaignAlertsOptions {
  endingSoonDays?: number; // Dias antes do fim para alertar (padrão: 3)
  budgetWarningThreshold?: number; // % do budget para alertar (padrão: 80)
  budgetExceededThreshold?: number; // % acima para considerar excedido (padrão: 100)
  lowPerformanceThreshold?: number; // Taxa de conversão mínima esperada (padrão: 5%)
}

export function useCampaignAlerts(options: UseCampaignAlertsOptions = {}) {
  const {
    endingSoonDays = 3,
    budgetWarningThreshold = 80,
    budgetExceededThreshold = 100,
    lowPerformanceThreshold = 5,
  } = options;

  const { campanhas, isLoading } = useMarketingCampanhas();

  const alerts = useMemo(() => {
    if (!campanhas || campanhas.length === 0) return [];

    const alertList: CampaignAlert[] = [];
    const now = new Date();
    const endingSoonDate = new Date(now.getTime() + endingSoonDays * 24 * 60 * 60 * 1000);

    campanhas
      .filter((c) => c.status === "ativa")
      .forEach((campanha) => {
        // Alerta: Campanha terminando em breve
        if (campanha.data_fim) {
          const endDate = new Date(campanha.data_fim);
          if (endDate <= endingSoonDate && endDate >= now) {
            const daysRemaining = Math.ceil(
              (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
            );
            alertList.push({
              id: `ending-${campanha.id}`,
              type: "ending_soon",
              severity: daysRemaining <= 1 ? "critical" : "warning",
              title: "Campanha terminando",
              message: `A campanha "${campanha.nome}" termina em ${daysRemaining} dia${
                daysRemaining !== 1 ? "s" : ""
              }.`,
              campanha,
              createdAt: now,
            });
          }
        }

        // Alertas de Budget
        const budgetEstimado = campanha.budget_estimado || 0;
        const budgetReal = campanha.budget_real || 0;

        if (budgetEstimado > 0) {
          const budgetPercentage = (budgetReal / budgetEstimado) * 100;

          if (budgetPercentage >= budgetExceededThreshold) {
            // Budget excedido
            alertList.push({
              id: `budget-exceeded-${campanha.id}`,
              type: "budget_exceeded",
              severity: "critical",
              title: "Budget excedido",
              message: `A campanha "${campanha.nome}" excedeu o budget em ${(
                budgetPercentage - 100
              ).toFixed(1)}%.`,
              campanha,
              createdAt: now,
            });
          } else if (budgetPercentage >= budgetWarningThreshold) {
            // Budget chegando ao limite
            alertList.push({
              id: `budget-warning-${campanha.id}`,
              type: "budget_warning",
              severity: "warning",
              title: "Budget quase esgotado",
              message: `A campanha "${campanha.nome}" utilizou ${budgetPercentage.toFixed(
                1
              )}% do budget.`,
              campanha,
              createdAt: now,
            });
          }
        }

        // Alerta: Baixa performance
        const leadsGerados = campanha.leads_gerados || 0;
        const conversoes = campanha.conversoes || 0;

        if (leadsGerados >= 10) {
          // Só alertar se tiver leads suficientes para análise
          const taxaConversao = (conversoes / leadsGerados) * 100;

          if (taxaConversao < lowPerformanceThreshold) {
            alertList.push({
              id: `performance-${campanha.id}`,
              type: "low_performance",
              severity: "info",
              title: "Performance abaixo do esperado",
              message: `A campanha "${campanha.nome}" tem taxa de conversao de apenas ${taxaConversao.toFixed(
                1
              )}%.`,
              campanha,
              createdAt: now,
            });
          }
        }
      });

    // Ordenar por severidade (critical > warning > info)
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };

    return alertList.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [
    campanhas,
    endingSoonDays,
    budgetWarningThreshold,
    budgetExceededThreshold,
    lowPerformanceThreshold,
  ]);

  // Estatísticas de alertas
  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
      byType: {
        ending_soon: alerts.filter((a) => a.type === "ending_soon").length,
        budget_warning: alerts.filter((a) => a.type === "budget_warning").length,
        budget_exceeded: alerts.filter((a) => a.type === "budget_exceeded").length,
        low_performance: alerts.filter((a) => a.type === "low_performance").length,
      },
    };
  }, [alerts]);

  return {
    alerts,
    stats,
    isLoading,
    hasAlerts: alerts.length > 0,
    hasCritical: stats.critical > 0,
  };
}
