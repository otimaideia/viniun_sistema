import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  XCircle,
  QrCode
} from "lucide-react";

const FranquiaWhatsApp = () => {
  const { profile } = useUserProfileAdapter();
  const { sessions, isLoading } = useWhatsAppSessionsAdapter();

  // Filtrar sessões da franquia
  const minhasSessoes = sessions.filter((s) => s.franchise_id === profile?.franqueado_id);

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const sessoesAtivas = minhasSessoes.filter((s) => s.status === "working");
  const sessoesPendentes = minhasSessoes.filter((s) => s.status === "scan_qr");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas conversas do WhatsApp
          </p>
        </div>
        <Button asChild>
          <Link to="/whatsapp">
            <MessageSquare className="h-4 w-4 mr-2" />
            Acessar Conversas
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{minhasSessoes.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{sessoesAtivas.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-600">{sessoesPendentes.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Sessões */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Sessões</CardTitle>
          <CardDescription>
            Sessões de WhatsApp da sua unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : minhasSessoes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                Nenhuma sessão de WhatsApp configurada
              </p>
              <Button variant="outline" asChild>
                <Link to="/whatsapp/sessoes">
                  Configurar WhatsApp
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {minhasSessoes.map((sessao) => (
                <div
                  key={sessao.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      sessao.status === "working" ? "bg-green-100" : "bg-amber-100"
                    }`}>
                      <Smartphone className={`h-5 w-5 ${
                        sessao.status === "working" ? "text-green-600" : "text-amber-600"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{sessao.nome}</p>
                      <p className="text-sm text-muted-foreground">{sessao.session_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={sessao.status === "working" ? "default" : "secondary"}>
                      {sessao.status === "working" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Conectado
                        </>
                      ) : sessao.status === "scan_qr" ? (
                        <>
                          <QrCode className="h-3 w-3 mr-1" />
                          Aguardando QR
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Desconectado
                        </>
                      )}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/whatsapp?sessao=${sessao.session_name}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acesso Rápido */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-semibold">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground">
                Acesse o gerenciador completo de WhatsApp para configurar sessões e ver todas as conversas
              </p>
            </div>
            <Button asChild>
              <Link to="/whatsapp/sessoes">
                Gerenciar Sessões
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaWhatsApp;
