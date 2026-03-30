import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  GitBranch,
  BarChart3,
  Filter,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAdAttributionsMT } from '@/hooks/multitenant/useAdAttributionsMT';
import { ATTRIBUTION_METHOD_LABELS } from '@/types/ad-campaigns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

const METHOD_BADGE_COLORS: Record<string, string> = {
  fbclid: 'bg-blue-100 text-blue-700',
  utm: 'bg-purple-100 text-purple-700',
  whatsapp_keyword: 'bg-green-100 text-green-700',
  phone_match: 'bg-orange-100 text-orange-700',
  referrer: 'bg-cyan-100 text-cyan-700',
  manual: 'bg-gray-100 text-gray-700',
};

export default function AttributionReport() {
  const { tenant } = useTenantContext();
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [conversionOnly, setConversionOnly] = useState(false);

  const { attributions, summary, isLoading } = useAdAttributionsMT({
    method: methodFilter !== 'all' ? methodFilter : undefined,
    conversionOnly,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <Link to="/ia/trafego" className="hover:text-foreground">
          Trafego
        </Link>
        <span>/</span>
        <span className="text-foreground">Atribuicao</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Relatorio de Atribuicao</h1>
        <p className="text-muted-foreground">
          Rastreamento de leads e vendas por metodo de atribuicao
          {tenant && ` - ${tenant.nome_fantasia}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {summary.map((item: any) => (
          <Card key={item.method}>
            <CardContent className="pt-6">
              <Badge className={METHOD_BADGE_COLORS[item.method] || 'bg-gray-100 text-gray-700'}>
                {ATTRIBUTION_METHOD_LABELS[item.method] || item.method}
              </Badge>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{item.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversoes</span>
                  <span className="font-medium text-green-600">{item.conversions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Receita</span>
                  <span className="font-medium">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {summary.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum dado de atribuicao encontrado</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Metodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Metodos</SelectItem>
            {Object.entries(ATTRIBUTION_METHOD_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="conversion-only"
            checked={conversionOnly}
            onCheckedChange={setConversionOnly}
          />
          <Label htmlFor="conversion-only" className="text-sm">
            Apenas conversoes
          </Label>
        </div>
      </div>

      {/* Attributions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Atribuicoes ({attributions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attributions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">Nenhuma atribuicao encontrada</p>
              <p className="text-sm mt-1">
                As atribuicoes serao registradas automaticamente quando leads interagirem com
                suas campanhas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Primeiro Toque</TableHead>
                  <TableHead>Venda em</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-center">Conversao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributions.map((attr) => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">
                      {attr.ad_campaign?.nome || '-'}
                      {attr.ad_campaign?.plataforma && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({attr.ad_campaign.plataforma})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          METHOD_BADGE_COLORS[attr.attribution_method] ||
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {ATTRIBUTION_METHOD_LABELS[attr.attribution_method] ||
                          attr.attribution_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {attr.utm_source && (
                        <span className="text-muted-foreground">
                          {attr.utm_source}
                          {attr.utm_medium && ` / ${attr.utm_medium}`}
                        </span>
                      )}
                      {!attr.utm_source && '-'}
                    </TableCell>
                    <TableCell>{formatDate(attr.first_touch_at)}</TableCell>
                    <TableCell>{formatDate(attr.sale_at)}</TableCell>
                    <TableCell className="text-right">
                      {attr.sale_value ? formatCurrency(attr.sale_value) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {attr.is_conversion ? (
                        <CheckCircle className="h-5 w-5 text-green-600 inline" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300 inline" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
