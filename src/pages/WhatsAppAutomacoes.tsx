import { useState } from 'react';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ModuleLayout,
  EmptyState,
  DeleteConfirmDialog,
} from '@/components/shared/index';
import {
  useAutomationsAdapter,
  AUTOMATION_TYPE_LABELS,
  AUTOMATION_TYPE_DESCRIPTIONS,
  WEEKDAY_LABELS,
} from '@/hooks/useAutomationsAdapter';
import type { WhatsAppAutomation, AutomationType, CreateAutomationInput } from '@/hooks/useAutomationsAdapter';
import { useWhatsAppSessionsAdapter } from '@/hooks/useWhatsAppSessionsAdapter';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';
import { cn } from '@/lib/utils';

// Componente de Card de Automação
const AutomationCard: React.FC<{
  automation: WhatsAppAutomation;
  sessionName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling?: boolean;
}> = ({ automation, sessionName, onEdit, onDelete, onToggle, isToggling }) => {
  const typeColors: Record<AutomationType, string> = {
    welcome: 'bg-green-100 text-green-800 border-green-200',
    away: 'bg-orange-100 text-orange-800 border-orange-200',
    business_hours: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const formatSchedule = () => {
    if (!automation.schedule_enabled) return null;

    const days = automation.schedule_days?.map((d) => WEEKDAY_LABELS[d].slice(0, 3)).join(', ');
    const time = `${automation.schedule_start_time || '00:00'} - ${automation.schedule_end_time || '23:59'}`;

    return `${days || 'Todos os dias'} | ${time}`;
  };

  return (
    <Card className={cn('relative', !automation.is_active && 'opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={typeColors[automation.type]}>
                {AUTOMATION_TYPE_LABELS[automation.type]}
              </Badge>
              {!automation.is_active && (
                <Badge variant="secondary">Inativa</Badge>
              )}
            </div>
            <CardTitle className="text-base">{automation.name}</CardTitle>
            {sessionName && (
              <CardDescription className="text-xs">
                Sessão: {sessionName}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={automation.is_active}
              onCheckedChange={onToggle}
              disabled={isToggling}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Preview da mensagem */}
        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {automation.message}
          </p>
        </div>

        {/* Configurações */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Delay: {automation.delay_seconds}s</span>
          </div>
          {automation.only_first_message && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>Só primeira msg</span>
            </div>
          )}
          {automation.schedule_enabled && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatSchedule()}</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Loading skeleton
const AutomationSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-16 w-full mb-3" />
      <Skeleton className="h-4 w-full" />
    </CardContent>
  </Card>
);

export default function WhatsAppAutomacoes() {
  const { isUnidade, unidadeId } = useUserProfileAdapter();
  const { sessions: sessoes } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);
  const {
    automations,
    isLoading,
    refetch,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    isCreating,
    isUpdating,
  } = useAutomationsAdapter({});

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<WhatsAppAutomation | null>(null);
  const [deletingAutomation, setDeletingAutomation] = useState<WhatsAppAutomation | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateAutomationInput>>({
    type: 'welcome',
    name: '',
    message: '',
    delay_seconds: 2,
    only_first_message: true,
    schedule_enabled: false,
    schedule_days: [1, 2, 3, 4, 5], // Segunda a sexta
    schedule_start_time: '08:00',
    schedule_end_time: '18:00',
  });

  // Mapa de sessões
  const sessionsMap = new Map<string, string>();
  sessoes.forEach((s) => {
    sessionsMap.set(s.id, s.nome || s.session_name);
  });

  const resetForm = () => {
    setFormData({
      type: 'welcome',
      name: '',
      message: '',
      delay_seconds: 2,
      only_first_message: true,
      schedule_enabled: false,
      schedule_days: [1, 2, 3, 4, 5],
      schedule_start_time: '08:00',
      schedule_end_time: '18:00',
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingAutomation(null);
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (automation: WhatsAppAutomation) => {
    setFormData({
      session_id: automation.session_id,
      type: automation.type,
      name: automation.name,
      message: automation.message,
      delay_seconds: automation.delay_seconds,
      only_first_message: automation.only_first_message,
      schedule_enabled: automation.schedule_enabled,
      schedule_days: automation.schedule_days || [1, 2, 3, 4, 5],
      schedule_start_time: automation.schedule_start_time || '08:00',
      schedule_end_time: automation.schedule_end_time || '18:00',
    });
    setEditingAutomation(automation);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formData.session_id || !formData.name || !formData.message) {
      return;
    }

    if (editingAutomation) {
      await updateAutomation.mutateAsync({
        id: editingAutomation.id,
        name: formData.name,
        message: formData.message,
        delay_seconds: formData.delay_seconds,
        only_first_message: formData.only_first_message,
        schedule_enabled: formData.schedule_enabled,
        schedule_days: formData.schedule_days,
        schedule_start_time: formData.schedule_start_time,
        schedule_end_time: formData.schedule_end_time,
      });
    } else {
      await createAutomation.mutateAsync(formData as CreateAutomationInput);
    }

    setShowCreateDialog(false);
    resetForm();
    setEditingAutomation(null);
  };

  const handleDelete = async () => {
    if (deletingAutomation) {
      await deleteAutomation.mutateAsync(deletingAutomation.id);
      setShowDeleteDialog(false);
      setDeletingAutomation(null);
    }
  };

  const handleToggleDay = (day: number) => {
    const days = formData.schedule_days || [];
    setFormData({
      ...formData,
      schedule_days: days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort(),
    });
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Automações"
        description="Configure respostas automáticas"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Automações' },
        ]}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AutomationSkeleton />
          <AutomationSkeleton />
          <AutomationSkeleton />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Automações"
      description="Configure respostas automáticas para suas conversas"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Automações' },
      ]}
      actions={
        <>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Automação
          </Button>
        </>
      }
    >

        {automations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Bot}
                title="Nenhuma automação configurada"
                description="Crie automações para responder automaticamente aos seus contatos."
                action={{
                  label: 'Criar Automação',
                  onClick: handleOpenCreate,
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                sessionName={sessionsMap.get(automation.session_id)}
                onEdit={() => handleOpenEdit(automation)}
                onDelete={() => {
                  setDeletingAutomation(automation);
                  setShowDeleteDialog(true);
                }}
                onToggle={() =>
                  toggleAutomation.mutate({
                    id: automation.id,
                    is_active: !automation.is_active,
                  })
                }
                isToggling={toggleAutomation.isPending}
              />
            ))}
          </div>
        )}

        {/* Dialog de criação/edição */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
              </DialogTitle>
              <DialogDescription>
                Configure uma resposta automática para suas conversas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Sessão */}
              <div className="space-y-2">
                <Label>Sessão WhatsApp</Label>
                <Select
                  value={formData.session_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, session_id: value })}
                  disabled={!!editingAutomation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sessão" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessoes.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.nome || session.session_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Automação</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as AutomationType })}
                  disabled={!!editingAutomation}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AUTOMATION_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {AUTOMATION_TYPE_DESCRIPTIONS[formData.type || 'welcome']}
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Boas-vindas principal"
                />
              </div>

              {/* Mensagem */}
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Olá! Obrigado por entrar em contato..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{nome}'} para inserir o nome do contato
                </p>
              </div>

              {/* Delay */}
              <div className="space-y-2">
                <Label>Delay (segundos)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={formData.delay_seconds || 2}
                  onChange={(e) => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo de espera antes de enviar a resposta
                </p>
              </div>

              {/* Só primeira mensagem */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="only_first"
                  checked={formData.only_first_message}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, only_first_message: checked as boolean })
                  }
                />
                <Label htmlFor="only_first" className="cursor-pointer">
                  Responder apenas na primeira mensagem
                </Label>
              </div>

              {/* Agendamento */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="schedule"
                    checked={formData.schedule_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, schedule_enabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="schedule" className="cursor-pointer">
                    Ativar apenas em horários específicos
                  </Label>
                </div>

                {formData.schedule_enabled && (
                  <>
                    {/* Horário */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Horário inicial</Label>
                        <Input
                          type="time"
                          value={formData.schedule_start_time || '08:00'}
                          onChange={(e) => setFormData({ ...formData, schedule_start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário final</Label>
                        <Input
                          type="time"
                          value={formData.schedule_end_time || '18:00'}
                          onChange={(e) => setFormData({ ...formData, schedule_end_time: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Dias da semana */}
                    <div className="space-y-2">
                      <Label>Dias da semana</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_LABELS.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleToggleDay(index)}
                            className={cn(
                              'px-3 py-1 text-xs rounded-full border transition-colors',
                              formData.schedule_days?.includes(index)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted border-muted-foreground/30'
                            )}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.session_id || !formData.name || !formData.message || isCreating || isUpdating}
              >
                {(isCreating || isUpdating) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          itemName={deletingAutomation?.name}
          isLoading={deleteAutomation.isPending}
        />
    </ModuleLayout>
  );
}
