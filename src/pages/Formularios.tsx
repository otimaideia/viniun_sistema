import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useFormulariosAdapter } from "@/hooks/useFormulariosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useUserRoleAdapter } from "@/hooks/useUserRoleAdapter";
import type { FormularioStatus } from "@/types/formulario";
import { STATUS_LABELS } from "@/types/formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Formularios() {
  const navigate = useNavigate();
  const { canViewAllLeads } = useUserProfileAdapter();
  const { isSuperAdmin } = useUserRoleAdapter();
  const { hasPermission } = useUserPermissions();
  const {
    formularios,
    isLoading,
    deleteFormulario,
    duplicateFormulario,
  } = useFormulariosAdapter({ includeStats: true });

  // Verificar se pode editar um formulário
  const canEditForm = (form: { is_system?: boolean }) => {
    if (!hasPermission('formularios.edit')) return false;
    if (form.is_system && !isSuperAdmin) return false;
    return true;
  };

  // Verificar se pode deletar
  const canDeleteForm = (form: { is_system?: boolean }) => {
    if (!hasPermission('formularios.delete')) return false;
    if (form.is_system && !isSuperAdmin) return false;
    return true;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtrar formularios
  const filteredFormularios = formularios.filter((form) => {
    const matchesSearch =
      form.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Copiar URL publica
  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  // Deletar formulario
  const handleDelete = (id: string, nome: string) => {
    if (!hasPermission('formularios.delete')) {
      toast.error('Você não tem permissão para excluir formulários');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o formulario "${nome}"?`)) {
      deleteFormulario(id);
    }
  };

  // Duplicar formulario
  const handleDuplicate = async (id: string, nome: string) => {
    if (!hasPermission('formularios.create')) {
      toast.error('Você não tem permissão para duplicar formulários');
      return;
    }
    const newName = prompt("Nome do novo formulario:", `${nome} (Copia)`);
    if (newName) {
      await duplicateFormulario(id, newName);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Formularios</h1>
            <p className="text-muted-foreground">
              Crie e gerencie formularios de captacao de leads
            </p>
          </div>
          {hasPermission('formularios.create') && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button className="flex-1 sm:flex-none" onClick={() => navigate("/formularios/novo")}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Formulario</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Formularios */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFormularios.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum formulario encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Crie seu primeiro formulario para comecar"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => navigate("/formularios/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Formulario
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cards para Mobile */}
            <div className="grid gap-4 md:hidden">
              {filteredFormularios.map((form) => (
                <Card key={form.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{form.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">/form/{form.slug}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/formularios/${form.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/formularios/${form.id}/editar`)}
                            disabled={!canEditForm(form)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                            {form.is_system && !isSuperAdmin && " (Sistema)"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyPublicUrl(form.slug)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar URL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/form/${form.slug}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir Formulario
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicate(form.id, form.nome)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          {canDeleteForm(form) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(form.id, form.nome)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {form.is_system && (
                        <Badge variant="outline" className="border-blue-500 text-blue-500">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Sistema
                        </Badge>
                      )}
                      <Badge
                        variant={form.status === "ativo" ? "default" : "secondary"}
                        className={form.status === "ativo" ? "bg-green-500" : ""}
                      >
                        {STATUS_LABELS[form.status as FormularioStatus] || form.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {form.stats?.total_submits || 0} submissoes
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{form.franqueado?.nome_fantasia || "-"}</span>
                      <span>
                        {form.created_at
                          ? format(new Date(form.created_at), "dd/MM/yy", { locale: ptBR })
                          : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabela para Desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formulario</TableHead>
                      <TableHead>Franquia</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Submissoes</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFormularios.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{form.nome}</p>
                            <p className="text-sm text-muted-foreground">/form/{form.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>{form.franqueado?.nome_fantasia || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {form.is_system && (
                              <Badge variant="outline" className="border-blue-500 text-blue-500">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Sistema
                              </Badge>
                            )}
                            <Badge
                              variant={form.status === "ativo" ? "default" : "secondary"}
                              className={form.status === "ativo" ? "bg-green-500" : ""}
                            >
                              {STATUS_LABELS[form.status as FormularioStatus] || form.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {form.stats?.total_submits || 0}
                        </TableCell>
                        <TableCell>
                          {form.created_at
                            ? format(new Date(form.created_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/formularios/${form.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/formularios/${form.id}/editar`)}
                                disabled={!canEditForm(form)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                                {form.is_system && !isSuperAdmin && " (Sistema)"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyPublicUrl(form.slug)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(`/form/${form.slug}`, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir Formulario
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDuplicate(form.id, form.nome)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              {canDeleteForm(form) && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(form.id, form.nome)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
