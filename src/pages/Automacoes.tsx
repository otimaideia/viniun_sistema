import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, GitBranch, Clock, PlayCircle } from "lucide-react";

const Automacoes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automações</h1>
        <p className="text-muted-foreground">
          Configure workflows automáticos para otimizar processos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workflows Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Execuções Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Workflows</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Em breve
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Crie automações para disparar ações baseadas em eventos do sistema
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Módulo em desenvolvimento</p>
            <p className="text-sm mt-2">
              Automações de workflows, triggers e ações programadas estarão disponíveis em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Automacoes;
