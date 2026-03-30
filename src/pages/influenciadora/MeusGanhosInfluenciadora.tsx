import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, PagamentoStatus, getPagamentoStatusLabel, getPagamentoStatusColor } from '@/types/influenciadora';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeusGanhosInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();

  // Buscar pagamentos
  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ['meus-pagamentos', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];

      const { data, error } = await supabase
        .from('mt_influencer_payments')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  // Estatísticas
  const stats = {
    totalRecebido: pagamentos?.filter(p => p.status === 'pago').reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
    pendente: pagamentos?.filter(p => p.status === 'pendente' || p.status === 'aprovado').reduce((acc, p) => acc + (p.amount || 0), 0) || 0,
    pagamentosMes: pagamentos?.filter(p => {
      const mesAtual = new Date().toISOString().slice(0, 7);
      return p.created_at.startsWith(mesAtual);
    }).length || 0,
  };

  const getStatusBadge = (status: PagamentoStatus) => {
    const colors: Record<PagamentoStatus, string> = {
      pendente: 'bg-yellow-100 text-yellow-700',
      aprovado: 'bg-blue-100 text-blue-700',
      pago: 'bg-green-100 text-green-700',
      cancelado: 'bg-red-100 text-red-700',
    };

    const icons: Record<PagamentoStatus, React.ReactNode> = {
      pendente: <Clock className="h-3 w-3 mr-1" />,
      aprovado: <CheckCircle2 className="h-3 w-3 mr-1" />,
      pago: <CheckCircle2 className="h-3 w-3 mr-1" />,
      cancelado: <Clock className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge className={`${colors[status]} hover:${colors[status]}`}>
        {icons[status]}
        {getPagamentoStatusLabel(status)}
      </Badge>
    );
  };

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Ganhos</h1>
          <p className="text-gray-500">
            Acompanhe seus pagamentos e comissões
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Total Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                <div className="text-3xl font-bold text-green-700">
                  {formatCurrency(stats.totalRecebido)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">
                Saldo Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-yellow-600" />
                <div className="text-3xl font-bold text-yellow-700">
                  {formatCurrency(stats.pendente)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#662E8E]/5 to-[#662E8E]/10 border-[#662E8E]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#662E8E]">
                Pagamentos este mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-[#662E8E]" />
                <div className="text-3xl font-bold text-[#662E8E]">
                  {stats.pagamentosMes}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#662E8E]" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>
              Todos os seus pagamentos e comissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
              </div>
            ) : pagamentos && pagamentos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagamentos.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell className="font-medium">
                          {pagamento.descricao || 'Pagamento'}
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{pagamento.tipo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatCurrency(pagamento.valor_liquido)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(pagamento.status)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(pagamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Wallet className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nenhum pagamento registrado</p>
                <p className="text-sm text-gray-400">
                  Seus pagamentos aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InfluenciadoraLayout>
  );
}
