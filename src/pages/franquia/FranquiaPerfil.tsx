import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Settings,
  ArrowRight
} from "lucide-react";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

const FranquiaPerfil = () => {
  const { profile, isLoading } = useUserProfileAdapter();

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

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie suas informações
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ) : (
        <>
          {/* Card Principal */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {safeGetInitials(profile?.nome || profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl font-bold">
                    {profile?.nome || profile?.full_name || "Sem nome"}
                  </h2>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                    {getRoleBadge(profile?.role)}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Franquia
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/perfil">
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{profile?.telefone || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões
              </CardTitle>
              <CardDescription>
                Seu nível de acesso no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span>Visualizar Leads</span>
                  <Badge className="bg-green-600">Permitido</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span>Gerenciar Leads</span>
                  <Badge className="bg-green-600">Permitido</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span>WhatsApp</span>
                  <Badge className="bg-green-600">Permitido</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span>Formulários</span>
                  <Badge variant="secondary">Somente Leitura</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span>Configurações da Unidade</span>
                  <Badge variant="secondary">Somente Leitura</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link para Perfil Completo */}
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold">Editar Perfil Completo</h3>
                  <p className="text-sm text-muted-foreground">
                    Atualize suas informações, foto e senha
                  </p>
                </div>
                <Button asChild>
                  <Link to="/perfil">
                    Ir para Perfil
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FranquiaPerfil;
