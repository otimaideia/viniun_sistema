import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Building2, MapPin, Users, TrendingUp } from "lucide-react";

interface Lead {
  id: string;
  nome: string;
  unidade: string;
  cidade: string;
  status: string;
  responsible_id?: string | null;
}

interface ResponsibleUser {
  id: string;
  name: string;
}

interface LeadAnalyticsDashboardProps {
  leads: Lead[];
  responsibleUsers?: ResponsibleUser[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(143, 55%, 45%)",
  "hsl(280, 65%, 60%)",
  "hsl(200, 70%, 50%)",
  "hsl(35, 90%, 55%)",
];

export function LeadAnalyticsDashboard({ leads, responsibleUsers = [] }: LeadAnalyticsDashboardProps) {
  // Leads por unidade (Top 8)
  const leadsByUnidade = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const unidade = lead.unidade || "Não informado";
      counts[unidade] = (counts[unidade] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace("Viniun ", ""), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads]);

  // Leads por cidade (Top 8)
  const leadsByCidade = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const cidade = lead.cidade || "Não informado";
      counts[cidade] = (counts[cidade] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads]);

  // Leads por responsável
  const leadsByResponsible = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const responsibleId = lead.responsible_id;
      const responsible = responsibleUsers.find(u => u.id === responsibleId);
      const name = responsible?.name || "Não atribuído";
      counts[name] = (counts[name] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [leads, responsibleUsers]);

  // Leads convertidos por unidade
  const conversionByUnidade = useMemo(() => {
    const stats: Record<string, { total: number; converted: number }> = {};
    
    leads.forEach(lead => {
      const unidade = lead.unidade || "Não informado";
      if (!stats[unidade]) {
        stats[unidade] = { total: 0, converted: 0 };
      }
      stats[unidade].total++;
      if (lead.status === "Cliente Efetivo") {
        stats[unidade].converted++;
      }
    });
    
    return Object.entries(stats)
      .map(([name, { total, converted }]) => ({
        name: name.replace("Viniun ", ""),
        total,
        converted,
        taxa: total > 0 ? Math.round((converted / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [leads]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} leads ({((payload[0].value / leads.length) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ name, percent }: any) => {
    if (percent < 0.05) return null;
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Leads por Unidade */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Leads por Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByUnidade.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leadsByUnidade}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadsByUnidade.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads por Cidade */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-success" />
            Cidades Mais Desejadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByCidade.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leadsByCidade}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadsByCidade.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads por Responsável */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-warning" />
            Leads por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByResponsible.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leadsByResponsible} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  fontSize={11} 
                  width={100}
                  tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>

      {/* Taxa de Conversão por Unidade */}
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" />
            Conversão por Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversionByUnidade.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={conversionByUnidade} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  fontSize={11} 
                  width={100}
                  tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    value,
                    name === 'total' ? 'Total' : name === 'converted' ? 'Convertidos' : name
                  ]}
                />
                <Bar dataKey="total" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} name="Total" />
                <Bar dataKey="converted" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Convertidos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
