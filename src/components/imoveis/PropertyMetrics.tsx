import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, MessageSquare, Eye } from "lucide-react";

interface PropertyMetricsData {
  total: number;
  disponiveis: number;
  consultas30d: number;
  visualizacoes30d: number;
}

interface PropertyMetricsProps {
  metrics: PropertyMetricsData;
  isLoading?: boolean;
}

export function PropertyMetrics({ metrics, isLoading }: PropertyMetricsProps) {
  const cards = [
    { label: "Total Imóveis", value: metrics.total, icon: Building2, color: "text-blue-600" },
    { label: "Disponíveis", value: metrics.disponiveis, icon: CheckCircle2, color: "text-green-600" },
    { label: "Consultas (30d)", value: metrics.consultas30d, icon: MessageSquare, color: "text-orange-600" },
    { label: "Visualizações (30d)", value: metrics.visualizacoes30d, icon: Eye, color: "text-purple-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse bg-muted rounded" />
            ) : (
              <p className="text-2xl font-bold">{card.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
