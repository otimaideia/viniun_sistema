import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ConsultaDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { tenant } = useTenantContext(); const qc = useQueryClient();
  const [resposta, setResposta] = useState("");

  const { data: item, isLoading } = useQuery({ queryKey: ["mt-consulta", id], queryFn: async () => { const { data, error } = await supabase.from("mt_property_inquiries" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: !!id });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => { const { error } = await supabase.from("mt_property_inquiries" as any).update({ status, updated_at: new Date().toISOString() }).eq("id", id!); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-consulta", id] }); toast.success("Status atualizado"); },
  });

  const enviarResposta = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("mt_property_inquiries" as any).update({ resposta, status: "respondido", respondido_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id!); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-consulta", id] }); toast.success("Resposta enviada"); setResposta(""); },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Consulta nao encontrada.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/imoveis/consultas")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/consultas")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6" />Consulta de {item.nome}</h1>
            <p className="text-muted-foreground">{item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}</p></div>
        </div>
        <Select value={item.status || "novo"} onValueChange={(v) => updateStatus.mutate(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="novo">Novo</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="respondido">Respondido</SelectItem><SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Dados do Contato</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Nome" value={item.nome} /><IR label="Email" value={item.email} /><IR label="Telefone" value={item.telefone} /><IR label="Imovel ID" value={item.imovel_id} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Mensagem</CardTitle></CardHeader><CardContent>
          <p className="text-sm whitespace-pre-wrap">{item.mensagem || "Sem mensagem."}</p>
        </CardContent></Card>
      </div>
      {item.resposta && (
        <Card><CardHeader><CardTitle className="text-base">Resposta Enviada</CardTitle></CardHeader><CardContent>
          <p className="text-sm whitespace-pre-wrap">{item.resposta}</p>
          {item.respondido_at && <p className="text-xs text-muted-foreground mt-2">Respondido em {format(new Date(item.respondido_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>}
        </CardContent></Card>
      )}
      <Card><CardHeader><CardTitle className="text-base">Responder</CardTitle></CardHeader><CardContent className="space-y-4">
        <Textarea rows={4} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Digite sua resposta..." />
        <Button onClick={() => enviarResposta.mutate()} disabled={!resposta.trim() || enviarResposta.isPending}>
          {enviarResposta.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Enviar Resposta
        </Button>
      </CardContent></Card>
    </div>
  );
}
function IR({ label, value }: { label: string; value: any }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>; }
