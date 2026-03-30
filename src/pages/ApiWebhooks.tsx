import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, Key, Activity, Shield } from "lucide-react";

const ApiWebhooks = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API & Webhooks</h1>
        <p className="text-muted-foreground">
          Gerencie chaves de API, webhooks e integrações externas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Keys Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chamadas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Gerenciamento de API</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Em breve
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie chaves de API, configure webhooks e monitore integrações
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Módulo em desenvolvimento</p>
            <p className="text-sm mt-2">
              Chaves de API, webhooks de entrada/saída, rate limiting e logs de chamadas estarão disponíveis em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiWebhooks;
