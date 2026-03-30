import { Link, useParams, useNavigate } from "react-router-dom";
import { useDepartment } from "@/hooks/multitenant/useDepartments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Users,
  Calendar,
  ChevronRight,
  Globe,
  Building,
  MapPin,
  Loader2,
  UserPlus,
  Plus,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { Department } from "@/types/multitenant";

function DepartmentIcon({ iconName, className, style }: { iconName: string; className?: string; style?: React.CSSProperties }) {
  const Icon = (LucideIcons as any)[iconName] || Building2;
  return <Icon className={className} style={style} />;
}

function ScopeBadge({ department }: { department: Department }) {
  const scope = department.franchise_id ? 'franchise' : department.tenant_id ? 'tenant' : 'global';
  const config = {
    global: { label: "Global (todos os tenants)", icon: Globe, color: "text-blue-500" },
    tenant: { label: "Empresa", icon: Building, color: "text-green-500" },
    franchise: { label: "Franquia", icon: MapPin, color: "text-orange-500" },
  };
  const { label, icon: Icon, color } = config[scope];

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span>{label}</span>
    </div>
  );
}

export default function DepartamentoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { department, isLoading, error } = useDepartment(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !department) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Departamento não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/configuracoes/departamentos")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const children = (department as any).children || [];
  const users = (department as any).users || [];
  const parent = (department as any).parent;
  const tenant = (department as any).tenant;
  const franchise = (department as any).franchise;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: department.cor + '20' }}
          >
            <DepartmentIcon
              iconName={department.icone}
              className="h-6 w-6"
              style={{ color: department.cor }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{department.nome}</h1>
            <p className="text-muted-foreground">
              Código: <code className="bg-muted px-2 py-0.5 rounded text-sm">{department.codigo}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/configuracoes/departamentos/novo?parent=${department.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Subdepartamento
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/configuracoes/departamentos/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {department.descricao && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p className="mt-1">{department.descricao}</p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Escopo</p>
                <div className="mt-1">
                  <ScopeBadge department={department} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordem</p>
                <p className="mt-1">{department.ordem}</p>
              </div>
            </div>

            {parent && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Departamento Pai</p>
                  <Link
                    to={`/configuracoes/departamentos/${parent.id}`}
                    className="mt-1 flex items-center gap-2 text-primary hover:underline"
                  >
                    <DepartmentIcon
                      iconName={parent.icone}
                      className="h-4 w-4"
                      style={{ color: parent.cor }}
                    />
                    {parent.nome}
                  </Link>
                </div>
              </>
            )}

            {tenant && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa (Tenant)</p>
                  <p className="mt-1">{tenant.nome_fantasia}</p>
                </div>
              </>
            )}

            {franchise && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Franquia</p>
                <p className="mt-1">{franchise.nome}</p>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground">Cor</p>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: department.cor }}
                />
                <code className="text-sm">{department.cor}</code>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Criado em {new Date(department.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subdepartamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subdepartamentos</CardTitle>
              <CardDescription>{children.length} subdepartamento(s)</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/configuracoes/departamentos/novo?parent=${department.id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum subdepartamento cadastrado
              </p>
            ) : (
              <div className="space-y-2">
                {children.map((child: any) => (
                  <Link
                    key={child.id}
                    to={`/configuracoes/departamentos/${child.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: child.cor + '20' }}
                    >
                      <DepartmentIcon
                        iconName={child.icone}
                        className="h-4 w-4"
                        style={{ color: child.cor }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{child.nome}</p>
                      <p className="text-xs text-muted-foreground">{child.codigo}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários
              </CardTitle>
              <CardDescription>{users.length} usuário(s) neste departamento</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              Adicionar Usuário
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum usuário atribuído a este departamento
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((membership: any) => (
                  <div
                    key={membership.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={membership.user?.avatar_url} />
                      <AvatarFallback>
                        {membership.user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{membership.user?.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {membership.user?.email}
                      </p>
                    </div>
                    {membership.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Principal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
