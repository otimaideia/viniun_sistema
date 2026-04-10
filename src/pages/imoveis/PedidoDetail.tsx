import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PedidoDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const qc = useQueryClient();
  const { data: item, isLoading } = useQuery({ queryKey: ["mt-pedido", id], queryFn: async () => { const { data, error } = await supabase.from("mt_property_orders" as any).select("*").eq("id", id!).single(); if (error) throw error; return data as any; }, enabled: !!id });
  const updateStatus = useMutation({ mutationFn: async (status: string) => { const { error } = await supabase.from("mt_property_orders" as any).update({ status, updated_at: new Date().toISOString() }).eq("id", id!); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["mt-pedido", id] }); toast.success("Status atualizado"); } });
  const fmtCurrency = (v: number | null) => v ? new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(v) : "-";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!item) return <div className="text-center py-12"><p className="text-muted-foreground">Pedido nao encontrado.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/imoveis/pedidos")}>Voltar</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/pedidos")}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" />Pedido #{item.numero || item.id.slice(0,8)}</h1>
          <p className="text-muted-foreground">{item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {locale:ptBR}) : ""}</p></div>
        </div>
        <Select value={item.status || "pendente"} onValueChange={(v) => updateStatus.mutate(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem><SelectItem value="finalizado">Finalizado</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Nome" value={item.cliente_nome} /><IR label="Email" value={item.cliente_email} /><IR label="Telefone" value={item.cliente_telefone} /><IR label="CPF/CNPJ" value={item.cliente_cpf_cnpj} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Imovel</CardTitle></CardHeader><CardContent className="space-y-3">
          <IR label="Titulo" value={item.imovel_titulo} /><IR label="Referencia" value={item.imovel_referencia} /><IR label="Valor" value={fmtCurrency(item.valor)} /><IR label="Forma Pagamento" value={item.forma_pagamento} />
        </CardContent></Card>
      </div>
      {item.observacoes && <Card><CardHeader><CardTitle className="text-base">Observacoes</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{item.observacoes}</p></CardContent></Card>}
    </div>
  );
}
function IR({ label, value }: { label: string; value: any }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "-"}</p></div>; }
