import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/contexts/CorretorAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v: number | null) {
  if (!v) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: "secondary", enviada: "default", visualizada: "outline", aceita: "default", rejeitada: "destructive", expirada: "secondary",
};

export default function CorretorPropostas() {
  const navigate = useNavigate();
  const { corretor } = useCorretorAuth();

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["corretor-propostas", corretor?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_proposals")
        .select("id, numero_proposta, valor_proposta, status, created_at, mt_properties!property_id(titulo, ref_code), mt_leads!lead_id(nome, email)")
        .eq("corretor_id", corretor!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!corretor,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/corretor/portal")}><ArrowLeft className="h-4 w-4" /></Button>
          <Building2 className="h-5 w-5 text-primary" />
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
                    <TableHead>Nº</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propostas.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhuma proposta encontrada
                    </TableCell></TableRow>
                  ) : propostas.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/imoveis/propostas/${p.id}`)}>
                      <TableCell className="font-mono text-xs">{p.numero_proposta || "-"}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{p.mt_properties?.titulo || "-"}</TableCell>
                      <TableCell>{p.mt_leads?.nome || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.valor_proposta)}</TableCell>
                      <TableCell><Badge variant={STATUS_COLORS[p.status] as any || "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs">{p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}</TableCell>
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
