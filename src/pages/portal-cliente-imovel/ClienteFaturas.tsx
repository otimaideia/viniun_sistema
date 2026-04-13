import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Home, Receipt, Clock } from "lucide-react";

export default function ClienteFaturas() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cliente-imovel")}><ArrowLeft className="h-4 w-4" /></Button>
          <Home className="h-5 w-5 text-primary" />
          <h1 className="font-bold">Minhas Faturas</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Faturas de Locação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              O sistema de faturas de locação está sendo desenvolvido. Em breve você poderá acompanhar
              seus pagamentos mensais, boletos e histórico de pagamentos diretamente por aqui.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => navigate("/cliente-imovel")}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
