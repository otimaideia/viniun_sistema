import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { PeriodType, UpdateBudgetInput } from '@/types/whatsapp-hybrid';

const budgetSchema = z.object({
  franchise_id: z.string().optional(),
  period_type: z.enum(['daily', 'weekly', 'monthly']),
  budget_limit: z.number().min(0, 'Valor deve ser positivo'),
  budget_alert_threshold: z.number().min(0.1).max(1).optional(),
});

type FormValues = z.infer<typeof budgetSchema>;

interface BudgetConfigFormProps {
  franchises?: Array<{ id: string; nome: string }>;
  currentBudget?: number;
  onSubmit: (data: UpdateBudgetInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function BudgetConfigForm({
  franchises = [],
  currentBudget,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BudgetConfigFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      franchise_id: undefined,
      period_type: 'monthly',
      budget_limit: currentBudget || 100,
      budget_alert_threshold: 0.8,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values as UpdateBudgetInput);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Franquia</Label>
          <Select
            value={form.watch('franchise_id') || 'all'}
            onValueChange={(v) => form.setValue('franchise_id', v === 'all' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as franquias</SelectItem>
              {franchises.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Período</Label>
          <Select
            value={form.watch('period_type')}
            onValueChange={(v) => form.setValue('period_type', v as PeriodType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Limite de orçamento (R$)</Label>
        <Input
          type="number"
          step="0.01"
          {...form.register('budget_limit', { valueAsNumber: true })}
          placeholder="100.00"
        />
        {form.formState.errors.budget_limit && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.budget_limit.message}</p>
        )}
      </div>

      <div>
        <Label>Alerta quando atingir (%)</Label>
        <Select
          value={String(form.watch('budget_alert_threshold'))}
          onValueChange={(v) => form.setValue('budget_alert_threshold', parseFloat(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">50%</SelectItem>
            <SelectItem value="0.7">70%</SelectItem>
            <SelectItem value="0.8">80%</SelectItem>
            <SelectItem value="0.9">90%</SelectItem>
            <SelectItem value="0.95">95%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Orçamento
        </Button>
      </div>
    </form>
  );
}
