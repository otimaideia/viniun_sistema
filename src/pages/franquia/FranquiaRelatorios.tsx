import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Construction
} from "lucide-react";

const FranquiaRelatorios = () => {
  const relatoriosDisponiveis = [
    {
      titulo: "Performance de Leads",
      descricao: "Análise detalhada da captação e conversão",
      icon: TrendingUp,
      disponivel: false,
    },
    {
      titulo: "Análise de Serviços",
      descricao: "Serviços mais procurados e tendências",
      icon: BarChart3,
      disponivel: false,
    },
    {
      titulo: "Metas e Objetivos",
      descricao: "Acompanhamento do progresso das metas",
      icon: Target,
      disponivel: false,
    },
    {
      titulo: "Análise de Equipe",
      descricao: "Performance dos atendentes",
      icon: Users,
      disponivel: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Relatórios e análises da sua unidade
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
                Estamos trabalhando para trazer relatórios completos para sua unidade. Em breve você terá acesso a análises detalhadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview dos Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatoriosDisponiveis.map((relatorio) => (
          <Card key={relatorio.titulo} className="opacity-60">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <relatorio.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{relatorio.titulo}</CardTitle>
                    <CardDescription>{relatorio.descricao}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">Relatórios Personalizados</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Em breve você poderá gerar relatórios personalizados com filtros por período, serviços e muito mais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaRelatorios;
