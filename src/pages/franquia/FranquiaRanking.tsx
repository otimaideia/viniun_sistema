import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Medal,
  TrendingUp,
  Construction
} from "lucide-react";

const FranquiaRanking = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Ranking</h1>
        <p className="text-muted-foreground">
          Veja a posição da sua unidade no ranking geral
        </p>
      </div>

      {/* Em Desenvolvimento Banner */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <Construction className="h-10 w-10 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800">Módulo em Desenvolvimento</h3>
              <p className="text-sm text-amber-700">
                Em breve você poderá ver a posição da sua unidade no ranking de franquias.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="opacity-60">
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
            <CardTitle>Sua Posição</CardTitle>
            <CardDescription>No ranking geral</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <span className="text-4xl font-bold text-muted-foreground">--</span>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="text-center">
            <Medal className="h-12 w-12 mx-auto text-blue-500" />
            <CardTitle>Leads do Mês</CardTitle>
            <CardDescription>Total captado</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <span className="text-4xl font-bold text-muted-foreground">--</span>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-green-500" />
            <CardTitle>Taxa de Conversão</CardTitle>
            <CardDescription>Leads convertidos</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <span className="text-4xl font-bold text-muted-foreground">--%</span>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">Competição Entre Unidades</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              O ranking considera métricas como número de leads captados, taxa de conversão e atingimento de metas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaRanking;
