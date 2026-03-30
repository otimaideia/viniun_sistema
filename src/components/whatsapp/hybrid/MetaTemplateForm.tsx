import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { WhatsAppMetaTemplate, WhatsAppProvider, CreateMetaTemplateInput, TemplateCategory, TemplateHeaderType } from '@/types/whatsapp-hybrid';
import { TEMPLATE_CATEGORY_LABELS, META_COST_TABLE_BRL, formatCostBRL } from '@/types/whatsapp-hybrid';

const templateSchema = z.object({
  provider_id: z.string().min(1, 'Provider obrigatório'),
  meta_template_name: z.string().min(2, 'Nome obrigatório').regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  language: z.string().optional(),
  category: z.enum(['UTILITY', 'AUTHENTICATION', 'MARKETING', 'SERVICE']),
  header_type: z.enum(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']).optional(),
  header_text: z.string().optional(),
  body_text: z.string().min(1, 'Corpo obrigatório'),
  footer_text: z.string().optional(),
  estimated_cost_brl: z.number().optional(),
});

type FormValues = z.infer<typeof templateSchema>;

interface MetaTemplateFormProps {
  template?: WhatsAppMetaTemplate;
  providers: WhatsAppProvider[];
  onSubmit: (data: CreateMetaTemplateInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function MetaTemplateForm({
  template,
  providers,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MetaTemplateFormProps) {
  const isEditing = !!template;

  const metaProviders = providers.filter(p => p.provider_type === 'meta_cloud_api' && p.is_active);

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      provider_id: template?.provider_id || metaProviders[0]?.id || '',
      meta_template_name: template?.meta_template_name || '',
      language: template?.language || 'pt_BR',
      category: template?.category || 'UTILITY',
      header_type: template?.header_type || 'NONE',
      header_text: template?.header_text || '',
      body_text: template?.body_text || '',
      footer_text: template?.footer_text || '',
      estimated_cost_brl: template?.estimated_cost_brl || undefined,
    },
  });

  const category = form.watch('category');
  const headerType = form.watch('header_type');
  const cost = META_COST_TABLE_BRL[category as TemplateCategory];

  // Detectar variáveis no body
  const bodyText = form.watch('body_text') || '';
  const variables = bodyText.match(/\{\{\d+\}\}/g) || [];

  const handleSubmit = (values: FormValues) => {
    const bodyVars = (values.body_text.match(/\{\{\d+\}\}/g) || []).map((_, i) => `var${i + 1}`);
    onSubmit({
      ...values,
      category: values.category as TemplateCategory,
      header_type: values.header_type as TemplateHeaderType,
      body_variables: bodyVars.length > 0 ? bodyVars : undefined,
      estimated_cost_brl: META_COST_TABLE_BRL[values.category as TemplateCategory],
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {metaProviders.length === 0 && (
        <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          Nenhum provider Meta Cloud API ativo. Configure um provider primeiro.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Provider Meta *</Label>
          <Select
            value={form.watch('provider_id')}
            onValueChange={(v) => form.setValue('provider_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {metaProviders.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoria *</Label>
          <Select
            value={form.watch('category')}
            onValueChange={(v) => form.setValue('category', v as TemplateCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label} - {formatCostBRL(META_COST_TABLE_BRL[key as TemplateCategory])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Custo estimado: {formatCostBRL(cost)}/msg
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome do template *</Label>
          <Input
            {...form.register('meta_template_name')}
            placeholder="ex: confirmacao_agendamento"
            disabled={isEditing}
          />
          {form.formState.errors.meta_template_name && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.meta_template_name.message}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">Apenas letras minúsculas, números e _</p>
        </div>
        <div>
          <Label>Idioma</Label>
          <Select
            value={form.watch('language')}
            onValueChange={(v) => form.setValue('language', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
              <SelectItem value="en_US">English (US)</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Header */}
      <div>
        <Label>Cabeçalho</Label>
        <Select
          value={form.watch('header_type')}
          onValueChange={(v) => form.setValue('header_type', v as TemplateHeaderType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Sem cabeçalho</SelectItem>
            <SelectItem value="TEXT">Texto</SelectItem>
            <SelectItem value="IMAGE">Imagem</SelectItem>
            <SelectItem value="VIDEO">Vídeo</SelectItem>
            <SelectItem value="DOCUMENT">Documento</SelectItem>
          </SelectContent>
        </Select>
        {headerType === 'TEXT' && (
          <Input {...form.register('header_text')} placeholder="Texto do cabeçalho" className="mt-2" />
        )}
      </div>

      {/* Body */}
      <div>
        <Label>Corpo da mensagem *</Label>
        <Textarea
          {...form.register('body_text')}
          placeholder="Olá {{1}}, seu agendamento para {{2}} está confirmado!"
          rows={4}
        />
        {form.formState.errors.body_text && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.body_text.message}</p>
        )}
        {variables.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {variables.length} variável(is) detectada(s): {variables.join(', ')}
          </p>
        )}
      </div>

      {/* Footer */}
      <div>
        <Label>Rodapé</Label>
        <Input {...form.register('footer_text')} placeholder="Ex: YESlaser - Não responda" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || metaProviders.length === 0}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Salvar' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
}
