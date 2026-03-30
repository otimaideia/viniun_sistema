import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Edit, Trash2, Calendar, Clock, MapPin,
  User, Star, Video, Building, Phone, MessageCircle,
  CheckCircle, XCircle, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useEntrevistaMT, useEntrevistasMT } from "@/hooks/multitenant/useEntrevistasMT";
import {
  ENTREVISTA_STATUS_CONFIG,
  ENTREVISTA_TIPO_CONFIG,
  RECOMENDACAO_CONFIG,
  CANDIDATO_STATUS_CONFIG,
  formatWhatsAppUrl,
  EntrevistaStatus,
  EntrevistaTipo,
  Recomendacao,
} from "@/types/recrutamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TIPO_ICON: Record<EntrevistaTipo, typeof Building> = {
  presencial: Building,
  video: Video,
  telefone: Phone,
};

export default function EntrevistaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entrevista, isLoading } = useEntrevistaMT(id);
  const { updateStatus, deleteEntrevista } = useEntrevistasMT();

  const handleDelete = () => {
    if (id) {
      deleteEntrevista.mutate(id, {
        onSuccess: () => navigate("/recrutamento"),
      });
    }
  };

  const handleStatusChange = (status: EntrevistaStatus) => {
    if (id) {
      updateStatus.mutate({ id, status });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!entrevista) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Entrevista não encontrada</h2>
        <Button variant="link" onClick={() => navigate("/recrutamento")}>Voltar para Recrutamento</Button>
      </div>
    );
  }

  const statusConfig = ENTREVISTA_STATUS_CONFIG[entrevista.status];
  const tipoConfig = ENTREVISTA_TIPO_CONFIG[entrevista.tipo || "presencial"];
  const TipoIcon = TIPO_ICON[entrevista.tipo || "presencial"];
  const dataEntrevista = new Date(entrevista.data_entrevista);
  const whatsappUrl = entrevista.candidate
    ? formatWhatsAppUrl(entrevista.candidate.whatsapp || entrevista.candidate.telefone, `Olá ${entrevista.candidate.nome}, tudo bem?`)
    : null;

  // Status actions based on current status
  const statusActions: { label: string; status: EntrevistaStatus; icon: typeof CheckCircle; variant: "outline" | "default" | "destructive" }[] = [];
  if (entrevista.status === "agendada") {
    statusActions.push({ label: "Confirmar", status: "confirmada", icon: CheckCircle, variant: "outline" });
    statusActions.push({ label: "Cancelar", status: "cancelada", icon: XCircle, variant: "destructive" });
  }
  if (entrevista.status === "confirmada") {
    statusActions.push({ label: "Marcar Realizada", status: "realizada", icon: CheckCircle, variant: "default" });
    statusActions.push({ label: "Não Compareceu", status: "no_show", icon: AlertTriangle, variant: "destructive" });
    statusActions.push({ label: "Cancelar", status: "cancelada", icon: XCircle, variant: "destructive" });
  }
  if (entrevista.status === "cancelada" || entrevista.status === "no_show") {
    statusActions.push({ label: "Reagendar", status: "agendada", icon: Calendar, variant: "outline" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recrutamento")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Entrevista</h1>
              <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                {statusConfig.label}
              </Badge>
              {entrevista.etapa_nome && (
                <Badge variant="secondary">{entrevista.etapa_nome}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(dataEntrevista, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              {entrevista.candidate && ` · ${entrevista.candidate.nome}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Status action buttons */}
          {statusActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.status}
                variant={action.variant}
                size="sm"
                onClick={() => handleStatusChange(action.status)}
                disabled={updateStatus.isPending}
              >
                <Icon className="h-4 w-4 mr-1" />
                {action.label}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => navigate(`/recrutamento/entrevistas/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta entrevista? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Data</span>
            </div>
            <p className="font-medium text-sm">{format(dataEntrevista, "dd/MM/yyyy", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{format(dataEntrevista, "HH:mm", { locale: ptBR })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TipoIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tipo</span>
            </div>
            <p className="font-medium text-sm">{tipoConfig.label}</p>
            <p className="text-xs text-muted-foreground">{entrevista.duracao_minutos} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Nota</span>
            </div>
            <p className="font-medium text-sm">
              {entrevista.nota ? `${entrevista.nota}/10` : "Sem nota"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Etapa</span>
            </div>
            <p className="font-medium text-sm">
              {entrevista.etapa_nome || `Etapa ${entrevista.etapa}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Candidato
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entrevista.candidate ? (
              <div className="space-y-3">
                <Link
                  to={`/recrutamento/candidatos/${entrevista.candidate.id}`}
                  className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {entrevista.candidate.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entrevista.candidate.nome}</p>
                      {entrevista.candidate.email && (
                        <p className="text-xs text-muted-foreground truncate">{entrevista.candidate.email}</p>
                      )}
                      <Badge className={`mt-1 text-xs ${CANDIDATO_STATUS_CONFIG[entrevista.candidate.status].bg} ${CANDIDATO_STATUS_CONFIG[entrevista.candidate.status].color} border`}>
                        {CANDIDATO_STATUS_CONFIG[entrevista.candidate.status].label}
                      </Badge>
                    </div>
                  </div>
                </Link>
                {(entrevista.candidate.telefone || entrevista.candidate.whatsapp) && (
                  <div className="flex gap-2">
                    {entrevista.candidate.telefone && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {entrevista.candidate.telefone}
                      </span>
                    )}
                    {whatsappUrl && (
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 ml-auto" asChild>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Candidato não encontrado</p>
            )}
            {entrevista.position && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">Vaga</p>
                <Link
                  to={`/recrutamento/vagas/${entrevista.position.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {entrevista.position.titulo}
                </Link>
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
            {entrevista.local_ou_link && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Local / Link" value={entrevista.local_ou_link} />
            )}
            {entrevista.entrevistador && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Entrevistador"
                value={`${entrevista.entrevistador.nome} (${entrevista.entrevistador.email})`}
              />
            )}
            {!entrevista.entrevistador && entrevista.entrevistador_nome && (
              <InfoRow icon={<User className="h-4 w-4" />} label="Entrevistador" value={entrevista.entrevistador_nome} />
            )}
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Duração" value={`${entrevista.duracao_minutos} minutos`} />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Criada em"
              value={format(new Date(entrevista.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            />
          </CardContent>
        </Card>

        {/* Avaliação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entrevista.nota ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nota</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{entrevista.nota}</span>
                  <span className="text-lg text-muted-foreground">/10</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      entrevista.nota >= 7 ? "bg-emerald-500" : entrevista.nota >= 5 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${entrevista.nota * 10}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem nota</p>
            )}

            {entrevista.recomendacao && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Recomendação</p>
                <Badge className={`${RECOMENDACAO_CONFIG[entrevista.recomendacao].bg} ${RECOMENDACAO_CONFIG[entrevista.recomendacao].color} border`}>
                  {RECOMENDACAO_CONFIG[entrevista.recomendacao].label}
                </Badge>
              </div>
            )}

            {entrevista.feedback ? (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                <p className="text-sm whitespace-pre-wrap">{entrevista.feedback}</p>
              </div>
            ) : (
              !entrevista.nota && !entrevista.recomendacao && (
                <p className="text-sm text-muted-foreground">
                  Avaliação ainda não preenchida.{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/recrutamento/entrevistas/${id}/editar`)}>
                    Editar para avaliar
                  </Button>
                </p>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
