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
  DollarSign,
  Loader2,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, getPlataformaIcon, getTipoConteudoLabel } from '@/types/influenciadora';

export default function MeusValoresInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();

  // Buscar valores
  const { data: valores, isLoading } = useQuery({
    queryKey: ['meus-valores', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];

      const { data, error } = await supabase
        .from('mt_influencer_pricing')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .eq('ativo', true)
        .order('plataforma', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  // Agrupar valores por plataforma
  const valoresPorPlataforma = valores?.reduce((acc, valor) => {
    if (!acc[valor.plataforma]) {
      acc[valor.plataforma] = [];
    }
    acc[valor.plataforma].push(valor);
    return acc;
  }, {} as Record<string, typeof valores>);

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Valores</h1>
          <p className="text-gray-500">
            Tabela de preços por plataforma e tipo de conteúdo
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">
                  Como funciona a tabela de valores?
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Os valores abaixo são seus preços por tipo de conteúdo.
                  Para alterar seus valores, entre em contato com a equipe de marketing da Viniun.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores por Plataforma */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
          </div>
        ) : valores && valores.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(valoresPorPlataforma || {}).map(([plataforma, items]) => (
              <Card key={plataforma}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center text-white text-xs font-bold">
                      {plataforma.slice(0, 2).toUpperCase()}
                    </div>
                    {getPlataformaIcon(plataforma as string)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Conteúdo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Negociável</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items?.map((valor) => (
                          <TableRow key={valor.id}>
                            <TableCell className="font-medium">
                              {getTipoConteudoLabel(valor.tipo_conteudo)}
                            </TableCell>
                            <TableCell>
                              <span className="text-lg font-bold text-[#662E8E]">
                                {formatCurrency(valor.valor)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {valor.negociavel ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  Sim
                                </Badge>
                              ) : (
                                <Badge variant="outline">Não</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                              {valor.descricao || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">Nenhum valor cadastrado</p>
                <p className="text-sm text-gray-400">
                  Entre em contato com a equipe para cadastrar sua tabela de preços
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        {valores && valores.length > 0 && (
          <Card className="bg-gradient-to-r from-[#662E8E]/5 to-[#F2B705]/5 border-0">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Total de Serviços</p>
                  <p className="text-2xl font-bold text-[#662E8E]">{valores.length}</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Plataformas</p>
                  <p className="text-2xl font-bold text-[#662E8E]">
                    {Object.keys(valoresPorPlataforma || {}).length}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Menor Valor</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(Math.min(...valores.map(v => v.valor)))}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Maior Valor</p>
                  <p className="text-2xl font-bold text-[#662E8E]">
                    {formatCurrency(Math.max(...valores.map(v => v.valor)))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </InfluenciadoraLayout>
  );
}
