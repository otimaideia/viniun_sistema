import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useFAQMT, useFAQsMT } from "@/hooks/multitenant/useFAQsMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Pin,
  FileText,
  HelpCircle,
  Loader2,
  Tag,
  Building2,
  FolderOpen,
} from "lucide-react";

export default function FAQDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  const { data: faq, isLoading } = useFAQMT(id);
  const { voteHelpful, remove } = useFAQsMT();

  const isAdmin = accessLevel === "platform" || accessLevel === "tenant";

  const handleVote = (is_helpful: boolean) => {
    if (!id) return;
    voteHelpful.mutate({ faq_id: id, is_helpful });
  };

  const handleDelete = async () => {
    if (!id) return;
    await remove.mutateAsync(id);
    navigate("/processos/faq");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <HelpCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">FAQ nao encontrada</p>
        <Button variant="outline" onClick={() => navigate("/processos/faq")}>
          Voltar para FAQs
        </Button>
      </div>
    );
  }

  const totalVotes = (faq.helpful_count || 0) + (faq.not_helpful_count || 0);
  const helpfulPct =
    totalVotes > 0
      ? Math.round(((faq.helpful_count || 0) / totalVotes) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {faq.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
              <h1 className="text-2xl font-bold tracking-tight">
                {faq.pergunta}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Criada em{" "}
              {new Date(faq.created_at).toLocaleDateString("pt-BR")}
              {faq.updated_at !== faq.created_at && (
                <>
                  {" "}
                  | Atualizada em{" "}
                  {new Date(faq.updated_at).toLocaleDateString("pt-BR")}
                </>
              )}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={`/processos/faq/${id}/editar`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover FAQ</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover esta FAQ? Esta acao nao pode
                    ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Resposta */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {faq.resposta}
            </div>

            {/* Vote Section */}
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Esta resposta foi util?
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(true)}
                  disabled={voteHelpful.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-1.5" />
                  Sim ({faq.helpful_count || 0})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(false)}
                  disabled={voteHelpful.isPending}
                >
                  <ThumbsDown className="h-4 w-4 mr-1.5" />
                  Nao ({faq.not_helpful_count || 0})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Metadata */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Estatisticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Visualizacoes
                </span>
                <span className="font-medium">{faq.views_count || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ThumbsUp className="h-4 w-4" />
                  Util
                </span>
                <span className="font-medium">{faq.helpful_count || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ThumbsDown className="h-4 w-4" />
                  Nao util
                </span>
                <span className="font-medium">
                  {faq.not_helpful_count || 0}
                </span>
              </div>
              {totalVotes > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aprovacao</span>
                    <span className="font-medium">{helpfulPct}%</span>
                  </div>
                  <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${helpfulPct}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Classificacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faq.category && (
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: faq.category.cor
                        ? `${faq.category.cor}20`
                        : undefined,
                      color: faq.category.cor || undefined,
                    }}
                  >
                    {faq.category.nome}
                  </Badge>
                </div>
              )}
              {faq.department && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{faq.department.nome}</span>
                </div>
              )}
              {faq.tags && faq.tags.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {faq.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={faq.is_published ? "default" : "secondary"}>
                  {faq.is_published ? "Publicada" : "Rascunho"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Linked SOP */}
          {faq.sop && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  POP Vinculado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/processos/sop/${faq.sop.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{faq.sop.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {faq.sop.codigo}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
