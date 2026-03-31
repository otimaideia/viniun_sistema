import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTarefasMT } from '@/hooks/multitenant/useTarefasMT';
import { useTarefaMT } from '@/hooks/multitenant/useTarefaMT';
import { useTarefaCategoriesMT } from '@/hooks/multitenant/useTarefaCategoriesMT';
import { useTarefaNotificationsMT } from '@/hooks/multitenant/useTarefaNotificationsMT';
import { useUsersMT } from '@/hooks/multitenant/useUsersMT';
import type { TaskPriority, MTTask } from '@/types/tarefa';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/tarefa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Loader2, Calendar, Clock, Search, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// =============================================================
// Schema
// =============================================================

const tarefaSchema = z.object({
  titulo: z.string().min(1, 'Titulo e obrigatorio').max(500),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  category_id: z.string().optional(),
  estimated_minutes: z.coerce.number().positive().optional().or(z.literal('')),
  assignee_ids: z.array(z.string()).min(1, 'Selecione ao menos um responsavel'),
});

type TarefaFormData = z.infer<typeof tarefaSchema>;

// =============================================================
// User type for the assignee list
// =============================================================

interface TenantUser {
  id: string;
  nome: string;
  email: string | null;
}

// =============================================================
// Component
// =============================================================

export default function TarefaEdit() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { session: authSession } = useAuth();
  const { task, isLoading: isTaskLoading } = useTarefaMT(isEditing ? id : undefined);
  const { categories, isLoading: isCategoriesLoading } = useTarefaCategoriesMT();
  const { create, update, syncAssignees, fetchTask } = useTarefasMT();
  const { notifyStatusChange } = useTarefaNotificationsMT();

  const [searchUser, setSearchUser] = useState('');
  const [aiIdea, setAiIdea] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  // ---- Fetch tenant users for assignee selection ----
  const { users: mtUsers } = useUsersMT({ is_active: true });
  const users: TenantUser[] = (mtUsers || []).map(u => ({ id: u.id, nome: u.nome, email: u.email }));

  const filteredUsers = useMemo(() => {
    if (!searchUser.trim()) return users;
    const q = searchUser.toLowerCase();
    return users.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchUser]);

  // ---- Form ----
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TarefaFormData>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      prioridade: 'normal',
      due_date: '',
      due_time: '',
      category_id: '',
      estimated_minutes: '' as unknown as number,
      assignee_ids: [],
    },
  });

  const selectedAssignees = watch('assignee_ids');
  const selectedPrioridade = watch('prioridade');
  const selectedCategory = watch('category_id');
  const selectedDate = watch('due_date');
  const selectedTime = watch('due_time');

  // ---- Populate form when editing ----
  // Wait for both task AND categories to load before populating
  const dataReady = isEditing ? !!task && !isCategoriesLoading : false;
  const [populated, setPopulated] = useState(false);

  useEffect(() => {
    if (isEditing && dataReady && !populated) {
      let dateStr = '';
      let timeStr = '';
      if (task!.due_date) {
        const d = new Date(task!.due_date);
        dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
        timeStr = d.toTimeString().slice(0, 5); // HH:MM
      }

      reset({
        titulo: task!.titulo,
        descricao: task!.descricao || '',
        prioridade: task!.prioridade,
        due_date: dateStr,
        due_time: timeStr,
        category_id: task!.category_id || '',
        estimated_minutes: task!.estimated_minutes ?? ('' as unknown as number),
        assignee_ids: task!.assignees?.map((a) => a.user_id) || [],
      });
      setPopulated(true);
    }
  }, [isEditing, dataReady, populated, reset, task]);

  // ---- Submit ----
  const onSubmit = async (data: TarefaFormData) => {
    // Combine date + time into ISO string
    let combinedDueDate: string | undefined;
    if (data.due_date) {
      const time = data.due_time || '23:59';
      combinedDueDate = new Date(`${data.due_date}T${time}:00`).toISOString();
    }

    const payload = {
      titulo: data.titulo,
      descricao: data.descricao || undefined,
      prioridade: data.prioridade as TaskPriority,
      due_date: combinedDueDate,
      category_id: data.category_id || undefined,
      estimated_minutes:
        data.estimated_minutes !== '' && data.estimated_minutes !== undefined
          ? Number(data.estimated_minutes)
          : undefined,
      assignee_ids: data.assignee_ids,
    };

    if (isEditing && id) {
      const { assignee_ids, ...updatePayload } = payload;
      await update.mutateAsync({ id, ...updatePayload });

      // Sync assignees via hook
      await syncAssignees(id, assignee_ids);

      // Fire-and-forget WhatsApp notification to all assignees
      const updatedTask = await fetchTask(id);

      if (updatedTask && assignee_ids.length > 0) {
        notifyStatusChange(
          updatedTask as MTTask,
          assignee_ids,
          task?.status || 'pendente',
          updatedTask.status,
          'Tarefa editada',
        );
      }

      navigate(`/tarefas/${id}`);
    } else {
      await create.mutateAsync(payload);
      navigate('/tarefas');
    }
  };

  // ---- Toggle assignee ----
  const toggleAssignee = (userId: string) => {
    const current = selectedAssignees || [];
    if (current.includes(userId)) {
      setValue(
        'assignee_ids',
        current.filter((id) => id !== userId),
        { shouldValidate: true },
      );
    } else {
      setValue('assignee_ids', [...current, userId], { shouldValidate: true });
    }
  };

  // ---- AI Assist ----
  const handleAiAssist = useCallback(async () => {
    if (!aiIdea.trim() || !tenant) return;

    setIsAiLoading(true);
    try {
      const token = authSession?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            idea: aiIdea.trim(),
            tenant_id: tenant.id,
            categories: categories.map((c) => ({ id: c.id, nome: c.nome })),
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Erro ao processar com IA');
        return;
      }

      const d = result.data;

      // Preencher formulário com dados da IA
      if (d.titulo) setValue('titulo', d.titulo);
      if (d.descricao) setValue('descricao', d.descricao);
      if (d.prioridade) setValue('prioridade', d.prioridade, { shouldValidate: true });
      if (d.category_id) setValue('category_id', d.category_id, { shouldValidate: true });
      if (d.estimated_minutes) setValue('estimated_minutes', d.estimated_minutes);
      if (d.due_date) setValue('due_date', d.due_date);
      if (d.due_time) setValue('due_time', d.due_time);

      setAiApplied(true);
      toast.success('Campos preenchidos pela IA! Revise e ajuste conforme necessario.');
    } catch (err) {
      console.error('[AI Assist] Erro:', err);
      toast.error('Erro de conexao com a IA. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  }, [aiIdea, tenant, categories, setValue, authSession]);

  // ---- Quick time helpers ----
  const quickTimes = [
    { label: 'Manhã (09:00)', value: '09:00' },
    { label: 'Almoço (12:00)', value: '12:00' },
    { label: 'Tarde (15:00)', value: '15:00' },
    { label: 'Fim do dia (18:00)', value: '18:00' },
    { label: 'Noite (21:00)', value: '21:00' },
  ];

  // ---- Quick date helpers ----
  const today = new Date();
  const quickDates = [
    {
      label: 'Hoje',
      value: today.toISOString().slice(0, 10),
    },
    {
      label: 'Amanhã',
      value: new Date(today.getTime() + 86400000).toISOString().slice(0, 10),
    },
    {
      label: 'Em 3 dias',
      value: new Date(today.getTime() + 86400000 * 3).toISOString().slice(0, 10),
    },
    {
      label: 'Próx. semana',
      value: new Date(today.getTime() + 86400000 * 7).toISOString().slice(0, 10),
    },
    {
      label: 'Em 15 dias',
      value: new Date(today.getTime() + 86400000 * 15).toISOString().slice(0, 10),
    },
    {
      label: 'Em 30 dias',
      value: new Date(today.getTime() + 86400000 * 30).toISOString().slice(0, 10),
    },
  ];

  // ---- Loading states ----
  const isLoading = isTenantLoading || (isEditing && isTaskLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEditing && !task && !isTaskLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tarefas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Tarefa nao encontrada.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h1>
      </div>

      {/* AI Assist - Apenas para criação */}
      {!isEditing && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente IA
            </CardTitle>
            <CardDescription>
              Descreva sua ideia ou necessidade e a IA vai preencher os campos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Ex: Preciso urgente que alguem ligue para o fornecedor de insumos para confirmar a entrega de amanha. E importante porque temos agendamentos marcados..."
              rows={3}
              value={aiIdea}
              onChange={(e) => {
                setAiIdea(e.target.value);
                if (aiApplied) setAiApplied(false);
              }}
              disabled={isAiLoading}
              className="bg-background resize-none"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleAiAssist}
                disabled={isAiLoading || !aiIdea.trim()}
                size="sm"
                className="gap-2"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Preencher com IA
                  </>
                )}
              </Button>
              {aiApplied && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Campos preenchidos! Revise abaixo.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Tarefa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Titulo */}
            <div className="space-y-2">
              <Label htmlFor="titulo">
                Titulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="titulo"
                placeholder="Descreva a tarefa..."
                {...register('titulo')}
              />
              {errors.titulo && (
                <p className="text-sm text-destructive">{errors.titulo.message}</p>
              )}
            </div>

            {/* Descricao */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Detalhes adicionais sobre a tarefa..."
                rows={4}
                {...register('descricao')}
              />
            </div>

            {/* Prioridade + Categoria (side by side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prioridade */}
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={selectedPrioridade}
                  onValueChange={(v) =>
                    setValue('prioridade', v as TaskPriority, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: TASK_PRIORITY_COLORS[value] }}
                            />
                            {label}
                          </span>
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={selectedCategory || ''}
                  onValueChange={(v) =>
                    setValue('category_id', v === '__none__' ? '' : v, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.cor }}
                          />
                          {cat.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCategoriesLoading && (
                  <p className="text-xs text-muted-foreground">
                    Carregando categorias...
                  </p>
                )}
              </div>
            </div>

            {/* Tempo estimado */}
            <div className="w-full md:w-1/2">
              <div className="space-y-2">
                <Label htmlFor="estimated_minutes">Tempo estimado (minutos)</Label>
                <Input
                  id="estimated_minutes"
                  type="number"
                  min={1}
                  placeholder="Ex: 60"
                  {...register('estimated_minutes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prazo - Card dedicado com design melhorado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prazo
            </CardTitle>
            <CardDescription>
              Defina a data e horario limite para conclusao da tarefa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick date buttons */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Atalhos de data</Label>
              <div className="flex flex-wrap gap-2">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.value}
                    type="button"
                    variant={selectedDate === qd.value ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setValue('due_date', qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date input */}
              <div className="space-y-2">
                <Label htmlFor="due_date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Data
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  className="text-base"
                  {...register('due_date')}
                />
                {selectedDate && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Time input */}
              <div className="space-y-2">
                <Label htmlFor="due_time" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Horario
                </Label>
                <Input
                  id="due_time"
                  type="time"
                  className="text-base"
                  {...register('due_time')}
                />
                {/* Quick time pills */}
                <div className="flex flex-wrap gap-1.5">
                  {quickTimes.map((qt) => (
                    <button
                      key={qt.value}
                      type="button"
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        selectedTime === qt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 hover:bg-muted border-transparent'
                      }`}
                      onClick={() => setValue('due_time', qt.value)}
                    >
                      {qt.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear date */}
            {selectedDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setValue('due_date', '');
                  setValue('due_time', '');
                }}
              >
                Limpar prazo
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Responsaveis */}
        <Card>
          <CardHeader>
            <CardTitle>
              Responsaveis <span className="text-destructive">*</span>
            </CardTitle>
            <CardDescription>
              Selecione quem sera responsavel por esta tarefa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            {users.length > 5 && (
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {usersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuarios...
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum usuario encontrado para este tenant.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {filteredUsers.map((user) => {
                  const isChecked = selectedAssignees?.includes(user.id) ?? false;
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleAssignee(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.nome}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {filteredUsers.length === 0 && searchUser && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum resultado para "{searchUser}"
                  </p>
                )}
              </div>
            )}

            {errors.assignee_ids && (
              <p className="text-sm text-destructive mt-2">
                {errors.assignee_ids.message}
              </p>
            )}

            {selectedAssignees && selectedAssignees.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedAssignees.length}{' '}
                {selectedAssignees.length === 1 ? 'responsavel' : 'responsaveis'}{' '}
                selecionado{selectedAssignees.length > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Salvar Alteracoes' : 'Criar Tarefa'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
