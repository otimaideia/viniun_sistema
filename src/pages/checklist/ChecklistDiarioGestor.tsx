import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Plus, RefreshCw, Eye, CalendarDays, User, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useChecklistDailyMT } from "@/hooks/multitenant/useChecklistDailyMT";
import { useChecklistTemplatesMT } from "@/hooks/multitenant/useChecklistTemplatesMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { useUsersAdapter } from "@/hooks/useUsersAdapter";
import {
  DAILY_STATUS_LABELS, DAILY_STATUS_COLORS,
  type ChecklistDailyStatus, type MTChecklistDaily,
} from "@/types/checklist";
import { DailyDetailDialog } from "@/components/checklist/DailyDetailDialog";
import { AddItemDialog } from "@/components/checklist/AddItemDialog";
import { FinalizeDialog } from "@/components/checklist/FinalizeDialog";

export default function ChecklistDiarioGestor() {
  const { franchise } = useTenantContext();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [generateDialog, setGenerateDialog] = useState(false);
  const [selectedDaily, setSelectedDaily] = useState<MTChecklistDaily | null>(null);
  const [addItemDialog, setAddItemDialog] = useState<string | null>(null);
  const [finalizeDialog, setFinalizeDialog] = useState<string | null>(null);

  // Generate form state
  const [genTemplateId, setGenTemplateId] = useState("");
  const [genUserId, setGenUserId] = useState("");

  // Add item form
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemHora, setNewItemHora] = useState("");
  const [newItemPrioridade, setNewItemPrioridade] = useState("normal");
  const [newItemCategoria, setNewItemCategoria] = useState("");

  // Finalize form
  const [finalizeStatus, setFinalizeStatus] = useState<"concluido" | "incompleto" | "cancelado">("incompleto");
  const [finalizeObs, setFinalizeObs] = useState("");

  const { data: dailyList, isLoading, refetch, generate } = useChecklistDailyMT({
    data: selectedDate,
    status: filterStatus !== "all" ? (filterStatus as ChecklistDailyStatus) : undefined,
    franchise_id: franchise?.id,
  });

  const { data: templates } = useChecklistTemplatesMT({ is_active: true });
  const { users } = useUsersAdapter();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  const statusCounts = (dailyList || []).reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const avgCompletion =
    dailyList && dailyList.length > 0
      ? Math.round(dailyList.reduce((sum, d) => sum + d.percentual_conclusao, 0) / dailyList.length)
      : 0;

  const handleGenerate = async () => {
    if (!genTemplateId || !genUserId) {
      toast.error("Selecione template e usuário");
      return;
    }
    try {
      await generate.mutateAsync({
        templateId: genTemplateId,
        userId: genUserId,
        data: selectedDate,
      });
      setGenerateDialog(false);
      setGenTemplateId("");
      setGenUserId("");
    } catch {
      // handled by hook
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Checklist da Equipe
            </h1>
            <p className="text-muted-foreground">
              Acompanhe e gerencie os checklists diários de toda a equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setGenerateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Gerar Checklist
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="incompleto">Incompleto</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{statusCounts.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-green-600">{statusCounts.concluido || 0}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.em_andamento || 0}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{statusCounts.incompleto || 0}</p>
              <p className="text-xs text-muted-foreground">Incompletos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{avgCompletion}%</p>
              <p className="text-xs text-muted-foreground">Média Conclusão</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {!dailyList?.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum checklist nesta data</h3>
                <p className="text-muted-foreground mb-4">Gere checklists para a equipe</p>
                <Button onClick={() => setGenerateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Checklist
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">NC</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyList.map((daily) => {
                    const ncCount = daily.items?.filter((i) => i.has_nao_conformidade).length || 0;
                    return (
                      <TableRow key={daily.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{daily.user?.nome || "-"}</p>
                              {daily.user?.cargo && (
                                <p className="text-xs text-muted-foreground">{daily.user.cargo}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: daily.template?.cor || "#6366F1" }}
                            />
                            <span className="text-sm">{daily.template?.nome || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={daily.percentual_conclusao} className="h-2 flex-1" />
                            <span className="text-sm font-medium w-10 text-right">
                              {Math.round(daily.percentual_conclusao)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="text-green-600 font-medium">{daily.items_concluidos}</span>
                          <span className="text-muted-foreground">/{daily.total_items}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: DAILY_STATUS_COLORS[daily.status],
                              color: DAILY_STATUS_COLORS[daily.status],
                            }}
                          >
                            {DAILY_STATUS_LABELS[daily.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {ncCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">{ncCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedDaily(daily)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setAddItemDialog(daily.id)}
                              title="Adicionar item"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            {daily.status !== "concluido" && daily.status !== "cancelado" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setFinalizeDialog(daily.id)}
                                title="Finalizar"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Checklist Diário</DialogTitle>
            <DialogDescription>
              Selecione o template e o colaborador para gerar o checklist do dia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template *</label>
              <Select value={genTemplateId} onValueChange={setGenTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Colaborador *</label>
              <Select value={genUserId} onValueChange={setGenUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.is_active).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={selectedDate} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generate.isPending}>
              {generate.isPending ? "Gerando..." : "Gerar Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedDaily && (
        <DailyDetailDialog
          daily={selectedDaily}
          onClose={() => setSelectedDaily(null)}
        />
      )}

      {/* Add Item Dialog */}
      {addItemDialog && (
        <AddItemDialog
          dailyId={addItemDialog}
          titulo={newItemTitle}
          setTitulo={setNewItemTitle}
          hora={newItemHora}
          setHora={setNewItemHora}
          prioridade={newItemPrioridade}
          setPrioridade={setNewItemPrioridade}
          categoria={newItemCategoria}
          setCategoria={setNewItemCategoria}
          onClose={() => {
            setAddItemDialog(null);
            setNewItemTitle("");
            setNewItemHora("");
            setNewItemPrioridade("normal");
            setNewItemCategoria("");
          }}
        />
      )}

      {/* Finalize Dialog */}
      {finalizeDialog && (
        <FinalizeDialog
          dailyId={finalizeDialog}
          status={finalizeStatus}
          setStatus={setFinalizeStatus}
          obs={finalizeObs}
          setObs={setFinalizeObs}
          onClose={() => {
            setFinalizeDialog(null);
            setFinalizeObs("");
            setFinalizeStatus("incompleto");
          }}
        />
      )}
    </DashboardLayout>
  );
}
