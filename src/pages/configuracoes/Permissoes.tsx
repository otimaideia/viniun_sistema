import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Shield,
  Lock,
  Info,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Eye,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRolePermissionsAdapter } from "@/hooks/useRolePermissionsAdapter";
import type { AppRole } from "@/types/user";

// Definição de papéis disponíveis
const ROLES: { value: AppRole; label: string; locked: boolean }[] = [
  { value: "super_admin", label: "Super Admin (Franqueadora)", locked: true },
  { value: "admin", label: "Admin da Franquia", locked: false },
  { value: "diretoria", label: "Diretoria/Gestor", locked: false },
  { value: "franqueado", label: "Franqueado", locked: false },
  { value: "gerente", label: "Gerente", locked: false },
  { value: "central", label: "Central", locked: false },
  { value: "marketing", label: "Marketing", locked: false },
  { value: "sdr", label: "SDR", locked: false },
  { value: "consultora_vendas", label: "Consultora de Vendas", locked: false },
  { value: "avaliadora", label: "Avaliadora", locked: false },
  { value: "aplicadora", label: "Aplicadora", locked: false },
  { value: "esteticista", label: "Esteticista", locked: false },
  { value: "unidade", label: "Unidade", locked: false },
];

const Permissoes = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");

  const {
    permissionsByCategory,
    isLoading,
    error,
    refetch,
    updatePermission,
    isUpdating,
    initializePermissions,
  } = useRolePermissionsAdapter(selectedRole);

  const currentRole = ROLES.find(r => r.value === selectedRole);
  const isLocked = currentRole?.locked || false;

  const handlePermissionChange = (
    moduloId: string,
    permissionType: "can_view" | "can_create" | "can_edit" | "can_delete",
    checked: boolean
  ) => {
    if (isLocked) return;
    updatePermission(moduloId, permissionType, checked);
  };

  const handleInitialize = async () => {
    toast.info("Inicializando permissões...");
    await initializePermissions(selectedRole);
    toast.success("Permissões inicializadas!");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Permissões</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permissões por Perfil
          </h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Permissões</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permissões por Perfil
          </h1>
          <p className="text-destructive">Erro ao carregar permissões</p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const categories = Object.keys(permissionsByCategory);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/configuracoes">Configurações</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Permissões</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permissões por Perfil
          </h1>
          <p className="text-muted-foreground">
            Configure as permissões de cada módulo por perfil de acesso
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isUpdating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando...
            </Badge>
          )}
        </div>
      </div>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Selecionar Perfil
          </CardTitle>
          <CardDescription>
            Escolha um perfil para configurar suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione um perfil..." />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    {role.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Permissions Section */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecione um perfil</h3>
            <p className="text-muted-foreground mb-4">
              Escolha um perfil acima para configurar suas permissões de acesso aos módulos.
            </p>
            {!isLocked && (
              <Button onClick={handleInitialize}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Inicializar Permissões
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Editar Privilégios: {currentRole?.label}
            </CardTitle>
            <CardDescription>
              Marque as permissões que este perfil deve ter em cada módulo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-base font-semibold mb-3">{category}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">
                        <div className="flex items-center gap-2">
                          <Checkbox checked disabled className="opacity-50" />
                          Módulos
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <Plus className="h-4 w-4" />
                          Criar
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px]">
                        <div className="flex items-center justify-center gap-1">
                          <Trash2 className="h-4 w-4" />
                          Deletar
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionsByCategory[category].map((perm) => (
                      <TableRow key={perm.modulo_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox checked disabled className="opacity-50" />
                            <span className="font-medium">{perm.modulo_nome}</span>
                            {perm.modulo_is_core && (
                              <Badge variant="secondary" className="text-xs">
                                Core
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm.can_view}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.modulo_id, "can_view", !!checked)
                            }
                            disabled={isLocked || isUpdating}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm.can_create}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.modulo_id, "can_create", !!checked)
                            }
                            disabled={isLocked || isUpdating}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm.can_edit}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.modulo_id, "can_edit", !!checked)
                            }
                            disabled={isLocked || isUpdating}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm.can_delete}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(perm.modulo_id, "can_delete", !!checked)
                            }
                            disabled={isLocked || isUpdating}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Permissoes;
