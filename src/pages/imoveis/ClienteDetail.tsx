import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClienteDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate();
  const { data: item, isLoading } = useQuery({ queryKey: ["mt-cliente-imovel", id], queryFn: async () => { const { data, error } = await supabase.from("mt_property_clients" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: !!id });
  const { data: tickets = [] } = useQuery({ queryKey: ["mt-cliente-tickets", id], queryFn: async () => { const { data } = await supabase.from("mt_property_inquiries" as any).select("*").eq("cliente_id", id!).order("created_at", { ascending: false }); return data || []; }, enabled: !!id });

  const handleDelete = async () => { const { error } = await supabase.from("mt_property_clients" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id!); if (error) { toast.error(`Erro: ${error.message}`); return; } toast.success("Removido"); navigate("/clientes-imoveis"); };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Cliente nao encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/clientes-imoveis")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes-imoveis")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />{item.nome}</h1><p className="text-muted-foreground">{item.tipo || "comprador"}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/clientes-imoveis/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link></Button>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar</AlertDialogTitle><AlertDialogDescription>Remover "{item.nome}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>
      <Tabs defaultValue="dados">
        <TabsList><TabsTrigger value="dados">Dados</TabsTrigger><TabsTrigger value="tickets">Consultas ({tickets.length})</TabsTrigger></TabsList>
        <TabsContent value="dados">
          <Card><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <IR label="Nome" value={item.nome} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="CPF/CNPJ" value={item.cpf_cnpj} /><IR label="Tipo" value={item.tipo} /><IR label="Interesse" value={item.interesse} /><IR label="Orcamento Min" value={item.orcamento_min} /><IR label="Orcamento Max" value={item.orcamento_max} /><IR label="Cidade" value={item.cidade} /><IR label="Bairros Interesse" value={item.bairros_interesse} />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="tickets">
          <Card><CardContent className="pt-6">{tickets.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma consulta.</p> : (
            <div className="space-y-3">{tickets.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3"><div className="flex justify-between"><span className="text-sm font-medium">{t.assunto || "Consulta"}</span><Badge variant={t.status === "novo" ? "default" : "secondary"}>{t.status || "novo"}</Badge></div>
              {t.mensagem && <p className="text-sm mt-1">{t.mensagem}</p>}
              <p className="text-xs text-muted-foreground mt-1">{t.created_at && format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
            ))}</div>
          )}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function IR({ label, value }: { label: string; value: any }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>; }
