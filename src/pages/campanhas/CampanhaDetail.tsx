import { Link, useParams, useNavigate } from "react-router-dom";
import { useCampanhasAdapter } from "@/hooks/useCampanhasAdapter";
import { CAMPANHA_TIPOS, CampanhaStatus } from "@/types/campanha";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Megaphone,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Building2,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusBadge = (status: CampanhaStatus) => {
  switch (status) {
    case "ativa":
      return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</Badge>;
    case "pausada":
      return <Badge className="bg-amber-600"><PauseCircle className="h-3 w-3 mr-1" />Pausada</Badge>;
    case "finalizada":
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Finalizada</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const CampanhaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campanhas, isLoading, deleteCampanha, isDeleting } = useCampanhasAdapter({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const campanha = campanhas.find((c) => c.id === id);

  const handleDelete = () => {
    if (id) {
      deleteCampanha(id);
      navigate("/campanhas");
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!campanha) {
    return (
      <div className="text-center py-12">
        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Campanha não encontrada</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/campanhas">Voltar às Campanhas</Link>
        </Button>
      </div>
    );
  }

  const tipoInfo = CAMPANHA_TIPOS.find((t) => t.value === campanha.tipo);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/campanhas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{campanha.nome}</h1>
              {getStatusBadge(campanha.status)}
            </div>
            {campanha.franqueado_nome && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="h-4 w-4" />
                {campanha.franqueado_nome}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/campanhas/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-lg sm:text-xl font-bold">
                {formatCurrency(campanha.orcamento_mensal)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-lg sm:text-xl font-bold">{campanha.leads_count || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">CPL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-lg sm:text-xl font-bold">{formatCurrency(campanha.cpl)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-sm font-medium">{tipoInfo?.label}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Campanha</CardTitle>
          <CardDescription>Informações completas da campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Período</h4>
            <div className="flex items-center gap-4 text-sm">
              {campanha.data_inicio ? (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Início: {format(new Date(campanha.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              ) : (
                <span className="text-muted-foreground">Sem data de início</span>
              )}
              {campanha.data_fim && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Término: {format(new Date(campanha.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Descrição */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h4>
            <p className="text-sm">
              {campanha.descricao || "Nenhuma descrição fornecida."}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Informações do Sistema</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado em:</span>
                <span>{format(new Date(campanha.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              {campanha.updated_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Atualizado em:</span>
                  <span>{format(new Date(campanha.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{campanha.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampanhaDetail;
