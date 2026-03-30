import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, ClipboardList,
  Users, User, Building2, UsersRound, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useChecklistTemplatesMT } from "@/hooks/multitenant/useChecklistTemplatesMT";
import { useTenantContext } from "@/contexts/TenantContext";
import {
  ASSIGNMENT_TYPE_LABELS, RECURRENCE_LABELS,
  type ChecklistAssignmentType, type ChecklistRecurrence
} from "@/types/checklist";

const ASSIGNMENT_ICONS: Record<ChecklistAssignmentType, React.ElementType> = {
  role: Users,
  user: User,
  department: Building2,
  team: UsersRound,
};

export default function ChecklistTemplates() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();
  const [search, setSearch] = useState("");
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [filterRecurrence, setFilterRecurrence] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates, isLoading, refetch, remove } = useChecklistTemplatesMT({
    search: search || undefined,
    assignment_type: filterAssignment !== "all" ? filterAssignment as ChecklistAssignmentType : undefined,
    recurrence: filterRecurrence !== "all" ? filterRecurrence as ChecklistRecurrence : undefined,
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // toast handled by hook
    }
  };

  const getAssignmentLabel = (template: any) => {
    if (template.assigned_user) return template.assigned_user.nome;
    if (template.role) return template.role.nome;
    if (template.department) return template.department.nome;
    if (template.team) return template.team.nome;
    return '-';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Templates de Checklist
            </h1>
            <p className="text-muted-foreground">
              Gerencie os modelos de checklist diário por cargo, pessoa ou equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button asChild>
              <Link to="/checklist/novo">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Atribuição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas atribuições</SelectItem>
                  <SelectItem value="role">Cargo</SelectItem>
                  <SelectItem value="user">Pessoa</SelectItem>
                  <SelectItem value="department">Departamento</SelectItem>
                  <SelectItem value="team">Equipe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRecurrence} onValueChange={setFilterRecurrence}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Recorrência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {!templates?.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum template encontrado</h3>
                <p className="text-muted-foreground mb-4">Crie seu primeiro template de checklist</p>
                <Button asChild>
                  <Link to="/checklist/novo">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Atribuição</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => {
                    const AssignIcon = ASSIGNMENT_ICONS[template.assignment_type];
                    return (
                      <TableRow
                        key={template.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/checklist/${template.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: template.cor }}
                            />
                            <span className="font-medium">{template.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <AssignIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {ASSIGNMENT_TYPE_LABELS[template.assignment_type]}:
                            </span>
                            <span>{getAssignmentLabel(template)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {RECURRENCE_LABELS[template.recurrence]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {template._items_count || 0}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {template.hora_inicio?.slice(0, 5)} - {template.hora_fim?.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/checklist/${template.id}`); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/checklist/${template.id}/editar`); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(template.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir template?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O template será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
