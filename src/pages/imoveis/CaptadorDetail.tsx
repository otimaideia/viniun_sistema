import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, UserSearch } from "lucide-react";
import { toast } from "sonner";

export default function CaptadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-captador", id],
    queryFn: async () => { const { data, error } = await supabase.from("mt_captadores" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; },
    enabled: !!id,
  });

  const handleDelete = async () => {
    const { error } = await supabase.from("mt_captadores" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!);
    if (error) { toast.error(`Erro: ${error.message}`); return; } toast.success("Removido"); navigate("/captacao");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Captador nao encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/captacao")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/captacao")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserSearch className="h-6 w-6" />{item.nome}</h1></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/captacao/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link></Button>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover "{item.nome}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader><CardContent className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <IR label="Nome" value={item.nome} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="CRECI" value={item.creci} /><IR label="CPF/CNPJ" value={item.cpf_cnpj} /><IR label="Comissao (%)" value={item.comissao_percentual} />
      </CardContent></Card>
      {item.observacoes && <Card><CardHeader><CardTitle className="text-base">Observacoes</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{item.observacoes}</p></CardContent></Card>}
    </div>
  );
}
function IR({ label, value }: { label: string; value: any }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>; }
