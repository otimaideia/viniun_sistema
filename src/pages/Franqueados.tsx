import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { Franqueado } from "@/types/franqueado";
import { FranqueadoFormModal } from "@/components/franqueados/FranqueadoFormModal";
import { FranqueadoDetailModal } from "@/components/franqueados/FranqueadoDetailModal";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye
} from "lucide-react";
import { FRANQUEADO_STATUS } from "@/types/franqueado";

const Franqueados = () => {
  const navigate = useNavigate();
  const { franqueados, isLoading, createFranqueado, updateFranqueado, deleteFranqueado, isCreating, isUpdating } = useFranqueadosAdapter();
  const { isAdmin } = useUserProfileAdapter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFranqueado, setEditingFranqueado] = useState<Franqueado | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailFranqueado, setDetailFranqueado] = useState<Franqueado | null>(null);

  const estados = [...new Set(franqueados.map(f => f.estado).filter(Boolean))].sort();

  const filteredFranqueados = franqueados.filter((f) => {
    const matchesSearch =
      f.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
      f.cidade?.toLowerCase().includes(search.toLowerCase()) ||
      f.responsavel?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesEstado = estadoFilter === "all" || f.estado === estadoFilter;

    return matchesSearch && matchesStatus && matchesEstado;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Concluído":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Em configuração":
        return <Badge className="bg-blue-600"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Falta LP":
        return <Badge className="bg-amber-600"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Não inaugurada":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "A iniciar":
        return <Badge variant="outline">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleNew = () => {
    setEditingFranqueado(null);
    setModalOpen(true);
  };

  const handleEdit = (franqueado: Franqueado) => {
    setEditingFranqueado(franqueado);
    setModalOpen(true);
  };

  const handleSave = (data: Partial<Franqueado>) => {
    if (editingFranqueado) {
      updateFranqueado({ id: editingFranqueado.id, ...data });
    } else {
      createFranqueado(data);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteFranqueado(deleteId);
      setDeleteId(null);
    }
  };

  const statusCounts = {
    total: franqueados.length,
    concluido: franqueados.filter(f => f.status === "Concluído").length,
    configurando: franqueados.filter(f => f.status === "Em configuração").length,
    faltaLp: franqueados.filter(f => f.status === "Falta LP").length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">{statusCounts.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold">{statusCounts.concluido}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Em Config.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold">{statusCounts.configurando}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Falta LP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xl sm:text-2xl font-bold">{statusCounts.faltaLp}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">Franqueados</CardTitle>
          {isAdmin && (
            <Button onClick={handleNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Franqueado
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade, responsável..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {FRANQUEADO_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados.map((e) => (
                  <SelectItem key={e} value={e!}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
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
                    <TableHead>Franqueado</TableHead>
                    <TableHead className="hidden md:table-cell">Localização</TableHead>
                    <TableHead className="hidden lg:table-cell">Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFranqueados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum franqueado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFranqueados.map((f) => (
                      <TableRow 
                        key={f.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/franqueados/${f.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{f.nome_fantasia}</p>
                            <p className="text-sm text-muted-foreground">{f.responsavel}</p>
                            <div className="flex gap-2 mt-1 md:hidden">
                              {f.cidade && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{f.cidade}/{f.estado}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{f.cidade || "-"}</span>
                            {f.estado && <span className="text-muted-foreground">/ {f.estado}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1 text-sm">
                            {f.whatsapp_business && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{f.whatsapp_business}</span>
                              </div>
                            )}
                            {f.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[180px]">{f.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(f.status)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/franqueados/${f.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(f)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {f.landing_page_site && (
                              <Button
                                size="icon"
                                variant="ghost"
                                asChild
                                title="Abrir Landing Page"
                              >
                                <a href={f.landing_page_site} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeleteId(f.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
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

          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Mostrando {filteredFranqueados.length} de {franqueados.length} franqueados
          </p>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <FranqueadoDetailModal
        open={!!detailFranqueado}
        onOpenChange={(open) => !open && setDetailFranqueado(null)}
        franqueado={detailFranqueado}
      />

      {/* Form Modal */}
      <FranqueadoFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        franqueado={editingFranqueado}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este franqueado? Esta ação não pode ser desfeita.
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
  );
};

export default Franqueados;
