import { useState } from "react";
import { useDiretoriasAdapter } from "@/hooks/useDiretoriasAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { Diretoria, DiretoriaFormData } from "@/types/diretoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FolderTree,
  CheckCircle2,
  XCircle,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Diretorias = () => {
  const {
    diretorias,
    isLoading,
    stats,
    createDiretoria,
    updateDiretoria,
    deleteDiretoria,
    isCreating,
    isUpdating
  } = useDiretoriasAdapter();
  const { isAdmin } = useUserProfileAdapter();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiretoria, setEditingDiretoria] = useState<Diretoria | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DiretoriaFormData>({
    nome: "",
    regiao: "",
    descricao: "",
    is_active: true,
  });

  const filteredDiretorias = diretorias.filter((d) => {
    const matchesSearch =
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.regiao?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleNew = () => {
    setEditingDiretoria(null);
    setFormData({
      nome: "",
      regiao: "",
      descricao: "",
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (diretoria: Diretoria) => {
    setEditingDiretoria(diretoria);
    setFormData({
      nome: diretoria.nome,
      regiao: diretoria.regiao || "",
      descricao: diretoria.descricao || "",
      is_active: diretoria.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) return;

    if (editingDiretoria) {
      updateDiretoria({ id: editingDiretoria.id, ...formData });
    } else {
      createDiretoria(formData);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteDiretoria(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.ativas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Inativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <span className="text-xl sm:text-2xl font-bold">{stats.inativas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Diretorias</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as diretorias regionais e vincule franquias
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Diretoria
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou região..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Região</TableHead>
                    <TableHead className="hidden md:table-cell">Franquias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiretorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma diretoria encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDiretorias.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{d.nome}</p>
                            {d.descricao && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {d.descricao}
                              </p>
                            )}
                            <div className="flex gap-2 mt-1 md:hidden">
                              {d.regiao && (
                                <span className="text-xs text-muted-foreground">
                                  {d.regiao}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {d.regiao || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{d.franquias_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {d.is_active ? (
                            <Badge className="bg-green-600">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(d)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeleteId(d.id)}
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
            Mostrando {filteredDiretorias.length} de {diretorias.length} diretorias
          </p>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingDiretoria ? "Editar Diretoria" : "Nova Diretoria"}
            </DialogTitle>
            <DialogDescription>
              {editingDiretoria
                ? "Altere os dados da diretoria regional"
                : "Cadastre uma nova diretoria regional"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Diretoria Sul"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regiao">Região</Label>
              <Input
                id="regiao"
                value={formData.regiao}
                onChange={(e) => setFormData({ ...formData, regiao: e.target.value })}
                placeholder="Ex: Sul do Brasil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva as responsabilidades desta diretoria..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Status</Label>
                <p className="text-sm text-muted-foreground">
                  Diretoria ativa pode receber franquias
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome.trim() || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta diretoria? As franquias vinculadas serão desvinculadas automaticamente.
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

export default Diretorias;
