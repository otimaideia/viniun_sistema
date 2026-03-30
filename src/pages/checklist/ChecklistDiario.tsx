import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, CalendarDays, Trophy, Flame } from "lucide-react";
import { useMeuChecklistMT } from "@/hooks/multitenant/useChecklistDailyMT";
import { useChecklistStreaksMT } from "@/hooks/multitenant/useChecklistStreaksMT";
import { useGamificationProfile } from "@/hooks/multitenant/useGamificationMT";
import { DailySummaryCard } from "@/components/checklist/DailySummaryCard";
import { DailyChecklistCard } from "@/components/checklist/DailyChecklistCard";
import { ObservationDialog } from "@/components/checklist/ObservationDialog";
import { NonConformityDialog } from "@/components/checklist/NonConformityDialog";
import { SkipConfirmDialog } from "@/components/checklist/SkipConfirmDialog";

export default function ChecklistDiario() {
  // Usar data local (não UTC) para evitar mostrar dia errado no fuso Brasil
  const [selectedDate, setSelectedDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });
  const { data: dailyChecklists, isLoading } = useMeuChecklistMT(selectedDate);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  // Action dialogs
  const [obsDialog, setObsDialog] = useState<{ itemId: string; dailyId: string; action: "complete" | "notdone"; requerFoto?: boolean } | null>(null);
  const [obsText, setObsText] = useState("");
  const [ncDialog, setNcDialog] = useState<{ itemId: string; dailyId: string } | null>(null);
  const [ncDesc, setNcDesc] = useState("");
  const [ncAction, setNcAction] = useState("");
  const [skipConfirm, setSkipConfirm] = useState<{ itemId: string; dailyId: string } | null>(null);

  const { myStreak } = useChecklistStreaksMT();
  const { data: gamProfile } = useGamificationProfile();

  const toggleBlock = (key: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const hasChecklists = dailyChecklists && dailyChecklists.length > 0;
  const today = new Date().toISOString().split("T")[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6" />
              Meu Checklist
            </h1>
            <p className="text-muted-foreground">
              {selectedDate === today
                ? "Suas tarefas de hoje"
                : `Checklist de ${new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
        </div>

        {/* Gamification: Streak + XP */}
        {(myStreak || gamProfile) && (
          <div className="flex items-center gap-4 text-sm">
            {myStreak && myStreak.streak_atual > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full">
                <Flame className="h-4 w-4" />
                <span className="font-semibold">{myStreak.streak_atual} dias</span>
                <span className="text-orange-500 text-xs">streak</span>
              </div>
            )}
            {gamProfile && (
              <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">{gamProfile.total_xp} XP</span>
                <span className="text-purple-500 text-xs">Nível {gamProfile.level}</span>
              </div>
            )}
          </div>
        )}

        {/* Overview Cards */}
        {hasChecklists && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {dailyChecklists.map((daily) => (
              <DailySummaryCard key={daily.id} daily={daily} />
            ))}
          </div>
        )}

        {/* No Checklists */}
        {!hasChecklists && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum checklist para esta data</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Não há checklists atribuídos para você nesta data.
                Entre em contato com sua gerente para gerar o checklist do dia.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Checklists */}
        {dailyChecklists?.map((daily) => (
          <DailyChecklistCard
            key={daily.id}
            daily={daily}
            expandedBlocks={expandedBlocks}
            toggleBlock={toggleBlock}
            onComplete={(itemId, requerFoto) => setObsDialog({ itemId, dailyId: daily.id, action: "complete", requerFoto })}
            onNotDone={(itemId) => setObsDialog({ itemId, dailyId: daily.id, action: "notdone" })}
            onSkip={(itemId) => setSkipConfirm({ itemId, dailyId: daily.id })}
            onNonConformity={(itemId) => setNcDialog({ itemId, dailyId: daily.id })}
          />
        ))}
      </div>

      {/* Observation Dialog (Complete/NotDone) */}
      {obsDialog && (
        <ObservationDialog
          open={!!obsDialog}
          action={obsDialog.action}
          dailyId={obsDialog.dailyId}
          itemId={obsDialog.itemId}
          obsText={obsText}
          setObsText={setObsText}
          requerFoto={obsDialog.requerFoto}
          onClose={() => { setObsDialog(null); setObsText(""); }}
        />
      )}

      {/* Non-Conformity Dialog */}
      {ncDialog && (
        <NonConformityDialog
          open={!!ncDialog}
          dailyId={ncDialog.dailyId}
          itemId={ncDialog.itemId}
          ncDesc={ncDesc}
          setNcDesc={setNcDesc}
          ncAction={ncAction}
          setNcAction={setNcAction}
          onClose={() => { setNcDialog(null); setNcDesc(""); setNcAction(""); }}
        />
      )}

      {/* Skip Confirm */}
      {skipConfirm && (
        <SkipConfirmDialog
          open={!!skipConfirm}
          dailyId={skipConfirm.dailyId}
          itemId={skipConfirm.itemId}
          onClose={() => setSkipConfirm(null)}
        />
      )}
    </DashboardLayout>
  );
}
