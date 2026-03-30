import { cn } from "@/lib/utils";
import { ArrowDown, Users, UserPlus, Share2, Phone } from "lucide-react";

interface FunnelData {
  etapa: string;
  quantidade: number;
  percentual: number;
  conversaoAnterior: number;
}

interface PromocaoFunnelProps {
  data: FunnelData[];
  className?: string;
}

const stageIcons = [Users, Phone, Share2, UserPlus];

const stageColors = [
  "bg-primary",
  "bg-secondary",
  "bg-amber-500",
  "bg-success",
];

export function PromocaoFunnel({ data, className }: PromocaoFunnelProps) {
  const maxQuantidade = Math.max(...data.map(d => d.quantidade), 1);

  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Funil de Cadastros</h3>
        <span className="text-xs text-muted-foreground">Volume por etapa</span>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => {
          const Icon = stageIcons[index] || Users;
          const widthPercent = (item.quantidade / maxQuantidade) * 100;
          const showArrow = index < data.length - 1;
          
          return (
            <div key={item.etapa}>
              <div className="relative group">
                {/* Background bar */}
                <div className="h-12 bg-muted rounded-lg overflow-hidden">
                  {/* Filled portion */}
                  <div 
                    className={cn(
                      "h-full rounded-lg transition-all duration-500 flex items-center px-3 gap-2",
                      stageColors[index]
                    )}
                    style={{ width: `${Math.max(widthPercent, 15)}%` }}
                  >
                    <Icon className="h-4 w-4 text-primary-foreground shrink-0" />
                    <span className="text-xs font-medium text-primary-foreground truncate">
                      {item.etapa}
                    </span>
                  </div>
                </div>
                
                {/* Stats overlay */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">
                    {item.quantidade}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({item.percentual.toFixed(0)}%)
                  </span>
                </div>
              </div>
              
              {/* Conversion arrow between stages */}
              {showArrow && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowDown className="h-3 w-3" />
                    <span className="text-xs">
                      {data[index + 1].conversaoAnterior.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Média de indicações por cadastro</span>
          <span className="font-bold text-success">
            {data[0]?.quantidade > 0 
              ? (data[data.length - 1]?.quantidade / data[0].quantidade).toFixed(1) 
              : "0"}
          </span>
        </div>
      </div>
    </div>
  );
}
