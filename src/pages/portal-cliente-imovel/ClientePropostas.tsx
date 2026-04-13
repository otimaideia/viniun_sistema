import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Home, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v: number | null) {
  if (!v) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function ClientePropostas() {
  const navigate = useNavigate();
  const clienteData = JSON.parse(sessionStorage.getItem("cliente_auth") || "{}");
  const leadId = clienteData?.id;

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["cliente-propostas-all", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_proposals")
        .select("*, mt_properties!property_id(titulo, ref_code, valor_venda)")
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
          <h1 className="font-bold">Minhas Propostas</h1>
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
                    <TableHead>Imóvel</TableHead>
                    <TableHead className="text-right">Valor Proposta</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhuma proposta recebida
                    </TableCell></TableRow>
                  ) : propostas.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.mt_properties?.titulo || "-"}</p>
                        <p className="text-xs text-muted-foreground">Ref: {p.mt_properties?.ref_code || "-"}</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.valor_proposta)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.valor_entrada)}</TableCell>
                      <TableCell><Badge variant={p.status === "aceita" ? "default" : p.status === "rejeitada" ? "destructive" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs">{p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}</TableCell>
                      <TableCell>
                        {p.token_acesso && (
                          <Button variant="outline" size="sm" onClick={() => window.open(`/proposta/${p.token_acesso}`, "_blank")}>Ver</Button>
                        )}
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
