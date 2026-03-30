import { useState } from 'react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Copy,
  Share2,
  QrCode,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { gerarLinkIndicacao, formatCurrency, IndicacaoStatus } from '@/types/influenciadora';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MinhasIndicacoesInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar indicações
  const { data: indicacoes, isLoading } = useQuery({
    queryKey: ['minhas-indicacoes', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];

      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .select(`
          *,
          lead:mt_leads(id, nome, email, telefone, status, created_at)
        `)
        .eq('influencer_id', influenciadora.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  // Estatísticas
  const stats = {
    total: indicacoes?.length || 0,
    convertidas: indicacoes?.filter(i => i.status === 'convertido').length || 0,
    pendentes: indicacoes?.filter(i => i.status === 'pendente').length || 0,
    perdidas: indicacoes?.filter(i => i.status === 'perdido').length || 0,
  };

  const taxaConversao = stats.total > 0 ? (stats.convertidas / stats.total) * 100 : 0;

  // Filtrar indicações
  const filteredIndicacoes = indicacoes?.filter(ind => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      ind.lead?.nome?.toLowerCase().includes(termo) ||
      ind.lead?.email?.toLowerCase().includes(termo) ||
      ind.lead?.telefone?.includes(termo)
    );
  });

  const handleCopyCode = () => {
    if (influenciadora?.codigo_indicacao) {
      navigator.clipboard.writeText(influenciadora.codigo_indicacao);
      toast({
        title: 'Código copiado!',
        description: 'Cole e compartilhe com seus seguidores.',
      });
    }
  };

  const handleCopyLink = () => {
    if (influenciadora?.codigo_indicacao) {
      const link = gerarLinkIndicacao(influenciadora.codigo_indicacao);
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe o link com seus seguidores.',
      });
    }
  };

  const handleShare = async () => {
    if (influenciadora?.codigo_indicacao) {
      const link = gerarLinkIndicacao(influenciadora.codigo_indicacao);
      const text = `Olá! Eu indico a YESlaser para você! Use meu código ${influenciadora.codigo_indicacao} ou acesse: ${link}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'YESlaser - Indicação',
            text,
            url: link,
          });
        } catch (err) {
          // Usuário cancelou
        }
      } else {
        navigator.clipboard.writeText(text);
        toast({
          title: 'Mensagem copiada!',
          description: 'Cole e envie para seus seguidores.',
        });
      }
    }
  };

  const getStatusBadge = (status: IndicacaoStatus) => {
    switch (status) {
      case 'convertido':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Convertido
          </Badge>
        );
      case 'pendente':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'perdido':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Perdido
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Indicações</h1>
          <p className="text-gray-500">
            Acompanhe suas indicações e compartilhe seu código exclusivo
          </p>
        </div>

        {/* Card de Compartilhamento */}
        <Card className="bg-gradient-to-r from-[#662E8E] to-[#662E8E]/90 text-white border-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Seu Código de Indicação</h3>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-bold tracking-widest">
                    {influenciadora?.codigo_indicacao || '---'}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={handleCopyCode}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-white/80 text-sm mt-2">
                  Compartilhe este código com seus seguidores
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleCopyLink}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Indicações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#662E8E]">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Convertidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-green-600">{stats.convertidas}</div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-yellow-600">{stats.pendentes}</div>
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-[#662E8E]">
                  {taxaConversao.toFixed(1)}%
                </div>
                <TrendingUp className="h-5 w-5 text-[#662E8E]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Indicações */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#662E8E]" />
                  Histórico de Indicações
                </CardTitle>
                <CardDescription>
                  Leads indicados através do seu código
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar indicação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
              </div>
            ) : filteredIndicacoes && filteredIndicacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndicacoes.map((indicacao) => (
                      <TableRow key={indicacao.id}>
                        <TableCell className="font-medium">
                          {indicacao.lead?.nome || 'Sem nome'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {indicacao.lead?.email && (
                              <p className="text-gray-500">{indicacao.lead.email}</p>
                            )}
                            {indicacao.lead?.telefone && (
                              <p className="text-gray-500">{indicacao.lead.telefone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(indicacao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(indicacao.status)}
                        </TableCell>
                        <TableCell>
                          {indicacao.valor_comissao ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(indicacao.valor_comissao)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">
                  {searchTerm ? 'Nenhuma indicação encontrada' : 'Você ainda não tem indicações'}
                </p>
                <p className="text-sm text-gray-400">
                  Compartilhe seu código para começar a indicar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InfluenciadoraLayout>
  );
}
