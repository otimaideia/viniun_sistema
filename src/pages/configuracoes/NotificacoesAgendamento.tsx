import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Bell,
  UserCheck,
  Users,
  Star,
  BarChart3,
  MessageSquare,
  Sunrise,
  Building2,
} from "lucide-react";
import {
  useAppointmentNotificationConfigs,
  type NotificationType,
} from "@/hooks/multitenant/useAppointmentNotificationsMT";

// Map icon string names to Lucide components
const ICON_MAP: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Bell: <Bell className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Sunrise: <Sunrise className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
};

const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "bg-green-100 text-green-800" },
  email: { label: "Email", color: "bg-blue-100 text-blue-800" },
  sms: { label: "SMS", color: "bg-purple-100 text-purple-800" },
};

const NotificacoesAgendamento = () => {
  const navigate = useNavigate();
  const {
    configs,
    activeCount,
    totalCount,
    isLoading,
    toggleConfig,
  } = useAppointmentNotificationConfigs();

  const handleToggle = (notificationType: NotificationType, currentState: boolean) => {
    toggleConfig.mutate({
      notificationType,
      isActive: !currentState,
    });
  };

  const statusBadge = () => {
    if (isLoading) return null;
    if (activeCount === totalCount) {
      return <Badge className="bg-green-100 text-green-800">Todas ativadas</Badge>;
    }
    if (activeCount === 0) {
      return <Badge variant="secondary">Nenhuma ativa</Badge>;
    }
    return (
      <Badge variant="secondary">
        {activeCount} de {totalCount} ativas
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Notificações de Agendamento</h1>
            {statusBadge()}
          </div>
          <p className="text-muted-foreground">
            Configure quais notificações automáticas são enviadas para cada agendamento
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notification cards */}
      {!isLoading && (
        <div className="space-y-3">
          {configs.map((config) => {
            const channelInfo = CHANNEL_LABELS[config.channel] || CHANNEL_LABELS.whatsapp;
            const icon = ICON_MAP[config.icon] || <Bell className="h-5 w-5" />;
            const isToggling =
              toggleConfig.isPending &&
              (toggleConfig.variables as Record<string, string> | undefined)?.notificationType === config.type;

            return (
              <Card
                key={config.type}
                className={`transition-all ${
                  config.is_active
                    ? "border-primary/30 bg-primary/5"
                    : "opacity-75"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-lg ${
                        config.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{config.label}</h3>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${channelInfo.color}`}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {channelInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                      {config.offset_minutes !== 0 && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {config.offset_minutes < 0
                            ? `${Math.abs(config.offset_minutes)} min antes`
                            : `${config.offset_minutes} min depois`}
                        </p>
                      )}
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={config.is_active}
                      disabled={isToggling}
                      onCheckedChange={() =>
                        handleToggle(config.type, config.is_active)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>
            As notificações ativadas serão enviadas automaticamente via WhatsApp para cada
            agendamento criado no sistema.
          </p>
          <p>
            Notificações de check-in são disparadas quando o cliente faz check-in pelo totem
            de atendimento.
          </p>
          <p>
            Notificações pós-atendimento (Google Review e NPS) são enviadas após o checkout
            do cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificacoesAgendamento;
