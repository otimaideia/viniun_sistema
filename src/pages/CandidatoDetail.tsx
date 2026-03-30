import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Calendar, FileText,
  Briefcase, Star, ExternalLink, MessageCircle, Linkedin, Globe, DollarSign,
  GraduationCap, Clock, User, MapPinned,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCandidatoMT, useCandidatosMT } from "@/hooks/multitenant/useCandidatosMT";
import { useEntrevistasMT } from "@/hooks/multitenant/useEntrevistasMT";
import {
  CANDIDATO_STATUS_CONFIG, ENTREVISTA_STATUS_CONFIG,
  getProfileCompleteness, getCompletenessColor, formatWhatsAppUrl,
} from "@/types/recrutamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CandidatoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidato, isLoading } = useCandidatoMT(id);
  const { deleteCandidato } = useCandidatosMT();
  const { entrevistas } = useEntrevistasMT({ candidateId: id });

  const handleDelete = () => {
    if (id) {
      deleteCandidato.mutate(id, {
        onSuccess: () => navigate("/recrutamento"),
      });
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

  if (!candidato) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Candidato não encontrado</h2>
        <Button variant="link" onClick={() => navigate("/recrutamento")}>Voltar para Recrutamento</Button>
      </div>
    );
  }

  const statusConfig = CANDIDATO_STATUS_CONFIG[candidato.status];
  const completeness = getProfileCompleteness(candidato);
  const completenessColor = getCompletenessColor(completeness);
  const whatsappUrl = formatWhatsAppUrl(candidato.whatsapp || candidato.telefone, `Olá ${candidato.nome}, tudo bem?`);

  // Montar URL completa do currículo no Supabase Storage
  const curriculoFullUrl = candidato.curriculo_url
    ? candidato.curriculo_url.startsWith("http")
      ? candidato.curriculo_url
      : supabase.storage.from("curriculos").getPublicUrl(candidato.curriculo_url.replace(/^curriculos\//, "")).data.publicUrl
    : null;

  // Endereço formatado
  const enderecoCompleto = [
    candidato.endereco,
    candidato.numero && `nº ${candidato.numero}`,
    candidato.complemento,
  ].filter(Boolean).join(", ");
  const cidadeEstado = [candidato.bairro, candidato.cidade && candidato.estado ? `${candidato.cidade}/${candidato.estado}` : candidato.cidade].filter(Boolean).join(" - ");
  const cepFormatado = candidato.cep ? candidato.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : null;

  const sexoLabel: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Outro", nao_informar: "Prefiro não informar" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recrutamento")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
              {candidato.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{candidato.nome}</h1>
                <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                  {statusConfig.label}
                </Badge>
                <Badge className={`${completenessColor.bg} ${completenessColor.color} border`}>
                  {completeness}% {completenessColor.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {candidato.position?.titulo && `${candidato.position.titulo} · `}
                Cadastrado em {format(new Date(candidato.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {whatsappUrl && (
            <Button variant="outline" size="sm" className="text-green-600 border-green-200" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/recrutamento/entrevistas/nova?candidato=${id}`)}>
            <Calendar className="h-4 w-4 mr-1" /> Agendar Entrevista
          </Button>
          <Button variant="outline" onClick={() => navigate(`/recrutamento/candidatos/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o candidato "{candidato.nome}"?
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
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Vaga</span>
            </div>
            <p className="font-medium text-sm truncate">{candidato.position?.titulo || "Sem vaga"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Localização</span>
            </div>
            <p className="font-medium text-sm">
              {enderecoCompleto || cidadeEstado || "Não informado"}
              {enderecoCompleto && cidadeEstado && <br />}
              {enderecoCompleto ? cidadeEstado : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avaliação</span>
            </div>
            <p className="font-medium text-sm">
              {candidato.rating ? `${"★".repeat(Math.min(candidato.rating, 5))}${"☆".repeat(Math.max(5 - candidato.rating, 0))}` : "Sem avaliação"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Entrevistas</span>
            </div>
            <p className="font-medium text-sm">{entrevistas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {candidato.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${candidato.email}`} className="text-sm text-primary hover:underline truncate">{candidato.email}</a>
              </div>
            )}
            {(candidato.whatsapp || candidato.telefone) && (
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-green-600 shrink-0" />
                <a
                  href={whatsappUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:underline"
                >
                  {candidato.whatsapp || candidato.telefone}
                </a>
              </div>
            )}
            {candidato.sexo && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">Sexo: {sexoLabel[candidato.sexo] || candidato.sexo}</span>
              </div>
            )}
            {candidato.data_nascimento && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">Nascimento: {format(new Date(candidato.data_nascimento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {candidato.cpf && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">CPF: {candidato.cpf}</span>
              </div>
            )}

            {/* Endereço */}
            {(candidato.endereco || candidato.cep || candidato.cidade) && (
              <div className="pt-2 border-t">
                <div className="flex items-start gap-3">
                  <MapPinned className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm space-y-0.5">
                    {enderecoCompleto && <p>{enderecoCompleto}</p>}
                    {cidadeEstado && <p>{cidadeEstado}</p>}
                    {cepFormatado && <p className="text-muted-foreground">CEP: {cepFormatado}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            {(candidato.linkedin_url || candidato.portfolio_url || curriculoFullUrl) && (
              <div className="pt-2 border-t space-y-2">
                {candidato.linkedin_url && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={candidato.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {candidato.portfolio_url && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={candidato.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      Portfólio <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {curriculoFullUrl && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={curriculoFullUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      Ver Currículo <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profissional */}
        <Card>
          <CardHeader><CardTitle className="text-base">Profissional</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Formação" value={candidato.formacao} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Disponibilidade" value={candidato.disponibilidade} />
            <InfoRow
              icon={<DollarSign className="h-4 w-4" />}
              label="Pretensão Salarial"
              value={candidato.pretensao_salarial ? `R$ ${candidato.pretensao_salarial.toLocaleString("pt-BR")}` : null}
            />
            {candidato.experiencia && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Experiência</p>
                <p className="text-sm whitespace-pre-wrap">{candidato.experiencia}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notas Internas</CardTitle></CardHeader>
          <CardContent>
            {candidato.notas ? (
              <p className="text-sm whitespace-pre-wrap">{candidato.notas}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem notas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entrevistas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Entrevistas ({entrevistas.length})
          </CardTitle>
          <Button size="sm" onClick={() => navigate(`/recrutamento/entrevistas/nova?candidato=${id}`)}>
            + Agendar
          </Button>
        </CardHeader>
        <CardContent>
          {entrevistas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma entrevista agendada.</p>
          ) : (
            <div className="space-y-2">
              {entrevistas.map((ent) => {
                const entStatus = ENTREVISTA_STATUS_CONFIG[ent.status];
                return (
                  <Link
                    key={ent.id}
                    to={`/recrutamento/entrevistas/${ent.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(ent.data_entrevista), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ent.tipo ? ent.tipo.charAt(0).toUpperCase() + ent.tipo.slice(1) : ""}
                        {ent.local_ou_link && ` · ${ent.local_ou_link}`}
                        {ent.etapa_nome && ` · ${ent.etapa_nome}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ent.nota && (
                        <span className="text-sm font-medium">{ent.nota}/10</span>
                      )}
                      <Badge className={`${entStatus.bg} ${entStatus.color} border`}>
                        {entStatus.label}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
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
