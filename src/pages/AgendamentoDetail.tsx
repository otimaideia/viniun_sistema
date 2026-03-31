import { useParams, useNavigate, Link } from "react-router-dom";

import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  AGENDAMENTO_STATUS_CONFIG,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  AgendamentoStatus,
  AppointmentType,
} from "@/types/agendamento";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneDisplay, cleanPhoneNumber } from "@/utils/phone";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  Pencil,
  MessageCircle,
  Building2,
  Briefcase,
  FileText,
  Heart,
  Stethoscope,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  ShoppingBag,
  UserCheck,
  Users,
  DollarSign,
  Timer,
  LogIn,
  LogOut,
  XCircle,
  ExternalLink,
  Hash,
  Info,
  MapPin,
} from "lucide-react";

export default function AgendamentoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agendamentos, isLoading, updateStatus } = useAgendamentosAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const agendamento = agendamentos.find((a) => a.id === id);

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

  if (!agendamento) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Agendamento não encontrado</h2>
          <p className="text-muted-foreground mb-4">O agendamento solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/agendamentos")}>Voltar para Agendamentos</Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = AGENDAMENTO_STATUS_CONFIG[agendamento.status];
  const unidade = franqueados.find((f) => f.id === agendamento.unidade_id);
  const tipo = ((agendamento as Record<string, unknown>).tipo as string || 'avaliacao') as AppointmentType;
  const tipoColor = APPOINTMENT_TYPE_COLORS[tipo];
  const TIPO_ICONS: Record<AppointmentType, typeof Calendar> = {
    avaliacao: Stethoscope,
    procedimento_fechado: ClipboardCheck,
    cortesia: Heart,
  };
  const TipoIcon = TIPO_ICONS[tipo];

  const handleWhatsApp = () => {
    if (!agendamento.telefone_lead) return;
    const cleanPhone = cleanPhoneNumber(agendamento.telefone_lead);
    const codigoPais = (agendamento as Record<string, unknown>).telefone_lead_codigo_pais as string || '55';
    const primeiroNome = agendamento.nome_lead?.split(" ")[0] || "";
    const mensagem = encodeURIComponent(
      `Olá ${primeiroNome}! 😊 Aqui é da Viniun, confirmando seu agendamento.`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  const handleStatusChange = (status: AgendamentoStatus) => {
    updateStatus({ id: agendamento.id, status });
  };

  const InfoRow = ({ icon: Icon, label, value, link }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null; link?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-1.5">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {link ? (
            <Link to={link} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              {value}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <p className="text-sm font-medium">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/agendamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TipoIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">
                    {agendamento.nome_lead || "Sem nome"}
                  </h1>
                  <Badge
                    style={{ backgroundColor: `${tipoColor}20`, color: tipoColor, borderColor: `${tipoColor}40` }}
                    className="border"
                  >
                    <TipoIcon className="h-3 w-3 mr-1" />
                    {APPOINTMENT_TYPE_LABELS[tipo]}
                  </Badge>
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(agendamento.data_agendamento + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {agendamento.hora_inicio && ` às ${agendamento.hora_inicio.substring(0, 5)}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agendamento.telefone_lead && (
              <Button variant="outline" onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
            {agendamento.lead_id && (
              <Button variant="outline" asChild>
                <Link to={`/leads/${agendamento.lead_id}`}>
                  <User className="h-4 w-4 mr-2" />
                  Ver Lead
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link to={`/agendamentos/${agendamento.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status e Ações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                    {statusConfig.label}
                  </Badge>
                  <Select value={agendamento.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGENDAMENTO_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timeline de status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {agendamento.confirmado_em && (
                    <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <CheckCircle className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Confirmado</p>
                      <p className="text-[10px] text-blue-600">{format(new Date(agendamento.confirmado_em), "dd/MM HH:mm")}</p>
                      {agendamento.confirmado_via && (
                        <p className="text-[10px] text-blue-500">via {agendamento.confirmado_via}</p>
                      )}
                    </div>
                  )}
                  {agendamento.checkin_em && (
                    <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <LogIn className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Check-in</p>
                      <p className="text-[10px] text-emerald-600">{format(new Date(agendamento.checkin_em), "dd/MM HH:mm")}</p>
                    </div>
                  )}
                  {agendamento.checkout_em && (
                    <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                      <LogOut className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Check-out</p>
                      <p className="text-[10px] text-purple-600">{format(new Date(agendamento.checkout_em), "dd/MM HH:mm")}</p>
                    </div>
                  )}
                  {agendamento.cancelado_em && (
                    <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                      <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                      <p className="text-xs font-medium text-red-700 dark:text-red-300">Cancelado</p>
                      <p className="text-[10px] text-red-600">{format(new Date(agendamento.cancelado_em), "dd/MM HH:mm")}</p>
                      {agendamento.cancelado_por && (
                        <p className="text-[10px] text-red-500">por {agendamento.cancelado_por}</p>
                      )}
                    </div>
                  )}
                </div>

                {agendamento.motivo_cancelamento && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Motivo do cancelamento</p>
                    <p className="text-sm text-red-600">{agendamento.motivo_cancelamento}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Cliente */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações do Cliente
                </CardTitle>
                {agendamento.lead_id && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/leads/${agendamento.lead_id}`}>
                      Ver ficha completa
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 sm:grid-cols-2">
                  <InfoRow icon={User} label="Nome" value={agendamento.nome_lead} link={agendamento.lead_id ? `/leads/${agendamento.lead_id}` : undefined} />
                  <InfoRow icon={Phone} label="Telefone" value={agendamento.telefone_lead ? formatPhoneDisplay(agendamento.telefone_lead, (agendamento as Record<string, unknown>).telefone_lead_codigo_pais as string || '55') : null} />
                  <InfoRow icon={Mail} label="Email" value={agendamento.email_lead} />
                  {!agendamento.nome_lead && !agendamento.email_lead && agendamento.lead_id && (
                    <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Dados incompletos. <Link to={`/leads/${agendamento.lead_id}/editar`} className="underline font-medium">Completar cadastro do lead</Link>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Data, Horário e Serviço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data, Horário e Serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 sm:grid-cols-2">
                  <InfoRow
                    icon={Calendar}
                    label="Data"
                    value={format(new Date(agendamento.data_agendamento + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Horário"
                    value={`${agendamento.hora_inicio?.substring(0, 5) || '-'}${agendamento.hora_fim ? ` - ${agendamento.hora_fim.substring(0, 5)}` : ''}`}
                  />
                  {agendamento.duracao_minutos && (
                    <InfoRow icon={Timer} label="Duração" value={`${agendamento.duracao_minutos} minutos`} />
                  )}
                  <InfoRow icon={Briefcase} label="Serviço" value={agendamento.servico || agendamento.servico_nome} />
                  {agendamento.valor != null && agendamento.valor > 0 && (
                    <InfoRow icon={DollarSign} label="Valor" value={`R$ ${Number(agendamento.valor).toFixed(2)}`} />
                  )}
                  {agendamento.sessao_numero && (
                    <InfoRow icon={Hash} label="Sessão" value={`${agendamento.sessao_numero}${agendamento.total_sessoes ? ` de ${agendamento.total_sessoes}` : ''}`} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Equipe */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipe Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 sm:grid-cols-2">
                  <InfoRow icon={UserCheck} label="Profissional" value={agendamento.profissional_nome || "Não atribuído"} />
                  <InfoRow icon={Users} label="Consultora" value={agendamento.consultora_nome || "Não atribuída"} />
                  <InfoRow icon={User} label="Agendado por" value={agendamento.created_by || "Sistema"} />
                </div>
                {!agendamento.profissional_nome && !agendamento.consultora_nome && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Nenhum profissional ou consultora atribuído.{' '}
                        <Link to={`/agendamentos/${agendamento.id}/editar`} className="underline font-medium">Atribuir agora</Link>
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            {(agendamento.observacoes || agendamento.observacoes_internas) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agendamento.observacoes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observações gerais</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{agendamento.observacoes}</p>
                    </div>
                  )}
                  {agendamento.observacoes_internas && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Observações internas (não visível ao cliente)
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">{agendamento.observacoes_internas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unidade */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Unidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unidade ? (
                  <div className="space-y-2">
                    <p className="font-medium">{unidade.nome_fantasia}</p>
                    {unidade.cidade && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {unidade.cidade}{unidade.estado && ` / ${unidade.estado}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não informada</p>
                )}
              </CardContent>
            </Card>

            {/* Cortesia Info */}
            {tipo === 'cortesia' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-amber-500" />
                    Cortesia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agendamento.cortesia_motivo && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Motivo</p>
                      <p className="text-sm">{agendamento.cortesia_motivo}</p>
                    </div>
                  )}
                  {agendamento.cortesia_aprovada_por ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Aprovada</p>
                        {agendamento.cortesia_aprovada_em && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            {format(new Date(agendamento.cortesia_aprovada_em), "dd/MM/yyyy HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Aguardando aprovação do gerente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Procedimento Fechado - Venda */}
            {tipo === 'procedimento_fechado' && agendamento.venda_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-blue-500" />
                    Venda Vinculada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agendamento.sessao_numero && (
                    <p className="text-sm">
                      Sessão <span className="font-bold">{agendamento.sessao_numero}</span>
                      {agendamento.total_sessoes && <span> de {agendamento.total_sessoes}</span>}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/vendas/${agendamento.venda_id}`}>
                      Ver Detalhes da Venda
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Informações do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Informações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{format(new Date(agendamento.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizado em</span>
                  <span>{format(new Date(agendamento.updated_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {agendamento.created_by && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado por</span>
                    <span>{agendamento.created_by}</span>
                  </div>
                )}
                {agendamento.origem && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origem</span>
                    <span>{agendamento.origem}</span>
                  </div>
                )}
                {agendamento.room_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sala</span>
                    <span>{agendamento.room_id}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">ID</span>
                  <span className="text-xs font-mono">{agendamento.id.substring(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
