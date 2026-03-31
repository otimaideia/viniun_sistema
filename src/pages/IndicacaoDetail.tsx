import { useParams, useNavigate, Link } from "react-router-dom";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay, cleanPhoneNumber } from "@/utils/phone";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  MessageCircle,
  Calendar,
  Users,
} from "lucide-react";

export default function IndicacaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { indicacoes, isLoading } = usePromocaoIndicacoesAdapter();

  const indicacao = indicacoes.find((i) => i.id === id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!indicacao) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Indicação não encontrada</h2>
          <p className="text-muted-foreground mb-4">A indicação solicitada não existe ou foi removida.</p>
          <Button onClick={() => navigate("/indicacoes")}>Voltar para Indicações</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleWhatsApp = () => {
    const cleanPhone = cleanPhoneNumber(indicacao.telefone);
    const codigoPais = (indicacao as Record<string, unknown>).telefone_codigo_pais as string || '55';
    const primeiroNome = indicacao.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Olá ${primeiroNome}! 😊 Tudo bem? Aqui é da Viniun! Você foi indicado(a) por um amigo.`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/indicacoes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{indicacao.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  Indicação registrada em {format(new Date(indicacao.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{indicacao.nome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhoneDisplay(indicacao.telefone, (indicacao as Record<string, unknown>).telefone_codigo_pais as string || '55')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{indicacao.email || "Não informado"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Datas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Criado em: {format(new Date(indicacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quem indicou */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Indicado por
                </CardTitle>
              </CardHeader>
              <CardContent>
                {indicacao.cadastro ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{indicacao.cadastro.nome}</p>
                      <p className="text-sm text-muted-foreground">{formatPhoneDisplay(indicacao.cadastro.telefone, (indicacao.cadastro as Record<string, unknown>).telefone_codigo_pais as string || '55')}</p>
                      <p className="text-sm text-muted-foreground">{indicacao.cadastro.email}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link to={`/cadastros-lp/${indicacao.cadastro.id}`}>
                        Ver cadastro completo
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Informações do indicador não disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
