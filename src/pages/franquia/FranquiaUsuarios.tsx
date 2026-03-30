import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Mail
} from "lucide-react";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

const FranquiaUsuarios = () => {
  const { profile } = useUserProfileAdapter();

  const { data, isLoading } = useQuery({
    queryKey: ["franquia-usuarios", profile?.franchise_id],
    queryFn: async () => {
      if (!profile?.franchise_id) return { usuarios: [], stats: {} };

      const { data: usuarios } = await supabase
        .from("mt_users")
        .select("*")
        .eq("franchise_id", profile.franchise_id)
        .order("created_at", { ascending: false });

      const allUsers = usuarios || [];
      const stats = {
        total: allUsers.length,
        ativos: allUsers.filter((u) => u.status === "aprovado").length,
        pendentes: allUsers.filter((u) => u.status === "pendente" || !u.status).length,
        inativos: allUsers.filter((u) => u.status === "rejeitado" || u.status === "inativo").length,
      };

      return { usuarios: allUsers, stats };
    },
    enabled: !!profile?.franchise_id,
  });

  if (!profile?.franchise_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-red-600">Super Admin</Badge>;
      case "admin":
        return <Badge className="bg-purple-600">Admin</Badge>;
      case "franquia":
        return <Badge className="bg-blue-600">Franquia</Badge>;
      case "atendente":
        return <Badge variant="secondary">Atendente</Badge>;
      default:
        return <Badge variant="outline">Usuário</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "inativo":
        return <Badge variant="outline">Inativo</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Usuários da Unidade</h1>
        <p className="text-muted-foreground">
          Gerencie os usuários da sua franquia
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{data?.stats.total || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{data?.stats.ativos || 0}</span>
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
              <span className="text-2xl font-bold text-amber-600">{data?.stats.pendentes || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold text-gray-400">{data?.stats.inativos || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            Usuários com acesso à sua unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : data?.usuarios.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nenhum usuário encontrado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.usuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={usuario.avatar_url || undefined} />
                      <AvatarFallback>
                        {safeGetInitials(usuario.nome || usuario.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{usuario.nome || usuario.full_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {usuario.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(usuario.role)}
                    {getStatusBadge(usuario.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaUsuarios;
