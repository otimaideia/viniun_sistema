import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useChecklistTemplatesMT } from "@/hooks/multitenant/useChecklistTemplatesMT";
import { useChecklistTemplateMT } from "@/hooks/multitenant/useChecklistTemplateMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { useRoles } from "@/hooks/multitenant/useRolesAdmin";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import { useTeams } from "@/hooks/multitenant/useTeams";
import { useUsersAdapter } from "@/hooks/useUsersAdapter";
import {
  ASSIGNMENT_TYPE_LABELS, RECURRENCE_LABELS, PRIORIDADE_LABELS, CATEGORIAS_PADRAO,
  type ChecklistAssignmentType, type ChecklistRecurrence, type ChecklistItemPrioridade,
} from "@/types/checklist";

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const templateSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres").max(255),
  descricao: z.string().max(1000).optional(),
  assignment_type: z.enum(['role', 'user', 'department', 'team']),
  role_id: z.string().optional(),
  user_id: z.string().optional(),
  department_id: z.string().optional(),
  team_id: z.string().optional(),
  recurrence: z.enum(['diaria', 'semanal', 'mensal', 'pontual']),
  dias_semana: z.array(z.number()).optional(),
  hora_inicio: z.string().default('08:00'),
  hora_fim: z.string().default('18:00'),
  cor: z.string().default('#6366F1'),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface NewItemForm {
  titulo: string;
  descricao: string;
  hora_bloco: string;
  duracao_min: number;
  prioridade: ChecklistItemPrioridade;
  categoria: string;
  is_obrigatorio: boolean;
  requer_foto: boolean;
  requer_observacao: boolean;
}

const emptyItem: NewItemForm = {
  titulo: '',
  descricao: '',
  hora_bloco: '',
  duracao_min: 30,
  prioridade: 'normal',
  categoria: '',
  is_obrigatorio: true,
  requer_foto: false,
  requer_observacao: false,
};

export default function ChecklistTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [isSaving, setIsSaving] = useState(false);
  const [newItems, setNewItems] = useState<NewItemForm[]>([{ ...emptyItem }]);
  const { tenant } = useTenantContext();
  const { create, update } = useChecklistTemplatesMT();
  const { data: template, items: existingItems, isLoading, createItem, removeItem } = useChecklistTemplateMT(id);

  // Hooks para os seletores de atribuição
  const { roles } = useRoles();
  const { departments } = useDepartments();
  const { teams } = useTeams();
  const { users } = useUsersAdapter();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      assignment_type: 'role',
      recurrence: 'diaria',
      dias_semana: [1, 2, 3, 4, 5],
      hora_inicio: '08:00',
      hora_fim: '18:00',
      cor: '#6366F1',
    },
  });

  useEffect(() => {
    if (isEditing && template) {
      form.reset({
        nome: template.nome,
        descricao: template.descricao || '',
        assignment_type: template.assignment_type,
        role_id: template.role_id || undefined,
        user_id: template.user_id || undefined,
        department_id: template.department_id || undefined,
        team_id: template.team_id || undefined,
        recurrence: template.recurrence,
        dias_semana: template.dias_semana || [1, 2, 3, 4, 5],
        hora_inicio: template.hora_inicio?.slice(0, 5) || '08:00',
        hora_fim: template.hora_fim?.slice(0, 5) || '18:00',
        cor: template.cor || '#6366F1',
      });
      setNewItems([]);
    }
  }, [template, isEditing, form]);

  const watchRecurrence = form.watch('recurrence');
  const watchAssignment = form.watch('assignment_type');

  const onSubmit = async (values: TemplateFormValues) => {
    setIsSaving(true);
    try {
      if (isEditing && id) {
        await update.mutateAsync({ id, ...values });
        // Save new items
        for (const item of newItems) {
          if (item.titulo.trim()) {
            await createItem.mutateAsync({
              template_id: id,
              titulo: item.titulo,
              descricao: item.descricao || undefined,
              hora_bloco: item.hora_bloco || undefined,
              duracao_min: item.duracao_min,
              prioridade: item.prioridade,
              categoria: item.categoria || undefined,
              is_obrigatorio: item.is_obrigatorio,
              requer_foto: item.requer_foto,
              requer_observacao: item.requer_observacao,
              ordem: (existingItems?.length || 0) + newItems.indexOf(item),
            });
          }
        }
        toast.success('Template atualizado com sucesso');
      } else {
        const result = await create.mutateAsync(values);
        // Create items for new template
        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          if (item.titulo.trim()) {
            await createItem.mutateAsync({
              template_id: result.id,
              titulo: item.titulo,
              descricao: item.descricao || undefined,
              hora_bloco: item.hora_bloco || undefined,
              duracao_min: item.duracao_min,
              prioridade: item.prioridade,
              categoria: item.categoria || undefined,
              is_obrigatorio: item.is_obrigatorio,
              requer_foto: item.requer_foto,
              requer_observacao: item.requer_observacao,
              ordem: i,
            });
          }
        }
        toast.success('Template criado com sucesso');
      }
      navigate('/checklist');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const addNewItem = () => {
    setNewItems([...newItems, { ...emptyItem }]);
  };

  const updateNewItem = (index: number, field: keyof NewItemForm, value: any) => {
    const updated = [...newItems];
    (updated[index] as any)[field] = value;
    setNewItems(updated);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  if (isLoading && isEditing) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/checklist')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Editar Template" : "Novo Template de Checklist"}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isEditing ? "Atualize o template e seus itens" : "Defina as tarefas diárias e a quem se aplica"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Template *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Checklist Recepcionista Manhã" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-10 h-10 rounded cursor-pointer border"
                            />
                            <Input value={field.value} onChange={field.onChange} className="w-28" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o objetivo deste checklist..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Atribuição */}
            <Card>
              <CardHeader>
                <CardTitle>Atribuição</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aplicar para *</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v);
                            // Limpar seleção anterior ao trocar tipo
                            form.setValue('role_id', undefined);
                            form.setValue('user_id', undefined);
                            form.setValue('department_id', undefined);
                            form.setValue('team_id', undefined);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Defina quem deve executar este checklist diariamente
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* Seletor condicional: Cargo */}
                  {watchAssignment === 'role' && (
                    <FormField
                      control={form.control}
                      name="role_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o cargo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Todos os usuários com este cargo receberão o checklist
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Seletor condicional: Pessoa */}
                  {watchAssignment === 'user' && (
                    <FormField
                      control={form.control}
                      name="user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pessoa *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a pessoa..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.filter(u => u.is_active).map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.nome} {u.email ? `(${u.email})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Apenas esta pessoa receberá o checklist
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Seletor condicional: Departamento */}
                  {watchAssignment === 'department' && (
                    <FormField
                      control={form.control}
                      name="department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o departamento..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dep) => (
                                <SelectItem key={dep.id} value={dep.id}>
                                  {dep.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Todos do departamento receberão o checklist
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Seletor condicional: Equipe */}
                  {watchAssignment === 'team' && (
                    <FormField
                      control={form.control}
                      name="team_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipe *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a equipe..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Todos da equipe receberão o checklist
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recorrência e Horário */}
            <Card>
              <CardHeader>
                <CardTitle>Recorrência e Horário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recorrência</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hora_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Início</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hora_fim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Fim</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {watchRecurrence === 'semanal' && (
                  <FormField
                    control={form.control}
                    name="dias_semana"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias da Semana</FormLabel>
                        <div className="flex gap-2">
                          {DIAS_SEMANA.map((dia) => (
                            <Button
                              key={dia.value}
                              type="button"
                              variant={field.value?.includes(dia.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const current = field.value || [];
                                field.onChange(
                                  current.includes(dia.value)
                                    ? current.filter((d: number) => d !== dia.value)
                                    : [...current, dia.value]
                                );
                              }}
                            >
                              {dia.label}
                            </Button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Itens Existentes (modo edição) */}
            {isEditing && existingItems && existingItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Itens Existentes ({existingItems.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {existingItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                      {item.hora_bloco && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {item.hora_bloco.slice(0, 5)}
                        </Badge>
                      )}
                      <span className="flex-1 font-medium">{item.titulo}</span>
                      <Badge variant="secondary">{PRIORIDADE_LABELS[item.prioridade]}</Badge>
                      {item.categoria && <Badge variant="outline">{item.categoria}</Badge>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Novos Itens */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{isEditing ? "Adicionar Itens" : "Itens do Checklist"}</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {newItems.length === 0 && !isEditing && (
                  <p className="text-muted-foreground text-center py-4">
                    Adicione pelo menos um item ao checklist
                  </p>
                )}
                {newItems.map((item, index) => (
                  <div key={item.id || `new-item-${index}`} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Item {(existingItems?.length || 0) + index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Título da tarefa *"
                          value={item.titulo}
                          onChange={(e) => updateNewItem(index, 'titulo', e.target.value)}
                        />
                      </div>
                      <Input
                        placeholder="Descrição (opcional)"
                        value={item.descricao}
                        onChange={(e) => updateNewItem(index, 'descricao', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          placeholder="Hora"
                          value={item.hora_bloco}
                          onChange={(e) => updateNewItem(index, 'hora_bloco', e.target.value)}
                          className="w-32"
                        />
                        <Input
                          type="number"
                          placeholder="Min"
                          value={item.duracao_min}
                          onChange={(e) => updateNewItem(index, 'duracao_min', parseInt(e.target.value) || 30)}
                          className="w-20"
                          min={5}
                          max={480}
                        />
                        <Select
                          value={item.prioridade}
                          onValueChange={(v) => updateNewItem(index, 'prioridade', v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORIDADE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="relative">
                        <Input
                          placeholder="Categoria"
                          value={item.categoria}
                          onChange={(e) => updateNewItem(index, 'categoria', e.target.value)}
                          list={`categorias-${index}`}
                          className="w-40"
                        />
                        <datalist id={`categorias-${index}`}>
                          {CATEGORIAS_PADRAO.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.is_obrigatorio}
                          onCheckedChange={(v) => updateNewItem(index, 'is_obrigatorio', !!v)}
                        />
                        Obrigatório
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.requer_foto}
                          onCheckedChange={(v) => updateNewItem(index, 'requer_foto', !!v)}
                        />
                        Requer Foto
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={item.requer_observacao}
                          onCheckedChange={(v) => updateNewItem(index, 'requer_observacao', !!v)}
                        />
                        Requer Observação
                      </label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/checklist')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Atualizar" : "Criar Template"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
