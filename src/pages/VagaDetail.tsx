import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Edit, Trash2, MapPin, DollarSign, Users, FileText,
  Briefcase, Eye, Calendar, Building2, GraduationCap, Clock,
  Play, Pause, XCircle,
} from "lucide-react";
import { useVagaMT, useVagasMT } from "@/hooks/multitenant/useVagasMT";
import { useCandidatosMT } from "@/hooks/multitenant/useCandidatosMT";
import { VAGA_STATUS_CONFIG, CANDIDATO_STATUS_CONFIG } from "@/types/recrutamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function VagaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vaga, isLoading } = useVagaMT(id);
  const { deleteVaga, updateStatus } = useVagasMT();
  const { candidatos } = useCandidatosMT({ positionId: id });

  const handleDelete = () => {
    if (id) {
      deleteVaga.mutate(id, {
        onSuccess: () => navigate("/recrutamento"),
      });
    }
  };

  const handleStatusChange = (status: "aberta" | "pausada" | "encerrada") => {
    if (id) {
      updateStatus.mutate({ id, status });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-muted-foreground">Vaga não encontrada</h2>
        <Button variant="link" onClick={() => navigate("/recrutamento")}>
          Voltar para Recrutamento
        </Button>
      </div>
    );
  }

  const statusConfig = VAGA_STATUS_CONFIG[vaga.status];
  const salario = vaga.faixa_salarial_min || vaga.faixa_salarial_max
    ? `R$ ${vaga.faixa_salarial_min?.toLocaleString("pt-BR") || "?"} - R$ ${vaga.faixa_salarial_max?.toLocaleString("pt-BR") || "?"}`
    : "A combinar";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recrutamento")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{vaga.titulo}</h1>
              <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              {vaga.departamento && <span>{vaga.departamento}</span>}
              {vaga.nivel && <><span>·</span><span>{vaga.nivel}</span></>}
              {vaga.modalidade && <><span>·</span><span>{vaga.modalidade}</span></>}
              {vaga.tipo_contrato && <><span>·</span><span>{vaga.tipo_contrato}</span></>}
              <span>·</span>
              <span>Criada em {format(new Date(vaga.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Status Actions */}
          {vaga.status === "rascunho" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("aberta")}>
              <Play className="h-4 w-4 mr-1" /> Publicar
            </Button>
          )}
          {vaga.status === "aberta" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("pausada")}>
              <Pause className="h-4 w-4 mr-1" /> Pausar
            </Button>
          )}
          {vaga.status === "pausada" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("aberta")}>
              <Play className="h-4 w-4 mr-1" /> Reabrir
            </Button>
          )}
          {(vaga.status === "aberta" || vaga.status === "pausada") && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("encerrada")}>
              <XCircle className="h-4 w-4 mr-1" /> Encerrar
            </Button>
          )}

          <Button variant="outline" onClick={() => navigate(`/recrutamento/vagas/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a vaga "{vaga.titulo}"? Esta ação não pode ser desfeita.
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Status</span>
            </div>
            <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
              {statusConfig.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Unidade</span>
            </div>
            <p className="font-medium text-sm truncate">
              {vaga.franchise?.nome_fantasia || "Todas"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Salário</span>
            </div>
            <p className="font-medium text-sm">{vaga.exibir_salario ? salario : "A combinar"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Candidatos</span>
            </div>
            <p className="font-medium text-sm">{candidatos.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Visualizações</span>
            </div>
            <p className="font-medium text-sm">{vaga.total_visualizacoes || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Vagas</span>
            </div>
            <p className="font-medium text-sm">
              {vaga.vagas_preenchidas || 0} / {vaga.quantidade_vagas}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Descrição */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {vaga.descricao ? (
              <div>
                <p className="whitespace-pre-wrap">{vaga.descricao}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem descrição</p>
            )}

            {vaga.requisitos && (
              <div>
                <h3 className="font-semibold mb-2">Requisitos</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">{vaga.requisitos}</p>
              </div>
            )}

            {vaga.beneficios && (
              <div>
                <h3 className="font-semibold mb-2">Benefícios</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">{vaga.beneficios}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes Laterais */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Departamento" value={vaga.departamento} />
            <InfoRow label="Nível" value={vaga.nivel} />
            <InfoRow label="Tipo de Contrato" value={vaga.tipo_contrato} />
            <InfoRow label="Modalidade" value={vaga.modalidade} />
            <InfoRow label="Quantidade de Vagas" value={vaga.quantidade_vagas?.toString()} />
            <InfoRow
              label="Faixa Salarial"
              value={vaga.faixa_salarial_min || vaga.faixa_salarial_max ? salario : null}
            />
            <InfoRow
              label="Publicada em"
              value={vaga.publicada_em ? format(new Date(vaga.publicada_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : null}
            />
            <InfoRow
              label="Expira em"
              value={vaga.expira_em ? format(new Date(vaga.expira_em), "dd/MM/yyyy", { locale: ptBR }) : null}
            />
            <InfoRow
              label="Unidade"
              value={
                vaga.franchise
                  ? `${vaga.franchise.nome_fantasia}${vaga.franchise.cidade ? ` - ${vaga.franchise.cidade}/${vaga.franchise.estado}` : ""}`
                  : null
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Candidatos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidatos ({candidatos.length})
          </CardTitle>
          <Button size="sm" onClick={() => navigate(`/recrutamento/candidatos/novo?vaga=${id}`)}>
            + Novo Candidato
          </Button>
        </CardHeader>
        <CardContent>
          {candidatos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum candidato para esta vaga ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {candidatos.map((candidato) => {
                const candStatus = CANDIDATO_STATUS_CONFIG[candidato.status];
                return (
                  <Link
                    key={candidato.id}
                    to={`/recrutamento/candidatos/${candidato.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {candidato.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{candidato.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidato.email}
                          {candidato.cidade && ` · ${candidato.cidade}/${candidato.estado || ""}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidato.rating && (
                        <span className="text-sm text-amber-600">{"★".repeat(Math.min(candidato.rating, 5))}</span>
                      )}
                      <Badge className={`${candStatus.bg} ${candStatus.color} border`}>
                        {candStatus.label}
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
