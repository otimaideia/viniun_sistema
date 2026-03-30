import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Calendar,
  DollarSign,
  TrendingDown,
  X,
} from "lucide-react";
import { useCampaignAlertsAdapter, type CampaignAlert } from "@/hooks/useCampaignAlertsAdapter";

interface CampaignAlertsProps {
  compact?: boolean;
  maxItems?: number;
  onCampanhaClick?: (campanhaId: string) => void;
}

export function CampaignAlerts({
  compact = false,
  maxItems = 5,
  onCampanhaClick,
}: CampaignAlertsProps) {
  const { alerts, stats, isLoading, hasAlerts } = useCampaignAlertsAdapter();
  const [isOpen, setIsOpen] = useState(!compact);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts
    .filter((a) => !dismissedAlerts.has(a.id))
    .slice(0, maxItems);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  const getAlertIcon = (alert: CampaignAlert) => {
    switch (alert.type) {
      case "ending_soon":
        return <Calendar className="h-4 w-4" />;
      case "budget_warning":
      case "budget_exceeded":
        return <DollarSign className="h-4 w-4" />;
      case "low_performance":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800";
      default:
        return "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  if (isLoading) {
    return null;
  }

  if (!hasAlerts || visibleAlerts.length === 0) {
    if (compact) return null;

    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
          <Bell className="h-5 w-5 mr-2" />
          Nenhum alerta de campanha no momento
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between ${
              stats.critical > 0
                ? "border-red-300 text-red-600 hover:bg-red-50"
                : stats.warning > 0
                ? "border-amber-300 text-amber-600 hover:bg-amber-50"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>
                {stats.total} alerta{stats.total !== 1 ? "s" : ""} de campanha
              </span>
              {stats.critical > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5">
                  {stats.critical}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityClass(
                alert.severity
              )}`}
            >
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alert)}
                  <span className="font-medium text-sm">{alert.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Campanhas
              {stats.critical > 0 && (
                <Badge variant="destructive">{stats.critical} critico</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {stats.total} alerta{stats.total !== 1 ? "s" : ""} ativo
              {stats.total !== 1 ? "s" : ""}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-4 rounded-lg border ${getSeverityClass(
              alert.severity
            )} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => onCampanhaClick?.(alert.campanha.id)}
          >
            <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getAlertIcon(alert)}
                <span className="font-medium">{alert.title}</span>
                <Badge variant="outline" className="text-xs">
                  {alert.campanha.nome}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                dismissAlert(alert.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {alerts.length > maxItems && (
          <p className="text-sm text-center text-muted-foreground">
            + {alerts.length - maxItems} alerta{alerts.length - maxItems !== 1 ? "s" : ""} oculto
            {alerts.length - maxItems !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
