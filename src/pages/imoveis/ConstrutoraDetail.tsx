import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, HardHat } from "lucide-react";
import { toast } from "sonner";

export default function ConstrutoraDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["mt-construtora", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mt_construtoras" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    const { error } = await supabase.from("mt_construtoras" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    toast.success("Removida com sucesso");
    navigate("/construtoras");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Construtora não encontrada.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/construtoras")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/construtoras")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><HardHat className="h-6 w-6" />{item.nome}</h1><p className="text-muted-foreground">{item.cnpj || "Sem CNPJ"}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/construtoras/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover "{item.nome}"?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Nome" value={item.nome} /><IR label="CNPJ" value={item.cnpj} /><IR label="Razão Social" value={item.razao_social} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="Website" value={item.website} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Endereço" value={item.endereco} /><IR label="Cidade" value={item.cidade} /><IR label="Estado" value={item.estado} /><IR label="CEP" value={item.cep} />
        </CardContent></Card>
      </div>
      {item.descricao && <Card><CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{item.descricao}</p></CardContent></Card>}
    </div>
  );
}

function IR({ label, value }: { label: string; value: any }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>;
}
