import { useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";

interface TrendDataPoint {
  data: string;
  recebidos: number;
  contatados: number;
  agendados: number;
  comparecimentos: number;
  convertidos: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  cumulative?: boolean;
  className?: string;
}

const lineConfig = [
  { key: "recebidos", name: "Leads Recebidos", color: "hsl(222, 47%, 20%)" },
  { key: "contatados", name: "Contatados", color: "hsl(214, 95%, 55%)" },
  { key: "agendados", name: "Agendados", color: "hsl(38, 92%, 50%)" },
  { key: "comparecimentos", name: "Compareceram", color: "hsl(270, 60%, 55%)" },
  { key: "convertidos", name: "Convertidos", color: "hsl(142, 71%, 45%)" },
];

export function TrendChart({ data, cumulative = false, className }: TrendChartProps) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Evolução do Funil
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cumulative ? "Acumulado no período" : "Por dia"}
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
            />
            <XAxis 
              dataKey="data" 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "16px", fontSize: "11px" }}
              iconType="circle"
              iconSize={8}
            />
            {lineConfig.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
