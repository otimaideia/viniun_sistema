import { useState } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Save, MapPin } from "lucide-react";
import { toast } from "sonner";

function LocationTable({ tableName, title, desc, parentField, parentOptions }: { tableName: string; title: string; desc: string; parentField?: string; parentOptions?: Array<{id:string;nome:string}> }) {
  const { tenant } = useTenantContext(); const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", sigla: "", parent_id: "" });

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tableName, tenant?.id],
    queryFn: async () => { const { data, error } = await supabase.from(tableName as any).select("*").eq("tenant_id", tenant!.id).is("deleted_at", null).order("nome"); if (error) throw error; return data || []; },
    enabled: !!tenant,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { nome: formData.nome, tenant_id: tenant?.id, updated_at: new Date().toISOString() };
      if (formData.sigla) payload.sigla = formData.sigla;
      if (parentField && formData.parent_id) payload[parentField] = formData.parent_id;
      if (editId) { const { error } = await supabase.from(tableName as any).update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await supabase.from(tableName as any).insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tableName] }); toast.success("Salvo"); setShowForm(false); setEditId(null); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(tableName as any).update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tableName] }); toast.success("Removido"); setDeleteId(null); },
  });

  const openNew = () => { setEditId(null); setFormData({ nome: "", sigla: "", parent_id: "" }); setShowForm(true); };
  const openEdit = (item: any) => { setEditId(item.id); setFormData({ nome: item.nome, sigla: item.sigla || "", parent_id: (parentField ? item[parentField] : "") || "" }); setShowForm(true); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">{title}</CardTitle><CardDescription>{desc}</CardDescription></div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button></CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table><TableHeader><TableRow><TableHead>Nome</TableHead>{tableName.includes("estados") && <TableHead>Sigla</TableHead>}<TableHead className="w-[100px]">Acoes</TableHead></TableRow></TableHeader>
            <TableBody>{items.length === 0 ? (<TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Nenhum item.</TableCell></TableRow>
            ) : items.map((i: any) => (
              <TableRow key={i.id}><TableCell>{i.nome}</TableCell>{tableName.includes("estados") && <TableCell>{i.sigla}</TableCell>}
              <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={showForm} onOpenChange={setShowForm}><DialogContent><DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} /></div>
          {tableName.includes("estados") && <div><Label>Sigla</Label><Input value={formData.sigla} onChange={(e) => setFormData({...formData, sigla: e.target.value})} maxLength={2} /></div>}
          {parentField && parentOptions && (
            <div><Label>Vinculado a</Label>
              <Select value={formData.parent_id || "none"} onValueChange={(v) => setFormData({...formData, parent_id: v === "none" ? "" : v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione...</SelectItem>{parentOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>{saveMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}<Save className="h-4 w-4 mr-1" /> Salvar</Button></DialogFooter>
      </DialogContent></Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover este item?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  );
}

export default function Localizacoes() {
  const { tenant } = useTenantContext();
  const { data: estados = [] } = useQuery({
    queryKey: ["mt-imovel-estados", tenant?.id],
    queryFn: async () => { const { data } = await supabase.from("mt_locations" as any).select("id, nome, sigla").eq("tenant_id", tenant!.id).is("deleted_at", null).order("nome"); return data || []; },
    enabled: !!tenant,
  });
  const { data: cidades = [] } = useQuery({
    queryKey: ["mt-imovel-cidades-all", tenant?.id],
    queryFn: async () => { const { data } = await supabase.from("mt_locations" as any).select("id, nome").eq("tenant_id", tenant!.id).is("deleted_at", null).order("nome"); return data || []; },
    enabled: !!tenant,
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" />Localizacoes</h1><p className="text-muted-foreground">Gerencie estados, cidades e bairros</p></div>
      <Tabs defaultValue="estados">
        <TabsList><TabsTrigger value="estados">Estados</TabsTrigger><TabsTrigger value="cidades">Cidades</TabsTrigger><TabsTrigger value="bairros">Bairros</TabsTrigger></TabsList>
        <TabsContent value="estados"><LocationTable tableName="mt_locations" title="Estados" desc="Unidades Federativas" /></TabsContent>
        <TabsContent value="cidades"><LocationTable tableName="mt_locations" title="Cidades" desc="Cidades por estado" parentField="estado_id" parentOptions={estados as any} /></TabsContent>
        <TabsContent value="bairros"><LocationTable tableName="mt_locations" title="Bairros" desc="Bairros por cidade" parentField="cidade_id" parentOptions={cidades as any} /></TabsContent>
      </Tabs>
    </div>
  );
}
