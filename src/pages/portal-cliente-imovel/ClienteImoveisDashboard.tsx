import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, FileSignature, FileText, Search, Receipt, ArrowRight, LogOut } from "lucide-react";

export default function ClienteImoveisDashboard() {
  const navigate = useNavigate();
  // For now, get lead_id from sessionStorage (set by ClienteAuthContext)
  const clienteData = JSON.parse(sessionStorage.getItem("cliente_auth") || "{}");
  const leadId = clienteData?.id;
  const nome = clienteData?.nome || "Cliente";

  const { data: propostas = [] } = useQuery({
    queryKey: ["cliente-propostas", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_proposals")
        .select("id, numero_proposta, valor_proposta, status, created_at, mt_properties!property_id(titulo, ref_code)")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!leadId,
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["cliente-contratos", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_contracts")
        .select("id, numero_contrato, tipo, valor_contrato, status, data_inicio, mt_properties!property_id(titulo)")
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!leadId,
  });

  const handleLogout = () => {
    sessionStorage.removeItem("cliente_auth");
    navigate("/cliente-imovel/login");
  };

  const formatCurrency = (v: number | null) => v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "-";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Portal do Cliente</h1>
              <p className="text-xs text-muted-foreground">{nome}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Sair</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold">Bem-vindo, {nome.split(" ")[0]}!</h2>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/cliente-imovel/propostas")}>
            <CardContent className="pt-6 text-center">
              <FileSignature className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="font-semibold text-sm">Propostas</p>
              <Badge className="mt-1">{propostas.length}</Badge>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/cliente-imovel/contratos")}>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="font-semibold text-sm">Contratos</p>
              <Badge className="mt-1">{contratos.length}</Badge>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/cliente-imovel/faturas")}>
            <CardContent className="pt-6 text-center">
              <Receipt className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <p className="font-semibold text-sm">Faturas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/busca")}>
            <CardContent className="pt-6 text-center">
              <Search className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="font-semibold text-sm">Buscar Imóveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Proposals */}
        {propostas.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Minhas Propostas</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/cliente-imovel/propostas")}><ArrowRight className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {propostas.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.mt_properties?.titulo || "Imóvel"}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(p.valor_proposta)}</p>
                    </div>
                    <Badge variant={p.status === "aceita" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Contracts */}
        {contratos.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Meus Contratos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/cliente-imovel/contratos")}><ArrowRight className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contratos.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.mt_properties?.titulo || "Imóvel"}</p>
                      <p className="text-xs text-muted-foreground">{c.tipo} · {formatCurrency(c.valor_contrato)}</p>
                    </div>
                    <Badge variant={c.status === "assinado" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
