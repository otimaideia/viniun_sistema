import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Settings,
  Zap,
  Cloud,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Activity,
  Timer,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenantContext } from "@/contexts/TenantContext";
import { useWhatsAppCostsMT } from "@/hooks/multitenant/useWhatsAppCostsMT";
import { useWhatsAppRoutingLogsMT } from "@/hooks/multitenant/useWhatsAppRoutingLogsMT";
import { useWhatsAppHybridConfigMT } from "@/hooks/multitenant/useWhatsAppHybridConfigMT";
import { CostSummaryCards } from "@/components/whatsapp/hybrid/CostSummaryCards";
import { useWhatsAppWindowsStatsMT } from "@/hooks/multitenant/useWhatsAppWindowsMT";
import { formatCostBRL } from "@/types/whatsapp-hybrid";
import { cn } from "@/lib/utils";

export default function WhatsAppHybridStats() {
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const [daysRange] = useState(7);

  // Hooks de dados
  const { summary, isLoading: isCostLoading } = useWhatsAppCostsMT();
  const { logs, stats: routingStats, isLoading: isLogsLoading, refetch: refetchLogs } = useWhatsAppRoutingLogsMT({
    date_from: subDays(new Date(), daysRange).toISOString(),
    limit: 50,
  });
  const { isHybridEnabled, integrationStatus, statusLabel } = useWhatsAppHybridConfigMT();

  // Janelas ativas: contar conversas com janela aberta vs fechada
  const { stats: windowStats, refetch: refetchWindows } = useWhatsAppWindowsStatsMT();
  const isLoading = isCostLoading || isLogsLoading || isTenantLoading;

  // Log recentes formatados
  const recentLogs = useMemo(() => {
    return logs.slice(0, 20).map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      provider: log.provider_selected as "waha" | "meta_cloud_api",
      reason: log.decision_reason || "-",
      success: log.success,
      cost: Number(log.actual_cost || log.estimated_cost || 0),
      fallback: log.fallback_used,
      responseTime: log.response_time_ms,
      ruleName: (log as Record<string, unknown>).rule ? ((log as Record<string, unknown>).rule as Record<string, string>)?.nome : null,
    }));
  }, [logs]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/whatsapp/conversas")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Estatisticas do Sistema Hibrido
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento de janelas, custos e roteamento WAHA + Meta Cloud API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              isHybridEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-gray-300 bg-gray-50 text-gray-600"
            )}
          >
            {isHybridEnabled ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {statusLabel}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/whatsapp/hybrid-config")}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLogs();
              refetchWindows();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Custos do mês (componente existente) */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Custos do Mes Atual
        </h2>
        <CostSummaryCards summary={summary} isLoading={isCostLoading} />
      </div>

      {/* Janelas 24h/72h */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-500" />
          Janelas de Conversa (24h/72h)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Janelas abertas */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs text-muted-foreground">Abertas</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {windowStats?.openCount ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {windowStats?.open24h ?? 0} x 24h / {windowStats?.open72h ?? 0} x 72h
              </p>
            </CardContent>
          </Card>

          {/* Janelas fechadas */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-100">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-xs text-muted-foreground">Fechadas</span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {windowStats?.closedCount ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Requer template pago (Meta)
              </p>
            </CardContent>
          </Card>

          {/* Aguardando resposta */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-xs text-muted-foreground">Aguardando</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {windowStats?.awaitingResponse ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Janela aberta, sem resposta
              </p>
            </CardContent>
          </Card>

          {/* Msgs dentro de janelas */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs text-muted-foreground">Msgs em Janela</span>
              </div>
              <p className="text-2xl font-bold">
                {windowStats?.totalMsgsInWindow ?? "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Enviadas dentro de janela (gratis)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Roteamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats de roteamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Roteamento (ultimos {daysRange} dias)
            </CardTitle>
            <CardDescription>
              {routingStats.total} decisoes de roteamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {routingStats.total === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhuma decisao de roteamento registrada.
                <br />
                <span className="text-xs">
                  As decisoes serao registradas quando mensagens forem enviadas com o modo hibrido ativo.
                </span>
              </div>
            ) : (
              <>
                {/* WAHA vs Meta */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-green-600" />
                      WAHA
                    </span>
                    <span className="font-medium">
                      {routingStats.wahaCount} ({routingStats.total > 0 ? ((routingStats.wahaCount / routingStats.total) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                  <Progress
                    value={routingStats.total > 0 ? (routingStats.wahaCount / routingStats.total) * 100 : 0}
                    className="h-2 [&>div]:bg-green-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Cloud className="h-3.5 w-3.5 text-blue-600" />
                      Meta Cloud API
                    </span>
                    <span className="font-medium">
                      {routingStats.metaCount} ({routingStats.total > 0 ? ((routingStats.metaCount / routingStats.total) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                  <Progress
                    value={routingStats.total > 0 ? (routingStats.metaCount / routingStats.total) * 100 : 0}
                    className="h-2 [&>div]:bg-blue-500"
                  />
                </div>

                {/* Métricas extras */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {routingStats.successRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">
                      {routingStats.fallbackRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Fallback Usado</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {formatCostBRL(routingStats.totalCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">Custo Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {routingStats.avgResponseTime > 0 ? `${routingStats.avgResponseTime.toFixed(0)}ms` : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Tempo Medio</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Log de decisões recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Decisoes Recentes
            </CardTitle>
            <CardDescription>
              Ultimas {recentLogs.length} decisoes do roteador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhum log de roteamento ainda.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Hora</TableHead>
                      <TableHead className="text-xs">Provider</TableHead>
                      <TableHead className="text-xs">Motivo</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="py-1.5 whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 gap-0.5",
                                    log.provider === "waha"
                                      ? "border-green-300 text-green-600 bg-green-50"
                                      : "border-blue-300 text-blue-600 bg-blue-50"
                                  )}
                                >
                                  {log.provider === "waha" ? (
                                    <Zap className="h-2.5 w-2.5" />
                                  ) : (
                                    <Cloud className="h-2.5 w-2.5" />
                                  )}
                                  {log.provider === "waha" ? "WAHA" : "Meta"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {log.success ? "Enviado com sucesso" : "Falhou"}
                                {log.fallback && " (fallback)"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="py-1.5 max-w-[150px] truncate">
                          {log.ruleName || log.reason}
                        </TableCell>
                        <TableCell className="py-1.5 text-right whitespace-nowrap">
                          {log.cost > 0 ? (
                            <span className="text-orange-600 font-medium">
                              {formatCostBRL(log.cost)}
                            </span>
                          ) : (
                            <span className="text-green-600">Gratis</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legenda de custos */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Tabela de Custos Meta Cloud API (Brasil - Fev/2026)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px]">
                SERVICE
              </Badge>
              <span>R$ 0,00 (gratis)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
                UTILITY
              </Badge>
              <span>R$ 0,10/msg</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px]">
                AUTHENTICATION
              </Badge>
              <span>R$ 0,10/msg</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px]">
                MARKETING
              </Badge>
              <span>R$ 0,25/msg</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Dentro da janela 24h/72h: mensagens SERVICE (gratis). Fora da janela: templates pagos conforme categoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
