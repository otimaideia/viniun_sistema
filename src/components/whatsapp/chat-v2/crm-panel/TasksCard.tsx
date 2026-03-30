import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Users,
  ListTodo,
  Calendar,
  StickyNote,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadActivitiesMT } from "@/hooks/useLeadActivitiesMT";
import type { MTLeadActivity, LeadActivityType } from "@/types/lead-mt";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TasksCardProps {
  leadId: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  reuniao: Users,
  tarefa: ListTodo,
  agendamento: Calendar,
  nota: StickyNote,
};

const ACTIVITY_COLORS: Record<string, string> = {
  ligacao: "text-blue-500 bg-blue-50",
  email: "text-orange-500 bg-orange-50",
  whatsapp: "text-emerald-500 bg-emerald-50",
  reuniao: "text-purple-500 bg-purple-50",
  tarefa: "text-gray-600 bg-gray-50",
  agendamento: "text-indigo-500 bg-indigo-50",
  nota: "text-amber-500 bg-amber-50",
};

const TASK_TYPES: { value: LeadActivityType; label: string }[] = [
  { value: "tarefa", label: "Tarefa" },
  { value: "ligacao", label: "Ligacao" },
  { value: "reuniao", label: "Reuniao" },
  { value: "agendamento", label: "Agendamento" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
];

const TASK_LIKE_TYPES = new Set<string>([
  "tarefa",
  "ligacao",
  "reuniao",
  "agendamento",
  "email",
  "whatsapp",
]);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isCompleted(activity: MTLeadActivity): boolean {
  const dados = (activity as any).dados as Record<string, unknown> | undefined;
  return !!dados?.concluida;
}

function getScheduledDate(activity: MTLeadActivity): string | null {
  const dados = (activity as any).dados as Record<string, unknown> | undefined;
  if (dados?.data_agendada) return dados.data_agendada as string;
  if (activity.data_agendada) return activity.data_agendada;
  return null;
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return "Hoje";

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    if (isTomorrow) return "Amanha";

    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

function isOverdue(iso: string): boolean {
  try {
    return new Date(iso) < new Date();
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TasksCard({ leadId }: TasksCardProps) {
  const {
    activities,
    stats,
    isLoading,
    createActivity,
    toggleComplete,
    deleteActivity,
  } = useLeadActivitiesMT(leadId);

  // Quick add state
  const [taskText, setTaskText] = useState("");
  const [selectedType, setSelectedType] = useState<LeadActivityType>("tarefa");
  const [selectedDate, setSelectedDate] = useState("");

  // Completed section collapse
  const [showCompleted, setShowCompleted] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const taskActivities = (activities || []).filter((a) =>
    TASK_LIKE_TYPES.has(a.tipo)
  );

  const pendingTasks = taskActivities
    .filter((a) => !isCompleted(a))
    .sort((a, b) => {
      // Sort: overdue first, then by scheduled date
      const dateA = getScheduledDate(a);
      const dateB = getScheduledDate(b);
      const overdueA = dateA ? isOverdue(dateA) : false;
      const overdueB = dateB ? isOverdue(dateB) : false;
      if (overdueA && !overdueB) return -1;
      if (!overdueA && overdueB) return 1;
      if (dateA && dateB) return new Date(dateA).getTime() - new Date(dateB).getTime();
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });

  const completedTasks = taskActivities.filter((a) => isCompleted(a));

  const pendingCount = pendingTasks.length;
  const completedCount = completedTasks.length;
  const overdueCount = pendingTasks.filter((t) => {
    const d = getScheduledDate(t);
    return d ? isOverdue(d) : false;
  }).length;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddTask = () => {
    if (!taskText.trim()) return;

    createActivity.mutate({
      lead_id: leadId,
      tenant_id: "", // Hook injects tenant_id
      tipo: selectedType,
      descricao: taskText.trim(),
      data_agendada: selectedDate || undefined,
    });

    setTaskText("");
    setSelectedDate("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[#667781]" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Quick add area - stacked layout */}
      <div className="rounded-lg border border-[#e9edef] bg-white p-2.5 space-y-2">
        {/* Text input + add button */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Nova tarefa..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-8 border-[#e9edef] text-sm"
          />
          <button
            type="button"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#00a884] text-white transition-colors hover:bg-[#00a884]/90 disabled:opacity-50"
            onClick={handleAddTask}
            disabled={!taskText.trim() || createActivity.isPending}
          >
            {createActivity.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Type + Date selectors */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedType}
            onValueChange={(val) =>
              setSelectedType(val as LeadActivityType)
            }
          >
            <SelectTrigger className="h-7 flex-1 text-xs border-[#e9edef]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map(({ value, label }) => {
                const Icon = ACTIVITY_ICONS[value] || ListTodo;
                return (
                  <SelectItem key={value} value={value} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-7 flex-1 rounded-md border border-[#e9edef] bg-white px-2 text-xs text-[#667781]"
          />
        </div>
      </div>

      {/* Stats bar */}
      {(pendingCount > 0 || completedCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-[#667781]">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </span>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {completedCount} concluida{completedCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Empty state */}
      {pendingCount === 0 && completedCount === 0 && (
        <p className="text-xs italic text-[#667781] text-center py-1">
          Nenhuma tarefa cadastrada
        </p>
      )}

      {/* Pending tasks list */}
      {pendingCount > 0 && (
        <div className="space-y-1">
          {pendingTasks.map((task) => {
            const Icon = ACTIVITY_ICONS[task.tipo] || ListTodo;
            const colorClasses = ACTIVITY_COLORS[task.tipo] || "text-gray-600 bg-gray-50";
            const [textColor, bgColor] = colorClasses.split(" ");
            const scheduledDate = getScheduledDate(task);
            const overdue = scheduledDate ? isOverdue(scheduledDate) : false;

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f0f2f5]",
                  overdue && "bg-red-50/50"
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleComplete(task.id)}
                  className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded border-[#00a884] accent-[#00a884]"
                />

                {/* Type icon with color */}
                <div
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded",
                    bgColor
                  )}
                >
                  <Icon className={cn("h-3 w-3", textColor)} />
                </div>

                {/* Description */}
                <span className="flex-1 truncate text-xs text-[#111b21]">
                  {task.descricao}
                </span>

                {/* Scheduled date */}
                {scheduledDate && (
                  <span
                    className={cn(
                      "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                      overdue
                        ? "bg-red-100 font-medium text-red-600"
                        : "bg-[#f0f2f5] text-[#667781]"
                    )}
                  >
                    {formatShortDate(scheduledDate)}
                  </span>
                )}

                {/* Delete */}
                <button
                  type="button"
                  className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteActivity(task.id)}
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3 text-[#667781] hover:text-red-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed tasks section */}
      {completedCount > 0 && (
        <div>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 text-xs text-[#667781] hover:text-[#111b21] transition-colors"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {completedCount} concluida{completedCount !== 1 ? "s" : ""}
          </button>

          {showCompleted && (
            <div className="mt-1 space-y-0.5">
              {completedTasks.map((task) => {
                const Icon = ACTIVITY_ICONS[task.tipo] || ListTodo;

                return (
                  <div
                    key={task.id}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#f0f2f5] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => toggleComplete(task.id)}
                      className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded border-[#00a884] accent-[#00a884]"
                    />

                    <Icon className="h-3 w-3 flex-shrink-0 text-[#667781] opacity-40" />

                    <span className="flex-1 truncate text-xs text-[#8696a0] line-through">
                      {task.descricao}
                    </span>

                    <button
                      type="button"
                      className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => deleteActivity(task.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3 text-[#667781] hover:text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
