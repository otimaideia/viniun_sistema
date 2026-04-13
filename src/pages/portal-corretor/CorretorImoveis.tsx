import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/contexts/CorretorAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Home, ExternalLink } from "lucide-react";

function formatCurrency(v: number | null) {
  if (!v) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function CorretorImoveis() {
  const navigate = useNavigate();
  const { corretor } = useCorretorAuth();

  const { data: imoveis = [], isLoading } = useQuery({
    queryKey: ["corretor-imoveis", corretor?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_properties")
        .select("id, ref_code, titulo, situacao, valor_venda, valor_locacao, dormitorios, slug, mt_property_types!property_type_id(nome), location_cidade:mt_locations!location_cidade_id(nome)")
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
          <h1 className="font-bold">Meus Imóveis</h1>
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
                    <TableHead>Ref</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Quartos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imoveis.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Home className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhum imóvel atribuído a você
                    </TableCell></TableRow>
                  ) : imoveis.map((im: any) => (
                    <TableRow key={im.id}>
                      <TableCell className="font-mono text-xs">{im.ref_code || "-"}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{im.titulo || "-"}</TableCell>
                      <TableCell>{im.mt_property_types?.nome || "-"}</TableCell>
                      <TableCell>{im.location_cidade?.nome || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(im.valor_venda || im.valor_locacao)}</TableCell>
                      <TableCell>{im.dormitorios || "-"}</TableCell>
                      <TableCell><Badge variant={im.situacao === "disponivel" ? "default" : "secondary"}>{im.situacao}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/imovel/${im.slug || im.id}`, "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
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
