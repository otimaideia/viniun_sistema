import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function EdificioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: edificio, isLoading } = useQuery({
    queryKey: ["mt-edificio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_buildings" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    const { error } = await supabase
      .from("mt_buildings" as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id!);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    queryClient.invalidateQueries({ queryKey: ["mt-edificios"] });
    toast.success("Edifício removido");
    navigate("/edificios");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!edificio) return <div className="text-center py-12"><p className="text-muted-foreground">Edifício não encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/edificios")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/edificios")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" /> {edificio.nome}
            </h1>
            <p className="text-muted-foreground">{edificio.endereco || "Sem endereço"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/edificios/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Remover "{edificio.nome}"?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nome" value={edificio.nome} />
            <InfoRow label="Construtora" value={edificio.construtora_nome} />
            <InfoRow label="Total de Unidades" value={edificio.total_unidades} />
            <InfoRow label="Andares" value={edificio.total_andares} />
            <InfoRow label="Torres" value={edificio.total_torres} />
            <InfoRow label="Ano Entrega" value={edificio.ano_entrega} />
            <InfoRow label="Status" value={edificio.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Localização</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Endereço" value={edificio.endereco} />
            <InfoRow label="Bairro" value={edificio.bairro} />
            <InfoRow label="Cidade" value={edificio.cidade} />
            <InfoRow label="Estado" value={edificio.estado} />
            <InfoRow label="CEP" value={edificio.cep} />
          </CardContent>
        </Card>
      </div>
      {edificio.descricao && (
        <Card>
          <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{edificio.descricao}</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>;
}
