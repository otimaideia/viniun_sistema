import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  ClipboardCheck,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  CheckCircle,
  XCircle,
  TrendingUp,
  ShoppingBag,
  FileText,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  useAuditoriaMT,
  useAuditoriasMT,
  AUDITORIA_STATUS_CONFIG,
  AUDITORIA_TIPO_LABELS,
  AUDITORIA_TIPO_COLORS,
} from "@/hooks/multitenant/useAuditoriasMT";

export default function AuditoriaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auditoria, isLoading } = useAuditoriaMT(id);
  const { updateStatus } = useAuditoriasMT();
  const [notas, setNotas] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!auditoria) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Auditoria nao encontrada</h2>
        <p className="text-muted-foreground mb-4">A auditoria solicitada nao existe ou foi removida.</p>
        <Button onClick={() => navigate("/auditorias")}>Voltar para Auditorias</Button>
      </div>
    );
  }

  const statusConfig = AUDITORIA_STATUS_CONFIG[auditoria.status];
  const tipoColor = AUDITORIA_TIPO_COLORS[auditoria.tipo];

  const handleMarkRealizada = async () => {
    setIsUpdating(true);
    try {
      await updateStatus(auditoria.id, 'realizada', { notas: notas || undefined });
      toast.success('Auditoria marcada como realizada');
      navigate(`/auditorias/${auditoria.id}`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar auditoria');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertida = () => {
    // Navegar para criar venda, passando dados da auditoria
    const params = new URLSearchParams({
      lead_id: auditoria.lead_id || '',
      lead_nome: encodeURIComponent(auditoria.cliente_nome || ''),
      auditoria_id: auditoria.id,
    });
    navigate(`/vendas/novo?${params.toString()}`);
  };

  const handleNaoConvertida = async () => {
    setIsUpdating(true);
    try {
      await updateStatus(auditoria.id, 'nao_convertida', { notas: notas || undefined });
      toast.success('Auditoria marcada como nao convertida');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar auditoria');
    } finally {
      setIsUpdating(false);
    }
  };

  const sessaoProgress = auditoria.sessao_atual && auditoria.total_sessoes
    ? Math.round((auditoria.sessao_atual / auditoria.total_sessoes) * 100)
    : null;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/auditorias")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{auditoria.cliente_nome}</h1>
                  <Badge
                    style={{ backgroundColor: `${tipoColor}20`, color: tipoColor, borderColor: `${tipoColor}40` }}
                    className="border"
                  >
                    {AUDITORIA_TIPO_LABELS[auditoria.tipo]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                    {statusConfig.label}
                  </Badge>
                  {auditoria.servico_nome && (
                    <span className="text-sm text-muted-foreground">{auditoria.servico_nome}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={`/auditorias/${auditoria.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informacoes do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacoes do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{auditoria.cliente_nome}</span>
                  {auditoria.lead_id && (
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <Link to={`/leads/${auditoria.lead_id}`}>Ver lead</Link>
                    </Button>
                  )}
                </div>
                {auditoria.cliente_telefone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{auditoria.cliente_telefone}</span>
                  </div>
                )}
                {auditoria.lead?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{auditoria.lead.email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progresso de Sessoes */}
            {sessaoProgress !== null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progresso do Tratamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sessao {auditoria.sessao_atual} de {auditoria.total_sessoes}</span>
                    <span className="font-medium">{sessaoProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary rounded-full h-3 transition-all"
                      style={{ width: `${sessaoProgress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhes da Auditoria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes da Auditoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium">{AUDITORIA_TIPO_LABELS[auditoria.tipo]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {auditoria.auditor_nome && (
                    <div>
                      <p className="text-muted-foreground">Auditor</p>
                      <p className="font-medium">{auditoria.auditor_nome}</p>
                    </div>
                  )}
                  {auditoria.consultora_nome && (
                    <div>
                      <p className="text-muted-foreground">Consultora</p>
                      <p className="font-medium">{auditoria.consultora_nome}</p>
                    </div>
                  )}
                  {auditoria.servico_interesse && (
                    <div>
                      <p className="text-muted-foreground">Servico de Interesse</p>
                      <p className="font-medium">{auditoria.servico_interesse}</p>
                    </div>
                  )}
                  {auditoria.proposta_valor && (
                    <div>
                      <p className="text-muted-foreground">Proposta de Valor</p>
                      <p className="font-medium">{auditoria.proposta_valor}</p>
                    </div>
                  )}
                </div>

                {auditoria.data_agendada && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(auditoria.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {auditoria.hora_agendada && ` as ${auditoria.hora_agendada}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resultado */}
            {auditoria.resultado && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resultado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{auditoria.resultado}</p>
                </CardContent>
              </Card>
            )}

            {/* Notas */}
            {auditoria.notas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{auditoria.notas}</p>
                </CardContent>
              </Card>
            )}

            {/* Acoes - apenas para auditorias ativas */}
            {['pendente', 'agendada', 'realizada'].includes(auditoria.status) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Acoes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Notas / Observacoes</label>
                    <Textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Adicione notas sobre a auditoria..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['pendente', 'agendada'].includes(auditoria.status) && (
                      <Button
                        onClick={handleMarkRealizada}
                        disabled={isUpdating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar como Realizada
                      </Button>
                    )}

                    {['realizada'].includes(auditoria.status) && (
                      <>
                        <Button
                          onClick={handleConvertida}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Converteu (Criar Venda)
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <XCircle className="h-4 w-4 mr-2" />
                              Nao Converteu
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar nao conversao</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acao marcara a auditoria como nao convertida. Deseja continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleNaoConvertida} disabled={isUpdating}>
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Venda Vinculada */}
            {auditoria.venda_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-emerald-500" />
                    Venda Vinculada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/vendas/${auditoria.venda_id}`}>
                      Ver Detalhes da Venda
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Unidade */}
            {auditoria.franchise && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Unidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{auditoria.franchise.nome}</p>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criada em</span>
                  <span>{format(new Date(auditoria.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {auditoria.realizada_em && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Realizada em</span>
                    <span>{format(new Date(auditoria.realizada_em), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
                {auditoria.convertida_em && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Convertida em</span>
                    <span>{format(new Date(auditoria.convertida_em), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
