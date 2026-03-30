import { lazy, Suspense } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Play,
  CheckCircle,
  Clock,
  GitBranch,
  FileText,
  Building2,
  User,
  AlertTriangle,
  ListChecks,
  Workflow,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantContext } from '@/contexts/TenantContext';
import { useSOPMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPsMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPExecutionsMT } from '@/hooks/multitenant/useSOPExecutionsMT';
import { useSOPFlowMT } from '@/hooks/multitenant/useSOPFlowMT';
import StatusTransition from '@/components/processos/StatusTransition';
import {
  SOP_STATUS_CONFIG,
  SOP_PRIORIDADE_CONFIG,
  SOP_STEP_TIPO_CONFIG,
  type SOPStepTipo,
  type SOPStatus,
} from '@/types/sop';

const SOPFlowViewer = lazy(() => import('@/components/processos/flow/SOPFlowViewer'));

const StepIcon = ({ tipo }: { tipo: SOPStepTipo }) => {
  const cfg = SOP_STEP_TIPO_CONFIG[tipo];
  const iconMap: Record<string, any> = {
    Play,
    GitBranch,
    Clock,
    CheckCircle,
    FileText,
  };
  const Icon = iconMap[cfg.icon] || FileText;
  return <Icon className="h-5 w-5" style={{ color: cfg.color }} />;
};

export default function SOPDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: sop, isLoading: isLoadingSOP } = useSOPMT(id);
  const { executions, isLoading: isLoadingExec, startExecution } = useSOPExecutionsMT(id);
  const { connections, isLoading: isLoadingFlow } = useSOPFlowMT(id);
  const { update: updateSOP } = useSOPsMT();

  const handleStatusTransition = async (newStatus: SOPStatus, extra?: Record<string, any>) => {
    if (!id) return;
    try {
      await updateSOP.mutateAsync({ id, status: newStatus, ...extra });
    } catch {
      // toast handled by hook
    }
  };

  const handleStartExecution = async () => {
    if (!id) return;
    try {
      const execution = await startExecution.mutateAsync(id);
      navigate(`/processos/execucao/${execution.id}`);
    } catch {
      // toast handled by hook
    }
  };

  if (isTenantLoading || isLoadingSOP) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">POP nao encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/processos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const statusCfg = SOP_STATUS_CONFIG[sop.status];
  const prioridadeCfg = SOP_PRIORIDADE_CONFIG[sop.prioridade];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/processos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{sop.titulo}</h1>
              <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border-0`}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              <span className="font-mono">{sop.codigo}</span> &middot; v{sop.versao_label || sop.versao}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <StatusTransition
            currentStatus={sop.status}
            onTransition={handleStatusTransition}
            isLoading={updateSOP.isPending}
          />
          <Button variant="outline" size="sm" asChild>
            <Link to={`/processos/${sop.id}/fluxo`}>
              <Workflow className="h-4 w-4 mr-1.5" />
              Editar Fluxo
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/processos/${sop.id}/editar`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Link>
          </Button>
          <Button size="sm" onClick={handleStartExecution} disabled={startExecution.isPending}>
            <Play className="h-4 w-4 mr-1.5" />
            {startExecution.isPending ? 'Iniciando...' : 'Executar'}
          </Button>
        </div>
      </div>

      {/* Description */}
      {sop.descricao && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{sop.descricao}</p>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              Departamento
            </div>
            <p className="font-medium">{sop.department?.nome || 'Nao definido'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              Responsavel
            </div>
            <p className="font-medium">{sop.responsavel?.nome || 'Nao definido'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Prioridade
            </div>
            <Badge variant="outline" className={prioridadeCfg.color}>
              {prioridadeCfg.label}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Tempo Estimado
            </div>
            <p className="font-medium">
              {sop.tempo_estimado_min ? `${sop.tempo_estimado_min} min` : 'Nao definido'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="passos">
        <TabsList>
          <TabsTrigger value="passos">
            <ListChecks className="h-4 w-4 mr-1" />
            Passos ({sop.steps?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="execucoes">
            <Play className="h-4 w-4 mr-1" />
            Execucoes ({executions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <Workflow className="h-4 w-4 mr-1" />
            Fluxo
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Clock className="h-4 w-4 mr-1" />
            Historico
          </TabsTrigger>
        </TabsList>

        {/* Steps Tab */}
        <TabsContent value="passos" className="space-y-3 mt-4">
          {!sop.steps?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Nenhum passo cadastrado. Edite o POP para adicionar passos.
                </p>
              </CardContent>
            </Card>
          ) : (
            sop.steps.map((step, index) => {
              const tipoCfg = SOP_STEP_TIPO_CONFIG[step.tipo];
              return (
                <Card key={step.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StepIcon tipo={step.tipo} />
                          <span className="font-medium">{step.titulo}</span>
                          <Badge variant="outline" className="text-xs">
                            {tipoCfg.label}
                          </Badge>
                          {step.is_obrigatorio && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatorio
                            </Badge>
                          )}
                        </div>
                        {step.descricao && (
                          <p className="text-sm text-muted-foreground">{step.descricao}</p>
                        )}
                        {step.checklist_items && step.checklist_items.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3" />
                            {step.checklist_items.length} item(s) de checklist
                          </div>
                        )}
                      </div>
                      {step.tempo_estimado_min && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {step.tempo_estimado_min} min
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="execucoes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoadingExec ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : !executions?.length ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma execucao registrada.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {executions.map((exec) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
                      concluido: { label: 'Concluido', color: 'bg-green-100 text-green-700' },
                      cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
                      pausado: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
                    };
                    const st = statusMap[exec.status] || statusMap.em_andamento;
                    return (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/processos/execucao/${exec.id}`)}
                      >
                        <div>
                          <p className="font-medium text-sm">{exec.user?.nome || 'Usuario'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(exec.started_at).toLocaleDateString('pt-BR')}{' '}
                            {new Date(exec.started_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Badge className={`${st.color} border-0`}>{st.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow Tab */}
        <TabsContent value="fluxo" className="mt-4">
          <Suspense fallback={<div className="h-[500px] bg-muted animate-pulse rounded-lg" />}>
            <SOPFlowViewer
              steps={sop.steps || []}
              connections={connections || []}
            />
          </Suspense>
          <div className="flex justify-end mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/processos/${sop.id}/fluxo`}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Abrir Editor de Fluxo
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">
                Historico de alteracoes sera exibido aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
