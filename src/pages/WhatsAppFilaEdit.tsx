// Página: Criar/Editar Fila WhatsApp

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWhatsAppQueueMT, useWhatsAppQueuesMT } from '@/hooks/multitenant/useWhatsAppQueuesMT';
import { useWhatsAppSessionsMT } from '@/hooks/multitenant/useWhatsAppSessionsMT';
import { QUEUE_COLORS, QUEUE_ICONS } from '@/types/whatsapp-queue';
import type { QueueDistributionType } from '@/types/whatsapp-queue';

const formSchema = z.object({
  codigo: z.string().min(2, 'Mínimo 2 caracteres'),
  nome: z.string().min(3, 'Mínimo 3 caracteres'),
  descricao: z.string().optional(),
  session_id: z.string().uuid('Selecione uma sessão'),
  distribution_type: z.enum(['round_robin', 'least_busy', 'manual', 'skill_based']),
  cor: z.string(),
  icone: z.string(),
  max_concurrent_per_user: z.number().min(1).max(20),
  auto_assign: z.boolean(),
  first_response_sla_minutes: z.number().min(1),
  resolution_sla_minutes: z.number().min(1),
  trabalha_24h: z.boolean(),
  welcome_message: z.string().optional(),
});

export default function WhatsAppFilaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { queue, isLoading: isLoadingQueue } = useWhatsAppQueueMT(id);
  const { create, update } = useWhatsAppQueuesMT();
  const { sessions } = useWhatsAppSessionsMT({ is_active: true });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      descricao: '',
      session_id: '',
      distribution_type: 'round_robin',
      cor: QUEUE_COLORS[0],
      icone: QUEUE_ICONS[0],
      max_concurrent_per_user: 5,
      auto_assign: true,
      first_response_sla_minutes: 5,
      resolution_sla_minutes: 60,
      trabalha_24h: true,
      welcome_message: '',
    },
  });

  useEffect(() => {
    if (queue && isEditing) {
      form.reset({
        codigo: queue.codigo,
        nome: queue.nome,
        descricao: queue.descricao || '',
        session_id: queue.session_id,
        distribution_type: queue.distribution_type,
        cor: queue.cor,
        icone: queue.icone,
        max_concurrent_per_user: queue.max_concurrent_per_user,
        auto_assign: queue.auto_assign,
        first_response_sla_minutes: queue.first_response_sla_minutes,
        resolution_sla_minutes: queue.resolution_sla_minutes,
        trabalha_24h: queue.trabalha_24h,
        welcome_message: queue.welcome_message || '',
      });
    }
  }, [queue, isEditing, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isEditing && id) {
      await update.mutateAsync({ id, ...values });
    } else {
      await create.mutateAsync(values);
    }
    navigate('/whatsapp/filas');
  };

  if (isLoadingQueue && isEditing) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/filas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Editar Fila' : 'Nova Fila'}</h1>
          <p className="text-muted-foreground">Configure a fila de atendimento</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="codigo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl><Input {...field} disabled={isEditing} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="session_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sessão WhatsApp *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sessions?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUEUE_COLORS.map(c => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                              {c}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="icone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUEUE_ICONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribuição</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="distribution_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Distribuição</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="round_robin">Revezamento Circular</SelectItem>
                      <SelectItem value="least_busy">Menos Ocupado</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="skill_based">Baseado em Habilidades</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="max_concurrent_per_user" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máx Conversas/Atendente</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="auto_assign" render={({ field }) => (
                  <FormItem className="flex items-center justify-between pt-6">
                    <FormLabel>Atribuição Automática</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>SLA</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_response_sla_minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>1ª Resposta (min)</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="resolution_sla_minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolução (min)</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/whatsapp/filas')}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
