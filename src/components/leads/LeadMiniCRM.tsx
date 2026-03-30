import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadConversations } from '@/hooks/useLeadConversations';
import { useLeadActivitiesAdapter } from '@/hooks/useLeadsAdapter';
import { LeadConversations } from './LeadConversations';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { AddActivityModal } from './AddActivityModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Clock,
  CheckSquare,
  FileText,
  Phone,
  Calendar,
  StickyNote,
  Plus,
  RefreshCw,
  Mail,
  GitCommitHorizontal,
  ExternalLink,
} from 'lucide-react';
import type { LeadActivityType, LeadActivityInsert } from '@/types/lead-crm';
import { ACTIVITY_TYPE_LABELS } from '@/types/lead-crm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cleanPhoneNumber } from '@/utils/phone';

interface LeadMiniCRMProps {
  leadId: string;
  leadPhone?: string;
  leadPhoneCountryCode?: string;
  leadName?: string;
  franqueadoId?: string;
}

const QUICK_ACTIONS = [
  { type: 'nota' as LeadActivityType, label: 'Nota', icon: StickyNote, color: 'text-gray-600' },
  { type: 'ligacao' as LeadActivityType, label: 'Ligacao', icon: Phone, color: 'text-blue-600' },
  { type: 'agendamento' as LeadActivityType, label: 'Agendar', icon: Calendar, color: 'text-cyan-600' },
  { type: 'tarefa' as LeadActivityType, label: 'Tarefa', icon: CheckSquare, color: 'text-pink-600' },
];

const FILTER_CHIPS: { type: LeadActivityType; label: string; icon: React.ElementType; activeBg: string }[] = [
  { type: 'nota', label: 'Notas', icon: StickyNote, activeBg: 'bg-gray-600 text-white' },
  { type: 'ligacao', label: 'Ligacoes', icon: Phone, activeBg: 'bg-blue-600 text-white' },
  { type: 'email', label: 'E-mails', icon: Mail, activeBg: 'bg-orange-600 text-white' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, activeBg: 'bg-green-600 text-white' },
  { type: 'agendamento', label: 'Agendamentos', icon: Calendar, activeBg: 'bg-cyan-600 text-white' },
  { type: 'tarefa', label: 'Tarefas', icon: CheckSquare, activeBg: 'bg-pink-600 text-white' },
  { type: 'reuniao', label: 'Reunioes', icon: Clock, activeBg: 'bg-purple-600 text-white' },
  { type: 'status_change', label: 'Alteracoes', icon: GitCommitHorizontal, activeBg: 'bg-indigo-600 text-white' },
];

export function LeadMiniCRM({ leadId, leadPhone, leadPhoneCountryCode, leadName, franqueadoId }: LeadMiniCRMProps) {
  const navigate = useNavigate();
  const { conversations, totalUnread } = useLeadConversations(leadId, leadPhone);
  const {
    activities,
    stats,
    isLoading,
    createActivityAsync,
    isCreating,
    toggleComplete,
    togglePin,
    deleteActivity,
    updateCallResult,
    updateAppointmentStatus,
  } = useLeadActivitiesAdapter(leadId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LeadActivityType | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Abrir modal com tipo pre-selecionado
  const handleQuickAction = (type: LeadActivityType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  // Abrir modal sem tipo pre-selecionado
  const handleNewActivity = () => {
    setSelectedType(null);
    setIsModalOpen(true);
  };

  // Criar atividade
  const handleAddActivity = async (data: LeadActivityInsert) => {
    try {
      await createActivityAsync(data);
    } catch (error) {
      throw error;
    }
  };

  // Handlers para timeline
  const handleTogglePin = async (activityId: string) => {
    togglePin(activityId);
  };

  const handleToggleComplete = async (activityId: string) => {
    toggleComplete(activityId);
    toast.success('Tarefa atualizada!');
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta atividade?')) {
      deleteActivity(activityId);
      toast.success('Atividade excluida!');
    }
  };

  // Abrir chat no sistema (WAHA) - navega para a conversa existente com auto-select
  const handleOpenSystemChat = () => {
    // Se já tem conversa vinculada, abrir direto na sessão certa + selecionar a conversa
    if (conversations.length > 0) {
      const firstConv = conversations[0] as any;
      const sessionId = firstConv.session_id;
      const conversationId = firstConv.id;
      if (sessionId && conversationId) {
        navigate(`/whatsapp/conversas/${sessionId}?chat=${conversationId}`);
        return;
      }
      if (sessionId) {
        navigate(`/whatsapp/conversas/${sessionId}`);
        return;
      }
    }
    // Senão, abrir seletor de sessões
    navigate('/whatsapp/conversas');
  };

  // Abrir WhatsApp Web (externo)
  const handleOpenWhatsAppWeb = () => {
    if (!leadPhone) return;
    const cleanPhone = cleanPhoneNumber(leadPhone);
    const codigoPais = leadPhoneCountryCode || '55';
    const firstName = leadName?.split(' ')[0] || '';
    const message = encodeURIComponent(
      `Ola ${firstName}! Tudo bem? Aqui e da YESlaser!`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${message}`, '_blank');
  };

  // Filtrar atividades (memoizado para evitar recálculo a cada render)
  const filteredActivities = useMemo(() =>
    filterType === 'all'
      ? activities
      : activities.filter(a => a.tipo === filterType),
    [activities, filterType]
  );

  // Contar tarefas pendentes (memoizado)
  const pendingTasksCount = useMemo(() =>
    activities.filter(a => a.tipo === 'tarefa' && !a.is_completed).length,
    [activities]
  );

  // Contar atividades por tipo (memoizado)
  const activityCounts = useMemo(() =>
    activities.reduce((acc, a) => {
      acc[a.tipo] = (acc[a.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [activities]
  );

  return (
    <div className="space-y-6">
      {/* Quick Actions - Estilo PopDents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Acoes Rapidas</CardTitle>
              <CardDescription>Registre atividades do lead</CardDescription>
            </div>
            <Button onClick={handleNewActivity}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.type}
                  variant="outline"
                  className="h-auto py-3 flex-col items-center gap-2"
                  onClick={() => handleQuickAction(action.type)}
                >
                  <Icon className={cn('h-5 w-5', action.color)} />
                  <span className="text-sm">{action.label}</span>
                </Button>
              );
            })}
          </div>
          {leadPhone && (
            <div className="mt-3 pt-3 border-t flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleOpenSystemChat}
              >
                <MessageCircle className="h-4 w-4" />
                Abrir Chat
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {conversations.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-green-600"
                onClick={handleOpenWhatsAppWeb}
                title="Abrir no WhatsApp Web (pessoal)"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Rapidos - Estilo PopDents */}
      {(activities.length > 0 || pendingTasksCount > 0 || totalUnread > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-xs text-muted-foreground">Total de Atividades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-pink-600">{pendingTasksCount}</div>
              <p className="text-xs text-muted-foreground">Tarefas Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{activityCounts['ligacao'] || 0}</div>
              <p className="text-xs text-muted-foreground">Ligacoes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-cyan-600">{activityCounts['agendamento'] || 0}</div>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Conteudo - Estilo PopDents */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="timeline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
              {totalUnread > 0 && (
                <Badge variant="default" className="bg-primary ml-1">
                  {totalUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Tarefas
              {pendingTasksCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {pendingTasksCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filtro por Tipo - Chips clicáveis (estilo Kommo) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                filterType === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              Todos ({activities.length})
            </button>
            {FILTER_CHIPS.map((chip) => {
              const count = activityCounts[chip.type] || 0;
              if (count === 0) return null;
              const Icon = chip.icon;
              return (
                <button
                  key={chip.type}
                  onClick={() => setFilterType(filterType === chip.type ? 'all' : chip.type)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    filterType === chip.type
                      ? chip.activeBg
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {chip.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Timeline */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          <LeadActivityTimeline
            leadId={leadId}
            filterType={filterType !== 'all' ? filterType as LeadActivityType : undefined}
          />
        </TabsContent>

        {/* Tab WhatsApp */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <LeadConversations leadId={leadId} leadPhone={leadPhone} />
        </TabsContent>

        {/* Tab Tarefas */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <LeadActivityTimeline leadId={leadId} filterType="tarefa" />
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Atividade */}
      <AddActivityModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedType(null);
        }}
        leadId={leadId}
        franqueadoId={franqueadoId}
        onSubmit={handleAddActivity}
        isSubmitting={isCreating}
      />
    </div>
  );
}

export default LeadMiniCRM;
