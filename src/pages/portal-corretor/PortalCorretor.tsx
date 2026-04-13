import { useNavigate } from "react-router-dom";
import { useCorretorAuth } from "@/contexts/CorretorAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FileSignature, DollarSign, Home, LogOut, User, FileText, TrendingUp } from "lucide-react";

export default function PortalCorretor() {
  const navigate = useNavigate();
  const { corretor, logout } = useCorretorAuth();

  const { data: stats } = useQuery({
    queryKey: ["corretor-stats", corretor?.id],
    queryFn: async () => {
      const [imoveis, propostas, contratos] = await Promise.all([
        (supabase as any).from("mt_properties").select("id", { count: "exact", head: true }).eq("corretor_id", corretor!.id).is("deleted_at", null),
        (supabase as any).from("mt_property_proposals").select("id", { count: "exact", head: true }).eq("corretor_id", corretor!.id).is("deleted_at", null),
        (supabase as any).from("mt_property_contracts").select("id", { count: "exact", head: true }).eq("corretor_id", corretor!.id).is("deleted_at", null),
      ]);
      return {
        imoveis: imoveis.count || 0,
        propostas: propostas.count || 0,
        contratos: contratos.count || 0,
      };
    },
    enabled: !!corretor,
  });

  const { data: recentPropostas = [] } = useQuery({
    queryKey: ["corretor-propostas-recentes", corretor?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("mt_property_proposals")
        .select("id, numero_proposta, valor_proposta, status, created_at, mt_properties!property_id(titulo)")
        .eq("corretor_id", corretor!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!corretor,
  });

  if (!corretor) return null;

  const metrics = [
    { label: "Meus Imóveis", value: stats?.imoveis || 0, icon: Home, color: "text-blue-600" },
    { label: "Propostas", value: stats?.propostas || 0, icon: FileSignature, color: "text-green-600" },
    { label: "Contratos", value: stats?.contratos || 0, icon: FileText, color: "text-purple-600" },
    { label: "Comissão %", value: `${corretor.comissao_percentual || 0}%`, icon: DollarSign, color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Portal do Corretor</h1>
              <p className="text-xs text-muted-foreground">{corretor.nome} {corretor.creci && `· CRECI ${corretor.creci}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/corretor/perfil")}>
              <User className="h-4 w-4 mr-1" /> Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold">Olá, {corretor.nome.split(" ")[0]}!</h2>
          <p className="text-muted-foreground">Confira seu painel de atividades</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-2xl font-bold">{m.value}</p>
                  </div>
                  <m.icon className={`h-8 w-8 ${m.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/corretor/imoveis")}>
            <CardContent className="pt-6 text-center">
              <Home className="h-10 w-10 mx-auto text-primary mb-2" />
              <p className="font-semibold">Meus Imóveis</p>
              <p className="text-xs text-muted-foreground">Ver imóveis atribuídos</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/corretor/propostas")}>
            <CardContent className="pt-6 text-center">
              <FileSignature className="h-10 w-10 mx-auto text-green-600 mb-2" />
              <p className="font-semibold">Propostas</p>
              <p className="text-xs text-muted-foreground">Ver minhas propostas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/busca")}>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-orange-600 mb-2" />
              <p className="font-semibold">Buscar Imóveis</p>
              <p className="text-xs text-muted-foreground">Catálogo completo</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propostas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPropostas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentPropostas.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.mt_properties?.titulo || "Imóvel"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.numero_proposta || "-"} · R$ {Number(p.valor_proposta || 0).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={p.status === "aceita" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
