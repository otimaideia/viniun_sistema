import { useState } from "react";
import { Link } from "react-router-dom";
import { useTeams } from "@/hooks/multitenant/useTeams";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Building2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import type { Team } from "@/types/multitenant";

function TeamIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Users;
  return <Icon className={className} />;
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

export default function Equipes() {
  const [search, setSearch] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const { teams, isLoading, deleteTeam } = useTeams();
  const { accessLevel } = useTenantContext();

  const filteredTeams = teams.filter((team) => {
    const searchLower = search.toLowerCase();
    return (
      team.nome.toLowerCase().includes(searchLower) ||
      team.codigo.toLowerCase().includes(searchLower) ||
      team.descricao?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async () => {
    if (!teamToDelete) return;

    try {
      await deleteTeam(teamToDelete.id);
      toast.success("Equipe excluída com sucesso");
      setTeamToDelete(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Erro ao excluir equipe");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipes</h1>
          <p className="text-muted-foreground">
            Gerencie as equipes de trabalho da organização
          </p>
        </div>
        <Button asChild>
          <Link to="/configuracoes/equipes/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Equipes</CardTitle>
          <CardDescription>
            {filteredTeams.length} equipe(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma equipe encontrada</p>
              {search && (
                <Button
                  variant="link"
                  onClick={() => setSearch("")}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
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
                          <p className="font-medium">{team.nome}</p>
                          {team.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {team.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {team.codigo}
                      </code>
                    </TableCell>
                    <TableCell>
                      {team.lider ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={team.lider.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {team.lider.nome?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{team.lider.nome}</span>
                          <Crown className="h-3 w-3 text-yellow-500" />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Sem líder
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {team.member_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ScopeBadge team={team} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/configuracoes/equipes/${team.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/configuracoes/equipes/${team.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTeamToDelete(team)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!teamToDelete}
        onOpenChange={() => setTeamToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe{" "}
              <strong>{teamToDelete?.nome}</strong>?
              <br />
              Esta ação não pode ser desfeita e removerá todos os membros da
              equipe.
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
  );
}
