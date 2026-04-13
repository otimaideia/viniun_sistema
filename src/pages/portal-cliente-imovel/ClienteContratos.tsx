import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Home, FileText, Pen } from "lucide-react";

function formatCurrency(v: number | null) {
  if (!v) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function ClienteContratos() {
  const navigate = useNavigate();
  const clienteData = JSON.parse(sessionStorage.getItem("cliente_auth") || "{}");
  const leadId = clienteData?.id;

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["cliente-contratos-all", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_contracts")
        .select("*, mt_properties!property_id(titulo, ref_code), mt_property_contract_signatories(id, tipo, nome, assinado, token_assinatura)")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cliente-imovel")}><ArrowLeft className="h-4 w-4" /></Button>
          <Home className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Meus Contratos</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhum contrato encontrado
                    </TableCell></TableRow>
                  ) : contratos.map((c: any) => {
                    // Find signatory token for this client
                    const mySig = (c.mt_property_contract_signatories || []).find(
                      (s: any) => s.tipo === "comprador" || s.tipo === "locatario"
                    );
                    const canSign = mySig && !mySig.assinado && (c.status === "pendente_assinatura" || c.status === "assinado_parcialmente");

                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.numero_contrato || "-"}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{c.mt_properties?.titulo || "-"}</p>
                          <p className="text-xs text-muted-foreground">Ref: {c.mt_properties?.ref_code || "-"}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(c.valor_contrato)}</TableCell>
                        <TableCell><Badge variant={c.status === "assinado" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                        <TableCell>
                          {canSign && mySig.token_assinatura ? (
                            <Button size="sm" onClick={() => navigate(`/contrato-imovel/${mySig.token_assinatura}/assinar`)}>
                              <Pen className="h-3 w-3 mr-1" /> Assinar
                            </Button>
                          ) : c.token_acesso ? (
                            <Button variant="outline" size="sm" onClick={() => window.open(`/contrato-imovel/${c.token_acesso}`, "_blank")}>Ver</Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
