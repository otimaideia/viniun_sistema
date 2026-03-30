import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useTenantContext } from '@/contexts/TenantContext';
import { useSOPsMT, useSOPMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPCategoriesMT } from '@/hooks/multitenant/useSOPCategoriesMT';
import { useDepartments } from '@/hooks/multitenant/useDepartments';
import { SOP_PRIORIDADE_CONFIG } from '@/types/sop';
import StepBuilder from '@/components/processos/StepBuilder';

const sopSchema = z.object({
  codigo: z.string().min(1, 'Codigo e obrigatorio'),
  titulo: z.string().min(1, 'Titulo e obrigatorio'),
  descricao: z.string().optional(),
  objetivo: z.string().optional(),
  escopo: z.string().optional(),
  category_id: z.string().optional(),
  department_id: z.string().optional(),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'critica']),
  tempo_estimado_min: z.coerce.number().min(0).optional(),
  tags: z.string().optional(),
  is_template: z.boolean(),
});

type SOPFormValues = z.infer<typeof sopSchema>;

export default function SOPEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: sop, isLoading: isLoadingSOP } = useSOPMT(id);
  const { create, update } = useSOPsMT();
  const { categories } = useSOPCategoriesMT();
  const { departments } = useDepartments();

  const form = useForm<SOPFormValues>({
    resolver: zodResolver(sopSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descricao: '',
      objetivo: '',
      escopo: '',
      category_id: '',
      department_id: '',
      prioridade: 'normal',
      tempo_estimado_min: undefined,
      tags: '',
      is_template: false,
    },
  });

  useEffect(() => {
    if (sop && isEditing) {
      form.reset({
        codigo: sop.codigo,
        titulo: sop.titulo,
        descricao: sop.descricao || '',
        objetivo: sop.objetivo || '',
        escopo: sop.escopo || '',
        category_id: sop.category_id || '',
        department_id: sop.department_id || '',
        prioridade: sop.prioridade,
        tempo_estimado_min: sop.tempo_estimado_min ?? undefined,
        tags: sop.tags?.join(', ') || '',
        is_template: sop.is_template,
      });
    }
  }, [sop, isEditing, form]);

  const onSubmit = async (values: SOPFormValues) => {
    const payload: any = {
      codigo: values.codigo,
      titulo: values.titulo,
      descricao: values.descricao || null,
      objetivo: values.objetivo || null,
      escopo: values.escopo || null,
      category_id: values.category_id || null,
      department_id: values.department_id || null,
      prioridade: values.prioridade,
      tempo_estimado_min: values.tempo_estimado_min || null,
      tags: values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : null,
      is_template: values.is_template,
    };

    try {
      if (isEditing && id) {
        await update.mutateAsync({ id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      navigate('/processos');
    } catch {
      // toast handled by hook
    }
  };

  if (isTenantLoading || (isEditing && isLoadingSOP)) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/processos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar POP' : 'Novo POP'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacoes Basicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codigo *</FormLabel>
                      <FormControl>
                        <Input placeholder="POP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titulo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do procedimento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descricao</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o procedimento..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="objetivo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Qual o objetivo deste POP?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="escopo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escopo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A quem se aplica este POP?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classificacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {departments?.map((dep: any) => (
                            <SelectItem key={dep.id} value={dep.id}>
                              {dep.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SOP_PRIORIDADE_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                              {cfg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tempo_estimado_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo Estimado (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="30"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (separadas por virgula)</FormLabel>
                      <FormControl>
                        <Input placeholder="atendimento, recepcao, limpeza" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_template"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">
                      Salvar como template (pode ser reutilizado por outras franquias)
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to="/processos">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alteracoes'
                  : 'Criar POP'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Step Builder - only for existing POPs */}
      {isEditing && id ? (
        <Card>
          <CardHeader>
            <CardTitle>Passos do Procedimento</CardTitle>
          </CardHeader>
          <CardContent>
            <StepBuilder sopId={id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Salve o POP primeiro para adicionar passos.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
