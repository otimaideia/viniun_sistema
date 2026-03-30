import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, MessageSquare, Sparkles, BarChart3 } from "lucide-react";

const YesIA = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">YESia</h1>
        <p className="text-muted-foreground">
          Assistente de inteligência artificial integrada ao sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversas IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ações Automatizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interações Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Assistente YESia</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Em breve
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            IA conversacional para atendimento, análise de dados e automação inteligente
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Módulo em desenvolvimento</p>
            <p className="text-sm mt-2">
              Assistente IA integrado com chat, análise de dados, sugestões inteligentes e automação proativa.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YesIA;
