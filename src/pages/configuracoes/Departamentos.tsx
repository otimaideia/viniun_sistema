import { useState } from "react";
import { Link } from "react-router-dom";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import { useTenantContext } from "@/contexts/TenantContext";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  ChevronRight,
  Globe,
  Building,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Department } from "@/types/multitenant";

// Ícones disponíveis para departamentos
import * as LucideIcons from "lucide-react";

function DepartmentIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Building2;
  return <Icon className={className} />;
}

function ScopeBadge({ scope }: { scope: string }) {
  const config = {
    global: { label: "Global", icon: Globe, variant: "secondary" as const },
    tenant: { label: "Empresa", icon: Building, variant: "default" as const },
    franchise: { label: "Franquia", icon: MapPin, variant: "outline" as const },
  };
  const { label, icon: Icon, variant } = config[scope as keyof typeof config] || config.global;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function Departamentos() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { accessLevel, franchise } = useTenantContext();
  const { hasPermission, isPlatformAdmin, isTenantAdmin, isFranchiseAdmin } = useUserPermissions();

  const { departmentTree, isLoading, error, deleteDepartment } = useDepartments();

  // Filtrar departamentos por busca
  const filteredDepartments = departmentTree.filter((dept) => {
    const searchLower = search.toLowerCase();
    const matchesDept = dept.nome.toLowerCase().includes(searchLower) ||
                        dept.codigo.toLowerCase().includes(searchLower);
    const matchesChildren = dept.children?.some(
      (child) => child.nome.toLowerCase().includes(searchLower) ||
                 child.codigo.toLowerCase().includes(searchLower)
    );
    return matchesDept || matchesChildren;
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await deleteDepartment(deleteId);
      toast.success("Departamento removido com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover departamento");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Permissões dinâmicas - platform/tenant admins sempre podem, outros precisam permissão específica
  const canCreate = isPlatformAdmin || isTenantAdmin || hasPermission('departamentos.create');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Erro ao carregar departamentos</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie a estrutura de departamentos e subdepartamentos
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/configuracoes/departamentos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Departamento
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Departamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Estrutura de Departamentos</CardTitle>
          <CardDescription>
            {filteredDepartments.length} departamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Departamento</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum departamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((dept) => (
                  <>
                    {/* Departamento pai */}
                    <DepartmentRow
                      key={dept.id}
                      department={dept}
                      level={0}
                      onDelete={setDeleteId}
                      canEdit={canCreate}
                      canDelete={isPlatformAdmin || isTenantAdmin || hasPermission('departamentos.delete')}
                      isFranchiseAdmin={isFranchiseAdmin}
                      currentFranchiseId={franchise?.id}
                    />
                    {/* Subdepartamentos */}
                    {dept.children?.map((child) => (
                      <DepartmentRow
                        key={child.id}
                        department={child}
                        level={1}
                        onDelete={setDeleteId}
                        canEdit={canCreate}
                        canDelete={isPlatformAdmin || isTenantAdmin || hasPermission('departamentos.delete')}
                        isFranchiseAdmin={isFranchiseAdmin}
                        currentFranchiseId={franchise?.id}
                      />
                    ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este departamento?
              Esta ação não pode ser desfeita e todos os subdepartamentos também serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de linha da tabela
function DepartmentRow({
  department,
  level,
  onDelete,
  canEdit,
  canDelete,
  isFranchiseAdmin,
  currentFranchiseId,
}: {
  department: Department & { children?: Department[] };
  level: number;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isFranchiseAdmin?: boolean;
  currentFranchiseId?: string;
}) {
  const scope = (department as Record<string, unknown>).scope as string ||
    (department.franchise_id ? 'franchise' : department.tenant_id ? 'tenant' : 'global');

  // Franchise admins podem excluir departamentos com escopo "franchise" da sua franquia
  const canDeleteThisDept = canDelete ||
    (isFranchiseAdmin && scope === 'franchise' && department.franchise_id === currentFranchiseId);

  return (
    <TableRow className={level > 0 ? "bg-muted/30" : ""}>
      <TableCell>
        <div className="flex items-center gap-3" style={{ paddingLeft: level * 24 }}>
          {level > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: department.cor + '20' }}
          >
            <DepartmentIcon
              iconName={department.icone}
              className="h-4 w-4"
              style={{ color: department.cor }}
            />
          </div>
          <div>
            <p className="font-medium">{department.nome}</p>
            {department.descricao && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {department.descricao}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {department.codigo}
        </code>
      </TableCell>
      <TableCell>
        <ScopeBadge scope={scope} />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{(department as Record<string, unknown>).user_count as number || 0}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/configuracoes/departamentos/${department.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Link>
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem asChild>
                <Link to={`/configuracoes/departamentos/${department.id}/editar`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem asChild>
                <Link to={`/configuracoes/departamentos/novo?parent=${department.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Subdepartamento
                </Link>
              </DropdownMenuItem>
            )}
            {canDeleteThisDept && (
              <DropdownMenuItem
                onClick={() => onDelete(department.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
