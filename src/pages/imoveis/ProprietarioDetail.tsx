import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyStatusBadge } from "@/components/imoveis/PropertyStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";

export default function ProprietarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-proprietario", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mt_property_owners" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: imoveis = [] } = useQuery({
    queryKey: ["mt-proprietario-imoveis", id],
    queryFn: async () => {
      const { data } = await supabase.from("mt_properties" as any).select("id, titulo, referencia, situacao, tipo_nome, valor_venda").eq("proprietario_id", id!).is("deleted_at", null).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    const { error } = await supabase.from("mt_property_owners" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    toast.success("Removido");
    navigate("/proprietarios");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Proprietario nao encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/proprietarios")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/proprietarios")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><User className="h-6 w-6" />{item.nome}</h1><p className="text-muted-foreground">{item.email || item.telefone || "Proprietario"}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/proprietarios/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover "{item.nome}"?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Nome" value={item.nome} /><IR label="CPF/CNPJ" value={item.cpf_cnpj} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="Celular" value={item.celular} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Endereco</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Endereco" value={item.endereco} /><IR label="Cidade" value={item.cidade} /><IR label="Estado" value={item.estado} /><IR label="CEP" value={item.cep} />
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Imoveis ({imoveis.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Titulo</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {imoveis.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum imovel vinculado.</TableCell></TableRow>
              ) : imoveis.map((im: any) => (
                <TableRow key={im.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/${im.id}`)}>
                  <TableCell className="font-mono text-xs">{im.referencia || "-"}</TableCell>
                  <TableCell>{im.titulo}</TableCell>
                  <TableCell>{im.tipo_nome || "-"}</TableCell>
                  <TableCell>{im.valor_venda ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(im.valor_venda) : "-"}</TableCell>
                  <TableCell><PropertyStatusBadge situacao={im.situacao || "disponivel"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function IR({ label, value }: { label: string; value: any }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>;
}
