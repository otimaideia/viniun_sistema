import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useServicePricingMT, type ServicePricing } from '@/hooks/multitenant/useVendasMT';

const formatCurrency = (value: number | null | undefined) =>
  value != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    : '-';

function ServicePricingList({ services, isLoading, onEdit }: {
  services: ServicePricing[];
  isLoading: boolean;
  onEdit: (serviceId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <DollarSign className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Nenhum servico com preco cadastrado.</p>
      </div>
    );
  }

  // Group by tamanho_area
  const grouped = services.reduce<Record<string, ServicePricing[]>>((acc, svc) => {
    const size = svc.tamanho_area || 'Outros';
    if (!acc[size]) acc[size] = [];
    acc[size].push(svc);
    return acc;
  }, {});

  const sizeOrder = ['P', 'M', 'G', 'Outros'];
  const sizeLabels: Record<string, string> = { P: 'Pequena', M: 'Media', G: 'Grande', Outros: 'Outros' };

  return (
    <div className="space-y-6">
      {sizeOrder
        .filter(size => grouped[size]?.length > 0)
        .map(size => (
          <div key={size}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Area {sizeLabels[size]} ({size !== 'Outros' ? size : '-'})
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servico</TableHead>
                    <TableHead className="text-right">Preco Maior</TableHead>
                    <TableHead className="text-right">R$/Sessao</TableHead>
                    <TableHead className="text-right">Preco Menor</TableHead>
                    <TableHead className="text-right">Preco Piso</TableHead>
                    <TableHead className="text-right">Custo Insumos</TableHead>
                    <TableHead className="text-right">Margem R$</TableHead>
                    <TableHead className="text-right">Margem %</TableHead>
                    <TableHead className="text-right">Cartao 12x</TableHead>
                    <TableHead className="text-right">Sessoes</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[size].map(svc => {
                    const custo = svc.custo_insumos || 0;
                    const margemR = svc.preco_tabela_maior && custo ? svc.preco_tabela_maior - custo : null;
                    const margemPct = svc.preco_tabela_maior && custo ? ((svc.preco_tabela_maior - custo) / svc.preco_tabela_maior) * 100 : null;
                    const parcela12x = svc.preco_tabela_maior ? svc.preco_tabela_maior / 12 : null;
                    const sessoes = svc.numero_sessoes || svc.sessoes_protocolo || 18;
                    const precoPorSessao = svc.preco_por_sessao || (svc.preco_tabela_maior ? svc.preco_tabela_maior / sessoes : null);

                    return (
                      <TableRow
                        key={svc.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onEdit(svc.id)}
                      >
                        <TableCell className="font-medium">
                          {svc.nome}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(svc.preco_tabela_maior)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(precoPorSessao)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(svc.preco_tabela_menor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(svc.preco_piso)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {custo > 0 ? formatCurrency(custo) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {margemR != null ? (
                            <span className={margemR >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(margemR)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {margemPct != null ? (
                            <Badge variant="secondary" className={margemPct >= 50 ? 'bg-green-100 text-green-700' : margemPct >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                              {margemPct.toFixed(1)}%
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(parcela12x)}
                        </TableCell>
                        <TableCell className="text-right">
                          {svc.numero_sessoes || svc.sessoes_protocolo || 18}
                        </TableCell>
                        <TableCell className="text-center">
                          {svc.is_active ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
    </div>
  );
}

export default function TabelaPrecos() {
  const navigate = useNavigate();
  const { services, isLoading } = useServicePricingMT();

  const handleEdit = (serviceId: string) => {
    navigate(`/vendas/tabela-precos/${serviceId}/editar`);
  };

  const servicesWithMaior = services.filter(s => s.preco_tabela_maior != null && s.preco_tabela_maior > 0);
  const servicesWithMenor = services.filter(s => s.preco_tabela_menor != null && s.preco_tabela_menor > 0);
  const servicesWithPiso = services.filter(s => s.preco_piso != null && s.preco_piso > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>Tabela de Precos</span>
          </div>
          <h1 className="text-2xl font-bold">Tabela de Precos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {services.length} servicos cadastrados &middot; {servicesWithMaior.length} com preco maior &middot; {servicesWithMenor.length} com preco menor
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/vendas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Single table with all pricing data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Precos por Servico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServicePricingList services={services} isLoading={isLoading} onEdit={handleEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
