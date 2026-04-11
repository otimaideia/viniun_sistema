import { useState } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface ConfigItem {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  is_active: boolean;
}

function ConfigCrudTable({
  tableName,
  title,
  description,
  hasCategoria = false,
}: {
  tableName: string;
  title: string;
  description: string;
  hasCategoria?: boolean;
}) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ConfigItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ codigo: "", nome: "", descricao: "", categoria: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tableName, tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("tenant_id", tenant!.id)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data || []) as ConfigItem[];
    },
    enabled: !!tenant,
  });

  const saveMutation = useMutation({
    mutationFn: async (item: typeof formData & { id?: string }) => {
      if (item.id) {
        const { error } = await supabase
          .from(tableName as any)
          .update({ ...item, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName as any)
          .insert({ ...item, tenant_id: tenant?.id, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success("Salvo com sucesso");
      closeForm();
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success("Removido com sucesso");
      setDeleteItem(null);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const openNew = () => {
    setEditItem(null);
    setFormData({ codigo: "", nome: "", descricao: "", categoria: "" });
    setShowForm(true);
  };

  const openEdit = (item: ConfigItem) => {
    setEditItem(item);
    setFormData({
      codigo: item.codigo,
      nome: item.nome,
      descricao: item.descricao || "",
      categoria: item.categoria || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
  };

  const handleSave = () => {
    saveMutation.mutate({ ...formData, id: editItem?.id });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum item cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                {hasCategoria && <TableHead>Categoria</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  {hasCategoria && <TableCell>{item.categoria || "-"}</TableCell>}
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar" : "Novo"} {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="codigo_unico"
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome de exibição"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            {hasCategoria && (
              <div>
                <Label>Categoria</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Lazer, Segurança, Conforto"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover "{deleteItem?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface FeatureItem {
  id: string;
  nome: string;
  icone?: string;
  categoria: string;
  is_active: boolean;
}

function FeatureSection({
  categoria,
  title,
  description,
}: {
  categoria: string;
  title: string;
  description: string;
}) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editItem, setEditItem] = useState<FeatureItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcone, setEditIcone] = useState("");
  const [deleteItem, setDeleteItem] = useState<FeatureItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mt_property_features", tenant?.id, categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_features" as any)
        .select("*")
        .eq("tenant_id", tenant!.id)
        .eq("categoria", categoria)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data || []) as FeatureItem[];
    },
    enabled: !!tenant,
  });

  const addMutation = useMutation({
    mutationFn: async (nome: string) => {
      const codigo = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const { error } = await supabase
        .from("mt_property_features" as any)
        .insert({
          tenant_id: tenant?.id,
          codigo,
          nome,
          categoria,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt_property_features", tenant?.id, categoria] });
      setNewName("");
      toast.success("Adicionado com sucesso");
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome, icone }: { id: string; nome: string; icone?: string }) => {
      const { error } = await supabase
        .from("mt_property_features" as any)
        .update({ nome, icone, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt_property_features", tenant?.id, categoria] });
      setEditItem(null);
      toast.success("Atualizado com sucesso");
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_property_features" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt_property_features", tenant?.id, categoria] });
      setDeleteItem(null);
      toast.success("Removido com sucesso");
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  const openEdit = (item: FeatureItem) => {
    setEditItem(item);
    setEditName(item.nome);
    setEditIcone(item.icone || "");
  };

  const handleSaveEdit = () => {
    if (!editItem || !editName.trim()) return;
    updateMutation.mutate({ id: editItem.id, nome: editName.trim(), icone: editIcone.trim() || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick add */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Adicionar ${title.toLowerCase().replace(/s$/, "")}...`}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="max-w-xs"
          />
          <Button size="sm" onClick={handleAdd} disabled={addMutation.isPending || !newName.trim()}>
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum item cadastrado nesta categoria.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.icone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Ícone (nome Lucide, opcional)</Label>
              <Input
                value={editIcone}
                onChange={(e) => setEditIcone(e.target.value)}
                placeholder="Ex: Waves, Shield, Trees"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover "{deleteItem?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function ImovelConfiguracoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Imobiliário</h1>
        <p className="text-muted-foreground">Gerencie tipos, finalidades e características dos imóveis</p>
      </div>

      <Tabs defaultValue="tipos">
        <TabsList>
          <TabsTrigger value="tipos">Tipos de Imóvel</TabsTrigger>
          <TabsTrigger value="finalidades">Finalidades</TabsTrigger>
          <TabsTrigger value="caracteristicas">Características</TabsTrigger>
        </TabsList>

        <TabsContent value="tipos">
          <ConfigCrudTable
            tableName="mt_property_types"
            title="Tipos de Imóvel"
            description="Apartamento, Casa, Terreno, Sala Comercial, etc."
          />
        </TabsContent>

        <TabsContent value="finalidades">
          <ConfigCrudTable
            tableName="mt_property_purposes"
            title="Finalidades"
            description="Venda, Locação, Temporada, etc."
          />
        </TabsContent>

        <TabsContent value="caracteristicas">
          <div className="space-y-6">
            <FeatureSection
              categoria="caracteristica"
              title="Características"
              description="Piscina, Churrasqueira, Elevador, Portaria 24h, etc."
            />
            <FeatureSection
              categoria="proximidade"
              title="Proximidades"
              description="Escola, Hospital, Supermercado, Shopping, etc."
            />
            <FeatureSection
              categoria="acabamento"
              title="Acabamentos"
              description="Piso Porcelanato, Granito, Gesso, Mármore, etc."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
