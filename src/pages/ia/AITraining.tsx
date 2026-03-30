import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function AITraining() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['mt-chatbot-training', tenant?.id],
    queryFn: async () => {
      let query = (supabase as any)
        .from('mt_chatbot_training')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading,
  });

  const toggleReviewed = useMutation({
    mutationFn: async ({ id, is_reviewed }: { id: string; is_reviewed: boolean }) => {
      const { error } = await (supabase as any)
        .from('mt_chatbot_training')
        .update({ is_reviewed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-chatbot-training'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reviewedCount = feedback.filter((f: any) => f.is_reviewed).length;
  const pendingCount = feedback.length - reviewedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/ia')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              YESia
            </Button>
            <span>/</span>
            <span>Treinamento</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Treinamento e Feedback
          </h1>
          <p className="text-muted-foreground">
            Revise o feedback e melhore as respostas da IA
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedback.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revisados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reviewedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Circle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pergunta</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Revisado</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="h-12">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhum feedback registrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2 text-sm">{item.question || '-'}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {item.answer || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.feedback_type ? (
                        <Badge variant="secondary">{item.feedback_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleReviewed.mutate({
                            id: item.id,
                            is_reviewed: !item.is_reviewed,
                          })
                        }
                        disabled={toggleReviewed.isPending}
                      >
                        {item.is_reviewed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
