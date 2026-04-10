import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyStatusBadge } from "@/components/imoveis/PropertyStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, UserCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function CorretorDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate();
  const { data: item, isLoading } = useQuery({ queryKey: ["mt-corretor", id], queryFn: async () => { const { data, error } = await supabase.from("mt_corretores" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: !!id });
  const { data: imoveis = [] } = useQuery({ queryKey: ["mt-corretor-imoveis", id], queryFn: async () => { const { data } = await supabase.from("mt_properties" as any).select("id, titulo, ref_code, situacao, valor_venda, mt_property_types!property_type_id(nome)").eq("corretor_id", id!).is("deleted_at", null).order("created_at", { ascending: false }); return data || []; }, enabled: !!id });

  const handleDelete = async () => { const { error } = await supabase.from("mt_corretores" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!); if (error) { toast.error(`Erro: ${error.message}`); return; } toast.success("Removido"); navigate("/corretores"); };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Corretor nao encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/corretores")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/corretores")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-6 w-6" />{item.nome}</h1><p className="text-muted-foreground">CRECI: {item.creci || "N/A"}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/corretores/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link></Button>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover "{item.nome}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xs text-muted-foreground">Imoveis</p><p className="font-bold">{imoveis.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Comissao</p><p className="font-bold">{item.comissao_percentual || 0}%</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IR label="Nome" value={item.nome} /><IR label="CRECI" value={item.creci} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="CPF" value={item.cpf} /><IR label="Comissao" value={item.comissao_percentual ? `${item.comissao_percentual}%` : null} />
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Imoveis Atribuidos ({imoveis.length})</CardTitle></CardHeader><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Titulo</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{imoveis.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum imovel.</TableCell></TableRow>
        ) : imoveis.map((im: any) => (<TableRow key={im.id} className="cursor-pointer" onClick={() => navigate(`/imoveis/${im.id}`)}><TableCell className="font-mono text-xs">{im.ref_code || "-"}</TableCell><TableCell>{im.titulo}</TableCell><TableCell>{im.mt_property_types?.nome || "-"}</TableCell><TableCell>{im.valor_venda ? new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(im.valor_venda) : "-"}</TableCell><TableCell><PropertyStatusBadge situacao={im.situacao || "disponivel"} /></TableCell></TableRow>
        ))}</TableBody></Table>
      </CardContent></Card>
    </div>
  );
}
function IR({ label, value }: { label: string; value: any }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>; }
