import { useParams, useNavigate, Link } from "react-router-dom";
import { useTeam, useTeams } from "@/hooks/multitenant/useTeams";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Trash2,
  Loader2,
  Users,
  Building2,
  Crown,
  UserMinus,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import type { Team, TeamMember } from "@/types/multitenant";

function TeamIcon({ iconName, className, style }: { iconName: string; className?: string; style?: React.CSSProperties }) {
  const Icon = (LucideIcons as any)[iconName] || Users;
  return <Icon className={className} style={style} />;
}

function ScopeBadge({ team }: { team: Team }) {
  if (team.franchise_id) {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        <Building2 className="h-3 w-3 mr-1" />
        Franquia
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Building2 className="h-3 w-3 mr-1" />
      Empresa
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { label: string; className: string }> = {
    lider: { label: "Líder", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    sublider: { label: "Sublíder", className: "bg-orange-50 text-orange-700 border-orange-200" },
    membro: { label: "Membro", className: "bg-gray-50 text-gray-700 border-gray-200" },
  };

  const config = roleConfig[role] || roleConfig.membro;

  return (
    <Badge variant="outline" className={config.className}>
      {role === "lider" && <Crown className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

export default function EquipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { team, members, isLoading } = useTeam(id);
  const { deleteTeam } = useTeams();
  const { accessLevel } = useTenantContext();

  const handleDelete = async () => {
    if (!team) return;

    try {
      await deleteTeam(team.id);
      toast.success("Equipe excluída com sucesso");
      navigate("/configuracoes/equipes");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao excluir equipe");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Equipe não encontrada</p>
        <Button variant="link" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: team.cor + "20" }}
            >
              <TeamIcon
                iconName={team.icone}
                className="h-6 w-6"
                style={{ color: team.cor }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{team.nome}</h1>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-0.5 rounded">
                  {team.codigo}
                </code>
                <ScopeBadge team={team} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/configuracoes/equipes/${team.id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a equipe{" "}
                  <strong>{team.nome}</strong>?
                  <br />
                  Esta ação não pode ser desfeita e removerá todos os membros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
            <CardDescription>Dados básicos da equipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.descricao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Descrição
                </label>
                <p className="mt-1">{team.descricao}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Código
                </label>
                <p className="mt-1">
                  <code className="bg-muted px-2 py-1 rounded">
                    {team.codigo}
                  </code>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Escopo
                </label>
                <p className="mt-1">
                  <ScopeBadge team={team} />
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Visual
              </label>
              <div className="mt-2 flex items-center gap-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: team.cor + "20" }}
                >
                  <TeamIcon
                    iconName={team.icone}
                    className="h-5 w-5"
                    style={{ color: team.cor }}
                  />
                </div>
                <div>
                  <p className="text-sm">{team.icone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-4 w-4 rounded border"
                      style={{ backgroundColor: team.cor }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {team.cor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Líder da Equipe
              </label>
              {team.lider ? (
                <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar>
                    <AvatarImage src={team.lider.avatar_url} />
                    <AvatarFallback>
                      {team.lider.nome?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {team.lider.nome}
                      <Crown className="h-4 w-4 text-yellow-500" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {team.lider.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  Nenhum líder definido
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Membros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              {members.length} membro(s) na equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mb-2 opacity-50" />
                <p>Nenhum membro na equipe</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to={`/configuracoes/equipes/${team.id}/editar`}>
                    Adicionar membros
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback>
                        {member.user?.nome?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.user?.nome || "Usuário não encontrado"}
                      </p>
                      {member.user?.email && (
                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.user.email}
                        </p>
                      )}
                    </div>
                    <RoleBadge role={member.role_in_team} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timestamps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Criado em:{" "}
              {new Date(team.created_at).toLocaleString("pt-BR")}
            </span>
            <span>
              Atualizado em:{" "}
              {new Date(team.updated_at).toLocaleString("pt-BR")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
