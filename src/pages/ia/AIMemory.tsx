import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Loader2,
  ArrowLeft,
  Trash2,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { AIMemoryType } from '@/types/ai-sales-assistant';

const MEMORY_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  fact: { label: 'Fato', color: 'bg-blue-100 text-blue-700' },
  preference: { label: 'Preferencia', color: 'bg-purple-100 text-purple-700' },
  context: { label: 'Contexto', color: 'bg-green-100 text-green-700' },
  learning: { label: 'Aprendizado', color: 'bg-orange-100 text-orange-700' },
  insight: { label: 'Insight', color: 'bg-cyan-100 text-cyan-700' },
};

export default function AIMemory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: memories = [], isLoading, refetch } = useQuery({
    queryKey: ['mt-ai-memory', tenant?.id, typeFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('mt_ai_memory')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }
      if (typeFilter !== 'all') {
        query = query.eq('memory_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isTenantLoading,
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_ai_memory')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-memory'] });
      toast.success('Memoria removida');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <span>Memoria</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Memoria da IA
          </h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as memorias armazenadas
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Memorias</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{memories.length}</div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(MEMORY_TYPE_BADGES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Conteudo</TableHead>
                <TableHead>Importancia</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-12">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : memories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhuma memoria encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                memories.map((memory: any) => {
                  const badge = MEMORY_TYPE_BADGES[memory.memory_type] || {
                    label: memory.memory_type,
                    color: 'bg-gray-100 text-gray-700',
                  };

                  return (
                    <TableRow key={memory.id}>
                      <TableCell>
                        <Badge className={badge.color}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="line-clamp-2 text-sm">
                          {memory.content}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{memory.importance ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {memory.source || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(memory.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => softDelete.mutate(memory.id)}
                          disabled={softDelete.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
