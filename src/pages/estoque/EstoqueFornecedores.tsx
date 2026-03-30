import { useState } from "react";
import { Link } from "react-router-dom";
import { useInventorySuppliersMT } from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import type { InventorySupplier, InventorySupplierCreate } from "@/types/estoque";

const emptyForm: InventorySupplierCreate = {
  nome_fantasia: "",
  razao_social: "",
  cnpj: "",
  telefone: "",
  email: "",
  contato_nome: "",
  endereco: "",
  condicoes_pagamento: "",
  observacoes: "",
};

export default function EstoqueFornecedores() {
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier } =
    useInventorySuppliersMT();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InventorySupplierCreate>(emptyForm);

  const filtered = suppliers.filter(
    (s) =>
      !search ||
      s.nome_fantasia.toLowerCase().includes(search.toLowerCase()) ||
      s.cnpj?.includes(search)
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (supplier: InventorySupplier) => {
    setEditingId(supplier.id);
    setForm({
      nome_fantasia: supplier.nome_fantasia,
      razao_social: supplier.razao_social || "",
      cnpj: supplier.cnpj || "",
      telefone: supplier.telefone || "",
      email: supplier.email || "",
      contato_nome: supplier.contato_nome || "",
      endereco: supplier.endereco || "",
      condicoes_pagamento: supplier.condicoes_pagamento || "",
      observacoes: supplier.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome_fantasia.trim()) {
      toast.error("Nome fantasia e obrigatorio");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateSupplier(editingId, form);
      } else {
        await createSupplier(form);
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar fornecedor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSupplier(deleteId);
    } catch {
      // handled by hook
    }
    setDeleteId(null);
  };

  const handleChange = (field: keyof InventorySupplierCreate, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/estoque" className="hover:text-foreground">
              Estoque
            </Link>
            <span>/</span>
            <span>Fornecedores</span>
          </div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {filtered.length} fornecedor{filtered.length !== 1 ? "es" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum fornecedor encontrado</p>
              <p className="text-sm mt-1">Cadastre o primeiro fornecedor</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cond. Pagamento</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <Link
                          to={`/estoque/fornecedores/${supplier.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {supplier.nome_fantasia}
                        </Link>
                        {supplier.razao_social && (
                          <p className="text-xs text-muted-foreground">
                            {supplier.razao_social}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {supplier.cnpj || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{supplier.contato_nome || "-"}</p>
                        {supplier.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.telefone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {supplier.telefone}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {supplier.condicoes_pagamento || "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(supplier)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(supplier.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="f-nome">Nome Fantasia *</Label>
              <Input
                id="f-nome"
                value={form.nome_fantasia}
                onChange={(e) => handleChange("nome_fantasia", e.target.value)}
                placeholder="Nome fantasia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-razao">Razao Social</Label>
              <Input
                id="f-razao"
                value={form.razao_social || ""}
                onChange={(e) => handleChange("razao_social", e.target.value)}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="f-cnpj">CNPJ</Label>
                <Input
                  id="f-cnpj"
                  value={form.cnpj || ""}
                  onChange={(e) => handleChange("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-tel">Telefone</Label>
                <Input
                  id="f-tel"
                  value={form.telefone || ""}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="f-email">Email</Label>
                <Input
                  id="f-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-contato">Nome do Contato</Label>
                <Input
                  id="f-contato"
                  value={form.contato_nome || ""}
                  onChange={(e) => handleChange("contato_nome", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-endereco">Endereco</Label>
              <Input
                id="f-endereco"
                value={form.endereco || ""}
                onChange={(e) => handleChange("endereco", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-cond">Condicoes de Pagamento</Label>
              <Input
                id="f-cond"
                value={form.condicoes_pagamento || ""}
                onChange={(e) => handleChange("condicoes_pagamento", e.target.value)}
                placeholder="Ex: 30/60/90 dias"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-obs">Observacoes</Label>
              <Textarea
                id="f-obs"
                value={form.observacoes || ""}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
