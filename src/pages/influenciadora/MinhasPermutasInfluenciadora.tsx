import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Repeat,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, PermutaStatus } from '@/types/influenciadora';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MinhasPermutasInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();

  // Buscar contrato ativo para crédito de permuta
  const { data: contrato } = useQuery({
    queryKey: ['meu-contrato', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return null;

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .eq('status', 'ativo')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.id,
  });

  // Buscar permutas
  const { data: permutas, isLoading } = useQuery({
    queryKey: ['minhas-permutas', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];

      const { data, error } = await supabase
        .from('mt_influencer_credits')
        .select(`
          *,
          unidade:mt_franchises(id, nome)
        `)
        .eq('influencer_id', influenciadora.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  const creditoTotal = contrato?.credito_permuta || 0;
  const creditoUsado = contrato?.credito_permuta_usado || 0;
  const creditoDisponivel = creditoTotal - creditoUsado;

  const getStatusBadge = (status: PermutaStatus) => {
    const configs: Record<PermutaStatus, { color: string; icon: React.ReactNode }> = {
      disponivel: { color: 'bg-blue-100 text-blue-700', icon: <Sparkles className="h-3 w-3 mr-1" /> },
      agendado: { color: 'bg-yellow-100 text-yellow-700', icon: <Calendar className="h-3 w-3 mr-1" /> },
      realizado: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      cancelado: { color: 'bg-red-100 text-red-700', icon: <Clock className="h-3 w-3 mr-1" /> },
      expirado: { color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3 mr-1" /> },
    };

    const config = configs[status];
    const labels: Record<PermutaStatus, string> = {
      disponivel: 'Disponível',
      agendado: 'Agendado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      expirado: 'Expirado',
    };

    return (
      <Badge className={`${config.color} hover:${config.color}`}>
        {config.icon}
        {labels[status]}
      </Badge>
    );
  };

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Permutas</h1>
          <p className="text-gray-500">
            Gerencie seu crédito de permuta e procedimentos
          </p>
        </div>

        {/* Crédito de Permuta */}
        <Card className="bg-gradient-to-r from-[#662E8E] to-[#662E8E]/90 text-white border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-white/80 text-sm">Crédito Total</p>
                <p className="text-3xl font-bold">{formatCurrency(creditoTotal)}</p>
              </div>
              <div>
                <p className="text-white/80 text-sm">Utilizado</p>
                <p className="text-3xl font-bold">{formatCurrency(creditoUsado)}</p>
              </div>
              <div>
                <p className="text-white/80 text-sm">Disponível</p>
                <p className="text-3xl font-bold text-[#F2B705]">{formatCurrency(creditoDisponivel)}</p>
              </div>
            </div>
            {creditoTotal > 0 && (
              <div className="mt-4">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-[#F2B705] h-2 rounded-full transition-all"
                    style={{ width: `${(creditoUsado / creditoTotal) * 100}%` }}
                  />
                </div>
                <p className="text-white/80 text-sm mt-2">
                  {((creditoUsado / creditoTotal) * 100).toFixed(0)}% utilizado
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Permutas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-[#662E8E]" />
              Histórico de Permutas
            </CardTitle>
            <CardDescription>
              Procedimentos realizados e agendados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
              </div>
            ) : permutas && permutas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permutas.map((permuta) => (
                      <TableRow key={permuta.id}>
                        <TableCell className="font-medium">
                          {permuta.servico_nome}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(permuta.valor_servico)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {permuta.unidade?.nome || 'A definir'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {permuta.data_realizacao
                            ? format(new Date(permuta.data_realizacao), "dd/MM/yyyy", { locale: ptBR })
                            : 'A agendar'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(permuta.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Repeat className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nenhuma permuta registrada</p>
                <p className="text-sm text-gray-400">
                  {creditoDisponivel > 0
                    ? 'Entre em contato para agendar seu procedimento'
                    : 'Você não possui crédito de permuta no momento'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InfluenciadoraLayout>
  );
}
