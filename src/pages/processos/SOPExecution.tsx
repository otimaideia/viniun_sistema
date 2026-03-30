import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useTenantContext } from '@/contexts/TenantContext';
import { useSOPExecutionMT, useSOPExecutionsMT } from '@/hooks/multitenant/useSOPExecutionsMT';
import { SOP_STEP_TIPO_CONFIG, type SOPStepTipo } from '@/types/sop';

export default function SOPExecution() {
  const { executionId } = useParams();
  const navigate = useNavigate();
  const { isLoading: isTenantLoading } = useTenantContext();
  const {
    execution,
    isLoading,
    updateStepStatus,
    toggleChecklist,
  } = useSOPExecutionMT(executionId);
  const { completeExecution } = useSOPExecutionsMT();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  const execSteps = execution?.steps || [];
  const totalSteps = execSteps.length;
  const currentExecStep = execSteps[currentStepIndex];
  const currentStep = currentExecStep?.step;

  const completedCount = useMemo(
    () => execSteps.filter((s) => s.status === 'concluido' || s.status === 'pulado').length,
    [execSteps]
  );

  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const allDone = completedCount === totalSteps && totalSteps > 0;

  const handleCompleteStep = async () => {
    if (!currentExecStep) return;
    await updateStepStatus.mutateAsync({
      executionStepId: currentExecStep.id,
      status: 'concluido',
      observacoes: observacoes || undefined,
    });
    setObservacoes('');
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSkipStep = async () => {
    if (!currentExecStep) return;
    await updateStepStatus.mutateAsync({
      executionStepId: currentExecStep.id,
      status: 'pulado',
    });
    setObservacoes('');
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleToggleChecklist = async (checklistItemId: string, isChecked: boolean) => {
    if (!currentExecStep) return;
    await toggleChecklist.mutateAsync({
      executionStepId: currentExecStep.id,
      checklistItemId,
      isChecked,
    });
  };

  const handleCompleteExecution = async () => {
    if (!executionId) return;
    await completeExecution.mutateAsync({ executionId });
    const sopId = execution?.sop_id;
    navigate(sopId ? `/processos/${sopId}` : '/processos');
  };

  if (isTenantLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Execucao nao encontrada.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/processos">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={execution.sop_id ? `/processos/${execution.sop_id}` : '/processos'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            Executando: {execution.sop?.titulo || 'POP'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Passo {currentStepIndex + 1} de {totalSteps}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{completedCount} de {totalSteps} concluidos</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step navigation dots */}
      <div className="flex items-center gap-1 justify-center flex-wrap">
        {execSteps.map((es, i) => {
          const isDone = es.status === 'concluido';
          const isSkipped = es.status === 'pulado';
          const isCurrent = i === currentStepIndex;
          return (
            <button
              key={es.id}
              onClick={() => setCurrentStepIndex(i)}
              className={`h-3 w-3 rounded-full transition-colors ${
                isCurrent
                  ? 'bg-primary ring-2 ring-primary/30'
                  : isDone
                    ? 'bg-green-500'
                    : isSkipped
                      ? 'bg-yellow-400'
                      : 'bg-muted'
              }`}
              title={`Passo ${i + 1}: ${es.step?.titulo || ''}`}
            />
          );
        })}
      </div>

      {/* Current Step Card */}
      {currentStep && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {currentStepIndex + 1}
                </div>
                <div>
                  <CardTitle className="text-lg">{currentStep.titulo}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {SOP_STEP_TIPO_CONFIG[currentStep.tipo as SOPStepTipo]?.label || currentStep.tipo}
                  </Badge>
                </div>
              </div>
              {currentExecStep.status === 'concluido' && (
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluido
                </Badge>
              )}
              {currentExecStep.status === 'pulado' && (
                <Badge className="bg-yellow-100 text-yellow-700 border-0">
                  Pulado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Instructions */}
            {currentStep.instrucoes && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{currentStep.instrucoes}</p>
              </div>
            )}

            {currentStep.descricao && !currentStep.instrucoes && (
              <p className="text-sm text-muted-foreground">{currentStep.descricao}</p>
            )}

            {/* Image */}
            {currentStep.imagem_url && (
              <img
                src={currentStep.imagem_url}
                alt={currentStep.titulo}
                className="rounded-lg max-h-64 object-contain mx-auto"
              />
            )}

            {/* Checklist */}
            {currentStep.has_checklist && execution.sop?.steps && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Checklist:</p>
                {(() => {
                  const sopStep = execution.sop.steps.find((s: any) => s.id === currentExecStep.step_id);
                  const checklistItems = sopStep?.checklist_items || [];
                  return checklistItems.map((item: any) => {
                    const execChecklist = currentExecStep.checklist || [];
                    const checked = execChecklist.find(
                      (c: any) => c.checklist_item_id === item.id
                    )?.is_checked || false;
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => handleToggleChecklist(item.id, !!v)}
                          disabled={toggleChecklist.isPending}
                        />
                        <span className="text-sm">{item.descricao}</span>
                        {item.is_obrigatorio && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Observations */}
            <div>
              <label className="text-sm font-medium block mb-1">Observacoes</label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observacoes sobre este passo..."
                rows={2}
              />
            </div>

            {/* Step Actions */}
            {currentExecStep.status === 'pendente' || currentExecStep.status === 'em_andamento' ? (
              <div className="flex justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  {currentStepIndex < totalSteps - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                    >
                      Proximo
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkipStep}
                    disabled={updateStepStatus.isPending}
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Pular
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCompleteStep}
                    disabled={updateStepStatus.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Concluir Passo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                {currentStepIndex < totalSteps - 1 && (
                  <Button
                    size="sm"
                    onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                  >
                    Proximo
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Execution */}
      {allDone && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
            <p className="font-medium text-green-800">
              Todos os passos foram concluidos!
            </p>
            <Button
              onClick={handleCompleteExecution}
              disabled={completeExecution.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {completeExecution.isPending ? 'Concluindo...' : 'Concluir Execucao'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
