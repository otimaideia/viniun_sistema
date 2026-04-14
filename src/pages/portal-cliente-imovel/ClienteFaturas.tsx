import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Home, Receipt, AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v: number | null) {
  if (!v && v !== 0) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function getStatusBadge(status: string, vencimento: string | null) {
  if (status === "pago") return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Pago</Badge>;
  if (status === "cancelado") return <Badge variant="secondary">Cancelado</Badge>;
  if (vencimento && isPast(new Date(vencimento)) && !isToday(new Date(vencimento))) {
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Vencida</Badge>;
  }
  if (vencimento && isToday(new Date(vencimento))) {
    return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
  }
  return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
}

export default function ClienteFaturas() {
  const navigate = useNavigate();
  const clienteData = JSON.parse(sessionStorage.getItem("cliente_auth") || "{}");
  const leadId = clienteData?.id;

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ["cliente-faturas", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_invoices")
        .select("*, mt_properties!property_id(titulo, ref_code), mt_property_contracts!contract_id(numero_contrato, tipo)")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("data_vencimento", { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  const pendentes = faturas.filter((f: any) => f.status === "pendente" || f.status === "aberta");
  const totalPendente = pendentes.reduce((acc: number, f: any) => acc + (f.valor_total || 0), 0);
  const vencidas = pendentes.filter((f: any) => f.data_vencimento && isPast(new Date(f.data_vencimento)) && !isToday(new Date(f.data_vencimento)));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cliente-imovel")}><ArrowLeft className="h-4 w-4" /></Button>
          <Home className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Minhas Faturas</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground">{pendentes.length} fatura(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold text-red-600">{vencidas.length}</p>
              <p className="text-xs text-muted-foreground">fatura(s) em atraso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Faturas</p>
              <p className="text-2xl font-bold">{faturas.length}</p>
              <p className="text-xs text-muted-foreground">no histórico</p>
            </CardContent>
          </Card>
        </div>

        {/* Faturas Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturas.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhuma fatura encontrada
                    </TableCell></TableRow>
                  ) : faturas.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.numero_fatura || "-"}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{f.mt_properties?.titulo || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.mt_property_contracts?.tipo ? `${f.mt_property_contracts.tipo} - ` : ""}
                          {f.mt_property_contracts?.numero_contrato || ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{f.descricao || f.data_competencia ? `Ref: ${format(new Date(f.data_competencia), "MMM/yyyy", { locale: ptBR })}` : "-"}</TableCell>
                      <TableCell className="text-sm">
                        {f.data_vencimento ? format(new Date(f.data_vencimento), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(f.valor_total)}</TableCell>
                      <TableCell>{getStatusBadge(f.status, f.data_vencimento)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {f.boleto_url && f.status !== "pago" && (
                            <Button variant="outline" size="sm" onClick={() => window.open(f.boleto_url, "_blank")}>
                              <ExternalLink className="h-3 w-3 mr-1" />Boleto
                            </Button>
                          )}
                          {f.pix_codigo && f.status !== "pago" && (
                            <Button variant="outline" size="sm" onClick={() => {
                              navigator.clipboard.writeText(f.pix_codigo);
                              alert("Código PIX copiado!");
                            }}>
                              PIX
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
