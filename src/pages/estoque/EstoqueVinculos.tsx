import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useServiceProductsMT,
  useInventoryProductsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  LinkIcon,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useEffect } from "react";

// Simple hook to fetch services for the select
function useServicesList() {
  const [services, setServices] = useState<{ id: string; nome: string }[]>([]);
  const { tenant } = useTenantContext();

  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from("mt_services")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("nome")
      .then(({ data }) => setServices((data || []) as any));
  }, [tenant?.id]);

  return services;
}

export default function EstoqueVinculos() {
  const { serviceProducts, isLoading, createServiceProduct, updateServiceProduct, deleteServiceProduct } =
    useServiceProductsMT();
  const { products } = useInventoryProductsMT({ is_active: true });
  const services = useServicesList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantidade, setEditQuantidade] = useState("");
  const [form, setForm] = useState({
    service_id: "",
    product_id: "",
    quantidade: "1",
    is_obrigatorio: true,
    observacoes: "",
  });

  const handleCreate = async () => {
    if (!form.service_id || !form.product_id) {
      toast.error("Selecione o servico e o produto");
      return;
    }

    setSaving(true);
    try {
      await createServiceProduct({
        service_id: form.service_id,
        product_id: form.product_id,
        quantidade: Number(form.quantidade) || 1,
        is_obrigatorio: form.is_obrigatorio,
        observacoes: form.observacoes || undefined,
      });
      setDialogOpen(false);
      setForm({
        service_id: "",
        product_id: "",
        quantidade: "1",
        is_obrigatorio: true,
        observacoes: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar vinculo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteServiceProduct(deleteId);
    } catch {
      // handled by hook
    }
    setDeleteId(null);
  };

  const startEditing = (sp: { id: string; quantidade: number }) => {
    setEditingId(sp.id);
    setEditQuantidade(String(sp.quantidade));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditQuantidade("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const qty = Number(editQuantidade);
    if (!qty || qty < 1) {
      toast.error("Quantidade deve ser pelo menos 1");
      return;
    }
    setSaving(true);
    try {
      await updateServiceProduct(editingId, { quantidade: qty });
      setEditingId(null);
      setEditQuantidade("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar quantidade");
    } finally {
      setSaving(false);
    }
  };

  // Group by service for display
  const grouped = serviceProducts.reduce<
    Record<string, typeof serviceProducts>
  >((acc, sp) => {
    const serviceName = sp.service?.nome || "Sem servico";
    if (!acc[serviceName]) acc[serviceName] = [];
    acc[serviceName].push(sp);
    return acc;
  }, {});

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
            <span>Vinculos</span>
          </div>
          <h1 className="text-2xl font-bold">Vinculos Servico-Produto</h1>
          <p className="text-muted-foreground">
            Quais produtos cada servico consome
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Vinculo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Vinculo Servico-Produto</DialogTitle>
              <DialogDescription>
                Defina qual produto e consumido por este servico
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Servico *</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, service_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o servico" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, product_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vinc-qtd">Quantidade padrao</Label>
                <Input
                  id="vinc-qtd"
                  type="number"
                  min={1}
                  value={form.quantidade}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, quantidade: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="vinc-obrig"
                  checked={form.is_obrigatorio}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, is_obrigatorio: v }))
                  }
                />
                <Label htmlFor="vinc-obrig">Obrigatorio</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vinc-obs">Observacoes</Label>
                <Input
                  id="vinc-obs"
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Vinculo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : serviceProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum vinculo cadastrado</p>
              <p className="text-sm mt-1">
                Vincule produtos aos servicos para controlar o consumo
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([serviceName, items]) => (
          <Card key={serviceName}>
            <CardHeader>
              <CardTitle className="text-lg">{serviceName}</CardTitle>
              <CardDescription>
                {items.length} produto{items.length !== 1 ? "s" : ""} vinculado
                {items.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd Padrao</TableHead>
                    <TableHead>Obrigatorio</TableHead>
                    <TableHead>Observacoes</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell>
                        {sp.product ? (
                          <Link
                            to={`/estoque/insumos/${sp.product.id}`}
                            className="hover:underline font-medium"
                          >
                            {sp.product.nome}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {editingId === sp.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min={1}
                              className="w-20 h-8 text-right"
                              value={editQuantidade}
                              onChange={(e) => setEditQuantidade(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") cancelEditing();
                              }}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleSaveEdit}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:underline hover:text-primary"
                            onClick={() => startEditing(sp)}
                            title="Clique para editar"
                          >
                            {sp.quantidade}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={sp.is_obrigatorio ? "default" : "secondary"}
                        >
                          {sp.is_obrigatorio ? "Sim" : "Nao"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sp.observacoes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(sp.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este vinculo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
