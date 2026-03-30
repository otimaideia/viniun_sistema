import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StepCard from './StepCard';
import { useSOPStepsMT } from '@/hooks/multitenant/useSOPStepsMT';
import type { MTSOPStep } from '@/types/sop';

interface StepBuilderProps {
  sopId: string;
}

export default function StepBuilder({ sopId }: StepBuilderProps) {
  const {
    steps,
    isLoading,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    addChecklistItem,
    removeChecklistItem,
  } = useSOPStepsMT(sopId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !steps) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(steps, oldIndex, newIndex);
    reorderSteps.mutate(reordered.map((s) => s.id));
  };

  const handleAddStep = () => {
    const nextOrdem = (steps?.length ?? 0) + 1;
    createStep.mutate({
      sop_id: sopId,
      ordem: nextOrdem,
      titulo: `Passo ${nextOrdem}`,
      tipo: 'acao',
      is_obrigatorio: false,
      has_checklist: false,
    });
  };

  const handleUpdate = (id: string, data: Partial<MTSOPStep>) => {
    updateStep.mutate({ id, ...data });
  };

  const handleDelete = (id: string) => {
    deleteStep.mutate(id);
  };

  const handleAddChecklist = (stepId: string, descricao: string) => {
    const step = steps?.find((s) => s.id === stepId);
    const nextOrdem = (step?.checklist_items?.length ?? 0) + 1;
    addChecklistItem.mutate({
      step_id: stepId,
      descricao,
      ordem: nextOrdem,
      is_obrigatorio: false,
    });
  };

  const handleRemoveChecklist = (itemId: string) => {
    removeChecklistItem.mutate(itemId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!steps || steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum passo cadastrado. Clique em &quot;Adicionar Passo&quot; para comecar.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                checklistItems={step.checklist_items ?? []}
                onAddChecklist={handleAddChecklist}
                onRemoveChecklist={handleRemoveChecklist}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleAddStep}
        disabled={createStep.isPending}
      >
        {createStep.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Adicionar Passo
      </Button>
    </div>
  );
}
