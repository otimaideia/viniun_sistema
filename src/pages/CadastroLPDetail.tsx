import { useParams, useNavigate, Link } from "react-router-dom";
import { usePromocaoCadastrosAdapter } from "@/hooks/usePromocaoCadastrosAdapter";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { LeadStatus, STATUS_CONFIG } from "@/types/lead-mt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay, cleanPhoneNumber } from "@/utils/phone";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  Pencil,
  MessageCircle,
  Calendar,
  Building2,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function CadastroLPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cadastros, isLoading, updateStatus } = usePromocaoCadastrosAdapter();
  const { indicacoes } = usePromocaoIndicacoesAdapter();

  const cadastro = cadastros.find((c) => c.id === id);
  const indicacoesDoCadastro = indicacoes.filter((i) => i.cadastro_id === id);

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

  if (!cadastro) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Cadastro não encontrado</h2>
          <p className="text-muted-foreground mb-4">O cadastro solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/cadastros-lp")}>Voltar para Leads Franquia</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleWhatsApp = () => {
    const cleanPhone = cleanPhoneNumber(cadastro.telefone);
    const codigoPais = (cadastro as Record<string, unknown>).telefone_codigo_pais as string || '55';
    const primeiroNome = cadastro.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Olá ${primeiroNome}! 😊 Tudo bem? Aqui é da Viniun!`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  const handleStatusChange = (status: LeadStatus) => {
    updateStatus({ id: cadastro.id, status });
  };

  const statusConfig = cadastro.status ? STATUS_CONFIG[cadastro.status] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cadastros-lp")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{cadastro.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  Cadastrado em {format(new Date(cadastro.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button asChild>
              <Link to={`/cadastros-lp/${cadastro.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {statusConfig && (
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                      {statusConfig.label}
                    </Badge>
                  )}
                  <StatusSelect value={cadastro.status || "novo"} onValueChange={handleStatusChange} />
                </div>
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPhoneDisplay(cadastro.telefone, (cadastro as Record<string, unknown>).telefone_codigo_pais as string || '55')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{cadastro.email || "Não informado"}</span>
                </div>
                {cadastro.data_nascimento && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(cadastro.data_nascimento), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalhes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cadastro.genero && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Gênero: {cadastro.genero}</span>
                  </div>
                )}
                {cadastro.cep && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>CEP: {cadastro.cep}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Unidade: {cadastro.unidade || "Não informada"}</span>
                </div>
                <div className="flex items-center gap-3">
                  {cadastro.aceita_contato ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{cadastro.aceita_contato ? "Aceita contato" : "Não aceita contato"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Indicações */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Indicações ({indicacoesDoCadastro.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {indicacoesDoCadastro.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma indicação registrada
                  </p>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {indicacoesDoCadastro.map((indicacao) => (
                        <div key={indicacao.id} className="border rounded-lg p-3 space-y-2">
                          <p className="font-medium">{indicacao.nome}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{formatPhoneDisplay(indicacao.telefone, (indicacao as Record<string, unknown>).telefone_codigo_pais as string || '55')}</span>
                            </div>
                            {indicacao.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{indicacao.email}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(indicacao.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
