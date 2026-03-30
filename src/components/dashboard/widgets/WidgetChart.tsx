import { memo, useMemo } from 'react';
import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import {
  LineChart, BarChart, PieChart, AreaChart,
  Line, Bar, Pie, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

interface WidgetChartProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

const COLORS = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#F44336', '#607D8B'];

export const WidgetChart = memo(function WidgetChart({ widget, data }: WidgetChartProps) {
  // Memoize chart data to prevent Recharts from re-animating
  const chartData = useMemo(() => data?.series?.[0]?.data || [], [data?.series]);

  if (!chartData.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 h-full flex items-center justify-center text-muted-foreground text-sm">
        Sem dados para exibir
      </div>
    );
  }

  const subtipo = widget.subtipo || 'bar';
  const color = widget.cor || '#E91E63';

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full">
      <h3 className="text-sm font-semibold text-foreground mb-4">{widget.nome}</h3>
      <div className="h-[calc(100%-2rem)]" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          {subtipo === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line isAnimationActive={false} type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : subtipo === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area isAnimationActive={false} type="monotone" dataKey="value" stroke={color} fill={`${color}30`} />
            </AreaChart>
          ) : subtipo === 'pie' || subtipo === 'donut' ? (
            <PieChart>
              <Pie
                isAnimationActive={false}
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={subtipo === 'donut' ? 40 : 0}
                label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar isAnimationActive={false} dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
