import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import type { AIProactiveRule } from '@/types/ai-sales-assistant';

export default function AIProactiveRules() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ['mt-ai-proactive-rules', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_ai_proactive_rules' as never)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AIProactiveRule[];
    },
    enabled: !isTenantLoading,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('mt_ai_proactive_rules' as never)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-ai-proactive-rules'] });
      toast.success('Status atualizado');
    },
    onError: (error: Error) => {
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

  const activeCount = rules.filter((r) => r.is_active).length;

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
            <span>Regras Proativas</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Regras Proativas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as regras de comportamento proativo da IA
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Regras</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead>Roles Alvo</TableHead>
                <TableHead>Cooldown (min)</TableHead>
                <TableHead>Max/Dia</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-12">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhuma regra proativa cadastrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => {
                  const ruleExt = rule as Record<string, unknown>;
                  const createdBy = ruleExt.created_by as string | undefined;
                  const cooldown = ruleExt.cooldown_minutes as number | undefined;
                  const maxPerDay = ruleExt.max_per_day as number | undefined;

                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="font-medium">{rule.nome}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {rule.descricao || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) =>
                            toggleActive.mutate({ id: rule.id, is_active: checked })
                          }
                          disabled={toggleActive.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.target_roles?.length > 0 ? (
                            rule.target_roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Todos</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cooldown != null ? cooldown : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {maxPerDay != null ? maxPerDay : '-'}
                      </TableCell>
                      <TableCell>
                        {createdBy === 'yesia' ? (
                          <Badge className="bg-purple-100 text-purple-700">YESia</Badge>
                        ) : createdBy === 'admin' ? (
                          <Badge className="bg-blue-100 text-blue-700">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">{createdBy || '-'}</Badge>
                        )}
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
