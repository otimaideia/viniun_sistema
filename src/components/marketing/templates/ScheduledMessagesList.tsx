import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Calendar,
  MessageSquare,
  XCircle,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useScheduledMessagesAdapter } from "@/hooks/useScheduledMessagesAdapter";
import type { ScheduledMessage } from "@/types/scheduled-message";

interface ScheduledMessagesListProps {
  sessaoId?: string;
}

export function ScheduledMessagesList({ sessaoId }: ScheduledMessagesListProps) {
  const {
    messages,
    stats,
    isLoading,
    refetch,
    cancelMessage,
    deleteMessage,
    isCanceling,
    isDeleting,
  } = useScheduledMessagesAdapter(sessaoId);

  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [actionType, setActionType] = useState<"cancel" | "delete" | null>(null);

  const handleAction = (message: ScheduledMessage, action: "cancel" | "delete") => {
    setSelectedMessage(message);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedMessage || !actionType) return;

    if (actionType === "cancel") {
      await cancelMessage(selectedMessage.id);
    } else {
      await deleteMessage(selectedMessage.id);
    }

    setSelectedMessage(null);
    setActionType(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case "enviada":
        return (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Enviada
          </Badge>
        );
      case "falhou":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      case "cancelada":
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatScheduledDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime = "";
    if (diffMs < 0) {
      relativeTime = "Atrasada";
    } else if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      relativeTime = `Em ${diffMinutes} minutos`;
    } else if (diffHours < 24) {
      relativeTime = `Em ${diffHours} horas`;
    } else {
      relativeTime = `Em ${diffDays} dias`;
    }

    return {
      formatted: date.toLocaleString("pt-BR"),
      relative: relativeTime,
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mensagens Agendadas
              </CardTitle>
              <CardDescription>
                {stats.pendentes} pendentes, {stats.enviadas} enviadas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.pendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.enviadas}</div>
              <div className="text-xs text-muted-foreground">Enviadas</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.falharam}</div>
              <div className="text-xs text-muted-foreground">Falharam</div>
            </div>
          </div>

          {/* Lista */}
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma mensagem agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const scheduleInfo = formatScheduledDate(message.agendado_para);
                return (
                  <div
                    key={message.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(message.status)}
                        {message.mt_whatsapp_sessions && (
                          <Badge variant="outline">
                            {message.mt_whatsapp_sessions.nome}
                          </Badge>
                        )}
                        {message.mt_marketing_templates && (
                          <Badge variant="outline" className="text-xs">
                            Template: {message.mt_marketing_templates.nome_template}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{message.destinatario.replace("@c.us", "")}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{scheduleInfo.formatted}</span>
                        </div>
                        {message.status === "pendente" && (
                          <span className="text-xs font-medium text-blue-600">
                            {scheduleInfo.relative}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.conteudo}
                      </p>

                      {message.erro && (
                        <p className="text-xs text-red-500">Erro: {message.erro}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-4">
                      {message.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(message, "cancel")}
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(message, "delete")}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog
        open={!!selectedMessage && !!actionType}
        onOpenChange={() => {
          setSelectedMessage(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "cancel" ? "Cancelar Agendamento" : "Excluir Mensagem"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "cancel"
                ? "Tem certeza que deseja cancelar este agendamento? A mensagem nao sera enviada."
                : "Tem certeza que deseja excluir esta mensagem? Esta acao nao pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isCanceling || isDeleting}
              className={actionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {(isCanceling || isDeleting) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionType === "cancel" ? "Cancelar Agendamento" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
