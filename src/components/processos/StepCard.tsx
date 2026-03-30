import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Trash2,
  Save,
  Play,
  GitBranch,
  Clock,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ChecklistEditor from './ChecklistEditor';
import type { MTSOPStep, MTSOPStepChecklist, SOPStepTipo } from '@/types/sop';
import { SOP_STEP_TIPO_CONFIG } from '@/types/sop';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  GitBranch,
  Clock,
  CheckCircle,
  FileText,
};

interface StepCardProps {
  step: MTSOPStep;
  index: number;
  onUpdate: (id: string, data: Partial<MTSOPStep>) => void;
  onDelete: (id: string) => void;
  checklistItems: MTSOPStepChecklist[];
  onAddChecklist: (stepId: string, descricao: string) => void;
  onRemoveChecklist: (id: string) => void;
}

export default function StepCard({
  step,
  index,
  onUpdate,
  onDelete,
  checklistItems,
  onAddChecklist,
  onRemoveChecklist,
}: StepCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState({
    titulo: step.titulo,
    tipo: step.tipo,
    instrucoes: step.instrucoes || '',
    tempo_estimado_min: step.tempo_estimado_min ?? 0,
    is_obrigatorio: step.is_obrigatorio,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tipoConfig = SOP_STEP_TIPO_CONFIG[step.tipo];
  const TipoIcon = ICON_MAP[tipoConfig.icon] || Play;

  const handleSave = () => {
    onUpdate(step.id, {
      titulo: editData.titulo,
      tipo: editData.tipo,
      instrucoes: editData.instrucoes || null,
      tempo_estimado_min: editData.tempo_estimado_min || null,
      is_obrigatorio: editData.is_obrigatorio,
    });
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <Card className="border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Drag handle */}
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Step number */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {index + 1}
            </span>

            {/* Tipo badge */}
            <Badge
              variant="outline"
              className="shrink-0 gap-1"
              style={{ borderColor: tipoConfig.color, color: tipoConfig.color }}
            >
              <TipoIcon className="h-3 w-3" />
              {tipoConfig.label}
            </Badge>

            {/* Title */}
            <span className="flex-1 truncate text-sm font-medium">
              {step.titulo}
            </span>

            {/* Time estimate */}
            {step.tempo_estimado_min != null && step.tempo_estimado_min > 0 && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {step.tempo_estimado_min} min
              </Badge>
            )}

            {/* Obrigatorio badge */}
            {step.is_obrigatorio && (
              <Badge variant="destructive" className="shrink-0 text-xs">
                Obrigatorio
              </Badge>
            )}

            {/* Expand/Collapse */}
            <CollapsibleTrigger asChild>
              <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="space-y-4 border-t px-4 py-4">
              {/* Titulo */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Titulo</label>
                <Input
                  value={editData.titulo}
                  onChange={(e) => setEditData((d) => ({ ...d, titulo: e.target.value }))}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo do Passo</label>
                <Select
                  value={editData.tipo}
                  onValueChange={(v) => setEditData((d) => ({ ...d, tipo: v as SOPStepTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOP_STEP_TIPO_CONFIG) as SOPStepTipo[]).map((key) => {
                      const cfg = SOP_STEP_TIPO_CONFIG[key];
                      const Icon = ICON_MAP[cfg.icon] || Play;
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Instrucoes */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Instrucoes</label>
                <Textarea
                  value={editData.instrucoes}
                  onChange={(e) => setEditData((d) => ({ ...d, instrucoes: e.target.value }))}
                  rows={3}
                  placeholder="Descreva como executar este passo..."
                />
              </div>

              {/* Tempo estimado + Obrigatorio */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tempo estimado (min)</label>
                  <Input
                    type="number"
                    min={0}
                    className="w-32"
                    value={editData.tempo_estimado_min}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, tempo_estimado_min: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id={`obrigatorio-${step.id}`}
                    checked={editData.is_obrigatorio}
                    onCheckedChange={(checked) =>
                      setEditData((d) => ({ ...d, is_obrigatorio: !!checked }))
                    }
                  />
                  <label htmlFor={`obrigatorio-${step.id}`} className="text-sm font-medium cursor-pointer">
                    Passo obrigatorio
                  </label>
                </div>
              </div>

              {/* Checklist */}
              <ChecklistEditor
                items={checklistItems}
                stepId={step.id}
                onAdd={onAddChecklist}
                onRemove={onRemoveChecklist}
              />

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir Passo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir passo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O passo &quot;{step.titulo}&quot; sera removido permanentemente. Esta acao nao pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(step.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="button" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Passo
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
