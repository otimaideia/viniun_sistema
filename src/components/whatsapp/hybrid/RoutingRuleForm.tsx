import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { WhatsAppRoutingRule, CreateRoutingRuleInput, ConditionType, ProviderPreference, ProviderType } from '@/types/whatsapp-hybrid';
import { CONDITION_TYPE_LABELS } from '@/types/whatsapp-hybrid';

const ruleSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  franchise_id: z.string().optional(),
  condition_type: z.string().min(1, 'Condição obrigatória'),
  preferred_provider: z.string().min(1, 'Provider obrigatório'),
  fallback_provider: z.string().optional(),
  force_provider: z.boolean().optional(),
  alert_before_cost: z.boolean().optional(),
  require_confirmation: z.boolean().optional(),
  max_cost_per_message: z.number().optional(),
  priority: z.number().optional(),
});

type FormValues = z.infer<typeof ruleSchema>;

interface RoutingRuleFormProps {
  rule?: WhatsAppRoutingRule;
  franchises?: Array<{ id: string; nome: string }>;
  onSubmit: (data: CreateRoutingRuleInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RoutingRuleForm({
  rule,
  franchises = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RoutingRuleFormProps) {
  const isEditing = !!rule;

  const form = useForm<FormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      nome: rule?.nome || '',
      descricao: rule?.descricao || '',
      franchise_id: rule?.franchise_id || undefined,
      condition_type: rule?.condition_type || 'always',
      preferred_provider: rule?.preferred_provider || 'cheapest',
      fallback_provider: rule?.fallback_provider || undefined,
      force_provider: rule?.force_provider || false,
      alert_before_cost: rule?.alert_before_cost || false,
      require_confirmation: rule?.require_confirmation || false,
      max_cost_per_message: rule?.max_cost_per_message || undefined,
      priority: rule?.priority || 50,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      condition_type: values.condition_type as ConditionType,
      preferred_provider: values.preferred_provider as ProviderPreference,
      fallback_provider: values.fallback_provider as ProviderType | undefined,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome da regra *</Label>
          <Input {...form.register('nome')} placeholder="Ex: Janela aberta → WAHA" />
          {form.formState.errors.nome && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
          )}
        </div>
        <div>
          <Label>Franquia</Label>
          <Select
            value={form.watch('franchise_id') || 'global'}
            onValueChange={(v) => form.setValue('franchise_id', v === 'global' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Global" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (todas)</SelectItem>
              {franchises.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea {...form.register('descricao')} placeholder="Descrição da regra" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Condição *</Label>
          <Select
            value={form.watch('condition_type')}
            onValueChange={(v) => form.setValue('condition_type', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CONDITION_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Provider preferido *</Label>
          <Select
            value={form.watch('preferred_provider')}
            onValueChange={(v) => form.setValue('preferred_provider', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cheapest">Mais barato (auto)</SelectItem>
              <SelectItem value="fastest">Mais rápido (auto)</SelectItem>
              <SelectItem value="waha">WAHA</SelectItem>
              <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fallback</Label>
          <Select
            value={form.watch('fallback_provider') || 'none'}
            onValueChange={(v) => form.setValue('fallback_provider', v === 'none' ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              <SelectItem value="waha">WAHA</SelectItem>
              <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridade</Label>
          <Input
            type="number"
            {...form.register('priority', { valueAsNumber: true })}
            placeholder="10"
            min={1}
            max={1000}
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Menor = maior prioridade</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Forçar provider</Label>
            <p className="text-xs text-muted-foreground">Ignorar fallback se falhar</p>
          </div>
          <Switch
            checked={form.watch('force_provider')}
            onCheckedChange={(v) => form.setValue('force_provider', v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Alertar custo</Label>
            <p className="text-xs text-muted-foreground">Mostrar custo antes de enviar</p>
          </div>
          <Switch
            checked={form.watch('alert_before_cost')}
            onCheckedChange={(v) => form.setValue('alert_before_cost', v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Exigir confirmação</Label>
            <p className="text-xs text-muted-foreground">Confirmar antes de mensagens pagas</p>
          </div>
          <Switch
            checked={form.watch('require_confirmation')}
            onCheckedChange={(v) => form.setValue('require_confirmation', v)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Salvar' : 'Criar Regra'}
        </Button>
      </div>
    </form>
  );
}
