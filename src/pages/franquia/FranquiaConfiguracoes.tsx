import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Shield,
  CheckCircle2,
  Puzzle
} from "lucide-react";

const FranquiaConfiguracoes = () => {
  const { profile, isLoading: isProfileLoading } = useUserProfileAdapter();
  const { franqueados, isLoading: isFranqueadosLoading } = useFranqueadosAdapter();

  const franqueado = franqueados.find((f) => f.id === profile?.franqueado_id);
  const isLoading = isProfileLoading || isFranqueadosLoading;

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const modulosAtivos = [
    { nome: "Leads", ativo: true },
    { nome: "WhatsApp", ativo: true },
    { nome: "Agendamentos", ativo: true },
    { nome: "Formulários", ativo: true },
    { nome: "Funil de Vendas", ativo: true },
    { nome: "Relatórios", ativo: false },
    { nome: "Campanhas", ativo: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações da Unidade</h1>
        <p className="text-muted-foreground">
          Informações e configurações da sua franquia
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ) : (
        <>
          {/* Dados da Unidade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Unidade
              </CardTitle>
              <CardDescription>Informações cadastrais (somente leitura)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
                  <p className="text-lg font-semibold">{franqueado?.nome_fantasia || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                  <p>{franqueado?.razao_social || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p>{franqueado?.cnpj || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge className={franqueado?.status === "ativo" ? "bg-green-600" : "bg-gray-600"}>
                      {franqueado?.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
                  <p>{franqueado?.endereco || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <p>{franqueado?.cidade || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <p>{franqueado?.estado || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p>{franqueado?.cep || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conta do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sua Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p>{profile?.nome || profile?.full_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {profile?.email || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {profile?.telefone || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Papel</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Shield className="h-3 w-3" />
                      {profile?.role || "Usuário"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Módulos Ativos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Módulos Ativos
              </CardTitle>
              <CardDescription>
                Módulos habilitados para sua unidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {modulosAtivos.map((modulo) => (
                  <div
                    key={modulo.nome}
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      modulo.ativo ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${modulo.ativo ? "text-green-600" : "text-gray-400"}`}
                    />
                    <span className={`text-sm ${modulo.ativo ? "font-medium" : "text-muted-foreground"}`}>
                      {modulo.nome}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FranquiaConfiguracoes;
