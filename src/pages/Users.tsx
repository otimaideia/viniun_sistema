import { useState } from "react";
import { Link } from "react-router-dom";
import { useUsersAdapter } from "@/hooks/useUsersAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { UserWithRole, AppRole } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  Building2,
  Users as UsersIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Users = () => {
  const { users, isLoading, approveUser, rejectUser, updateRole, isApproving } = useUsersAdapter();
  const { isAdmin } = useUserProfileAdapter();
  const [search, setSearch] = useState("");
  const [filterApproval, setFilterApproval] = useState<"all" | "pending" | "approved">("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesApproval =
      filterApproval === "all" ||
      (filterApproval === "pending" && !user.is_approved) ||
      (filterApproval === "approved" && user.is_approved);

    return matchesSearch && matchesApproval;
  });

  const pendingCount = users.filter((u) => !u.is_approved).length;
  const approvedCount = users.filter((u) => u.is_approved).length;

  const getRoleBadge = (role: AppRole) => {
    if (role === "admin") {
      return <Badge className="bg-primary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="secondary"><Building2 className="h-3 w-3 mr-1" />Unidade</Badge>;
  };

  const getApprovalBadge = (isApproved: boolean) => {
    if (isApproved) {
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
    }
    return <Badge variant="outline" className="text-amber-600 border-amber-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página. 
              Apenas administradores podem gerenciar usuários.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{users.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{approvedCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Gerenciar Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterApproval} onValueChange={(v) => setFilterApproval(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Nível</TableHead>
                    <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link to={`/usuarios/${user.id}`} className="block hover:text-primary">
                            <p className="font-medium truncate max-w-[200px]">
                              {user.full_name || "Sem nome"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {user.email}
                            </p>
                            <div className="flex gap-2 mt-1 sm:hidden">
                              {getApprovalBadge(user.is_approved)}
                              {getRoleBadge(user.role)}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getApprovalBadge(user.is_approved)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <Link to={`/usuarios/${user.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                            >
                              <Link to={`/usuarios/${user.id}/editar`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            {!user.is_approved ? (
                              <Button
                                size="sm"
                                onClick={() => approveUser(user.id)}
                                disabled={isApproving}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Aprovar</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectUser(user.id)}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Revogar</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
