import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAIAgentsAdminMT, useAIAgentsMT } from '@/hooks/multitenant/useAIAgentsMT';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AI_DOMAINS } from '@/types/ai-sales-assistant';

const APPROVAL_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-700' },
};

export default function AIAgents() {
  const navigate = useNavigate();
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const { agents, isLoading, refetch } = useAIAgentsAdminMT();
  const { toggleActive, duplicate, remove } = useAIAgentsMT();

  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const agentDomain = (agent as any).domain;
    const matchesDomain = domainFilter === 'all' || agentDomain === domainFilter;
    return matchesSearch && matchesDomain;
  });

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.is_active).length,
    inactive: agents.filter((a) => !a.is_active).length,
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await toggleActive.mutateAsync({ id, is_active: !currentActive });
    refetch();
  };

  const handleDuplicate = async (id: string) => {
    await duplicate.mutateAsync(id);
    refetch();
  };

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
            <span>Agentes</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Agentes de IA
          </h1>
          <p className="text-muted-foreground">
            Gerencie os agentes de inteligencia artificial
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button asChild>
          <Link to="/ia/agentes/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agente
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou codigo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os dominios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os dominios</SelectItem>
            {Object.entries(AI_DOMAINS).map(([key, val]) => (
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
                <TableHead>Agente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dominio</TableHead>
                <TableHead>Provedor / Modelo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery || domainFilter !== 'all'
                        ? 'Nenhum agente encontrado com esse filtro'
                        : 'Nenhum agente cadastrado'}
                    </p>
                    {!searchQuery && domainFilter === 'all' && (
                      <Button asChild className="mt-4">
                        <Link to="/ia/agentes/novo">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeiro agente
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => {
                  const extAgent = agent as any;
                  const domain = extAgent.domain;
                  const domainInfo = domain ? AI_DOMAINS[domain] : null;
                  const autoGenerated = extAgent.auto_generated;
                  const approvalStatus = extAgent.approval_status;

                  return (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: agent.cor || '#6366f1' }}
                          >
                            {agent.nome.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {agent.nome}
                              {autoGenerated && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Auto
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{agent.codigo}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{agent.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        {domainInfo ? (
                          <Badge className={domainInfo.color}>{domainInfo.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium capitalize">{agent.provider}</span>
                          <span className="text-muted-foreground"> / {agent.model}</span>
                        </div>
                        {autoGenerated && approvalStatus && (
                          <Badge className={`text-xs mt-1 ${APPROVAL_BADGES[approvalStatus]?.color || ''}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {APPROVAL_BADGES[approvalStatus]?.label || approvalStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={agent.is_active}
                          onCheckedChange={() => handleToggleActive(agent.id, agent.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/ia/agentes/${agent.id}/editar`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(agent.id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(agent.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O agente sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
