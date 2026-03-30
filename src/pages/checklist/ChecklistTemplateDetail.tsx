import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Pencil, Clock, CheckCircle2, AlertTriangle, Camera, MessageSquare,
  Users, User, Building2, UsersRound, CalendarDays, Repeat
} from "lucide-react";
import { useChecklistTemplateMT } from "@/hooks/multitenant/useChecklistTemplateMT";
import {
  ASSIGNMENT_TYPE_LABELS, RECURRENCE_LABELS, PRIORIDADE_LABELS, PRIORIDADE_COLORS,
  DAILY_STATUS_COLORS, type ChecklistAssignmentType
} from "@/types/checklist";

const DIAS_SEMANA_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

const ASSIGNMENT_ICONS: Record<ChecklistAssignmentType, React.ElementType> = {
  role: Users,
  user: User,
  department: Building2,
  team: UsersRound,
};

export default function ChecklistTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, items, isLoading } = useChecklistTemplateMT(id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-2">Template não encontrado</h2>
          <p className="text-muted-foreground mb-4">O template solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/checklist")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const AssignIcon = ASSIGNMENT_ICONS[template.assignment_type];
  const assignedTo = template.assigned_user?.nome || template.role?.nome || template.department?.nome || template.team?.nome || '-';

  // Group items by hora_bloco
  const itemsByHour = items.reduce((acc: Record<string, typeof items>, item) => {
    const key = item.hora_bloco?.slice(0, 5) || 'sem_horario';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedHours = Object.keys(itemsByHour).sort((a, b) => {
    if (a === 'sem_horario') return 1;
    if (b === 'sem_horario') return -1;
    return a.localeCompare(b);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/checklist")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: template.cor }} />
                <h1 className="text-2xl font-bold">{template.nome}</h1>
              </div>
              {template.descricao && (
                <p className="text-muted-foreground mt-1">{template.descricao}</p>
              )}
            </div>
          </div>
          <Button asChild>
            <Link to={`/checklist/${template.id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items por hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Itens do Checklist ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum item cadastrado. Edite o template para adicionar itens.
                  </p>
                ) : (
                  sortedHours.map((hour) => (
                    <div key={hour}>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">
                          {hour === 'sem_horario' ? 'Sem horário definido' : `Bloco ${hour}`}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {itemsByHour[hour].length} {itemsByHour[hour].length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                      <div className="space-y-2 ml-6">
                        {itemsByHour[hour].map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm font-medium text-muted-foreground mt-0.5 w-6">
                              {item.ordem + 1}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{item.titulo}</span>
                                {item.is_obrigatorio && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                              {item.descricao && (
                                <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{ borderColor: PRIORIDADE_COLORS[item.prioridade], color: PRIORIDADE_COLORS[item.prioridade] }}
                                >
                                  {PRIORIDADE_LABELS[item.prioridade]}
                                </Badge>
                                {item.categoria && (
                                  <Badge variant="outline" className="text-xs">{item.categoria}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{item.duracao_min}min</span>
                                {item.requer_foto && (
                                  <Camera className="h-3.5 w-3.5 text-muted-foreground" title="Requer foto" />
                                )}
                                {item.requer_observacao && (
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" title="Requer observação" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Atribuição</p>
                  <div className="flex items-center gap-2 mt-1">
                    <AssignIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {ASSIGNMENT_TYPE_LABELS[template.assignment_type]}: {assignedTo}
                    </span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Recorrência</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Repeat className="h-4 w-4" />
                    <span className="font-medium">{RECURRENCE_LABELS[template.recurrence]}</span>
                  </div>
                  {template.recurrence === 'semanal' && template.dias_semana && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.dias_semana.sort().map((d) => (
                        <Badge key={d} variant="outline" className="text-xs">
                          {DIAS_SEMANA_LABELS[d]?.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Horário de Trabalho</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {template.hora_inicio?.slice(0, 5)} - {template.hora_fim?.slice(0, 5)}
                    </span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={template.is_active ? "default" : "secondary"} className="mt-1">
                    {template.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumo dos Itens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de itens</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Obrigatórios</span>
                  <span className="font-semibold">{items.filter(i => i.is_obrigatorio).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Com foto</span>
                  <span className="font-semibold">{items.filter(i => i.requer_foto).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tempo estimado</span>
                  <span className="font-semibold">
                    {Math.round(items.reduce((sum, i) => sum + i.duracao_min, 0) / 60 * 10) / 10}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Blocos de hora</span>
                  <span className="font-semibold">{sortedHours.filter(h => h !== 'sem_horario').length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
