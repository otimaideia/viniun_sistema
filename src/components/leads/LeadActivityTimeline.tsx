import { useState } from 'react';
import { useLeadActivitiesAdapter } from '@/hooks/useLeadsAdapter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Phone,
  Calendar,
  CheckSquare,
  Pin,
  Check,
  Plus,
  X,
  RefreshCw,
  Mail,
  MessageCircle,
  Users,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { LeadActivityWithRelations, LeadActivityType } from '@/types/lead-crm';
import { ACTIVITY_TYPE_CONFIG } from '@/types/lead-crm';

interface LeadActivityTimelineProps {
  leadId: string;
  filterType?: LeadActivityType | 'all';
}

const TYPE_ICONS: Record<LeadActivityType, React.ComponentType<{ className?: string }>> = {
  nota: FileText,
  ligacao: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  reuniao: Users,
  agendamento: Calendar,
  status_change: RefreshCw,
  tarefa: CheckSquare,
};

function ActivityItem({
  activity,
  onToggleComplete,
  onTogglePin,
}: {
  activity: LeadActivityWithRelations;
  onToggleComplete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const config = ACTIVITY_TYPE_CONFIG[activity.tipo];
  const Icon = TYPE_ICONS[activity.tipo];

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border last:hidden" />

      {/* Icon */}
      <div
        className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${config.bgColor}`}
      >
        <Icon className={`h-3 w-3 ${config.color}`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
                {config.label}
              </Badge>
              {activity.is_pinned && (
                <Pin className="h-3 w-3 text-primary fill-primary" />
              )}
              {activity.is_completed && (
                <Badge variant="secondary" className="text-xs">
                  Concluido
                </Badge>
              )}
            </div>

            {activity.titulo && (
              <p
                className={`font-medium mt-1 ${
                  activity.is_completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {activity.titulo}
              </p>
            )}

            {activity.descricao && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {activity.descricao}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
              {activity.user?.nome && (
                <span className="ml-2 font-medium text-foreground/80">
                  por {activity.user.nome}
                </span>
              )}
              {activity.data_lembrete && (
                <span className="ml-2">
                  - Lembrete: {format(new Date(activity.data_lembrete), "dd/MM 'as' HH:mm", { locale: ptBR })}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {(activity.tipo === 'tarefa' || activity.tipo === 'agendamento') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleComplete(activity.id)}
                title={activity.is_completed ? 'Marcar como pendente' : 'Marcar como concluido'}
              >
                <Check
                  className={`h-4 w-4 ${activity.is_completed ? 'text-success' : 'text-muted-foreground'}`}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onTogglePin(activity.id)}
              title={activity.is_pinned ? 'Desfixar' : 'Fixar'}
            >
              <Pin
                className={`h-4 w-4 ${activity.is_pinned ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddActivityForm({
  leadId,
  onSuccess,
  onCancel,
}: {
  leadId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { createActivityAsync, isCreating } = useLeadActivitiesAdapter(leadId);
  const [tipo, setTipo] = useState<LeadActivityType>('nota');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() && !descricao.trim()) {
      toast.error('Preencha pelo menos o titulo ou descricao');
      return;
    }

    try {
      await createActivityAsync({
        lead_id: leadId,
        tipo,
        titulo: titulo.trim() || undefined,
        descricao: descricao.trim() || undefined,
      });
      toast.success('Atividade adicionada');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao adicionar atividade');
    }
  };

  return (
    <Card className="border-primary/50 mb-4">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Select value={tipo} onValueChange={(v) => setTipo(v as LeadActivityType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Titulo (opcional)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="flex-1"
            />
          </div>

          <Textarea
            placeholder="Descricao..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isCreating}>
              <Plus className="h-4 w-4 mr-1" />
              {isCreating ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function LeadActivityTimeline({
  leadId,
  filterType = 'all',
}: LeadActivityTimelineProps) {
  const {
    activities,
    isLoading,
    error,
    refetch,
    toggleComplete,
    togglePin,
    stats,
  } = useLeadActivitiesAdapter(leadId);

  const [showForm, setShowForm] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<LeadActivityType | 'all'>(filterType);

  const filteredActivities =
    currentFilter === 'all'
      ? activities
      : activities.filter((a) => a.tipo === currentFilter);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 text-center">
          <p className="text-destructive mb-2">Erro ao carregar atividades</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros e acao */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={currentFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentFilter('all')}
          >
            Todas ({stats.total})
          </Button>
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={currentFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentFilter(key as LeadActivityType)}
            >
              {config.label} ({stats.byType[key as LeadActivityType]})
            </Button>
          ))}
        </div>

        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Atividade
          </Button>
        )}
      </div>

      {/* Form inline para adicionar */}
      {showForm && (
        <AddActivityForm
          leadId={leadId}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista de atividades */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              {currentFilter === 'all'
                ? 'Nenhuma atividade registrada'
                : `Nenhuma ${ACTIVITY_TYPE_CONFIG[currentFilter].label.toLowerCase()} registrada`}
            </p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              Adicionar primeira atividade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="pt-2">
          {filteredActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onToggleComplete={toggleComplete}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
